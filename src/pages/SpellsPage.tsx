import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { Character, ClientRole, CustomFeature, GameAction, GameState } from '../shared/types';
import { CollapsiblePanelGroup } from '../components/CollapsiblePanel';

interface Props {
  state: GameState;
  role: ClientRole;
  submitAction: (action: GameAction) => Promise<unknown>;
  selectedCharacterId?: string | null;
  onSelectCharacter: (characterId: string) => void;
  onBackToCombat: () => void;
}

type RestRegainType = 'none' | 'all' | 'fixed' | 'input';

export function SpellsPage({ state, submitAction, selectedCharacterId, onSelectCharacter, onBackToCombat }: Props) {
  const players = state.characters.filter(character => character.type === 'player');
  const [selectedId, setSelectedId] = useState(selectedCharacterId || players[0]?.id || '');
  const selected = useMemo(
    () => players.find(character => String(character.id) === String(selectedId)) || players[0],
    [players, selectedId]
  );

  useEffect(() => {
    if (selectedCharacterId && players.some(character => String(character.id) === String(selectedCharacterId))) {
      setSelectedId(String(selectedCharacterId));
    }
  }, [selectedCharacterId]);

  useEffect(() => {
    if (!selectedId && players[0]) {
      const fallback = String(players[0].id);
      setSelectedId(fallback);
      onSelectCharacter(fallback);
    } else if (selectedId && players.length > 0 && !players.some(character => String(character.id) === String(selectedId))) {
      const fallback = String(players[0].id);
      setSelectedId(fallback);
      onSelectCharacter(fallback);
    }
  }, [players, selectedId, onSelectCharacter]);

  function selectCharacter(characterId: string) {
    setSelectedId(characterId);
    onSelectCharacter(characterId);
  }

  if (!selected) {
    return (
      <section className="section">
        <div className="section-title-row">
          <div>
            <h2>Spells & Abilities</h2>
            <p>No player characters.</p>
          </div>
          <button className="btn" onClick={onBackToCombat}>Back to Combat</button>
        </div>
      </section>
    );
  }

  return (
    <div className="stack">
      <section className="section">
        <div className="section-title-row">
          <div>
            <h2>Spells & Abilities</h2>
            <p>Player-safe tracking for slots, hit dice and features.</p>
          </div>
          <div className="button-row">
            <select data-testid="spell-character-select" value={String(selected.id)} onChange={event => selectCharacter(event.target.value)}>
              {players.map(character => <option key={character.id} value={String(character.id)}>{character.name}</option>)}
            </select>
            <button className="btn" onClick={onBackToCombat}>Back to Combat</button>
          </div>
        </div>
      </section>
      <CollapsiblePanelGroup
        panels={[
          {
            id: 'spell-setup',
            title: `${selected.name} setup`,
            summary: 'Spell level, hit dice and rests.',
            content: <SpellEditor character={selected} submitAction={submitAction} />
          },
          {
            id: 'add-feature',
            title: 'Add custom feature',
            summary: 'Create abilities and recovery rules.',
            content: <FeatureSetup character={selected} submitAction={submitAction} />
          }
        ]}
      />
      <SpellSlots character={selected} submitAction={submitAction} />
      <HitDice character={selected} submitAction={submitAction} />
      <Features character={selected} submitAction={submitAction} />
    </div>
  );
}

function SpellEditor({ character, submitAction }: { character: Character; submitAction: Props['submitAction'] }) {
  const [level, setLevel] = useState(String(character.spellcasterLevel || 0));
  const [hitDiceMax, setHitDiceMax] = useState(String(character.hitDice.max || 0));

  useEffect(() => {
    setLevel(String(character.spellcasterLevel || 0));
    setHitDiceMax(String(character.hitDice.max || 0));
  }, [character.id, character.hitDice.max, character.spellcasterLevel]);

  function submit(event: FormEvent) {
    event.preventDefault();
    submitAction({
      type: 'spell.character.update',
      payload: {
        characterId: character.id,
        spellcasterLevel: Number(level) || 0,
        hitDiceMax: Number(hitDiceMax) || 0,
        hitDiceCurrent: Math.min(Number(hitDiceMax) || 0, character.hitDice.current || 0),
        customFeatures: character.customFeatures
      }
    });
  }

  return (
    <>
      <form className="form-grid" onSubmit={submit}>
        <input value={level} onChange={event => setLevel(event.target.value)} type="number" placeholder="Spellcaster level" />
        <input value={hitDiceMax} onChange={event => setHitDiceMax(event.target.value)} type="number" placeholder="Hit dice max" />
        <button className="btn success">Save setup</button>
      </form>
      <div className="button-row rest-row">
        <button className="btn warning" onClick={() => submitAction({ type: 'spell.rest.character', payload: { characterId: character.id, restType: 'short' } })}>Short Rest</button>
        <button className="btn success" onClick={() => submitAction({ type: 'spell.rest.character', payload: { characterId: character.id, restType: 'long' } })}>Long Rest</button>
      </div>
    </>
  );
}

