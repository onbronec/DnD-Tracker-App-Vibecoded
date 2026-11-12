import { NumberInput } from '../components/NumberInput';
import { useEffect, useMemo, useState } from 'react';
import type { Encounter, EncounterDifficultySettings, EncounterMonsterEntry, EncounterStatus, GameAction, GameState, MonsterDatabaseEntry } from '../shared/types';
import { SearchPicker } from '../components/SearchPicker';
import { MarkdownEditor, MarkdownRenderer } from '../components/Markdown';
import { Modal } from '../components/Modal';
import { MonsterDetail, monsterDatabaseEntryToPreviewCharacter } from './MonstersPage';
import { monsterRoleClass } from '../shared/defaults';

interface Props {
  state: GameState;
  submitAction: (action: GameAction) => Promise<unknown>;
  onCreateMonster: () => void;
  onOpenMonsterEditor?: (monsterId: string) => void;
  onOpenCombat: () => void;
  selectedEncounterId?: string | null;
  onSelectEncounterId?: (id: string | null) => void;
}

export const ENCOUNTER_NOTES_TEMPLATE = `# Shrnutí

Nápad nebo obraz kolem kterého je fight postavený. Může obsahovat i extra popis.

---

# Potřebné prvky encounteru

Seznam prvků které musí být present aby encounter mohl fungovat; klíčové pokud ho kvůli improvizaci chci přesunout jinam

- a
- b
- c

---

# Možné scénáře

Brainstorming situací kde/kdy by mohlo dojít k fightu

1. a
2. b
3. c

---

# Speciální pravidla, pasti a hazardy

Reference všech game mechanik vymyšlených nebo nezapamatovaných; hlavně DCs damage a bonusy

- a
- b
- c

---

# Battlefield Layout

Popisuje kde kdo začíná (zhruba) + potřebné terrain pieces + potřebné miniatury

---

# Possible Acceleration

Něco ke spuštění pokud fight je moc jednoduchý / něco co se spustí samo, ale pak mít připravenou jednu navíc

---

# Stakes / problem control

Co se stane pokud fight nepůjde, kdo nebo co je at stake - například nějaké NPC dorazí a pomůže hráčům, ale riskuván jeho osud

---

# Loot

Jaký loot hráči mohou získat

---`;

const emptyEncounter = (): Encounter => ({
  id: '', name: 'New encounter', groupId: null, status: 'active', notes: ENCOUNTER_NOTES_TEMPLATE, monsters: [], reserve: [], updatedAt: ''
});

