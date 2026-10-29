import { describe, expect, it } from 'vitest';
import { aoeOutcome, combatSaveBonus } from '../../src/shared/aoe';
import type { Character } from '../../src/shared/types';
const { createInitialState } = require('../../server/defaults');
const { normalizeCharacter, normalizeMonsterDbItem } = require('../../server/migrations');
const { applyGameAction, undoPage, redoPage } = require('../../server/actions');
const { authorizeAction } = require('../../server/permissions');
const dm = { id: 'dm', role: 'dm' };

function fixture() {
  const state = createInitialState();
  state.characters = [
    normalizeCharacter({ id: 'failed', name: 'Failed', type: 'player', maxHp: 100, currentHp: 100, tempHp: 5, effects: [{ name: 'Exhaustion', level: 2 }] }),
    normalizeCharacter({ id: 'success', name: 'Success', type: 'monster', maxHp: 100, currentHp: 100 }),
    normalizeCharacter({ id: 'excluded', name: 'Excluded', type: 'player', maxHp: 100, currentHp: 100 })
  ];
  const exhaustion = state.conditionDatabase.find((item: { name: string }) => item.name === 'Exhaustion');
  const stunned = state.conditionDatabase.find((item: { name: string }) => item.name === 'Stunned');
  return { state, payload: {
    dc: 15, damageTotal: 31, onSuccess: 'half', conditions: [{ conditionId: exhaustion.id, level: 2 }, { conditionId: stunned.id, level: 1 }],
    targets: [{ characterId: 'failed', saveTotal: 10, natural: null, halfDamage: false }, { characterId: 'success', saveTotal: 20, natural: null, halfDamage: true }]
  } };
}

describe('AOE resolution', () => {
  it('applies one atomic, undoable combat action with temp HP, half damage and cumulative levels', () => {
    const { state, payload } = fixture();
    applyGameAction(state, { type: 'combat.aoe.apply', page: 'toolbelt', payload }, dm);
    expect(state.characters[0].currentHp).toBe(74);
    expect(state.characters[0].tempHp).toBe(0);
    expect(state.characters[0].effects).toEqual([{ name: 'Exhaustion', level: 4 }, { name: 'Stunned', level: null }]);
    expect(state.characters[1].currentHp).toBe(93);
    expect(state.characters[1].effects).toEqual([]);
    expect(state.characters[2].currentHp).toBe(100);
    expect(state.actionLog).toHaveLength(1);
    expect(state.actionLog[0].page).toBe('combat');
    undoPage(state, 'combat', dm);
    expect(state.characters[0].currentHp).toBe(100);
    expect(state.characters[0].tempHp).toBe(5);
    expect(state.characters[0].effects[0].level).toBe(2);
    expect(state.characters[1].currentHp).toBe(100);
    redoPage(state, 'combat', dm);
    expect(state.characters[0].effects[0].level).toBe(4);
    expect(state.characters[1].currentHp).toBe(93);
  });

  it('validates every target before changing any campaign data', () => {
    const { state, payload } = fixture();
    payload.targets[1].characterId = 'missing';
    const before = JSON.stringify(state);
    expect(() => applyGameAction(state, { type: 'combat.aoe.apply', payload }, dm)).toThrow();
    expect(JSON.stringify(state)).toBe(before);
    expect(authorizeAction(state, { type: 'combat.aoe.apply', payload }, { role: 'player' }).ok).toBe(false);
  });

  it('does not let players apply or undo/redo a DM AOE through history', () => {
    const { state, payload } = fixture();
    applyGameAction(state, { type: 'combat.aoe.apply', payload }, dm);
    expect(() => undoPage(state, 'combat', { role: 'player' })).toThrow();
    expect(state.characters[1].currentHp).toBe(93);
    undoPage(state, 'combat', dm);
    expect(() => redoPage(state, 'combat', { role: 'player' })).toThrow();
    expect(state.characters[1].currentHp).toBe(100);
    redoPage(state, 'combat', dm);
    expect(state.characters[1].currentHp).toBe(93);
  });

  it('does not duplicate simple conditions and caps cumulative levels at the condition maximum', () => {
    const { state, payload } = fixture();
    state.characters[0].effects = [{ name: 'Exhaustion', level: 5 }, { name: 'Stunned', level: null }];
    applyGameAction(state, { type: 'combat.aoe.apply', payload }, dm);
    expect(state.characters[0].effects).toEqual([{ name: 'Exhaustion', level: 6 }, { name: 'Stunned', level: null }]);
  });

  it('matches the preview for natural 1/20, no damage on success and additional halving', () => {
    for (const [total, natural, halfDamage, onSuccess] of [[100, 1, true, 'half'], [0, 20, true, 'half'], [16, null, true, 'none']] as const) {
      const { state, payload } = fixture();
      payload.targets = [{ characterId: 'success', saveTotal: total, natural, halfDamage }] as typeof payload.targets;
      payload.onSuccess = onSuccess;
      const preview = aoeOutcome(total, natural, payload.dc, payload.damageTotal, onSuccess, halfDamage);
      applyGameAction(state, { type: 'combat.aoe.apply', payload }, dm);
      expect(state.characters[1].currentHp).toBe(100 - preview.damage);
      expect(state.characters[1].effects.length > 0).toBe(!preview.success);
    }
  });

  it('synchronizes multi-turn monsters once and rejects duplicate physical targets', () => {
    const { state, payload } = fixture();
    state.characters[1].hasMultipleTurns = true;
    state.characters.push({ ...structuredClone(state.characters[1]), id: 'success_turn2', hasMultipleTurns: false });
    applyGameAction(state, { type: 'combat.aoe.apply', payload }, dm);
    expect(state.characters[3].currentHp).toBe(93);
    payload.targets.push({ characterId: 'success_turn2', saveTotal: 10, natural: null, halfDamage: false });
    const before = JSON.stringify(state);
    expect(() => applyGameAction(state, { type: 'combat.aoe.apply', payload }, dm)).toThrow();
    expect(JSON.stringify(state)).toBe(before);
  });

  it('reads monster saves and falls back to ability modifiers while retaining temporary adjustments', () => {
    const monster = normalizeCharacter({ type: 'monster', name: 'Mage', monsterData: { stats: { dexterity: 18, wisdom: 14 }, saves: 'Dex +9, Wisdom −1' }, effects: [{ name: 'Ability Score Increased', ability: 'dexterity', value: 2 }] }) as Character;
    expect(combatSaveBonus(monster, 'dexterity')).toBe(10);
    expect(combatSaveBonus(monster, 'wisdom')).toBe(-1);
    monster.monsterData!.saves = '';
    expect(combatSaveBonus(monster, 'dexterity')).toBe(5);
    expect(combatSaveBonus(monster, 'wisdom')).toBe(2);
  });

  it('preserves zero initiative and reactions for database objects', () => {
    const object = normalizeMonsterDbItem({ name: 'Hazard', entityKind: 'nonMonster', fixedInitiative: 0, maxReactions: 0 });
    expect(object.fixedInitiative).toBe(0);
    expect(object.maxReactions).toBe(0);
  });
});
