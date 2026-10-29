import type { AbilityKey } from './types';

const ABILITY_ORDER: AbilityKey[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const LEGACY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

export function parseMonsterMarkdown(text: string, spellDatabase?: any[]) {
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
  const spellcastingBlock = [...features, ...actions].find(entry => /^(?:innate\s+)?spellcasting\b/i.test(entry.name));
  const spellcasting = parseMonsterSpellcasting(spellcastingBlock?.description || '', spellDatabase);

  const allFeatures = [
    ...defensiveFeatures,
    ...features,
    ...actions,
    ...bonusActions,
    ...reactions,
    ...legendaryActionEntries,
    ...mythicActions,
    ...lairActions
  ];
  const entityKind = /\*\*Entity Type:\*\*\s*non-?monster|\*\*Non-Monster:\*\*\s*(?:yes|true)/i.test(source) ? 'nonMonster' : 'monster';
  const hasHpAc = entityKind === 'monster' || /\*\*Has HP\/AC:\*\*\s*(?:yes|true)/i.test(source);
  const fixedInitiative = numberAfter(source, /\*\*Fixed Initiative:\*\*\s*(-?\d+)/i, 20);

  return {
    name,
    ac: numberAfter(source, /\*\*Armor Class:\*\*\s*(\d+)/i, 10),
    hp: numberAfter(source, /\*\*Hit Points:\*\*\s*(\d+)/i, 10),
    maxHp: numberAfter(source, /\*\*Hit Points:\*\*\s*(\d+)/i, 10),
    encounterPoints: numberAfter(source, /\*\*Encounter Points:\*\*\s*(\d+(?:\.\d+)?)/i, 0.1),
    dpr: numberAfter(source, /\*\*(?:Expected )?DPR:\*\*\s*(\d+(?:\.\d+)?)/i, 0),
    entityKind,
    hasHpAc,
    fixedInitiative,
    lairActionInitiative: numberAfter(source, /\*\*Lair Action Initiative:\*\*\s*(-?\d+)/i, 20),
    mythicActionInitiative: numberAfter(source, /\*\*Mythic Action Initiative:\*\*\s*(-?\d+)/i, 20),
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
    damageResistances: textAfter(source, /\*\*Damage Resistances:?\*\*:?\s*([^\n]+)/i),
    damageImmunities: textAfter(source, /\*\*Damage Immunities:?\*\*:?\s*([^\n]+)/i),
    conditionImmunities: textAfter(source, /\*\*Condition Immunities:?\*\*:?\s*([^\n]+)/i),
    damageVulnerabilities: textAfter(source, /\*\*Damage Vulnerabilities:?\*\*:?\s*([^\n]+)/i),
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
      customFeatures: extractResourceFeatures(allFeatures),
      legendaryActions: { enabled: legendaryActionEntries.length > 0, max: legendaryActionEntries.length > 0 ? 3 : 0, used: 0 },
      epicActions: { enabled: false, actions: [] }
    }
  };
}

function parseSection(source: string, heading: string) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`^#+\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=^#+\\s+|^---\\s*$|(?![\\s\\S]))`, 'im'));
  if (!match) return [];
  return parseMonsterEntries(match[1]);
}

export function parseMonsterEntries(text: string) {
  // Keep lists and continuation paragraphs with their named trait/action.
  const hasNamedEntries = /^\*\*[^*\n]+?\.\*\*|^\*\*(?:Innate\s+)?Spellcasting\b[^*\n]*\*\*/im.test(text);
  const blocks = hasNamedEntries ? text
    .split(/(?=^\*\*[^*\n]+?\.\*\*|^\*\*(?:Innate\s+)?Spellcasting\b[^*\n]*\*\*)/im)
    : text.split(/\r?\n\s*\r?\n/);
  return blocks
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => {
      const titleMatch = block.match(/^\*\*([^*]+?)\.?\*\*\s*([\s\S]*)$/);
      return {
        name: titleMatch?.[1]?.trim() || block.split('\n')[0].replace(/\*\*/g, '').trim(),
        description: block
      };
    });
}

