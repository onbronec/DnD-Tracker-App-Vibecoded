import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseMonsterMarkdown } from '../../src/shared/monsterParser';

describe('AI Knowledge Base monster statblock validation', () => {
  const kbDir = path.resolve(__dirname, '../../docs/AI Knowledge Base');

  it('verifies that all documents in AI Knowledge Base exist', () => {
    const requiredFiles = [
      '00_Epic_System_Rules.md',
      '01_Statblock_Template.md',
      '02_Reference_Monsters.md',
      '03_Reusable_Chassis.md',
      '04_Setting_and_Factions.md',
      '05_Monster_Types.md',
      '06_Non_Monster_Entities.md'
    ];
    for (const file of requiredFiles) {
      const fullPath = path.join(kbDir, file);
      expect(fs.existsSync(fullPath), `Missing required knowledge base file: ${file}`).toBe(true);
    }
  });

  it('validates and parses the template monster in 01_Statblock_Template.md', () => {
    const content = fs.readFileSync(path.join(kbDir, '01_Statblock_Template.md'), 'utf-8');
    const templateMatch = content.match(/```markdown\n(# \[Monster Name\][\s\S]*?)\n```/);
    expect(templateMatch, 'Fillable template markdown block should exist').toBeTruthy();

    const sampleStatblock = templateMatch![1]
      .replace(/\[Monster Name\]/g, 'Template Testing Dragon')
      .replace(/\[Medium \/ Large \/ Huge \/ Gargantuan\]/g, 'Large')
      .replace(/\[fiend \/ dragon \/ undead \/ humanoid \/ aberration \/ construct \/ etc\.\]/g, 'dragon')
      .replace(/\[Faction \/ Category Name, e.g. Gruumsh Warband, Devils, Pandemonium\]/g, 'Dragons')
      .replace(/\[1\.0\]/g, '1.5')
      .replace(/\[90\]/g, '120')
      .replace(/\[18\]/g, '18')
      .replace(/\[plate, natural armor\]/g, 'natural armor')
      .replace(/\[150\]/g, '200')
      .replace(/\[15d8 \+ 75\]/g, '16d10 + 112')
      .replace(/\[30 ft\., fly 60 ft\.\]/g, '40 ft., fly 80 ft.')
      .replace(/\[Dex \+8, Con \+10, Wis \+9, Cha \+11\]/g, 'Dex +7, Con +12, Wis +8')
      .replace(/\[Perception \+9, Athletics \+10, Stealth \+8\]/g, 'Perception +14, Stealth +7')
      .replace(/\[radiant\]/g, 'radiant')
      .replace(/\[cold, fire; bludgeoning, piercing, and slashing from nonmagical attacks\]/g, 'cold, fire')
      .replace(/\[poison\]/g, 'poison')
      .replace(/\[darkvision 120 ft\., truesight 60 ft\., passive Perception 19\]/g, 'darkvision 120 ft., passive Perception 24')
      .replace(/\[Common, Infernal, telepathy 120 ft\.\]/g, 'Common, Draconic')
      .replace(/\[12\]/g, '16')
      .replace(/\[\+5\]/g, '+6')
      .replace(/\[1\]/g, '2')
      .replace(/\[20\]/g, '20');

    const parsed = parseMonsterMarkdown(sampleStatblock);
    expect(parsed.name).toBe('Template Testing Dragon');
    expect(parsed.ac).toBe(18);
    expect(parsed.hp).toBe(200);
    expect(parsed.encounterPoints).toBe(1.5);
    expect(parsed.dpr).toBe(120);
    expect(parsed.entityKind).toBe('monster');
    expect(parsed.maxReactions).toBe(2);
    expect(parsed.defensiveFeatures.length).toBeGreaterThan(0);
    expect(parsed.actions.length).toBeGreaterThan(0);
    expect(parsed.monsterAbilities.epicActions.enabled).toBe(true);
    expect(parsed.monsterAbilities.spellcasting.enabled).toBe(true);
  });

  it('validates and parses all reference monsters in 02_Reference_Monsters.md', () => {
    const content = fs.readFileSync(path.join(kbDir, '02_Reference_Monsters.md'), 'utf-8');
    // Split by level 1 headings (# MonsterName)
    const sections = content.split(/^# (?=[A-Z])/m).filter(s => s.trim() && !s.startsWith('Reference Monsters'));

    expect(sections.length).toBe(9);

    const parsedMonsters = sections.map(sec => parseMonsterMarkdown(`# ${sec}`));
    const names = parsedMonsters.map(m => m.name);

    expect(names).toEqual([
      'Zealot',
      'Shade of Set',
      'Cassiel — Fallen Archangel',
      'Archpriest',
      'Gruumsh Battle Cultist',
      'Chosen Rider of Gruumsh',
      'Pandemonium Ravager',
      'Baalzebul — Health-Fueled Spellcaster',
      'Belial — Temporal Archdevil Spellcaster'
    ]);

    for (const monster of parsedMonsters) {
      expect(monster.name).toBeTruthy();
      expect(monster.hp).toBeGreaterThan(0);
      expect(monster.ac).toBeGreaterThan(0);
      expect(monster.encounterPoints).toBeGreaterThan(0);
      expect(monster.actions.length).toBeGreaterThan(0);
      expect(monster.entityKind).toBe('monster');
    }

    // Specific monster feature checks
    const archpriest = parsedMonsters.find(m => m.name === 'Archpriest')!;
    expect(archpriest.monsterAbilities.epicActions.enabled).toBe(true);
    expect(archpriest.monsterAbilities.epicActions.actions.length).toBeGreaterThanOrEqual(3);
    expect(archpriest.monsterAbilities.spellcasting.enabled).toBe(true);
    expect(archpriest.monsterAbilities.spellcasting.counterspells).toContain('The Classic');

    const belial = parsedMonsters.find(m => m.name === 'Belial — Temporal Archdevil Spellcaster')!;
    expect(belial.monsterAbilities.spellcasting.enabled).toBe(true);
    expect(belial.monsterAbilities.spellcasting.spellcastingLevel).toBe(24);
    expect(belial.maxReactions).toBe(2);

    const ravager = parsedMonsters.find(m => m.name === 'Pandemonium Ravager')!;
    expect(ravager.hp).toBe(1000);
    expect(ravager.encounterPoints).toBe(8.0);
    expect(ravager.maxReactions).toBe(2);
  });

  it('validates and parses non-monster entities in 06_Non_Monster_Entities.md', () => {
    const content = fs.readFileSync(path.join(kbDir, '06_Non_Monster_Entities.md'), 'utf-8');
    const statblocks = [...content.matchAll(/```markdown\n(# [^\n]+[\s\S]*?)\n```/g)].map(m => m[1]);

    expect(statblocks.length).toBeGreaterThanOrEqual(3);

    const parsedObjects = statblocks.map(sb => parseMonsterMarkdown(sb));
    const names = parsedObjects.map(o => o.name);

    expect(names).toContain('Gruumsh Warband');
    expect(names).toContain('Soul Pylon of the Archpriest');
    expect(names).toContain('Infernal Crucible');

    const warband = parsedObjects.find(o => o.name === 'Gruumsh Warband')!;
    expect(warband.entityKind).toBe('nonMonster');
    expect(warband.hasHpAc).toBe(false);
    expect(warband.fixedInitiative).toBe(20);
    expect(warband.encounterPoints).toBe(0.1);
    expect(warband.actions.length).toBeGreaterThanOrEqual(4);

    const pylon = parsedObjects.find(o => o.name === 'Soul Pylon of the Archpriest')!;
    expect(pylon.entityKind).toBe('nonMonster');
    expect(pylon.hasHpAc).toBe(true);
    expect(pylon.ac).toBe(17);
    expect(pylon.hp).toBe(80);
    expect(pylon.fixedInitiative).toBe(20);

    const crucible = parsedObjects.find(o => o.name === 'Infernal Crucible')!;
    expect(crucible.entityKind).toBe('nonMonster');
    expect(crucible.hasHpAc).toBe(false);
    expect(crucible.fixedInitiative).toBe(20);
  });
});
