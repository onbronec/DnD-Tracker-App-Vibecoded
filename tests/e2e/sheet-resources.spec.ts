import { expect, test } from '@playwright/test';
import { io } from 'socket.io-client';

async function harness() {
  const socket = io('http://127.0.0.1:3100', { reconnection: false });
  await new Promise<void>(resolve => socket.once('connect', resolve));
  const registered = new Promise<void>(resolve => socket.once('auth:registered', () => resolve()));
  socket.emit('auth:register', { mode: 'dm', token: 'test-token' });
  await registered;
  const submit = (type: string, payload = {}) => new Promise<void>((resolve, reject) => socket.emit('action:submit', { type, payload }, (result: { ok: boolean; error?: string }) => result.ok ? resolve() : reject(new Error(result.error))));
  return { socket, submit };
}

test('optional condition duration expires at round end and undo restores it for both clients', async ({ browser }) => {
  const { socket, submit } = await harness();
  const dmContext = await browser.newContext();
  const playerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    await submit('combat.import', { characters: [
      { id: 'timed', name: 'Timed Hero', type: 'player', maxHp: 20, currentHp: 20, effects: ['Blessed'], initiative: 20 },
      { id: 'other', name: 'Other Hero', type: 'player', maxHp: 20, currentHp: 20, initiative: 10 }
    ], combatState: { active: true, round: 1, currentTurn: 1, playedThisRound: [0] } });
    const dm = await dmContext.newPage();
    const player = await playerContext.newPage();
    await dm.goto('/?mode=dm&token=test-token');
    await player.goto('/?mode=player');
    await player.getByTestId('character-Timed Hero').getByRole('button', { name: 'Timed Hero', exact: true }).click();
    const dialog = player.getByRole('dialog');
    await dialog.getByPlaceholder('Search conditions').fill('Hasted');
    await dialog.getByText('Duration (optional)', { exact: true }).click();
    await dialog.getByRole('spinbutton', { name: /Rounds, expires at round end/ }).fill('1');
    await dialog.getByRole('button', { name: 'Add selected', exact: true }).click();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(player.getByTestId('character-Timed Hero').getByTitle('1 rounds remaining; expires at round end')).toHaveText('1');
    await dm.getByRole('button', { name: 'Next turn', exact: true }).click();
    await expect(player.getByTestId('character-Timed Hero')).not.toContainText('Hasted');
    await expect(player.getByTestId('character-Timed Hero')).toContainText('Blessed');
    await dm.getByRole('button', { name: 'History', exact: true }).click();
    await dm.getByRole('button', { name: 'Undo page', exact: true }).click();
    await expect(player.getByTestId('character-Timed Hero').getByTitle('1 rounds remaining; expires at round end')).toBeVisible();
  } finally {
    socket.disconnect();
    await dmContext.close();
    await playerContext.close();
  }
});

