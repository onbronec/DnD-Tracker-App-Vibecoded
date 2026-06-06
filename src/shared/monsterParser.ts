import type { AbilityKey } from './types';

const ABILITY_ORDER: AbilityKey[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const LEGACY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

export function parseMonsterMarkdown(text: string) {
  const source = text || '';
  const stats = { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };
  const firstLine = source.split('\n').map(line => line.trim()).find(line => line && !line.startsWith('|')) || 'Monster';
  const name = firstLine.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim() || 'Monster';
  const statMatch = source.match(/\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|/);
  if (statMatch) {
    ABILITY_ORDER.forEach((ability, index) => {
      stats[ability] = Number(statMatch[index + 1]) || 10;
    });
  }

  const defensiveFeatures = [...parseSection(source, 'Protective Traits'), ...parseSection(source, 'Defensive Traits')];
  const features = [...parseSection(source, 'Regular Traits'), ...parseSection(source, 'Traits')];
  const actions = parseSection(source, 'Actions');
  const bonusActions = parseSection(source, 'Bonus Actions');
  const reactions = parseSection(source, 'Reactions');
  const legendaryActionEntries = parseSection(source, 'Legendary Actions');
  const mythicActions = parseSection(source, 'Mythic Actions');
  const lairActions = parseSection(source, 'Lair Actions');
  const spellcastingBlock = [...features, ...actions].find(entry => /spellcasting/i.test(entry.description));
  const spellcasting = parseSpellcasting(spellcastingBlock?.description || '');

  return {
    name,
    ac: numberAfter(source, /\*\*Armor Class:\*\*\s*(\d+)/i, 10),
    hp: numberAfter(source, /\*\*Hit Points:\*\*\s*(\d+)/i, 10),
    maxHp: numberAfter(source, /\*\*Hit Points:\*\*\s*(\d+)/i, 10),
    speed: textAfter(source, /\*\*Speed:\*\*\s*([^\n]+)/i),
    stats,
    saves: textAfter(source, /\*\*Saving Throws:\*\*\s*([^\n]+)/i),
    skills: textAfter(source, /\*\*Skills:\*\*\s*([^\n]+)/i),
    senses: textAfter(source, /\*\*Senses:\*\*\s*([^\n]+)/i),
    languages: textAfter(source, /\*\*Languages:\*\*\s*([^\n]+)/i),
    challenge: textAfter(source, /\*\*Challenge\*\*\s*([^\n]+)/i),
    proficiency: textAfter(source, /\*\*Proficiency:\*\*\s*([+-]?\d+)/i),
    type: textAfter(source, /\*\*Type:\*\*\s*([^\n]+)/i),
    size: textAfter(source, /\*\*Size:\*\*\s*([^\n]+)/i),
    initBonus: abilityModifier(stats.dexterity),
    description: source,
    defensiveFeatures,
    features,
    actions,
    bonusActions,
    reactions,
    legendaryActionEntries,
    mythicActions,
    lairActions,
    hasLairActions: lairActions.length > 0,
    hasMythicActions: mythicActions.length > 0,
    monsterAbilities: {
      enabled: true,
      power: { enabled: false, name: 'Power', max: 0, current: 0 },
      spellcasting,
      spellSlots: spellcasting.spellSlots,
      perDaySpells: spellcasting.perDaySpells,
      customFeatures: extractResourceFeatures([...defensiveFeatures, ...features, ...bonusActions]),
      legendaryActions: { enabled: legendaryActionEntries.length > 0, max: legendaryActionEntries.length > 0 ? 3 : 0, used: 0 },
      epicActions: { enabled: false, actions: [] }
    }
  };
}

function parseSection(source: string, heading: string) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`^#+\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=^#+\\s+|^---\\s*$|$)`, 'im'));
  if (!match) return [];
  return match[1]
    .split(/(?=^\*\*[^*\n]+?\.\*\*)/m)
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => {
      const titleMatch = block.match(/^\*\*([^*]+?)\.\*\*\s*([\s\S]*)$/);
      return {
        name: titleMatch?.[1]?.trim() || block.split('\n')[0].replace(/\*\*/g, '').trim(),
        description: block
      };
    });
}

function parseSpellcasting(text: string) {
  const spellSlots: Record<string, { max: number; used: number; atWill?: boolean }> = {};
  const perDaySpells: Array<{ name: string; maxUses: number; used: number }> = [];
  const atWillSpells: string[] = [];
  const slotRegex = /(\d+)(?:st|nd|rd|th)\s+level\s*\((\d+)\s+slots?\)/gi;
  let slotMatch: RegExpExecArray | null;
  while ((slotMatch = slotRegex.exec(text))) {
    spellSlots[String(slotMatch[1])] = { max: Number(slotMatch[2]) || 0, used: 0 };
  }

  text.split('\n').forEach(line => {
    const usage = line.match(/^\s*((\d+)\/day|at will)\s*:?\s*(.+)$/i);
    if (!usage) return;
    const maxUses = usage[2] ? Number(usage[2]) || 1 : 999;
    splitSpellNames(usage[3]).forEach(name => {
      if (maxUses === 999) atWillSpells.push(name);
      else perDaySpells.push({ name, maxUses, used: 0 });
    });
  });

  return {
    enabled: Boolean(text.trim()),
    spellcastingType: text.trim() ? 'monster' : 'none',
    spellcastingLevel: numberAfter(text, /(\d+)(?:st|nd|rd|th)[-\s]+level spellcaster/i, 0),
    spellSlots,
    atWillSpells,
    perDaySpells
  };
}

function extractResourceFeatures(entries: Array<{ name: string; description: string }>) {
  return entries.map(entry => {
    const match = entry.name.match(/(.+?)\s*\((\d+)\/(?:rest|day|long rest|short rest)\)/i);
    if (!match) return null;
    return {
      name: match[1].trim(),
      maxUses: Number(match[2]) || 1,
      used: 0,
      restType: /day/i.test(entry.name) ? 'day' : 'rest'
    };
  }).filter(Boolean);
}

function splitSpellNames(value: string) {
  return value.split(',').map(item => item.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim()).filter(Boolean);
}

function textAfter(source: string, regex: RegExp) {
  return source.match(regex)?.[1]?.trim().replace(/,\s*$/, '') || '';
}

function numberAfter(source: string, regex: RegExp, fallback: number) {
  return Number(source.match(regex)?.[1]) || fallback;
}

function abilityModifier(score: number) {
  return Math.floor((score - 10) / 2);
}

export function statShortToAbility(short: string): AbilityKey {
  const index = LEGACY_KEYS.indexOf(short.toLowerCase() as typeof LEGACY_KEYS[number]);
  return ABILITY_ORDER[index] || 'strength';
}
