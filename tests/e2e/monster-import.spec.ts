import { expect, test, type Page } from '@playwright/test';
import { weirdboyActions, weirdboyStatblock } from '../fixtures/monsterSpellcasting';
import { epicMonsterStatblock } from '../fixtures/epicMonster';

async function openMonsterEditor(page: Page) {
  await page.goto('/?mode=dm&token=test-token');
  await expect(page.getByText('DM View')).toBeVisible();
  await page.getByRole('button', { name: 'Databases', exact: true }).click();
  await page.getByRole('button', { name: 'Monsters', exact: true }).click();
  await page.getByRole('button', { name: /Database actions/ }).click();
  await page.getByRole('button', { name: 'Add Monster', exact: true }).click();
}

async function expectImportedSpells(page: Page) {
  await expect(page.getByTitle('Caster configuration')).toHaveValue('per-day');
  await expect(page.getByPlaceholder('Add an at-will spell...').locator('../..').locator('.pill')).toHaveCount(12);
  await expect(page.getByPlaceholder('Add a counterspell...').locator('../..').locator('.pill')).toHaveCount(4);
  await expect(page.getByTitle('Uses per day', { exact: true })).toHaveCount(22);
  await expect(page.getByTitle('Uses per day', { exact: true }).first()).toHaveValue('3');
  await expect(page.getByTitle('Uses per day', { exact: true }).last()).toHaveValue('1');
  await expect(page.getByPlaceholder('Sonic Boom', { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder('Obsidian Tombs', { exact: true })).toBeVisible();
}

test('full statblock import populates spellcasting and survives save and reopen', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await openMonsterEditor(page);
  await page.getByPlaceholder('Paste Markdown statblock here...').fill(weirdboyStatblock);
  await page.getByRole('button', { name: 'Parse Statblock', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Imported 12 at-will spells, 22 per-day spells');
  const actions = page.getByRole('textbox', { name: 'Actions', exact: true });
  await expect(actions.locator('..').locator('.md-parsed-name')).toHaveCount(2);
  await page.getByRole('button', { name: 'Spellcasting', exact: true }).click();
  await expectImportedSpells(page);
  await page.getByRole('button', { name: 'Save Monster Entry', exact: true }).click();
  await page.getByPlaceholder('Search Monsters').fill('Weirdboy Import Test');
  await page.locator('.database-card').filter({ has: page.getByRole('heading', { name: 'Weirdboy Import Test', exact: true }) }).getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('button', { name: 'Spellcasting', exact: true }).click();
  await expectImportedSpells(page);
  await page.getByRole('button', { name: 'Traits & Actions', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Actions', exact: true }).locator('..').locator('.md-parsed-name')).toHaveCount(2);
});

test('spellcasting can be extracted from action drafts without a full statblock', async ({ page }) => {
  await openMonsterEditor(page);
  await page.getByRole('textbox', { name: 'Actions', exact: true }).fill(weirdboyActions);
  await page.getByRole('button', { name: 'Spellcasting', exact: true }).click();
  await expect(page.getByTitle('Caster configuration')).toHaveValue('none');
  await page.getByRole('button', { name: 'Import spellcasting from text', exact: true }).click();
  await expectImportedSpells(page);
  await page.getByRole('button', { name: 'Traits & Actions', exact: true }).click();
  await page.getByRole('textbox', { name: 'Actions', exact: true }).fill('**Staff.** Melee weapon attack.');
  await page.getByRole('button', { name: 'Spellcasting', exact: true }).click();
  await page.getByRole('button', { name: 'Import spellcasting from text', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Existing spellcasting settings were kept');
  await expectImportedSpells(page);
});

test('Markdown file import keeps epic options editable and persists them only after Save', async ({ page }) => {
  const name = `Epic Priest File ${Date.now()}`;
  const markdown = epicMonsterStatblock.replace('Epic Priest Import Test', name);
  await page.goto('/?mode=dm&token=test-token');
  await expect(page.getByText('DM View')).toBeVisible();
  await page.getByRole('button', { name: 'Databases', exact: true }).click();
  await page.getByRole('button', { name: 'Monsters', exact: true }).click();
  await page.getByRole('button', { name: /Database actions/ }).click();
  await page.getByLabel('Import monster Markdown file').setInputFiles({ name: 'empty.md', mimeType: 'text/markdown', buffer: Buffer.from('') });
  await expect(page.getByRole('alert')).toContainText('empty');
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import from .md', exact: true }).click();
  await (await chooserPromise).setFiles({ name: 'epic-priest.md', mimeType: 'text/markdown', buffer: Buffer.from(markdown) });
  await expect(page.getByTitle('Monster name', { exact: true })).toHaveValue(name);
  await expect(page.getByTitle('Maximum HP', { exact: true })).toHaveValue('450');
  await expect(page.getByTitle('intelligence score', { exact: true })).toHaveValue('34');
  await expect(page.getByTitle('Difficulty points for encounter planning')).toHaveValue('8');
  await page.getByRole('button', { name: /Back to Databases/ }).click();
  await page.getByPlaceholder('Search Monsters').fill(name);
  await expect(page.getByText('No entries found.')).toBeVisible();
  await page.getByRole('button', { name: /Database actions/ }).click();
  await page.getByLabel('Import monster Markdown file').setInputFiles({ name: 'epic-priest.md', mimeType: 'text/markdown', buffer: Buffer.from(markdown) });
  await page.getByRole('button', { name: 'Power & Epics', exact: true }).click();
  await expect(page.getByLabel('Enable Epic / Mythic Action Limits')).toBeChecked();
  await page.getByRole('button', { name: /Open Epic Actions Editor/ }).click();
  await expect(page.getByTitle('Epic action name')).toHaveCount(4);
  await expect(page.getByTitle('Epic action max uses').nth(0)).toHaveValue('0');
  await expect(page.getByTitle('Epic action max uses').nth(3)).toHaveValue('2');
  await expect(page.getByTitle('Epic option name')).toHaveCount(3);
  await expect(page.getByTitle('Epic option max uses').first()).toHaveValue('1');
  await expect(page.getByTitle('Epic option recovery').first()).toHaveValue('encounter');
  await page.getByTitle('Epic option cost').first().fill('4 Divine Favor');
  expect(await page.getByRole('textbox', { name: 'Option rules 4.2', exact: true }).inputValue()).toContain('| Tier 1 Epic spell | 3 |');
  await page.getByRole('button', { name: 'Raw Text Editor', exact: true }).click();
  await page.getByRole('button', { name: 'Structured Table Grid', exact: true }).click();
  await expect(page.getByTitle('Epic action name')).toHaveCount(4);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'Save & Close', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.getByRole('button', { name: 'Import from .md', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/epic-monster-import-mobile.png' });
  await page.getByRole('button', { name: 'Save Monster Entry', exact: true }).click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByPlaceholder('Search Monsters').fill(name);
  await page.locator('.database-card').filter({ has: page.getByRole('heading', { name, exact: true }) }).getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByTitle('intelligence score', { exact: true })).toHaveValue('34');
  await page.getByRole('button', { name: 'Power & Epics', exact: true }).click();
  await page.getByRole('button', { name: /Open Epic Actions Editor/ }).click();
  await expect(page.getByTitle('Epic action name')).toHaveCount(4);
  await expect(page.getByTitle('Epic option cost').first()).toHaveValue('4 Divine Favor');
  expect(await page.getByRole('textbox', { name: 'Option rules 4.3', exact: true }).inputValue()).toContain('**Overwhelm Magic.**');
  await page.getByRole('button', { name: 'Save & Close', exact: true }).click();
  await page.locator('.monster-editor-page > header').getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Epic: Arcane Lance', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Divine Arcana', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/epic-monster-import-preview.png' });
});
