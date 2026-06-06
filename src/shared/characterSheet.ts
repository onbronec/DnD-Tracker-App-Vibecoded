import type { AbilityKey, Character, Effect, SheetBonus } from './types';

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
  return abilityModifier(adjustedScores[ability]) + (proficient ? character.proficiencyBonus || 0 : 0) + bonusTotal(character, 'save', ability, { proficient, expert: false });
}

export function skillBonus(character: Character, skillKey: string, adjustedScores = adjustedAbilityScores(character).scores) {
  const skill = SKILLS.find(item => item.key === skillKey);
  if (!skill) return 0;
  const ability = skillAbility(character, skillKey);
  const proficient = (character.skillProficiencies || []).includes(skillKey);
  const expert = (character.skillExpertise || []).includes(skillKey);
  const proficiency = character.proficiencyBonus || 0;
  return abilityModifier(adjustedScores[ability]) + (expert ? proficiency * 2 : proficient ? proficiency : 0) + bonusTotal(character, 'skill', skillKey, { proficient, expert });
}

export function abilityCheckBonus(character: Character, ability: AbilityKey, adjustedScores = adjustedAbilityScores(character).scores) {
  return abilityModifier(adjustedScores[ability]) + bonusTotal(character, 'abilityCheck', ability, { proficient: false, expert: false });
}

export function spellcastingAbility(character: Character): AbilityKey {
  return character.sheetGeneral?.spellcastingAbility || 'charisma';
}

export function spellSaveDc(character: Character, adjustedScores = adjustedAbilityScores(character).scores) {
  const ability = spellcastingAbility(character);
  return 8 + (character.proficiencyBonus || 0) + abilityModifier(adjustedScores[ability]) + bonusTotal(character, 'spellDc', 'spellDc', { proficient: false, expert: false });
}

export function spellAttackBonus(character: Character, adjustedScores = adjustedAbilityScores(character).scores) {
  const ability = spellcastingAbility(character);
  return (character.proficiencyBonus || 0) + abilityModifier(adjustedScores[ability]) + bonusTotal(character, 'spellAttack', 'spellAttack', { proficient: false, expert: false });
}

export function armorClass(character: Character) {
  return (character.ac || 10) + bonusTotal(character, 'ac', 'ac', { proficient: false, expert: false }) + acEffectBonus(character);
}

export function initiativeBonus(character: Character, adjustedScores = adjustedAbilityScores(character).scores) {
  return abilityModifier(adjustedScores.dexterity) + bonusTotal(character, 'initiative', 'initiative', { proficient: false, expert: false }) + bonusTotal(character, 'abilityCheck', 'dexterity', { proficient: false, expert: false });
}

export function skillAbility(character: Character, skillKey: string): AbilityKey {
  const override = character.skillAbilityOverrides?.[skillKey];
  if (override && ABILITIES.some(ability => ability.key === override)) return override;
  return SKILLS.find(item => item.key === skillKey)?.ability || 'dexterity';
}

function bonusTotal(
  character: Character,
  targetType: 'save' | 'skill' | 'abilityCheck' | 'ac' | 'initiative' | 'spellAttack' | 'spellDc',
  targetKey: string,
  status: { proficient: boolean; expert: boolean }
) {
  return (character.sheetBonuses || [])
    .filter(bonus => bonusApplies(bonus, targetType, targetKey, status))
    .reduce((sum, bonus) => sum + bonusValue(character, bonus), 0);
}

function bonusApplies(
  bonus: SheetBonus,
  targetType: 'save' | 'skill' | 'abilityCheck',
  targetKey: string,
  status: { proficient: boolean; expert: boolean }
) {
  if (bonus.condition === 'ifNotProficientOrExpert' && (status.proficient || status.expert)) return false;
  if (bonus.targetType === targetType && bonus.targetKey === targetKey) return true;
  if (['ac', 'initiative', 'spellAttack', 'spellDc'].includes(targetType) && bonus.targetType === targetType) return true;
  if (targetType === 'save' && bonus.targetType === 'allSaves') return true;
  if (targetType === 'skill' && bonus.targetType === 'allSkills') return true;
  if (targetType === 'abilityCheck' && bonus.targetType === 'allAbilityChecks') return true;
  return false;
}

function acEffectBonus(character: Character) {
  return (character.effects || []).reduce((sum, effect) => {
    const current = normalizeEffectLike(effect);
    const value = Number(current.value ?? current.level ?? 0);
    if (!Number.isFinite(value)) return sum;
    if (current.name === 'Armor Class Increased') return sum + value;
    if (current.name === 'Armor Class Reduced') return sum - value;
    return sum;
  }, 0);
}

function bonusValue(character: Character, bonus: SheetBonus) {
  if (bonus.valueMode === 'halfProficiency') return Math.floor((character.proficiencyBonus || 0) / 2);
  return Number(bonus.value) || 0;
}

function normalizeEffectLike(effect: Effect | string) {
  if (typeof effect === 'string') return { name: effect, ability: null, value: null, level: null };
  return effect;
}
