import { expect, test } from '@playwright/test';
import { io } from 'socket.io-client';

test('initiative links focus collapsed cards, monster numbers sync and abilities keep live vitals visible', async ({ browser }) => {
  const socket = io('http://127.0.0.1:3100', { reconnection: false });
  await new Promise<void>(resolve => socket.once('connect', resolve));
  const registered = new Promise<void>(resolve => socket.once('auth:registered', () => resolve()));
  socket.emit('auth:register', { mode: 'dm', token: 'test-token' });
  await registered;
  const submit = (type: string, payload = {}) => new Promise<void>((resolve, reject) => socket.emit('action:submit', { type, payload }, (result: { ok: boolean; error?: string }) => result.ok ? resolve() : reject(new Error(result.error))));
  const dmContext = await browser.newContext();
  const playerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    await submit('combat.import', { characters: Array.from({ length: 9 }, (_, index) => ({ id: `nav-hero-${index}`, name: `Nav Hero ${index + 1}`, type: 'player', maxHp: 40, currentHp: 40, initiative: 20 - index })), combatState: { active: true, round: 2, currentTurn: 0, playedThisRound: [] } });
    await submit('character.add', { id: 'nav-orc', name: 'Orc 1', type: 'monster', maxHp: 50, currentHp: 33, tempHp: 4, initiative: 10, revealedToPlayers: true, hasMultipleTurns: true, effects: ['Stunned'], monsterData: { name: 'Orc', hp: 50, ac: 15, initBonus: 2, actions: Array.from({ length: 15 }, (_, index) => ({ name: `Blade ${index + 1}`, description: 'A detailed monster attack.\n\n'.repeat(4) })) } });
    const dm = await dmContext.newPage();
    const player = await playerContext.newPage();
    await dm.goto('/?mode=dm&token=test-token');
    await player.goto('/?mode=player');
    await expect(dm.locator('.input-toggle[aria-expanded="true"]')).toHaveCount(0);
    await expect(player.locator('.input-toggle[aria-expanded="true"]')).toHaveCount(0);
    const order = dm.getByRole('navigation', { name: 'Initiative order', exact: true });
    const orc = dm.getByTestId('character-Orc 1');
    await order.getByRole('button', { name: 'Go to Orc 1', exact: true }).click();
    await expect(orc).toBeFocused();
    await expect.poll(async () => orc.evaluate(element => element.getBoundingClientRect().top >= (document.getElementById('combat-header')?.getBoundingClientRect().bottom || 0))).toBe(true);
    await expect(order.getByRole('button', { name: 'Go to Nav Hero 1', exact: true })).toHaveAttribute('aria-current', 'step');
    await expect(orc.getByPlaceholder('Damage', { exact: true })).toHaveCount(0);
    await orc.getByRole('button', { name: 'input', exact: true }).click();
    await orc.getByRole('spinbutton', { name: 'Monster number', exact: true }).fill('7');
    await orc.getByRole('spinbutton', { name: 'Monster number', exact: true }).press('Tab');
    const renamed = dm.getByTestId('character-Orc 7');
    await expect(renamed).toContainText('33/50');
    await expect(dm.getByTestId('character-Orc 7 (Turn 2)')).toBeVisible();
    await expect(player.getByTestId('character-Orc 7')).toBeVisible();
    await player.getByRole('navigation', { name: 'Initiative order', exact: true }).getByRole('button', { name: 'Go to Orc 7', exact: true }).click();
    await expect(player.getByTestId('character-Orc 7')).toBeFocused();
    await expect.poll(async () => player.getByTestId('character-Orc 7').evaluate(element => element.getBoundingClientRect().top >= (document.getElementById('combat-header')?.getBoundingClientRect().bottom || 0))).toBe(true);
    await dm.getByRole('button', { name: 'History', exact: true }).click();
    await dm.getByRole('button', { name: 'Undo page', exact: true }).click();
    await expect(dm.getByTestId('character-Orc 1')).toBeVisible();
    await dm.getByRole('button', { name: 'Redo page', exact: true }).click();
    await expect(renamed).toBeVisible();
    await dm.getByRole('button', { name: 'Collapse history', exact: true }).click();
    await renamed.getByRole('button', { name: 'Abilities', exact: true }).click();
    const status = dm.getByLabel('Orc 7 combat status', { exact: true });
    await expect(status).toContainText('HP 33/50');
    await expect(status).toContainText('Temp 4');
    await expect(status.getByRole('button', { name: 'Stunned', exact: true })).toBeVisible();
    await submit('character.adjustHp', { characterId: 'nav-orc', amount: -9 });
    await expect(status).toContainText('HP 28/50');
    await submit('effect.add', { characterId: 'nav-orc', name: 'Max HP Increased', level: 10 });
    await expect(status).toContainText('HP 28/60');
    await status.getByRole('button', { name: 'Conditions', exact: true }).click();
    await expect(dm.getByRole('dialog')).toContainText('Max HP Increased');
    await dm.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    await dm.getByRole('heading', { name: 'Blade 15', exact: true }).scrollIntoViewIfNeeded();
    await expect(status).toBeInViewport();
    await dm.setViewportSize({ width: 390, height: 844 });
    await expect(status).toBeInViewport();
    expect(await dm.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await dm.screenshot({ path: 'test-results/monster-abilities-mobile.png' });
  } finally {
    socket.disconnect();
    await dmContext.close();
    await playerContext.close();
  }
});

