import { expect, test, type Page } from '@playwright/test';
import { weirdboyActions, weirdboyStatblock } from '../fixtures/monsterSpellcasting';

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
