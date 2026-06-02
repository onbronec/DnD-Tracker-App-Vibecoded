import type { Inventory } from './types';

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

export function effectToString(effect: string | { name: string; level?: number | null }): string {
  if (typeof effect === 'string') return effect;
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
