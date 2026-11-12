import { NumberInput } from './NumberInput';
import { AoeResolver } from './AoeResolver';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { MarkdownEditor, MarkdownRenderer } from './Markdown';
import type {
  AbilityKey,
  CalendarRecord,
  CalendarRecordType,
  ClientRole,
  GameAction,
  GameState,
  PartyCheckResult,
  ToolbeltNote,
  ToolbeltNoteType,
  WorldCalendarState
} from '../shared/types';
import {
  ABILITIES,
  SKILLS,
  abilityCheckBonus,
  abilityModifier,
  adjustedAbilityScores,
  saveBonus,
  signed,
  skillBonus
} from '../shared/characterSheet';
import { type DiceRollMode, type DiceRollResult, rollDiceExpression } from '../shared/dice';
import {
  MONTHS,
  WEEKDAYS,
  gregorianDate,
  daysInMonth,
  formatDateKey,
  parseCalendarDateKey,
  compareCalendarDates,
  isTriggerDue,
  formatDisplayDate
} from '../shared/calendar';

export interface DiceRollRequest {
  expression: string;
  key?: number;
}

interface Props {
  role: ClientRole;
  state: GameState;
  submitAction: (action: GameAction) => Promise<unknown>;
  diceRequest?: DiceRollRequest | null;
}

const NAME_POOL = ['Kael Voss', 'Mira Thorn', 'Orin Vale', 'Selka Reed', 'Dain Crowmere', 'Astra Nyx', 'Tovin Glass', 'Lysa Marrow', 'Bram Ashford', 'Nera Quill'];


export function Toolbelt({ role, state, submitAction, diceRequest }: Props) {
  const [openTool, setOpenTool] = useState<string | null>(null);
  const [targetCalendarDateKey, setTargetCalendarDateKey] = useState<string | null>(null);
  const [targetNoteId, setTargetNoteId] = useState<string | null>(null);
  const [diceExpression, setDiceExpression] = useState('1d20');
  const isDM = role === 'dm';

  const calendar = state.toolbelt?.calendar || { weekday: 'Tuesday', day: 23, month: 'December', year: 502, records: [] };
  const notes = state.toolbelt?.notes || [];

  const dueTriggers = useMemo(() => {
    return (calendar.records || []).filter(r => r.type === 'trigger' && !r.completed && isTriggerDue(calendar, r));
  }, [calendar]);

  const uncompletedTempNotes = useMemo(() => {
    return notes.filter(n => n.type === 'temp' && !n.completed);
  }, [notes]);

  const todoCount = dueTriggers.length + uncompletedTempNotes.length;

  const unnotifiedDueTrigger = useMemo(() => {
    if (!isDM) return null;
    return (calendar.records || []).find(r => r.type === 'trigger' && !r.completed && !r.notified && isTriggerDue(calendar, r)) || null;
  }, [isDM, calendar]);

  useEffect(() => {
    if (!diceRequest?.expression) return;
    setDiceExpression(diceRequest.expression);
    setOpenTool('dice');
  }, [diceRequest?.expression, diceRequest?.key]);

  useEffect(() => {
    function handleOpenDice(event: Event) {
      const detail = (event as CustomEvent<{ expression?: string }>).detail;
      if (detail?.expression) {
        setDiceExpression(detail.expression);
      }
      setOpenTool('dice');
    }
    window.addEventListener('dnd:open-dice-roller', handleOpenDice);
    return () => window.removeEventListener('dnd:open-dice-roller', handleOpenDice);
  }, []);

  return (
    <>
      <div className="toolbelt vertical" aria-label="Table toolbelt">
        <div className="toolbelt-inner">
          {isDM && (
            <button
              className={`toolbelt-btn tool-todo ${todoCount > 0 ? 'has-items' : ''}`}
              onClick={() => setOpenTool('todo')}
              title={`${todoCount} aktivních úkolů v To-Do`}
            >
              {`To-Do (${todoCount})`}
            </button>
          )}
          {isDM && <button className="toolbelt-btn tool-party" onClick={() => setOpenTool('party')}>Party Checks</button>}
          <button className="toolbelt-btn tool-dice" onClick={() => setOpenTool('dice')}>Dice Roller</button>
          {isDM && <button className="toolbelt-btn tool-aoe" onClick={() => setOpenTool('aoe')}>AOE Resolver</button>}
          {isDM && <button className="toolbelt-btn tool-improv" onClick={() => setOpenTool('improv')}>Improv</button>}
          {isDM && <button className="toolbelt-btn tool-calendar" onClick={() => setOpenTool('calendar')}>Calendar</button>}
          {isDM && <button className="toolbelt-btn tool-notes" onClick={() => setOpenTool('notes')}>Notepad</button>}
        </div>
      </div>
      {openTool === 'todo' && isDM && (
        <TodoModal
          state={state}
          submitAction={submitAction}
          onClose={() => setOpenTool(null)}
          onOpenCalendar={(dateKey) => {
            setTargetCalendarDateKey(dateKey);
            setOpenTool('calendar');
          }}
          onOpenNotepad={(noteId) => {
            setTargetNoteId(noteId);
            setOpenTool('notes');
          }}
        />
      )}
      {openTool === 'party' && isDM && <PartyChecksModal state={state} submitAction={submitAction} onClose={() => setOpenTool(null)} />}
      {openTool === 'dice' && <DiceRollerModal state={state} submitAction={submitAction} initialExpression={diceExpression} onExpressionChange={setDiceExpression} onClose={() => setOpenTool(null)} />}
      {openTool === 'aoe' && isDM && <AoeResolver state={state} submitAction={submitAction} onClose={() => setOpenTool(null)} />}
      {openTool === 'improv' && isDM && <ImprovModal state={state} submitAction={submitAction} onClose={() => setOpenTool(null)} />}
      {openTool === 'calendar' && isDM && (
        <CalendarModal
          state={state}
          submitAction={submitAction}
          initialDateKey={targetCalendarDateKey}
          onClose={() => {
            setOpenTool(null);
            setTargetCalendarDateKey(null);
          }}
        />
      )}
      {openTool === 'notes' && isDM && (
        <NotepadModal
          state={state}
          submitAction={submitAction}
          initialNoteId={targetNoteId}
          onClose={() => {
            setOpenTool(null);
            setTargetNoteId(null);
          }}
        />
      )}
      {unnotifiedDueTrigger && (
        <TriggerAlertModal
          trigger={unnotifiedDueTrigger}
          calendar={calendar}
          submitAction={submitAction}
          onViewInCalendar={() => {
            setTargetCalendarDateKey(unnotifiedDueTrigger.dateKey);
            setOpenTool('calendar');
          }}
        />
      )}
    </>
  );
}


function combatPlayers(state: GameState) {
  return state.characters.filter(character => character.type === 'player' && character.activeInCombat !== false);
}


