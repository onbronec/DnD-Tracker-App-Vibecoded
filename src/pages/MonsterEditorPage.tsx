import { NumberInput } from '../components/NumberInput';
import { useState, useEffect, useMemo, useRef, type ChangeEvent } from 'react';
import type { GameState, GameAction, AbilityKey, CustomFeature, MonsterDatabaseEntry, MonsterCombatType, MonsterFlag, MonsterEpicAction, MonsterEpicOption, EpicActionReset } from '../shared/types';
import { MarkdownEditor } from '../components/Markdown';
import { Modal } from '../components/Modal';
import { parseMonsterEntries as parseEntriesText, parseMonsterMarkdown, parseMonsterSpellcasting, epicActionsToText, parseEpicActionsText } from '../shared/monsterParser';
import { SPELL_SLOTS_TABLE, epicSlotsForLevel } from '../shared/defaults';
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
  onBackToDatabases: (savedGroup?: string) => void;
  initialMarkdown?: string;
  backLabel?: string;
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

export function MonsterEditorPage({ state, submitAction, editingMonsterId, onBackToDatabases, initialMarkdown, backLabel }: Props) {
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
  const [combatType, setCombatType] = useState<MonsterCombatType>('monster');
  const [flag, setFlag] = useState<MonsterFlag>('active');
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
  const [groups, setGroups] = useState<string[]>([]);
  const [newGroupInput, setNewGroupInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFocus, setImageFocus] = useState('center');
  const [showImageLibrary, setShowImageLibrary] = useState(false);
  const [libraryImages, setLibraryImages] = useState<string[]>([]);
  const [librarySearch, setLibrarySearch] = useState('');
  const [loadingImages, setLoadingImages] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // Extract existing groups for autocomplete
  const existingGroups = useMemo(() => {
    const allGroups = new Set<string>();
    (state.monsterDatabase || []).forEach(m => {
      (m.groups || (m.group ? [m.group] : [])).forEach(g => {
        if (g && g.trim()) allGroups.add(g.trim());
      });
    });
    return Array.from(allGroups).sort();
  }, [state.monsterDatabase]);

  function addGroup(val: string) {
    const parts = val.split(',').map(s => s.trim()).filter(Boolean);
    if (!parts.length) return;
    setGroups(prev => {
      const next = [...prev];
      parts.forEach(p => {
        if (!next.includes(p)) next.push(p);
      });
      return next;
    });
    setNewGroupInput('');
  }

  function removeGroup(groupToRemove: string) {
    setGroups(prev => prev.filter(g => g !== groupToRemove));
  }

  async function openImageLibrary() {
    setShowImageLibrary(true);
    setLoadingImages(true);
    try {
      const res = await fetch('/api/monster-images');
      const data = await res.json();
      if (data.success && Array.isArray(data.images)) {
        setLibraryImages(data.images);
      }
    } catch (err) {
      console.error('Failed to load monster images:', err);
    } finally {
      setLoadingImages(false);
    }
  }

  async function handleImageUploadFile(file: File) {
    if (!file) return;
    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const res = await fetch('/api/upload-monster-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, dataUrl })
        });
        const data = await res.json();
        if (data.success && data.url) {
          setImageUrl(data.url);
        } else {
          alert(`Nahrání selhalo: ${data.error || 'Neznámá chyba'}`);
        }
      } catch (err: any) {
        alert(`Chyba při nahrávání: ${err.message}`);
      } finally {
        setIsUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleImagePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleImageUploadFile(file);
          return;
        }
      }
    }
  }

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
  const markdownFileRef = useRef<HTMLInputElement>(null);
  const [markdownImportMessage, setMarkdownImportMessage] = useState('');
  const importedMarkdownRef = useRef<string>();

  useEffect(() => {
    if (!editingMonsterId && initialMarkdown && importedMarkdownRef.current !== initialMarkdown) {
      importedMarkdownRef.current = initialMarkdown;
      setStatblockPaste(initialMarkdown);
      handleParse(initialMarkdown, false);
    }
  }, [initialMarkdown, editingMonsterId]);

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
        setCombatType(monster.combatType || 'monster');
        setFlag(monster.flag || 'active');
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
        const loadedGroups = Array.isArray(monster.groups) && monster.groups.length
          ? monster.groups
          : (monster.group ? [monster.group] : []);
        setGroups(loadedGroups);
        setGroup(monster.group || loadedGroups[0] || '');
        setImageUrl(monster.imageUrl || '');
        setImageFocus(monster.imageFocus || 'center');

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

  async function importMarkdownFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      if (!text.trim()) throw new Error('The Markdown file is empty.');
      setStatblockPaste(text);
      handleParse(text, false);
    } catch (error) {
      setMarkdownImportMessage(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function handleParse(text = statblockPaste, notify = true) {
    if (!text.trim()) return;
    try {
      const parsed = parseMonsterMarkdown(text, spellDatabase);
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
      setMaxReactions(parsed.maxReactions);
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
      if (parsed.groups?.length) {
        setGroups(parsed.groups);
        setGroup(parsed.groups[0] || '');
      } else if (parsed.group) {
        setGroups([parsed.group]);
        setGroup(parsed.group);
      }
      if (parsed.imageUrl) setImageUrl(parsed.imageUrl);

      const ma = parsed.monsterAbilities;
      if (ma) {
        setPowerEnabled(Boolean(ma.power?.enabled));
        setPowerName(ma.power?.name || 'Power');
        setMaxPower(ma.power?.max || 0);
        setCurrentPower(ma.power?.current || 0);

        setLegendaryEnabled(ma.legendaryActions?.enabled);
        setLegendaryMax(ma.legendaryActions?.max || 3);
        setEpicEnabled(ma.epicActions.enabled);
        setEpicActionsText(epicActionsToText(ma.epicActions.actions));

        const sc = ma.spellcasting;
        if (sc) {
          applySpellcasting(sc);
        }

        setCustomFeatures(ma.customFeatures || []);
      }

      setCollapsedPaste(true);
      setMarkdownImportMessage('Statblock loaded into the draft. Review the fields, epic action groups and recovery limits, then Save Monster Entry. Group options share their parent pool and may have their own limits. HP phases and resource costs remain in the rules text.');
      if (notify) alert('Statblock parsed successfully! Review the extracted traits and fields below.');
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
      const levelSlots = SPELL_SLOTS_TABLE[spellcastingLevel] || (spellcastingLevel > 20 ? SPELL_SLOTS_TABLE[20] : [0, 0, 0, 0, 0, 0, 0, 0, 0]);
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
      const epicProg = epicSlotsForLevel(spellcastingLevel);
      ['epic1', 'epic2', 'epic3'].forEach(lvlKey => {
        const progMax = epicProg[lvlKey] || 0;
        const existing = spellSlots[lvlKey];
        const max = existing?.max !== undefined ? existing.max : progMax;
        if (max > 0 || (existing && existing.spells && existing.spells.length > 0)) {
          finalSpellSlots[lvlKey] = {
            max: max > 0 ? max : progMax,
            used: existing?.used || 0,
            atWill: existing?.atWill,
            spells: existing?.spells || []
          };
        }
      });
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
      combatType,
      flag,
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
      group: (groups[0]?.trim() || group.trim()),
      groups: (groups.length ? groups : (group.trim() ? [group.trim()] : [])).map(g => g.trim()).filter(Boolean),
      imageUrl: imageUrl.trim() || undefined,
      imageFocus: imageFocus || 'center',
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

    const savedPrimaryGroup = (groups[0]?.trim() || group.trim());
    onBackToDatabases(savedPrimaryGroup || undefined);
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
      const levelSlots = SPELL_SLOTS_TABLE[spellcastingLevel] || (spellcastingLevel > 20 ? SPELL_SLOTS_TABLE[20] : [0, 0, 0, 0, 0, 0, 0, 0, 0]);
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
      const epicProg = epicSlotsForLevel(spellcastingLevel);
      ['epic1', 'epic2', 'epic3'].forEach(lvlKey => {
        const progMax = epicProg[lvlKey] || 0;
        const existing = spellSlots[lvlKey];
        const max = existing?.max !== undefined ? existing.max : progMax;
        if (max > 0 || (existing && existing.spells && existing.spells.length > 0)) {
          finalSpellSlots[lvlKey] = {
            max: max > 0 ? max : progMax,
            used: existing?.used || 0,
            atWill: existing?.atWill,
            spells: existing?.spells || []
          };
        }
      });
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
      combatType,
      flag,
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
      group: (groups[0]?.trim() || group.trim()),
      groups: (groups.length ? groups : (group.trim() ? [group.trim()] : [])).map(g => g.trim()).filter(Boolean),
      imageUrl: imageUrl.trim() || undefined,
      imageFocus: imageFocus || 'center',
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

  const hpPerPoint = state.encounterDifficulty?.hpPerPoint || 150;
  const dprPerPointMin = state.encounterDifficulty?.dprPerPointMin || 80;
  const dprPerPointMax = state.encounterDifficulty?.dprPerPointMax || 100;

  const pts = Math.max(0.1, Number(encounterPoints) || 0.1);
  const expectedHp = Math.round(pts * hpPerPoint);
  const actualHp = Number(hp) || 0;
  const hpDiff = actualHp - expectedHp;

  const expectedDprMin = Math.round(pts * dprPerPointMin);
  const expectedDprMax = Math.round(pts * dprPerPointMax);
  const actualDpr = Number(dpr) || 0;

  return (
    <div className="monster-editor-page" style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', color: '#e2e8f0' }}>
      {/* Top Bar */}
      <header className="page-sticky-section" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#13131a',
        padding: '12px 20px',
        borderBottom: '1px solid #2a2a35',
        borderRadius: '6px',
        marginBottom: '20px',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '15px' }}>
          <button className="btn" onClick={() => onBackToDatabases()}>{backLabel || "← Back to Databases"}</button>
          <h2 style={{ margin: 0 }}>{isEditing ? `Edit Monster: ${name}` : 'Create New Monster'}</h2>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <button className="btn purple" onClick={() => setShowPreview(true)} style={{ padding: '10px 20px', fontSize: '1.1em' }}>
            Preview
          </button>
          <button className="btn success" onClick={handleSave} style={{ padding: '10px 20px', fontSize: '1.1em' }}>
            Save Monster Entry
          </button>
        </div>

        {/* Top Expected vs Actual Metrics Bar */}
        <div className="monster-metrics-bar" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '12px',
          width: '100%',
          marginTop: '10px',
          paddingTop: '10px',
          borderTop: '1px solid #2a2a35'
        }}>
          {/* Card 1: Encounter points */}
          <div className="field-card" style={{ padding: '8px 12px', background: '#0f172a', borderRadius: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted, #94a3b8)', display: 'block' }}>Encounter Body (Points)</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
              <strong style={{ fontSize: '1.25rem', color: '#fde68a' }}>{pts.toFixed(1)} pt</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted, #94a3b8)' }}>(1 pt = {hpPerPoint} HP, {dprPerPointMin}–{dprPerPointMax} DPS)</span>
            </div>
          </div>

          {/* Card 2: Expected HP vs Actual HP */}
          <div className="field-card" style={{ padding: '8px 12px', background: '#0f172a', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted, #94a3b8)' }}>HP (Skutečné vs. Očekávané)</span>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: hpDiff === 0 ? '#4ade80' : Math.abs(hpDiff) <= expectedHp * 0.15 ? '#38bdf8' : hpDiff > 0 ? '#fbbf24' : '#f87171'
              }}>
                {hpDiff > 0 ? `+${hpDiff}` : hpDiff < 0 ? `${hpDiff}` : 'Shoda'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
              <strong style={{ fontSize: '1.25rem', color: '#f8fafc' }}>{actualHp}</strong>
              <span style={{ color: 'var(--muted, #94a3b8)' }}>/</span>
              <span style={{ fontSize: '1.05rem', color: '#93c5fd' }}>{expectedHp} oček.</span>
            </div>
          </div>

          {/* Card 3: Expected DPS vs Actual DPS */}
          <div className="field-card" style={{ padding: '8px 12px', background: '#0f172a', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted, #94a3b8)' }}>DPS (Skutečný vs. Očekávaný)</span>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: actualDpr >= expectedDprMin && actualDpr <= expectedDprMax ? '#4ade80' : actualDpr > expectedDprMax ? '#fbbf24' : '#f87171'
              }}>
                {actualDpr >= expectedDprMin && actualDpr <= expectedDprMax ? 'V normě' : actualDpr > expectedDprMax ? `+${actualDpr - expectedDprMax} nad` : `${actualDpr - expectedDprMin} pod`}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
              <strong style={{ fontSize: '1.25rem', color: '#f8fafc' }}>{actualDpr}</strong>
              <span style={{ color: 'var(--muted, #94a3b8)' }}>/</span>
              <span style={{ fontSize: '1.05rem', color: '#93c5fd' }}>{expectedDprMin}–{expectedDprMax} oček.</span>
            </div>
          </div>
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
            <button className="btn success" onClick={() => handleParse()}>Parse Statblock</button>
          </div>
        )}
        <div className="button-row" style={{ marginTop: '10px' }}>
          <button className="btn warning" onClick={() => markdownFileRef.current?.click()}>Import from .md</button>
          <input ref={markdownFileRef} className="hidden-input" type="file" accept=".md,.markdown,text/markdown,text/plain" aria-label="Import monster Markdown file" onChange={importMarkdownFile} />
        </div>
        {(markdownImportMessage || spellcastingImportMessage) && <div role="status">
          {markdownImportMessage && <p>{markdownImportMessage}</p>}
          {spellcastingImportMessage && <p>{spellcastingImportMessage}</p>}
        </div>}
      </section>

      {/* Main Grid */}
      <div className="monster-editor-columns" style={{ gap: '20px' }}>
        
        {/* Left Column: Core Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* General Attributes */}
          <fieldset style={{ background: '#1e1e24', border: '1px solid #2a2a35', borderRadius: '6px', padding: '20px' }}>
            <legend style={{ padding: '0 10px', color: '#60a5fa', fontWeight: 'bold' }}>Attributes & General</legend>
            <div className="monster-general-fields" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '15px' }}>
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
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>HP (Hit Points):</span>
                  <span style={{ fontSize: '0.78rem', color: '#93c5fd' }}>Očekáváno z bodů: {expectedHp}</span>
                </label>
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
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Expected DPR / DPS:</span>
                  <span style={{ fontSize: '0.78rem', color: '#93c5fd' }}>Očekáváno z bodů: {expectedDprMin}–{expectedDprMax}</span>
                </label>
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
                <label>Combat Role (Type):</label>
                <select value={combatType} onChange={e => setCombatType(e.target.value as MonsterCombatType)} title="Combat role/type">
                  <option value="monster">Monster (Default)</option>
                  <option value="spellcaster">Spellcaster</option>
                  <option value="elite">Elite</option>
                  <option value="leader">Leader</option>
                  <option value="ranged">Ranged</option>
                  <option value="controller">Controller</option>
                </select>
              </div>
              <div>
                <label>Status Flag:</label>
                <select value={flag} onChange={e => setFlag(e.target.value as MonsterFlag)} title="Active, Adapt, Inactive, or Unused in database and searches">
                  <option value="active">Active (Default)</option>
                  <option value="adapt">Adapt (Visible by default)</option>
                  <option value="inactive">Inactive</option>
                  <option value="unused">Unused</option>
                </select>
              </div>
              <div>
                <label>Size:</label>
                <select value={size} onChange={e => setSize(e.target.value)} title="Size category">
                  {['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label>Monster Groups / Categories:</label>
                {groups.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {groups.map(g => (
                      <span
                        key={g}
                        className="badge"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: 'var(--panel-subtle)', border: '1px solid var(--border)' }}
                      >
                        <span>{g}</span>
                        <button
                          type="button"
                          onClick={() => removeGroup(g)}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0, fontSize: '0.9rem', lineHeight: 1 }}
                          title={`Remove ${g}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    list="monster-group-list"
                    value={newGroupInput}
                    onChange={e => setNewGroupInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addGroup(newGroupInput);
                      }
                    }}
                    placeholder="Type group and press Add or Enter (comma separated for multiple)..."
                    title="Add one or more groups"
                    style={{ flex: 1 }}
                  />
                  <datalist id="monster-group-list">
                    {existingGroups.map(g => <option key={g} value={g} />)}
                  </datalist>
                  <button
                    type="button"
                    className="btn small"
                    onClick={() => addGroup(newGroupInput)}
                  >
                    + Add group
                  </button>
                </div>
              </div>
              <div style={{ gridColumn: 'span 2' }} onPaste={handleImagePaste}>
                <label>Image URL & Asset (Optional):</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="e.g. /images/monsters/monster.webp or https://..."
                    title="Image URL for statblock preview"
                    style={{ flex: 1, minWidth: '220px' }}
                  />
                  <button
                    type="button"
                    className="btn small purple"
                    onClick={openImageLibrary}
                    title="Browse existing images in public/images/monsters"
                  >
                    📁 Browse library
                  </button>
                  <button
                    type="button"
                    className="btn small"
                    onClick={() => imageFileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    title="Upload an image from your computer to public/images/monsters"
                  >
                    {isUploadingImage ? 'Uploading...' : '⬆ Upload file'}
                  </button>
                  <input
                    ref={imageFileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) handleImageUploadFile(file);
                    }}
                  />
                  {imageUrl && (
                    <button
                      type="button"
                      className="btn danger small"
                      onClick={() => setImageUrl('')}
                      title="Clear image"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '4px' }}>
                  💡 Tip: Můžeš také přímo sem vložit obrázek ze schránky (<strong>Ctrl+V</strong>) nebo vybrat z knihovny.
                </div>

                {imageUrl && (
                  <div style={{ marginTop: '12px', padding: '12px', background: 'var(--panel-subtle)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Fokusovaná oblast ořezu (Crop Focus): <strong style={{ color: 'var(--primary, #38bdf8)' }}>{imageFocus}</strong></span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Klikni na obrázek vlevo pro nastavení ohniska</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      {[
                        { label: 'Top (Hlava)', value: 'center top' },
                        { label: 'Upper 25%', value: '50% 25%' },
                        { label: 'Center', value: 'center center' },
                        { label: 'Lower 75%', value: '50% 75%' },
                        { label: 'Bottom', value: 'center bottom' },
                        { label: 'Left', value: 'left center' },
                        { label: 'Right', value: 'right center' }
                      ].map(preset => (
                        <button
                          key={preset.value}
                          type="button"
                          className={`btn small ${imageFocus === preset.value ? 'primary' : ''}`}
                          style={{ padding: '3px 8px', fontSize: '0.8rem' }}
                          onClick={() => setImageFocus(preset.value)}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '4px' }}>Celý obrázek (klikni pro nastavení fokusu):</div>
                        <div
                          style={{ position: 'relative', display: 'inline-block', cursor: 'crosshair', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden', maxHeight: '180px' }}
                          onClick={e => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
                            const y = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
                            setImageFocus(`${x}% ${y}%`);
                          }}
                          title="Kliknutím sem nastavíš střed ořezu"
                        >
                          <img
                            src={imageUrl}
                            alt="Full preview for focus"
                            style={{ maxHeight: '180px', maxWidth: '240px', objectFit: 'contain', display: 'block' }}
                            onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              left: imageFocus.includes('%') ? imageFocus.split(' ')[0] : imageFocus.includes('left') ? '15%' : imageFocus.includes('right') ? '85%' : '50%',
                              top: imageFocus.includes('%') ? (imageFocus.split(' ')[1] || '50%') : imageFocus.includes('top') ? '15%' : imageFocus.includes('bottom') ? '85%' : '50%',
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              border: '2px solid #ef4444',
                              background: 'rgba(239, 68, 68, 0.4)',
                              transform: 'translate(-50%, -50%)',
                              pointerEvents: 'none',
                              boxShadow: '0 0 6px rgba(0,0,0,0.8)'
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '4px' }}>Výsledný ořez (náhled v kartě):</div>
                        <div style={{ width: '220px', height: '140px', overflow: 'hidden', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--panel-strong)' }}>
                          <img
                            src={imageUrl}
                            alt="Crop preview"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: imageFocus, display: 'block' }}
                            onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </fieldset>

          {entityKind === 'monster' && <>
          {/* Ability Scores */}
          <fieldset style={{ background: '#1e1e24', border: '1px solid #2a2a35', borderRadius: '6px', padding: '20px' }}>
            <legend style={{ padding: '0 10px', color: '#60a5fa', fontWeight: 'bold' }}>Ability Scores</legend>
            <div className="monster-ability-fields" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '10px' }}>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', background: '#13131a', padding: '4px', borderRadius: '4px', border: '1px solid #2a2a35' }}>
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
                    <label>Caster Level (1-30):</label>
                    <NumberInput
                      type="number"
                      min={1}
                      max={30}
                      value={spellcastingLevel}
                      onChange={e => setSpellcastingLevel(Math.max(1, Math.min(30, Number(e.target.value))))}
                      title="Caster level score"
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h4 style={{ margin: '5px 0' }}>Spells by Level Slots:</h4>
                    {(() => {
                      const levelSlots = SPELL_SLOTS_TABLE[spellcastingLevel] || (spellcastingLevel > 20 ? SPELL_SLOTS_TABLE[20] : [0, 0, 0, 0, 0, 0, 0, 0, 0]);
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

                    {spellcastingLevel >= 21 && (
                      <div style={{ marginTop: '10px', borderTop: '1px solid #332644', paddingTop: '10px' }}>
                        <h4 style={{ margin: '5px 0 10px 0', color: '#c084fc' }}>Epic Spell Slots (Tiers 1–3):</h4>
                        {(() => {
                          const epicProg = epicSlotsForLevel(spellcastingLevel);
                          return [
                            { key: 'epic1', label: 'Epic Tier 1', progMax: epicProg['epic1'] || 0 },
                            { key: 'epic2', label: 'Epic Tier 2', progMax: epicProg['epic2'] || 0 },
                            { key: 'epic3', label: 'Epic Tier 3', progMax: epicProg['epic3'] || 0 }
                          ].map(({ key: levelKey, label, progMax }) => {
                            const currSlots = spellSlots[levelKey];
                            const max = currSlots?.max !== undefined ? currSlots.max : progMax;
                            if (max === 0 && (!currSlots?.spells || currSlots.spells.length === 0)) return null;
                            const list = currSlots?.spells || [];

                            return (
                              <div key={levelKey} style={{ border: '1px solid #4a2d68', padding: '10px', borderRadius: '4px', background: '#171123', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.9em' }}>
                                  <strong style={{ color: '#d8b4fe' }}>{label}</strong>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: '#a855f7', fontSize: '0.85em' }}>Slots:</span>
                                    <NumberInput
                                      type="number"
                                      min={0}
                                      max={10}
                                      value={max}
                                      onChange={e => {
                                        const newMax = Math.max(0, Number(e.target.value) || 0);
                                        setSpellSlots(prev => ({
                                          ...prev,
                                          [levelKey]: { ...(prev[levelKey] || { used: 0, spells: [] }), max: newMax }
                                        }));
                                      }}
                                      style={{ width: '60px' }}
                                    />
                                  </div>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                                  {list.map(s => (
                                    <span key={s} className="pill small" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#3b1d5c', border: '1px solid #6b21a8', color: '#f3e8ff' }}>
                                      {s}
                                      <button
                                        type="button"
                                        onClick={() => removeSpellFromLevel(levelKey, s)}
                                        style={{ border: 'none', background: 'transparent', color: '#f87171', cursor: 'pointer', padding: 0 }}
                                      >
                                        &times;
                                      </button>
                                    </span>
                                  ))}
                                  {list.length === 0 && <span style={{ color: '#888', fontSize: '0.85em' }}>No Epic spells added.</span>}
                                </div>
                                <SpellSearchInput
                                  spellDatabase={spellDatabase}
                                  onSelectSpell={name => addSpellToLevel(levelKey, name)}
                                  placeholder={`Add ${label} spell...`}
                                />
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
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
                            <div key={idx} style={{ minWidth: 0, fontSize: '0.85em', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                              <span><strong>{act.name}</strong> ({act.maxUses === 0 ? 'unlimited' : `${act.maxUses} uses`}){act.options?.length ? ` · ${act.options.length} shared options` : ''}</span>
                              <span style={{ minWidth: 0, color: '#888', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '300px' }}>{act.description}</span>
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

      {showImageLibrary && (
        <Modal>
          <div className="modal-card" style={{ maxWidth: '780px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div className="section-title-row" style={{ marginBottom: '12px' }}>
              <div>
                <h2>Knihovna obrázků monster</h2>
                <p>Vyber obrázek ze složky <code>public/images/monsters/</code> ({libraryImages.length} souborů)</p>
              </div>
              <button className="btn" onClick={() => setShowImageLibrary(false)}>Close</button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Filtrovat podle názvu obrázku..."
                value={librarySearch}
                onChange={e => setLibrarySearch(e.target.value)}
                style={{ width: '100%' }}
                autoFocus
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', padding: '4px' }}>
              {loadingImages ? (
                <p className="empty">Načítám obrázky...</p>
              ) : libraryImages.filter(img => !librarySearch || img.toLowerCase().includes(librarySearch.toLowerCase())).length === 0 ? (
                <p className="empty">Žádné obrázky nenalezeny.</p>
              ) : (
                libraryImages
                  .filter(img => !librarySearch || img.toLowerCase().includes(librarySearch.toLowerCase()))
                  .map(img => {
                    const url = `/images/monsters/${encodeURIComponent(img)}`;
                    const isSelected = imageUrl === url;
                    return (
                      <div
                        key={img}
                        onClick={() => {
                          setImageUrl(url);
                          setShowImageLibrary(false);
                        }}
                        style={{
                          border: isSelected ? '2px solid var(--primary, #38bdf8)' : '1px solid var(--border)',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          background: 'var(--panel-subtle)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'transform 0.15s, border-color 0.15s'
                        }}
                        title={img}
                      >
                        <div style={{ height: '110px', background: '#0f172a', overflow: 'hidden' }}>
                          <img
                            src={url}
                            alt={img}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        </div>
                        <div style={{ padding: '6px 8px', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isSelected ? 'var(--primary, #38bdf8)' : 'var(--text-main)', fontWeight: isSelected ? 600 : 'normal' }}>
                          {img}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </Modal>
      )}

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

// EpicActionModal Component
interface EpicActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  epicActionsText: string;
  onSave: (newText: string) => void;
}

function EpicActionModal({ isOpen, onClose, epicActionsText, onSave }: EpicActionModalProps) {
  const [activeTab, setActiveTab] = useState<'grid' | 'raw'>('grid');
  const [localActions, setLocalActions] = useState<MonsterEpicAction[]>([]);
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
      { name: 'Shared Epic Actions', maxUses: 2, used: 0, description: 'Choose one option. Both options spend from the same pool.', options: [
        { name: 'Arcane Lance', cost: '1 Power', maxUses: 0, used: 0, description: 'Make a spell attack.' },
        { name: 'Divine Command', cost: '3 Power', maxUses: 1, used: 0, resetOn: 'encounter' as const, description: 'Revive an ally. Usable once per encounter.' }
      ] }
    ];
    setLocalActions(examples);
    setLocalRawText(epicActionsToText(examples));
  }

  function handleAddRow() {
    const updated = [...localActions, { name: 'New Epic Action', maxUses: 1, used: 0, description: '' }];
    setLocalActions(updated);
    setLocalRawText(epicActionsToText(updated));
  }

  function handleRemoveRow(index: number) {
    const updated = localActions.filter((_, i) => i !== index);
    setLocalActions(updated);
    setLocalRawText(epicActionsToText(updated));
  }

  function handleUpdateRow(index: number, fields: Partial<MonsterEpicAction>) {
    const updated = localActions.map((act, i) => {
      if (i === index) {
        return { ...act, ...fields };
      }
      return act;
    });
    setLocalActions(updated);
    setLocalRawText(epicActionsToText(updated));
  }

  function updateOption(index: number, optionIndex: number, fields: Partial<MonsterEpicOption>) {
    handleUpdateRow(index, { options: (localActions[index].options || []).map((option, i) => i === optionIndex ? { ...option, ...fields } : option) });
  }

  function handleRawChange(val: string) {
    setLocalRawText(val);
    setLocalActions(parseEpicActionsText(val));
  }

  return (
    <Modal className="item-modal-backdrop">
      <div className="modal-card markdown-modal epic-editor-modal" style={{ width: 'min(980px, 100%)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div className="section-title-row" style={{ borderBottom: '1px solid #2a2a35', paddingBottom: '10px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#ec4899' }}>Epic / Mythic Actions Editor</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.9em', color: '#888' }}>
              Add options under an action to share its use pool. Each option can also have its own limit and recovery. Max Uses 0 means unlimited.
            </p>
          </div>
          <div className="button-row">
            <button type="button" className="btn small" onClick={handlePrefill} style={{ background: '#3b82f6', color: '#fff' }}>Prefill Example Table</button>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="button" className="btn success" onClick={handleSave}>Save & Close</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid #2a2a35', paddingBottom: '10px' }}>
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
              {localActions.length === 0 && <p>No epic actions. Add an action or prefill an example.</p>}
              {localActions.map((act, index) => (
                <div key={index} className="epic-editor-group">
                  <div className="epic-editor-fields">
                    <label>Name<input value={act.name} onChange={e => handleUpdateRow(index, { name: e.target.value })} title="Epic action name" /></label>
                    <label>Shared max uses<NumberInput value={act.maxUses} min={0} onChange={e => handleUpdateRow(index, { maxUses: Math.max(0, Number(e.target.value)) })} title="Epic action max uses" /></label>
                    <label>Pool recovery<select value={act.resetOn || 'turn'} title="Epic action recovery" onChange={e => handleUpdateRow(index, { resetOn: e.target.value as EpicActionReset })}>
                      <option value="turn">Monster turn</option><option value="encounter">Encounter start</option><option value="day">Long rest / manual</option><option value="rest">Rest / manual</option>
                    </select></label>
                  </div>
                  <label>Rules / group introduction<textarea value={act.description} onChange={e => handleUpdateRow(index, { description: e.target.value })} rows={3} title="Epic action description" /></label>
                  {(act.options || []).map((option, optionIndex) => (
                    <div key={optionIndex} className="epic-editor-option">
                      <div className="epic-editor-fields">
                        <label>Option name<input value={option.name} title="Epic option name" onChange={e => updateOption(index, optionIndex, { name: e.target.value })} /></label>
                        <label>Cost label<input value={option.cost || ''} title="Epic option cost" placeholder="e.g. 3 Divine Favor" onChange={e => updateOption(index, optionIndex, { cost: e.target.value })} /></label>
                        <label>Own max uses (0 = unlimited)<NumberInput value={option.maxUses} min={0} title="Epic option max uses" onChange={e => updateOption(index, optionIndex, { maxUses: Math.max(0, Number(e.target.value)) })} /></label>
                        <label>Own recovery<select value={option.resetOn || 'turn'} title="Epic option recovery" onChange={e => updateOption(index, optionIndex, { resetOn: e.target.value as EpicActionReset })}>
                          <option value="turn">Monster turn</option><option value="encounter">Encounter start</option><option value="day">Long rest / manual</option><option value="rest">Rest / manual</option>
                        </select></label>
                      </div>
                      <MarkdownEditor label={`Option rules ${index + 1}.${optionIndex + 1}`} value={option.description} onChange={description => updateOption(index, optionIndex, { description })} />
                      <button type="button" className="btn danger small" onClick={() => handleUpdateRow(index, { options: act.options!.filter((_, i) => i !== optionIndex) })}>Remove option</button>
                    </div>
                  ))}
                  <div className="button-row">
                    <button type="button" className="btn purple small" onClick={() => handleUpdateRow(index, { options: [...(act.options || []), { name: 'New option', cost: '', maxUses: 0, used: 0, resetOn: 'turn', description: '' }] })}>Add shared option</button>
                    <button type="button" className="btn danger small" onClick={() => handleRemoveRow(index)}>Delete action</button>
                  </div>
                </div>
              ))}

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
                Start each action with <strong>Name | MaxUses/recovery | Description</strong> (recovery: turn, encounter, day, rest). Add shared options as <strong>### Option — Cost (1/Encounter)</strong> followed by their Markdown rules. Use 0 for unlimited uses. Old numeric headers still work.
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
