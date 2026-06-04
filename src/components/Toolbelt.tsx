import { FormEvent, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { MarkdownEditor, MarkdownRenderer } from './Markdown';
import type { AbilityKey, CalendarRecord, Character, ClientRole, GameAction, GameState, ToolbeltNote } from '../shared/types';
import {
  ABILITIES,
  SKILLS,
  abilityModifier,
  adjustedAbilityScores,
  saveBonus,
  signed,
  skillBonus
} from '../shared/characterSheet';
import { type DiceRollMode, type DiceRollResult, rollDiceExpression } from '../shared/dice';

interface Props {
  role: ClientRole;
  state: GameState;
  submitAction: (action: GameAction) => Promise<unknown>;
}

const NAME_POOL = ['Kael Voss', 'Mira Thorn', 'Orin Vale', 'Selka Reed', 'Dain Crowmere', 'Astra Nyx', 'Tovin Glass', 'Lysa Marrow', 'Bram Ashford', 'Nera Quill'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function Toolbelt({ role, state, submitAction }: Props) {
  const [openTool, setOpenTool] = useState<string | null>(null);
  const isDM = role === 'dm';

  return (
    <>
      <div className="toolbelt vertical" aria-label="Table toolbelt">
        <div className="toolbelt-inner">
          {isDM && <button className="toolbelt-btn tool-party" onClick={() => setOpenTool('party')}>Party Checks</button>}
          <button className="toolbelt-btn tool-dice" onClick={() => setOpenTool('dice')}>Dice Roller</button>
          {isDM && <button className="toolbelt-btn tool-improv" onClick={() => setOpenTool('improv')}>Improv</button>}
          {isDM && <button className="toolbelt-btn tool-stealth" onClick={() => setOpenTool('stealth')}>Stealth</button>}
          {isDM && <button className="toolbelt-btn tool-calendar" onClick={() => setOpenTool('calendar')}>Calendar</button>}
          {isDM && <button className="toolbelt-btn tool-notes" onClick={() => setOpenTool('notes')}>Notepad</button>}
        </div>
      </div>
      {openTool === 'party' && isDM && <PartyChecksModal state={state} onClose={() => setOpenTool(null)} />}
      {openTool === 'dice' && <DiceRollerModal state={state} submitAction={submitAction} onClose={() => setOpenTool(null)} />}
      {openTool === 'improv' && isDM && <ImprovModal state={state} submitAction={submitAction} onClose={() => setOpenTool(null)} />}
      {openTool === 'stealth' && isDM && <StealthModal state={state} onClose={() => setOpenTool(null)} />}
      {openTool === 'calendar' && isDM && <CalendarModal state={state} submitAction={submitAction} onClose={() => setOpenTool(null)} />}
      {openTool === 'notes' && isDM && <NotepadModal state={state} submitAction={submitAction} onClose={() => setOpenTool(null)} />}
    </>
  );
}

function combatPlayers(state: GameState) {
  return state.characters.filter(character => character.type === 'player' && character.activeInCombat !== false);
}

function PartyChecksModal({ state, onClose }: { state: GameState; onClose: () => void }) {
  const [mode, setMode] = useState<'save' | 'ability' | 'skill'>('save');
  const [ability, setAbility] = useState<AbilityKey>('strength');
  const [skill, setSkill] = useState('perception');
  const [dc, setDc] = useState('');
  const [includeCrow, setIncludeCrow] = useState(false);
  const [includeAstria, setIncludeAstria] = useState(false);
  const [rollMode, setRollMode] = useState<DiceRollMode>('normal');
  const [inspirations, setInspirations] = useState<Record<string, 'none' | 'd12' | 'd20'>>({});
  const characters = combatPlayers(state);
  const crowBonus = auraBonus(state, 'crow', 'wisdom');
  const astriaBonus = auraBonus(state, 'astria', 'intelligence');
  const aura = (includeCrow ? crowBonus : 0) + (includeAstria ? astriaBonus : 0);
  const dcNumber = Number(dc);

  const rows = characters.map(character => {
    const adjusted = adjustedAbilityScores(character);
    const base = mode === 'save'
      ? saveBonus(character, ability, adjusted.scores)
      : mode === 'ability'
        ? abilityModifier(adjusted.scores[ability])
        : skillBonus(character, skill, adjusted.scores);
    const funyana = funyanaBonus(character, mode, skill);
    const value = base + aura + funyana;
    const inspiration = inspirations[character.id] || 'none';
    return {
      character,
      value,
      base,
      funyana,
      inspiration,
      chance: dc ? partySuccessChancePercent(dcNumber, value, rollMode, inspiration, mode !== 'save') : null
    };
  }).sort((a, b) => b.value - a.value);

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
            <p>Active combat characters only.</p>
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
          <input value={dc} onChange={event => setDc(event.target.value)} type="number" min={1} max={50} placeholder="DC" aria-label="Difficulty class" />
          <select value={rollMode} onChange={event => setRollMode(event.target.value as DiceRollMode)} aria-label="Party check roll mode">
            <option value="normal">Normal</option>
            <option value="advantage">Advantage</option>
            <option value="disadvantage">Disadvantage</option>
          </select>
          <label className="inline-check"><input type="checkbox" checked={includeCrow} onChange={event => setIncludeCrow(event.target.checked)} /> Crow aura {signed(crowBonus)}</label>
          <label className="inline-check"><input type="checkbox" checked={includeAstria} onChange={event => setIncludeAstria(event.target.checked)} /> Astria aura {signed(astriaBonus)}</label>
        </div>

        <div className="party-check-table">
          <div className="party-check-header">
            <span>Character</span>
            <span>{title}</span>
            <span>Inspiration</span>
            <span>Chance</span>
          </div>
          {rows.map(({ character, value, base, funyana, inspiration, chance }) => (
            <div className="party-check-row" key={character.id}>
              <div>
                <strong>{character.name}</strong>
                <span>{[
                  `base ${signed(base)}`,
                  aura ? `aura ${signed(aura)}` : '',
                  funyana ? `Funyana ${signed(funyana)}` : ''
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
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function DiceRollerModal({ state, submitAction, onClose }: { state: GameState; submitAction: Props['submitAction']; onClose: () => void }) {
  const [expression, setExpression] = useState('1d20');
  const [mode, setMode] = useState<DiceRollMode>('normal');
  const [rerollOnes, setRerollOnes] = useState(false);
  const [error, setError] = useState('');
  const entries = useMemo(() => Object.values(state.toolbelt?.diceRolls || {}).flat().sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp))), [state.toolbelt?.diceRolls]);

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
            <p>Roll expressions like 4d4+7d6+10.</p>
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <form className="dice-form" onSubmit={submit}>
          <input value={expression} onChange={event => setExpression(event.target.value)} aria-label="Dice expression" />
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

function StealthModal({ state, onClose }: { state: GameState; onClose: () => void }) {
  const characters = combatPlayers(state);
  const [dc, setDc] = useState('15');
  const [mode, setMode] = useState<DiceRollMode>('normal');
  const [passWithoutTrace, setPassWithoutTrace] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const dcNumber = Number(dc) || 0;

  function bonus(character: Character) {
    return skillBonus(character, 'stealth', adjustedAbilityScores(character).scores);
  }

  function finalValue(character: Character, value: string) {
    return Number(value) + (passWithoutTrace ? 10 : 0);
  }

  function roll(character: Character) {
    const total = rollD20(mode) + bonus(character);
    setValues(current => ({ ...current, [character.id]: String(total) }));
  }

  const filled = characters.map(character => ({ character, value: finalValue(character, values[character.id] || '0'), filled: values[character.id] !== undefined && values[character.id] !== '' }));
  const successes = filled.filter(item => item.filled && item.value >= dcNumber).length;
  const failures = filled.filter(item => item.filled && item.value < dcNumber).length;

  return (
    <Modal>
      <div className="modal-card tool-modal">
        <div className="section-title-row">
          <div><h2>Stealth Check</h2><p>Group stealth for active combat characters.</p></div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <div className="party-check-controls expanded">
          <input value={dc} onChange={event => setDc(event.target.value)} type="number" aria-label="Stealth DC" placeholder="DC" />
          <select value={mode} onChange={event => setMode(event.target.value as DiceRollMode)} aria-label="Stealth roll mode">
            <option value="normal">Normal</option>
            <option value="advantage">Advantage</option>
            <option value="disadvantage">Disadvantage</option>
          </select>
          <label className="inline-check"><input type="checkbox" checked={passWithoutTrace} onChange={event => setPassWithoutTrace(event.target.checked)} /> Pass without Trace +10</label>
          <button className="btn success" onClick={() => characters.filter(character => !values[character.id]).forEach(roll)}>Roll Empty</button>
        </div>
        <div className="stealth-summary">Successes {successes} / Failures {failures}</div>
        <div className="tool-list">
          {characters.map(character => {
            const value = values[character.id] || '';
            const total = value !== '' ? finalValue(character, value) : null;
            const passed = total !== null && total >= dcNumber;
            return (
              <div className={`tool-list-row ${value ? (passed ? 'passed' : 'failed') : ''}`} key={character.id}>
                <strong>{character.name} <span>{signed(bonus(character))}{passWithoutTrace ? ' +10' : ''}</span></strong>
                <input value={value} onChange={event => setValues(current => ({ ...current, [character.id]: event.target.value }))} type="number" aria-label={`${character.name} stealth`} />
                <span>{total === null ? '-' : total}</span>
                <button className="btn small" onClick={() => roll(character)}>Roll</button>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

function CalendarModal({ state, submitAction, onClose }: { state: GameState; submitAction: Props['submitAction']; onClose: () => void }) {
  const calendar = state.toolbelt?.calendar || { weekday: 'Tuesday', day: 23, month: 'December', year: 502, records: [] };
  const [viewMonth, setViewMonth] = useState(MONTHS.indexOf(calendar.month) >= 0 ? MONTHS.indexOf(calendar.month) : 11);
  const [viewYear, setViewYear] = useState(calendar.year || 502);
  const [selectedDay, setSelectedDay] = useState(calendar.day || 23);
  const [editing, setEditing] = useState<CalendarRecord | null>(null);
  const [record, setRecord] = useState('');
  const month = MONTHS[viewMonth];
  const dateKey = calendarDateKey(viewYear, viewMonth, selectedDay);
  const records = (calendar.records || []).filter(item => item.dateKey === dateKey);
  const cells = calendarCells(viewYear, viewMonth);

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

  async function saveRecord() {
    if (!record.trim()) return;
    await submitAction({ type: 'toolbelt.calendar.record.upsert', page: 'toolbelt', payload: { id: editing?.id, dateKey, text: record } });
    setEditing(null);
    setRecord('');
  }

  function editRecord(item: CalendarRecord) {
    setEditing(item);
    setRecord(item.text);
  }

  function shiftMonth(delta: number) {
    const next = viewMonth + delta;
    if (next < 0) {
      setViewMonth(11);
      setViewYear(year => year - 1);
      setSelectedDay(1);
    } else if (next > 11) {
      setViewMonth(0);
      setViewYear(year => year + 1);
      setSelectedDay(1);
    } else {
      setViewMonth(next);
      setSelectedDay(day => Math.min(day, daysInMonth(viewYear, next)));
    }
  }

  return (
    <Modal>
      <div className="modal-card tool-modal calendar-modal">
        <div className="section-title-row">
          <div><h2>World Calendar</h2><p>{calendar.weekday} {calendar.day} {calendar.month}, year {calendar.year} after the event</p></div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <div className="calendar-layout">
          <div className="calendar-board">
            <div className="calendar-toolbar">
              <button className="btn small" onClick={() => shiftMonth(-1)}>Previous</button>
              <strong>{month} {viewYear} AE</strong>
              <button className="btn small" onClick={() => shiftMonth(1)}>Next</button>
            </div>
            <div className="calendar-weekdays">
              {WEEKDAYS.map(dayName => <span key={dayName}>{dayName.slice(0, 3)}</span>)}
            </div>
            <div className="calendar-grid">
              {cells.map((cell, index) => {
                const key = cell.day ? calendarDateKey(viewYear, viewMonth, cell.day) : `empty-${index}`;
                const eventCount = cell.day ? (calendar.records || []).filter(item => item.dateKey === key).length : 0;
                const isCurrent = cell.day === calendar.day && month === calendar.month && viewYear === calendar.year;
                const isSelected = cell.day === selectedDay;
                return (
                  <button
                    key={key}
                    className={`calendar-day ${cell.day ? '' : 'empty'} ${isCurrent ? 'current' : ''} ${isSelected ? 'selected' : ''}`}
                    disabled={!cell.day}
                    onClick={() => cell.day && setSelectedDay(cell.day)}
                  >
                    {cell.day && <><span>{cell.day}</span>{eventCount > 0 && <b>{eventCount}</b>}</>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="calendar-details">
            <div className="section-title-row">
              <div>
                <h3>{WEEKDAYS[(gregorianDate(viewYear, viewMonth, selectedDay).getDay() + 6) % 7]} {selectedDay} {month}</h3>
                <p>{records.length} event{records.length === 1 ? '' : 's'}</p>
              </div>
              <button className="btn success small" onClick={setCurrentDate}>Set Current</button>
            </div>
            <MarkdownEditor value={record} onChange={setRecord} label={editing ? 'Edit event' : 'New event'} />
            <div className="button-row">
              <button className="btn success" onClick={saveRecord}>{editing ? 'Save Event' : 'Add Event'}</button>
              {editing && <button className="btn" onClick={() => { setEditing(null); setRecord(''); }}>Cancel</button>}
            </div>
            <div className="tool-list">
              {records.map(item => (
                <div className="tool-note" key={item.id}>
                  <MarkdownRenderer text={item.text} />
                  <div className="button-row">
                    <button className="btn small" onClick={() => editRecord(item)}>Edit</button>
                    <button className="btn danger small" onClick={() => submitAction({ type: 'toolbelt.calendar.record.remove', page: 'toolbelt', payload: { id: item.id } })}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="button-row rest-row">
          <button className="btn" onClick={() => submitAction({ type: 'toolbelt.calendar.advanceDays', page: 'toolbelt', payload: { days: 1 } })}>+1 Day</button>
          <button className="btn" onClick={() => submitAction({ type: 'toolbelt.calendar.advanceDays', page: 'toolbelt', payload: { days: 7 } })}>+1 Week</button>
        </div>
      </div>
    </Modal>
  );
}

function NotepadModal({ state, submitAction, onClose }: { state: GameState; submitAction: Props['submitAction']; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [editing, setEditing] = useState<ToolbeltNote | null>(null);
  const [date, setDate] = useState(today);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const notes = [...(state.toolbelt?.notes || [])].sort((a, b) => {
    const dateCompare = String(b.date).localeCompare(String(a.date));
    if (dateCompare !== 0) return dateCompare;
    return String(b.timestamp).localeCompare(String(a.timestamp));
  });

  function edit(note: ToolbeltNote) {
    setEditing(note);
    setDate(note.date);
    setTitle(note.title);
    setText(note.text);
  }

  async function save() {
    if (!title.trim() && !text.trim()) return;
    await submitAction({ type: 'toolbelt.note.upsert', page: 'toolbelt', payload: { id: editing?.id, date, title: title || 'Note', text } });
    setEditing(null);
    setTitle('');
    setText('');
    setDate(today);
  }

  return (
    <Modal>
      <div className="modal-card tool-modal">
        <div className="section-title-row">
          <div><h2>Notepad</h2><p>Markdown notes organized by date.</p></div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <div className="form-grid">
          <input value={date} onChange={event => setDate(event.target.value)} type="date" aria-label="Note date" />
          <input value={title} onChange={event => setTitle(event.target.value)} placeholder="Title" />
        </div>
        <MarkdownEditor value={text} onChange={setText} label="Note text" />
        <button className="btn success" onClick={save}>{editing ? 'Save Note' : 'Add Note'}</button>
        <div className="tool-list">
          {notes.map(note => (
            <div className="tool-note" key={note.id}>
              <div className="section-title-row">
                <div><h3>{note.title}</h3><p>{note.date}</p></div>
                <div className="button-row">
                  <button className="btn small" onClick={() => edit(note)}>Edit</button>
                  <button className="btn danger small" onClick={() => submitAction({ type: 'toolbelt.note.remove', page: 'toolbelt', payload: { id: note.id } })}>Delete</button>
                </div>
              </div>
              <MarkdownRenderer text={note.text} />
            </div>
          ))}
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

function funyanaBonus(character: Character, mode: 'save' | 'ability' | 'skill', skill: string) {
  if (!character.name.toLowerCase().includes('funyana')) return 0;
  if (mode === 'save') return 0;
  if (mode === 'skill' && ((character.skillProficiencies || []).includes(skill) || (character.skillExpertise || []).includes(skill))) return 0;
  return Math.floor((character.proficiencyBonus || 0) / 2);
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
    if (!term.dice) return `${term.sign < 0 ? '-' : '+'}${term.notation}: ${term.constant}`;
    return `${term.sign < 0 ? '-' : '+'}${term.notation}: ${term.dice.map(die => `${die.kept}${die.rolls.length > 1 ? ` (${die.rolls.join('/')})` : ''}${die.rerolledOnes.length ? ` rerolled to ${die.rerolledOnes.join('/')}` : ''}`).join(', ')}`;
  }).join(' | ').replace(/^\+/, '');
}

function rollD20(mode: DiceRollMode) {
  const first = Math.floor(Math.random() * 20) + 1;
  if (mode === 'normal') return first;
  const second = Math.floor(Math.random() * 20) + 1;
  return mode === 'advantage' ? Math.max(first, second) : Math.min(first, second);
}