function FeatureSetup({ character, submitAction }: { character: Character; submitAction: Props['submitAction'] }) {
  return (
    <FeatureForm
      submitLabel="Add feature"
      onSubmit={feature => submitAction({ type: 'spell.feature.add', payload: { characterId: character.id, ...feature } })}
    />
  );
}

function FeatureForm({
  initial,
  submitLabel,
  onSubmit
}: {
  initial?: Partial<CustomFeature>;
  submitLabel: string;
  onSubmit: (feature: Partial<CustomFeature>) => Promise<unknown> | unknown;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [maxUses, setMaxUses] = useState(String(initial?.maxUses || 1));
  const [shortRestRegainType, setShortRestRegainType] = useState<RestRegainType>((initial?.shortRestRegainType as RestRegainType) || 'none');
  const [shortRestRegainAmount, setShortRestRegainAmount] = useState(String(initial?.shortRestRegainAmount || 0));
  const [longRestRegainType, setLongRestRegainType] = useState<RestRegainType>((initial?.longRestRegainType as RestRegainType) || 'all');
  const [longRestRegainAmount, setLongRestRegainAmount] = useState(String(initial?.longRestRegainAmount || 0));
  const [statusName, setStatusName] = useState(initial?.statusName || '');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    await onSubmit({
      name: name.trim(),
      maxUses: Number(maxUses) || 1,
      shortRestRegainType,
      shortRestRegainAmount: Number(shortRestRegainAmount) || 0,
      longRestRegainType,
      longRestRegainAmount: Number(longRestRegainAmount) || 0,
      statusName,
      statusEffect: Boolean(statusName.trim())
    });
    if (!initial) {
      setName('');
      setMaxUses('1');
      setShortRestRegainType('none');
      setShortRestRegainAmount('0');
      setLongRestRegainType('all');
      setLongRestRegainAmount('0');
      setStatusName('');
    }
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <input value={name} onChange={event => setName(event.target.value)} placeholder="Feature name" />
      <input value={maxUses} onChange={event => setMaxUses(event.target.value)} type="number" min={1} placeholder="Max uses" />
      <select value={shortRestRegainType} onChange={event => setShortRestRegainType(event.target.value as RestRegainType)}>
        <option value="none">No short rest regain</option>
        <option value="all">All on short rest</option>
        <option value="fixed">Fixed amount on short rest</option>
        <option value="input">Prompt-style amount on short rest</option>
      </select>
      <input value={shortRestRegainAmount} onChange={event => setShortRestRegainAmount(event.target.value)} type="number" min={0} placeholder="Short rest amount" />
      <select value={longRestRegainType} onChange={event => setLongRestRegainType(event.target.value as RestRegainType)}>
        <option value="none">No long rest regain</option>
        <option value="all">All on long rest</option>
        <option value="fixed">Fixed amount on long rest</option>
        <option value="input">Prompt-style amount on long rest</option>
      </select>
      <input value={longRestRegainAmount} onChange={event => setLongRestRegainAmount(event.target.value)} type="number" min={0} placeholder="Long rest amount" />
      <input value={statusName} onChange={event => setStatusName(event.target.value)} placeholder="Optional status effect" />
      <button className="btn success">{submitLabel}</button>
    </form>
  );
}

