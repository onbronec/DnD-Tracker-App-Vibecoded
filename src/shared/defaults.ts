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

export function effectToString(effect: string | { name: string; level?: number | null; ability?: AbilityKey | null; value?: number | null }): string {
  if (typeof effect === 'string') return effect;
  const ability = ABILITIES.find(item => item.key === effect.ability)?.short;
  if (ability && effect.value) return `${effect.name} ${ability} ${effect.value}`;
  return effect.level ? `${effect.name} ${effect.level}` : effect.name;
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
