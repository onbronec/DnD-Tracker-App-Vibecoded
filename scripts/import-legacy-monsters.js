#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { normalizeMonsterDbItem } = require('../server/migrations');

const ABILITY_ORDER = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

function parseMonsterMarkdownSimple(text) {
  const source = (text || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim()
    .replace(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i, '$1');
  const header = source.split(/^#+\s+(?:Protective Traits|Defensive Traits|Regular Traits|Traits|Actions|Bonus Actions|Reactions|Legendary Actions|Epic Actions|Mythic Actions|Lair Actions)\b/im)[0];
  const stats = { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };
  const firstLine = source.split('\n').map(line => line.trim()).find(line => line && !line.startsWith('|')) || 'Monster';
  const name = firstLine.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim() || 'Monster';

  const statMatch = header.match(/\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|/);
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

  const mythicPointsMatch = header.match(/Points \*10 for Mythic:\s*(\d+(?:\.\d+)?)/i);
  const mythicPoints = mythicPointsMatch ? Number(mythicPointsMatch[1]) / 10 : undefined;
  const groupMatch = header.match(/^Group:\s*([^\n]+)/im);
  const group = groupMatch ? groupMatch[1].trim() : '';

  const imgMatch = source.match(/!\[.*?\]\((.+?)\)/);
  let imageUrl = undefined;
  if (imgMatch && imgMatch[1]) {
    const rawName = decodeURIComponent(imgMatch[1].trim());
    imageUrl = `/images/monsters/${encodeURIComponent(rawName)}`;
  }

  // Battlefield classification
  let combatType = 'monster';
  const roleMatch = header.match(/Battlefield Classification:?\s*([^\n]+)/i);
  if (roleMatch) {
    const r = roleMatch[1].toLowerCase();
    if (r.includes('spellcaster')) combatType = 'spellcaster';
    else if (r.includes('elite')) combatType = 'elite';
    else if (r.includes('leader')) combatType = 'leader';
    else if (r.includes('ranged') || r.includes('artillery')) combatType = 'ranged';
    else if (r.includes('controller')) combatType = 'controller';
  }

  const ac = numberAfter(header, /\*\*Armor Class\b:?\*{0,2}:?\s*(\d+)/i, 10);
  const hp = numberAfter(header, /\*\*Hit Points\b:?\*{0,2}:?\s*(\d+)/i, 10);
  const encounterPoints = mythicPoints ?? numberAfter(header, /\*\*Encounter Points:\*\*\s*(\d+(?:\.\d+)?)/i, numberAfter(header, /\((\d+(?:\.\d+)?)\s+points?\b/i, 0.1));
  const dpr = numberAfter(header, /\*\*(?:Expected )?DPR:\*\*\s*(\d+(?:\.\d+)?)/i, 0);

  return {
    name,
    ac,
    hp,
    maxHp: hp,
    encounterPoints,
    dpr,
    combatType,
    flag: 'adapt',
    group,
    groups: group ? [group] : [],
    imageUrl,
    speed: textAfter(header, /\*\*Speed\b:?\*{0,2}:?\s*([^\n*]+)/i),
    stats,
    saves: textAfter(header, /\*\*Saving Throws:\*\*\s*([^\n]+)/i),
    skills: textAfter(header, /\*\*Skills:\*\*\s*([^\n]+)/i),
    senses: textAfter(header, /\*\*Senses:\*\*\s*([^\n]+)/i),
    languages: textAfter(header, /\*\*Languages:\*\*\s*([^\n]+)/i),
    challenge: textAfter(header, /\*\*Challenge:?\*\*:?\s*([^\n]+)/i),
    proficiency: textAfter(header, /\*\*Proficiency:\*\*\s*([+-]?\d+)/i),
    type: textAfter(header, /\*\*Type:\*\*\s*([^\n]+)/i),
    size: textAfter(header, /\*\*Size:\*\*\s*([^\n]+)/i),
    damageResistances: textAfter(header, /\*\*Damage Resistances:?\*\*:?\s*([^\n]+)/i),
    damageImmunities: textAfter(header, /\*\*Damage Immunities:?\*\*:?\s*([^\n]+)/i),
    conditionImmunities: textAfter(header, /\*\*Condition Immunities:?\*\*:?\s*([^\n]+)/i),
    damageVulnerabilities: textAfter(header, /\*\*Damage Vulnerabilities:?\*\*:?\s*([^\n]+)/i),
    initBonus: Math.floor(((stats.dexterity || 10) - 10) / 2),
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
    hasMythicActions: mythicActions.length > 0
  };
}

function parseSection(source, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`^(#+)\\s+${escaped}(?:\\s*(?:[—–:-]|\\().*)?[\\t ]*$`, 'im'));
  if (!match) return [];
  const remainder = source.slice(match.index + match[0].length);
  const end = remainder.search(new RegExp(`^#{1,${match[1].length}}\\s+|^---\\s*$`, 'm'));
  return parseMonsterEntries(end < 0 ? remainder : remainder.slice(0, end));
}

function parseMonsterEntries(text) {
  const hasNamedEntries = /^\*\*[^*\n]+?\.\*\*|^\*\*(?:Innate\s+)?Spellcasting\b[^*\n]*\*\*/im.test(text);
  const blocks = [];
  if (hasNamedEntries) {
    let block = '';
    let nestedHeading = false;
    for (const line of text.split(/\r?\n/)) {
      if (/^#+\s+/.test(line)) nestedHeading = true;
      if (!nestedHeading && /^(?:\*\*[^*\n]+?\.\*\*|\*\*(?:Innate\s+)?Spellcasting\b[^*\n]*\*\*)/i.test(line) && block.trim()) {
        blocks.push(block);
        block = '';
      }
      block += `${line}\n`;
    }
    blocks.push(block);
  } else {
    blocks.push(...text.split(/\r?\n\s*\r?\n/));
  }
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

function numberAfter(text, regex, fallback = 0) {
  const match = text.match(regex);
  return match ? Number(match[1]) : fallback;
}

function textAfter(text, regex, fallback = '') {
  const match = text.match(regex);
  return match ? match[1].trim() : fallback;
}

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const exportDir = path.resolve(__dirname, '..', 'data', 'Monster Export');
  const autosavePath = path.resolve(__dirname, '..', 'dnd-tracker-autosave.json');

  if (!fs.existsSync(exportDir)) {
    console.error(`Export dir not found: ${exportDir}`);
    process.exit(1);
  }
  if (!fs.existsSync(autosavePath)) {
    console.error(`Autosave file not found: ${autosavePath}`);
    process.exit(1);
  }

  const state = JSON.parse(fs.readFileSync(autosavePath, 'utf8'));
  const currentDb = state.monsterDatabase || [];
  const existingByName = new Map();
  currentDb.forEach(m => existingByName.set((m.name || '').toLowerCase().trim(), m));

  const files = fs.readdirSync(exportDir).filter(f => f.endsWith('.md')).sort();
  console.log(`Found ${files.length} markdown files in ${exportDir}`);

  let added = 0;
  let updated = 0;
  let skipped = 0;
  const newMonsters = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(exportDir, file), 'utf8');
    const parsed = parseMonsterMarkdownSimple(content);
    if (!parsed.name || parsed.name === 'Monster') {
      skipped++;
      continue;
    }

    const key = parsed.name.toLowerCase().trim();
    if (existingByName.has(key)) {
      const existing = existingByName.get(key);
      let changed = false;
      if (parsed.imageUrl && !existing.imageUrl) {
        existing.imageUrl = parsed.imageUrl;
        changed = true;
      }
      if (parsed.group && (!existing.groups || !existing.groups.length)) {
        existing.groups = [parsed.group];
        existing.group = parsed.group;
        changed = true;
      }
      if (changed) {
        updated++;
        console.log(`Updated existing monster: "${existing.name}" (added image/group)`);
      } else {
        console.log(`Preserved existing active monster: "${existing.name}"`);
      }
    } else {
      const normalized = normalizeMonsterDbItem({
        ...parsed,
        id: `monster_db_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        flag: 'adapt'
      });
      newMonsters.push(normalized);
      existingByName.set(key, normalized);
      added++;
      console.log(`+ Added new monster (adapt): "${normalized.name}" | HP ${normalized.hp} | AC ${normalized.ac} | Groups: [${(normalized.groups || []).join(', ')}]${normalized.imageUrl ? ' | Has Image' : ''}`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Total files inspected: ${files.length}`);
  console.log(`New monsters added (flag: adapt): ${added}`);
  console.log(`Existing monsters updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total monster database size after import: ${currentDb.length + added}`);

  if (apply) {
    const backupFile = `${autosavePath}.${timestampForFile()}.bak`;
    fs.copyFileSync(autosavePath, backupFile);
    console.log(`\nBackup written to: ${backupFile}`);

    state.monsterDatabase = [...currentDb, ...newMonsters];
    fs.writeFileSync(autosavePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    console.log(`Updated autosave written successfully to: ${autosavePath}`);
  } else {
    console.log('\nDRY RUN completed. Run with --apply to apply changes to dnd-tracker-autosave.json.');
  }
}

if (require.main === module) {
  main();
}