function extractSpellsFromLine(lineText: string, spellDatabase?: { name: string }[]): string[] {
  let cleaned = lineText.replace(/\*+/g, '').trim().replace(/\.$/, '');
  if (!cleaned) return [];

  // If there are commas, use them as absolute separators
  if (cleaned.includes(',')) {
    return cleaned.split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => findSpellInString(s, spellDatabase));
  }

  if (spellDatabase && spellDatabase.length > 0) {
    const sortedDb = [...spellDatabase].sort((a, b) => b.name.length - a.name.length);
    interface Match {
      name: string;
      start: number;
      end: number;
    }
    const matches: Match[] = [];

    for (const spell of sortedDb) {
      const escaped = spell.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchStr = cleaned.toLowerCase();
      const spellNameLower = spell.name.toLowerCase();
      let index = searchStr.indexOf(spellNameLower);
      while (index !== -1) {
        const start = index;
        const end = start + spellNameLower.length;

        const prevChar = start > 0 ? cleaned.charAt(start - 1) : '';
        const nextChar = end < cleaned.length ? cleaned.charAt(end) : '';

        const isWordChar = (char: string) => /[a-zA-Z0-9À-ž']/.test(char);
        const hasPrevBoundary = !prevChar || !isWordChar(prevChar);
        const hasNextBoundary = !nextChar || !isWordChar(nextChar);

        if (hasPrevBoundary && hasNextBoundary) {
          const overlaps = matches.some(m => (start >= m.start && start < m.end) || (end > m.start && end <= m.end));
          if (!overlaps) {
            matches.push({ name: spell.name, start, end });
          }
        }
        index = searchStr.indexOf(spellNameLower, start + 1);
      }
    }

    matches.sort((a, b) => a.start - b.start);
    if (matches.length > 0) {
      return matches.map(m => m.name);
    }
  }

  // Double-space fallback or whitespace fallback if no db matches
  return cleaned
    .split(/\s{2,}/)
    .map(s => s.trim())
    .filter(Boolean);
}

