import { NumberInput } from '../components/NumberInput';
import { useMemo, useState } from 'react';
import type { Encounter, EncounterDifficultySettings, EncounterMonsterEntry, GameAction, GameState, MonsterDatabaseEntry } from '../shared/types';
import { SearchPicker } from '../components/SearchPicker';
import { MarkdownEditor, MarkdownRenderer } from '../components/Markdown';
import { Modal } from '../components/Modal';
import { MonsterDetail, monsterDatabaseEntryToPreviewCharacter } from './MonstersPage';

interface Props {
  state: GameState;
  submitAction: (action: GameAction) => Promise<unknown>;
  onCreateMonster: () => void;
  onOpenCombat: () => void;
}

const emptyEncounter = (): Encounter => ({
  id: '', name: 'New encounter', groupId: null, notes: '', monsters: [], reserve: [], updatedAt: ''
});

export function EncounterPlannerPage({ state, submitAction, onCreateMonster, onOpenCombat }: Props) {
  const [draft, setDraft] = useState<Encounter>(emptyEncounter);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [target, setTarget] = useState<'monsters' | 'reserve'>('monsters');
  const [selectedMonster, setSelectedMonster] = useState<MonsterDatabaseEntry | null>(null);
  const [preview, setPreview] = useState<MonsterDatabaseEntry | null>(null);
  const [groupName, setGroupName] = useState('');
  const monsters = state.monsterDatabase || [];
  const matching = useMemo(() => matchMonsters(monsters, search, groupFilter), [monsters, search, groupFilter]);
  const selected = selectedMonster && matching.some(monster => monster.id === selectedMonster.id) ? selectedMonster : matching[0] || null;
  const groups = state.encounterGroups || [];
  const encounterMath = calculateMath(draft, monsters, state.encounterDifficulty);
  const monsterGroups = useMemo(() => Array.from(new Set(monsters.map(monster => monster.group || '').filter(Boolean))).sort(), [monsters]);

  function openEncounter(encounter: Encounter) {
    setDraft({ ...encounter, monsters: [...encounter.monsters], reserve: [...encounter.reserve] });
    setSearch('');
    setSelectedMonster(null);
  }

  function addMonster() {
    if (!selected) return;
    setDraft(current => ({ ...current, [target]: addEntry(current[target], selected.id) }));
  }

  function updateEntry(list: 'monsters' | 'reserve', id: string, quantity: number) {
    setDraft(current => ({ ...current, [list]: current[list].map(entry => entry.id === id ? { ...entry, quantity: Math.max(1, Math.min(99, quantity || 1)) } : entry) }));
  }

  function removeEntry(list: 'monsters' | 'reserve', id: string) {
    setDraft(current => ({ ...current, [list]: current[list].filter(entry => entry.id !== id) }));
  }

  async function save() {
    if (!draft.name.trim()) return;
    const id = draft.id || `encounter-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const encounter = { ...draft, id, name: draft.name.trim(), updatedAt: new Date().toISOString() };
    await submitAction({ type: 'encounter.upsert', page: 'encounters', payload: { encounter } });
    setDraft(current => ({ ...current, id }));
  }

  async function importToCombat() {
    if (!draft.id) { await save(); return; }
    await submitAction({ type: 'encounter.importToCombat', page: 'encounters', payload: { encounterId: draft.id } });
    onOpenCombat();
  }

  return (
    <div className="stack encounter-page">
      <section className="section page-sticky-section">
        <div className="section-title-row">
          <div><h2>Encounter Planner</h2><p>One point is roughly {state.encounterDifficulty.hpPerPoint || 150} HP and {state.encounterDifficulty.dprPerPointMin || 80}–{state.encounterDifficulty.dprPerPointMax || 100} expected DPR.</p></div>
          <div className="button-row">
            <button className="btn purple" onClick={onCreateMonster}>Create monster</button>
            <button className="btn" onClick={() => setDraft(emptyEncounter())}>New encounter</button>
            <button className="btn success" onClick={save}>Save encounter</button>
            <button className="btn warning" disabled={!draft.id || draft.monsters.length === 0} onClick={importToCombat}>Import to Combat</button>
          </div>
        </div>
        <EncounterDifficultyBar points={encounterMath.points} settings={state.encounterDifficulty} />
        <div className="encounter-metrics">
          <Metric label="Entered HP" value={encounterMath.totalHp} />
          <Metric label="HP from points" value={encounterMath.pointHp.toLocaleString()} />
          <Metric label="Entered DPR" value={encounterMath.totalDpr.toFixed(1)} />
          <Metric label="DPR from points" value={`${encounterMath.pointDprMin.toFixed(0)}–${encounterMath.pointDprMax.toFixed(0)}`} />
          <Metric label="Point total" value={encounterMath.points.toFixed(1)} />
        </div>
      </section>

      <div className="encounter-layout">
        <section className="section stack">
          <div className="monster-picker-panel">
            <div className="section-title-row"><div><h2>Add monsters</h2><p>Build the encounter first; details stay below.</p></div><select value={target} onChange={event => setTarget(event.target.value as 'monsters' | 'reserve')} aria-label="Monster destination"><option value="monsters">Encounter</option><option value="reserve">Monster reserve</option></select></div>
            <div className="monster-filter-row">
              <select value={groupFilter} onChange={event => { setGroupFilter(event.target.value); setSelectedMonster(null); }} aria-label="Filter monster group"><option value="">All monster groups</option>{monsterGroups.map(group => <option key={group} value={group}>{group}</option>)}</select>
              <span>{matching.length} monsters</span>
            </div>
            <SearchPicker items={matching} query={search} onQueryChange={setSearch} selectedId={selected?.id || ''} onSelect={setSelectedMonster} placeholder="Search within filtered monsters" getId={monster => monster.id} getLabel={monster => monster.name} getMeta={monster => `HP ${monster.hp} · ${monster.encounterPoints || 0.1} pt · DPR ${monster.dpr || 0}${monster.group ? ` · ${monster.group}` : ''}`} />
            <button className="btn success encounter-add-button" onClick={addMonster} disabled={!selected}>Add {selected ? selected.name : 'monster'} to {target === 'monsters' ? 'encounter' : 'reserve'}</button>
          </div>
          <div className="form-grid">
            <input value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} placeholder="Encounter name" />
            <select value={draft.groupId || ''} onChange={event => setDraft(current => ({ ...current, groupId: event.target.value || null }))}>
              <option value="">No story arc</option>
              {groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </div>
          <EncounterList title="Encounter monsters" entries={draft.monsters} database={monsters} onQuantity={(id, quantity) => updateEntry('monsters', id, quantity)} onRemove={id => removeEntry('monsters', id)} onPreview={setPreview} />
          <EncounterList title="Monster reserve" entries={draft.reserve} database={monsters} onQuantity={(id, quantity) => updateEntry('reserve', id, quantity)} onRemove={id => removeEntry('reserve', id)} onPreview={setPreview} />
          <details className="encounter-notes">
            <summary>Encounter notes</summary>
            <MarkdownEditor value={draft.notes} onChange={notes => setDraft(current => ({ ...current, notes }))} label="Notes" placeholder="Tactics, scene cues, terrain, triggers…" />
          </details>
        </section>

        <aside className="section encounter-library">
          <div className="section-title-row"><div><h2>Saved encounters</h2><p>Organize encounters by story arc.</p></div></div>
          <form className="button-row" onSubmit={async event => { event.preventDefault(); if (!groupName.trim()) return; await submitAction({ type: 'encounter.group.upsert', page: 'encounters', payload: { group: { name: groupName.trim() } } }); setGroupName(''); }}>
            <input value={groupName} onChange={event => setGroupName(event.target.value)} placeholder="New story arc" />
            <button className="btn purple">Add arc</button>
          </form>
          {groups.map(group => <div className="story-arc" key={group.id}><div><strong>{group.name}</strong><button className="text-button danger-text" onClick={() => submitAction({ type: 'encounter.group.remove', page: 'encounters', payload: { id: group.id } })}>Remove</button></div><SavedEncounters encounters={(state.encounters || []).filter(encounter => encounter.groupId === group.id)} database={monsters} settings={state.encounterDifficulty} onOpen={openEncounter} onRemove={async encounter => { await submitAction({ type: 'encounter.remove', page: 'encounters', payload: { id: encounter.id } }); if (draft.id === encounter.id) setDraft(emptyEncounter()); }} /></div>)}
          <div className="story-arc"><strong>Ungrouped</strong><SavedEncounters encounters={(state.encounters || []).filter(encounter => !encounter.groupId)} database={monsters} settings={state.encounterDifficulty} onOpen={openEncounter} onRemove={async encounter => { await submitAction({ type: 'encounter.remove', page: 'encounters', payload: { id: encounter.id } }); if (draft.id === encounter.id) setDraft(emptyEncounter()); }} /></div>
        </aside>
      </div>
      {preview && <Modal><div className="modal-card monster-preview-modal"><div className="section-title-row"><div><h2>{preview.name}</h2><p>Monster database preview</p></div><button className="btn" onClick={() => setPreview(null)}>Close</button></div><MonsterDetail monster={monsterDatabaseEntryToPreviewCharacter(preview)} /></div></Modal>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="field-card"><span>{label}</span><strong>{value}</strong></div>; }

function EncounterDifficultyBar({ points, settings }: { points: number; settings: EncounterDifficultySettings }) {
  const level = points <= settings.easyMax ? 'Easy' : points < settings.hardMin ? 'Medium' : 'Hard';
  const status = level.toLowerCase();
  const maximum = Math.max(settings.barMaximum || 20, settings.hardMin, points);
  const easyStop = (settings.easyMax / maximum) * 100;
  const mediumStop = (settings.mediumMax / maximum) * 100;
  return <div className={`encounter-difficulty difficulty-${status}`}>
    <div className="difficulty-title"><strong>{level} encounter</strong><span>{points.toFixed(1)} points</span></div>
    <div className="difficulty-track" aria-label={`Encounter difficulty: ${level}`} style={{ background: `linear-gradient(90deg, rgba(34,197,94,.34) 0 ${easyStop}%, rgba(245,158,11,.34) ${easyStop}% ${mediumStop}%, rgba(239,68,68,.34) ${mediumStop}%)` }}><span className="difficulty-position" style={{ left: `${Math.min(100, (points / maximum) * 100)}%` }} /></div>
    <div className="difficulty-labels" style={{ gridTemplateColumns: `${easyStop}% ${mediumStop - easyStop}% auto` }}><span className="easy-marker">Easy ≤ {settings.easyMax}</span><span className="medium-marker">Medium {settings.easyMax + 1}–{settings.mediumMax}</span><span className="hard-marker">Hard ≥ {settings.hardMin}</span></div>
  </div>;
}

function addEntry(entries: EncounterMonsterEntry[], monsterId: string): EncounterMonsterEntry[] {
  const existing = entries.find(entry => entry.monsterId === monsterId);
  if (existing) return entries.map(entry => entry.id === existing.id ? { ...entry, quantity: entry.quantity + 1 } : entry);
  return [...entries, { id: `encounter-entry-${Date.now()}-${Math.random().toString(16).slice(2)}`, monsterId, quantity: 1 }];
}

function EncounterList({ title, entries, database, onQuantity, onRemove, onPreview }: { title: string; entries: EncounterMonsterEntry[]; database: MonsterDatabaseEntry[]; onQuantity: (id: string, value: number) => void; onRemove: (id: string) => void; onPreview: (monster: MonsterDatabaseEntry) => void }) {
  return <div className="encounter-list"><h3>{title}</h3>{entries.length === 0 && <p className="empty">Nothing added yet.</p>}{entries.map(entry => { const monster = database.find(item => item.id === entry.monsterId); if (!monster) return <p className="warning-text" key={entry.id}>A removed monster reference is waiting to be removed.</p>; return <div className="encounter-entry" key={entry.id}><button className="name-button" onClick={() => onPreview(monster)}>{monster.name}</button><span>HP {monster.hp} · {monster.encounterPoints || 0.1} pt · DPR {monster.dpr || 0}</span><label>Qty <NumberInput type="number" min="1" max="99" value={entry.quantity} onChange={event => onQuantity(entry.id, Number(event.target.value))} /></label><button className="btn danger small" onClick={() => onRemove(entry.id)}>Remove</button></div>; })}</div>;
}

function SavedEncounters({ encounters, database, settings, onOpen, onRemove }: { encounters: Encounter[]; database: MonsterDatabaseEntry[]; settings: EncounterDifficultySettings; onOpen: (encounter: Encounter) => void; onRemove: (encounter: Encounter) => void }) {
  if (!encounters.length) return <p className="empty">No encounters.</p>;
  return <div className="saved-encounters">{encounters.map(encounter => { const math = calculateMath(encounter, database, settings); return <div className="saved-encounter-row" key={encounter.id}><button className="saved-encounter" onClick={() => onOpen(encounter)}><strong>{encounter.name}</strong><span>{math.points.toFixed(1)} pt · {math.totalHp} HP · {math.totalDpr.toFixed(0)} DPR · {encounter.monsters.reduce((sum, entry) => sum + entry.quantity, 0)} monsters</span></button><button className="btn danger small" onClick={() => { if (window.confirm(`Delete encounter \"${encounter.name}\"?`)) onRemove(encounter); }}>Delete</button></div>; })}</div>;
}

function calculateMath(encounter: Encounter, database: MonsterDatabaseEntry[], settings: EncounterDifficultySettings) {
  const actual = encounter.monsters.reduce((sum, entry) => { const monster = database.find(item => item.id === entry.monsterId); if (!monster) return sum; const quantity = entry.quantity || 1; return { totalHp: sum.totalHp + Number(monster.hp || monster.maxHp || 0) * quantity, totalDpr: sum.totalDpr + Number(monster.dpr || 0) * quantity, points: sum.points + Number(monster.encounterPoints || 0.1) * quantity }; }, { totalHp: 0, totalDpr: 0, points: 0 });
  return { ...actual, pointHp: actual.points * (settings.hpPerPoint || 150), pointDprMin: actual.points * (settings.dprPerPointMin || 80), pointDprMax: actual.points * (settings.dprPerPointMax || 100) };
}

function matchMonsters(monsters: MonsterDatabaseEntry[], query: string, groupFilter: string) {
  const value = query.trim().toLowerCase();
  return monsters.filter(monster => (!groupFilter || monster.group === groupFilter) && (!value || monster.name.toLowerCase().includes(value)));
}
