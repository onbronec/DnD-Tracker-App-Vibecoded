import type { AbilityKey, Character, Effect } from './types';

export const ABILITIES: Array<{ key: AbilityKey; label: string; short: string }> = [
  { key: 'strength', label: 'Strength', short: 'STR' },
  { key: 'dexterity', label: 'Dexterity', short: 'DEX' },
  { key: 'constitution', label: 'Constitution', short: 'CON' },
  { key: 'intelligence', label: 'Intelligence', short: 'INT' },
  { key: 'wisdom', label: 'Wisdom', short: 'WIS' },
  { key: 'charisma', label: 'Charisma', short: 'CHA' }
];

export const SKILLS: Array<{ key: string; label: string; ability: AbilityKey }> = [
  { key: 'acrobatics', label: 'Acrobatics', ability: 'dexterity' },
  { key: 'animalHandling', label: 'Animal Handling', ability: 'wisdom' },
  { key: 'arcana', label: 'Arcana', ability: 'intelligence' },
  { key: 'athletics', label: 'Athletics', ability: 'strength' },
  { key: 'deception', label: 'Deception', ability: 'charisma' },
  { key: 'history', label: 'History', ability: 'intelligence' },
  { key: 'insight', label: 'Insight', ability: 'wisdom' },
  { key: 'intimidation', label: 'Intimidation', ability: 'charisma' },
  { key: 'investigation', label: 'Investigation', ability: 'intelligence' },
  { key: 'medicine', label: 'Medicine', ability: 'wisdom' },
  { key: 'nature', label: 'Nature', ability: 'intelligence' },
  { key: 'perception', label: 'Perception', ability: 'wisdom' },
  { key: 'performance', label: 'Performance', ability: 'charisma' },
  { key: 'persuasion', label: 'Persuasion', ability: 'charisma' },
  { key: 'religion', label: 'Religion', ability: 'intelligence' },
  { key: 'sleightOfHand', label: 'Sleight of Hand', ability: 'dexterity' },
  { key: 'stealth', label: 'Stealth', ability: 'dexterity' },
  { key: 'survival', label: 'Survival', ability: 'wisdom' }
];

export function defaultAbilityScores(): Record<AbilityKey, number> {
  return {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10
  };
}

export function abilityModifier(score: number) {
  return Math.floor((score - 10) / 2);
}

export function signed(value: number) {
  return value >= 0 ? `+${value}` : String(value);
}

export function clampAbilityScore(score: number) {
  return Math.max(1, Math.min(30, Math.round(Number(score) || 10)));
}

export function clampProficiencyBonus(value: number) {
  return Math.max(0, Math.min(10, Math.round(Number(value) || 0)));
}

export function adjustedAbilityScores(character: Character) {
  const scores = { ...defaultAbilityScores(), ...(character.abilityScores || {}) };
  const adjustments: Partial<Record<AbilityKey, string[]>> = {};

  (character.effects || []).forEach(effect => {
    const current = normalizeEffectLike(effect);
    if (!current.ability || !ABILITIES.some(ability => ability.key === current.ability)) return;
    const value = Number(current.value ?? current.level ?? 0);
    if (!Number.isFinite(value)) return;

    if (current.name === 'Ability Score Set') {
      scores[current.ability] = clampAbilityScore(value);
      adjustments[current.ability] = [...(adjustments[current.ability] || []), `set ${scores[current.ability]}`];
    } else if (current.name === 'Ability Score Increased') {
      scores[current.ability] = clampAbilityScore(scores[current.ability] + value);
      adjustments[current.ability] = [...(adjustments[current.ability] || []), `+${value}`];
    } else if (current.name === 'Ability Score Reduced') {
      scores[current.ability] = clampAbilityScore(scores[current.ability] - value);
      adjustments[current.ability] = [...(adjustments[current.ability] || []), `-${value}`];
    }
  });

  return { scores, adjustments };
}

export function saveBonus(character: Character, ability: AbilityKey, adjustedScores = adjustedAbilityScores(character).scores) {
  const proficient = (character.savingThrowProficiencies || []).includes(ability);
  return abilityModifier(adjustedScores[ability]) + (proficient ? character.proficiencyBonus || 0 : 0);
}

export function skillBonus(character: Character, skillKey: string, adjustedScores = adjustedAbilityScores(character).scores) {
  const skill = SKILLS.find(item => item.key === skillKey);
  if (!skill) return 0;
  const proficient = (character.skillProficiencies || []).includes(skillKey);
  const expert = (character.skillExpertise || []).includes(skillKey);
  const proficiency = character.proficiencyBonus || 0;
  return abilityModifier(adjustedScores[skill.ability]) + (expert ? proficiency * 2 : proficient ? proficiency : 0);
}

function normalizeEffectLike(effect: Effect | string) {
  if (typeof effect === 'string') return { name: effect, ability: null, value: null, level: null };
  return effect;
}
