import { NumberInput } from '../components/NumberInput';
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { Character, ClientRole, GameAction, GameState, MonsterDatabaseEntry, MonsterCombatType, MonsterFlag } from '../shared/types';
import { CollapsiblePanel } from '../components/CollapsiblePanel';
import { MarkdownEditor, MarkdownRenderer } from '../components/Markdown';
import { parseMonsterEntries as parseEntriesText, parseMonsterMarkdown, epicActionsToText, parseEpicActionsText } from '../shared/monsterParser';
import { Modal } from '../components/Modal';
import { monsterRoleClass } from '../shared/defaults';
import { MonsterDetail, monsterDatabaseEntryToPreviewCharacter } from './MonstersPage';
import { MonsterEditorPage } from './MonsterEditorPage';

interface Props {
  state: GameState;
  role: ClientRole;
  submitAction: (action: GameAction) => Promise<unknown>;
  onBackToCombat: () => void;
  onOpenMonsterEditor?: (monsterId: string | null, markdown?: string) => void;
  initialTab?: DatabaseKind;
  onActiveTabChange?: (tab: DatabaseKind) => void;
  initialMonsterGroup?: string | null;
  onSelectedMonsterGroupChange?: (group: string) => void;
}

export type DatabaseKind = 'magic' | 'potion' | 'condition' | 'spell' | 'characters' | 'monster' | 'monsterGroups';

const DB_LABELS: Record<DatabaseKind, string> = {
  magic: 'Magic Items',
  potion: 'Potions',
  condition: 'Conditions',
  spell: 'Spells',
  characters: 'Player Characters',
  monster: 'Monsters',
  monsterGroups: 'Monster Groups'
};