export function parseMonsterSpellcasting(text: string, spellDatabase?: any[]) {
  const spellSlots: Record<string, { max: number; used: number; atWill?: boolean; spells?: string[] }> = {};
  const perDaySpells: Array<{ name: string; maxUses: number; used: number }> = [];
  const atWillSpells: string[] = [];
  const counterspells: string[] = [];

  const textTrimmed = text.trim();
  if (!textTrimmed) {
    return {
      enabled: false,
      spellcastingType: 'none',
      spellcastingLevel: 0,
      spellSlots,
      atWillSpells,
      perDaySpells,
      counterspells
    };
  }

  const isCasterLevel = /(\d+)(?:st|nd|rd|th)[-\s]+level spellcaster/i.test(textTrimmed);
  const lines = text.split('\n')
    .map(line => line.trim().replace(/^[-+*]\s+/, '').replace(/\*\*/g, ''))
    .filter(Boolean);
  lines.forEach(line => {
    // 1. Counterspells line, e.g. "Counterspells: The Classic The Feint"
    const counterspellMatch = line.match(/^Counterspells\s*:?\s*(.+)$/i);
    if (counterspellMatch) {
      const spellsStr = counterspellMatch[1];
      const spells = extractSpellsFromLine(spellsStr, spellDatabase);
      spells.forEach(s => {
        if (!counterspells.includes(s)) counterspells.push(s);
      });
      return;
    }

    // 2. Epic Tiers line, e.g. "Epic Tier 1 (3 slots): Antimagic Ray..."
    const epicMatch = line.match(/^(?:Epic\s+Tier\s+(\d+)\s*\(([^)]+)\))\s*:?\s*(.+)$/i);
    if (epicMatch) {
      const tier = epicMatch[1];
      const slotDesc = epicMatch[2].toLowerCase().trim();
      const spellsStr = epicMatch[3];
      const spells = extractSpellsFromLine(spellsStr, spellDatabase);

      const isAtWill = slotDesc.includes('at will');
      const maxSlots = isAtWill ? 0 : (Number(slotDesc.match(/(\d+)/)?.[1]) || 0);
      const lvlKey = `epic${tier}`;

      spellSlots[lvlKey] = { max: maxSlots, used: 0, atWill: isAtWill, spells };
      spells.forEach(s => {
        if (isCounterspell(s, spellDatabase)) {
          if (!counterspells.includes(s)) counterspells.push(s);
        }
      });
      return;
    }

    // 3. Slot level line, e.g. "1st level (4 slots): detect magic, shield" or "1st level (at will): magic missile"
    const slotMatch = line.match(/^(?:(\d+)(?:st|nd|rd|th)\s+level\s*\(([^)]+)\))\s*:?\s*(.+)$/i);
    if (slotMatch) {
      const lvl = slotMatch[1];
      const slotDesc = slotMatch[2].toLowerCase().trim();
      const spellsStr = slotMatch[3];
      const spells = extractSpellsFromLine(spellsStr, spellDatabase);

      const isAtWill = slotDesc.includes('at will');
      const maxSlots = isAtWill ? 0 : (Number(slotDesc.match(/(\d+)/)?.[1]) || 0);

      spellSlots[lvl] = { max: maxSlots, used: 0, atWill: isAtWill, spells };
      spells.forEach(s => {
        if (isCounterspell(s, spellDatabase)) {
          if (!counterspells.includes(s)) counterspells.push(s);
        }
      });
      return;
    }

    // 4. Cantrip line, e.g. "Cantrips (at will): fire bolt, light"
    const cantripMatch = line.match(/^(?:Cantrips\s*\(at\s+will\))\s*:?\s*(.+)$/i);
    if (cantripMatch) {
      const spellsStr = cantripMatch[1];
      const spells = extractSpellsFromLine(spellsStr, spellDatabase);
      spells.forEach(s => {
        if (!atWillSpells.includes(s)) atWillSpells.push(s);
        if (isCounterspell(s, spellDatabase)) {
          if (!counterspells.includes(s)) counterspells.push(s);
        }
      });
      return;
    }

    // 5. Innate per-day/at-will, e.g. "At will: detect magic, levitate" or "3/day each: fireball, fly"
    const usageMatch = line.match(/^(?:(\d+)\/day|at\s+will)\s*(?:each)?\s*:?\s*(.+)$/i);
    if (usageMatch) {
      const isAtWill = line.toLowerCase().includes('at will');
      const maxUses = isAtWill ? 999 : (Number(usageMatch[1]) || 1);
      const spellsStr = usageMatch[2];
      const spells = extractSpellsFromLine(spellsStr, spellDatabase);
      spells.forEach(s => {
        if (isAtWill) {
          if (!atWillSpells.includes(s)) atWillSpells.push(s);
        } else {
          perDaySpells.push({ name: s, maxUses, used: 0 });
        }
        if (isCounterspell(s, spellDatabase)) {
          if (!counterspells.includes(s)) counterspells.push(s);
        }
      });
      return;
    }
  });

  // Infer the mode from parsed resources; an inline Epic Tier annotation is not a slot pool.
  const spellcastingType = Object.keys(spellSlots).length > 0
    ? (isCasterLevel ? 'caster-level' : 'custom-slots')
    : (atWillSpells.length > 0 || perDaySpells.length > 0 || counterspells.length > 0 ? 'per-day' : 'none');

  return {
    enabled: spellcastingType !== 'none',
    spellcastingType,
    spellcastingLevel: numberAfter(text, /(\d+)(?:st|nd|rd|th)[-\s]+level spellcaster/i, 0),
    spellSlots,
    atWillSpells,
    perDaySpells,
    counterspells
  };
}

