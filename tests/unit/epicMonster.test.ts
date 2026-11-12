import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { parseMonsterMarkdown } from '../../src/shared/monsterParser';
import { epicMonsterStatblock } from '../fixtures/epicMonster';

const require = createRequire(import.meta.url);
const { createInitialState } = require('../../server/defaults');
const { applyGameAction, undoPage, redoPage } = require('../../server/actions');
const { migrateAutosave, normalizeMonsterDbItem } = require('../../server/migrations');
const { authorizeAction } = require('../../server/permissions');
const dm = { id: 'dm', role: 'dm' };

describe('epic monster persistence', () => {
  it('preserves parsed epic rules and scores through database save, undo, redo and autosave migration', () => {
    const state = createInitialState();
    const monster = { ...parseMonsterMarkdown(epicMonsterStatblock), id: 'epic-priest' };
    applyGameAction(state, { type: 'database.monster.upsert', page: 'databases', payload: { monster } }, dm);
    const saved = state.monsterDatabase.find((entry: any) => entry.id === monster.id);
    expect(saved.stats.intelligence).toBe(34);
    expect(saved.monsterAbilities.epicActions.actions.map((action: any) => action.maxUses)).toEqual([0, 0, 0, 2]);
    undoPage(state, 'databases', dm);
    expect(state.monsterDatabase.some((entry: any) => entry.id === monster.id)).toBe(false);
    redoPage(state, 'databases', dm);
    const reloaded = migrateAutosave(JSON.parse(JSON.stringify(state))).monsterDatabase.find((entry: any) => entry.id === monster.id);
    expect(reloaded).toEqual(saved);
  });

  it('retains the legacy default for missing epic maxUses', () => {
    const monster = normalizeMonsterDbItem({ monsterAbilities: { epicActions: { enabled: true, actions: [{ name: 'Legacy' }] } } });
    expect(monster.monsterAbilities.epicActions.actions[0].maxUses).toBe(1);
  });

  it('upgrades old Markdown groups once and preserves existing counters', () => {
    const legacy = { name: 'Divine Intervention (2/Round)', maxUses: 2, used: 1,
      description: '**Divine Intervention.** Choose an option.\n\n### Divine Command — 3 Divine Favor (1/Encounter)\n\nRevive an ally.\n\n### Divine Arcana — Variable Divine Favor\n\n| Spell | Cost |\n| --- | --- |\n| Epic | 3 |' };
    const normalized = normalizeMonsterDbItem({ monsterAbilities: { epicActions: { enabled: true, actions: [legacy] } } });
    const action = normalized.monsterAbilities.epicActions.actions[0];
    expect(action.used).toBe(1);
    expect(action.options).toHaveLength(2);
    expect(action.options[0]).toMatchObject({ name: 'Divine Command', maxUses: 1, used: 0, resetOn: 'encounter', cost: '3 Divine Favor' });
    expect(action.description).not.toContain('###');
    expect(normalizeMonsterDbItem(normalized)).toEqual(normalized);
  });

  it('spends shared and individual limits atomically, synchronizes turns, and keeps encounter limits', () => {
    const state = createInitialState();
    const parsed = parseMonsterMarkdown(epicMonsterStatblock);
    applyGameAction(state, { type: 'character.add', payload: { id: 'priest', name: 'Priest', type: 'monster', maxHp: 450, currentHp: 450, initiative: 10, monsterData: parsed, monsterAbilities: parsed.monsterAbilities } }, dm);
    applyGameAction(state, { type: 'character.add', payload: { id: 'hero', name: 'Hero', type: 'player', maxHp: 30, initiative: 20 } }, dm);
    applyGameAction(state, { type: 'combat.start' }, dm);
    const findGroup = () => state.characters.find((c: any) => c.id === 'priest').monsterAbilities.epicActions.actions[3];
    const use = (optionIndex: number) => applyGameAction(state, { type: 'monster.epic.use', payload: { characterId: 'priest', index: 3, optionIndex } }, dm);
    expect(authorizeAction(state, { type: 'monster.epic.use', payload: { characterId: 'priest', index: 3, optionIndex: 0 } }, { role: 'player' }).ok).toBe(false);
    use(0);
    expect(findGroup().used).toBe(1);
    expect(findGroup().options[0].used).toBe(1);
    expect(() => use(0)).toThrow(/Limit/);
    expect(findGroup().used).toBe(1);
    use(1);
    expect(findGroup().used).toBe(2);
    expect(() => use(2)).toThrow(/Sdileny/);
    expect(findGroup().options[2].used).toBe(0);
    undoPage(state, 'monsters', dm);
    expect(findGroup().used).toBe(1);
    redoPage(state, 'monsters', dm);
    expect(findGroup().used).toBe(2);
    const reloaded = migrateAutosave(JSON.parse(JSON.stringify(state)));
    expect(reloaded.characters.find((c: any) => c.id === 'priest').monsterAbilities.epicActions.actions[3]).toEqual(findGroup());
    applyGameAction(state, { type: 'combat.nextTurn' }, dm);
    expect(findGroup().used).toBe(0);
    expect(findGroup().options[0].used).toBe(1);
    expect(() => use(0)).toThrow(/Limit/);
    use(1);
    applyGameAction(state, { type: 'monster.epic.option.reset', payload: { characterId: 'priest', index: 3, optionIndex: 0 } }, dm);
    expect(findGroup().options[0].used).toBe(0);
    expect(findGroup().used).toBe(1);
    use(0);
    applyGameAction(state, { type: 'combat.end' }, dm);
    applyGameAction(state, { type: 'combat.start' }, dm);
    expect(findGroup().options[0].used).toBe(0);
  });

  it('shares epic pools and encounter limits across both initiative entries of one monster', () => {
    const state = createInitialState();
    const parsed = parseMonsterMarkdown(epicMonsterStatblock);
    applyGameAction(state, { type: 'character.add', payload: { id: 'dual', name: 'Dual', type: 'monster', hasMultipleTurns: true, maxHp: 100, initiative: 20, monsterData: parsed, monsterAbilities: parsed.monsterAbilities } }, dm);
    applyGameAction(state, { type: 'combat.start' }, dm);
    const group = (id: string) => state.characters.find((c: any) => c.id === id).monsterAbilities.epicActions.actions[3];
    applyGameAction(state, { type: 'monster.epic.use', payload: { characterId: 'dual', index: 3, optionIndex: 0 } }, dm);
    expect(group('dual_turn2').used).toBe(1);
    expect(group('dual_turn2').options[0].used).toBe(1);
    applyGameAction(state, { type: 'combat.nextTurn' }, dm);
    expect(group('dual').used).toBe(0);
    expect(group('dual').options[0].used).toBe(1);
    expect(() => applyGameAction(state, { type: 'monster.epic.use', payload: { characterId: 'dual_turn2', index: 3, optionIndex: 0 } }, dm)).toThrow(/Limit/);
  });
});
