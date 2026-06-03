import { FormEvent, useMemo, useState } from 'react';
import { Modal } from './Modal';
import type { AbilityKey, Character, ClientRole, GameState } from '../shared/types';
import {
  ABILITIES,
  SKILLS,
  abilityModifier,
  adjustedAbilityScores,
  saveBonus,
  signed,
  skillBonus
} from '../shared/characterSheet';
import { type DiceRollMode, type DiceRollResult, rollDiceExpression, successChancePercent } from '../shared/dice';

interface Props {
  role: ClientRole;
  state: GameState;
}

export function Toolbelt({ role, state }: Props) {
  const [partyChecksOpen, setPartyChecksOpen] = useState(false);
  const [diceOpen, setDiceOpen] = useState(false);
  const players = useMemo(() => state.characters.filter(character => character.type === 'player'), [state.characters]);

  return (
    <>
      <div className="toolbelt" aria-label="Table toolbelt">
        <div className="toolbelt-inner">
          {role === 'dm' && (
            <button className="toolbelt-btn purple" onClick={() => setPartyChecksOpen(true)}>
              Party Checks
            </button>
          )}
          <button className="toolbelt-btn" onClick={() => setDiceOpen(true)}>
            Dice Roller
          </button>
        </div>
      </div>
      {partyChecksOpen && <PartyChecksModal characters={players} onClose={() => setPartyChecksOpen(false)} />}
      {diceOpen && <DiceRollerModal onClose={() => setDiceOpen(false)} />}
    </>
  );
}

function PartyChecksModal({ characters, onClose }: { characters: Character[]; onClose: () => void }) {
  const [mode, setMode] = useState<'save' | 'ability' | 'skill'>('save');
  const [ability, setAbility] = useState<AbilityKey>('strength');
  const [skill, setSkill] = useState('perception');
  const [dc, setDc] = useState('');
  const dcNumber = Number(dc);

  const rows = characters.map(character => {
    const adjusted = adjustedAbilityScores(character);
    const value = mode === 'save'
      ? saveBonus(character, ability, adjusted.scores)
      : mode === 'ability'
        ? abilityModifier(adjusted.scores[ability])
        : skillBonus(character, skill, adjusted.scores);
    return { character, value, chance: dc ? successChancePercent(dcNumber, value) : null };
  }).sort((a, b) => b.value - a.value);

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
            <p>Compare one save, ability check or skill across all player characters.</p>
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <div className="party-check-controls">
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
        </div>

        <div className="party-check-table">
          <div className="party-check-header">
            <span>Character</span>
            <span>{title}</span>
            <span>Chance</span>
          </div>
          {rows.map(({ character, value, chance }) => (
            <div className="party-check-row" key={character.id}>
              <div>
                <strong>{character.name}</strong>
                <span>PB {signed(character.proficiencyBonus || 0)}</span>
              </div>
              <b>{signed(value)}</b>
              <b>{chance === null ? '-' : `${chance}%`}</b>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function DiceRollerModal({ onClose }: { onClose: () => void }) {
  const [expression, setExpression] = useState('1d20');
  const [mode, setMode] = useState<DiceRollMode>('normal');
  const [rerollOnes, setRerollOnes] = useState(false);
  const [error, setError] = useState('');
  const [log, setLog] = useState<Array<{ id: string; result: DiceRollResult; mode: DiceRollMode; rerollOnes: boolean }>>([]);

  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const result = rollDiceExpression(expression, { mode, rerollOnes });
      setLog(current => [{ id: `${Date.now()}-${Math.random()}`, result, mode, rerollOnes }, ...current].slice(0, 40));
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
          {log.length === 0 && <p className="empty">No rolls yet.</p>}
          {log.map(entry => (
            <div className="dice-log-entry" key={entry.id}>
              <div className="dice-log-summary">
                <strong>{entry.result.normalized}</strong>
                <b>{entry.result.total}</b>
              </div>
              <span>{entry.mode}{entry.rerollOnes ? ' / reroll 1s' : ''}</span>
              <div className="dice-term-list">
                {entry.result.terms.map((term, index) => (
                  <div key={`${term.notation}-${index}`}>
                    <strong>{term.sign < 0 ? '-' : '+'}{term.notation}</strong>
                    <span>{term.dice ? term.dice.map(die => `${die.kept}${die.rolls.length > 1 ? ` (${die.rolls.join('/')})` : ''}${die.rerolledOnes.length ? ` rerolled to ${die.rerolledOnes.join('/')}` : ''}`).join(', ') : term.constant}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
