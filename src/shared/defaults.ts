import type { AbilityKey, Inventory } from './types';
import { ABILITIES } from './characterSheet';

export function createEmptyInventory(): Inventory {
  return {
    currency: { manaCoins: 0, platinum: 0, gold: 0, silver: 0, copper: 0 },
    spellComponents: [],
    potions: [],
    scrolls: [],
    generalItems: [],
    magicItems: []
  };
}

export function effectToString(effect: string | { name: string; level?: number | null; ability?: AbilityKey | null; value?: number | null; diceCount?: number | null; diceSides?: number | null; damageType?: string | null }): string {
  if (typeof effect === 'string') return effect;
  const ability = ABILITIES.find(item => item.key === effect.ability)?.short;
  if (ability && effect.value) return `${effect.name} ${ability} ${effect.value}`;
  const parts = [effect.name];
  if (effect.level) parts.push(String(effect.level));
  if (effect.diceCount && effect.diceSides) {
    parts.push(`${effect.diceCount}d${effect.diceSides}`);
    if (effect.damageType) parts.push(String(effect.damageType));
  }
  return parts.join(' ');
}

export function hpClass(currentHp: number, maxHp: number): string {
  const percent = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;
  if (percent <= 25) return 'low';
  if (percent <= 50) return 'medium';
  return '';
}

export function monsterHealthLabel(currentHp: number, maxHp: number): string {
  const percent = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;
  if (percent > 50) return 'Healthy';
  if (percent > 25) return 'Bloodied';
  return 'Critical';
}

export const SPELL_SLOTS_TABLE: Record<number, number[]> = {
  1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
  2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
  3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
  4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
  5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
  6: [4, 3, 3, 0, 0, 0, 0, 0, 0],
  7: [4, 3, 3, 1, 0, 0, 0, 0, 0],
  8: [4, 3, 3, 2, 0, 0, 0, 0, 0],
  9: [4, 3, 3, 3, 1, 0, 0, 0, 0],
  10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
  11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
  12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
  13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
  14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
  15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
  16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
  17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
  20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
  21: [4, 3, 3, 3, 3, 2, 2, 1, 1],
  22: [4, 3, 3, 3, 3, 2, 2, 1, 1],
  23: [4, 3, 3, 3, 3, 2, 2, 1, 1],
  24: [4, 3, 3, 3, 3, 2, 2, 1, 1],
  25: [4, 3, 3, 3, 3, 2, 2, 1, 1],
  26: [4, 3, 3, 3, 3, 2, 2, 1, 1],
  27: [4, 3, 3, 3, 3, 2, 2, 1, 1],
  28: [4, 3, 3, 3, 3, 2, 2, 1, 1],
  29: [4, 3, 3, 3, 3, 2, 2, 1, 1],
  30: [4, 3, 3, 3, 3, 2, 2, 1, 1]
};

export const EPIC_SLOTS_TABLE: Record<number, Record<string, number>> = {
  21: { epic1: 0, epic2: 0, epic3: 0 },
  22: { epic1: 2, epic2: 0, epic3: 0 },
  23: { epic1: 3, epic2: 0, epic3: 0 },
  24: { epic1: 3, epic2: 1, epic3: 0 },
  25: { epic1: 3, epic2: 2, epic3: 0 },
  26: { epic1: 3, epic2: 2, epic3: 1 },
  27: { epic1: 3, epic2: 2, epic3: 1 },
  28: { epic1: 3, epic2: 2, epic3: 1 },
  29: { epic1: 3, epic2: 2, epic3: 1 },
  30: { epic1: 3, epic2: 2, epic3: 1 }
};

export function epicSlotsForLevel(level: number): Record<string, number> {
  const normalized = Math.max(0, Math.min(30, Number(level) || 0));
  const key = Object.keys(EPIC_SLOTS_TABLE)
    .map(Number)
    .filter(item => item <= normalized)
    .sort((a, b) => b - a)[0];
  return key ? EPIC_SLOTS_TABLE[key] : {};
}

export function monsterRoleClass(role?: string): string {
  const normalized = (role || 'monster').toLowerCase().trim();
  switch (normalized) {
    case 'spellcaster': return 'role-spellcaster';
    case 'elite': return 'role-elite';
    case 'leader': return 'role-leader';
    case 'ranged': return 'role-ranged';
    case 'controller': return 'role-controller';
    case 'monster':
    default:
      return 'role-monster';
  }
}

