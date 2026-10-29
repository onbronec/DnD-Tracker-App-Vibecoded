import { NumberInput } from '../components/NumberInput';
import { useState, useEffect, useMemo } from 'react';
import type { GameState, GameAction, AbilityKey, CustomFeature, MonsterDatabaseEntry } from '../shared/types';
import { MarkdownEditor } from '../components/Markdown';
import { Modal } from '../components/Modal';
import { parseMonsterEntries as parseEntriesText, parseMonsterMarkdown, parseMonsterSpellcasting } from '../shared/monsterParser';
import { SPELL_SLOTS_TABLE } from '../shared/defaults';
import { MonsterDetail, monsterDatabaseEntryToPreviewCharacter } from './MonstersPage';

const DAMAGE_TYPES = [
  'Acid', 'Arcane', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Hellfire',
  'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant',
  'Righteous', 'Slashing', 'Thunder', 'Vile'
];

const STANDARD_CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled', 
  'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 
  'Prone', 'Restrained', 'Stunned', 'Unconscious'
];


interface Props {
  state: GameState;
  submitAction: (action: GameAction) => Promise<any>;
  editingMonsterId: string | null;
  onBackToDatabases: () => void;
}

function SpellSearchInput({
  spellDatabase,
  onSelectSpell,
  placeholder = 'Search spell...'
}: {
  spellDatabase: any[];
  onSelectSpell: (spellName: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return spellDatabase
      .filter(s => s.name.toLowerCase().includes(q))
      .slice(0, 10);
  }, [query, spellDatabase]);

  return (
    <div className="spell-search-container" style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => {
          setTimeout(() => setShowDropdown(false), 200);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' && query.trim()) {
            onSelectSpell(query.trim());
            setQuery('');
            setShowDropdown(false);
          }
        }}
      />
      {showDropdown && matches.length > 0 && (
        <div className="spell-search-dropdown" style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--bg-card, #1e1e24)',
          border: '1px solid var(--border-color, #2a2a35)',
          zIndex: 9999,
          maxHeight: '200px',
          overflowY: 'auto',
          borderRadius: '4px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          {matches.map(s => (
            <div
              key={s.id || s.name}
              className="spell-search-item"
              onClick={() => {
                onSelectSpell(s.name);
                setQuery('');
                setShowDropdown(false);
              }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid #2a2a35',
                color: 'var(--color-text, #e2e8f0)'
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.background = '#2c2c38';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.background = 'transparent';
              }}
            >
              <strong>{s.name}</strong> <span style={{ fontSize: '0.8em', color: '#888' }}>({s.levelLabel} · {s.school})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const ABILITY_KEYS: AbilityKey[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

export function MonsterEditorPage({ state, submitAction, editingMonsterId, onBackToDatabases }: Props) {
  const isEditing = Boolean(editingMonsterId);
  const spellDatabase = state.spellDatabase || [];

  // Form states
  const [name, setName] = useState('');
  const [hp, setHp] = useState(10);
  const [encounterPoints, setEncounterPoints] = useState(0.1);
  const [dpr, setDpr] = useState(0);
  const [entityKind, setEntityKind] = useState<'monster' | 'nonMonster'>('monster');
  const [hasHpAc, setHasHpAc] = useState(false);
  const [fixedInitiative, setFixedInitiative] = useState(20);
  const [lairActionInitiative, setLairActionInitiative] = useState(20);
  const [mythicActionInitiative, setMythicActionInitiative] = useState(20);
  const [ac, setAc] = useState(10);
  const [maxReactions, setMaxReactions] = useState(1);
  const [speed, setSpeed] = useState('');
  const [stats, setStats] = useState<Record<AbilityKey, number>>({
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10
  });
  const [saves, setSaves] = useState('');
  const [skills, setSkills] = useState('');
  const [senses, setSenses] = useState('');
  const [languages, setLanguages] = useState('');
  const [challenge, setChallenge] = useState('');
  const [proficiency, setProficiency] = useState('');
  const [monsterType, setMonsterType] = useState('');
  const [size, setSize] = useState('Medium');
  const [initBonus, setInitBonus] = useState(0);
  const [description, setDescription] = useState('');
  const [damageResistances, setDamageResistances] = useState('');
  const [damageImmunities, setDamageImmunities] = useState('');
  const [conditionImmunities, setConditionImmunities] = useState('');
  const [damageVulnerabilities, setDamageVulnerabilities] = useState('');

  // Markdown sections
  const [defensiveFeatures, setDefensiveFeatures] = useState('');
  const [features, setFeatures] = useState('');
  const [actions, setActions] = useState('');
  const [bonusActions, setBonusActions] = useState('');
  const [reactions, setReactions] = useState('');
  const [legendaryActionEntries, setLegendaryActionEntries] = useState('');
  const [lairActions, setLairActions] = useState('');
  const [mythicActions, setMythicActions] = useState('');
  const [hasLairActions, setHasLairActions] = useState(false);
  const [hasMythicActions, setHasMythicActions] = useState(false);
  const [hasMultipleTurns, setHasMultipleTurns] = useState(false);
  const [group, setGroup] = useState('');

  // Extract existing groups for autocomplete
  const existingGroups = useMemo(() => {
    const groups = new Set<string>();
    (state.monsterDatabase || []).forEach(m => { if (m.group) groups.add(m.group); });
    return Array.from(groups).sort();
  }, [state.monsterDatabase]);

  const conditionOptions = useMemo(() => {
    const dbNames = (state.conditionDatabase || []).map(c => String(c.name));
    const merged = Array.from(new Set([...STANDARD_CONDITIONS, ...dbNames]));
    return merged.sort();
  }, [state.conditionDatabase]);

  // Power state
  const [powerEnabled, setPowerEnabled] = useState(false);
  const [powerName, setPowerName] = useState('Power');
  const [maxPower, setMaxPower] = useState(0);
  const [currentPower, setCurrentPower] = useState(0);

  // Legendary actions enabled
  const [legendaryEnabled, setLegendaryEnabled] = useState(false);
  const [legendaryMax, setLegendaryMax] = useState(3);

  // Epic actions state
  const [epicEnabled, setEpicEnabled] = useState(false);
  const [epicActionsText, setEpicActionsText] = useState('');
  const [showEpicModal, setShowEpicModal] = useState(false);

  // Spellcasting state
  const [spellcastingType, setSpellcastingType] = useState<'none' | 'caster-level' | 'custom-slots' | 'per-day'>('none');
  const [spellcastingLevel, setSpellcastingLevel] = useState(1);
  const [spellSlots, setSpellSlots] = useState<Record<string, { max: number; used: number; atWill?: boolean; spells?: string[] }>>({});
  const [atWillSpells, setAtWillSpells] = useState<string[]>([]);
  const [counterspells, setCounterspells] = useState<string[]>([]);
  const [perDaySpells, setPerDaySpells] = useState<Array<{ name: string; maxUses: number; used: number }>>([]);
  const [spellcastingImportMessage, setSpellcastingImportMessage] = useState('');

  // Tracked features config state
  const [customFeatures, setCustomFeatures] = useState<CustomFeature[]>([]);

  // Statblock paste
  const [statblockPaste, setStatblockPaste] = useState('');
  const [collapsedPaste, setCollapsedPaste] = useState(false);

  // Collapsible panels
  const [openPanel, setOpenPanel] = useState<string>('basic');
  const [showPreview, setShowPreview] = useState(false);

  // Load editing monster
  useEffect(() => {
    if (editingMonsterId) {
      const monster = state.monsterDatabase?.find(m => m.id === editingMonsterId);
      if (monster) {
        setName(monster.name || '');
        setHp(monster.hp || monster.maxHp || 10);
        setEncounterPoints(monster.encounterPoints || 0.1);
        setDpr(monster.dpr || 0);
        setEntityKind(monster.entityKind || 'monster');
        setHasHpAc(Boolean(monster.hasHpAc));
        setFixedInitiative(monster.fixedInitiative ?? 20);
        setLairActionInitiative(monster.lairActionInitiative ?? 20);
        setMythicActionInitiative(monster.mythicActionInitiative ?? 20);
        setAc(monster.ac || 10);
        setMaxReactions(monster.maxReactions || 1);
        setSpeed(monster.speed || '');
        if (monster.stats) {
          setStats({
            strength: monster.stats.strength ?? 10,
            dexterity: monster.stats.dexterity ?? 10,
            constitution: monster.stats.constitution ?? 10,
            intelligence: monster.stats.intelligence ?? 10,
            wisdom: monster.stats.wisdom ?? 10,
            charisma: monster.stats.charisma ?? 10
          });
        }
        setSaves(monster.saves || '');
        setSkills(monster.skills || '');
        setSenses(monster.senses || '');
        setLanguages(monster.languages || '');
        setChallenge(monster.challenge || '');
        setProficiency(monster.proficiency || '');
        setMonsterType(monster.type || '');
        setSize(monster.size || 'Medium');
        setInitBonus(monster.initBonus || 0);
        setDescription(monster.description || '');
        setDamageResistances(monster.damageResistances || '');
        setDamageImmunities(monster.damageImmunities || '');
        setConditionImmunities(monster.conditionImmunities || '');
        setDamageVulnerabilities(monster.damageVulnerabilities || '');

        setDefensiveFeatures(entriesToText(monster.defensiveFeatures));
        setFeatures(entriesToText(monster.features));
        setActions(entriesToText(monster.actions));
        setBonusActions(entriesToText(monster.bonusActions));
        setReactions(entriesToText(monster.reactions));
        setLegendaryActionEntries(entriesToText(monster.legendaryActionEntries));
        setLairActions(entriesToText(monster.lairActions));
        setMythicActions(entriesToText(monster.mythicActions));
        setHasLairActions(Boolean(monster.hasLairActions));
        setHasMythicActions(Boolean(monster.hasMythicActions));
        setHasMultipleTurns(Boolean(monster.hasMultipleTurns));
        setGroup(monster.group || '');

        // Load monster abilities
        const ma = monster.monsterAbilities;
        if (ma) {
          setPowerEnabled(ma.power ? Boolean(ma.power.enabled) : Boolean(monster.maxPower));
          setPowerName(ma.power?.name || monster.powerName || 'Power');
          setMaxPower(Number(ma.power?.max ?? monster.maxPower ?? 0) || 0);
          setCurrentPower(Number(ma.power?.current ?? 0) || 0);

          setLegendaryEnabled(Boolean(ma.legendaryActions?.enabled || monster.legendaryActionEntries?.length));
          setLegendaryMax(ma.legendaryActions?.max || 3);

          setEpicEnabled(Boolean(ma.epicActions?.enabled || ma.epicActions?.actions?.length));
          setEpicActionsText(epicActionsToText(ma.epicActions?.actions));

          const sc = ma.spellcasting;
          if (sc) {
            setSpellcastingType((sc.spellcastingType as any) || (sc.enabled ? 'caster-level' : 'none'));
            setSpellcastingLevel(sc.spellcastingLevel || 1);
            setSpellSlots(sc.spellSlots || {});
            setAtWillSpells(sc.atWillSpells || []);
            setCounterspells(sc.counterspells || []);
            setPerDaySpells(sc.perDaySpells || []);
          } else {
            setSpellcastingType('none');
            setSpellSlots({});
            setAtWillSpells([]);
            setCounterspells([]);
            setPerDaySpells([]);
          }

          setCustomFeatures(ma.customFeatures || []);
        } else {
          setSpellcastingType('none');
          setPowerEnabled(false);
          setLegendaryEnabled(false);
          setEpicEnabled(false);
          setCustomFeatures([]);
        }
      }
    } else {
      // Reset all fields for new monster
      setHasMultipleTurns(false);
      setGroup('');
      setEntityKind('monster');
      setHasHpAc(false);
      setFixedInitiative(20);
      setLairActionInitiative(20);
      setMythicActionInitiative(20);
    }
  }, [editingMonsterId, state.monsterDatabase]);

  // Sync customFeatures list with features currently listed in descriptive textareas
  const activeFeatures = useMemo(() => {
    const list = [
      ...parseEntriesText(defensiveFeatures),
      ...parseEntriesText(features),
      ...parseEntriesText(actions),
      ...parseEntriesText(bonusActions),
      ...parseEntriesText(reactions),
      ...parseEntriesText(legendaryActionEntries),
      ...parseEntriesText(lairActions),
      ...parseEntriesText(mythicActions)
    ];

    return list.map(item => {
      const name = item.name.replace(/\s*\(Recharge\s*\d+(?:\s*[-–]\s*\d+)?\)/i, '').replace(/\s*\(\d+\/(?:day|rest|long rest|short rest|round)\)/i, '').trim();
      const existing = customFeatures.find(cf => cf.name === name);
      return {
        name,
        trackerType: existing?.trackerType || 'none',
        maxUses: existing?.maxUses ?? 1,
        used: existing?.used ?? 0,
        restType: existing?.restType || 'day',
        rechargeValue: existing?.rechargeValue ?? 6,
        costAmount: existing?.costAmount ?? 1,
        costSpellLevel: existing?.costSpellLevel || '1'
      };
    }).filter((value, index, self) => self.findIndex(t => t.name === value.name) === index);
  }, [defensiveFeatures, features, actions, bonusActions, reactions, legendaryActionEntries, lairActions, mythicActions, customFeatures]);

  // Update a single custom feature configuration
  function updateCustomFeature(name: string, fields: Partial<CustomFeature>) {
    setCustomFeatures(prev => {
      const idx = prev.findIndex(f => f.name === name);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...fields };
        return copy;
      } else {
        const found = activeFeatures.find(af => af.name === name);
        return [...prev, {
          name,
          maxUses: 1,
          used: 0,
          restType: 'day',
          rechargeValue: 6,
          costAmount: 1,
          costSpellLevel: '1',
          trackerType: 'none',
          ...found,
          ...fields
        }];
      }
    });
  }

  // Parse Markdown statblock
  function applySpellcasting(sc: ReturnType<typeof parseMonsterSpellcasting>) {
    setSpellcastingType(sc.spellcastingType as typeof spellcastingType);
    setSpellcastingLevel(sc.spellcastingLevel || 1);
    setSpellSlots(sc.spellSlots);
    setAtWillSpells(sc.atWillSpells);
    setCounterspells(sc.counterspells);
    setPerDaySpells(sc.perDaySpells);
    setSpellcastingImportMessage(sc.enabled
      ? `Imported ${sc.atWillSpells.length} at-will spells, ${sc.perDaySpells.length} per-day spells, ${Object.keys(sc.spellSlots).length} slot levels and ${sc.counterspells.length} counterspells. Review before saving.`
      : 'No spell lists found. Use At Will:, 3/Day Each:, or 1st level (4 slots): followed by spell names.');
  }

  function importSpellcastingFromText() {
    const sources = [
      [features, actions, bonusActions, reactions].join('\n\n'),
      statblockPaste,
      description
    ];
    for (const source of sources) {
      const parsed = parseMonsterSpellcasting(source, spellDatabase);
      if (parsed.enabled) {
        applySpellcasting(parsed);
        return;
      }
    }
    setSpellcastingImportMessage('No spell lists found. Existing spellcasting settings were kept. Use At Will:, 3/Day Each:, or 1st level (4 slots): followed by spell names.');
  }

  function handleParse() {
    if (!statblockPaste.trim()) return;
    try {
      const parsed = parseMonsterMarkdown(statblockPaste, spellDatabase);
      setName(parsed.name);
      setHp(parsed.hp);
      setEncounterPoints(parsed.encounterPoints || 0.1);
      setDpr(parsed.dpr || 0);
      setEntityKind(parsed.entityKind || 'monster');
      setHasHpAc(Boolean(parsed.hasHpAc));
      setFixedInitiative(parsed.fixedInitiative ?? 20);
      setLairActionInitiative(parsed.lairActionInitiative ?? 20);
      setMythicActionInitiative(parsed.mythicActionInitiative ?? 20);
      setAc(parsed.ac);
      setSpeed(parsed.speed);
      if (parsed.stats) setStats(parsed.stats);
      setSaves(parsed.saves);
      setSkills(parsed.skills);
      setSenses(parsed.senses);
      setLanguages(parsed.languages);
      setChallenge(parsed.challenge);
      setProficiency(parsed.proficiency);
      setMonsterType(parsed.type || '');
      setSize(parsed.size || 'Medium');
      setInitBonus(parsed.initBonus || 0);
      setDescription(parsed.description);
      setDamageResistances(parsed.damageResistances || '');
      setDamageImmunities(parsed.damageImmunities || '');
      setConditionImmunities(parsed.conditionImmunities || '');
      setDamageVulnerabilities(parsed.damageVulnerabilities || '');

      setDefensiveFeatures(entriesToText(parsed.defensiveFeatures));
      setFeatures(entriesToText(parsed.features));
      setActions(entriesToText(parsed.actions));
      setBonusActions(entriesToText(parsed.bonusActions));
      setReactions(entriesToText(parsed.reactions));
      setLegendaryActionEntries(entriesToText(parsed.legendaryActionEntries));
      setLairActions(entriesToText(parsed.lairActions));
      setMythicActions(parsed.mythicActions ? entriesToText(parsed.mythicActions) : '');
      setHasLairActions(parsed.hasLairActions);
      setHasMythicActions(parsed.hasMythicActions);

      const ma = parsed.monsterAbilities;
      if (ma) {
        setPowerEnabled(Boolean(ma.power?.enabled));
        setPowerName(ma.power?.name || 'Power');
        setMaxPower(ma.power?.max || 0);
        setCurrentPower(ma.power?.current || 0);

        setLegendaryEnabled(ma.legendaryActions?.enabled);
        setLegendaryMax(ma.legendaryActions?.max || 3);

        const sc = ma.spellcasting;
        if (sc) {
          applySpellcasting(sc);
        }

        setCustomFeatures(ma.customFeatures || []);
      }

      setCollapsedPaste(true);
      alert('Statblock parsed successfully! Review the extracted traits and fields below.');
    } catch (err: any) {
      alert(`Error parsing statblock: ${err.message}`);
    }
  }

  // Handle Save
  async function handleSave() {
    if (!name.trim()) {
      alert('Monster Name is required!');
      return;
    }

    const df = parseEntriesText(defensiveFeatures);
    const ft = parseEntriesText(features);
    const act = parseEntriesText(actions);
    const ba = parseEntriesText(bonusActions);
    const rx = parseEntriesText(reactions);
    const leg = parseEntriesText(legendaryActionEntries);
    const lair = parseEntriesText(lairActions);
    const myth = parseEntriesText(mythicActions);
    const epic = parseEpicActionsText(epicActionsText);

    // Filter customFeatures to only include active ones that are tracked
    const finalCustomFeatures = activeFeatures
      .map(af => {
        const found = customFeatures.find(cf => cf.name === af.name);
        return found || af;
      })
      .filter(f => f.trackerType !== 'none');

    // Prepare spell slots based on selected type
    let finalSpellSlots: Record<string, { max: number; used: number; atWill?: boolean; spells?: string[] }> = {};
    if (spellcastingType === 'caster-level') {
      const levelSlots = SPELL_SLOTS_TABLE[spellcastingLevel] || [0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (let i = 1; i <= 9; i++) {
        const max = levelSlots[i - 1] || 0;
        if (max > 0) {
          finalSpellSlots[String(i)] = {
            max,
            used: spellSlots[String(i)]?.used || 0,
            spells: spellSlots[String(i)]?.spells || []
          };
        }
      }
    } else if (spellcastingType === 'custom-slots') {
      // Keep only custom slot rows
      Object.keys(spellSlots).forEach(key => {
        finalSpellSlots[key] = {
          max: spellSlots[key].max,
          used: spellSlots[key].used || 0,
          atWill: spellSlots[key].atWill,
          spells: spellSlots[key].spells || []
        };
      });
    }

    const finalMaxPower = powerEnabled ? maxPower : 0;
    const finalCurrentPower = powerEnabled ? Math.min(currentPower, finalMaxPower) : 0;

    const payload = {
      id: editingMonsterId || undefined,
      name: name.trim(),
      hp,
      maxHp: hp,
      encounterPoints: Math.max(0.1, Math.min(20, encounterPoints || 0.1)),
      dpr: Math.max(0, dpr || 0),
      entityKind,
      hasHpAc: entityKind === 'monster' || hasHpAc,
      fixedInitiative: entityKind === 'nonMonster' ? fixedInitiative : undefined,
      lairActionInitiative,
      mythicActionInitiative,
      ac,
      maxReactions,
      speed,
      stats,
      saves,
      skills,
      senses,
      languages,
      challenge,
      proficiency,
      type: monsterType,
      size,
      initBonus,
      description,
      defensiveFeatures: df,
      features: ft,
      actions: act,
      bonusActions: ba,
      reactions: rx,
      legendaryActionEntries: leg,
      lairActions: lair,
      mythicActions: myth,
      hasLairActions: hasLairActions || lair.length > 0,
      hasMythicActions: hasMythicActions || myth.length > 0,
      damageResistances,
      damageImmunities,
      conditionImmunities,
      damageVulnerabilities,
      hasMultipleTurns,
      group: group.trim(),
      maxPower: finalMaxPower,
      currentPower: finalCurrentPower,
      powerName: powerName || 'Power',
      monsterAbilities: {
        enabled: true,
        power: {
          enabled: powerEnabled,
          name: powerName || 'Power',
          max: finalMaxPower,
          current: finalCurrentPower
        },
        spellcasting: {
          enabled: spellcastingType !== 'none',
          spellcastingType,
          spellcastingLevel: spellcastingType === 'caster-level' ? spellcastingLevel : undefined,
          spellSlots: finalSpellSlots,
          atWillSpells: spellcastingType !== 'none' ? atWillSpells : [],
          counterspells: spellcastingType !== 'none' ? counterspells : [],
          perDaySpells: spellcastingType === 'per-day' ? perDaySpells : []
        },
        spellSlots: finalSpellSlots,
        perDaySpells: spellcastingType === 'per-day' ? perDaySpells : [],
        customFeatures: finalCustomFeatures,
        legendaryActions: {
          enabled: legendaryEnabled || leg.length > 0,
          max: Number(legendaryMax) || (leg.length > 0 ? 3 : 0),
          used: 0
        },
        epicActions: {
          enabled: epicEnabled || epic.length > 0,
          actions: epic
        }
      }
    };

    await submitAction({
      type: 'database.monster.upsert',
      page: 'databases',
      payload: { monster: payload }
    });

    onBackToDatabases();
  };

  function buildPreviewMonster(): MonsterDatabaseEntry {
    const df = parseEntriesText(defensiveFeatures);
    const ft = parseEntriesText(features);
    const act = parseEntriesText(actions);
    const ba = parseEntriesText(bonusActions);
    const rx = parseEntriesText(reactions);
    const leg = parseEntriesText(legendaryActionEntries);
    const lair = parseEntriesText(lairActions);
    const myth = parseEntriesText(mythicActions);
    const epic = parseEpicActionsText(epicActionsText);
    const finalCustomFeatures = activeFeatures
      .map(af => customFeatures.find(cf => cf.name === af.name) || af)
      .filter(f => f.trackerType !== 'none');
    let finalSpellSlots: Record<string, { max: number; used: number; atWill?: boolean; spells?: string[] }> = {};
    if (spellcastingType === 'caster-level') {
      const levelSlots = SPELL_SLOTS_TABLE[spellcastingLevel] || [0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (let i = 1; i <= 9; i++) {
        const max = levelSlots[i - 1] || 0;
        if (max > 0) {
          finalSpellSlots[String(i)] = {
            max,
            used: spellSlots[String(i)]?.used || 0,
            spells: spellSlots[String(i)]?.spells || []
          };
        }
      }
    } else if (spellcastingType === 'custom-slots') {
      Object.keys(spellSlots).forEach(key => {
        finalSpellSlots[key] = {
          max: spellSlots[key].max,
          used: spellSlots[key].used || 0,
          atWill: spellSlots[key].atWill,
          spells: spellSlots[key].spells || []
        };
      });
    }

    const finalMaxPower = powerEnabled ? maxPower : 0;
    const finalCurrentPower = powerEnabled ? Math.min(currentPower, finalMaxPower) : 0;

    return {
      id: editingMonsterId || 'editor-preview',
      name: name.trim() || 'Unsaved Monster',
      hp,
      maxHp: hp,
      encounterPoints: Math.max(0.1, Math.min(20, encounterPoints || 0.1)),
      dpr: Math.max(0, dpr || 0),
      entityKind,
      hasHpAc: entityKind === 'monster' || hasHpAc,
      fixedInitiative: entityKind === 'nonMonster' ? fixedInitiative : undefined,
      lairActionInitiative,
      mythicActionInitiative,
      ac,
      maxReactions,
      speed,
      stats,
      saves,
      skills,
      senses,
      languages,
      challenge,
      proficiency,
      type: monsterType,
      size,
      initBonus,
      description,
      defensiveFeatures: df,
      features: ft,
      actions: act,
      bonusActions: ba,
      reactions: rx,
      legendaryActionEntries: leg,
      lairActions: lair,
      mythicActions: myth,
      hasLairActions: hasLairActions || lair.length > 0,
      hasMythicActions: hasMythicActions || myth.length > 0,
      damageResistances,
      damageImmunities,
      conditionImmunities,
      damageVulnerabilities,
      hasMultipleTurns,
      group: group.trim(),
      maxPower: finalMaxPower,
      currentPower: finalCurrentPower,
      powerName: powerName || 'Power',
      monsterAbilities: {
        enabled: true,
        power: {
          enabled: powerEnabled,
          name: powerName || 'Power',
          max: finalMaxPower,
          current: finalCurrentPower
        },
        spellcasting: {
          enabled: spellcastingType !== 'none',
          spellcastingType,
          spellcastingLevel: spellcastingType === 'caster-level' ? spellcastingLevel : undefined,
          spellSlots: finalSpellSlots,
          atWillSpells: spellcastingType !== 'none' ? atWillSpells : [],
          counterspells: spellcastingType !== 'none' ? counterspells : [],
          perDaySpells: spellcastingType === 'per-day' ? perDaySpells : []
        },
        spellSlots: finalSpellSlots,
        perDaySpells: spellcastingType === 'per-day' ? perDaySpells : [],
        customFeatures: finalCustomFeatures,
        legendaryActions: {
          enabled: legendaryEnabled || leg.length > 0,
          max: Number(legendaryMax) || (leg.length > 0 ? 3 : 0),
          used: 0
        },
        epicActions: {
          enabled: epicEnabled || epic.length > 0,
          actions: epic
        }
      }
    };
  }

  // Helper to add spell to level
  function addSpellToLevel(levelKey: string, spellName: string) {
    setSpellSlots(prev => {
      const curr = prev[levelKey] || { max: 0, used: 0, spells: [] };
      const list = curr.spells || [];
      if (list.includes(spellName)) return prev;
      return {
        ...prev,
        [levelKey]: {
          ...curr,
          spells: [...list, spellName]
        }
      };
    });
  }

  // Remove spell from level
  function removeSpellFromLevel(levelKey: string, spellName: string) {
    setSpellSlots(prev => {
      const curr = prev[levelKey];
      if (!curr) return prev;
      return {
        ...prev,
        [levelKey]: {
          ...curr,
          spells: (curr.spells || []).filter(s => s !== spellName)
        }
      };
    });
  }

  return (
    <div className="monster-editor-page" style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', color: '#e2e8f0' }}>
      {/* Top Bar */}
      <header className="page-sticky-section" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#13131a',
        padding: '12px 20px',
        borderBottom: '1px solid #2a2a35',
        borderRadius: '6px',
        marginBottom: '20px',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button className="btn" onClick={onBackToDatabases}>&larr; Back to Databases</button>
          <h2 style={{ margin: 0 }}>{isEditing ? `Edit Monster: ${name}` : 'Create New Monster'}</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="btn purple" onClick={() => setShowPreview(true)} style={{ padding: '10px 20px', fontSize: '1.1em' }}>
            Preview
          </button>
          <button className="btn success" onClick={handleSave} style={{ padding: '10px 20px', fontSize: '1.1em' }}>
            Save Monster Entry
          </button>
        </div>
      </header>

      {/* Statblock Paste Panel */}
      <section style={{ background: '#1e1e24', border: '1px solid #2a2a35', borderRadius: '6px', padding: '15px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setCollapsedPaste(!collapsedPaste)}>
          <h3 style={{ margin: 0, color: 'var(--color-nav, #60a5fa)' }}>Import via Markdown Statblock</h3>
          <span style={{ fontSize: '0.9em' }}>{collapsedPaste ? '[Expand]' : '[Collapse]'}</span>
        </div>
        {!collapsedPaste && (
          <div style={{ marginTop: '12px' }}>
            <textarea
              style={{
                width: '100%',
                height: '150px',
                background: '#13131a',
                color: '#e2e8f0',
                border: '1px solid #2a2a35',
                borderRadius: '4px',
                fontFamily: 'monospace',
                padding: '10px',
                marginBottom: '10px',
                resize: 'vertical'
              }}
              placeholder="Paste Markdown statblock here..."
              value={statblockPaste}
              onChange={e => setStatblockPaste(e.target.value)}
            />
            <button className="btn success" onClick={handleParse}>Parse Statblock</button>
          </div>
        )}
        {spellcastingImportMessage && <p role="status">{spellcastingImportMessage}</p>}
      </section>

      {/* Main Grid */}
      <div className="monster-editor-columns" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Left Column: Core Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* General Attributes */}
          <fieldset style={{ background: '#1e1e24', border: '1px solid #2a2a35', borderRadius: '6px', padding: '20px' }}>
            <legend style={{ padding: '0 10px', color: '#60a5fa', fontWeight: 'bold' }}>Attributes & General</legend>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label>Name:</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ancient Red Dragon" title="Monster name" />
              </div>
              <div>
                <label>Entry type:</label>
                <select value={entityKind} onChange={e => setEntityKind(e.target.value as 'monster' | 'nonMonster')}>
                  <option value="monster">Monster</option>
                  <option value="nonMonster">Non-monster object</option>
                </select>
              </div>
              {(entityKind === 'monster' || hasHpAc) && <div>
                <label>AC (Armor Class):</label>
                <NumberInput type="number" value={ac} onChange={e => setAc(Number(e.target.value))} title="Armor class" />
              </div>}
              {(entityKind === 'monster' || hasHpAc) && <div>
                <label>HP (Hit Points):</label>
                <NumberInput type="number" value={hp} onChange={e => setHp(Number(e.target.value))} title="Maximum HP" />
              </div>}
              {entityKind === 'nonMonster' && <>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={hasHpAc} onChange={e => setHasHpAc(e.target.checked)} /> Destructible: track HP and AC</label>
                <div><label>Fixed Initiative:</label><NumberInput type="number" value={fixedInitiative} onChange={e => setFixedInitiative(Number(e.target.value))} title="This object never rolls initiative" /></div>
              </>}
              <div>
                <label>Encounter points (0.1–20):</label>
                <NumberInput type="number" min="0.1" max="20" step="0.1" value={encounterPoints} onChange={e => setEncounterPoints(Number(e.target.value))} title="Difficulty points for encounter planning" />
              </div>
              <div>
                <label>Expected DPR:</label>
                <NumberInput type="number" min="0" value={dpr} onChange={e => setDpr(Number(e.target.value) || 0)} title="Expected damage per round for encounter planning" />
              </div>
              <div>
                <label>Max Reactions per Turn:</label>
                <NumberInput type="number" value={maxReactions} onChange={e => setMaxReactions(Number(e.target.value))} title="Max reactions" />
              </div>
              <div>
                <label>Speed:</label>
                <input type="text" value={speed} onChange={e => setSpeed(e.target.value)} placeholder="e.g. 30 ft., fly 80 ft." title="Movement speed" />
              </div>
              <div>
                <label>Challenge Rating:</label>
                <input type="text" value={challenge} onChange={e => setChallenge(e.target.value)} placeholder="e.g. 20 (25,000 XP)" title="CR" />
              </div>
              <div>
                <label>Proficiency Bonus:</label>
                <input type="text" value={proficiency} onChange={e => setProficiency(e.target.value)} placeholder="e.g. +6" title="Proficiency bonus" />
              </div>
              {entityKind === 'monster' && <div>
                <label>Initiative Modifier:</label>
                <NumberInput type="number" value={initBonus} onChange={e => setInitBonus(Number(e.target.value) || 0)} title="Initiative modifier" />
              </div>}
              <div>
                <label>Monster Type:</label>
                <input type="text" value={monsterType} onChange={e => setMonsterType(e.target.value)} placeholder="e.g. dragon, fiend" title="Monster subtype/type" />
              </div>
              <div>
                <label>Size:</label>
                <select value={size} onChange={e => setSize(e.target.value)} title="Size category">
                  {['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Monster Group / Category:</label>
                <input
                  type="text"
                  list="monster-group-list"
                  value={group}
                  onChange={e => setGroup(e.target.value)}
                  placeholder="e.g. Undead, Boss, Bandits..."
                  title="Group or category for database filtering"
                />
                <datalist id="monster-group-list">
                  {existingGroups.map(g => <option key={g} value={g} />)}
                </datalist>
              </div>
            </div>
          </fieldset>

          {entityKind === 'monster' && <>
          {/* Ability Scores */}
          <fieldset style={{ background: '#1e1e24', border: '1px solid #2a2a35', borderRadius: '6px', padding: '20px' }}>
            <legend style={{ padding: '0 10px', color: '#60a5fa', fontWeight: 'bold' }}>Ability Scores</legend>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
              {ABILITY_KEYS.map(key => (
                <div key={key} style={{ textAlign: 'center' }}>
                  <label style={{ textTransform: 'capitalize', fontSize: '0.85em' }}>{key.substring(0, 3)}</label>
                  <NumberInput
                    type="number"
                    style={{ textAlign: 'center' }}
                    value={stats[key]}
                    onChange={e => setStats(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                    title={`${key} score`}
                  />
                  <div style={{ fontSize: '0.8em', color: '#888', marginTop: '4px' }}>
                    {Math.floor((stats[key] - 10) / 2) >= 0 ? `+${Math.floor((stats[key] - 10) / 2)}` : Math.floor((stats[key] - 10) / 2)}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          {/* Saves & Skills description fields */}
          <fieldset style={{ background: '#1e1e24', border: '1px solid #2a2a35', borderRadius: '6px', padding: '20px' }}>
            <legend style={{ padding: '0 10px', color: '#60a5fa', fontWeight: 'bold' }}>Checks & Saves</legend>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label>Saving Throws:</label>
                <input type="text" value={saves} onChange={e => setSaves(e.target.value)} placeholder="e.g. Dex +6, Wis +9" title="Saving throw modifiers" />
              </div>
              <div>
                <label>Skills:</label>
                <input type="text" value={skills} onChange={e => setSkills(e.target.value)} placeholder="e.g. Perception +11, Stealth +9" title="Skill bonuses" />
              </div>
              <div>
                <label>Senses:</label>
                <input type="text" value={senses} onChange={e => setSenses(e.target.value)} placeholder="e.g. blindsight 60 ft., passive Perception 21" title="Passive senses" />
              </div>
              <div>
                <label>Languages:</label>
                <input type="text" value={languages} onChange={e => setLanguages(e.target.value)} placeholder="e.g. Common, Draconic" title="Languages" />
              </div>
            </div>
          </fieldset>

          {/* Resistances & Immunities */}
          <fieldset style={{ background: '#1e1e24', border: '1px solid #2a2a35', borderRadius: '6px', padding: '20px' }}>
            <legend style={{ padding: '0 10px', color: '#60a5fa', fontWeight: 'bold' }}>Resistances & Immunities</legend>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <CommaSeparatedPicker
                label="Damage Resistances"
                value={damageResistances}
                onChange={setDamageResistances}
                options={DAMAGE_TYPES}
                placeholder="e.g. fire, cold; bludgeoning from nonmagical attacks"
              />
              <CommaSeparatedPicker
                label="Damage Immunities"
                value={damageImmunities}
                onChange={setDamageImmunities}
                options={DAMAGE_TYPES}
                placeholder="e.g. fire, poison, vile"
              />
              <CommaSeparatedPicker
                label="Condition Immunities"
                value={conditionImmunities}
                onChange={setConditionImmunities}
                options={conditionOptions}
                placeholder="e.g. poisoned, charmed, stunned"
              />
              <CommaSeparatedPicker
                label="Damage Vulnerabilities"
                value={damageVulnerabilities}
                onChange={setDamageVulnerabilities}
                options={DAMAGE_TYPES}
                placeholder="e.g. cold, radiant"
              />
            </div>
          </fieldset>

          </>}

          {/* Description */}
          <fieldset style={{ background: '#1e1e24', border: '1px solid #2a2a35', borderRadius: '6px', padding: '20px' }}>
            <legend style={{ padding: '0 10px', color: '#60a5fa', fontWeight: 'bold' }}>Bio & Description Notes</legend>
            <MarkdownEditor
              value={description}
              onChange={setDescription}
              placeholder="Write backstory, lore, and visual notes..."
              label="Bio / Notes"
            />
          </fieldset>

        </div>

        {/* Right Column: Custom Features, Textblocks, Spellcasting */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Horizontal Collapsible panel switcher */}
          <div style={{ display: 'flex', gap: '5px', background: '#13131a', padding: '4px', borderRadius: '4px', border: '1px solid #2a2a35' }}>
            {[
              { id: 'basic', label: 'Traits & Actions' },
              { id: 'spellcasting', label: 'Spellcasting' },
              { id: 'resources', label: 'Power & Epics' },
              { id: 'trackers', label: 'Tracked Features' }
            ].map(tab => (
              <button
                key={tab.id}
                className={`nav-btn ${openPanel === tab.id ? 'active' : ''}`}
                style={{ flex: 1, padding: '8px 5px', fontSize: '0.9em' }}
                onClick={() => setOpenPanel(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Panel 1: Traits & Actions Textblocks */}
          {openPanel === 'basic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', background: '#1e1e24', padding: '20px', borderRadius: '6px', border: '1px solid #2a2a35' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Protective / Defensive Traits:</label>
                <MarkdownEditor
                  value={defensiveFeatures}
                  onChange={setDefensiveFeatures}
                  placeholder="**Magic Resistance.** Advantages on spells...&#10;&#10;**Divine Shield (3/Day).** Absorbs damage..."
                  label="Protective / Defensive Traits"
                  parseItems={parseEntriesText}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Regular Traits:</label>
                <MarkdownEditor
                  value={features}
                  onChange={setFeatures}
                  placeholder="**Amphibious.** Breathes air and water...&#10;&#10;**Legendary Resistance (3/Day).** Re-rolls failed save..."
                  label="Regular Traits"
                  parseItems={parseEntriesText}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Actions:</label>
                <MarkdownEditor
                  value={actions}
                  onChange={setActions}
                  placeholder="**Multiattack.** Attacks twice...&#10;&#10;**Bite.** Melee weapon attack: +11 to hit..."
                  label="Actions"
                  parseItems={parseEntriesText}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Bonus Actions:</label>
                <MarkdownEditor
                  value={bonusActions}
                  onChange={setBonusActions}
                  placeholder="**Quick Step.** Moves 10 feet as bonus action..."
                  label="Bonus Actions"
                  parseItems={parseEntriesText}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Reactions:</label>
                <MarkdownEditor
                  value={reactions}
                  onChange={setReactions}
                  placeholder="**Shield.** Standard reaction..."
                  label="Reactions"
                  parseItems={parseEntriesText}
                />
              </div>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={hasLairActions} onChange={e => setHasLairActions(e.target.checked)} />
                  Has Lair Actions
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={hasMythicActions} onChange={e => setHasMythicActions(e.target.checked)} />
                  Has Mythic Actions
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={hasMultipleTurns} onChange={e => setHasMultipleTurns(e.target.checked)} />
                  Has Multiple Turns
                </label>
              </div>
              {hasLairActions && (
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Lair Actions:</label>
                  <label>Associated object initiative:<NumberInput type="number" value={lairActionInitiative} onChange={e => setLairActionInitiative(Number(e.target.value))} style={{ marginLeft: '8px', width: '80px' }} /></label>
                  <MarkdownEditor
                    value={lairActions}
                    onChange={setLairActions}
                    placeholder="**Lair Action.** On initiative 20..."
                    label="Lair Actions"
                    parseItems={parseEntriesText}
                  />
                </div>
              )}
              {hasMythicActions && (
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Mythic Actions:</label>
                  <label>Associated object initiative:<NumberInput type="number" value={mythicActionInitiative} onChange={e => setMythicActionInitiative(Number(e.target.value))} style={{ marginLeft: '8px', width: '80px' }} /></label>
                  <MarkdownEditor
                    value={mythicActions}
                    onChange={setMythicActions}
                    placeholder="**Mythic Action.** Activates mythic form..."
                    label="Mythic Actions"
                    parseItems={parseEntriesText}
                  />
                </div>
              )}
            </div>
          )}

          {/* Panel 2: Spellcasting Config */}
          {openPanel === 'spellcasting' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', background: '#1e1e24', padding: '20px', borderRadius: '6px', border: '1px solid #2a2a35' }}>
              <div>
                <button type="button" className="btn purple" onClick={importSpellcastingFromText}>Import spellcasting from text</button>
                <p>Read spell lists from Traits &amp; Actions, or the pasted statblock. Review the extracted spells before saving.</p>
              </div>
              <div>
                <label>Spellcasting Configuration Type:</label>
                <select
                  value={spellcastingType}
                  onChange={e => {
                    const type = e.target.value as any;
                    setSpellcastingType(type);
                    if (type === 'none') {
                      setSpellSlots({});
                      setPerDaySpells([]);
                    }
                  }}
                  title="Caster configuration"
                >
                  <option value="none">Not a spell caster</option>
                  <option value="caster-level">Caster levels - standard slots progression</option>
                  <option value="custom-slots">Custom spell slots - custom counts or levels</option>
                  <option value="per-day">Per day - at-will and per-day spell uses</option>
                </select>
              </div>

              {/* Counterspells Section (Always available) */}
              <div style={{ border: '1px solid #2a2a35', borderRadius: '4px', padding: '12px', background: '#13131a' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#a78bfa' }}>Counterspells (Dedicated Category)</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {counterspells.length === 0 && <span style={{ color: '#555', fontSize: '0.9em' }}>None added yet.</span>}
                  {counterspells.map(s => (
                    <span key={s} className="pill" style={{ background: '#4c1d95', border: '1px solid #7c3aed', color: '#ddd', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {s}
                      <button
                        type="button"
                        onClick={() => setCounterspells(prev => prev.filter(item => item !== s))}
                        style={{ border: 'none', background: 'transparent', color: '#ff8888', cursor: 'pointer', padding: 0 }}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <SpellSearchInput
                  spellDatabase={spellDatabase}
                  onSelectSpell={name => {
                    if (!counterspells.includes(name)) setCounterspells(prev => [...prev, name]);
                  }}
                  placeholder="Add a counterspell..."
                />
              </div>

              {/* At Will Spells Section */}
              {spellcastingType !== 'none' && (
                <div style={{ border: '1px solid #2a2a35', borderRadius: '4px', padding: '12px', background: '#13131a' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#38bdf8' }}>At-Will Spells (Cantrips / Innate at-will)</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    {atWillSpells.length === 0 && <span style={{ color: '#555', fontSize: '0.9em' }}>None added yet.</span>}
                    {atWillSpells.map(s => (
                      <span key={s} className="pill" style={{ background: '#1e3a8a', border: '1px solid #3b82f6', color: '#ddd', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {s}
                        <button
                          type="button"
                          onClick={() => setAtWillSpells(prev => prev.filter(item => item !== s))}
                          style={{ border: 'none', background: 'transparent', color: '#ff8888', cursor: 'pointer', padding: 0 }}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                  <SpellSearchInput
                    spellDatabase={spellDatabase}
                    onSelectSpell={name => {
                      if (!atWillSpells.includes(name)) setAtWillSpells(prev => [...prev, name]);
                    }}
                    placeholder="Add an at-will spell..."
                  />
                </div>
              )}

              {/* Type: Caster Levels */}
              {spellcastingType === 'caster-level' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div>
                    <label>Caster Level (1-20):</label>
                    <NumberInput
                      type="number"
                      min={1}
                      max={20}
                      value={spellcastingLevel}
                      onChange={e => setSpellcastingLevel(Math.max(1, Math.min(20, Number(e.target.value))))}
                      title="Caster level score"
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h4 style={{ margin: '5px 0' }}>Spells by Level Slots:</h4>
                    {(() => {
                      const levelSlots = SPELL_SLOTS_TABLE[spellcastingLevel] || [0, 0, 0, 0, 0, 0, 0, 0, 0];
                      return [1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => {
                        const max = levelSlots[i - 1] || 0;
                        if (max === 0) return null;
                        const levelKey = String(i);
                        const currSlots = spellSlots[levelKey] || { max, used: 0, spells: [] };
                        const list = currSlots.spells || [];

                        return (
                          <div key={i} style={{ border: '1px solid #2a2a35', padding: '10px', borderRadius: '4px', background: '#13131a' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9em' }}>
                              <strong>Level {i}</strong>
                              <span style={{ color: '#10b981' }}>{max} Slots</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                              {list.map(s => (
                                <span key={s} className="pill small" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#2c2c38', border: '1px solid #3e3e4f' }}>
                                  {s}
                                  <button
                                    type="button"
                                    onClick={() => removeSpellFromLevel(levelKey, s)}
                                    style={{ border: 'none', background: 'transparent', color: '#ff6666', cursor: 'pointer', padding: 0 }}
                                  >
                                    &times;
                                  </button>
                                </span>
                              ))}
                              {list.length === 0 && <span style={{ color: '#555', fontSize: '0.85em' }}>No spells added.</span>}
                            </div>
                            <SpellSearchInput
                              spellDatabase={spellDatabase}
                              onSelectSpell={name => addSpellToLevel(levelKey, name)}
                              placeholder={`Add Level ${i} spell...`}
                            />
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* Type: Custom Slots */}
              {spellcastingType === 'custom-slots' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0 }}>Custom Slot Levels</h4>
                    <button
                      type="button"
                      className="btn success small"
                      onClick={() => {
                        const id = Math.random().toString(36).substring(2, 6);
                        setSpellSlots(prev => ({
                          ...prev,
                          [id]: { max: 1, used: 0, atWill: false, spells: [] }
                        }));
                      }}
                    >
                      + Add Custom Level
                    </button>
                  </div>

                  {Object.entries(spellSlots).map(([key, curr]) => (
                    <div key={key} style={{ border: '1px solid #2a2a35', padding: '12px', borderRadius: '4px', background: '#13131a' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto auto', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                        <input
                          type="text"
                          value={key.length < 5 ? `Level ${key}` : key}
                          onChange={e => {
                            const newKey = e.target.value;
                            if (newKey && newKey !== key) {
                              setSpellSlots(prev => {
                                const copy = { ...prev };
                                delete copy[key];
                                copy[newKey] = curr;
                                return copy;
                              });
                            }
                          }}
                          placeholder="Name (e.g. 1st level)"
                          title="Slot name"
                        />
                        <NumberInput
                          type="number"
                          value={curr.max}
                          onChange={e => {
                            const val = Number(e.target.value) || 0;
                            setSpellSlots(prev => ({
                              ...prev,
                              [key]: { ...curr, max: val }
                            }));
                          }}
                          placeholder="Slots Count"
                          disabled={curr.atWill}
                          title="Max slots"
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', margin: 0 }}>
                          <input
                            type="checkbox"
                            checked={Boolean(curr.atWill)}
                            onChange={e => {
                              const val = e.target.checked;
                              setSpellSlots(prev => ({
                                ...prev,
                                [key]: { ...curr, atWill: val, max: val ? 0 : curr.max }
                              }));
                            }}
                          />
                          At Will
                        </label>
                        <button
                          type="button"
                          className="btn danger small"
                          onClick={() => {
                            setSpellSlots(prev => {
                              const copy = { ...prev };
                              delete copy[key];
                              return copy;
                            });
                          }}
                        >
                          &times;
                        </button>
                      </div>
                      
                      {/* Spells in custom level */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                        {(curr.spells || []).map(s => (
                          <span key={s} className="pill small" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#2c2c38', border: '1px solid #3e3e4f' }}>
                            {s}
                            <button
                              type="button"
                              onClick={() => removeSpellFromLevel(key, s)}
                              style={{ border: 'none', background: 'transparent', color: '#ff6666', cursor: 'pointer', padding: 0 }}
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                        {(curr.spells || []).length === 0 && <span style={{ color: '#555', fontSize: '0.85em' }}>No spells added.</span>}
                      </div>
                      <SpellSearchInput
                        spellDatabase={spellDatabase}
                        onSelectSpell={name => addSpellToLevel(key, name)}
                        placeholder="Add spell..."
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Type: Per Day */}
              {spellcastingType === 'per-day' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0 }}>Per-Day Spells</h4>
                    <button
                      type="button"
                      className="btn success small"
                      onClick={() => {
                        setPerDaySpells(prev => [...prev, { name: '', maxUses: 1, used: 0 }]);
                      }}
                    >
                      + Add Per-Day Spell
                    </button>
                  </div>

                  {perDaySpells.map((pd, index) => (
                    <div key={index} style={{ border: '1px solid #2a2a35', padding: '10px', borderRadius: '4px', background: '#13131a' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                        <SpellSearchInput
                          spellDatabase={spellDatabase}
                          onSelectSpell={name => {
                            setPerDaySpells(prev => {
                              const copy = [...prev];
                              copy[index] = { ...copy[index], name };
                              return copy;
                            });
                          }}
                          placeholder={pd.name || 'Select spell...'}
                        />
                        <NumberInput
                          type="number"
                          value={pd.maxUses}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setPerDaySpells(prev => {
                              const copy = [...prev];
                              copy[index] = { ...copy[index], maxUses: val };
                              return copy;
                            });
                          }}
                          placeholder="Uses"
                          min={1}
                          title="Uses per day"
                        />
                        <button
                          type="button"
                          className="btn danger small"
                          onClick={() => {
                            setPerDaySpells(prev => prev.filter((_, i) => i !== index));
                          }}
                        >
                          &times;
                        </button>
                      </div>
                      {pd.name && (
                        <div style={{ fontSize: '0.85em', color: '#10b981' }}>
                          Selected spell: <strong>{pd.name}</strong>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* Panel 3: Power Resource & Epic Actions */}
          {openPanel === 'resources' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: '#1e1e24', padding: '20px', borderRadius: '6px', border: '1px solid #2a2a35' }}>
              
              {/* Power resource */}
              <div style={{ border: '1px solid #2a2a35', borderRadius: '4px', padding: '15px', background: '#13131a' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#3b82f6', marginBottom: '12px' }}>
                  <input type="checkbox" checked={powerEnabled} onChange={e => setPowerEnabled(e.target.checked)} />
                  Enable Power Point Resource Tracking
                </label>
                {powerEnabled && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '10px' }}>
                    <div>
                      <label>Resource Name:</label>
                      <input type="text" value={powerName} onChange={e => setPowerName(e.target.value)} placeholder="e.g. Favor, Focus" title="Resource name" />
                    </div>
                    <div>
                      <label>Max Points:</label>
                      <NumberInput type="number" value={maxPower} onChange={e => setMaxPower(Number(e.target.value) || 0)} min={0} title="Max points" />
                    </div>
                    <div>
                      <label>Initial Current:</label>
                      <NumberInput type="number" value={currentPower} onChange={e => setCurrentPower(Number(e.target.value) || 0)} min={0} title="Current points" />
                    </div>
                  </div>
                )}
              </div>

              {/* Legendary Actions */}
              <div style={{ border: '1px solid #2a2a35', borderRadius: '4px', padding: '15px', background: '#13131a' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#f59e0b', marginBottom: '12px' }}>
                  <input type="checkbox" checked={legendaryEnabled} onChange={e => setLegendaryEnabled(e.target.checked)} />
                  Enable Legendary Actions
                </label>
                {legendaryEnabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px' }}>Max Actions per Round:</label>
                      <NumberInput type="number" value={legendaryMax} onChange={e => setLegendaryMax(Number(e.target.value))} min={1} title="Max actions" />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Legendary Actions Description:</label>
                      <MarkdownEditor
                        value={legendaryActionEntries}
                        onChange={setLegendaryActionEntries}
                        placeholder="**Tail Swipe.** Deals damage...&#10;&#10;**Wing Attack (Costs 2 Actions).** Flies and knocks prone..."
                        label="Legendary Actions"
                        parseItems={parseEntriesText}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Epic Actions */}
              <div style={{ border: '1px solid #2a2a35', borderRadius: '4px', padding: '15px', background: '#13131a' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#ec4899', marginBottom: '12px' }}>
                  <input type="checkbox" checked={epicEnabled} onChange={e => setEpicEnabled(e.target.checked)} />
                  Enable Epic / Mythic Action Limits
                </label>
                {epicEnabled && (
                  <div>
                    {epicActionsText ? (
                      <div style={{ background: '#1e1e24', padding: '10px', borderRadius: '4px', marginBottom: '10px', border: '1px solid #2a2a35' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '0.9em', color: '#ec4899' }}>Current Epic Actions:</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {parseEpicActionsText(epicActionsText).map((act, idx) => (
                            <div key={idx} style={{ fontSize: '0.85em', display: 'flex', justifyContent: 'space-between' }}>
                              <span><strong>{act.name}</strong> ({act.maxUses} uses)</span>
                              <span style={{ color: '#888', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '300px' }}>{act.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: '#555', fontSize: '0.9em', margin: '0 0 10px 0' }}>No epic actions defined yet.</p>
                    )}

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        className="btn small purple"
                        onClick={() => setShowEpicModal(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        🎛️ Open Epic Actions Editor
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Panel 4: Tracked Features Config */}
          {openPanel === 'trackers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', background: '#1e1e24', padding: '20px', borderRadius: '6px', border: '1px solid #2a2a35' }}>
              <h3 style={{ margin: 0, color: '#10b981' }}>Tracked Features Configuration</h3>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.85em', color: '#888' }}>
                Configure recharges, per-day/round limits, and resource/slot costs for traits and actions parsed above.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
                {activeFeatures.length === 0 && <p style={{ color: '#555' }}>No features found. Write traits/actions in the first tab.</p>}
                {activeFeatures.map(feat => {
                  // Find current state
                  const isTracked = feat.trackerType !== 'none';

                  return (
                    <div key={feat.name} style={{ border: '1px solid #2a2a35', padding: '12px', borderRadius: '6px', background: isTracked ? '#152b20' : '#13131a' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold' }}>{feat.name}</span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9em', margin: 0 }}>
                          <input
                            type="checkbox"
                            checked={isTracked}
                            onChange={e => {
                              updateCustomFeature(feat.name, {
                                trackerType: e.target.checked ? 'day' : 'none'
                              });
                            }}
                          />
                          Track uses / costs
                        </label>
                      </div>

                      {isTracked && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', fontSize: '0.9em' }}>
                          <div>
                            <label>Tracker Type:</label>
                            <select
                              value={feat.trackerType}
                              onChange={e => {
                                const type = e.target.value as any;
                                updateCustomFeature(feat.name, { trackerType: type });
                              }}
                              title="Tracker classification"
                            >
                              <option value="day">Per Day</option>
                              <option value="rest">Per Rest</option>
                              <option value="round">Per Round / Turn</option>
                              <option value="recharge">D6 Recharge roll</option>
                              {powerEnabled && <option value="power">Costs Power points</option>}
                              {spellcastingType !== 'none' && <option value="slot">Costs Spell slot</option>}
                            </select>
                          </div>

                          {/* Render type-specific fields */}
                          {(feat.trackerType === 'day' || feat.trackerType === 'rest' || feat.trackerType === 'round') && (
                            <div>
                              <label>Max Uses:</label>
                              <NumberInput
                                type="number"
                                min={1}
                                value={feat.maxUses}
                                onChange={e => updateCustomFeature(feat.name, { maxUses: Number(e.target.value) })}
                                title="Max uses limit"
                              />
                            </div>
                          )}

                          {feat.trackerType === 'recharge' && (
                            <div>
                              <label>Recharge on d6 roll of:</label>
                              <select
                                value={feat.rechargeValue}
                                onChange={e => updateCustomFeature(feat.name, { rechargeValue: Number(e.target.value) || 6 })}
                                title="Recharge rate"
                              >
                                <option value={6}>6</option>
                                <option value={5}>5 or 6 (5–6)</option>
                                <option value={4}>4, 5, or 6 (4–6)</option>
                                <option value={3}>3–6</option>
                              </select>
                            </div>
                          )}

                          {feat.trackerType === 'power' && (
                            <div>
                              <label>Power Cost Amount:</label>
                              <NumberInput
                                type="number"
                                min={1}
                                value={feat.costAmount}
                                onChange={e => updateCustomFeature(feat.name, { costAmount: Number(e.target.value) })}
                                title="Resource cost amount"
                              />
                            </div>
                          )}

                          {feat.trackerType === 'slot' && (
                            <>
                              <div>
                                <label>Spell Slot Level:</label>
                                <select
                                  value={feat.costSpellLevel}
                                  onChange={e => updateCustomFeature(feat.name, { costSpellLevel: e.target.value })}
                                  title="Spell slot level cost"
                                >
                                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(lvl => (
                                    <option key={lvl} value={lvl}>Level {lvl}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label>Slots Cost Amount:</label>
                                <NumberInput
                                  type="number"
                                  min={1}
                                  value={feat.costAmount}
                                  onChange={e => updateCustomFeature(feat.name, { costAmount: Number(e.target.value) })}
                                  title="Slots quantity cost"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>

      <EpicActionModal
        isOpen={showEpicModal}
        onClose={() => setShowEpicModal(false)}
        epicActionsText={epicActionsText}
        onSave={setEpicActionsText}
      />

      {showPreview && (
        <Modal>
          <div className="modal-card monster-preview-modal">
            <div className="section-title-row">
              <div>
                <h2>{name.trim() || 'Unsaved Monster'} Preview</h2>
                <p>Current editor fields rendered with the combat monster sheet.</p>
              </div>
              <button className="btn" onClick={() => setShowPreview(false)}>Close</button>
            </div>
            <MonsterDetail
              monster={monsterDatabaseEntryToPreviewCharacter(buildPreviewMonster())}
              submitAction={submitAction}
              spellDatabase={state.spellDatabase}
              readOnly
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

// Helpers
function entriesToText(value: unknown) {
  if (!Array.isArray(value)) return '';
  return value
    .map(entry => {
      if (!entry || typeof entry !== 'object') return '';
      const item = entry as Record<string, unknown>;
      const description = String(item.description || '').trim();
      if (description) return description;
      return item.name ? `**${String(item.name)}.**` : '';
    })
    .filter(Boolean)
    .join('\n\n');
}

function epicActionsToText(value: unknown) {
  if (!Array.isArray(value)) return '';
  return value.map(item => {
    const action = item as Record<string, unknown>;
    return `${action.name || 'Epic Action'} | ${Number(action.maxUses) || 1} | ${action.description || ''}`;
  }).join('\n');
}

function parseEpicActionsText(value: string) {
  return value
    .split(/\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [name, uses, ...descriptionParts] = line.split('|').map(part => part.trim());
      return { name: name || 'Epic Action', maxUses: Number(uses) || 1, used: 0, description: descriptionParts.join(' | ') };
    });
}

// EpicActionModal Component
interface EpicActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  epicActionsText: string;
  onSave: (newText: string) => void;
}

function EpicActionModal({ isOpen, onClose, epicActionsText, onSave }: EpicActionModalProps) {
  const [activeTab, setActiveTab] = useState<'grid' | 'raw'>('grid');
  const [localActions, setLocalActions] = useState<Array<{ name: string; maxUses: number; description: string }>>([]);
  const [localRawText, setLocalRawText] = useState('');

  useEffect(() => {
    if (isOpen) {
      const parsed = parseEpicActionsText(epicActionsText);
      setLocalActions(parsed);
      setLocalRawText(epicActionsText);
    }
  }, [isOpen, epicActionsText]);

  if (!isOpen) return null;

  function handleSave() {
    let finalRawText = '';
    if (activeTab === 'raw') {
      finalRawText = localRawText;
    } else {
      finalRawText = epicActionsToText(localActions);
    }
    onSave(finalRawText);
    onClose();
  }

  function handlePrefill() {
    const examples = [
      { name: 'Mythic Phase Trigger', maxUses: 1, description: 'Triggers mythic form when HP drops to 0.' },
      { name: 'Solar Flare', maxUses: 2, description: 'Deals 4d10 fire damage in a 30ft radius (recharge 5-6).' },
      { name: 'Epic Spellcasting', maxUses: 3, description: 'Cast an epic tier 1 spell.' }
    ];
    setLocalActions(examples);
    setLocalRawText(epicActionsToText(examples));
  }

  function handleAddRow() {
    const updated = [...localActions, { name: 'New Epic Action', maxUses: 1, description: '' }];
    setLocalActions(updated);
    setLocalRawText(epicActionsToText(updated));
  }

  function handleRemoveRow(index: number) {
    const updated = localActions.filter((_, i) => i !== index);
    setLocalActions(updated);
    setLocalRawText(epicActionsToText(updated));
  }

  function handleUpdateRow(index: number, fields: Partial<{ name: string; maxUses: number; description: string }>) {
    const updated = localActions.map((act, i) => {
      if (i === index) {
        return { ...act, ...fields };
      }
      return act;
    });
    setLocalActions(updated);
    setLocalRawText(epicActionsToText(updated));
  }

  function handleRawChange(val: string) {
    setLocalRawText(val);
    setLocalActions(parseEpicActionsText(val));
  }

  return (
    <Modal className="item-modal-backdrop">
      <div className="modal-card markdown-modal" style={{ width: 'min(980px, 100%)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div className="section-title-row" style={{ borderBottom: '1px solid #2a2a35', paddingBottom: '10px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#ec4899' }}>Epic / Mythic Actions Editor</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.9em', color: '#888' }}>
              Configure actions with restricted usage limits per day/encounter.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn small" onClick={handlePrefill} style={{ background: '#3b82f6', color: '#fff' }}>Prefill Example Table</button>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="button" className="btn success" onClick={handleSave}>Save & Close</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #2a2a35', paddingBottom: '10px' }}>
          <button
            type="button"
            className={`nav-btn ${activeTab === 'grid' ? 'active' : ''}`}
            onClick={() => setActiveTab('grid')}
            style={{ padding: '6px 12px', fontSize: '0.9em' }}
          >
            Structured Table Grid
          </button>
          <button
            type="button"
            className={`nav-btn ${activeTab === 'raw' ? 'active' : ''}`}
            onClick={() => setActiveTab('raw')}
            style={{ padding: '6px 12px', fontSize: '0.9em' }}
          >
            Raw Text Editor
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: '350px', maxHeight: '500px' }}>
          {activeTab === 'grid' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 4fr auto',
                gap: '10px',
                fontWeight: 'bold',
                paddingBottom: '6px',
                borderBottom: '1px solid #2a2a35',
                color: '#ec4899',
                fontSize: '0.9em'
              }}>
                <span>Action Name</span>
                <span>Max Uses</span>
                <span>Description (Markdown allowed)</span>
                <span>Actions</span>
              </div>

              {localActions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#555' }}>
                  No epic actions. Click "+ Add Action" or "Prefill Example Table" to start.
                </div>
              ) : (
                localActions.map((act, index) => (
                  <div key={index} style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 4fr auto',
                    gap: '10px',
                    alignItems: 'center',
                    background: '#13131a',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #2a2a35'
                  }}>
                    <input
                      type="text"
                      value={act.name}
                      onChange={e => handleUpdateRow(index, { name: e.target.value })}
                      placeholder="e.g. Mythic Surge"
                      style={{ background: '#1e1e24', border: '1px solid #2a2a35', color: '#e2e8f0', padding: '6px', width: '100%' }}
                      title="Epic action name"
                    />
                    <NumberInput
                      type="number"
                      value={act.maxUses}
                      onChange={e => handleUpdateRow(index, { maxUses: Math.max(1, Number(e.target.value)) })}
                      min={1}
                      style={{ background: '#1e1e24', border: '1px solid #2a2a35', color: '#e2e8f0', padding: '6px', width: '100%' }}
                      title="Epic action max uses"
                    />
                    <textarea
                      value={act.description}
                      onChange={e => handleUpdateRow(index, { description: e.target.value })}
                      placeholder="Deals damage, triggers features..."
                      rows={2}
                      style={{
                        background: '#1e1e24',
                        border: '1px solid #2a2a35',
                        color: '#e2e8f0',
                        padding: '6px',
                        width: '100%',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                      title="Epic action description"
                    />
                    <button
                      type="button"
                      className="btn danger small"
                      onClick={() => handleRemoveRow(index)}
                      style={{ height: '34px', width: '34px', padding: 0, display: 'grid', placeItems: 'center' }}
                      title="Delete action"
                    >
                      &times;
                    </button>
                  </div>
                ))
              )}

              <button
                type="button"
                className="btn success"
                onClick={handleAddRow}
                style={{ alignSelf: 'flex-start', marginTop: '10px' }}
              >
                + Add Action Row
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ margin: 0, fontSize: '0.85em', color: '#aaa' }}>
                Type epic actions, one per line using the format: <strong>Name | MaxUses | Description</strong>
              </p>
              <textarea
                value={localRawText}
                onChange={e => handleRawChange(e.target.value)}
                placeholder="Mythic Form | 1 | Triggers mythic phase...&#10;Solar Flare | 2 | Deals fire damage..."
                style={{
                  width: '100%',
                  height: '300px',
                  background: '#13131a',
                  color: '#e2e8f0',
                  border: '1px solid #2a2a35',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  padding: '10px',
                  resize: 'vertical'
                }}
                title="Raw text edit area"
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// CommaSeparatedPicker Component
function CommaSeparatedPicker({
  value,
  onChange,
  options,
  placeholder,
  label
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  label: string;
}) {
  const [showMenu, setShowMenu] = useState(false);

  function handleToggle(opt: string) {
    const items = value.split(',')
      .map(i => i.trim())
      .filter(Boolean);
    const lowerOpt = opt.toLowerCase();
    const index = items.findIndex(i => i.toLowerCase() === lowerOpt);
    
    if (index !== -1) {
      items.splice(index, 1);
    } else {
      items.push(opt);
    }
    onChange(items.join(', '));
  }

  function isSelected(opt: string) {
    return value.split(',')
      .map(i => i.trim().toLowerCase())
      .includes(opt.toLowerCase());
  }

  return (
    <div style={{ marginBottom: '15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <label style={{ fontWeight: 'bold', fontSize: '0.9em', color: '#e2e8f0', margin: 0 }}>{label}</label>
        <button
          type="button"
          className="btn small"
          onClick={() => setShowMenu(!showMenu)}
          style={{ padding: '2px 8px', fontSize: '0.8em', background: showMenu ? '#4b5563' : '#1f2937', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
        >
          {showMenu ? 'Hide Menu' : 'Pick from List'}
        </button>
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '8px', background: '#13131a', border: '1px solid #2a2a35', borderRadius: '4px', color: '#e2e8f0' }}
        title={label}
      />
      {showMenu && (
        <div style={{
          marginTop: '8px',
          padding: '10px',
          background: '#13131a',
          border: '1px solid #2a2a35',
          borderRadius: '4px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          maxHeight: '150px',
          overflowY: 'auto'
        }}>
          {options.map(opt => {
            const active = isSelected(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => handleToggle(opt)}
                style={{
                  background: active ? 'var(--color-nav, #3b82f6)' : '#1e1e24',
                  border: `1px solid ${active ? 'var(--color-nav, #3b82f6)' : '#2a2a35'}`,
                  color: active ? '#fff' : '#9ca3af',
                  cursor: 'pointer',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '0.8em'
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