export function EncounterPlannerPage({ state, submitAction, onCreateMonster, onOpenMonsterEditor, onOpenCombat, selectedEncounterId, onSelectEncounterId }: Props) {
  const [draft, setDraft] = useState<Encounter>(() => {
    if (selectedEncounterId) {
      const existing = (state.encounters || []).find(item => item.id === selectedEncounterId);
      if (existing) {
        return {
          ...existing,
          status: existing.status || 'active',
          monsters: existing.monsters.map(entry => ({ ...entry, groupCount: Math.max(1, Math.min(entry.quantity || 1, Number(entry.groupCount) || 1)) })),
          reserve: existing.reserve.map(entry => ({ ...entry, groupCount: Math.max(1, Math.min(entry.quantity || 1, Number(entry.groupCount) || 1)) }))
        };
      }
    }
    return emptyEncounter();
  });

  useEffect(() => {
    if (!selectedEncounterId) return;
    const existing = (state.encounters || []).find(item => item.id === selectedEncounterId);
    if (existing && existing.id !== draft.id) {
      setDraft({
        ...existing,
        status: existing.status || 'active',
        monsters: existing.monsters.map(entry => ({ ...entry, groupCount: Math.max(1, Math.min(entry.quantity || 1, Number(entry.groupCount) || 1)) })),
        reserve: existing.reserve.map(entry => ({ ...entry, groupCount: Math.max(1, Math.min(entry.quantity || 1, Number(entry.groupCount) || 1)) }))
      });
    }
  }, [selectedEncounterId, state.encounters]);
  const [editingNotes, setEditingNotes] = useState(false);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [target, setTarget] = useState<'monsters' | 'reserve'>('monsters');
  const [selectedMonster, setSelectedMonster] = useState<MonsterDatabaseEntry | null>(null);
  const [addQuantity, setAddQuantity] = useState(1);
  const [addGroupCount, setAddGroupCount] = useState(1);
  const [preview, setPreview] = useState<MonsterDatabaseEntry | null>(null);
  const [groupName, setGroupName] = useState('');
  const monsters = state.monsterDatabase || [];
  const matching = useMemo(() => matchMonsters(monsters, search, groupFilter, roleFilter), [monsters, search, groupFilter, roleFilter]);
  const selected = selectedMonster && matching.some(monster => monster.id === selectedMonster.id) ? selectedMonster : matching[0] || null;
  const groups = state.encounterGroups || [];
  const encounterMath = calculateMath(draft, monsters, state.encounterDifficulty);
  const monsterGroups = useMemo(() => Array.from(new Set(monsters.flatMap(monster => {
    const mGroups = Array.isArray(monster.groups) && monster.groups.length ? monster.groups : (monster.group ? [monster.group] : []);
    return mGroups.map(g => String(g || '').trim()).filter(Boolean);
  }))).sort(), [monsters]);

  function openEncounter(encounter: Encounter) {
    setDraft({
      ...encounter,
      status: encounter.status || 'active',
      monsters: encounter.monsters.map(entry => ({ ...entry, groupCount: Math.max(1, Math.min(entry.quantity || 1, Number(entry.groupCount) || 1)) })),
      reserve: encounter.reserve.map(entry => ({ ...entry, groupCount: Math.max(1, Math.min(entry.quantity || 1, Number(entry.groupCount) || 1)) }))
    });
    onSelectEncounterId?.(encounter.id);
    setEditingNotes(false);
    setSearch('');
    setSelectedMonster(null);
  }

  function addMonster(asSeparateGroup = false) {
    if (!selected) return;
    const qty = Math.max(1, Math.min(99, Number(addQuantity) || 1));
    const grp = Math.max(1, Math.min(qty, Number(addGroupCount) || 1));
    setDraft(current => ({ ...current, [target]: addEntry(current[target], selected.id, qty, grp, asSeparateGroup) }));
  }

  function updateEntryQuantity(list: 'monsters' | 'reserve', id: string, quantity: number) {
    const nextQty = Math.max(1, Math.min(99, quantity || 1));
    setDraft(current => ({
      ...current,
      [list]: current[list].map(entry => {
        if (entry.id !== id) return entry;
        const currentGroups = Math.max(1, Number(entry.groupCount) || 1);
        return {
          ...entry,
          quantity: nextQty,
          groupCount: Math.min(nextQty, currentGroups)
        };
      })
    }));
  }

  function updateEntryGroups(list: 'monsters' | 'reserve', id: string, groupCount: number) {
    setDraft(current => ({
      ...current,
      [list]: current[list].map(entry => {
        if (entry.id !== id) return entry;
        const qty = Math.max(1, Number(entry.quantity) || 1);
        return {
          ...entry,
          groupCount: Math.max(1, Math.min(qty, groupCount || 1))
        };
      })
    }));
  }

  function splitEntryGroup(list: 'monsters' | 'reserve', id: string) {
    setDraft(current => {
      const idx = current[list].findIndex(entry => entry.id === id);
      if (idx === -1) return current;
      const entry = current[list][idx];
      if ((entry.quantity || 1) <= 1) return current;
      const firstQty = Math.ceil(entry.quantity / 2);
      const secondQty = entry.quantity - firstQty;
      const nextList = [...current[list]];
      nextList.splice(
        idx,
        1,
        { ...entry, quantity: firstQty, groupCount: 1 },
        {
          id: `encounter-entry-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          monsterId: entry.monsterId,
          quantity: secondQty,
          groupCount: 1
        }
      );
      return { ...current, [list]: nextList };
    });
  }

  function removeEntry(list: 'monsters' | 'reserve', id: string) {
    setDraft(current => ({ ...current, [list]: current[list].filter(entry => entry.id !== id) }));
  }

  async function save(): Promise<string | null> {
    if (!draft.name.trim()) return null;
    const id = draft.id || `encounter-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const encounter: Encounter = { ...draft, id, name: draft.name.trim(), status: draft.status || 'active', updatedAt: new Date().toISOString() };
    await submitAction({ type: 'encounter.upsert', page: 'encounters', payload: { encounter } });
    setDraft(current => ({ ...current, id, status: encounter.status }));
    onSelectEncounterId?.(id);
    return id;
  }

  function downloadMarkdownFile(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function extractSummarySection(notes: string): string {
    if (!notes) return '';
    const match = notes.match(/#\s*Shrnutí\s*\n([\s\S]*?)(?=\n#|\n---|$)/i);
    if (match) return match[1].trim();
    return notes.split('\n---')[0].trim();
  }

  async function handleExportNotes() {
    const monsterLines = draft.monsters.map(entry => {
      const m = monsters.find(item => item.id === entry.monsterId);
      const role = m?.combatType || 'monster';
      return `- ${entry.quantity}x **${m?.name || 'Unknown'}** [class: ${role}] · HP ${m?.hp || 1} · AC ${m?.ac || 10} · DPR ${m?.dpr || 0}`;
    });

    const reserveLines = draft.reserve.map(entry => {
      const m = monsters.find(item => item.id === entry.monsterId);
      const role = m?.combatType || 'monster';
      return `- ${entry.quantity}x **${m?.name || 'Unknown'}** [class: ${role}] · HP ${m?.hp || 1} · AC ${m?.ac || 10}`;
    });

    const content = `# ${draft.name}

**Difficulty Points:** ${encounterMath.points.toFixed(1)} pt | **Total HP:** ${encounterMath.totalHp} | **Total DPR:** ${encounterMath.totalDpr.toFixed(0)}

## Monsters
${monsterLines.length > 0 ? monsterLines.join('\n') : '_None_'}

${reserveLines.length > 0 ? `## Reserve\n${reserveLines.join('\n')}\n` : ''}
---

${draft.notes || ENCOUNTER_NOTES_TEMPLATE}
`;

    const filename = `${(draft.name.trim() || 'Encounter').replace(/[^a-zA-Z0-9_\u00C0-\u017F]+/g, '_')}_notes.md`;
    let copied = false;
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(content);
        copied = true;
      } catch {
        copied = false;
      }
    }
    downloadMarkdownFile(filename, content);
    alert(copied ? `Poznámky encounteru byly zkopírovány do schránky (Notion ready) a staženy jako ${filename}` : `Poznámky encounteru byly staženy jako ${filename}`);
  }

  async function handleExportSummary() {
    const summaryText = extractSummarySection(draft.notes);
    const monsterLines = draft.monsters.map(entry => {
      const m = monsters.find(item => item.id === entry.monsterId);
      const combatRole = m?.combatType || 'monster';
      return `- ${entry.quantity}x **${m?.name || 'Monster'}** [class: ${combatRole}]`;
    });

    const content = `# ${draft.name} - Summary

## Shrnutí
${summaryText || '_Žádné shrnutí._'}

## Seznam monster
${monsterLines.length > 0 ? monsterLines.join('\n') : '_Žádná monstra v encounteru._'}
`;

    const filename = `${(draft.name.trim() || 'Encounter').replace(/[^a-zA-Z0-9_\u00C0-\u017F]+/g, '_')}_summary.md`;
    let copied = false;
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(content);
        copied = true;
      } catch {
        copied = false;
      }
    }
    downloadMarkdownFile(filename, content);
    alert(copied ? `Shrnutí encounteru bylo zkopírováno do schránky a staženo jako ${filename}` : `Shrnutí encounteru bylo staženo jako ${filename}`);
  }

  async function mutateMonster(targetList: 'monsters' | 'reserve', entryId: string, monsterId: string) {
    const original = monsters.find(m => m.id === monsterId);
    if (!original) return;
    const mutatedMonsterId = `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const mutateList = (list: EncounterMonsterEntry[]) => {
      const idx = list.findIndex(e => e.id === entryId);
      if (idx >= 0) {
        const entry = list[idx];
        if (entry.quantity > 1) {
          const nextQty = entry.quantity - 1;
          const nextGroupCount = Math.min(nextQty, entry.groupCount || 1);
          const updatedEntry = { ...entry, quantity: nextQty, groupCount: nextGroupCount };
          const newEntry: EncounterMonsterEntry = {
            id: `encounter-entry-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            monsterId: mutatedMonsterId,
            quantity: 1,
            groupCount: 1,
            ...(entry.groupName ? { groupName: `${entry.groupName} (Mutated)` } : {})
          };
          const next = [...list];
          next[idx] = updatedEntry;
          next.splice(idx + 1, 0, newEntry);
          return next;
        } else {
          const next = [...list];
          next[idx] = { ...entry, monsterId: mutatedMonsterId };
          return next;
        }
      }
      return list;
    };

    const updatedMonsters = targetList === 'monsters' ? mutateList(draft.monsters) : draft.monsters;
    const updatedReserve = targetList === 'reserve' ? mutateList(draft.reserve) : draft.reserve;
    const updatedDraft: Encounter = {
      ...draft,
      id: draft.id || `encounter-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      monsters: updatedMonsters,
      reserve: updatedReserve,
      updatedAt: new Date().toISOString()
    };
    setDraft(updatedDraft);
    onSelectEncounterId?.(updatedDraft.id);

    await submitAction({
      type: 'encounter.mutateMonster',
      page: 'encounters',
      payload: {
        encounterId: updatedDraft.id,
        entryId,
        targetList,
        monsterId,
        mutatedMonsterId,
        encounter: updatedDraft
      }
    });

    if (onOpenMonsterEditor) {
      onOpenMonsterEditor(mutatedMonsterId);
    }
  }

  async function editMonster(monsterId: string) {
    let currentId = draft.id;
    if (!currentId && draft.name.trim()) {
      currentId = (await save()) || undefined;
    } else if (draft.name.trim()) {
      await save();
    }
    if (currentId) {
      onSelectEncounterId?.(currentId);
    }
    onOpenMonsterEditor?.(monsterId);
  }

  async function removeEncounter(encounter: Encounter) {
    await submitAction({ type: 'encounter.remove', page: 'encounters', payload: { id: encounter.id } });
    if (draft.id === encounter.id) setDraft(emptyEncounter());
  }

  async function removeGroup(groupId: string) {
    await submitAction({ type: 'encounter.group.remove', page: 'encounters', payload: { id: groupId } });
  }

  async function importToCombat() {
    const id = await save();
    if (!id) return;
    await submitAction({ type: 'encounter.importToCombat', page: 'encounters', payload: { encounterId: id } });
    onOpenCombat();
  }

  return (
    <div className="stack encounter-page">
      <section className="section page-sticky-section">
        <div className="section-title-row">
          <div><h2>Encounter Planner</h2><p>One point is roughly {state.encounterDifficulty.hpPerPoint || 150} HP and {state.encounterDifficulty.dprPerPointMin || 80}–{state.encounterDifficulty.dprPerPointMax || 100} expected DPR.</p></div>
          <div className="button-row" style={{ flexWrap: 'wrap' }}>
            <button className="btn purple" onClick={onCreateMonster}>Create monster</button>
            <button className="btn" onClick={() => { setDraft(emptyEncounter()); onSelectEncounterId?.(null); setEditingNotes(false); }}>New encounter</button>
            <button className="btn success" onClick={save}>Save encounter</button>
            <button className="btn" onClick={handleExportNotes} title="Export Notion ready .md to clipboard and file">Export notes</button>
            <button className="btn" onClick={handleExportSummary} title="Export summary and monster classes to clipboard and file">Export summary</button>
            <button className="btn warning" disabled={!draft.name.trim() || draft.monsters.length === 0} onClick={importToCombat}>Import to Combat</button>
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
              <select value={roleFilter} onChange={event => { setRoleFilter(event.target.value); setSelectedMonster(null); }} aria-label="Filter combat role">
                <option value="">All combat roles</option>
                <option value="monster">Monster</option>
                <option value="spellcaster">Spellcaster</option>
                <option value="elite">Elite</option>
                <option value="leader">Leader</option>
                <option value="ranged">Ranged</option>
                <option value="controller">Controller</option>
              </select>
              <span>{matching.length} active monsters</span>
            </div>
            <SearchPicker items={matching} query={search} onQueryChange={setSearch} selectedId={selected?.id || ''} onSelect={setSelectedMonster} placeholder="Search within filtered monsters" getId={monster => monster.id} getLabel={monster => monster.name} getMeta={monster => {
              const groupsStr = monster.groups?.length ? monster.groups.join(', ') : (monster.group || '');
              return `Role: ${monster.combatType || 'monster'} · HP ${monster.hp} · ${monster.encounterPoints || 0.1} pt · DPR ${monster.dpr || 0}${groupsStr ? ` · ${groupsStr}` : ''}`;
            }} />
            <div className="button-row">
              <label className="inline-check">
                Qty
                <NumberInput
                  type="number"
                  min={1}
                  max={99}
                  value={addQuantity}
                  aria-label="Add quantity"
                  onChange={event => {
                    const nextQty = Math.max(1, Math.min(99, Number(event.target.value) || 1));
                    setAddQuantity(nextQty);
                    setAddGroupCount(current => Math.min(nextQty, Math.max(1, current)));
                  }}
                />
              </label>
              <label className="inline-check" title="Number of shared-initiative groups for these monsters (1 = all roll together, equal to Qty = roll individually)">
                Groups
                <NumberInput
                  type="number"
                  min={1}
                  max={Math.max(1, addQuantity)}
                  value={addGroupCount}
                  disabled={addQuantity <= 1 || selected?.entityKind === 'nonMonster'}
                  aria-label="Add groups"
                  onChange={event => setAddGroupCount(Math.max(1, Math.min(addQuantity, Number(event.target.value) || 1)))}
                />
              </label>
              <button className="btn success encounter-add-button" onClick={() => addMonster(false)} disabled={!selected}>
                Add {selected ? selected.name : 'monster'} to {target === 'monsters' ? 'encounter' : 'reserve'}
              </button>
              {selected && draft[target].some(entry => entry.monsterId === selected.id) && (
                <button className="btn purple small" onClick={() => addMonster(true)} title="Add as a separate initiative group row">
                  + Separate group
                </button>
              )}
            </div>
          </div>
          <div className="form-grid encounter-meta-grid" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
            <input
              value={draft.name}
              onChange={event => setDraft(current => ({ ...current, name: event.target.value }))}
              placeholder="Encounter name"
              aria-label="Encounter name"
            />
            <select
              value={draft.groupId || ''}
              onChange={event => setDraft(current => ({ ...current, groupId: event.target.value || null }))}
              aria-label="Story arc"
            >
              <option value="">No story arc</option>
              {groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
            <select
              value={draft.status || 'active'}
              onChange={event => setDraft(current => ({ ...current, status: event.target.value as EncounterStatus }))}
              aria-label="Encounter status"
            >
              <option value="active">Active (Default)</option>
              <option value="done">Done</option>
              <option value="unused">Unused</option>
            </select>
          </div>
          <EncounterList
            title="Encounter monsters"
            entries={draft.monsters}
            database={monsters}
            onQuantity={(id, quantity) => updateEntryQuantity('monsters', id, quantity)}
            onGroups={(id, groupCount) => updateEntryGroups('monsters', id, groupCount)}
            onSplit={id => splitEntryGroup('monsters', id)}
            onEdit={id => editMonster(id)}
            onMutate={(entryId, monsterId) => mutateMonster('monsters', entryId, monsterId)}
            onRemove={id => removeEntry('monsters', id)}
            onPreview={setPreview}
          />
          <EncounterList
            title="Monster reserve"
            entries={draft.reserve}
            database={monsters}
            onQuantity={(id, quantity) => updateEntryQuantity('reserve', id, quantity)}
            onGroups={(id, groupCount) => updateEntryGroups('reserve', id, groupCount)}
            onSplit={id => splitEntryGroup('reserve', id)}
            onEdit={id => editMonster(id)}
            onMutate={(entryId, monsterId) => mutateMonster('reserve', entryId, monsterId)}
            onRemove={id => removeEntry('reserve', id)}
            onPreview={setPreview}
          />
          <details className="encounter-notes" open>
            <summary>Encounter notes</summary>
            <div style={{ display: 'flex', gap: '8px', margin: '8px 0', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                className={`btn small ${editingNotes ? 'success' : ''}`}
                onClick={() => setEditingNotes(current => !current)}
              >
                {editingNotes ? 'Done editing' : 'Edit notes'}
              </button>
              <button className="btn small" onClick={handleExportNotes}>Export notes (Notion)</button>
              <button className="btn small" onClick={handleExportSummary}>Export summary</button>
              {!draft.notes && !editingNotes && (
                <button
                  className="btn small"
                  onClick={() => {
                    setDraft(c => ({ ...c, notes: ENCOUNTER_NOTES_TEMPLATE }));
                    setEditingNotes(true);
                  }}
                >
                  Insert Template
                </button>
              )}
            </div>
            {editingNotes ? (
              <MarkdownEditor
                value={draft.notes}
                onChange={notes => setDraft(current => ({ ...current, notes }))}
                label="Notes"
                placeholder="Tactics, scene cues, terrain, triggers…"
              />
            ) : (
              <div
                className="encounter-notes-display"
                style={{
                  background: '#0b1120',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '14px 18px',
                  minHeight: '80px',
                  marginTop: '8px'
                }}
              >
                {draft.notes ? (
                  <MarkdownRenderer text={draft.notes} />
                ) : (
                  <p className="empty" style={{ margin: 0 }}>
                    No encounter notes yet. Click <strong>Edit notes</strong> to add tactics, cues, and triggers.
                  </p>
                )}
              </div>
            )}
          </details>
        </section>

        <aside className="section encounter-library">
          <div className="section-title-row">
            <div>
              <h2>Saved encounters</h2>
              <p>Organize encounters by story arc.</p>
            </div>
          </div>
          <form className="button-row" onSubmit={async event => {
            event.preventDefault();
            if (!groupName.trim()) return;
            await submitAction({ type: 'encounter.group.upsert', page: 'encounters', payload: { group: { name: groupName.trim() } } });
            setGroupName('');
          }}>
            <input value={groupName} onChange={event => setGroupName(event.target.value)} placeholder="New story arc" />
            <button className="btn purple">Add arc</button>
          </form>

          {/* Regular user story arcs */}
          {groups.filter(g => g.name.trim().toLowerCase() !== 'unused').map(group => {
            const arcEncounters = (state.encounters || []).filter(e => e.groupId === group.id && e.status !== 'unused');
            const activeList = arcEncounters.filter(e => (e.status || 'active') === 'active');
            const doneList = arcEncounters.filter(e => e.status === 'done');

            if (activeList.length === 0 && doneList.length > 0) {
              return (
                <details className="story-arc story-arc-details" key={group.id}>
                  <summary className="story-arc-summary">
                    <span>
                      <strong>{group.name}</strong>
                      <span className="type-pill" style={{ marginLeft: '8px', opacity: 0.8 }}>All done ({doneList.length})</span>
                    </span>
                    <button
                      className="text-button danger-text"
                      onClick={e => { e.stopPropagation(); removeGroup(group.id); }}
                    >
                      Remove
                    </button>
                  </summary>
                  <div style={{ marginTop: '8px' }}>
                    <SavedEncounters
                      encounters={doneList}
                      database={monsters}
                      settings={state.encounterDifficulty}
                      onOpen={openEncounter}
                      onRemove={removeEncounter}
                    />
                  </div>
                </details>
              );
            }

            return (
              <div className="story-arc" key={group.id}>
                <div className="story-arc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{group.name}</strong>
                  <button className="text-button danger-text" onClick={() => removeGroup(group.id)}>Remove</button>
                </div>
                <SavedEncounters
                  encounters={activeList}
                  database={monsters}
                  settings={state.encounterDifficulty}
                  onOpen={openEncounter}
                  onRemove={removeEncounter}
                />
                {doneList.length > 0 && (
                  <details className="done-encounters-details" style={{ marginTop: '8px' }}>
                    <summary style={{ cursor: 'pointer', color: 'var(--muted, #94a3b8)', fontSize: '0.85rem' }}>
                      Done encounters ({doneList.length})
                    </summary>
                    <div style={{ marginTop: '6px' }}>
                      <SavedEncounters
                        encounters={doneList}
                        database={monsters}
                        settings={state.encounterDifficulty}
                        onOpen={openEncounter}
                        onRemove={removeEncounter}
                      />
                    </div>
                  </details>
                )}
              </div>
            );
          })}

          {/* Ungrouped encounters */}
          {(() => {
            const ungrouped = (state.encounters || []).filter(e => !e.groupId && e.status !== 'unused');
            const activeList = ungrouped.filter(e => (e.status || 'active') === 'active');
            const doneList = ungrouped.filter(e => e.status === 'done');

            if (activeList.length === 0 && doneList.length > 0) {
              return (
                <details className="story-arc story-arc-details">
                  <summary className="story-arc-summary">
                    <span>
                      <strong>Ungrouped</strong>
                      <span className="type-pill" style={{ marginLeft: '8px', opacity: 0.8 }}>All done ({doneList.length})</span>
                    </span>
                  </summary>
                  <div style={{ marginTop: '8px' }}>
                    <SavedEncounters
                      encounters={doneList}
                      database={monsters}
                      settings={state.encounterDifficulty}
                      onOpen={openEncounter}
                      onRemove={removeEncounter}
                    />
                  </div>
                </details>
              );
            }

            return (
              <div className="story-arc">
                <div className="story-arc-header">
                  <strong>Ungrouped</strong>
                </div>
                <SavedEncounters
                  encounters={activeList}
                  database={monsters}
                  settings={state.encounterDifficulty}
                  onOpen={openEncounter}
                  onRemove={removeEncounter}
                />
                {doneList.length > 0 && (
                  <details className="done-encounters-details" style={{ marginTop: '8px' }}>
                    <summary style={{ cursor: 'pointer', color: 'var(--muted, #94a3b8)', fontSize: '0.85rem' }}>
                      Done encounters ({doneList.length})
                    </summary>
                    <div style={{ marginTop: '6px' }}>
                      <SavedEncounters
                        encounters={doneList}
                        database={monsters}
                        settings={state.encounterDifficulty}
                        onOpen={openEncounter}
                        onRemove={removeEncounter}
                      />
                    </div>
                  </details>
                )}
              </div>
            );
          })()}

          {/* Dedicated "Unused" arc - always visible, auto-contains all unused encounters */}
          {(() => {
            const unusedList = (state.encounters || []).filter(e => e.status === 'unused');
            return (
              <div className="story-arc unused-arc">
                <div className="story-arc-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong>Unused</strong>
                  <span className="type-pill" style={{ fontSize: '0.75rem' }}>{unusedList.length}</span>
                </div>
                <SavedEncounters
                  encounters={unusedList}
                  database={monsters}
                  settings={state.encounterDifficulty}
                  onOpen={openEncounter}
                  onRemove={removeEncounter}
                />
              </div>
            );
          })()}
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

function addEntry(entries: EncounterMonsterEntry[], monsterId: string, quantity = 1, groupCount = 1, asSeparateGroup = false): EncounterMonsterEntry[] {
  if (!asSeparateGroup) {
    const existing = entries.find(entry => entry.monsterId === monsterId);
    if (existing) {
      const nextQty = Math.min(99, existing.quantity + quantity);
      const nextGroups = groupCount > 1 ? Math.min(nextQty, groupCount) : Math.min(nextQty, Math.max(1, Number(existing.groupCount) || 1));
      return entries.map(entry => entry.id === existing.id ? { ...entry, quantity: nextQty, groupCount: nextGroups } : entry);
    }
  }
  return [
    ...entries,
    {
      id: `encounter-entry-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      monsterId,
      quantity,
      groupCount: Math.max(1, Math.min(quantity, groupCount || 1))
    }
  ];
}

function formatGroupSummary(quantity: number, groupCount: number, isObject: boolean): string {
  if (isObject) return 'Fixed init';
  if (quantity <= 1) return 'Single init';
  const groups = Math.max(1, Math.min(quantity, groupCount || 1));
  if (groups === 1) return `1 group (${quantity}× shared init)`;
  if (groups >= quantity) return `${quantity} individual rolls`;
  const perGroup = Math.ceil(quantity / groups);
  return `${groups} groups (~${perGroup}×/group)`;
}

function EncounterList({
  title,
  entries,
  database,
  onQuantity,
  onGroups,
  onSplit,
  onEdit,
  onMutate,
  onRemove,
  onPreview
}: {
  title: string;
  entries: EncounterMonsterEntry[];
  database: MonsterDatabaseEntry[];
  onQuantity: (id: string, value: number) => void;
  onGroups: (id: string, value: number) => void;
  onSplit: (id: string) => void;
  onEdit?: (monsterId: string) => void;
  onMutate?: (entryId: string, monsterId: string) => void;
  onRemove: (id: string) => void;
  onPreview: (monster: MonsterDatabaseEntry) => void;
}) {
  return (
    <div className="encounter-list">
      <h3>{title}</h3>
      {entries.length === 0 && <p className="empty">Nothing added yet.</p>}
      {entries.map(entry => {
        const monster = database.find(item => item.id === entry.monsterId);
        if (!monster) return <p className="warning-text" key={entry.id}>A removed monster reference is waiting to be removed.</p>;
        const isObject = monster.entityKind === 'nonMonster';
        const groups = Math.max(1, Math.min(entry.quantity, Number(entry.groupCount) || 1));
        return (
          <div className="encounter-entry" key={entry.id}>
            <div>
              <button className="name-button" onClick={() => onPreview(monster)}>{monster.name}</button>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px', alignItems: 'center' }}>
                <span className="type-pill">{formatGroupSummary(entry.quantity, groups, isObject)}</span>
                <span className={`type-pill role-pill ${monsterRoleClass(monster.combatType)}`}>
                  {monster.combatType || 'monster'}
                </span>
                <span
                  className="type-pill"
                  style={{
                    textTransform: 'capitalize',
                    ...(monster.flag === 'inactive'
                      ? { color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' }
                      : monster.flag === 'unused'
                      ? { color: '#94a3b8', borderColor: 'rgba(148, 163, 184, 0.4)' }
                      : monster.flag === 'adapt'
                      ? { color: '#2dd4bf', borderColor: 'rgba(45, 212, 191, 0.4)' }
                      : { color: '#4ade80', borderColor: 'rgba(74, 222, 128, 0.4)' })
                  }}
                >
                  {monster.flag || 'active'}
                </span>
              </div>
            </div>
            <span>HP {monster.hp} · {monster.encounterPoints || 0.1} pt · DPR {monster.dpr || 0}</span>
            <label>
              Qty{' '}
              <NumberInput
                type="number"
                min="1"
                max="99"
                aria-label={`${monster.name} quantity`}
                value={entry.quantity}
                onChange={event => onQuantity(entry.id, Number(event.target.value))}
              />
            </label>
            <label title="1 = all roll 1 shared initiative; equal to Qty = each rolls individually; in between = split into N shared-initiative groups">
              Groups{' '}
              <NumberInput
                type="number"
                min="1"
                max={entry.quantity}
                disabled={entry.quantity <= 1 || isObject}
                aria-label={`${monster.name} groups`}
                value={groups}
                onChange={event => onGroups(entry.id, Number(event.target.value))}
              />
            </label>
            <div className="button-row compact">
              {entry.quantity > 1 && !isObject && (
                <button className="btn small" onClick={() => onSplit(entry.id)} title="Split into two separate group rows">
                  Split
                </button>
              )}
              {onEdit && (
                <button
                  className="btn small"
                  onClick={() => onEdit(entry.monsterId)}
                  title="Edit this monster in Monster Editor"
                >
                  Edit monster
                </button>
              )}
              {onMutate && !isObject && (
                <button
                  className="btn purple small"
                  onClick={() => onMutate(entry.id, entry.monsterId)}
                  title="Vytvoří mutovanou kopii v databázi, nahradí 1 kus v tomto encounteru a otevře ji k editaci"
                >
                  Mutate this monster
                </button>
              )}
              <button className="btn danger small" onClick={() => onRemove(entry.id)}>Remove</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SavedEncounters({
  encounters,
  database,
  settings,
  onOpen,
  onRemove
}: {
  encounters: Encounter[];
  database: MonsterDatabaseEntry[];
  settings: EncounterDifficultySettings;
  onOpen: (encounter: Encounter) => void;
  onRemove: (encounter: Encounter) => void;
}) {
  if (!encounters.length) return <p className="empty">No encounters.</p>;
  return (
    <div className="saved-encounters">
      {encounters.map(encounter => {
        const math = calculateMath(encounter, database, settings);
        const status = encounter.status || 'active';
        return (
          <div className="saved-encounter-row" key={encounter.id}>
            <button className="saved-encounter" onClick={() => onOpen(encounter)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <strong>{encounter.name}</strong>
                {status === 'done' && <span className="type-pill" style={{ opacity: 0.7, fontSize: '0.72rem' }}>Done</span>}
                {status === 'unused' && <span className="type-pill" style={{ color: '#93c5fd', fontSize: '0.72rem' }}>Unused</span>}
              </div>
              <span>{math.points.toFixed(1)} pt · {math.totalHp} HP · {math.totalDpr.toFixed(0)} DPR · {encounter.monsters.reduce((sum, entry) => sum + entry.quantity, 0)} monsters</span>
            </button>
            <button className="btn danger small" onClick={() => { if (window.confirm(`Delete encounter "${encounter.name}"?`)) onRemove(encounter); }}>Delete</button>
          </div>
        );
      })}
    </div>
  );
}

function calculateMath(encounter: Encounter, database: MonsterDatabaseEntry[], settings: EncounterDifficultySettings) {
  const actual = encounter.monsters.reduce((sum, entry) => { const monster = database.find(item => item.id === entry.monsterId); if (!monster) return sum; const quantity = entry.quantity || 1; return { totalHp: sum.totalHp + Number(monster.hp || monster.maxHp || 0) * quantity, totalDpr: sum.totalDpr + Number(monster.dpr || 0) * quantity, points: sum.points + Number(monster.encounterPoints || 0.1) * quantity }; }, { totalHp: 0, totalDpr: 0, points: 0 });
  return { ...actual, pointHp: actual.points * (settings.hpPerPoint || 150), pointDprMin: actual.points * (settings.dprPerPointMin || 80), pointDprMax: actual.points * (settings.dprPerPointMax || 100) };
}

function matchMonsters(monsters: MonsterDatabaseEntry[], query: string, groupFilter: string, roleFilter = '') {
  const value = query.trim().toLowerCase();
  return monsters.filter(monster => {
    const flag = monster.flag || 'active';
    if (flag !== 'active' && flag !== 'adapt') return false;
    if (groupFilter) {
      const monsterGroups = Array.isArray(monster.groups) && monster.groups.length ? monster.groups : (monster.group ? [monster.group] : []);
      if (!monsterGroups.includes(groupFilter)) return false;
    }
    if (roleFilter && (monster.combatType || 'monster') !== roleFilter) return false;
    if (value && !monster.name.toLowerCase().includes(value)) return false;
    return true;
  });
}
