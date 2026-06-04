import type { CharacterSpellbook, SpellDatabaseEntry } from './types';

export function spellLevelSortKey(levelKey: string) {
  if (levelKey === 'cantrip') return 0;
  const numeric = Number(levelKey);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 9) return numeric;
  const epic = String(levelKey).match(/^epic([1-3])$/);
  if (epic) return 9 + Number(epic[1]);
  return 20;
}

export function groupedSpells(spells: SpellDatabaseEntry[]) {
  const groups = new Map<string, { key: string; label: string; spells: SpellDatabaseEntry[] }>();
  spells.forEach(spell => {
    const key = spell.levelKey || 'special-unknown';
    if (!groups.has(key)) groups.set(key, { key, label: spell.levelLabel || 'Special', spells: [] });
    groups.get(key)?.spells.push(spell);
  });
  return [...groups.values()]
    .map(group => ({ ...group, spells: [...group.spells].sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => {
      const diff = spellLevelSortKey(a.key) - spellLevelSortKey(b.key);
      return diff || a.label.localeCompare(b.label);
    });
}

export function isCantrip(spell: SpellDatabaseEntry) {
  return spell.levelKey === 'cantrip';
}

export function isEpicSpell(spell: SpellDatabaseEntry) {
  return /^epic[1-3]$/.test(spell.levelKey);
}

export function isNormalPreparedSpell(spell: SpellDatabaseEntry) {
  const level = Number(spell.levelKey);
  return Number.isInteger(level) && level >= 1 && level <= 9;
}

export function spellIsActive(spell: SpellDatabaseEntry, spellbook: CharacterSpellbook) {
  if (!spellbook.preparesSpells || isCantrip(spell)) return true;
  return spellbook.preparedSpellIds.includes(spell.id);
}