function extractResourceFeatures(entries: Array<{ name: string; description: string }>) {
  const result: any[] = [];
  const namesSeen = new Set<string>();

  for (const entry of entries) {
    if (!entry.name) continue;
    const normalizedName = entry.name.trim();
    if (namesSeen.has(normalizedName)) continue;

    let trackerType: 'none' | 'day' | 'rest' | 'round' | 'recharge' | 'power' | 'slot' = 'none';
    let maxUses = 1;
    let restType = 'day';
    let rechargeValue = 6;
    let costAmount = 0;
    let costSpellLevel = '';

    // 1. Recharge check: name like "Breath Weapon (Recharge 5-6)" or "Frightful Presence (Recharge 6)"
    const rechargeMatch = entry.name.match(/Recharge\s*(\d+)(?:\s*[-–]\s*\d+)?/i);
    if (rechargeMatch) {
      trackerType = 'recharge';
      rechargeValue = Number(rechargeMatch[1]) || 6;
      maxUses = 1;
    }
    // 2. Per Day/Rest check: name like "Innate Spellcasting (3/Day)" or "Shield (1/Day)" or "Indomitable (2/Rest)"
    else {
      const limitMatch = entry.name.match(/\((\d+)\/(day|rest|long rest|short rest|round)\)/i);
      if (limitMatch) {
        maxUses = Number(limitMatch[1]) || 1;
        const limitType = limitMatch[2].toLowerCase();
        if (limitType === 'round') {
          trackerType = 'round';
        } else {
          trackerType = /day/i.test(limitType) ? 'day' : 'rest';
          restType = trackerType;
        }
      } else {
        const descLower = entry.description.toLowerCase();
        const nameLower = entry.name.toLowerCase();
        if (nameLower.includes('1/round') || descLower.includes('1/round') || descLower.includes('once per round') || descLower.includes('once per turn')) {
          trackerType = 'round';
          maxUses = 1;
        } else if (descLower.includes('once per day') || descLower.includes('1/day')) {
          trackerType = 'day';
          restType = 'day';
          maxUses = 1;
        } else if (descLower.includes('once per rest') || descLower.includes('1/rest')) {
          trackerType = 'rest';
          restType = 'rest';
          maxUses = 1;
        }
      }
    }

    // 3. Power cost check: e.g. "costs 1 favor", "costs 2 power", "costs 3 crystallization points"
    const descLower = entry.description.toLowerCase();
    const powerMatch = descLower.match(/(?:costs?|spend|uses?)\s+(\d+)\s+(?:favor|power|points?|crystallization)/i);
    if (powerMatch && trackerType === 'none') {
      trackerType = 'power';
      costAmount = Number(powerMatch[1]) || 1;
      maxUses = 0;
    }

    // 4. Spell slot cost check: e.g. "costs a 1st-level spell slot", "expend a 2nd-level spell slot"
    const slotMatch = descLower.match(/(?:expend|spend|costs?|uses?)\s+(?:a|an)?\s*(?:(\d+)(?:st|nd|rd|th)[-\s]+level)?\s*spell\s*slot/i);
    if (slotMatch && trackerType === 'none') {
      trackerType = 'slot';
      costSpellLevel = slotMatch[1] || '1';
      costAmount = 1;
      maxUses = 0;
    }

    // Clean up name by stripping parentheses limits
    let cleanName = normalizedName;
    cleanName = cleanName.replace(/\s*\(Recharge\s*\d+(?:\s*[-–]\s*\d+)?\)/i, '');
    cleanName = cleanName.replace(/\s*\(\d+\/(?:day|rest|long rest|short rest|round)\)/i, '');
    cleanName = cleanName.trim();

    namesSeen.add(normalizedName);
    result.push({
      name: cleanName,
      maxUses,
      used: 0,
      restType,
      trackerType,
      rechargeValue,
      costAmount,
      costSpellLevel
    });
  }

  return result;
}

function findSpellInString(str: string, spellDatabase?: { name: string }[]): string {
  const cleaned = str.replace(/\*+/g, '').trim();
  if (spellDatabase && spellDatabase.length > 0) {
    // Sort spellDatabase by length descending to match longest spell first
    const sortedDb = [...spellDatabase].sort((a, b) => b.name.length - a.name.length);
    for (const spell of sortedDb) {
      const escaped = spell.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(cleaned)) {
        return spell.name;
      }
    }
  }
  // Fallback: strip parentheses and their content, and return the remainder
  return cleaned.replace(/\([^)]+\)/g, '').trim().replace(/\.$/, '').trim();
}

function isCounterspell(name: string, spellDatabase?: { name: string; source?: string }[]): boolean {
  if (name.toLowerCase().includes('counterspell')) return true;
  if (spellDatabase) {
    const found = spellDatabase.find(s => s.name.toLowerCase() === name.toLowerCase());
    if (found && found.source && found.source.toLowerCase() === 'counterspell') {
      return true;
    }
  }
  return false;
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