test('combat cards, number drafts and party rolls work together on desktop and mobile', async ({ browser }) => {
  const socket = io('http://127.0.0.1:3100', { reconnection: false });
  await new Promise<void>(resolve => socket.once('connect', () => resolve()));
  const registered = new Promise<void>(resolve => socket.once('auth:registered', () => resolve()));
  socket.emit('auth:register', { mode: 'dm', token: 'test-token' });
  await registered;
  const submit = (type: string, payload = {}) => new Promise<void>((resolve, reject) => socket.emit('action:submit', { type, payload }, (result: { ok: boolean; error?: string }) => result.ok ? resolve() : reject(new Error(result.error))));
  const dmContext = await browser.newContext();
  const playerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    await submit('combat.import', { characters: [
      { id: 'resource-hero', name: 'Resource Hero', type: 'player', maxHp: 100, currentHp: 100, effects: ['Blessed'], customFeatures: [{ name: 'Vitae', maxUses: 100, used: 11 }], maxReactions: 2, currentReactions: 1 },
      { id: 'visible-orc', name: 'Visible Orc', type: 'monster', maxHp: 100, currentHp: 50, revealedToPlayers: true, maxReactions: 3, currentReactions: 1, effects: ['Stunned'] }
    ], combatState: { active: false } });
    const dm = await dmContext.newPage();
    const player = await playerContext.newPage();
    await dm.goto('/?mode=dm&token=test-token');
    await player.goto('/?mode=player');
    const hero = player.getByTestId('character-Resource Hero');
    await expect(hero.getByRole('button', { name: 'input', exact: true })).toHaveAttribute('aria-expanded', 'false');
    await expect(hero.getByRole('button', { name: 'HP -10', exact: true })).toBeVisible();
    await expect(hero.getByRole('button', { name: 'Blessed' })).toBeVisible();
    await expect(hero.getByRole('button', { name: 'Resource Hero reaction 1' })).toHaveAttribute('aria-pressed', 'true');
    await expect(hero.getByPlaceholder('Damage')).toHaveCount(0);
    const orc = player.getByTestId('character-Visible Orc');
    await expect(orc.locator('.health-medium')).toHaveText('HPBloodied');
    await expect(orc.getByRole('button', { name: 'Visible Orc reaction 1' })).toBeDisabled();
    await expect(orc.getByRole('button', { name: 'Visible Orc reaction 3' })).toHaveAttribute('aria-pressed', 'false');
    await submit('character.adjustHp', { characterId: 'visible-orc', amount: -30 });
    await expect(orc.locator('.health-low')).toHaveText('HPCritical');
    await player.screenshot({ path: 'test-results/combat-mobile.png' });
    expect(await player.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await dm.getByTestId('character-Resource Hero').getByRole('button', { name: 'Sheet', exact: true }).click();
    const vitae = dm.getByLabel('Vitae used');
    await vitae.fill('');
    await submit('character.adjustHp', { characterId: 'resource-hero', amount: -1 });
    await expect(vitae).toHaveValue('');
    await vitae.fill('47');
    await vitae.press('Tab');
    await expect(dm.getByText(/47\/100 used/)).toBeVisible();
    await vitae.fill('');
    await vitae.press('Tab');
    await expect(dm.getByText(/0\/100 used/)).toBeVisible();
    await vitae.fill('120');
    await vitae.press('Tab');
    await expect(vitae).toHaveValue('100');
    await vitae.fill('120');
    await vitae.press('Tab');
    await expect(vitae).toHaveValue('100');

    await dm.getByRole('button', { name: 'Party Checks', exact: true }).click();
    await dm.getByRole('button', { name: 'Stealth', exact: true }).click();
    await dm.getByLabel('Difficulty class').fill('15');
    await dm.getByLabel('Resource Hero check result').fill('10');
    await dm.getByLabel('Resource Hero check result').press('Tab');
    await expect(dm.getByText('Successes 0 / Failures 1')).toBeVisible();
    await dm.getByLabel('Pass without Trace +10').check();
    await expect(dm.getByText('Successes 1 / Failures 0')).toBeVisible();
    await dm.getByRole('button', { name: 'Close', exact: true }).click();
    await dm.getByRole('button', { name: 'Party Checks', exact: true }).click();
    await dm.getByRole('button', { name: 'Stealth', exact: true }).click();
    await expect(dm.getByLabel('Resource Hero check result')).toHaveValue('10');
    await dm.getByRole('button', { name: 'Roll all', exact: true }).click();
    await expect(dm.getByText(/1d20:/)).toBeVisible();
    await dm.setViewportSize({ width: 768, height: 1024 });
    await dm.screenshot({ path: 'test-results/party-checks-tablet.png' });
    expect(await dm.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await dm.getByRole('button', { name: 'Close', exact: true }).click();

    await dm.getByRole('button', { name: 'Combat', exact: true }).click();
    await dm.getByRole('button', { name: /Add character \/ monster \/ object/ }).click();
    const form = dm.getByTestId('add-character-form');
    await form.getByLabel('Combatant type').selectOption('nonMonster');
    await form.getByPlaceholder('Name', { exact: true }).fill('Falling rocks');
    await form.getByPlaceholder('Fixed initiative').fill('12');
    await form.getByRole('button', { name: 'Add', exact: true }).click();
    const object = dm.getByTestId('character-Falling rocks');
    await expect(object).toBeVisible();
    await expect(object.getByText('12', { exact: true })).toBeVisible();
    await expect(object.getByRole('button', { name: 'HP -1', exact: true })).toHaveCount(0);
    await dm.getByRole('button', { name: 'History', exact: true }).click();
    dm.once('dialog', dialog => dialog.accept());
    await dm.getByRole('button', { name: 'Clear history', exact: true }).click();
    await expect(dm.getByText('No actions yet.')).toBeVisible();
    await expect(object).toBeVisible();
  } finally {
    socket.disconnect();
    await dmContext.close();
    await playerContext.close();
  }
});

test('AOE preview waits for Apply, synchronizes targets and undoes the whole batch', async ({ browser }) => {
  const socket = io('http://127.0.0.1:3100', { reconnection: false });
  await new Promise<void>(resolve => socket.once('connect', () => resolve()));
  const registered = new Promise<void>(resolve => socket.once('auth:registered', () => resolve()));
  socket.emit('auth:register', { mode: 'dm', token: 'test-token' });
  await registered;
  const submit = (type: string, payload = {}) => new Promise<void>((resolve, reject) => socket.emit('action:submit', { type, payload }, (result: { ok: boolean; error?: string }) => result.ok ? resolve() : reject(new Error(result.error))));
  const dmContext = await browser.newContext();
  const playerContext = await browser.newContext();
  try {
    await submit('combat.import', { characters: [
      { id: 'aoe-failed', name: 'AOE Failed', type: 'player', maxHp: 100, currentHp: 100, tempHp: 5, effects: [{ name: 'Exhaustion', level: 2 }] },
      { id: 'aoe-success', name: 'AOE Success', type: 'player', maxHp: 100, currentHp: 100 },
      { id: 'aoe-excluded', name: 'AOE Excluded', type: 'player', maxHp: 100, currentHp: 100 }
    ], combatState: { active: false } });
    await submit('character.add', { id: 'aoe-mage', name: 'AOE Mage', type: 'monster', maxHp: 100, currentHp: 100, hasMultipleTurns: true, monsterData: { stats: { dexterity: 18 }, saves: 'Dex +9' } });
    await submit('database.monster.upsert', { monster: { id: 'db-hazard', name: 'Database hazard', entityKind: 'nonMonster', fixedInitiative: 0, maxReactions: 0 } });
    const dm = await dmContext.newPage();
    const player = await playerContext.newPage();
    await dm.goto('/?mode=dm&token=test-token');
    await player.goto('/?mode=player');
    await dm.getByRole('button', { name: /Add monster \/ object from database/ }).click();
    await dm.getByLabel('Database entity type').selectOption('objects');
    await dm.getByRole('option', { name: /Database hazard/ }).click();
    await dm.getByRole('button', { name: 'Add to combat', exact: true }).click();
    await expect(dm.getByTestId('character-Database hazard').getByText('0', { exact: true })).toBeVisible();

    await expect(player.getByRole('button', { name: 'AOE Resolver', exact: true })).toHaveCount(0);
    await dm.getByRole('button', { name: 'AOE Resolver', exact: true }).click();
    const dialog = dm.getByRole('dialog');
    await dialog.getByLabel('Damage total').fill('31');
    await dialog.getByText('Applied conditions (0)').click();
    await dialog.getByPlaceholder('Search AOE conditions').fill('Exhaustion');
    await dialog.getByRole('option', { name: /Exhaustion/ }).click();
    await dialog.getByLabel('Levels to add').fill('2');
    await dialog.getByLabel('AOE Failed save total').fill('10');
    await dialog.getByLabel('AOE Success save total').fill('20');
    await dialog.getByRole('article', { name: 'AOE Success AOE target' }).getByLabel('Half damage').check();
    await dialog.getByLabel('Include AOE Excluded').uncheck();
    await expect(dialog.getByRole('article', { name: 'AOE Failed AOE target' })).toContainText('Exhaustion 2 → 4');
    await expect(dialog.getByRole('article', { name: 'AOE Success AOE target' })).toContainText('Damage 7');
    await expect(player.getByTestId('character-AOE Failed')).toContainText('100/100');
    await expect(player.getByTestId('character-AOE Failed')).toContainText('Exhaustion 2');
    await dm.screenshot({ path: 'test-results/aoe-desktop.png' });
    await dm.setViewportSize({ width: 390, height: 844 });
    await dialog.getByRole('article', { name: 'AOE Failed AOE target' }).evaluate(element => element.scrollIntoView({ block: 'start' }));
    await dm.screenshot({ path: 'test-results/aoe-mobile.png' });
    expect(await dm.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await dialog.locator('.modal-card').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await dm.setViewportSize({ width: 1280, height: 900 });
    await dialog.getByRole('button', { name: 'Apply to 2 targets', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Applied', exact: true })).toBeDisabled();
    await expect(player.getByTestId('character-AOE Failed')).toContainText('74/100');
    await expect(player.getByTestId('character-AOE Failed')).toContainText('Exhaustion 4');
    await expect(player.getByTestId('character-AOE Success')).toContainText('93/100');
    await expect(player.getByTestId('character-AOE Success')).not.toContainText('Exhaustion');
    await expect(player.getByTestId('character-AOE Excluded')).toContainText('100/100');
    await expect(dialog.getByRole('article', { name: 'AOE Failed AOE target' })).toContainText('Exhaustion 2 → 4');
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await dm.getByRole('button', { name: 'History', exact: true }).click();
    await dm.getByRole('button', { name: 'Undo page', exact: true }).click();
    await expect(player.getByTestId('character-AOE Failed')).toContainText('100/100');
    await expect(player.getByTestId('character-AOE Failed')).toContainText('Exhaustion 2');
    await expect(player.getByTestId('character-AOE Success')).toContainText('100/100');

    await dm.getByRole('button', { name: 'AOE Resolver', exact: true }).click();
    await dm.getByRole('combobox', { name: 'Targets', exact: true }).selectOption('enemies');
    await expect(dm.getByRole('article', { name: /AOE target/ })).toHaveCount(1);
    await expect(dm.getByText('DEX save +9', { exact: true })).toBeVisible();
    await dm.getByRole('button', { name: 'Roll save', exact: true }).click();
    await expect(dm.getByLabel('AOE Mage save total')).not.toHaveValue('');
    await expect(dm.getByTestId('character-AOE Mage')).toContainText('100/100');
  } finally {
    socket.disconnect();
    await dmContext.close();
    await playerContext.close();
  }
});
