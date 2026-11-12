import { expect, test } from '@playwright/test';
import { io } from 'socket.io-client';
import { parseMonsterMarkdown } from '../../src/shared/monsterParser';
import { epicMonsterStatblock } from '../fixtures/epicMonster';

test('epic options share an atomic pool across clients and keep encounter cooldowns on mobile', async ({ browser }) => {
  const socket = io('http://127.0.0.1:3100', { reconnection: false });
  await new Promise<void>(resolve => socket.once('connect', resolve));
  const registered = new Promise<void>(resolve => socket.once('auth:registered', () => resolve()));
  socket.emit('auth:register', { mode: 'dm', token: 'test-token' });
  await registered;
  const submit = (type: string, payload = {}) => new Promise<void>((resolve, reject) => socket.emit('action:submit', { type, payload }, (result: { ok: boolean; error?: string }) => result.ok ? resolve() : reject(new Error(result.error))));
  const firstContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const secondContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const parsed = parseMonsterMarkdown(epicMonsterStatblock);
    await submit('combat.import', { characters: [
      { id: 'epic-hero', name: 'Epic Hero', type: 'player', maxHp: 30, currentHp: 30, initiative: 20 },
      { id: 'epic-priest', name: 'Epic Priest', type: 'monster', maxHp: 450, currentHp: 450, initiative: 10, monsterData: parsed, monsterAbilities: parsed.monsterAbilities }
    ], combatState: { active: true, round: 1, currentTurn: 0, playedThisRound: [] } });
    const first = await firstContext.newPage();
    const second = await secondContext.newPage();
    for (const page of [first, second]) {
      await page.goto('/?mode=dm&token=test-token');
      await expect(page.getByText('DM View')).toBeVisible();
      await page.getByRole('button', { name: 'Monster Abilities', exact: true }).click();
    }
    const group = first.getByTestId('epic-action-3');
    const mirror = second.getByTestId('epic-action-3');
    await expect(group.getByRole('heading', { name: 'Divine Intervention', exact: true })).toBeVisible();
    await expect(group.locator('.epic-option')).toHaveCount(3);
    await expect(group.getByText('2/2 available', { exact: true })).toBeVisible();
    await group.getByRole('button', { name: 'Use Divine Command', exact: true }).click();
    await expect(mirror.getByText('1/2 available', { exact: true })).toBeVisible();
    await expect(mirror.getByRole('button', { name: 'Use Divine Command', exact: true })).toBeDisabled();
    await mirror.getByRole('button', { name: 'Use Divine Arcana', exact: true }).click();
    await expect(group.getByText('0/2 available', { exact: true })).toBeVisible();
    await expect(group.getByRole('button', { name: 'Use Arcane Missile Storm', exact: true })).toBeDisabled();
    await submit('combat.nextTurn');
    await expect(group.getByText('2/2 available', { exact: true })).toBeVisible();
    await expect(group.getByRole('button', { name: 'Use Divine Command', exact: true })).toBeDisabled();
    await expect(group.getByRole('button', { name: 'Use Divine Arcana', exact: true })).toBeEnabled();
    await group.scrollIntoViewIfNeeded();
    await first.screenshot({ path: 'test-results/epic-actions-shared-pool.png' });
    await mirror.scrollIntoViewIfNeeded();
    expect(await second.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await second.screenshot({ path: 'test-results/epic-actions-shared-pool-mobile.png' });
    await second.reload();
    await second.getByRole('button', { name: 'Monster Abilities', exact: true }).click();
    await expect(second.getByTestId('epic-action-3').getByText('1/1 used · encounter', { exact: true })).toBeVisible();
  } finally {
    socket.disconnect();
    await firstContext.close();
    await secondContext.close();
  }
});
