import { expect, test } from '@playwright/test';

function dmToken() {
  if (process.env.DND_DM_TOKEN) return process.env.DND_DM_TOKEN;
  return 'test-token';
}

test('DM and player can work without destroying local drafts', async ({ browser }) => {
  const dmContext = await browser.newContext();
  const playerContext = await browser.newContext();
  const dm = await dmContext.newPage();
  const player = await playerContext.newPage();

  await dm.goto(`/?mode=dm&token=${encodeURIComponent(dmToken())}`);
  await player.goto('/?mode=player');

  await expect(dm.getByText('DM View')).toBeVisible();
  await dm.getByRole('button', { name: 'Autosave' }).click();
  await expect(dm.getByText('Autosave ulozen.')).toBeVisible();
  await dm.getByRole('button', { name: /Add character \/ monster/i }).click();
  const addCharacterForm = dm.getByTestId('add-character-form');
  await addCharacterForm.getByPlaceholder('Name').fill('Ayla');
  await addCharacterForm.getByPlaceholder('Max HP').fill('50');
  await addCharacterForm.getByRole('button', { name: 'Add' }).click();
  await expect(player.getByTestId('character-Ayla')).toBeVisible();
  await addCharacterForm.getByPlaceholder('Name').fill('Borin');
  await addCharacterForm.getByRole('button', { name: 'Add' }).click();

  await expect(player.getByTestId('character-Borin')).toBeVisible();

  await dm.getByRole('button', { name: 'Start combat' }).click();
  await expect(dm.getByRole('button', { name: 'Next turn' })).toBeVisible();
  await dm.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await dm.keyboard.press('PageUp');
  await expect(dm.locator('.history-label').filter({ hasText: 'Dalsi tah' })).toHaveCount(2);
  await dm.keyboard.press('Backspace');
  await expect(dm.locator('.history-label').filter({ hasText: 'Undo: Dalsi tah' })).toHaveCount(2);
  await dm.keyboard.press('Shift+Backspace');
  await expect(dm.locator('.history-label').filter({ hasText: 'Redo: Dalsi tah' })).toHaveCount(2);

  await player.getByTestId('heal-Ayla').fill('42');
  await dm.getByTestId('character-Ayla').getByRole('button', { name: 'HP -1', exact: true }).click();
  await expect(player.getByTestId('heal-Ayla')).toHaveValue('42');

  await player.getByTestId('character-Ayla').getByRole('button', { name: 'Inventory' }).click();
  await player.getByTestId('inventory-character-select').selectOption({ label: 'Borin' });
  await expect(player.getByRole('heading', { name: 'Borin' })).toBeVisible();
  await player.getByRole('button', { name: /Add item/i }).click();
  await player.getByTestId('item-name').fill('Moon key');
  await dm.getByTestId('character-Ayla').getByRole('button', { name: 'HP +1', exact: true }).click();
  await expect(player.getByRole('heading', { name: 'Borin' })).toBeVisible();
  await expect(player.getByTestId('item-name')).toHaveValue('Moon key');

  await player.getByRole('button', { name: 'Back to Combat' }).click();
  await player.getByTestId('character-Ayla').getByRole('button', { name: 'Spells' }).click();
  await player.getByTestId('spell-character-select').selectOption({ label: 'Borin' });
  await expect(player.getByRole('button', { name: /Borin setup/i })).toBeVisible();
  await dm.getByTestId('character-Ayla').getByRole('button', { name: 'HP -1', exact: true }).click();
  await expect(player.getByRole('button', { name: /Borin setup/i })).toBeVisible();

  await player.getByRole('button', { name: 'Databases' }).click();
  await player.getByRole('button', { name: 'Conditions' }).click();
  await player.getByRole('button', { name: /Database actions/i }).click();
  await player.getByRole('button', { name: 'Add Condition' }).click();
  await player.getByPlaceholder('Name').fill('Dazed');
  await player.getByRole('combobox').selectOption('debuff');
  await player.getByPlaceholder('Description / statblock / notes').fill('Cannot take reactions.');
  await player.getByRole('button', { name: 'Save' }).click();
  await expect(player.getByRole('heading', { name: 'Dazed' })).toBeVisible();

  await player.getByRole('button', { name: 'Combat', exact: true }).click();
  await player.getByTestId('character-Ayla').getByRole('button', { name: 'Ayla' }).click();
  await player.getByPlaceholder('Search conditions').fill('Dazed');
  await player.getByRole('button', { name: 'Add selected' }).click();
  await expect(player.getByTestId('character-Ayla').getByRole('button', { name: 'Dazed' })).toBeVisible();
  await player.getByRole('button', { name: 'Close' }).click();

  await player.getByRole('button', { name: 'Databases' }).click();
  await player.getByRole('button', { name: 'Conditions' }).click();
  await player.getByRole('heading', { name: 'Exhaustion' }).scrollIntoViewIfNeeded();
  await player.getByRole('button', { name: 'Combat', exact: true }).click();
  await player.getByTestId('character-Ayla').getByRole('button', { name: 'Ayla' }).click();
  await player.getByPlaceholder('Search conditions').fill('Exhaustion');
  await player.getByTestId('condition-level-input').fill('2');
  await player.getByRole('button', { name: 'Add selected' }).click();
  await expect(player.getByText('Level 2/6')).toBeVisible();
  await player.getByTestId('effect-level-up-1').click();
  await expect(player.getByText('Level 3/6')).toBeVisible();

  await dmContext.close();
  await playerContext.close();
});
