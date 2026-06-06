import { ChangeEvent, FormEvent, useMemo, useRef, useState } from 'react';
import type { Character, ClientRole, GameAction, GameState } from '../shared/types';
import { CollapsiblePanel } from '../components/CollapsiblePanel';
import { MarkdownEditor, MarkdownRenderer } from '../components/Markdown';
import { parseMonsterMarkdown } from '../shared/monsterParser';

interface Props {
  state: GameState;
  role: ClientRole;
  submitAction: (action: GameAction) => Promise<unknown>;
  onBackToCombat: () => void;
}

type DatabaseKind = 'magic' | 'potion' | 'condition' | 'spell' | 'characters' | 'monster';

const DB_LABELS: Record<DatabaseKind, string> = {
  magic: 'Magic Items',
  potion: 'Potions',
  condition: 'Conditions',
  spell: 'Spells',
  characters: 'Player Characters',
  monster: 'Monsters'
};

export function DatabasesPage({ state, role, submitAction, onBackToCombat }: Props) {
  const isDM = role === 'dm';
  const visibleTabs: DatabaseKind[] = isDM
    ? ['magic', 'potion', 'condition', 'spell', 'characters', 'monster']
    : ['magic', 'potion', 'condition', 'spell', 'characters'];
  const [active, setActive] = useState<DatabaseKind>(visibleTabs[0]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const allFileInputRef = useRef<HTMLInputElement | null>(null);

  const items = itemsForKind(state, active);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(item => searchableText(item).includes(needle));
  }, [items, query]);

  const canEditCurrent = active === 'spell' ? isDM : isDM || active !== 'monster';
  const canRemoveCurrent = isDM && active !== 'characters';

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function exportDatabase(kind: DatabaseKind) {
    downloadJson(`dnd-${kind}-database.json`, {
      schemaVersion: state.schemaVersion,
      kind,
      items: itemsForKind(state, kind)
    });
  }

  function exportAll() {
    const payload = {
      schemaVersion: state.schemaVersion,
      exportedAt: new Date().toISOString(),
      monsterDatabase: isDM ? state.monsterDatabase : [],
      magicItemDatabase: state.magicItemDatabase || [],
      potionDatabase: state.potionDatabase || [],
      conditionDatabase: state.conditionDatabase || [],
      spellDatabase: state.spellDatabase || [],
      playerCharacters: state.characters.filter(character => character.type === 'player')
    };
    downloadJson('dnd-all-databases.json', payload);
  }

  async function importDatabase(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const parsed = JSON.parse(await file.text());
    const itemsToImport = parsed.items || parsed[databaseStateKey(active)] || parsed;
    await submitAction(importActionFor(active, itemsToImport));
  }

  async function importAll(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const parsed = JSON.parse(await file.text());
    await submitAction({ type: 'database.importAll', payload: { data: parsed.data || parsed } });
  }

  return (
    <div className="stack">
      <section className="section page-sticky-section">
        <div className="section-title-row">
          <div>
            <h2>Databases</h2>
            <p>Shared lookup data for sheets, inventory, conditions and combat prep.</p>
          </div>
          <div className="button-row">
            <button className="btn" onClick={onBackToCombat}>Back to Combat</button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="database-tabs">
          {visibleTabs.map(tab => (
            <button key={tab} className={`nav-btn ${active === tab ? 'active' : ''}`} onClick={() => { setActive(tab); setQuery(''); }}>
              {DB_LABELS[tab]}
            </button>
          ))}
        </div>
        <div className="database-toolbar">
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${DB_LABELS[active]}`} />
        </div>
      </section>

      <CollapsiblePanel title="Database actions" summary="Add entries, export backups and import DM database files.">
        <div className="button-row">
          <button className="btn" onClick={() => exportDatabase(active)}>Export this DB</button>
          <button className="btn" onClick={exportAll}>Export visible backup</button>
          {canEditCurrent && active !== 'characters' && <button className="btn success" onClick={openCreate}>Add {DB_LABELS[active].slice(0, -1)}</button>}
          {isDM && (
            <button
              className="btn warning"
              onClick={() => fileInputRef.current?.click()}
              disabled={active === 'characters'}
            >
              Import current DB
            </button>
          )}
          {isDM && <button className="btn warning" onClick={() => allFileInputRef.current?.click()}>Import all DBs</button>}
          {isDM && active === 'spell' && (
            <button className="btn purple" onClick={() => submitAction({ type: 'database.spell.importFromDataFolder' })}>
              Import from data/Spells
            </button>
          )}
          <input ref={fileInputRef} className="hidden-input" type="file" accept="application/json,.json" onChange={importDatabase} />
          <input ref={allFileInputRef} className="hidden-input" type="file" accept="application/json,.json" onChange={importAll} />
        </div>
      </CollapsiblePanel>

      {active === 'characters' ? (
        <CharacterDatabase
          key={active}
          characters={filtered as Character[]}
          isDM={isDM}
          submitAction={submitAction}
        />
      ) : (
        <DatabaseGrid
          key={active}
          kind={active}
          items={filtered}
          canEdit={canEditCurrent}
          canRemove={canRemoveCurrent}
          onEdit={item => { setEditing(item); setModalOpen(true); }}
          onRemove={id => submitAction(removeActionFor(active, id))}
        />
      )}

      {modalOpen && active !== 'characters' && (
        <DatabaseEditorModal
          kind={active}
          initial={editing}
          onClose={() => setModalOpen(false)}
          onSave={async item => {
            await submitAction(upsertActionFor(active, item));
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function itemsForKind(state: GameState, kind: DatabaseKind): Array<Record<string, unknown>> {
  if (kind === 'magic') return state.magicItemDatabase || [];
  if (kind === 'potion') return state.potionDatabase || [];
  if (kind === 'condition') return state.conditionDatabase || [];
  if (kind === 'spell') return state.spellDatabase || [];
  if (kind === 'monster') return state.monsterDatabase || [];
  return state.characters.filter(character => character.type === 'player') as unknown as Array<Record<string, unknown>>;
}

function searchableText(item: Record<string, unknown>) {
  return Object.values(item).join(' ').toLowerCase();
}

function databaseStateKey(kind: DatabaseKind) {
  if (kind === 'magic') return 'magicItemDatabase';
  if (kind === 'potion') return 'potionDatabase';
  if (kind === 'condition') return 'conditionDatabase';
  if (kind === 'spell') return 'spellDatabase';
  return 'monsterDatabase';
}

function upsertActionFor(kind: DatabaseKind, item: Record<string, unknown>): GameAction {
  if (kind === 'magic') return { type: 'database.magic.upsert', payload: { item } };
  if (kind === 'potion') return { type: 'database.potion.upsert', payload: { item } };
  if (kind === 'condition') return { type: 'database.condition.upsert', payload: { condition: item } };
  if (kind === 'spell') return { type: 'database.spell.upsert', payload: { spell: item } };
  return { type: 'database.monster.upsert', payload: { monster: item } };
}

function removeActionFor(kind: DatabaseKind, id: string): GameAction {
  if (kind === 'magic') return { type: 'database.magic.remove', payload: { id } };
  if (kind === 'potion') return { type: 'database.potion.remove', payload: { id } };
  if (kind === 'condition') return { type: 'database.condition.remove', payload: { id } };
  if (kind === 'spell') return { type: 'database.spell.remove', payload: { id } };
  return { type: 'database.monster.remove', payload: { id } };
}

function importActionFor(kind: DatabaseKind, items: unknown): GameAction {
  if (kind === 'magic') return { type: 'database.magic.import', payload: { items } };
  if (kind === 'potion') return { type: 'database.potion.import', payload: { items } };
  if (kind === 'condition') return { type: 'database.condition.import', payload: { items } };
  if (kind === 'spell') return { type: 'database.spell.import', payload: { items } };
  return { type: 'database.monster.import', payload: { items } };
}

function DatabaseGrid({
  kind,
  items,
  canEdit,
  canRemove,
  onEdit,
  onRemove
}: {
  kind: DatabaseKind;
  items: Array<Record<string, unknown>>;
  canEdit: boolean;
  canRemove: boolean;
  onEdit: (item: Record<string, unknown>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="database-grid">
      {items.length === 0 && <div className="section"><p className="empty">No entries found.</p></div>}
      {items.map((item, index) => (
        <article key={databaseCardKey(kind, item, index)} className="database-card">
          <div>
            <h3>{String(item.name || 'Unnamed')}</h3>
            <p>{summaryFor(kind, item)}</p>
          </div>
          {item.description || item.effect ? <MarkdownRenderer text={String(item.description || item.effect)} /> : null}
          <div className="button-row">
            {canEdit && <button className="btn small" onClick={() => onEdit(item)}>Edit</button>}
            {canRemove && <button className="btn danger small" onClick={() => onRemove(String(item.id))}>Remove</button>}
          </div>
        </article>
      ))}
    </section>
  );
}

function databaseCardKey(kind: DatabaseKind, item: Record<string, unknown>, index: number) {
  const id = item.id || item.importKey || item.name || index;
  return `${kind}:${String(id)}:${index}`;
}

function CharacterDatabase({
  characters,
  isDM,
  submitAction
}: {
  characters: Character[];
  isDM: boolean;
  submitAction: Props['submitAction'];
}) {
  return (
    <section className="database-grid">
      {characters.length === 0 && <div className="section"><p className="empty">No player characters.</p></div>}
      {characters.map(character => (
        <article key={character.id} className="database-card">
          <div className="section-title-row">
            <div>
              <h3>{character.name}</h3>
              <p>{character.activeInCombat === false ? 'Inactive in combat' : 'Active in combat'}</p>
            </div>
            <span className={`pill ${character.activeInCombat === false ? 'player' : 'dm'}`}>
              {character.activeInCombat === false ? 'Sheet only' : 'Roster'}
            </span>
          </div>
          <div className="stats-grid">
            <div className="stat"><span>HP</span><strong>{character.currentHp}/{character.maxHp}</strong></div>
            <div className="stat"><span>AC</span><strong>{character.ac}</strong></div>
            <div className="stat"><span>Spell level</span><strong>{character.spellcasterLevel || 0}</strong></div>
            <div className="stat"><span>Inventory</span><strong>{inventoryCount(character)}</strong></div>
          </div>
          <div className="button-row">
            {character.activeInCombat === false ? (
              <button className="btn success small" onClick={() => submitAction({ type: 'character.activateInCombat', payload: { characterId: character.id } })}>Activate in Combat</button>
            ) : (
              <button className="btn warning small" onClick={() => submitAction({ type: 'character.deactivateFromCombat', payload: { characterId: character.id } })}>Remove from Combat</button>
            )}
            {isDM && (
              <button
                className="btn danger small"
                onClick={() => {
                  if (window.confirm(`Permanently delete ${character.name}? This removes the saved sheet.`)) {
                    submitAction({ type: 'character.deleteSavedPlayer', payload: { characterId: character.id } });
                  }
                }}
              >
                Permanently Delete
              </button>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}

function DatabaseEditorModal({
  kind,
  initial,
  onClose,
  onSave
}: {
  kind: DatabaseKind;
  initial: Record<string, unknown> | null;
  onClose: () => void;
  onSave: (item: Record<string, unknown>) => Promise<unknown>;
}) {
  const [form, setForm] = useState<Record<string, string | boolean>>(() => ({
    id: String(initial?.id || ''),
    name: String(initial?.name || ''),
    description: String(initial?.description || ''),
    tags: Array.isArray(initial?.tags) ? (initial?.tags as string[]).join(', ') : String(initial?.tags || ''),
    source: String(initial?.source || ''),
    itemType: String(initial?.itemType || 'Wondrous item'),
    rarity: String(initial?.rarity || 'Common'),
    requiresAttunement: Boolean(initial?.requiresAttunement),
    effect: String(initial?.effect || ''),
    kind: String(initial?.kind || 'neutral'),
    hasLevels: Boolean(initial?.hasLevels),
    maxLevel: String(initial?.maxLevel || '0'),
    hasDice: Boolean(initial?.hasDice),
    defaultDiceCount: String(initial?.defaultDiceCount || '0'),
    defaultDiceSides: String(initial?.defaultDiceSides || '0'),
    defaultDamageType: String(initial?.defaultDamageType || ''),
    levelKey: String(initial?.levelKey || ''),
    levelLabel: String(initial?.levelLabel || 'Cantrip'),
    classes: Array.isArray(initial?.classes) ? (initial?.classes as string[]).join(', ') : String(initial?.classes || ''),
    school: String(initial?.school || ''),
    castingTime: String(initial?.castingTime || ''),
    range: String(initial?.range || ''),
    components: String(initial?.components || ''),
    duration: String(initial?.duration || ''),
    ritual: Boolean(initial?.ritual),
    page: String(initial?.page || ''),
    atHigherLevels: String(initial?.atHigherLevels || ''),
    importKey: String(initial?.importKey || ''),
    hp: String(initial?.hp || '10'),
    ac: String(initial?.ac || '10'),
    maxReactions: String(initial?.maxReactions || '1'),
    speed: String(initial?.speed || ''),
    stats: statsToText(initial?.stats),
    saves: String(initial?.saves || ''),
    skills: String(initial?.skills || ''),
    senses: String(initial?.senses || ''),
    languages: String(initial?.languages || ''),
    challenge: String(initial?.challenge || ''),
    proficiency: String(initial?.proficiency || ''),
    monsterType: String(initial?.type || ''),
    size: String(initial?.size || ''),
    initBonus: String(initial?.initBonus || '0'),
    maxPower: String(initial?.maxPower || '0'),
    currentPower: String((initial?.monsterAbilities as Record<string, unknown> | undefined)?.power && typeof (initial?.monsterAbilities as Record<string, unknown>).power === 'object'
      ? ((initial?.monsterAbilities as Record<string, Record<string, unknown>>).power?.current || 0)
      : '0'),
    powerEnabled: Boolean((initial?.monsterAbilities as Record<string, Record<string, unknown>> | undefined)?.power?.enabled || initial?.maxPower),
    powerName: String(initial?.powerName || (initial?.monsterAbilities as Record<string, Record<string, unknown>> | undefined)?.power?.name || 'Power'),
    defensiveFeatures: entriesToText(initial?.defensiveFeatures),
    features: entriesToText(initial?.features),
    actions: entriesToText(initial?.actions),
    bonusActions: entriesToText(initial?.bonusActions),
    reactions: entriesToText(initial?.reactions),
    legendaryActionEntries: entriesToText(initial?.legendaryActionEntries),
    lairActions: entriesToText(initial?.lairActions),
    mythicActions: entriesToText(initial?.mythicActions),
    hasLairActions: Boolean(initial?.hasLairActions),
    hasMythicActions: Boolean(initial?.hasMythicActions),
    legendaryEnabled: Boolean((initial?.monsterAbilities as Record<string, Record<string, unknown>> | undefined)?.legendaryActions?.enabled),
    legendaryMax: String((initial?.monsterAbilities as Record<string, Record<string, unknown>> | undefined)?.legendaryActions?.max || 0),
    epicEnabled: Boolean((initial?.monsterAbilities as Record<string, Record<string, unknown>> | undefined)?.epicActions?.enabled),
    epicActions: epicActionsToText((initial?.monsterAbilities as Record<string, Record<string, unknown>> | undefined)?.epicActions?.actions),
    spellcastingEnabled: Boolean((initial?.monsterAbilities as Record<string, Record<string, unknown>> | undefined)?.spellcasting?.enabled),
    spellSlots: spellSlotsToText((initial?.monsterAbilities as Record<string, Record<string, unknown>> | undefined)?.spellcasting?.spellSlots || (initial?.monsterAbilities as Record<string, unknown> | undefined)?.spellSlots),
    atWillSpells: listToText((initial?.monsterAbilities as Record<string, Record<string, unknown>> | undefined)?.spellcasting?.atWillSpells),
    perDaySpells: perDaySpellsToText((initial?.monsterAbilities as Record<string, Record<string, unknown>> | undefined)?.spellcasting?.perDaySpells || (initial?.monsterAbilities as Record<string, unknown> | undefined)?.perDaySpells),
    statblockPaste: ''
  }));

  function update(key: string, value: string | boolean) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const base = {
      id: form.id || undefined,
      name: String(form.name).trim(),
      description: String(form.description),
      tags: String(form.tags).split(',').map(tag => tag.trim()).filter(Boolean),
      source: String(form.source)
    };
    if (!base.name) return;
    if (kind === 'magic') {
      onSave({ ...base, itemType: form.itemType, rarity: form.rarity, requiresAttunement: Boolean(form.requiresAttunement), type: 'magic' });
    } else if (kind === 'potion') {
      onSave({ ...base, rarity: form.rarity, effect: form.effect, type: 'potion' });
    } else if (kind === 'condition') {
      onSave({
        ...base,
        kind: form.kind,
        hasLevels: Boolean(form.hasLevels),
        maxLevel: Number(form.maxLevel) || 0,
        hasDice: Boolean(form.hasDice),
        defaultDiceCount: Number(form.defaultDiceCount) || 0,
        defaultDiceSides: Number(form.defaultDiceSides) || 0,
        defaultDamageType: String(form.defaultDamageType || '')
      });
    } else if (kind === 'spell') {
      onSave({
        ...base,
        levelKey: form.levelKey,
        levelLabel: form.levelLabel,
        classes: String(form.classes).split(',').map(item => item.trim()).filter(Boolean),
        school: form.school,
        castingTime: form.castingTime,
        range: form.range,
        components: form.components,
        duration: form.duration,
        ritual: Boolean(form.ritual),
        page: form.page,
        atHigherLevels: form.atHigherLevels,
        importKey: form.importKey
      });
    } else {
      const stats = parseStatsText(String(form.stats));
      const spellSlots = parseSpellSlotsText(String(form.spellSlots));
      const atWillSpells = splitList(String(form.atWillSpells));
      const perDaySpells = parsePerDaySpellsText(String(form.perDaySpells));
      const defensiveFeatures = parseEntriesText(String(form.defensiveFeatures));
      const features = parseEntriesText(String(form.features));
      const actions = parseEntriesText(String(form.actions));
      const bonusActions = parseEntriesText(String(form.bonusActions));
      const reactions = parseEntriesText(String(form.reactions));
      const legendaryActionEntries = parseEntriesText(String(form.legendaryActionEntries));
      const lairActions = parseEntriesText(String(form.lairActions));
      const mythicActions = parseEntriesText(String(form.mythicActions));
      const epicActions = parseEpicActionsText(String(form.epicActions));
      const maxPower = Number(form.maxPower) || 0;
      onSave({
        ...base,
        hp: Number(form.hp) || 1,
        maxHp: Number(form.hp) || 1,
        ac: Number(form.ac) || 10,
        maxReactions: Number(form.maxReactions) || 1,
        speed: form.speed,
        stats,
        saves: form.saves,
        skills: form.skills,
        senses: form.senses,
        languages: form.languages,
        challenge: form.challenge,
        proficiency: form.proficiency,
        type: form.monsterType,
        size: form.size,
        initBonus: Number(form.initBonus) || 0,
        maxPower,
        powerName: form.powerName,
        defensiveFeatures,
        features,
        actions,
        bonusActions,
        reactions,
        legendaryActionEntries,
        lairActions,
        mythicActions,
        hasLairActions: Boolean(form.hasLairActions) || lairActions.length > 0,
        hasMythicActions: Boolean(form.hasMythicActions) || mythicActions.length > 0,
        monsterAbilities: {
          enabled: true,
          power: {
            enabled: Boolean(form.powerEnabled) || maxPower > 0,
            name: String(form.powerName || 'Power'),
            max: maxPower,
            current: Number(form.currentPower) || 0
          },
          spellcasting: {
            enabled: Boolean(form.spellcastingEnabled) || Object.keys(spellSlots).length > 0 || atWillSpells.length > 0 || perDaySpells.length > 0,
            spellcastingType: 'monster',
            spellSlots,
            atWillSpells,
            perDaySpells
          },
          spellSlots,
          perDaySpells,
          customFeatures: extractResourceFeatures([...defensiveFeatures, ...features, ...bonusActions]),
          legendaryActions: {
            enabled: Boolean(form.legendaryEnabled) || legendaryActionEntries.length > 0,
            max: Number(form.legendaryMax) || (legendaryActionEntries.length > 0 ? 3 : 0),
            used: 0
          },
          epicActions: {
            enabled: Boolean(form.epicEnabled) || epicActions.length > 0,
            actions: epicActions
          }
        }
      });
    }
  }

  function parsePastedMonster() {
    const parsed = parseMonsterMarkdown(String(form.statblockPaste || form.description || ''));
    setForm(current => ({
      ...current,
      id: String(current.id || ''),
      name: parsed.name,
      description: parsed.description || '',
      hp: String(parsed.hp || 10),
      ac: String(parsed.ac || 10),
      speed: parsed.speed || '',
      stats: statsToText(parsed.stats),
      saves: parsed.saves || '',
      skills: parsed.skills || '',
      senses: parsed.senses || '',
      languages: parsed.languages || '',
      challenge: parsed.challenge || '',
      proficiency: parsed.proficiency || '',
      monsterType: parsed.type || '',
      size: parsed.size || '',
      initBonus: String(parsed.initBonus || 0),
      defensiveFeatures: entriesToText(parsed.defensiveFeatures),
      features: entriesToText(parsed.features),
      actions: entriesToText(parsed.actions),
      bonusActions: entriesToText(parsed.bonusActions),
      reactions: entriesToText(parsed.reactions),
      legendaryActionEntries: entriesToText(parsed.legendaryActionEntries),
      lairActions: entriesToText(parsed.lairActions),
      mythicActions: entriesToText(parsed.mythicActions),
      hasLairActions: parsed.hasLairActions,
      hasMythicActions: parsed.hasMythicActions,
      legendaryEnabled: Boolean(parsed.monsterAbilities.legendaryActions?.enabled),
      legendaryMax: String(parsed.monsterAbilities.legendaryActions?.max || 0),
      spellcastingEnabled: Boolean(parsed.monsterAbilities.spellcasting?.enabled),
      spellSlots: spellSlotsToText(parsed.monsterAbilities.spellcasting?.spellSlots),
      atWillSpells: listToText(parsed.monsterAbilities.spellcasting?.atWillSpells),
      perDaySpells: perDaySpellsToText(parsed.monsterAbilities.spellcasting?.perDaySpells),
      statblockPaste: ''
    }));
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="section-title-row">
          <div>
            <h2>{initial ? 'Edit' : 'Add'} {DB_LABELS[kind]}</h2>
            <p>Saved entries are shared immediately through the server.</p>
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <form className="form-grid" onSubmit={submit}>
          <input value={String(form.name)} onChange={event => update('name', event.target.value)} placeholder="Name" />
          {kind === 'magic' && (
            <>
              <select value={String(form.itemType)} onChange={event => update('itemType', event.target.value)}>
                {['Wondrous item', 'Weapon', 'Armor', 'Ring', 'Rod', 'Staff', 'Wand', 'Other'].map(value => <option key={value} value={value}>{value}</option>)}
              </select>
              <RaritySelect value={String(form.rarity)} onChange={value => update('rarity', value)} />
              <label className="inline-check">
                <input type="checkbox" checked={Boolean(form.requiresAttunement)} onChange={event => update('requiresAttunement', event.target.checked)} />
                Requires attunement
              </label>
            </>
          )}
          {kind === 'potion' && (
            <>
              <RaritySelect value={String(form.rarity)} onChange={value => update('rarity', value)} />
              <input value={String(form.effect)} onChange={event => update('effect', event.target.value)} placeholder="Effect summary" />
            </>
          )}
          {kind === 'condition' && (
            <>
              <select value={String(form.kind)} onChange={event => update('kind', event.target.value)}>
                <option value="buff">Buff</option>
                <option value="debuff">Debuff</option>
                <option value="neutral">Neutral</option>
              </select>
              <label className="inline-check">
                <input type="checkbox" checked={Boolean(form.hasLevels)} onChange={event => update('hasLevels', event.target.checked)} />
                Has levels
              </label>
              <input value={String(form.maxLevel)} onChange={event => update('maxLevel', event.target.value)} type="number" min={0} placeholder="Max level" />
              <label className="inline-check">
                <input type="checkbox" checked={Boolean(form.hasDice)} onChange={event => update('hasDice', event.target.checked)} />
                Has dice damage
              </label>
              {Boolean(form.hasDice) && (
                <>
                  <input value={String(form.defaultDiceCount)} onChange={event => update('defaultDiceCount', event.target.value)} type="number" min={0} placeholder="Default dice count" />
                  <input value={String(form.defaultDiceSides)} onChange={event => update('defaultDiceSides', event.target.value)} type="number" min={0} placeholder="Default die sides" />
                  <input value={String(form.defaultDamageType)} onChange={event => update('defaultDamageType', event.target.value)} placeholder="Default damage type" />
                </>
              )}
            </>
          )}
          {kind === 'spell' && (
            <>
              <select value={String(form.levelLabel)} onChange={event => update('levelLabel', event.target.value)}>
                {['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', 'Tier 1 Epic', 'Tier 2 Epic', 'Tier 3 Epic', 'Hellfire Atrocity', 'Voidsong'].map(value => <option key={value} value={value}>{value}</option>)}
              </select>
              <input value={String(form.classes)} onChange={event => update('classes', event.target.value)} placeholder="Classes, comma separated" />
              <input value={String(form.school)} onChange={event => update('school', event.target.value)} placeholder="School" />
              <input value={String(form.castingTime)} onChange={event => update('castingTime', event.target.value)} placeholder="Casting time" />
              <input value={String(form.range)} onChange={event => update('range', event.target.value)} placeholder="Range" />
              <input value={String(form.components)} onChange={event => update('components', event.target.value)} placeholder="Components" />
              <input value={String(form.duration)} onChange={event => update('duration', event.target.value)} placeholder="Duration" />
              <input value={String(form.page)} onChange={event => update('page', event.target.value)} placeholder="Page" />
              <input value={String(form.atHigherLevels)} onChange={event => update('atHigherLevels', event.target.value)} placeholder="At higher levels" />
              <label className="inline-check">
                <input type="checkbox" checked={Boolean(form.ritual)} onChange={event => update('ritual', event.target.checked)} />
                Ritual
              </label>
            </>
          )}
          {kind === 'monster' && (
            <>
              <div className="form-wide monster-import-box">
                <MarkdownEditor
                  value={String(form.statblockPaste)}
                  onChange={value => update('statblockPaste', value)}
                  placeholder="Paste a Notion / Markdown statblock here, then parse it into editable fields."
                  label="Monster statblock import"
                />
                <button type="button" className="btn purple" onClick={parsePastedMonster}>Parse statblock</button>
              </div>
              <input value={String(form.hp)} onChange={event => update('hp', event.target.value)} type="number" min={1} placeholder="HP" />
              <input value={String(form.ac)} onChange={event => update('ac', event.target.value)} type="number" min={1} placeholder="AC" />
              <input value={String(form.maxReactions)} onChange={event => update('maxReactions', event.target.value)} type="number" min={0} placeholder="Reactions per round" />
              <input value={String(form.speed)} onChange={event => update('speed', event.target.value)} placeholder="Speed" />
              <input value={String(form.stats)} onChange={event => update('stats', event.target.value)} placeholder="Stats: Str 10, Dex 14, Con 12, Int 10, Wis 14, Cha 13" />
              <input value={String(form.saves)} onChange={event => update('saves', event.target.value)} placeholder="Saving throws" />
              <input value={String(form.skills)} onChange={event => update('skills', event.target.value)} placeholder="Skills" />
              <input value={String(form.senses)} onChange={event => update('senses', event.target.value)} placeholder="Senses" />
              <input value={String(form.languages)} onChange={event => update('languages', event.target.value)} placeholder="Languages" />
              <input value={String(form.challenge)} onChange={event => update('challenge', event.target.value)} placeholder="Challenge" />
              <input value={String(form.proficiency)} onChange={event => update('proficiency', event.target.value)} placeholder="Proficiency" />
              <input value={String(form.monsterType)} onChange={event => update('monsterType', event.target.value)} placeholder="Type" />
              <input value={String(form.size)} onChange={event => update('size', event.target.value)} placeholder="Size" />
              <input value={String(form.initBonus)} onChange={event => update('initBonus', event.target.value)} type="number" placeholder="Initiative bonus" />
              <label className="inline-check">
                <input type="checkbox" checked={Boolean(form.powerEnabled)} onChange={event => update('powerEnabled', event.target.checked)} />
                Power resource
              </label>
              <input value={String(form.maxPower)} onChange={event => update('maxPower', event.target.value)} type="number" min={0} placeholder="Max power" />
              <input value={String(form.currentPower)} onChange={event => update('currentPower', event.target.value)} type="number" min={0} placeholder="Starting power" />
              <input value={String(form.powerName)} onChange={event => update('powerName', event.target.value)} placeholder="Power name" />
              <label className="inline-check">
                <input type="checkbox" checked={Boolean(form.legendaryEnabled)} onChange={event => update('legendaryEnabled', event.target.checked)} />
                Legendary actions
              </label>
              <input value={String(form.legendaryMax)} onChange={event => update('legendaryMax', event.target.value)} type="number" min={0} placeholder="Legendary actions per round" />
              <label className="inline-check">
                <input type="checkbox" checked={Boolean(form.hasLairActions)} onChange={event => update('hasLairActions', event.target.checked)} />
                Has lair actions
              </label>
              <label className="inline-check">
                <input type="checkbox" checked={Boolean(form.hasMythicActions)} onChange={event => update('hasMythicActions', event.target.checked)} />
                Has mythic actions
              </label>
              <label className="inline-check">
                <input type="checkbox" checked={Boolean(form.spellcastingEnabled)} onChange={event => update('spellcastingEnabled', event.target.checked)} />
                Spellcasting
              </label>
              <input value={String(form.spellSlots)} onChange={event => update('spellSlots', event.target.value)} placeholder="Spell slots, e.g. 1:4, 2:3, 3:at will" />
              <input value={String(form.atWillSpells)} onChange={event => update('atWillSpells', event.target.value)} placeholder="At will spells, comma separated" />
              <input value={String(form.perDaySpells)} onChange={event => update('perDaySpells', event.target.value)} placeholder="Per day spells: Counterspell | 3, Teleport | 1" />
              <label className="inline-check">
                <input type="checkbox" checked={Boolean(form.epicEnabled)} onChange={event => update('epicEnabled', event.target.checked)} />
                Epic actions
              </label>
              <input value={String(form.epicActions)} onChange={event => update('epicActions', event.target.value)} placeholder="Epic actions: Swipe | 2 | markdown text" />
              <div className="form-wide monster-editor-columns">
                <MonsterEntryEditor label="Defensive features" value={String(form.defensiveFeatures)} onChange={value => update('defensiveFeatures', value)} />
                <MonsterEntryEditor label="Features" value={String(form.features)} onChange={value => update('features', value)} />
                <MonsterEntryEditor label="Actions" value={String(form.actions)} onChange={value => update('actions', value)} />
                <MonsterEntryEditor label="Bonus actions" value={String(form.bonusActions)} onChange={value => update('bonusActions', value)} />
                <MonsterEntryEditor label="Reactions" value={String(form.reactions)} onChange={value => update('reactions', value)} />
                <MonsterEntryEditor label="Legendary action descriptions" value={String(form.legendaryActionEntries)} onChange={value => update('legendaryActionEntries', value)} />
                <MonsterEntryEditor label="Lair actions" value={String(form.lairActions)} onChange={value => update('lairActions', value)} />
                <MonsterEntryEditor label="Mythic actions" value={String(form.mythicActions)} onChange={value => update('mythicActions', value)} />
              </div>
            </>
          )}
          <input value={String(form.tags)} onChange={event => update('tags', event.target.value)} placeholder="Tags, comma separated" />
          <input value={String(form.source)} onChange={event => update('source', event.target.value)} placeholder="Source" />
          <div className="form-wide">
            <MarkdownEditor
              value={String(form.description)}
              onChange={value => update('description', value)}
              placeholder="Description / statblock / notes"
              label={`${DB_LABELS[kind]} description`}
            />
          </div>
          <button className="btn success">Save</button>
        </form>
      </div>
    </div>
  );
}

function MonsterEntryEditor({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="monster-entry-editor">
      <MarkdownEditor value={value} onChange={onChange} placeholder={`**${label}.** Markdown description`} label={label} />
    </div>
  );
}

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

function parseEntriesText(value: string) {
  return value
    .split(/\n{2,}/)
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => {
      const titleMatch = block.match(/^\*\*([^*]+?)\.?\*\*/);
      const name = titleMatch?.[1]?.trim() || block.split('\n')[0].replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
      return { name: name || 'Entry', description: block };
    });
}

function statsToText(value: unknown) {
  const stats = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const pairs = [
    ['Str', stats.strength],
    ['Dex', stats.dexterity],
    ['Con', stats.constitution],
    ['Int', stats.intelligence],
    ['Wis', stats.wisdom],
    ['Cha', stats.charisma]
  ];
  if (!pairs.some(([, score]) => score !== undefined && score !== null)) return '';
  return pairs.map(([label, score]) => `${label} ${Number(score) || 10}`).join(', ');
}

function parseStatsText(value: string) {
  const stats = { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };
  const mapping: Record<string, keyof typeof stats> = {
    str: 'strength',
    strength: 'strength',
    dex: 'dexterity',
    dexterity: 'dexterity',
    con: 'constitution',
    constitution: 'constitution',
    int: 'intelligence',
    intelligence: 'intelligence',
    wis: 'wisdom',
    wisdom: 'wisdom',
    cha: 'charisma',
    charisma: 'charisma'
  };
  for (const match of value.matchAll(/\b(str(?:ength)?|dex(?:terity)?|con(?:stitution)?|int(?:elligence)?|wis(?:dom)?|cha(?:risma)?)\b\s*[:=]?\s*(\d{1,2})/gi)) {
    const key = mapping[match[1].toLowerCase()];
    if (key) stats[key] = Math.max(1, Math.min(30, Number(match[2]) || 10));
  }
  return stats;
}

function spellSlotsToText(value: unknown) {
  const slots = value && typeof value === 'object' ? value as Record<string, Record<string, unknown>> : {};
  return Object.entries(slots)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([level, slot]) => `${level}:${slot.atWill ? 'at will' : Number(slot.max) || 0}`)
    .join(', ');
}

function parseSpellSlotsText(value: string) {
  const slots: Record<string, { max: number; used: number; atWill?: boolean }> = {};
  value.split(/[,;\n]+/).forEach(part => {
    const match = part.trim().match(/^(\w+)\s*[:=]\s*(at\s*will|\d+)/i);
    if (!match) return;
    const level = match[1].trim();
    const atWill = /at\s*will/i.test(match[2]);
    slots[level] = { max: atWill ? 0 : Number(match[2]) || 0, used: 0, atWill };
  });
  return slots;
}

function listToText(value: unknown) {
  return Array.isArray(value) ? value.join(', ') : '';
}

function splitList(value: string) {
  return value.split(/[,;\n]+/).map(item => item.trim()).filter(Boolean);
}

function perDaySpellsToText(value: unknown) {
  if (!Array.isArray(value)) return '';
  return value.map(item => {
    const spell = item as Record<string, unknown>;
    return `${spell.name || 'Spell'} | ${Number(spell.maxUses) || 1}`;
  }).join('\n');
}

function parsePerDaySpellsText(value: string) {
  return value
    .split(/\n|;/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [name, uses] = line.split('|').map(part => part.trim());
      return { name: name || 'Spell', maxUses: Number(uses) || 1, used: 0 };
    });
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

function RaritySelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select value={value} onChange={event => onChange(event.target.value)}>
      {['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact'].map(rarity => <option key={rarity} value={rarity}>{rarity}</option>)}
    </select>
  );
}

function summaryFor(kind: DatabaseKind, item: Record<string, unknown>) {
  if (kind === 'magic') return `${item.itemType || 'Magic item'} · ${item.rarity || 'Unknown rarity'}${item.requiresAttunement ? ' · Attunement' : ''}`;
  if (kind === 'potion') return `${item.rarity || 'Unknown rarity'} · ${item.effect || 'Potion'}`;
  if (kind === 'condition') {
    const dice = item.hasDice ? ` · ${item.defaultDiceCount || 1}d${item.defaultDiceSides || 4}${item.defaultDamageType ? ` ${item.defaultDamageType}` : ''}` : '';
    return `${item.kind || 'neutral'}${item.hasLevels ? ` · levels 1-${item.maxLevel || 6}` : ''}${dice}`;
  }
  if (kind === 'spell') return `${item.levelLabel || 'Spell'} · ${item.school || 'Unknown school'} · ${Array.isArray(item.classes) ? item.classes.join(', ') : item.classes || 'No classes'}`;
  return `HP ${item.hp || item.maxHp || '-'} · AC ${item.ac || '-'} · Init ${item.initBonus || 0}`;
}

function inventoryCount(character: Character) {
  const inv = character.inventory;
  return [
    inv.potions.length,
    inv.scrolls.length,
    inv.generalItems.length,
    inv.magicItems.length
  ].reduce((sum, count) => sum + count, 0);
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
