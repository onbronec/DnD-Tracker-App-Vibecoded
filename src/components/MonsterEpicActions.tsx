import { useState } from 'react';
import type { GameAction, MonsterEpicAction } from '../shared/types';
import { epicBody, epicRecoveryLabel, structureEpicAction } from '../shared/monsterEpic';
import { MarkdownRenderer } from './Markdown';
import { NumberInput } from './NumberInput';

interface Props {
  characterId: string;
  actions: MonsterEpicAction[];
  readOnly: boolean;
  submitAction: (action: GameAction) => Promise<unknown>;
}

export function MonsterEpicActions({ characterId, actions, readOnly, submitAction }: Props) {
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState('');

  async function useAction(index: number, optionIndex?: number) {
    setPending(index);
    setError('');
    try {
      const result = await submitAction({ type: 'monster.epic.use', payload: { characterId, index, optionIndex } }) as { ok?: boolean; error?: string } | undefined;
      if (result?.ok === false) setError(result.error || 'The action could not be used.');
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setPending(null);
    }
  }

  return <section className="section sheet-section-anchor monster-epics" data-monster-section="monster-epic-actions">
    <h2>Epic Actions</h2>
    {error && <p role="alert">{error}</p>}
    <div className="epic-action-layout">
      {actions.map((raw, index) => {
        const action = structureEpicAction(raw);
        const group = Boolean(action.options?.length);
        const exhausted = action.maxUses > 0 && action.used >= action.maxUses;
        const rules = action.name === 'Epic Action Rules';
        return <article key={action.id || index} className={`epic-action ${group ? 'epic-action-group' : ''} ${rules ? 'epic-action-rules' : ''}`} data-testid={`epic-action-${index}`}>
          <div className="epic-action-heading">
            <div>
              <h3>{group || rules ? action.name.replace(/\s*\(\d+\/(?:round|turn|encounter|day|rest)\)/i, '') : `Epic: ${action.name}`}</h3>
              {!rules && <span className="epic-recovery">{group ? 'Shared pool' : 'Uses'} · {action.maxUses > 0 ? `${action.maxUses} / ${epicRecoveryLabel(action.resetOn)}` : 'Unlimited'}</span>}
            </div>
            {action.maxUses > 0 && <div className="epic-pool-controls" aria-label={`${action.name} shared uses`}>
              <strong>{Math.max(0, action.maxUses - (action.used || 0))}/{action.maxUses} available</strong>
              <div className="feature-box-row">
                {action.maxUses <= 10 ? Array.from({ length: action.maxUses }, (_, usedIndex) => <button
                  key={usedIndex} className={`feature-box ${usedIndex < (action.used || 0) ? 'used' : ''}`}
                  aria-label={`${action.name}: set used to ${usedIndex < (action.used || 0) ? usedIndex : usedIndex + 1}`}
                  disabled={readOnly || pending !== null}
                  onClick={() => submitAction({ type: 'monster.epic.uses', payload: { characterId, index, used: usedIndex < (action.used || 0) ? usedIndex : usedIndex + 1 } })}
                />) : <NumberInput aria-label={`${action.name} uses spent`} className="small-input" min={0} max={action.maxUses} value={action.used} disabled={readOnly || pending !== null} onCommit={used => submitAction({ type: 'monster.epic.uses', payload: { characterId, index, used } })} />}
              </div>
            </div>}
          </div>
          {action.description && <MarkdownRenderer text={epicBody(action.description)} />}
          {group ? <>
            <div className="epic-options">
              {action.options!.map((option, optionIndex) => {
                const spent = option.maxUses > 0 && option.used >= option.maxUses;
                return <div key={option.id || optionIndex} className={`epic-option ${spent ? 'epic-option-spent' : ''}`}>
                  <div className="epic-option-heading">
                    <h4>{option.name}</h4>
                    <div className="epic-option-badges">
                      {option.cost && <span className="epic-cost">{option.cost}</span>}
                      {option.maxUses > 0 && <span className="epic-limit">{option.used || 0}/{option.maxUses} used · {epicRecoveryLabel(option.resetOn)}</span>}
                    </div>
                  </div>
                  <button className="btn purple epic-use" disabled={readOnly || pending !== null || exhausted || spent} onClick={() => useAction(index, optionIndex)} aria-label={`Use ${option.name}`}>
                    {spent ? 'Option spent' : exhausted ? 'Shared pool spent' : 'Use'}
                    {!spent && !exhausted && option.cost && <span>{option.cost}</span>}
                  </button>
                  {option.description && <MarkdownRenderer text={option.description} />}
                  {option.maxUses > 0 && option.used > 0 && <button className="btn small epic-restore" disabled={readOnly || pending !== null} title="Restore this option without changing the shared pool" onClick={() => submitAction({ type: 'monster.epic.option.reset', payload: { characterId, index, optionIndex } })}>Restore option use</button>}
                </div>;
              })}
            </div>
            <p className="epic-action-hint">Each option spends 1 shared use. {action.resetOn === 'turn' || !action.resetOn ? 'The pool refreshes at the start of this monster’s turn.' : `Pool recovery: ${epicRecoveryLabel(action.resetOn)}.`} Resource costs are tracked separately.</p>
          </> : action.maxUses > 0 && <button className="btn purple" aria-label={`Use ${action.name}`} disabled={readOnly || pending !== null || exhausted} onClick={() => useAction(index)}>Use action</button>}
        </article>;
      })}
    </div>
  </section>;
}