test('known spells spend shared and spark resources while tracked actions share text and usage', async ({ browser }) => {
  const { socket, submit } = await harness();
  const context = await browser.newContext();
  try {
    await submit('database.spell.upsert', { spell: { id: 'test-low', name: 'Test Low', levelKey: '1', description: 'Rules text.\n\n'.repeat(60) } });
    await submit('database.spell.upsert', { spell: { id: 'test-high', name: 'Test High', levelKey: '9', description: 'High spell.' } });
    await submit('database.spell.upsert', { spell: { id: 'test-epic', name: 'Test Epic', levelKey: 'epic1', description: 'Epic spell.' } });
    await submit('combat.import', { characters: [
      { id: 'nif', name: 'Nif', type: 'player', maxHp: 20, currentHp: 20, spellbook: { knownSpellIds: ['test-low', 'test-high'] }, customFeatures: [
        { name: 'Warlock Spells', maxUses: 4, used: 0 }, { name: 'Asuryan Blessing', maxUses: 1, used: 0 }, { name: 'Force Cage', maxUses: 1, used: 0 }, { name: 'Storm of Light-Lings', maxUses: 1, used: 0 }, { name: 'Foresight', maxUses: 1, used: 0 }
      ] },
      { id: 'anir', name: 'Anir', type: 'player', maxHp: 20, currentHp: 20, effects: ['Divine Spark'], spellbook: { knownSpellIds: ['test-epic'] }, customFeatures: [{ name: 'Divine Spark', maxUses: 2, used: 0, statusEffect: true, statusName: 'Divine Spark', shortRestRegainType: 'none' }] }
    ], combatState: { active: false } });
    const page = await context.newPage();
    await page.goto('/?mode=player');
    await page.getByTestId('character-Nif').getByRole('button', { name: 'Sheet', exact: true }).click();
    await page.getByTestId('spell-Test Low').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Casting resources')).toContainText('Warlock Spells 4/4');
    await dialog.getByRole('button', { name: 'Cast Test Low', exact: true }).click();
    await expect(dialog.getByLabel('Casting resources')).toContainText('3/4');
    await dialog.locator('.item-detail-body').evaluate(element => { element.scrollTop = element.scrollHeight; });
    await expect(dialog.getByLabel('Casting resources')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cast Test Low', exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'test-results/spell-detail-mobile.png' });
    expect(await dialog.locator('.modal-card').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await expect(dialog.getByRole('button', { name: 'Cast Test Low', exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByTestId('spell-Test High').click();
    await dialog.getByRole('button', { name: 'Cast Test High', exact: true }).click();
    await expect(dialog.getByLabel('Casting resources')).toContainText('Foresight 0/1');
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: /Nif setup/ }).click();
    await expect(page.getByRole('combobox', { name: 'Casting type', exact: true })).toHaveValue('warlock');
    await page.getByRole('button', { name: 'Short Rest', exact: true }).click();
    await page.getByTestId('spell-Test High').click();
    await expect(dialog.getByLabel('Casting resources')).toContainText('Foresight 1/1');
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();

    await page.getByRole('button', { name: 'Add tracked action', exact: true }).click();
    await dialog.getByPlaceholder('Feature name').fill('Arc Burst');
    await dialog.getByPlaceholder('Max uses').fill('3');
    await dialog.getByLabel('Feature description', { exact: true }).fill('**Shared action text**');
    await expect(dialog.getByLabel('Show in Actions / Attacks')).toBeChecked();
    await dialog.getByRole('button', { name: 'Add feature', exact: true }).click();
    const action = page.locator('#sheet-actions .feature-row').filter({ hasText: 'Arc Burst' });
    const feature = page.locator('#sheet-features .feature-row').filter({ hasText: 'Arc Burst' });
    await action.getByRole('button', { name: 'Arc Burst use 1', exact: true }).click();
    await expect(feature).toContainText('1/3 used');
    await action.getByText('Description', { exact: true }).click();
    await expect(action.getByText('Shared action text', { exact: true })).toBeVisible();
    await feature.getByRole('button', { name: 'Edit', exact: true }).click();
    await dialog.getByLabel('Feature description', { exact: true }).fill('**Edited from Custom Features**');
    await dialog.getByRole('button', { name: 'Save feature', exact: true }).click();
    await expect(action.getByText('Edited from Custom Features', { exact: true })).toBeVisible();

    await page.getByTestId('spell-character-select').selectOption('anir');
    await page.getByTestId('spell-Test Epic').click();
    await expect(dialog.getByLabel('Casting resources')).toContainText('condition first');
    await dialog.getByRole('button', { name: 'Cast Test Epic', exact: true }).click();
    await expect(dialog.getByLabel('Casting resources')).toContainText('Divine Spark 2/2');
    await expect(dialog.getByLabel('Casting resources')).not.toContainText('condition first');
    await dialog.getByRole('button', { name: 'Cast Test Epic', exact: true }).click();
    await expect(dialog.getByLabel('Casting resources')).toContainText('Divine Spark 1/2');
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.locator('#sheet-features .feature-row').filter({ hasText: 'Divine Spark' })).toContainText('1/2 used');
  } finally {
    socket.disconnect();
    await context.close();
  }
});

test('Channel Divinity actions keep separate descriptions and spend one shared use across clients', async ({ browser }) => {
  const { socket, submit } = await harness();
  const playerContext = await browser.newContext();
  const dmContext = await browser.newContext();
  try {
    await submit('combat.import', { characters: [{ id: 'cleric', name: 'Cleric', type: 'player', maxHp: 30, currentHp: 30 }], combatState: { active: false } });
    const page = await playerContext.newPage();
    const dm = await dmContext.newPage();
    await page.goto('/?mode=player');
    await dm.goto('/?mode=dm&token=test-token');
    await page.getByTestId('character-Cleric').getByRole('button', { name: 'Sheet', exact: true }).click();
    await dm.getByTestId('character-Cleric').getByRole('button', { name: 'Sheet', exact: true }).click();
    await page.getByRole('button', { name: 'Add tracked action', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Feature name', { exact: true }).fill('Channel Divinity');
    await dialog.getByLabel('Feature description', { exact: true }).fill('Shared divine resource.');
    await dialog.getByText('Actions sharing this resource (0)', { exact: true }).click();
    await dialog.getByRole('button', { name: 'Add action', exact: true }).click();
    await dialog.getByRole('textbox', { name: 'Action 1 name', exact: true }).fill('Turn Undead');
    await dialog.getByLabel('Action 1 description', { exact: true }).fill('**Turn** nearby undead.');
    await dialog.getByRole('button', { name: 'Add action', exact: true }).click();
    await dialog.getByRole('textbox', { name: 'Action 2 name', exact: true }).fill('Radiance of the Dawn');
    await dialog.getByLabel('Action 2 description', { exact: true }).fill('Deal **radiant damage**.');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await dialog.locator('.modal-card').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await dialog.getByRole('button', { name: 'Add feature', exact: true }).click();
    const actions = page.locator('#sheet-actions .feature-row').filter({ hasText: 'Channel Divinity' });
    const feature = page.locator('#sheet-features .feature-row').filter({ hasText: 'Channel Divinity' });
    const dmFeature = dm.locator('#sheet-features .feature-row').filter({ hasText: 'Channel Divinity' });
    await actions.getByText('Turn Undead', { exact: true }).click();
    await expect(actions.getByText('nearby undead.', { exact: false })).toBeVisible();
    await actions.getByText('Radiance of the Dawn', { exact: true }).click();
    await expect(actions.getByText('radiant damage', { exact: true })).toBeVisible();
    await actions.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/shared-feature-actions-mobile.png' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await actions.getByRole('button', { name: 'Use Turn Undead', exact: true }).click();
    await expect(feature).toContainText('1/1 used, 0 available');
    await expect(dmFeature).toContainText('1/1 used, 0 available');
    await expect(actions.getByRole('button', { name: 'Use Radiance of the Dawn', exact: true })).toBeDisabled();
    await dm.locator('body').click({ position: { x: 10, y: 10 } });
    await dm.keyboard.press('Backspace');
    await expect(actions.getByRole('button', { name: 'Use Radiance of the Dawn', exact: true })).toBeEnabled();
    await actions.getByRole('button', { name: 'Use Radiance of the Dawn', exact: true }).click();
    await expect(dmFeature).toContainText('1/1 used, 0 available');
    await dm.getByRole('button', { name: 'History', exact: true }).click();
    await expect(dm.locator('.history-label').filter({ hasText: 'Channel Divinity — Radiance of the Dawn' }).first()).toBeVisible();

    await feature.getByRole('button', { name: 'Edit', exact: true }).click();
    await dialog.getByText('Actions sharing this resource (2)', { exact: true }).click();
    await dialog.getByLabel('Action 2 description', { exact: true }).fill('**Updated radiant rules**.');
    await dmFeature.getByRole('button', { name: 'Channel Divinity use 1', exact: true }).click();
    await expect(actions).toContainText('0/1 used, 1 available');
    await expect(dialog.getByLabel('Action 2 description', { exact: true })).toHaveValue('**Updated radiant rules**.');
    await dialog.getByRole('button', { name: 'Remove action 1', exact: true }).click();
    await dialog.getByRole('button', { name: 'Save feature', exact: true }).click();
    await expect(actions.getByText('Updated radiant rules', { exact: true })).toBeVisible();
    await expect(actions.getByRole('button', { name: 'Use Turn Undead', exact: true })).toHaveCount(0);
    await expect(actions).toContainText('0/1 used, 1 available');
    await page.reload();
    await page.getByTestId('character-Cleric').getByRole('button', { name: 'Sheet', exact: true }).click();
    await expect(actions.getByRole('button', { name: 'Use Radiance of the Dawn', exact: true })).toBeVisible();
  } finally {
    socket.disconnect();
    await playerContext.close();
    await dmContext.close();
  }
});

test('compact sheets search descriptions and support bonus actions and reactions with shared costs', async ({ browser }) => {
  const { socket, submit } = await harness();
  const context = await browser.newContext();
  const dmContext = await browser.newContext();
  try {
    await submit('database.spell.upsert', { spell: { id: 'search-flame', name: 'Search Flame', levelKey: '1', description: 'A searchable blazing spell.' } });
    await submit('combat.import', { characters: [{ id: 'fighter', name: 'Fighter', type: 'player', maxHp: 30, currentHp: 30, maxReactions: 1, currentReactions: 1, effects: ['Stunned'], spellSlots: { '1': { max: 1, used: 0 } }, spellbook: { knownSpellIds: ['search-flame'] }, characterAbilities: [{ id: 'lore', name: 'Ancient Training', description: 'Forgotten swordmasters.' }], customFeatures: [{ id: 'techniques', name: 'Battle Techniques', maxUses: 4, used: 0, isAction: true, description: 'A shared pool of **techniques**.', actions: [
      { id: 'strike', name: 'Power Strike', description: 'Strike hard.' }, { id: 'quick', name: 'Quick Step', description: 'Reposition swiftly.' }, { id: 'riposte', name: 'Riposte', description: '**Counter strike** after a miss.' }
    ] }] }], combatState: { active: false } });
    const page = await context.newPage();
    const dm = await dmContext.newPage();
    await page.goto('/?mode=player');
    await dm.goto('/?mode=dm&token=test-token');
    await page.getByTestId('character-Fighter').getByRole('button', { name: 'Sheet', exact: true }).click();
    const feature = page.locator('#sheet-features .feature-row').filter({ hasText: 'Battle Techniques' });
    const actions = page.locator('#sheet-actions .feature-row').filter({ hasText: 'Battle Techniques' });
    const dialog = page.getByRole('dialog');
    await feature.getByRole('button', { name: 'Edit', exact: true }).click();
    await dialog.getByText('Actions sharing this resource (3)', { exact: true }).click();
    await dialog.getByRole('combobox', { name: 'Action 2 type', exact: true }).selectOption('bonus');
    await dialog.getByRole('combobox', { name: 'Action 3 type', exact: true }).selectOption('reaction');
    await expect(dialog.getByLabel('Spend a reaction when used', { exact: true })).toBeChecked();
    await dialog.getByRole('button', { name: 'Save feature', exact: true }).click();
    await expect(actions.getByText('Bonus action', { exact: true })).toBeVisible();
    await expect(actions.getByText('Reaction', { exact: true })).toBeVisible();
    expect(await actions.evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(210);

    await page.getByRole('button', { name: 'Edit actions', exact: true }).click();
    await dialog.getByPlaceholder('Ability heading', { exact: true }).fill('Quick Dash');
    await dialog.getByRole('combobox', { name: 'Action type', exact: true }).selectOption('bonus');
    await dialog.getByLabel('Ability notes', { exact: true }).fill('Dash quickly.');
    await dialog.getByRole('button', { name: 'Add action', exact: true }).click();
    await dialog.getByPlaceholder('Ability heading', { exact: true }).fill('Opportunity Attack');
    await dialog.getByRole('combobox', { name: 'Action type', exact: true }).selectOption('reaction');
    await dialog.getByLabel('Ability notes', { exact: true }).fill('Attack when enemies leave your reach.');
    await dialog.getByRole('button', { name: 'Add action', exact: true }).click();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.locator('#sheet-actions').getByRole('heading', { name: 'Bonus Actions', exact: true })).toBeVisible();
    await expect(page.locator('#sheet-actions').getByRole('heading', { name: 'Reactions', exact: true })).toBeVisible();

    const search = page.getByRole('combobox', { name: "Search Fighter's sheet", exact: true });
    await search.fill('stunned');
    await page.getByRole('option', { name: 'Stunned Condition', exact: true }).click();
    await expect(page.locator('#sheet-health').getByRole('button', { name: 'Stunned', exact: true })).toHaveCount(1);
    await search.fill('counter strike');
    await dm.getByTestId('character-Fighter').getByRole('button', { name: 'HP -1', exact: true }).click();
    await expect(search).toHaveValue('counter strike');
    await page.getByRole('option', { name: /Riposte.*Battle Techniques/ }).click();
    await expect(feature.getByText('Counter strike', { exact: true })).toBeVisible();
    await expect(search).toHaveValue('');
    await search.fill('"leave your reach"');
    await expect(page.getByText('No matches in this sheet.', { exact: true })).toBeVisible();
    await search.fill('leave your reach');
    await search.press('Enter');
    await expect(dialog.getByRole('heading', { name: 'Opportunity Attack', exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Use Opportunity Attack', exact: true }).click();
    await expect(dm.getByTestId('character-Fighter').getByRole('button', { name: 'Fighter reaction 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(actions.getByLabel('Used reactions', { exact: true })).toHaveText('R 1/1 used');
    await expect(actions.getByRole('button', { name: 'Use Riposte', exact: true })).toBeDisabled();
    await expect(feature).toContainText('0/4 used, 4 available');
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.keyboard.press('Backspace');
    await expect(actions.getByRole('button', { name: 'Use Riposte', exact: true })).toBeEnabled();
    await actions.getByRole('button', { name: 'Use Riposte', exact: true }).click();
    await expect(feature).toContainText('1/4 used, 3 available');
    await expect(actions.getByLabel('Used reactions', { exact: true })).toHaveText('R 1/1 used');
    await actions.getByRole('button', { name: 'Use Quick Step', exact: true }).click();
    await expect(feature).toContainText('2/4 used, 2 available');

    await search.fill('search flame');
    await search.press('Enter');
    await expect(dialog.getByRole('heading', { name: 'Search Flame', exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await search.fill('swordmasters');
    await search.press('Enter');
    await expect(dialog.getByRole('heading', { name: 'Ancient Training', exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();

    await page.setViewportSize({ width: 390, height: 844 });
    await search.fill('Battle Techniques');
    await page.getByRole('option', { name: 'Battle Techniques Custom Feature', exact: true }).click();
    await expect(feature.getByText('techniques', { exact: true })).toBeVisible();
    await expect.poll(async () => feature.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      return bounds.top >= (document.getElementById('sheet-top')?.getBoundingClientRect().bottom || 0) && bounds.bottom < innerHeight - 70;
    })).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('#sheet-top').evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(130);
    await page.screenshot({ path: 'test-results/compact-actions-mobile.png' });
    await search.fill('Riposte');
    await expect(page.getByRole('option', { name: /Riposte/ })).toBeVisible();
    await search.press('Escape');
    await expect(page.getByRole('listbox', { name: 'Sheet search results', exact: true })).toHaveCount(0);
  } finally {
    socket.disconnect();
    await context.close();
    await dmContext.close();
  }
});
