import type { AbilityKey, Character } from './types';
import { ABILITIES, abilityModifier, saveBonus } from './characterSheet';

export interface AoeCondition {
  remainingRounds?: number;
  conditionId: string;
  level: number;
  ability?: AbilityKey;
  diceCount?: number;
  diceSides?: number;
  damageType?: string;
}

export function combatSaveBonus(character: Character, ability: AbilityKey): number {
  if (character.type === 'player') return saveBonus(character, ability);
  const stats = { ...character.abilityScores, ...(character.monsterData?.stats as Partial<Record<AbilityKey, number>> || {}) };
  const withStats = { ...character, abilityScores: stats };
  const sheet = saveBonus(withStats, ability);
  const label = ABILITIES.find(item => item.key === ability)!;
  const saves = character.monsterData?.saves ?? character.monsterData?.savingThrows;
  const match = String(saves || '').replace(/−/g, '-').match(new RegExp(`\\b(?:${label.short}|${ability})\\s*:?\\s*([+-]?\\s*\\d+)`, 'i'));
  const explicit = saves && typeof saves === 'object' ? (saves as Record<string, unknown>)[ability] ?? (saves as Record<string, unknown>)[label.short.toLowerCase()] : match?.[1]?.replace(/\s/g, '');
  if (explicit === undefined || explicit === null || explicit === '' || !Number.isFinite(Number(explicit))) return sheet;
  const proficiency = character.savingThrowProficiencies?.includes(ability) ? character.proficiencyBonus || 0 : 0;
  return Number(explicit) + sheet - abilityModifier(stats[ability]) - proficiency;
}

export function aoeOutcome(total: number, natural: number | null, dc: number, damage: number, onSuccess: 'half' | 'none', halfDamage: boolean) {
  const success = natural === 20 || (natural !== 1 && total >= dc);
  let appliedDamage = success ? onSuccess === 'half' ? Math.floor(damage / 2) : 0 : damage;
  if (halfDamage) appliedDamage = Math.floor(appliedDamage / 2);
  return { success, damage: appliedDamage };
}

export function conditionPreview(character: Character, selection: AoeCondition, condition: Record<string, unknown>) {
  const name = String(condition.name);
  const duration = selection.remainingRounds ? ` (${selection.remainingRounds} rounds)` : '';
  const existing = (character.effects || []).find(effect => {
    const current = typeof effect === 'string' ? { name: effect } : effect;
    return current.name.toLowerCase() === name.toLowerCase() && (!condition.statAdjustmentType || current.ability === selection.ability);
  });
  const current = typeof existing === 'string' ? { name: existing, level: 1 } : existing;
  if (condition.hasLevels) {
    const level = Math.min(Number(condition.maxLevel) || 20, (current ? Number(current.level) || 1 : 0) + selection.level);
    return `${name}${selection.ability ? ` (${selection.ability})` : ''} ${current ? `${current.level || 1} → ` : ''}${level}${selection.remainingRounds ? ` (${selection.remainingRounds} rounds)` : ''}`;
  }
  if (condition.hasDice || condition.defaultDiceCount) return `${name} ${selection.diceCount}d${selection.diceSides} ${selection.damageType || condition.defaultDamageType || ''}`.trim() + duration;
  return `${name}${existing ? ' (already active)' : ''}${duration}`;
}