function PartyChecksModal({ state, submitAction, onClose }: { state: GameState; submitAction: Props['submitAction']; onClose: () => void }) {
  const [mode, setMode] = useState<'save' | 'ability' | 'skill'>('save');
  const [ability, setAbility] = useState<AbilityKey>('strength');
  const [skill, setSkill] = useState('perception');
  const [dc, setDc] = useState('');
  const [includeCrow, setIncludeCrow] = useState(false);
  const [includeAstria, setIncludeAstria] = useState(false);
  const [rollMode, setRollMode] = useState<DiceRollMode>('normal');
  const [inspirations, setInspirations] = useState<Record<string, 'none' | 'd12' | 'd20'>>({});
  const [passWithoutTrace, setPassWithoutTrace] = useState(false);
  const isStealth = mode === 'skill' && skill === 'stealth';
  const checkKey = `${mode}:${mode === 'skill' ? skill : ability}`;
  const results = state.toolbelt?.partyChecks?.[checkKey] || {};
  const characters = combatPlayers(state);
  const crowBonus = auraBonus(state, 'crow', 'wisdom');
  const astriaBonus = auraBonus(state, 'astria', 'intelligence');
  const aura = (includeCrow ? crowBonus : 0) + (includeAstria ? astriaBonus : 0);
  const globalBonus = aura + (isStealth && passWithoutTrace ? 10 : 0);
  const dcNumber = Number(dc);

  const rows = characters.map(character => {
    const adjusted = adjustedAbilityScores(character);
    const base = mode === 'save'
      ? saveBonus(character, ability, adjusted.scores)
      : mode === 'ability'
        ? abilityCheckBonus(character, ability, adjusted.scores)
        : skillBonus(character, skill, adjusted.scores);
    const value = base + globalBonus;
    const inspiration = inspirations[character.id] || 'none';
    return {
      character,
      value,
      base,
      inspiration,
      result: results[character.id],
      chance: dc ? partySuccessChancePercent(dcNumber, value, rollMode, inspiration, mode !== 'save') : null
    };
  }).sort((a, b) => b.value - a.value);

  function record(entries: Array<PartyCheckResult & { characterId: string }>) {
    return submitAction({ type: 'toolbelt.partyCheck.record', page: 'toolbelt', payload: { checkKey, results: entries } });
  }

  function rolled(row: typeof rows[number]) {
    const d20 = rollDiceExpression('1d20', { mode: rollMode });
    const inspiration = row.inspiration === 'none' ? null : rollDiceExpression(`1${row.inspiration}`, { mode: mode === 'save' ? 'normal' : 'advantage' });
    return {
      characterId: row.character.id, total: d20.total + row.base + (inspiration?.total || 0), natural: d20.total,
      detail: `${describeDiceResult(d20)}; base ${signed(row.base)}${inspiration ? `; inspiration ${describeDiceResult(inspiration)}` : ''}`
    };
  }

  function passed(result?: PartyCheckResult) {
    if (!result || dc === '') return null;
    if (result.natural === 1) return false;
    if (result.natural === 20) return true;
    return result.total + globalBonus >= dcNumber;
  }
  const successes = rows.filter(row => passed(row.result) === true).length;
  const failures = rows.filter(row => passed(row.result) === false).length;

  function setInspiration(characterId: string, die: 'd12' | 'd20', checked: boolean) {
    setInspirations(current => ({ ...current, [characterId]: checked ? die : 'none' }));
  }

  const title = mode === 'save'
    ? `${ABILITIES.find(item => item.key === ability)?.short} Save`
    : mode === 'ability'
      ? `${ABILITIES.find(item => item.key === ability)?.short} Check`
      : `${SKILLS.find(item => item.key === skill)?.label} Check`;

  return (
    <Modal>
      <div className="modal-card sheet-editor-modal">
        <div className="section-title-row">
          <div>
            <h2>Party Checks</h2>
            <p>Active combat characters only. Enter totals including the character bonus and inspiration, before auras / Pass without Trace. Rolls are saved automatically.</p>
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <div className="party-check-controls expanded">
          <select value={mode} onChange={event => setMode(event.target.value as 'save' | 'ability' | 'skill')}>
            <option value="save">Saving throw</option>
            <option value="ability">Ability check</option>
            <option value="skill">Skill check</option>
          </select>
          {mode !== 'skill' ? (
            <select value={ability} onChange={event => setAbility(event.target.value as AbilityKey)}>
              {ABILITIES.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
          ) : (
            <select value={skill} onChange={event => setSkill(event.target.value)}>
              {SKILLS.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
          )}
          <NumberInput value={dc} onChange={event => setDc(event.target.value)} type="number" min={1} max={50} placeholder="DC" aria-label="Difficulty class" />
          <select value={rollMode} onChange={event => setRollMode(event.target.value as DiceRollMode)} aria-label="Party check roll mode">
            <option value="normal">Normal</option>
            <option value="advantage">Advantage</option>
            <option value="disadvantage">Disadvantage</option>
          </select>
          <label className="inline-check"><input type="checkbox" checked={includeCrow} onChange={event => setIncludeCrow(event.target.checked)} /> Crow aura {signed(crowBonus)}</label>
          <label className="inline-check"><input type="checkbox" checked={includeAstria} onChange={event => setIncludeAstria(event.target.checked)} /> Astria aura {signed(astriaBonus)}</label>
          {isStealth && <label className="inline-check"><input type="checkbox" checked={passWithoutTrace} onChange={event => setPassWithoutTrace(event.target.checked)} /> Pass without Trace +10</label>}
        </div>

        <div className="button-row">
          <button className="btn purple" onClick={() => { setMode('skill'); setSkill('stealth'); }}>Stealth</button>
          <button className="btn success" onClick={() => record(rows.map(rolled))}>Roll all</button>
          <button className="btn" onClick={() => record(rows.filter(row => !row.result).map(rolled))}>Roll empty</button>
          <button className="btn danger" onClick={() => submitAction({ type: 'toolbelt.partyCheck.clear', page: 'toolbelt', payload: { checkKey } })}>Clear results</button>
        </div>
        <div className="stealth-summary">Successes {successes} / Failures {failures}</div>

        <div className="party-check-table">
          <div className="party-check-header">
            <span>Character</span>
            <span>{title}</span>
            <span>Inspiration</span>
            <span>Chance</span>
            <span>Result</span>
          </div>
          {rows.map((row) => {
            const { character, value, base, inspiration, chance, result } = row;
            const success = passed(result);
            return <div className={`party-check-row ${success === null ? '' : success ? 'passed' : 'failed'}`} key={character.id}>
              <div>
                <strong>{character.name}</strong>
                <span>{[
                  `base ${signed(base)}`,
                  globalBonus ? `global ${signed(globalBonus)}` : ''
                ].filter(Boolean).join(', ') || `PB ${signed(character.proficiencyBonus || 0)}`}</span>
              </div>
              <b>{signed(value)}</b>
              <div className="inspiration-controls">
                <label className="inline-check">
                  <input type="checkbox" checked={inspiration === 'd12'} onChange={event => setInspiration(character.id, 'd12', event.target.checked)} />
                  d12
                </label>
                <label className="inline-check">
                  <input type="checkbox" checked={inspiration === 'd20'} onChange={event => setInspiration(character.id, 'd20', event.target.checked)} />
                  d20
                </label>
              </div>
              <b>{chance === null ? '-' : `${chance}%`}</b>
              <div className="party-result">
                <NumberInput key={`${checkKey}:${character.id}`} className="small-input" value={result?.total ?? ''}
                  aria-label={`${character.name} check result`}
                  onCommit={total => record([{ characterId: character.id, total, natural: null, detail: 'Manual result' }])} />
                <button className="btn small" onClick={() => record([rolled(row)])}>Roll</button>
                <span title={result?.detail}>{result ? `${result.total + globalBonus}${success === null ? '' : success ? ' · Success' : ' · Failure'}` : 'Unrecorded'}</span>
                {result && <span>{result.detail}</span>}
              </div>
            </div>;
          })}
        </div>
      </div>
    </Modal>
  );
}


function DiceRollerModal({
  state,
  submitAction,
  initialExpression = '1d20',
  onExpressionChange,
  onClose
}: {
  state: GameState;
  submitAction: Props['submitAction'];
  initialExpression?: string;
  onExpressionChange?: (expression: string) => void;
  onClose: () => void;
}) {
  const [expression, setExpression] = useState(initialExpression);
  const [mode, setMode] = useState<DiceRollMode>('normal');
  const [rerollOnes, setRerollOnes] = useState(false);
  const [error, setError] = useState('');
  const entries = useMemo(() => Object.values(state.toolbelt?.diceRolls || {}).flat().sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp))), [state.toolbelt?.diceRolls]);

  useEffect(() => {
    setExpression(initialExpression);
  }, [initialExpression]);

  function updateExpression(next: string) {
    setExpression(next);
    onExpressionChange?.(next);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const result = rollDiceExpression(expression, { mode, rerollOnes });
      await submitAction({
        type: 'toolbelt.dice.add',
        page: 'toolbelt',
        payload: {
          expression: result.normalized,
          total: result.total,
          detail: describeDiceResult(result),
          mode,
          rerollOnes
        }
      });
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not roll that expression.');
    }
  }

  return (
    <Modal>
      <div className="modal-card dice-modal">
        <div className="section-title-row">
          <div>
            <h2>Dice Roller</h2>
            <p>Roll expressions like 4d4+7d6+10 or 3*(1d20+2*3).</p>
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <form className="dice-form" onSubmit={submit}>
          <input value={expression} onChange={event => updateExpression(event.target.value)} aria-label="Dice expression" />
          <select value={mode} onChange={event => setMode(event.target.value as DiceRollMode)} aria-label="Roll mode">
            <option value="normal">Normal</option>
            <option value="advantage">Advantage</option>
            <option value="disadvantage">Disadvantage</option>
          </select>
          <label className="inline-check dice-check">
            <input type="checkbox" checked={rerollOnes} onChange={event => setRerollOnes(event.target.checked)} />
            Reroll 1s
          </label>
          <button className="btn success" type="submit">Roll</button>
        </form>
        {error && <p className="warning-text">{error}</p>}

        <div className="dice-log" aria-label="Dice log">
          {entries.length === 0 && <p className="empty">No rolls yet.</p>}
          {entries.map(entry => (
            <div className="dice-log-entry" key={entry.id}>
              <div className="dice-log-summary">
                <strong>{entry.actorName}: {entry.expression}</strong>
                <b>{entry.total}</b>
              </div>
              <span>{entry.mode}{entry.rerollOnes ? ' / reroll 1s' : ''}</span>
              <p>{entry.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}


function ImprovModal({ state, submitAction, onClose }: { state: GameState; submitAction: Props['submitAction']; onClose: () => void }) {
  function generate() {
    const name = NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)];
    submitAction({ type: 'toolbelt.improv.add', page: 'toolbelt', payload: { name } });
  }

  return (
    <Modal>
      <div className="modal-card tool-modal">
        <div className="section-title-row">
          <div><h2>Improv A Character</h2><p>Random names, last five saved.</p></div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <button className="btn success" onClick={generate}>Generate Name</button>
        <div className="tool-list">
          {(state.toolbelt?.improvNames || []).map(entry => <div key={entry.id} className="tool-list-row"><strong>{entry.name}</strong><span>{new Date(entry.timestamp).toLocaleTimeString()}</span></div>)}
        </div>
      </div>
    </Modal>
  );
}



function cleanPreviewText(raw: string, maxWords = 6): string {
  if (!raw) return '';
  const cleaned = raw
    .replace(/#+\s*/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/@\[?([^\]]+)\]?/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned.split(' ');
  return words.length > maxWords ? words.slice(0, maxWords).join(' ') + '…' : cleaned;
}

function CalendarModal({
  state,
  submitAction,
  initialDateKey,
  onClose
}: {
  state: GameState;
  submitAction: Props['submitAction'];
  initialDateKey?: string | null;
  onClose: () => void;
}) {
  const calendar = state.toolbelt?.calendar || { weekday: 'Tuesday', day: 23, month: 'December', year: 502, records: [] };
  const [viewMonth, setViewMonth] = useState(MONTHS.indexOf(calendar.month) >= 0 ? MONTHS.indexOf(calendar.month) : 11);
  const [viewYear, setViewYear] = useState(calendar.year || 502);
  const [selectedDay, setSelectedDay] = useState(calendar.day || 23);
  const [editing, setEditing] = useState<CalendarRecord | null>(null);
  const [isComposing, setIsComposing] = useState(false);

  // Record Form fields
  const [recordType, setRecordType] = useState<CalendarRecordType>('event');
  const [record, setRecord] = useState('');
  const [recordedDateKey, setRecordedDateKey] = useState(formatDateKey(calendar.year, calendar.month, calendar.day));
  const [eventDateKey, setEventDateKey] = useState(formatDateKey(viewYear, viewMonth, selectedDay));
  const [recordCompleted, setRecordCompleted] = useState(false);

  // Search & Filters
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'event' | 'trigger'>('all');

  useEffect(() => {
    if (!initialDateKey) return;
    const parsed = parseCalendarDateKey(initialDateKey);
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.monthIndex);
      setSelectedDay(parsed.day);
      setEventDateKey(initialDateKey);
    }
  }, [initialDateKey]);

  const month = MONTHS[viewMonth];
  const dateKey = formatDateKey(viewYear, viewMonth, selectedDay);
  const records = (calendar.records || []).filter(item => item.dateKey === dateKey);
  const cells = calendarCells(viewYear, viewMonth);
  const showComposer = isComposing || editing !== null;

  function setCurrentDate() {
    const date = gregorianDate(viewYear, viewMonth, selectedDay);
    submitAction({
      type: 'toolbelt.calendar.setDate',
      page: 'toolbelt',
      payload: {
        weekday: WEEKDAYS[(date.getDay() + 6) % 7],
        day: selectedDay,
        month,
        year: viewYear
      }
    });
  }

  function handleSelectDay(day: number) {
    setSelectedDay(day);
    const key = formatDateKey(viewYear, viewMonth, day);
    setEventDateKey(key);
    if (!editing) {
      setRecordedDateKey(formatDateKey(calendar.year, calendar.month, calendar.day));
    }
  }

  function openNewRecord(initialType: CalendarRecordType = 'event') {
    setEditing(null);
    setRecord('');
    setRecordType(initialType);
    setRecordCompleted(false);
    setRecordedDateKey(formatDateKey(calendar.year, calendar.month, calendar.day));
    setEventDateKey(dateKey);
    setIsComposing(true);
  }

  function editRecord(item: CalendarRecord) {
    setEditing(item);
    setRecordType(item.type || 'event');
    setRecord(item.text);
    setEventDateKey(item.dateKey);
    setRecordedDateKey(item.recordedDateKey || item.dateKey);
    setRecordCompleted(Boolean(item.completed));
    setIsComposing(true);
  }

  function cancelEdit() {
    setEditing(null);
    setIsComposing(false);
    setRecord('');
    setRecordType('event');
    setRecordCompleted(false);
    setRecordedDateKey(formatDateKey(calendar.year, calendar.month, calendar.day));
    setEventDateKey(dateKey);
  }

  async function saveRecord() {
    if (!record.trim()) return;
    const finalDateKey = recordType === 'trigger' ? (eventDateKey || dateKey) : dateKey;
    await submitAction({
      type: 'toolbelt.calendar.record.upsert',
      page: 'toolbelt',
      payload: {
        id: editing?.id,
        type: recordType,
        dateKey: finalDateKey,
        recordedDateKey: recordType === 'trigger' ? recordedDateKey : finalDateKey,
        text: record,
        completed: recordCompleted
      }
    });
    cancelEdit();
  }

  function shiftMonth(delta: number) {
    const next = viewMonth + delta;
    if (next < 0) {
      setViewMonth(11);
      setViewYear(year => year - 1);
      setSelectedDay(1);
      setEventDateKey(formatDateKey(viewYear - 1, 11, 1));
    } else if (next > 11) {
      setViewMonth(0);
      setViewYear(year => year + 1);
      setSelectedDay(1);
      setEventDateKey(formatDateKey(viewYear + 1, 0, 1));
    } else {
      setViewMonth(next);
      const nextDay = Math.min(selectedDay, daysInMonth(viewYear, next));
      setSelectedDay(nextDay);
      setEventDateKey(formatDateKey(viewYear, next, nextDay));
    }
  }

  function jumpToRecordDate(targetKey: string) {
    const parsed = parseCalendarDateKey(targetKey);
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.monthIndex);
      setSelectedDay(parsed.day);
      setEventDateKey(targetKey);
    }
  }

  const matchingRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (calendar.records || []).filter(item => {
      const matchesType = typeFilter === 'all' || (item.type || 'event') === typeFilter;
      if (!matchesType) return false;
      if (!query) return true;
      return (
        item.text.toLowerCase().includes(query) ||
        item.dateKey.toLowerCase().includes(query) ||
        (item.recordedDateKey && item.recordedDateKey.toLowerCase().includes(query))
      );
    });
  }, [search, typeFilter, calendar.records]);

  const filteredDayRecords = records.filter(item => typeFilter === 'all' || (item.type || 'event') === typeFilter);
  const isSearching = searchOpen && (search.trim().length > 0 || typeFilter !== 'all');

  return (
    <Modal className="calendar-modal-backdrop">
      <div className="modal-card tool-modal calendar-modal">
        {/* Compact Single-Row Top Header */}
        <div className="section-title-row" style={{ gap: '12px', flexWrap: 'wrap', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h2>World Calendar</h2>
              <p>{calendar.weekday} {calendar.day} {calendar.month}, year {calendar.year} after the event</p>
            </div>
            <div className="button-row" style={{ gap: '6px' }}>
              <button className="btn small" onClick={() => submitAction({ type: 'toolbelt.calendar.advanceDays', page: 'toolbelt', payload: { days: 1 } })}>+1 Day</button>
              <button className="btn small" onClick={() => submitAction({ type: 'toolbelt.calendar.advanceDays', page: 'toolbelt', payload: { days: 7 } })}>+1 Week</button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginLeft: 'auto' }}>
            {searchOpen ? (
              <>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search calendar by text or date..."
                  autoFocus
                  style={{ width: '240px', padding: '6px 10px', background: '#0f172a', border: '1px solid var(--primary)', borderRadius: '6px', color: 'var(--text)' }}
                />
                <div className="segmented-toggle">
                  <button type="button" className={`segmented-toggle-btn ${typeFilter === 'all' ? 'active' : ''}`} onClick={() => setTypeFilter('all')}>All</button>
                  <button type="button" className={`segmented-toggle-btn ${typeFilter === 'event' ? 'active' : ''}`} onClick={() => setTypeFilter('event')}>Events</button>
                  <button type="button" className={`segmented-toggle-btn warning ${typeFilter === 'trigger' ? 'active' : ''}`} onClick={() => setTypeFilter('trigger')}>⚡ Triggers</button>
                </div>
                <button className="btn small" onClick={() => { setSearch(''); setTypeFilter('all'); setSearchOpen(false); }}>✕ Close Search</button>
              </>
            ) : (
              <button className="btn small" onClick={() => setSearchOpen(true)} title="Prohledávat a filtrovat záznamy kalendáře">
                🔍 Search & Filter
              </button>
            )}
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="calendar-layout">
          {/* Left Panel: Full-Height Month Grid */}
          <div className="calendar-board">
            <div className="calendar-toolbar">
              <button className="btn small" onClick={() => shiftMonth(-1)}>Previous</button>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <strong>{month} {viewYear} AE</strong>
                {(viewMonth !== MONTHS.indexOf(calendar.month) || viewYear !== calendar.year) && (
                  <button
                    className="btn small"
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                    onClick={() => {
                      const mIdx = MONTHS.indexOf(calendar.month);
                      if (mIdx >= 0) setViewMonth(mIdx);
                      setViewYear(calendar.year);
                      setSelectedDay(calendar.day);
                    }}
                  >
                    Today
                  </button>
                )}
              </div>
              <button className="btn small" onClick={() => shiftMonth(1)}>Next</button>
            </div>
            <div className="calendar-weekdays">
              {WEEKDAYS.map(dayName => <span key={dayName}>{dayName.slice(0, 3)}</span>)}
            </div>
            <div className="calendar-grid">
              {cells.map((cell, index) => {
                const key = cell.day ? formatDateKey(viewYear, viewMonth, cell.day) : `empty-${index}`;
                const dayRecords = cell.day ? (calendar.records || []).filter(item => item.dateKey === key) : [];
                const eventCount = dayRecords.length;
                const isCurrent = cell.day === calendar.day && month === calendar.month && viewYear === calendar.year;
                const isSelected = cell.day === selectedDay;
                const hasTrigger = dayRecords.some(r => r.type === 'trigger' && !r.completed);
                const visibleChips = dayRecords.slice(0, 3);
                const extraCount = dayRecords.length - visibleChips.length;

                return (
                  <button
                    key={key}
                    className={`calendar-day ${cell.day ? '' : 'empty'} ${isCurrent ? 'current' : ''} ${isSelected ? 'selected' : ''}`}
                    disabled={!cell.day}
                    onClick={() => cell.day && handleSelectDay(cell.day)}
                  >
                    {cell.day && (
                      <>
                        <div className="calendar-day-header">
                          <span className="calendar-day-num">{cell.day}</span>
                          {eventCount > 0 && (
                            <b style={{ background: hasTrigger ? 'var(--warning, #f59e0b)' : undefined, color: hasTrigger ? '#000' : '#fff' }}>
                              {eventCount}
                            </b>
                          )}
                        </div>
                        {eventCount > 0 && (
                          <div className="calendar-day-events">
                            {visibleChips.map(r => {
                              const isTrig = r.type === 'trigger';
                              const chipText = cleanPreviewText(r.text, 5);
                              return (
                                <div
                                  key={r.id}
                                  className={`calendar-day-chip ${isTrig ? 'trigger' : ''} ${r.completed ? 'completed' : ''}`}
                                  title={r.text}
                                >
                                  {isTrig ? (r.completed ? '✓ ' : '⚡ ') : ''}{chipText || (isTrig ? 'Trigger' : 'Event')}
                                </div>
                              );
                            })}
                            {extraCount > 0 && (
                              <span className="calendar-day-more">+{extraCount} další</span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Dynamic Context View (Search Results OR Composer OR Day Records List) */}
          <div className="calendar-details">
            {isSearching ? (
              <>
                <div className="section-title-row" style={{ paddingBottom: '10px', borderBottom: '1px solid var(--border)', marginBottom: '10px' }}>
                  <div>
                    <h3>🔍 Výsledky hledání ({matchingRecords.length})</h3>
                    <p>{search ? `Dotaz: "${search}"` : `Filtr: ${typeFilter}`}</p>
                  </div>
                  <button className="btn small" onClick={() => { setSearch(''); setTypeFilter('all'); setSearchOpen(false); }}>
                    Zpět na den
                  </button>
                </div>
                <div className="calendar-details-body">
                  {matchingRecords.length === 0 ? (
                    <p className="empty" style={{ margin: '24px 0', textAlign: 'center' }}>Žádné záznamy neodpovídají hledání.</p>
                  ) : (
                    matchingRecords.map(item => {
                      const isTrigger = item.type === 'trigger';
                      const due = isTrigger && isTriggerDue(calendar, item);
                      return (
                        <div className="tool-note" key={item.id} style={{ borderLeft: `3px solid ${isTrigger ? 'var(--warning)' : 'var(--purple)'}` }}>
                          <div className="section-title-row" style={{ alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span className={`badge ${isTrigger ? 'warning' : 'info'}`} style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                {isTrigger ? '⚡ Trigger' : 'Event'}
                              </span>
                              <strong>{formatDisplayDate(item.dateKey)}</strong>
                              {isTrigger && item.recordedDateKey && (
                                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                                  (Zapsáno: {formatDisplayDate(item.recordedDateKey)})
                                </span>
                              )}
                            </div>
                            <div className="button-row">
                              <button className="btn small primary" onClick={() => { jumpToRecordDate(item.dateKey); setSearch(''); setSearchOpen(false); }}>Přejít na den</button>
                              <button className="btn small" onClick={() => { jumpToRecordDate(item.dateKey); editRecord(item); setSearch(''); setSearchOpen(false); }}>Edit</button>
                              <button className="btn danger small" onClick={() => submitAction({ type: 'toolbelt.calendar.record.remove', page: 'toolbelt', payload: { id: item.id } })}>Delete</button>
                            </div>
                          </div>
                          {due && (
                            <label className="inline-check" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="checkbox"
                                checked={Boolean(item.completed)}
                                onChange={() => submitAction({ type: 'toolbelt.calendar.record.toggleComplete', page: 'toolbelt', payload: { id: item.id } })}
                              />
                              <span style={{ color: item.completed ? 'var(--muted)' : 'var(--warning)', fontWeight: item.completed ? 'normal' : 'bold', fontSize: '0.85rem' }}>
                                {item.completed ? 'Dokončeno' : 'Čeká na odškrtnutí (termín nastal)'}
                              </span>
                            </label>
                          )}
                          <MarkdownRenderer text={item.text} />
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : showComposer ? (
              /* Dedicated Add / Edit Mode — takes 100% of right panel */
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
                <div className="section-title-row" style={{ paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <h3>{editing ? 'Upravit záznam' : 'Nový záznam'}</h3>
                    <p>{WEEKDAYS[(gregorianDate(viewYear, viewMonth, selectedDay).getDay() + 6) % 7]} {selectedDay} {month} {viewYear} AE</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div className="segmented-toggle">
                      <button
                        type="button"
                        className={`segmented-toggle-btn ${recordType === 'event' ? 'active' : ''}`}
                        onClick={() => setRecordType('event')}
                      >
                        📅 Event
                      </button>
                      <button
                        type="button"
                        className={`segmented-toggle-btn warning ${recordType === 'trigger' ? 'active' : ''}`}
                        onClick={() => setRecordType('trigger')}
                      >
                        ⚡ Trigger
                      </button>
                    </div>
                    <button className="btn small" onClick={cancelEdit}>← Zpět</button>
                  </div>
                </div>

                {recordType === 'trigger' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '10px', background: '#172033', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                        Datum události (spuštění):
                      </label>
                      <input
                        value={eventDateKey}
                        onChange={e => setEventDateKey(e.target.value)}
                        placeholder="YYYY-Month-D"
                        style={{ width: '100%', padding: '6px 8px', background: '#0f172a', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                        Zapsáno dne:
                      </label>
                      <input
                        value={recordedDateKey}
                        onChange={e => setRecordedDateKey(e.target.value)}
                        placeholder="YYYY-Month-D"
                        style={{ width: '100%', padding: '6px 8px', background: '#0f172a', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)' }}
                      />
                    </div>
                    {compareCalendarDates(calendar, eventDateKey) >= 0 && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label className="inline-check" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="checkbox"
                            checked={recordCompleted}
                            onChange={e => setRecordCompleted(e.target.checked)}
                          />
                          <span style={{ color: 'var(--success, #22c55e)', fontSize: '0.85rem' }}>Označit jako dokončené</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
                  <MarkdownEditor
                    value={record}
                    onChange={setRecord}
                    label={editing ? (recordType === 'trigger' ? 'Edit trigger' : 'Edit event') : (recordType === 'trigger' ? 'New trigger' : 'New event')}
                  />
                </div>

                <div className="button-row" style={{ paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                  <button className="btn success" onClick={saveRecord}>
                    {editing ? (recordType === 'trigger' ? 'Save Trigger' : 'Save Event') : (recordType === 'trigger' ? 'Add Trigger' : 'Add Event')}
                  </button>
                  <button className="btn" onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              /* Default Browse Day Mode — 100% of right panel dedicated to records */
              <>
                <div className="section-title-row" style={{ paddingBottom: '10px', borderBottom: '1px solid var(--border)', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3>{WEEKDAYS[(gregorianDate(viewYear, viewMonth, selectedDay).getDay() + 6) % 7]} {selectedDay} {month}</h3>
                    <p>{records.length} record{records.length === 1 ? '' : 's'}</p>
                  </div>
                  <div className="button-row" style={{ gap: '6px' }}>
                    <button className="btn small" onClick={setCurrentDate} title="Nastavit tento den jako aktuální den kampaně">Set Current</button>
                    <button className="btn success small" onClick={() => openNewRecord('event')}>+ Event</button>
                    <button className="btn warning small" onClick={() => openNewRecord('trigger')}>+ Trigger</button>
                  </div>
                </div>

                <div className="calendar-details-body">
                  {filteredDayRecords.length === 0 ? (
                    <div style={{ margin: 'auto 0', textAlign: 'center', padding: '32px 16px', color: 'var(--muted)' }}>
                      <p style={{ marginBottom: '12px' }}>Žádné záznamy pro tento den.</p>
                      <div className="button-row" style={{ justifyContent: 'center' }}>
                        <button className="btn success small" onClick={() => openNewRecord('event')}>+ Přidat Event</button>
                        <button className="btn warning small" onClick={() => openNewRecord('trigger')}>+ Přidat Trigger</button>
                      </div>
                    </div>
                  ) : (
                    filteredDayRecords.map(item => {
                      const isTrigger = item.type === 'trigger';
                      const due = isTrigger && isTriggerDue(calendar, item);
                      return (
                        <div
                          className="tool-note"
                          key={item.id}
                          style={{
                            borderLeft: `3px solid ${isTrigger ? (item.completed ? 'var(--success)' : 'var(--warning)') : 'var(--purple)'}`,
                            padding: '12px 14px'
                          }}
                        >
                          <div className="section-title-row" style={{ alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span className={`badge ${isTrigger ? 'warning' : 'info'}`} style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 'bold' }}>
                                {isTrigger ? '⚡ Trigger' : 'Event'}
                              </span>
                              {isTrigger && item.recordedDateKey && (
                                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                                  Zapsáno: {formatDisplayDate(item.recordedDateKey)}
                                </span>
                              )}
                              {due && (
                                <label className="inline-check" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginLeft: '4px' }}>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(item.completed)}
                                    onChange={() => submitAction({ type: 'toolbelt.calendar.record.toggleComplete', page: 'toolbelt', payload: { id: item.id } })}
                                  />
                                  <span style={{ color: item.completed ? 'var(--success)' : 'var(--warning)', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                    {item.completed ? 'Dokončeno' : 'Ke splnění'}
                                  </span>
                                </label>
                              )}
                            </div>
                            <div className="button-row">
                              <button className="btn small" onClick={() => editRecord(item)}>Edit</button>
                              <button className="btn danger small" onClick={() => submitAction({ type: 'toolbelt.calendar.record.remove', page: 'toolbelt', payload: { id: item.id } })}>Delete</button>
                            </div>
                          </div>
                          <MarkdownRenderer text={item.text} />
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function NotepadModal({
  state,
  submitAction,
  initialNoteId,
  onClose
}: {
  state: GameState;
  submitAction: Props['submitAction'];
  initialNoteId?: string | null;
  onClose: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [editing, setEditing] = useState<ToolbeltNote | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [date, setDate] = useState(today);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [noteType, setNoteType] = useState<ToolbeltNoteType>('note');
  const [completed, setCompleted] = useState(false);

  // Search & filter
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'note' | 'temp'>('all');

  useEffect(() => {
    if (!initialNoteId) return;
    const found = (state.toolbelt?.notes || []).find(n => n.id === initialNoteId);
    if (found) {
      edit(found);
    }
  }, [initialNoteId, state.toolbelt?.notes]);

  function openNewNote(type: ToolbeltNoteType = 'note') {
    setEditing(null);
    setTitle('');
    setText('');
    setDate(today);
    setNoteType(type);
    setCompleted(false);
    setIsComposing(true);
  }

  function edit(note: ToolbeltNote) {
    setEditing(note);
    setDate(note.date);
    setTitle(note.title);
    setText(note.text);
    setNoteType(note.type || 'note');
    setCompleted(Boolean(note.completed));
    setIsComposing(true);
  }

  function cancel() {
    setEditing(null);
    setIsComposing(false);
    setTitle('');
    setText('');
    setDate(today);
    setNoteType('note');
    setCompleted(false);
  }

  async function save() {
    if (!title.trim() && !text.trim()) return;
    await submitAction({
      type: 'toolbelt.note.upsert',
      page: 'toolbelt',
      payload: {
        id: editing?.id,
        type: noteType,
        date,
        title: title || (noteType === 'temp' ? 'Temp note' : 'Note'),
        text,
        completed
      }
    });
    cancel();
  }

  const allNotes = [...(state.toolbelt?.notes || [])].sort((a, b) => {
    const dateCompare = String(b.date).localeCompare(String(a.date));
    if (dateCompare !== 0) return dateCompare;
    return String(b.timestamp).localeCompare(String(a.timestamp));
  });

  const filteredNotes = allNotes.filter(note => {
    if (filterType !== 'all' && (note.type || 'note') !== filterType) return false;
    if (!search.trim()) return true;
    const query = search.trim().toLowerCase();
    return (
      note.title.toLowerCase().includes(query) ||
      note.text.toLowerCase().includes(query) ||
      note.date.toLowerCase().includes(query)
    );
  });

  const showEditor = isComposing || editing !== null;
  const activeTempCount = allNotes.filter(n => n.type === 'temp' && !n.completed).length;

  return (
    <Modal>
      <div className="modal-card tool-modal notepad-modal">
        {/* Compact Header */}
        <div className="section-title-row" style={{ paddingBottom: '10px', borderBottom: '1px solid var(--border)', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2>Notepad</h2>
            <p>{allNotes.length} poznámek celkem · {activeTempCount} aktivních temp v To-Do</p>
          </div>
          <div className="button-row" style={{ gap: '8px' }}>
            {showEditor ? (
              <button className="btn" onClick={cancel}>← Zpět na seznam</button>
            ) : (
              <>
                <button className="btn success" onClick={() => openNewNote('note')}>+ New Note</button>
                <button className="btn warning" onClick={() => openNewNote('temp')}>+ New Temp (To-Do)</button>
              </>
            )}
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        </div>

        {showEditor ? (
          /* Dedicated Full-Space Editor Mode */
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', background: '#172033', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div className="segmented-toggle">
                <button
                  type="button"
                  className={`segmented-toggle-btn ${noteType === 'note' ? 'active' : ''}`}
                  onClick={() => setNoteType('note')}
                >
                  📝 Note (Trvalá)
                </button>
                <button
                  type="button"
                  className={`segmented-toggle-btn warning ${noteType === 'temp' ? 'active' : ''}`}
                  onClick={() => setNoteType('temp')}
                >
                  📌 Temp (Do To-Do)
                </button>
              </div>
              <input
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder="Title"
                style={{ flex: '1 1 220px', width: 'auto' }}
              />
              <input
                value={date}
                onChange={event => setDate(event.target.value)}
                type="date"
                aria-label="Note date"
                style={{ width: '160px' }}
              />
              {noteType === 'temp' && (
                <label className="inline-check" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="checkbox"
                    checked={completed}
                    onChange={e => setCompleted(e.target.checked)}
                  />
                  <span style={{ color: completed ? 'var(--success)' : 'var(--warning)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    {completed ? 'Hotovo' : 'Čeká na přepsání'}
                  </span>
                </label>
              )}
            </div>

            <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
              <MarkdownEditor value={text} onChange={setText} label="Note text" />
            </div>

            <div className="button-row" style={{ paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
              <button className="btn success" onClick={save}>{editing ? 'Save Note' : 'Add Note'}</button>
              <button className="btn" onClick={cancel}>Cancel</button>
            </div>
          </div>
        ) : (
          /* Dedicated Full-Space Browse & Search Mode */
          <>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search notes by title, date or content..."
                style={{ flex: '1 1 240px', width: 'auto', padding: '8px 12px', background: '#0f172a', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }}
              />
              <div className="segmented-toggle">
                <button type="button" className={`segmented-toggle-btn ${filterType === 'all' ? 'active' : ''}`} onClick={() => setFilterType('all')}>
                  All ({allNotes.length})
                </button>
                <button type="button" className={`segmented-toggle-btn ${filterType === 'note' ? 'active' : ''}`} onClick={() => setFilterType('note')}>
                  📝 Permanent
                </button>
                <button type="button" className={`segmented-toggle-btn warning ${filterType === 'temp' ? 'active' : ''}`} onClick={() => setFilterType('temp')}>
                  📌 Temp ({activeTempCount})
                </button>
              </div>
              {search && (
                <button className="btn small" onClick={() => setSearch('')}>Clear</button>
              )}
            </div>

            <div className="notepad-scroll-area">
              <div className="tool-list" style={{ marginTop: 0 }}>
                {filteredNotes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted)' }}>
                    <p style={{ marginBottom: '12px' }}>Žádné poznámky neodpovídají zobrazení.</p>
                    <button className="btn success small" onClick={() => openNewNote('note')}>+ Vytvořit první poznámku</button>
                  </div>
                ) : (
                  filteredNotes.map(note => {
                    const isTemp = note.type === 'temp';
                    return (
                      <div
                        className={`tool-note ${note.completed ? 'note-completed' : ''}`}
                        key={note.id}
                        style={{
                          opacity: note.completed ? 0.75 : 1,
                          borderLeft: `3px solid ${isTemp ? (note.completed ? 'var(--success)' : 'var(--warning)') : 'var(--primary)'}`
                        }}
                      >
                        <div className="section-title-row" style={{ alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span className={`badge ${isTemp ? 'warning' : 'info'}`} style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                              {isTemp ? '📌 Temp' : '📝 Note'}
                            </span>
                            <h3>{note.title}</h3>
                            <span style={{ color: 'var(--muted)', fontSize: '0.84rem' }}>{note.date}</span>
                            {isTemp && (
                              <label className="inline-check" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(note.completed)}
                                  onChange={() => submitAction({ type: 'toolbelt.note.toggleComplete', page: 'toolbelt', payload: { id: note.id } })}
                                />
                                <span style={{ color: note.completed ? 'var(--success)' : 'var(--warning)', fontWeight: 'bold', fontSize: '0.82rem' }}>
                                  {note.completed ? 'Přepsáno / Hotovo' : 'K přepsání'}
                                </span>
                              </label>
                            )}
                          </div>
                          <div className="button-row">
                            <button className="btn small" onClick={() => edit(note)}>Edit</button>
                            <button className="btn danger small" onClick={() => submitAction({ type: 'toolbelt.note.remove', page: 'toolbelt', payload: { id: note.id } })}>Delete</button>
                          </div>
                        </div>
                        <MarkdownRenderer text={note.text} />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function TodoModal({
  state,
  submitAction,
  onClose,
  onOpenCalendar,
  onOpenNotepad
}: {
  state: GameState;
  submitAction: Props['submitAction'];
  onClose: () => void;
  onOpenCalendar: (dateKey: string) => void;
  onOpenNotepad: (noteId: string) => void;
}) {
  const calendar = state.toolbelt?.calendar || { weekday: 'Tuesday', day: 23, month: 'December', year: 502, records: [] };
  const notes = state.toolbelt?.notes || [];

  const [filter, setFilter] = useState<'all' | 'triggers' | 'temp'>('all');
  const [editingItem, setEditingItem] = useState<
    | { kind: 'trigger'; id: string; type: CalendarRecordType; dateKey: string; recordedDateKey: string; text: string; completed: boolean }
    | { kind: 'temp'; id: string; type: ToolbeltNoteType; title: string; date: string; text: string; completed: boolean }
    | null
  >(null);

  const dueTriggers = (calendar.records || []).filter(r => r.type === 'trigger' && !r.completed && isTriggerDue(calendar, r));
  const uncompletedTempNotes = notes.filter(n => n.type === 'temp' && !n.completed);
  const totalCount = dueTriggers.length + uncompletedTempNotes.length;

  function startEditTrigger(record: CalendarRecord) {
    setEditingItem({
      kind: 'trigger',
      id: record.id,
      type: record.type || 'trigger',
      dateKey: record.dateKey,
      recordedDateKey: record.recordedDateKey || record.dateKey,
      text: record.text,
      completed: Boolean(record.completed)
    });
  }

  function startEditTempNote(note: ToolbeltNote) {
    setEditingItem({
      kind: 'temp',
      id: note.id,
      type: note.type || 'temp',
      title: note.title,
      date: note.date,
      text: note.text,
      completed: Boolean(note.completed)
    });
  }

  async function saveEditedItem() {
    if (!editingItem) return;
    if (editingItem.kind === 'trigger') {
      await submitAction({
        type: 'toolbelt.calendar.record.upsert',
        page: 'toolbelt',
        payload: {
          id: editingItem.id,
          type: editingItem.type,
          dateKey: editingItem.dateKey,
          recordedDateKey: editingItem.recordedDateKey,
          text: editingItem.text,
          completed: editingItem.completed
        }
      });
    } else {
      await submitAction({
        type: 'toolbelt.note.upsert',
        page: 'toolbelt',
        payload: {
          id: editingItem.id,
          type: editingItem.type,
          title: editingItem.title || 'Note',
          date: editingItem.date,
          text: editingItem.text,
          completed: editingItem.completed
        }
      });
    }
    setEditingItem(null);
  }

  return (
    <Modal>
      <div className="modal-card tool-modal notepad-modal">
        <div className="section-title-row" style={{ paddingBottom: '10px', borderBottom: '1px solid var(--border)', marginBottom: '12px' }}>
          <div>
            <h2>To-Do ({totalCount})</h2>
            <p>Aktivní triggery kalendáře po datu události a dočasné poznámky čekající na přepsání.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div className="segmented-toggle">
              <button type="button" className={`segmented-toggle-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
                Vše ({totalCount})
              </button>
              <button type="button" className={`segmented-toggle-btn warning ${filter === 'triggers' ? 'active' : ''}`} onClick={() => setFilter('triggers')}>
                ⚡ Triggery ({dueTriggers.length})
              </button>
              <button type="button" className={`segmented-toggle-btn ${filter === 'temp' ? 'active' : ''}`} onClick={() => setFilter('temp')}>
                📌 Temp ({uncompletedTempNotes.length})
              </button>
            </div>
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="notepad-scroll-area">
          {editingItem ? (
            <div style={{ background: '#172033', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div className="section-title-row" style={{ marginBottom: '12px' }}>
                <h3>Upravit položku ({editingItem.kind === 'trigger' ? 'Kalendářní trigger' : 'Dočasná poznámka'})</h3>
                <button className="btn small" onClick={() => setEditingItem(null)}>← Zpět na To-Do</button>
              </div>

              {editingItem.kind === 'trigger' ? (
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="segmented-toggle">
                      <button
                        type="button"
                        className={`segmented-toggle-btn warning ${editingItem.type === 'trigger' ? 'active' : ''}`}
                        onClick={() => setEditingItem({ ...editingItem, type: 'trigger' })}
                      >
                        ⚡ Trigger
                      </button>
                      <button
                        type="button"
                        className={`segmented-toggle-btn ${editingItem.type === 'event' ? 'active' : ''}`}
                        onClick={() => setEditingItem({ ...editingItem, type: 'event' })}
                      >
                        📅 Změnit na Event (vyřadí z To-Do)
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Datum události:</label>
                      <input
                        value={editingItem.dateKey}
                        onChange={e => setEditingItem({ ...editingItem, dateKey: e.target.value })}
                        style={{ width: '100%', padding: '6px', background: '#0f172a', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Datum zapsání:</label>
                      <input
                        value={editingItem.recordedDateKey}
                        onChange={e => setEditingItem({ ...editingItem, recordedDateKey: e.target.value })}
                        style={{ width: '100%', padding: '6px', background: '#0f172a', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)' }}
                      />
                    </div>
                  </div>
                  <MarkdownEditor value={editingItem.text} onChange={val => setEditingItem({ ...editingItem, text: val })} label="Text triggeru" />
                  <div className="button-row" style={{ marginTop: '8px' }}>
                    <button className="btn success" onClick={saveEditedItem}>Uložit změny</button>
                    <button className="btn" onClick={() => setEditingItem(null)}>Zrušit</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="segmented-toggle">
                      <button
                        type="button"
                        className={`segmented-toggle-btn warning ${editingItem.type === 'temp' ? 'active' : ''}`}
                        onClick={() => setEditingItem({ ...editingItem, type: 'temp' })}
                      >
                        📌 Temp
                      </button>
                      <button
                        type="button"
                        className={`segmented-toggle-btn ${editingItem.type === 'note' ? 'active' : ''}`}
                        onClick={() => setEditingItem({ ...editingItem, type: 'note' })}
                      >
                        📝 Změnit na trvalou Note (vyřadí z To-Do)
                      </button>
                    </div>
                    <input
                      value={editingItem.title}
                      onChange={e => setEditingItem({ ...editingItem, title: e.target.value })}
                      placeholder="Title"
                      style={{ flex: '1 1 200px', width: 'auto' }}
                    />
                    <input
                      value={editingItem.date}
                      onChange={e => setEditingItem({ ...editingItem, date: e.target.value })}
                      type="date"
                      aria-label="Note date"
                      style={{ width: '160px' }}
                    />
                  </div>
                  <MarkdownEditor value={editingItem.text} onChange={val => setEditingItem({ ...editingItem, text: val })} label="Text poznámky" />
                  <div className="button-row" style={{ marginTop: '8px' }}>
                    <button className="btn success" onClick={saveEditedItem}>Uložit změny</button>
                    <button className="btn" onClick={() => setEditingItem(null)}>Zrušit</button>
                  </div>
                </div>
              )}
            </div>
          ) : totalCount === 0 ? (
            <p className="empty" style={{ margin: '40px 0', textAlign: 'center', fontSize: '1.1rem' }}>
              🎉 Žádné nevyřešené úkoly! Všechny kalendářní triggery i dočasné poznámky jsou vyřešeny.
            </p>
          ) : (
            <div className="tool-list" style={{ gap: '16px', marginTop: 0 }}>
              {(filter === 'all' || filter === 'triggers') && dueTriggers.length > 0 && (
                <div>
                  <h3 style={{ marginBottom: '10px', color: 'var(--warning, #f59e0b)' }}>
                    ⚡ Kalendářní triggery ({dueTriggers.length})
                  </h3>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {dueTriggers.map(trigger => (
                      <div className="tool-note" key={trigger.id} style={{ borderLeft: '4px solid var(--warning, #f59e0b)' }}>
                        <div className="section-title-row" style={{ alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <input
                              type="checkbox"
                              checked={Boolean(trigger.completed)}
                              onChange={() => submitAction({ type: 'toolbelt.calendar.record.toggleComplete', page: 'toolbelt', payload: { id: trigger.id } })}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                              title="Odškrtnout hotovo"
                            />
                            <span className="badge warning" style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                              Trigger
                            </span>
                            <strong>Událost: {formatDisplayDate(trigger.dateKey)}</strong>
                            {trigger.recordedDateKey && (
                              <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                                (Zapsáno: {formatDisplayDate(trigger.recordedDateKey)})
                              </span>
                            )}
                          </div>
                          <div className="button-row">
                            <button className="btn small primary" onClick={() => onOpenCalendar(trigger.dateKey)}>Přejít do kalendáře</button>
                            <button className="btn small" onClick={() => startEditTrigger(trigger)}>Upravit</button>
                            <button className="btn danger small" onClick={() => submitAction({ type: 'toolbelt.calendar.record.remove', page: 'toolbelt', payload: { id: trigger.id } })}>Smazat</button>
                          </div>
                        </div>
                        <MarkdownRenderer text={trigger.text} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(filter === 'all' || filter === 'temp') && uncompletedTempNotes.length > 0 && (
                <div>
                  <h3 style={{ marginBottom: '10px', color: 'var(--primary, #38bdf8)' }}>
                    📌 Dočasné poznámky k přepsání ({uncompletedTempNotes.length})
                  </h3>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {uncompletedTempNotes.map(note => (
                      <div className="tool-note" key={note.id} style={{ borderLeft: '4px solid var(--primary, #38bdf8)' }}>
                        <div className="section-title-row" style={{ alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <input
                              type="checkbox"
                              checked={Boolean(note.completed)}
                              onChange={() => submitAction({ type: 'toolbelt.note.toggleComplete', page: 'toolbelt', payload: { id: note.id } })}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                              title="Odškrtnout hotovo"
                            />
                            <span className="badge info" style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                              Temp
                            </span>
                            <h3>{note.title}</h3>
                            <span style={{ color: 'var(--muted)', fontSize: '0.84rem' }}>{note.date}</span>
                          </div>
                          <div className="button-row">
                            <button className="btn small primary" onClick={() => onOpenNotepad(note.id)}>Přejít do notepadu</button>
                            <button className="btn small" onClick={() => startEditTempNote(note)}>Upravit</button>
                            <button className="btn danger small" onClick={() => submitAction({ type: 'toolbelt.note.remove', page: 'toolbelt', payload: { id: note.id } })}>Smazat</button>
                          </div>
                        </div>
                        <MarkdownRenderer text={note.text} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function TriggerAlertModal({
  trigger,
  calendar,
  submitAction,
  onViewInCalendar
}: {
  trigger: CalendarRecord;
  calendar: WorldCalendarState;
  submitAction: Props['submitAction'];
  onViewInCalendar: () => void;
}) {
  return (
    <Modal>
      <div className="modal-card tool-modal" style={{ maxWidth: '640px', border: '2px solid var(--warning, #f59e0b)' }}>
        <div className="section-title-row">
          <div>
            <h2 style={{ color: 'var(--warning, #f59e0b)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚡ Kalendářní Trigger aktivován!
            </h2>
            <p style={{ marginTop: '4px' }}>
              Kampaň dosáhla data události <strong>{formatDisplayDate(trigger.dateKey)}</strong> (zapsáno {formatDisplayDate(trigger.recordedDateKey || trigger.dateKey)}).
            </p>
          </div>
        </div>

        <div style={{ margin: '16px 0', padding: '14px', background: '#0f172a', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <MarkdownRenderer text={trigger.text} />
        </div>

        <div className="button-row" style={{ justifyContent: 'flex-end', gap: '10px' }}>
          <button
            className="btn"
            onClick={() => {
              submitAction({ type: 'toolbelt.calendar.record.acknowledge', page: 'toolbelt', payload: { id: trigger.id } });
            }}
          >
            Rozumím (Acknowledge)
          </button>
          <button
            className="btn success"
            onClick={() => {
              submitAction({
                type: 'toolbelt.calendar.record.upsert',
                page: 'toolbelt',
                payload: { ...trigger, completed: true, notified: true }
              });
            }}
          >
            Označit jako hotové
          </button>
          <button
            className="btn purple"
            onClick={() => {
              submitAction({ type: 'toolbelt.calendar.record.acknowledge', page: 'toolbelt', payload: { id: trigger.id } });
              onViewInCalendar();
            }}
          >
            Otevřít v kalendáři
          </button>
        </div>
      </div>
    </Modal>
  );
}

function auraBonus(state: GameState, name: string, ability: AbilityKey) {
  const character = state.characters.find(item => item.type === 'player' && item.name.toLowerCase().includes(name));
  if (!character) return 0;
  return abilityModifier(adjustedAbilityScores(character).scores[ability]);
}

function partySuccessChancePercent(dc: number, modifier: number, rollMode: DiceRollMode, inspiration: 'none' | 'd12' | 'd20', inspirationAdvantage: boolean) {
  if (!Number.isFinite(dc)) return null;
  let success = 0;
  let total = 0;
  const primaryPairs = rollMode === 'normal'
    ? Array.from({ length: 20 }, (_, index) => [index + 1, index + 1])
    : Array.from({ length: 20 }, (_, first) => Array.from({ length: 20 }, (_, second) => [first + 1, second + 1])).flat();
  const inspirationRolls = inspirationOutcomes(inspiration, inspirationAdvantage);

  primaryPairs.forEach(([first, second]) => {
    const primary = rollMode === 'advantage' ? Math.max(first, second) : rollMode === 'disadvantage' ? Math.min(first, second) : first;
    inspirationRolls.forEach(extra => {
      total += 1;
      if (primary === 1) return;
      if (primary === 20 || primary + modifier + extra >= dc) success += 1;
    });
  });

  return Math.round((success / total) * 100);
}

function inspirationOutcomes(inspiration: 'none' | 'd12' | 'd20', advantage: boolean) {
  if (inspiration === 'none') return [0];
  const sides = inspiration === 'd12' ? 12 : 20;
  if (!advantage) return Array.from({ length: sides }, (_, index) => index + 1);
  return Array.from({ length: sides }, (_, first) => Array.from({ length: sides }, (_, second) => Math.max(first + 1, second + 1))).flat();
}

const GREGORIAN_YEAR_OFFSET = 1523;

function gregorianDate(year: number, monthIndex: number, day: number) {
  return new Date(year + GREGORIAN_YEAR_OFFSET, monthIndex, day);
}

function calendarDateKey(year: number, monthIndex: number, day: number) {
  return `${year}-${MONTHS[monthIndex]}-${day}`;
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year + GREGORIAN_YEAR_OFFSET, monthIndex + 1, 0).getDate();
}

function calendarCells(year: number, monthIndex: number) {
  const first = gregorianDate(year, monthIndex, 1);
  const leading = (first.getDay() + 6) % 7;
  const days = daysInMonth(year, monthIndex);
  return [
    ...Array.from({ length: leading }, () => ({ day: null as number | null })),
    ...Array.from({ length: days }, (_, index) => ({ day: index + 1 }))
  ];
}

function describeDiceResult(result: DiceRollResult) {
  return result.terms.map(term => {
    const signPrefix = term.sign < 0 ? '-' : '+';
    if (term.iterations && term.iterations.length > 0) {
      const label = `${signPrefix}${term.repeatCount || term.iterations.length}×(${term.innerNotation || term.notation})`;
      const values = term.iterations.map(iter => `${iter.total} [${describeIterationBreakdown(iter)}]`).join(', ');
      return `${label}: ${values}`;
    }
    if (!term.dice) return `${signPrefix}${term.notation}: ${term.constant}`;
    return `${signPrefix}${term.notation}: ${term.dice.map(formatDieResult).join(', ')}`;
  }).join(' | ').replace(/^\+/, '');
}

function describeIterationBreakdown(result: DiceRollResult): string {
  return result.terms.map((term, index) => {
    const signPrefix = term.sign < 0 ? '-' : index === 0 ? '' : '+';
    if (term.iterations && term.iterations.length > 0) {
      return `${signPrefix}${term.iterations.map(iter => iter.total).join('+')}`;
    }
    if (!term.dice) return `${signPrefix}${term.constant}`;
    const dicePart = term.dice.map(formatDieResult).join('+');
    return `${signPrefix}${dicePart}`;
  }).join('');
}

function formatDieResult(die: NonNullable<DiceRollResult['terms'][number]['dice']>[number]) {
  return `${die.kept}${die.rolls.length > 1 ? ` (${die.rolls.join('/')})` : ''}${die.rerolledOnes.length ? ` rerolled to ${die.rerolledOnes.join('/')}` : ''}`;
}