export function DatabasesPage({
  state,
  role,
  submitAction,
  onBackToCombat,
  onOpenMonsterEditor,
  initialTab,
  onActiveTabChange,
  initialMonsterGroup,
  onSelectedMonsterGroupChange
}: Props) {
  const isDM = role === 'dm';
  const visibleTabs: DatabaseKind[] = isDM
    ? ['magic', 'potion', 'condition', 'spell', 'characters', 'monster', 'monsterGroups']
    : ['magic', 'potion', 'condition', 'spell', 'characters'];
  const [active, setActive] = useState<DatabaseKind>(() => initialTab && visibleTabs.includes(initialTab) ? initialTab : visibleTabs[0]);
  useEffect(() => {
    if (initialTab && visibleTabs.includes(initialTab) && active !== initialTab) {
      setActive(initialTab);
    }
  }, [initialTab]);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [previewMonsterId, setPreviewMonsterId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const allFileInputRef = useRef<HTMLInputElement | null>(null);
  const markdownFileInputRef = useRef<HTMLInputElement | null>(null);
  const [monsterMarkdown, setMonsterMarkdown] = useState<string | null>(null);
  const [markdownImportError, setMarkdownImportError] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    setVisibleCount(20);
  }, [active, query, filters]);

  const items = itemsForKind(state, active);
  const previewMonster = previewMonsterId
    ? (state.monsterDatabase || []).find(monster => String(monster.id || '') === previewMonsterId) || null
    : null;

  const filterOptions = useMemo(() => {
    const options: Record<string, string[]> = {};
    if (active === 'magic') {
      options.rarity = Array.from(new Set(items.map(i => String(i.rarity || '')).filter(Boolean))).sort();
      options.itemType = Array.from(new Set(items.map(i => String(i.itemType || '')).filter(Boolean))).sort();
    } else if (active === 'potion') {
      options.rarity = Array.from(new Set(items.map(i => String(i.rarity || '')).filter(Boolean))).sort();
    } else if (active === 'condition') {
      options.kind = Array.from(new Set(items.map(i => String(i.kind || '')).filter(Boolean))).sort();
    } else if (active === 'spell') {
      options.level = Array.from(new Set(items.map(i => String(i.levelLabel || '')).filter(Boolean))).sort((a, b) => {
        const getOrder = (s: string) => {
          if (s.toLowerCase().includes('cantrip')) return 0;
          const num = parseInt(s);
          if (!isNaN(num)) return num;
          return 99;
        };
        return getOrder(a) - getOrder(b);
      });
      options.school = Array.from(new Set(items.map(i => String(i.school || '')).filter(Boolean))).sort();

      const classesSet = new Set<string>();
      items.forEach(i => {
        const cls = i.classes;
        if (Array.isArray(cls)) {
          cls.forEach(c => classesSet.add(String(c)));
        } else if (typeof cls === 'string') {
          cls.split(/,\s*/).forEach(c => classesSet.add(c));
        }
      });
      options.classes = Array.from(classesSet).filter(Boolean).sort();
    } else if (active === 'monster') {
      options.challenge = Array.from(new Set(items.map(i => String(i.challenge || '')).filter(Boolean))).sort((a, b) => {
        const getCRVal = (cr: string) => {
          if (cr.includes('/')) {
            const [num, den] = cr.split('/').map(Number);
            return num / den;
          }
          return Number(cr);
        };
        return getCRVal(a) - getCRVal(b);
      });
      options.size = Array.from(new Set(items.map(i => String(i.size || '')).filter(Boolean))).sort();
      options.type = Array.from(new Set(items.map(i => String(i.type || i.monsterType || '')).filter(Boolean))).sort();
      options.group = Array.from(new Set(items.flatMap(i => {
        const itemGroups = Array.isArray(i.groups) && i.groups.length ? i.groups : (i.group ? [i.group] : []);
        return itemGroups.map(g => String(g || '').trim()).filter(Boolean);
      }))).sort();
      options.combatType = ['monster', 'spellcaster', 'elite', 'leader', 'ranged', 'controller'];
    }
    return options;
  }, [items, active]);

  const filtered = useMemo(() => {
    let result = items;

    // Apply search query
    const parsed = parseQuery(query);
    if (parsed.needle) {
      result = result.filter(item => {
        if (parsed.nameOnly) {
          const name = String(item.name || '').toLowerCase();
          return name.includes(parsed.needle);
        }
        return searchableText(item).includes(parsed.needle);
      });
    }

    // Apply monster flag and combatType filters
    if (active === 'monster') {
      const flagMode = filters.flag || 'active';
      if (flagMode === 'active') {
        result = result.filter(item => (item.flag || 'active') === 'active' || item.flag === 'adapt');
      } else if (flagMode === 'activeOnly') {
        result = result.filter(item => (item.flag || 'active') === 'active');
      } else if (flagMode === 'adapt') {
        result = result.filter(item => item.flag === 'adapt');
      } else if (flagMode === 'inactive') {
        result = result.filter(item => item.flag === 'inactive');
      } else if (flagMode === 'unused') {
        result = result.filter(item => item.flag === 'unused');
      }
      if (filters.combatType) {
        result = result.filter(item => (item.combatType || 'monster') === filters.combatType);
      }
    }

    // Apply filters
    Object.entries(filters).forEach(([key, val]) => {
      if (!val) return;
      if (active === 'monster' && (key === 'flag' || key === 'combatType')) return;
      result = result.filter(item => {
        if (key === 'classes') {
          const cls = item.classes;
          if (Array.isArray(cls)) {
            return cls.map(c => String(c).toLowerCase()).includes(val.toLowerCase());
          } else if (typeof cls === 'string') {
            return cls.toLowerCase().includes(val.toLowerCase());
          }
          return false;
        }
        if (key === 'isCounterspell') {
          const isCs = Boolean(item.isCounterspell || item.IsCounterspell || (active === 'spell' && item.source && String(item.source).toLowerCase() === 'counterspell'));
          return val === 'yes' ? isCs : !isCs;
        }
        if (key === 'level') {
          return String(item.levelLabel || '') === val;
        }
        if (key === 'type' && active === 'monster') {
          return String(item.type || item.monsterType || '') === val;
        }
        if (key === 'group' && active === 'monster') {
          const itemGroups = Array.isArray(item.groups) && item.groups.length ? item.groups : (item.group ? [item.group] : []);
          return itemGroups.includes(val);
        }
        return String(item[key] || '') === val;
      });
    });

    return result;
  }, [items, query, filters, active]);

  const { matchingInactiveCount, matchingUnusedCount } = useMemo(() => {
    if (active !== 'monster') return { matchingInactiveCount: 0, matchingUnusedCount: 0 };
    const parsed = parseQuery(query);
    let inactive = 0;
    let unused = 0;
    (state.monsterDatabase || []).forEach(item => {
      if (item.flag !== 'inactive' && item.flag !== 'unused') return;
      if (filters.combatType && (item.combatType || 'monster') !== filters.combatType) return;
      if (filters.challenge && String(item.challenge || '') !== filters.challenge) return;
      if (filters.size && String(item.size || '') !== filters.size) return;
      if (filters.type && String(item.type || item.monsterType || '') !== filters.type) return;
      if (filters.group) {
        const itemGroups = Array.isArray(item.groups) && item.groups.length ? item.groups : (item.group ? [item.group] : []);
        if (!itemGroups.includes(filters.group)) return;
      }
      if (parsed.needle) {
        const matches = parsed.nameOnly
          ? String(item.name || '').toLowerCase().includes(parsed.needle)
          : searchableText(item).includes(parsed.needle);
        if (!matches) return;
      }
      if (item.flag === 'inactive') inactive += 1;
      if (item.flag === 'unused') unused += 1;
    });
    return { matchingInactiveCount: inactive, matchingUnusedCount: unused };
  }, [state.monsterDatabase, active, query, filters]);

  const canEditCurrent = active === 'spell' ? isDM : isDM || active !== 'monster';
  const canRemoveCurrent = isDM && active !== 'characters';

  function openCreate() {
    if ((active === 'monster' || active === 'monsterGroups') && onOpenMonsterEditor) {
      onOpenMonsterEditor(null);
      return;
    }
    setEditing(null);
    setModalOpen(true);
  }

  function exportDatabase(kind: DatabaseKind) {
    const targetKind = kind === 'monsterGroups' ? 'monster' : kind;
    downloadJson(`dnd-${targetKind}-database.json`, {
      schemaVersion: state.schemaVersion,
      kind: targetKind,
      items: itemsForKind(state, targetKind)
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

  async function importMonsterMarkdown(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setMarkdownImportError('');
    try {
      const markdown = await file.text();
      if (!markdown.trim()) throw new Error('The Markdown file is empty.');
      if (onOpenMonsterEditor) onOpenMonsterEditor(null, markdown);
      else setMonsterMarkdown(markdown);
    } catch (error) {
      setMarkdownImportError(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
    }
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
            <button key={tab} className={`nav-btn ${active === tab ? 'active' : ''}`} onClick={() => { setActive(tab); onActiveTabChange?.(tab); setQuery(''); setFilters({}); }}>
              {DB_LABELS[tab]}
            </button>
          ))}
        </div>
        {active !== 'monsterGroups' && (
          <div className="database-toolbar">
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${DB_LABELS[active]}`} />
            {active === 'magic' && (
              <>
                <select
                  value={filters.rarity || ''}
                  onChange={e => setFilters(prev => ({ ...prev, rarity: e.target.value }))}
                >
                  <option value="">All Rarities</option>
                  {filterOptions.rarity?.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select
                  value={filters.itemType || ''}
                  onChange={e => setFilters(prev => ({ ...prev, itemType: e.target.value }))}
                >
                  <option value="">All Types</option>
                  {filterOptions.itemType?.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </>
            )}
            {active === 'potion' && (
              <select
                value={filters.rarity || ''}
                onChange={e => setFilters(prev => ({ ...prev, rarity: e.target.value }))}
              >
                <option value="">All Rarities</option>
                {filterOptions.rarity?.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            {active === 'condition' && (
              <select
                value={filters.kind || ''}
                onChange={e => setFilters(prev => ({ ...prev, kind: e.target.value }))}
              >
                <option value="">All Kinds</option>
                {filterOptions.kind?.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            )}
            {active === 'spell' && (
              <>
                <select
                  value={filters.level || ''}
                  onChange={e => setFilters(prev => ({ ...prev, level: e.target.value }))}
                >
                  <option value="">All Levels</option>
                  {filterOptions.level?.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <select
                  value={filters.school || ''}
                  onChange={e => setFilters(prev => ({ ...prev, school: e.target.value }))}
                >
                  <option value="">All Schools</option>
                  {filterOptions.school?.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                  value={filters.classes || ''}
                  onChange={e => setFilters(prev => ({ ...prev, classes: e.target.value }))}
                >
                  <option value="">All Classes</option>
                  {filterOptions.classes?.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  value={filters.isCounterspell || ''}
                  onChange={e => setFilters(prev => ({ ...prev, isCounterspell: e.target.value }))}
                >
                  <option value="">All Spells</option>
                  <option value="yes">Only Counterspells</option>
                  <option value="no">Exclude Counterspells</option>
                </select>
              </>
            )}
            {active === 'monster' && (
              <>
                <select
                  value={filters.challenge || ''}
                  onChange={e => setFilters(prev => ({ ...prev, challenge: e.target.value }))}
                >
                  <option value="">All CRs</option>
                  {filterOptions.challenge?.map(c => <option key={c} value={c}>CR {c}</option>)}
                </select>
                <select
                  value={filters.size || ''}
                  onChange={e => setFilters(prev => ({ ...prev, size: e.target.value }))}
                >
                  <option value="">All Sizes</option>
                  {filterOptions.size?.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                  value={filters.type || ''}
                  onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="">All Types</option>
                  {filterOptions.type?.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select
                  value={filters.combatType || ''}
                  onChange={e => setFilters(prev => ({ ...prev, combatType: e.target.value }))}
                  aria-label="Filter monster combat role"
                >
                  <option value="">All Combat Roles</option>
                  <option value="monster">Monster</option>
                  <option value="spellcaster">Spellcaster</option>
                  <option value="elite">Elite</option>
                  <option value="leader">Leader</option>
                  <option value="ranged">Ranged</option>
                  <option value="controller">Controller</option>
                </select>
                <select
                  value={filters.flag || 'active'}
                  onChange={e => setFilters(prev => ({ ...prev, flag: e.target.value }))}
                  aria-label="Filter monster status flag"
                >
                  <option value="active">Active & Adapt (Default)</option>
                  <option value="activeOnly">Active only</option>
                  <option value="adapt">Adapt only</option>
                  <option value="all">All (Active, Adapt, Inactive & Unused)</option>
                  <option value="inactive">Inactive only</option>
                  <option value="unused">Unused only</option>
                </select>
                {(filterOptions.group?.length ?? 0) > 0 && (
                  <select
                    value={filters.group || ''}
                    onChange={e => setFilters(prev => ({ ...prev, group: e.target.value }))}
                  >
                    <option value="">All Groups</option>
                    {filterOptions.group?.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <CollapsiblePanel title="Database actions" summary="Add entries, export backups and import DM database files.">
        <div className="button-row">
          <button className="btn" onClick={() => exportDatabase(active)}>Export this DB</button>
          <button className="btn" onClick={exportAll}>Export visible backup</button>
          {canEditCurrent && active !== 'characters' && (
            <button className="btn success" onClick={openCreate}>
              Add {active === 'monsterGroups' ? 'Monster' : DB_LABELS[active].slice(0, -1)}
            </button>
          )}
          {isDM && (
            <button
              className="btn warning"
              onClick={() => fileInputRef.current?.click()}
              disabled={active === 'characters' || active === 'monsterGroups'}
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
          {isDM && active === 'monster' && <button className="btn warning" onClick={() => markdownFileInputRef.current?.click()}>Import from .md</button>}
          {isDM && active === 'monster' && <input ref={markdownFileInputRef} className="hidden-input" type="file" accept=".md,.markdown,text/markdown,text/plain" aria-label="Import monster Markdown file" onChange={importMonsterMarkdown} />}
          <input ref={allFileInputRef} className="hidden-input" type="file" accept="application/json,.json" onChange={importAll} />
        </div>
        {markdownImportError && <p role="alert">{markdownImportError}</p>}
      </CollapsiblePanel>

      {isDM && monsterMarkdown && (
        <Modal>
          <div className="modal-card monster-preview-modal">
            <MonsterEditorPage state={state} submitAction={submitAction} editingMonsterId={null} initialMarkdown={monsterMarkdown} onBackToDatabases={() => setMonsterMarkdown(null)} />
          </div>
        </Modal>
      )}

      {active === 'characters' ? (
        <CharacterDatabase
          key={active}
          characters={filtered.slice(0, visibleCount) as Character[]}
          isDM={isDM}
          submitAction={submitAction}
        />
      ) : active === 'monsterGroups' ? (
        <MonsterGroupsView
          monsters={(state.monsterDatabase || []) as MonsterDatabaseEntry[]}
          groupDescriptions={state.monsterGroupDescriptions || {}}
          submitAction={submitAction}
          canEdit={canEditCurrent}
          canRemove={canRemoveCurrent}
          initialGroup={initialMonsterGroup}
          onSelectedGroupChange={onSelectedMonsterGroupChange}
          onView={item => setPreviewMonsterId(String(item.id || ''))}
          onEdit={item => {
            if (onOpenMonsterEditor) {
              onOpenMonsterEditor(String(item.id || ''));
              return;
            }
            setEditing(item);
            setModalOpen(true);
          }}
          onDuplicate={item => submitAction(upsertActionFor('monster', duplicateDatabaseItem('monster', item, (state.monsterDatabase || []) as unknown as Array<Record<string, unknown>>)))}
          onRemove={id => submitAction(removeActionFor('monster', id))}
        />
      ) : (
        <DatabaseGrid
          key={active}
          kind={active}
          items={filtered.slice(0, visibleCount)}
          canEdit={canEditCurrent}
          canRemove={canRemoveCurrent}
          onView={active === 'monster' ? item => setPreviewMonsterId(String(item.id || '')) : undefined}
          onEdit={item => {
            if (active === 'monster' && onOpenMonsterEditor) {
              onOpenMonsterEditor(String(item.id || ''));
              return;
            }
            setEditing(item);
            setModalOpen(true);
          }}
          onDuplicate={item => submitAction(upsertActionFor(active, duplicateDatabaseItem(active, item, items)))}
          onRemove={id => submitAction(removeActionFor(active, id))}
        />
      )}

      {active !== 'monsterGroups' && visibleCount < filtered.length && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
          <button
            className="btn primary"
            onClick={() => setVisibleCount(prev => prev + 20)}
            style={{ padding: '10px 24px', fontSize: '0.95rem', fontWeight: 600 }}
          >
            Load more (+20) · Showing {Math.min(visibleCount, filtered.length)} of {filtered.length}
          </button>
        </div>
      )}

      {active === 'monster' && (
        <div className="monster-flag-footer" style={{ marginTop: '16px', padding: '12px 16px', background: 'var(--panel-strong)', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', color: 'var(--muted-strong)', flexWrap: 'wrap', gap: '8px' }}>
          <span>Zobrazeno {Math.min(visibleCount, filtered.length)} z {filtered.length} monster (filtr: {(filters.flag || 'active') === 'active' ? 'aktivní & adapt' : (filters.flag || 'active') === 'activeOnly' ? 'pouze aktivní' : (filters.flag || 'active') === 'adapt' ? 'pouze adapt' : (filters.flag || 'active') === 'inactive' ? 'pouze neaktivní' : (filters.flag || 'active') === 'unused' ? 'pouze nepoužité (unused)' : 'všechna monstra'}).</span>
          <span style={{ color: (matchingInactiveCount + matchingUnusedCount) > 0 ? 'var(--warning, #f59e0b)' : 'var(--muted)', fontWeight: (matchingInactiveCount + matchingUnusedCount) > 0 ? '600' : 'normal' }}>
            Počet neaktivních monster (inactive) odpovídajících podmínkám: <strong>{matchingInactiveCount}</strong> · Nepoužitých (unused): <strong>{matchingUnusedCount}</strong>
          </span>
        </div>
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

      {previewMonster && (
        <Modal>
          <div className="modal-card monster-preview-modal">
            <div className="section-title-row">
              <div>
                <h2>{previewMonster.name || 'Monster'} Preview</h2>
                <p>Database entry rendered with the combat monster sheet.</p>
              </div>
              <div className="button-row">
                {onOpenMonsterEditor && (
                  <button
                    className="btn purple"
                    onClick={() => {
                      const monsterId = String(previewMonster.id || '');
                      setPreviewMonsterId(null);
                      onOpenMonsterEditor(monsterId);
                    }}
                  >
                    Edit
                  </button>
                )}
                <button className="btn" onClick={() => setPreviewMonsterId(null)}>Close</button>
              </div>
            </div>
            <MonsterDetail
              monster={monsterDatabaseEntryToPreviewCharacter(previewMonster)}
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

function itemsForKind(state: GameState, kind: DatabaseKind): Array<Record<string, unknown>> {
  if (kind === 'magic') return state.magicItemDatabase || [];
  if (kind === 'potion') return state.potionDatabase || [];
  if (kind === 'condition') return state.conditionDatabase || [];
  if (kind === 'spell') return state.spellDatabase || [];
  if (kind === 'monster' || kind === 'monsterGroups') return (state.monsterDatabase || []) as unknown as Array<Record<string, unknown>>;
  return state.characters.filter(character => character.type === 'player') as unknown as Array<Record<string, unknown>>;
}

function parseQuery(query: string) {
  const trimmed = query.trim();
  const quoteChars = ['"', "'", '“', '”', '‘', '’'];
  if (trimmed.length >= 2) {
    const first = trimmed.charAt(0);
    const last = trimmed.charAt(trimmed.length - 1);
    if (quoteChars.includes(first) && quoteChars.includes(last)) {
      return {
        needle: trimmed.slice(1, -1).trim().toLowerCase(),
        nameOnly: true
      };
    }
  }
  return {
    needle: trimmed.toLowerCase(),
    nameOnly: false
  };
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
  onView,
  onEdit,
  onDuplicate,
  onRemove
}: {
  kind: DatabaseKind;
  items: Array<Record<string, unknown>>;
  canEdit: boolean;
  canRemove: boolean;
  onView?: (item: Record<string, unknown>) => void;
  onEdit: (item: Record<string, unknown>) => void;
  onDuplicate: (item: Record<string, unknown>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="database-grid">
      {items.length === 0 && <div className="section"><p className="empty">No entries found.</p></div>}
      {items.map((item, index) => (
        <article key={databaseCardKey(kind, item, index)} className="database-card">
          {kind === 'monster' && item.imageUrl ? (
            <div style={{ marginBottom: '8px', maxHeight: '120px', overflow: 'hidden', borderRadius: '6px', background: 'var(--panel-strong)' }}>
              <img
                src={String(item.imageUrl)}
                alt={String(item.name || 'Monster')}
                style={{ width: '100%', height: '120px', objectFit: 'cover', objectPosition: String(item.imageFocus || 'center'), display: 'block' }}
                onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            </div>
          ) : null}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3>{String(item.name || 'Unnamed')}</h3>
              {kind === 'monster' && (
                <>
                  <span className={`badge role-badge ${monsterRoleClass(String(item.combatType || 'monster'))}`}>
                    {String(item.combatType || 'monster')}
                  </span>
                  {item.flag === 'adapt' && (
                    <span className="badge" style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(20, 184, 166, 0.25)', color: '#2dd4bf', border: '1px solid rgba(20, 184, 166, 0.5)' }}>
                      Adapt
                    </span>
                  )}
                  {item.flag === 'inactive' && (
                    <span className="badge warning" style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px' }}>
                      Inactive
                    </span>
                  )}
                  {item.flag === 'unused' && (
                    <span className="badge" style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1', border: '1px solid rgba(148, 163, 184, 0.4)' }}>
                      Unused
                    </span>
                  )}
                </>
              )}
            </div>
            <p>{summaryFor(kind, item)}</p>
          </div>
          {kind !== 'monster' && (item.description || item.effect) ? <MarkdownRenderer text={String(item.description || item.effect)} /> : null}
          <div className="button-row">
            {onView && <button className="btn purple small" onClick={() => onView(item)}>View</button>}
            {canEdit && <button className="btn small" onClick={() => onEdit(item)}>Edit</button>}
            {canEdit && <button className="btn small" onClick={() => onDuplicate(item)}>Duplicate</button>}
            {canRemove && <button className="btn danger small" onClick={() => onRemove(String(item.id))}>Remove</button>}
          </div>
        </article>
      ))}
    </section>
  );
}

function MonsterGroupsView({
  monsters,
  groupDescriptions,
  submitAction,
  canEdit,
  canRemove,
  onView,
  onEdit,
  onDuplicate,
  onRemove,
  initialGroup,
  onSelectedGroupChange
}: {
  monsters: MonsterDatabaseEntry[];
  groupDescriptions: Record<string, string>;
  submitAction: (action: GameAction) => Promise<unknown>;
  canEdit: boolean;
  canRemove: boolean;
  onView?: (item: Record<string, unknown>) => void;
  onEdit: (item: Record<string, unknown>) => void;
  onDuplicate: (item: Record<string, unknown>) => void;
  onRemove: (id: string) => void;
  initialGroup?: string | null;
  onSelectedGroupChange?: (group: string) => void;
}) {
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    monsters.forEach(m => {
      const groups = Array.isArray(m.groups) && m.groups.length ? m.groups : (m.group ? [m.group] : []);
      groups.forEach(g => {
        const trimmed = String(g || '').trim();
        if (trimmed) set.add(trimmed);
      });
    });
    Object.keys(groupDescriptions || {}).forEach(g => {
      const trimmed = String(g || '').trim();
      if (trimmed) set.add(trimmed);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [monsters, groupDescriptions]);

  const hasUngrouped = useMemo(() => {
    return monsters.some(m => {
      const groups = Array.isArray(m.groups) && m.groups.length ? m.groups : (m.group ? [m.group] : []);
      return groups.length === 0;
    });
  }, [monsters]);

  const allSelectableGroups = useMemo(() => {
    const list = [...availableGroups];
    if (hasUngrouped) {
      list.push('__ungrouped__');
    }
    return list;
  }, [availableGroups, hasUngrouped]);

  const [selectedGroup, setSelectedGroup] = useState<string>(() => {
    if (initialGroup && allSelectableGroups.includes(initialGroup)) {
      return initialGroup;
    }
    return allSelectableGroups[0] || '';
  });

  useEffect(() => {
    if (initialGroup && allSelectableGroups.includes(initialGroup) && selectedGroup !== initialGroup) {
      setSelectedGroup(initialGroup);
    } else if (!selectedGroup && allSelectableGroups.length > 0) {
      const fallback = allSelectableGroups[0];
      setSelectedGroup(fallback);
      onSelectedGroupChange?.(fallback);
    } else if (selectedGroup && !allSelectableGroups.includes(selectedGroup) && allSelectableGroups.length > 0) {
      const fallback = allSelectableGroups[0];
      setSelectedGroup(fallback);
      onSelectedGroupChange?.(fallback);
    }
  }, [allSelectableGroups, initialGroup]);

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    monsters.forEach(m => {
      const groups = Array.isArray(m.groups) && m.groups.length ? m.groups : (m.group ? [m.group] : []);
      if (groups.length === 0) {
        counts['__ungrouped__'] = (counts['__ungrouped__'] || 0) + 1;
      } else {
        groups.forEach(g => {
          const trimmed = String(g || '').trim();
          if (trimmed) counts[trimmed] = (counts[trimmed] || 0) + 1;
        });
      }
    });
    return counts;
  }, [monsters]);

  const isSpecialUngrouped = selectedGroup === '__ungrouped__';
  const groupDescription = (!isSpecialUngrouped && selectedGroup)
    ? (groupDescriptions[selectedGroup] || '')
    : '';
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');

  useEffect(() => {
    setIsEditingDesc(false);
    setDescDraft(groupDescription);
  }, [selectedGroup, groupDescription]);

  async function handleSaveDescription() {
    if (!selectedGroup || isSpecialUngrouped) return;
    await submitAction({
      type: 'database.monsterGroup.updateDescription',
      payload: { group: selectedGroup, description: descDraft }
    });
    setIsEditingDesc(false);
  }

  const [viewMode, setViewMode] = useState<'normal' | 'roles'>('normal');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [monsterSearchQuery, setMonsterSearchQuery] = useState('');
  const [flagFilter, setFlagFilter] = useState('active');
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    setVisibleCount(20);
  }, [selectedGroup, monsterSearchQuery, flagFilter, viewMode]);

  const rawGroupMonsters = useMemo(() => {
    if (!selectedGroup) return [];
    return monsters.filter(m => {
      const groups = Array.isArray(m.groups) && m.groups.length ? m.groups : (m.group ? [m.group] : []);
      if (selectedGroup === '__ungrouped__') {
        return groups.length === 0;
      }
      return groups.includes(selectedGroup);
    });
  }, [monsters, selectedGroup]);

  const filteredMonsters = useMemo(() => {
    let result = rawGroupMonsters;

    if (flagFilter === 'active') {
      result = result.filter(item => (item.flag || 'active') === 'active' || item.flag === 'adapt');
    } else if (flagFilter === 'activeOnly') {
      result = result.filter(item => (item.flag || 'active') === 'active');
    } else if (flagFilter === 'adapt') {
      result = result.filter(item => item.flag === 'adapt');
    } else if (flagFilter === 'inactive') {
      result = result.filter(item => item.flag === 'inactive');
    } else if (flagFilter === 'unused') {
      result = result.filter(item => item.flag === 'unused');
    }

    if (monsterSearchQuery.trim()) {
      const parsed = parseQuery(monsterSearchQuery);
      if (parsed.needle) {
        result = result.filter(item => {
          if (parsed.nameOnly) {
            return String(item.name || '').toLowerCase().includes(parsed.needle);
          }
          return searchableText(item as unknown as Record<string, unknown>).includes(parsed.needle);
        });
      }
    }

    return result;
  }, [rawGroupMonsters, flagFilter, monsterSearchQuery]);

  const displayedGroupPills = useMemo(() => {
    if (!groupSearchQuery.trim()) return allSelectableGroups;
    const q = groupSearchQuery.toLowerCase().trim();
    return allSelectableGroups.filter(g => {
      const name = g === '__ungrouped__' ? 'ungrouped bez skupiny' : g;
      return name.toLowerCase().includes(q);
    });
  }, [allSelectableGroups, groupSearchQuery]);

  const ROLES_ORDER: Array<{ key: MonsterCombatType; label: string }> = [
    { key: 'monster', label: 'Monster' },
    { key: 'spellcaster', label: 'Spellcaster' },
    { key: 'leader', label: 'Leader' },
    { key: 'elite', label: 'Elite' },
    { key: 'ranged', label: 'Ranged' },
    { key: 'controller', label: 'Controller' },
  ];

  if (allSelectableGroups.length === 0) {
    return (
      <div className="section">
        <p className="empty">V databázi zatím nejsou žádné skupiny monster. Přidejte nebo upravte monstrum a přiřaďte mu skupinu.</p>
      </div>
    );
  }

  const groupDisplayName = selectedGroup === '__ungrouped__' ? 'Bez skupiny (Ungrouped)' : selectedGroup;

  return (
    <div className="monster-groups-view stack">
      <section className="section" style={{ background: 'var(--panel-strong)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Monster Groups</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              Celkem {availableGroups.length} skupin · Vyberte skupinu pro zobrazení monster a poznámek
            </span>
          </div>
          {allSelectableGroups.length > 5 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={groupSearchQuery}
                onChange={e => setGroupSearchQuery(e.target.value)}
                placeholder="Filtrovat skupiny..."
                style={{ fontSize: '0.85rem', padding: '4px 10px', maxWidth: '180px' }}
              />
              <select
                value={selectedGroup}
                onChange={e => {
                  setSelectedGroup(e.target.value);
                  onSelectedGroupChange?.(e.target.value);
                }}
                aria-label="Select monster group"
                style={{ fontSize: '0.85rem', padding: '4px 8px' }}
              >
                {allSelectableGroups.map(g => (
                  <option key={g} value={g}>
                    {g === '__ungrouped__' ? '(Ungrouped)' : g} ({groupCounts[g] || 0})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="group-pills-container" style={{ maxHeight: '180px', overflowY: 'auto', padding: '2px' }}>
          {displayedGroupPills.map(g => {
            const isSelected = selectedGroup === g;
            const count = groupCounts[g] || 0;
            const label = g === '__ungrouped__' ? '(Ungrouped)' : g;
            return (
              <button
                key={g}
                type="button"
                className={`group-pill ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  setSelectedGroup(g);
                  onSelectedGroupChange?.(g);
                }}
              >
                <span>{label}</span>
                <span style={{ fontSize: '0.75rem', opacity: isSelected ? 0.9 : 0.65, fontWeight: 700 }}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="monster-group-header-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text)' }}>{groupDisplayName}</h2>
              <span className="badge" style={{ fontSize: '0.8rem', padding: '3px 8px' }}>
                {rawGroupMonsters.length} {rawGroupMonsters.length === 1 ? 'monster' : 'monsters'}
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '4px' }}>
              Popis a taktické poznámky ke skupině monster
            </div>
          </div>

          {!isSpecialUngrouped && (
            <div className="button-row" style={{ margin: 0 }}>
              {!isEditingDesc ? (
                <button
                  type="button"
                  className="btn small"
                  onClick={() => {
                    setDescDraft(groupDescription);
                    setIsEditingDesc(true);
                  }}
                >
                  {groupDescription ? 'Edit Description' : 'Add Description'}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn success small"
                    onClick={handleSaveDescription}
                  >
                    Save Description
                  </button>
                  <button
                    type="button"
                    className="btn small"
                    onClick={() => {
                      setIsEditingDesc(false);
                      setDescDraft(groupDescription);
                    }}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ marginTop: '14px' }}>
          {isSpecialUngrouped ? (
            <p style={{ color: 'var(--muted)', fontStyle: 'italic', margin: 0 }}>
              Monstra bez přiřazené skupiny. Upravte monstrum v Monster Editoru pro přiřazení do skupiny.
            </p>
          ) : isEditingDesc ? (
            <div style={{ display: 'grid', gap: '10px' }}>
              <MarkdownEditor
                value={descDraft}
                onChange={setDescDraft}
                placeholder={`Napište Markdown popis, pozadí, taktiku nebo poznámky pro skupinu ${selectedGroup}...`}
              />
            </div>
          ) : groupDescription ? (
            <div style={{ background: 'var(--panel)', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <MarkdownRenderer text={groupDescription} />
            </div>
          ) : (
            <div style={{ background: 'var(--panel)', padding: '12px 16px', borderRadius: '8px', border: '1px dashed var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                Tato skupina zatím nemá žádný popis. Klikněte na &quot;Add Description&quot; pro přidání lore, taktiky nebo poznámek.
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="section" style={{ padding: '12px 16px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: '1 1 300px' }}>
            <input
              type="text"
              value={monsterSearchQuery}
              onChange={e => setMonsterSearchQuery(e.target.value)}
              placeholder={`Search in ${groupDisplayName}...`}
              style={{ flex: '1 1 200px' }}
            />
            <select
              value={flagFilter}
              onChange={e => setFlagFilter(e.target.value)}
              aria-label="Filter monster status in group"
            >
              <option value="active">Active & Adapt (Default)</option>
              <option value="activeOnly">Active only</option>
              <option value="adapt">Adapt only</option>
              <option value="all">All (Active, Adapt, Inactive & Unused)</option>
              <option value="inactive">Inactive only</option>
              <option value="unused">Unused only</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted-strong)', fontWeight: 600 }}>Zobrazení:</span>
            <div className="button-row" style={{ margin: 0 }}>
              <button
                type="button"
                className={`btn small ${viewMode === 'normal' ? 'primary' : ''}`}
                onClick={() => setViewMode('normal')}
              >
                ▦ Všechna monstra
              </button>
              <button
                type="button"
                className={`btn small ${viewMode === 'roles' ? 'primary' : ''}`}
                onClick={() => setViewMode('roles')}
              >
                🏷 Rozdělené podle rolí
              </button>
            </div>
          </div>
        </div>
      </section>

      {filteredMonsters.length === 0 ? (
        <div className="section">
          <p className="empty">V této skupině nebyla nalezena žádná monstra odpovídající zadaným filtrům.</p>
        </div>
      ) : viewMode === 'normal' ? (
        <>
          <DatabaseGrid
            kind="monster"
            items={filteredMonsters.slice(0, visibleCount) as unknown as Array<Record<string, unknown>>}
            canEdit={canEdit}
            canRemove={canRemove}
            onView={onView}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onRemove={onRemove}
          />
          {visibleCount < filteredMonsters.length && (
            <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
              <button
                type="button"
                className="btn primary"
                onClick={() => setVisibleCount(prev => prev + 20)}
                style={{ padding: '10px 24px', fontSize: '0.95rem', fontWeight: 600 }}
              >
                Load more (+20) · Showing {Math.min(visibleCount, filteredMonsters.length)} of {filteredMonsters.length}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="stack" style={{ gap: '20px' }}>
          {ROLES_ORDER.map(role => {
            const roleMonsters = filteredMonsters.filter(m => (m.combatType || 'monster') === role.key);
            if (roleMonsters.length === 0) return null;
            return (
              <div key={role.key} className="monster-role-group-section">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>
                  <span className={`badge role-badge ${monsterRoleClass(role.key)}`} style={{ fontSize: '0.85rem', padding: '4px 10px' }}>
                    {role.label}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    ({roleMonsters.length} {roleMonsters.length === 1 ? 'monster' : 'monsters'})
                  </span>
                </div>
                <DatabaseGrid
                  kind="monster"
                  items={roleMonsters as unknown as Array<Record<string, unknown>>}
                  canEdit={canEdit}
                  canRemove={canRemove}
                  onView={onView}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onRemove={onRemove}
                />
              </div>
            );
          })}

          {(() => {
            const known = new Set(ROLES_ORDER.map(r => r.key));
            const other = filteredMonsters.filter(m => !known.has((m.combatType || 'monster') as MonsterCombatType));
            if (other.length === 0) return null;
            return (
              <div key="other" className="monster-role-group-section">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>
                  <span className="badge role-badge role-monster" style={{ fontSize: '0.85rem', padding: '4px 10px' }}>
                    Other Roles
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    ({other.length})
                  </span>
                </div>
                <DatabaseGrid
                  kind="monster"
                  items={other as unknown as Array<Record<string, unknown>>}
                  canEdit={canEdit}
                  canRemove={canRemove}
                  onView={onView}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onRemove={onRemove}
                />
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function databaseCardKey(kind: DatabaseKind, item: Record<string, unknown>, index: number) {
  const id = item.id || item.importKey || item.name || index;
  return `${kind}:${String(id)}:${index}`;
}

function duplicateDatabaseItem(kind: DatabaseKind, item: Record<string, unknown>, siblings: Array<Record<string, unknown>>) {
  const copy = JSON.parse(JSON.stringify(item)) as Record<string, unknown>;
  copy.id = makeDatabaseId(kind);
  copy.name = duplicateName(String(item.name || 'Unnamed'), siblings);

  if (kind === 'spell') {
    copy.importKey = '';
  }

  return copy;
}

function duplicateName(name: string, siblings: Array<Record<string, unknown>>) {
  const base = name.replace(/\s+\(copy(?: \d+)?\)$/i, '').trim() || 'Unnamed';
  const usedNames = new Set(siblings.map(item => String(item.name || '').trim().toLowerCase()));
  let next = `${base} (copy)`;
  let suffix = 2;

  while (usedNames.has(next.toLowerCase())) {
    next = `${base} (copy ${suffix})`;
    suffix += 1;
  }

  return next;
}

function makeDatabaseId(kind: DatabaseKind) {
  const prefix = kind === 'monster' ? 'monster_db' : `${kind}_db`;
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${random}`;
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
    isCounterspell: Boolean(initial?.isCounterspell || initial?.IsCounterspell),
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
    damageResistances: String(initial?.damageResistances || ''),
    damageImmunities: String(initial?.damageImmunities || ''),
    conditionImmunities: String(initial?.conditionImmunities || ''),
    damageVulnerabilities: String(initial?.damageVulnerabilities || ''),
    challenge: String(initial?.challenge || ''),
    proficiency: String(initial?.proficiency || ''),
    monsterType: String(initial?.type || ''),
    combatType: String((initial as MonsterDatabaseEntry)?.combatType || 'monster'),
    flag: String((initial as MonsterDatabaseEntry)?.flag || 'active'),
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
        isCounterspell: Boolean(form.isCounterspell),
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
        damageResistances: form.damageResistances,
        damageImmunities: form.damageImmunities,
        conditionImmunities: form.conditionImmunities,
        damageVulnerabilities: form.damageVulnerabilities,
        challenge: form.challenge,
        proficiency: form.proficiency,
        type: form.monsterType,
        combatType: (form.combatType as MonsterCombatType) || 'monster',
        flag: (form.flag as MonsterFlag) || 'active',
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
      damageResistances: (parsed as any).damageResistances || '',
      damageImmunities: (parsed as any).damageImmunities || '',
      conditionImmunities: (parsed as any).conditionImmunities || '',
      damageVulnerabilities: (parsed as any).damageVulnerabilities || '',
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
      epicEnabled: parsed.monsterAbilities.epicActions.enabled,
      epicActions: epicActionsToText(parsed.monsterAbilities.epicActions.actions),
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
              <NumberInput value={String(form.maxLevel)} onChange={event => update('maxLevel', event.target.value)} type="number" min={0} placeholder="Max level" />
              <label className="inline-check">
                <input type="checkbox" checked={Boolean(form.hasDice)} onChange={event => update('hasDice', event.target.checked)} />
                Has dice damage
              </label>
              {Boolean(form.hasDice) && (
                <>
                  <NumberInput value={String(form.defaultDiceCount)} onChange={event => update('defaultDiceCount', event.target.value)} type="number" min={0} placeholder="Default dice count" />
                  <NumberInput value={String(form.defaultDiceSides)} onChange={event => update('defaultDiceSides', event.target.value)} type="number" min={0} placeholder="Default die sides" />
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
              <label className="inline-check">
                <input type="checkbox" checked={Boolean(form.isCounterspell)} onChange={event => update('isCounterspell', event.target.checked)} />
                Counterspell
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
              <NumberInput value={String(form.hp)} onChange={event => update('hp', event.target.value)} type="number" min={1} placeholder="HP" />
              <NumberInput value={String(form.ac)} onChange={event => update('ac', event.target.value)} type="number" min={1} placeholder="AC" />
              <NumberInput value={String(form.maxReactions)} onChange={event => update('maxReactions', event.target.value)} type="number" min={0} placeholder="Reactions per round" />
              <input value={String(form.speed)} onChange={event => update('speed', event.target.value)} placeholder="Speed" />
              <input value={String(form.stats)} onChange={event => update('stats', event.target.value)} placeholder="Stats: Str 10, Dex 14, Con 12, Int 10, Wis 14, Cha 13" />
              <input value={String(form.saves)} onChange={event => update('saves', event.target.value)} placeholder="Saving throws" />
              <input value={String(form.skills)} onChange={event => update('skills', event.target.value)} placeholder="Skills" />
              <input value={String(form.senses)} onChange={event => update('senses', event.target.value)} placeholder="Senses" />
              <input value={String(form.languages)} onChange={event => update('languages', event.target.value)} placeholder="Languages" />
              <input value={String(form.damageResistances)} onChange={event => update('damageResistances', event.target.value)} placeholder="Damage resistances" />
              <input value={String(form.damageImmunities)} onChange={event => update('damageImmunities', event.target.value)} placeholder="Damage immunities" />
              <input value={String(form.conditionImmunities)} onChange={event => update('conditionImmunities', event.target.value)} placeholder="Condition immunities" />
              <input value={String(form.damageVulnerabilities)} onChange={event => update('damageVulnerabilities', event.target.value)} placeholder="Damage vulnerabilities" />
              <input value={String(form.challenge)} onChange={event => update('challenge', event.target.value)} placeholder="Challenge" />
              <input value={String(form.proficiency)} onChange={event => update('proficiency', event.target.value)} placeholder="Proficiency" />
              <input value={String(form.monsterType)} onChange={event => update('monsterType', event.target.value)} placeholder="Type" />
              <select value={String(form.combatType || 'monster')} onChange={event => update('combatType', event.target.value)}>
                <option value="monster">Role: Monster</option>
                <option value="spellcaster">Role: Spellcaster</option>
                <option value="elite">Role: Elite</option>
                <option value="leader">Role: Leader</option>
                <option value="ranged">Role: Ranged</option>
                <option value="controller">Role: Controller</option>
              </select>
              <select value={String(form.flag || 'active')} onChange={event => update('flag', event.target.value)}>
                <option value="active">Flag: Active</option>
                <option value="inactive">Flag: Inactive</option>
                <option value="unused">Flag: Unused</option>
              </select>
              <input value={String(form.size)} onChange={event => update('size', event.target.value)} placeholder="Size" />
              <NumberInput value={String(form.initBonus)} onChange={event => update('initBonus', event.target.value)} type="number" placeholder="Initiative bonus" />
              <label className="inline-check">
                <input type="checkbox" checked={Boolean(form.powerEnabled)} onChange={event => update('powerEnabled', event.target.checked)} />
                Power resource
              </label>
              <NumberInput value={String(form.maxPower)} onChange={event => update('maxPower', event.target.value)} type="number" min={0} placeholder="Max power" />
              <NumberInput value={String(form.currentPower)} onChange={event => update('currentPower', event.target.value)} type="number" min={0} placeholder="Starting power" />
              <input value={String(form.powerName)} onChange={event => update('powerName', event.target.value)} placeholder="Power name" />
              <label className="inline-check">
                <input type="checkbox" checked={Boolean(form.legendaryEnabled)} onChange={event => update('legendaryEnabled', event.target.checked)} />
                Legendary actions
              </label>
              <NumberInput value={String(form.legendaryMax)} onChange={event => update('legendaryMax', event.target.value)} type="number" min={0} placeholder="Legendary actions per round" />
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
    if (key) stats[key] = Math.max(1, Number(match[2]) || 10);
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
  if (kind === 'spell') return `${item.levelLabel || 'Spell'} · ${item.school || 'Unknown school'} · ${Array.isArray(item.classes) ? item.classes.join(', ') : item.classes || 'No classes'}${item.isCounterspell ? ' · Counterspell' : ''}`;
  const groupsList = Array.isArray(item.groups) && item.groups.length ? item.groups.join(', ') : (item.group ? String(item.group) : '');
  return `HP ${item.hp || item.maxHp || '-'} · ${Number(item.encounterPoints) || 0.1} pt${item.dpr ? ` · DPR ${item.dpr}` : ''}${groupsList ? ` · ${groupsList}` : ''}`;
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