function SpellSlots({ character, submitAction }: { character: Character; submitAction: Props['submitAction'] }) {
  const levels = Object.entries(character.spellSlots || {}).filter(([, slots]) => slots.max > 0);

  return (
    <section className="section">
      <h2>Spell slots</h2>
      {levels.length === 0 && <p className="empty">No spell slots configured.</p>}
      <div className="spell-slot-grid">
        {levels.map(([level, slots]) => (
          <div key={level} className="spell-level">
            <strong>Level {level}: {slots.max - slots.used}/{slots.max}</strong>
            <div className="dot-row">
              {Array.from({ length: slots.max }, (_, index) => (
                <button
                  key={index}
                  className={`dot ${index < slots.used ? 'used' : ''}`}
                  onClick={() => submitAction({ type: 'spell.slot.toggle', payload: { characterId: character.id, level, index } })}
                  aria-label={`Toggle level ${level} slot ${index + 1}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HitDice({ character, submitAction }: { character: Character; submitAction: Props['submitAction'] }) {
  return (
    <section className="section">
      <h2>Hit dice</h2>
      <p>{character.hitDice.current}/{character.hitDice.max} available</p>
      <div className="dot-row">
        {Array.from({ length: character.hitDice.max || 0 }, (_, index) => {
          const used = index < character.hitDice.max - character.hitDice.current;
          return (
            <button
              key={index}
              className={`hit-die ${used ? 'used' : ''}`}
              onClick={() => submitAction({ type: 'spell.hitDie.toggle', payload: { characterId: character.id, index } })}
            >
              d
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Features({ character, submitAction }: { character: Character; submitAction: Props['submitAction'] }) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const editingFeature = editingIndex === null ? null : character.customFeatures[editingIndex];

  return (
    <section className="section">
      <h2>Custom Features & Abilities</h2>
      {character.customFeatures.length === 0 && <p className="empty">No custom features configured.</p>}
      <div className="feature-list">
        {character.customFeatures.map((feature, index) => (
          <FeatureRow
            key={`${feature.name}-${index}`}
            characterId={character.id}
            feature={feature}
            index={index}
            submitAction={submitAction}
            onEdit={() => setEditingIndex(index)}
          />
        ))}
      </div>
      {editingFeature && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="section-title-row">
              <div>
                <h2>Edit {editingFeature.name}</h2>
                <p>Changes are saved as a server action and can be undone from spell history.</p>
              </div>
              <button className="btn" onClick={() => setEditingIndex(null)}>Close</button>
            </div>
            <FeatureForm
              initial={editingFeature}
              submitLabel="Save feature"
              onSubmit={async feature => {
                await submitAction({ type: 'spell.feature.update', payload: { characterId: character.id, index: editingIndex, ...feature } });
                setEditingIndex(null);
              }}
            />
            <div className="button-row rest-row">
              <button
                className="btn danger"
                onClick={async () => {
                  await submitAction({ type: 'spell.feature.remove', payload: { characterId: character.id, index: editingIndex } });
                  setEditingIndex(null);
                }}
              >
                Remove feature
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function FeatureRow({
  characterId,
  feature,
  index,
  submitAction,
  onEdit
}: {
  characterId: string;
  feature: CustomFeature;
  index: number;
  submitAction: Props['submitAction'];
  onEdit: () => void;
}) {
  const used = Math.max(0, Math.min(feature.maxUses || 0, feature.used || 0));
  const maxUses = Math.max(1, feature.maxUses || 1);
  const remaining = Math.max(0, maxUses - used);

  function setUsed(value: number) {
    submitAction({ type: 'spell.feature.uses', payload: { characterId, index, used: value } });
  }

  return (
    <div className="feature-row">
      <div className="feature-info">
        <strong>{feature.name}</strong>
        <p>{used}/{maxUses} used, {remaining} available · {recoveryLabel(feature)}{feature.statusName ? ` · Status: ${feature.statusName}` : ''}</p>
      </div>
      <div className="feature-controls">
        {maxUses <= 10 ? (
          <div className="feature-box-row">
            {Array.from({ length: maxUses }, (_, boxIndex) => (
              <button
                key={boxIndex}
                className={`feature-box ${boxIndex < used ? 'used' : ''}`}
                onClick={() => setUsed(boxIndex < used ? boxIndex : boxIndex + 1)}
                aria-label={`${feature.name} use ${boxIndex + 1}`}
              />
            ))}
          </div>
        ) : (
          <div className="feature-bar-controls">
            <button className="btn success small" onClick={() => setUsed(Math.max(0, used - 1))}>-1</button>
            <div className="feature-bar" aria-label={`${feature.name} usage`}>
              <div className="feature-bar-fill" style={{ width: `${(used / maxUses) * 100}%` }} />
            </div>
            <input
              className="small-input"
              type="number"
              min={0}
              max={maxUses}
              value={used}
              onChange={event => setUsed(Number(event.target.value) || 0)}
            />
            <button className="btn danger small" onClick={() => setUsed(used + 1)}>+1</button>
          </div>
        )}
        <button className="btn small" onClick={onEdit}>Edit</button>
      </div>
    </div>
  );
}

function recoveryLabel(feature: CustomFeature) {
  const parts = [];
  const shortLabel = regainLabel(feature.shortRestRegainType, feature.shortRestRegainAmount);
  const longLabel = regainLabel(feature.longRestRegainType, feature.longRestRegainAmount);
  if (shortLabel) parts.push(`SR: ${shortLabel}`);
  if (longLabel) parts.push(`LR: ${longLabel}`);
  return parts.length ? `Recovery: ${parts.join(', ')}` : 'Recovery: none';
}

function regainLabel(type?: string, amount?: number) {
  if (!type || type === 'none') return '';
  if (type === 'all') return 'all';
  return String(amount || 0);
}
