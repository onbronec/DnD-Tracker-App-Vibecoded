import { useRef, useState } from 'react';
import type { AbilityKey, Character, GameAction, GameState } from '../shared/types';
import { ABILITIES, signed } from '../shared/characterSheet';
import { aoeOutcome, combatSaveBonus, conditionPreview, type AoeCondition } from '../shared/aoe';
import { rollDiceExpression, type DiceRollMode } from '../shared/dice';
import { Modal } from './Modal';
import { NumberInput } from './NumberInput';
import { SearchPicker } from './SearchPicker';

interface Props {
  state: GameState;
  submitAction: (action: GameAction) => Promise<unknown>;
  onClose: () => void;
}
type Result = { total: string; natural: number | null; detail: string };
type TargetOptions = { included: boolean; halfDamage: boolean };

export function AoeResolver({ state, submitAction, onClose }: Props) {
  const [group, setGroup] = useState('players');
  const [ability, setAbility] = useState<AbilityKey>('dexterity');
  const [dc, setDc] = useState('15');
  const [damage, setDamage] = useState('0');
  const [onSuccess, setOnSuccess] = useState<'half' | 'none'>('half');
  const [rollMode, setRollMode] = useState<DiceRollMode>('normal');
  const [conditions, setConditions] = useState<AoeCondition[]>([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Record<string, Result>>({});
  const [options, setOptions] = useState<Record<string, TargetOptions>>({});
  const [pending, setPending] = useState(false);
  const [applied, setApplied] = useState(false);
  const [appliedConditions, setAppliedConditions] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const pickerRef = useRef<HTMLDetailsElement>(null);
  const characters = state.characters.filter(character => character.activeInCombat !== false && !character.isNonMonster && character.monsterData?.entityKind !== 'nonMonster' && !character.id.endsWith('_turn2') && (group === 'all' || character.type === (group === 'players' ? 'player' : 'monster')));
  const targetOptions = (id: string): TargetOptions => options[id] || { included: true, halfDamage: false };
  const included = characters.filter(character => targetOptions(character.id).included);
  const definitions = state.conditionDatabase || [];
  const damageTotal = Number(damage);
  const difficulty = Number(dc);
  const validConditions = conditions.every(selection => {
    const definition = definitions.find(item => item.id === selection.conditionId);
    return definition && (!definition.hasLevels || (Number.isInteger(selection.level) && selection.level >= 1 && selection.level <= (Number(definition.maxLevel) || 20))) && (!(definition.hasDice || definition.defaultDiceCount) || (Number.isInteger(selection.diceCount) && selection.diceCount! >= 1 && Number.isInteger(selection.diceSides) && selection.diceSides! >= 2));
  });
  const ready = validConditions && included.length > 0 && difficulty >= 1 && Number.isSafeInteger(damageTotal) && damageTotal >= 0 && included.every(character => results[character.id]?.total !== undefined && results[character.id].total !== '' && Number.isFinite(Number(results[character.id].total)));

  function previewConditions(character: Character, success: boolean) {
    if (success || !conditions.length) return 'No conditions';
    return conditions.map(selection => {
      const definition = definitions.find(item => item.id === selection.conditionId);
      return definition ? conditionPreview(character, selection, definition) : 'Missing condition';
    }).join(' · ');
  }

  function setOption(id: string, update: Partial<TargetOptions>) {
    setOptions(current => ({ ...current, [id]: { ...(current[id] || { included: true, halfDamage: false }), ...update } }));
  }

  function addCondition(definition: Record<string, unknown>) {
    setConditions(current => [...current, {
      conditionId: String(definition.id), level: 1,
      ...(definition.statAdjustmentType ? { ability: 'strength' as AbilityKey } : {}),
      ...(definition.hasDice || definition.defaultDiceCount ? { diceCount: Number(definition.defaultDiceCount) || 1, diceSides: Number(definition.defaultDiceSides) || 4, damageType: String(definition.defaultDamageType || '') } : {})
    }]);
    setSearch('');
    if (pickerRef.current) pickerRef.current.open = false;
  }

  function updateCondition(id: string, update: Partial<AoeCondition>) {
    setConditions(current => current.map(condition => condition.conditionId === id ? { ...condition, ...update } : condition));
  }

  function rolled(character: Character): Result {
    const roll = rollDiceExpression('1d20', { mode: rollMode });
    const dice = roll.terms[0].dice![0];
    const bonus = combatSaveBonus(character, ability);
    return { total: String(roll.total + bonus), natural: roll.total, detail: `d20: ${dice.rolls.join('/')} → ${roll.total}; save ${signed(bonus)}` };
  }

  function rollAll(emptyOnly = false) {
    setResults(current => ({ ...current, ...Object.fromEntries(included.filter(character => !emptyOnly || !current[character.id] || current[character.id].total === '').map(character => [character.id, rolled(character)])) }));
  }

  function manualResult(id: string, total: string) {
    setResults(current => ({ ...current, [id]: { total, natural: null, detail: 'Manual save total' } }));
  }

  async function apply() {
    if (!ready || pending || applied) return;
    setPending(true);
    setError('');
    const previews = Object.fromEntries(included.map(character => [character.id, previewConditions(character, aoeOutcome(Number(results[character.id].total), results[character.id].natural, difficulty, damageTotal, onSuccess, targetOptions(character.id).halfDamage).success)]));
    try {
      const result = await submitAction({ type: 'combat.aoe.apply', page: 'combat', payload: {
        dc: difficulty, damageTotal, onSuccess, conditions,
        targets: included.map(character => ({ characterId: character.id, saveTotal: Number(results[character.id].total), natural: results[character.id].natural, halfDamage: targetOptions(character.id).halfDamage }))
      } });
      if (result && (result as { ok?: boolean }).ok === false) throw new Error((result as { error?: string }).error || 'AOE could not be applied.');
      setAppliedConditions(previews);
      setApplied(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'AOE could not be applied.');
    } finally {
      setPending(false);
    }
  }

  return <Modal>
    <div className="modal-card aoe-modal">
      <div className="section-title-row">
        <div><h2>AOE Resolver</h2><p>Preview only until Apply. Conditions affect failed saves. Half damage applies after the save result, rounded down.</p></div>
        <button className="btn" disabled={pending} onClick={onClose}>Close</button>
      </div>
      <fieldset className="aoe-workspace" disabled={pending || applied}>
        <div className="form-grid aoe-settings">
          <label className="field-card"><span>Targets</span><select value={group} onChange={event => setGroup(event.target.value)}><option value="players">Players</option><option value="enemies">Enemies</option><option value="all">Players and enemies</option></select></label>
          <label className="field-card"><span>Saving throw</span><select value={ability} onChange={event => { setAbility(event.target.value as AbilityKey); setResults({}); }}>{ABILITIES.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
          <label className="field-card"><span>DC</span><NumberInput min={1} value={dc} onChange={event => setDc(event.target.value)} /></label>
          <label className="field-card"><span>Damage total</span><NumberInput min={0} value={damage} onChange={event => setDamage(event.target.value)} /></label>
          <label className="field-card"><span>Successful save</span><select value={onSuccess} onChange={event => setOnSuccess(event.target.value as 'half' | 'none')}><option value="half">Half damage, no conditions</option><option value="none">No damage or conditions</option></select></label>
          <label className="field-card"><span>Roll mode</span><select value={rollMode} onChange={event => setRollMode(event.target.value as DiceRollMode)}><option value="normal">Normal</option><option value="advantage">Advantage</option><option value="disadvantage">Disadvantage</option></select></label>
        </div>
        <details ref={pickerRef} className="aoe-conditions-picker"><summary>Applied conditions ({conditions.length})</summary>
          <SearchPicker items={definitions.filter(definition => !conditions.some(condition => condition.conditionId === definition.id))} query={search} onQueryChange={setSearch} onSelect={addCondition} placeholder="Search AOE conditions" getId={definition => String(definition.id)} getLabel={definition => String(definition.name)} getMeta={definition => definition.hasLevels ? `Levels, max ${definition.maxLevel || 20}` : String(definition.kind || 'neutral')} />
        </details>
        <div className="aoe-selected-conditions">
          {conditions.map(selection => {
            const definition = definitions.find(item => item.id === selection.conditionId);
            if (!definition) return <div className="aoe-condition" key={selection.conditionId}><span className="warning-text">A selected condition was removed from the database.</span><button className="btn danger small" onClick={() => setConditions(current => current.filter(condition => condition.conditionId !== selection.conditionId))}>Remove</button></div>;
            return <div className="aoe-condition" key={selection.conditionId}>
              <strong>{String(definition.name)}</strong>
              <details><summary>Duration</summary><label>Rounds<NumberInput className="small-input" min={0} value={selection.remainingRounds ?? ''} onChange={event => updateCondition(selection.conditionId, { remainingRounds: Number(event.target.value) || undefined })} placeholder="No limit" /></label></details>
              {Boolean(definition.hasLevels) && <label>Levels to add<NumberInput className="small-input" min={1} max={Number(definition.maxLevel) || 20} value={selection.level} onChange={event => updateCondition(selection.conditionId, { level: Number(event.target.value) })} /></label>}
              {Boolean(definition.statAdjustmentType) && <label>Ability<select value={selection.ability} onChange={event => updateCondition(selection.conditionId, { ability: event.target.value as AbilityKey })}>{ABILITIES.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>}
              {(Boolean(definition.hasDice) || Boolean(definition.defaultDiceCount)) && <>
                <label>Dice<NumberInput className="small-input" min={1} value={selection.diceCount} onChange={event => updateCondition(selection.conditionId, { diceCount: Number(event.target.value) })} /></label>
                <label>Sides<NumberInput className="small-input" min={2} value={selection.diceSides} onChange={event => updateCondition(selection.conditionId, { diceSides: Number(event.target.value) })} /></label>
                <label>Damage type<input className="small-input" value={selection.damageType} onChange={event => updateCondition(selection.conditionId, { damageType: event.target.value })} /></label>
              </>}
              <button className="btn danger small" onClick={() => setConditions(current => current.filter(condition => condition.conditionId !== selection.conditionId))}>Remove</button>
            </div>;
          })}
        </div>
        <div className="button-row aoe-roll-actions"><button className="btn success" onClick={() => rollAll()}>Roll all included</button><button className="btn" onClick={() => rollAll(true)}>Roll empty</button></div>
        <div className="aoe-targets">
          {characters.length === 0 && <p className="empty">No active creatures in this group.</p>}
          {characters.map(character => {
            const preferences = targetOptions(character.id);
            const result = results[character.id];
            const outcome = result && result.total !== '' && Number.isFinite(Number(result.total)) && difficulty >= 1 ? aoeOutcome(Number(result.total), result.natural, difficulty, damageTotal, onSuccess, preferences.halfDamage) : null;
            return <article className={`aoe-target ${!preferences.included ? 'excluded' : ''}`} key={character.id} aria-label={`${character.name} AOE target`}>
              <div className="aoe-target-name"><strong>{character.name}</strong><span>{ABILITIES.find(item => item.key === ability)?.short} save {signed(combatSaveBonus(character, ability))}</span></div>
              <div className="aoe-target-toggles">
                <label className="inline-check"><input type="checkbox" aria-label={`Include ${character.name}`} checked={preferences.included} onChange={event => setOption(character.id, { included: event.target.checked })} />Include</label>
                <label className="inline-check"><input type="checkbox" checked={preferences.halfDamage} onChange={event => setOption(character.id, { halfDamage: event.target.checked })} />Half damage</label>
              </div>
              <div className="aoe-target-roll">
                <label>Save total<input type="number" value={result?.total ?? ''} disabled={!preferences.included} onChange={event => manualResult(character.id, event.target.value)} onBlur={event => { if (event.target.value === '') manualResult(character.id, '0'); }} aria-label={`${character.name} save total`} /></label>
                <button className="btn small" disabled={!preferences.included} onClick={() => setResults(current => ({ ...current, [character.id]: rolled(character) }))}>Roll save</button>
                {result && <small>{result.detail}</small>}
              </div>
              <div className="aoe-target-preview" aria-live="polite">
                {!preferences.included ? 'Excluded — no changes' : outcome ? <>
                  <strong className={outcome.success ? 'success-text' : 'warning-text'}>{outcome.success ? 'Success' : 'Failure'} · Damage {outcome.damage}</strong>
                  <span>{applied ? appliedConditions[character.id] : previewConditions(character, outcome.success)}</span>
                </> : 'Waiting for save total'}
              </div>
            </article>;
          })}
        </div>
      </fieldset>
      <div className="aoe-apply-row">
        <button className="btn danger" disabled={!ready || pending || applied} onClick={apply}>{pending ? 'Applying…' : applied ? 'Applied' : `Apply to ${included.length} ${included.length === 1 ? 'target' : 'targets'}`}</button>
        <button className="btn" disabled={pending} onClick={() => { setResults({}); setApplied(false); setError(''); }}>New resolution</button>
        <span>{applied ? 'Applied. Use Undo on Combat to revert the whole AOE.' : 'HP and conditions stay unchanged until Apply.'}</span>
        {error && <p className="warning-text" role="alert">{error}</p>}
      </div>
    </div>
  </Modal>;
}
