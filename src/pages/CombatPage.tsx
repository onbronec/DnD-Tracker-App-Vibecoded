import { ChangeEvent, FormEvent, useMemo, useRef, useState } from 'react';
import type { Character, ClientRole, GameAction, GameState, MonsterDatabaseEntry } from '../shared/types';
import { effectToString, hpClass, monsterHealthLabel } from '../shared/defaults';
import { CollapsiblePanelGroup } from '../components/CollapsiblePanel';
import { MarkdownRenderer } from '../components/Markdown';
import { Modal } from '../components/Modal';
import { SearchPicker } from '../components/SearchPicker';
import { ABILITIES, armorClass } from '../shared/characterSheet';

interface Props {
  state: GameState;
  role: ClientRole;
  submitAction: (action: GameAction) => Promise<unknown>;
  onOpenSpells: (characterId: string) => void;
  onOpenInventory: (characterId: string) => void;
  onOpenMonsters: (characterId: string) => void;
}

export function CombatPage({ state, role, submitAction, onOpenSpells, onOpenInventory, onOpenMonsters }: Props) {
  const isDM = role === 'dm';
  const current = state.characters[state.combatState.currentTurn];
  const [effectCharacterId, setEffectCharacterId] = useState<string | null>(null);
  const combatFileInputRef = useRef<HTMLInputElement | null>(null);
  const effectCharacter = state.characters.find(character => String(character.id) === effectCharacterId) || null;
  const combatCharacters = state.characters.filter(character => character.type === 'monster' || character.activeInCombat !== false);

  function saveCombatData() {
    const payload = {
      schemaVersion: state.schemaVersion,
      exportedAt: new Date().toISOString(),
      type: 'combat-state',
      characters: state.characters,
      combatState: state.combatState
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dnd-combat-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function loadCombatData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const source = parsed.data || parsed;
      await submitAction({
        type: 'combat.import',
        payload: {
          characters: source.characters || [],
          combatState: source.combatState || {}
        }
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Combat import failed.');
    }
  }

  return (
    <div className="stack">
      {isDM && (
        <CollapsiblePanelGroup
          panels={[
            {
              id: 'add-character',
              title: 'Add character / monster',
              summary: 'Create quick combatants.',
              content: <AddCharacterForm submitAction={submitAction} />
            },
            ...(state.monsterDatabase.length > 0 ? [{
              id: 'add-monster-db',
              title: 'Add monster from database',
              summary: 'Search saved monsters.',
              content: <AddMonsterFromDatabase monsters={state.monsterDatabase} submitAction={submitAction} />
            }] : [])
          ]}
        />
      )}

      <section className="section page-sticky-section">
        <div className="section-title-row">
          <div>
            <h2>Combat</h2>
            {state.combatState.active ? (
              <p>Round {state.combatState.round} / Turn: {current?.name || '-'}</p>
            ) : (
              <p>Combat is not active.</p>
            )}
          </div>
          {isDM && (
            <div className="button-row">
              {!state.combatState.active && <button className="btn success" onClick={() => submitAction({ type: 'combat.start' })}>Start combat</button>}
              {state.combatState.active && <button className="btn warning" onClick={() => submitAction({ type: 'combat.previousTurn' })}>Previous</button>}
              {state.combatState.active && <button className="btn warning" onClick={() => submitAction({ type: 'combat.nextTurn' })}>Next turn</button>}
              {state.combatState.active && <button className="btn danger" onClick={() => submitAction({ type: 'combat.end' })}>End</button>}
              {state.combatState.active && <button className="btn purple" onClick={() => submitAction({ type: 'combat.close' })}>Close</button>}
              <button className="btn warning" onClick={() => submitAction({ type: 'spell.rest.all', payload: { restType: 'short' } })}>Short Rest All</button>
              <button className="btn success" onClick={() => submitAction({ type: 'spell.rest.all', payload: { restType: 'long' } })}>Long Rest All</button>
              <button className="btn" onClick={saveCombatData}>Save combat</button>
              <button className="btn" onClick={() => combatFileInputRef.current?.click()}>Load combat</button>
              <input ref={combatFileInputRef} className="hidden-input" type="file" accept="application/json,.json" onChange={loadCombatData} />
            </div>
          )}
        </div>
        {state.combatState.active && <InitiativeLine characters={state.characters} currentTurn={state.combatState.currentTurn} played={state.combatState.playedThisRound} />}
      </section>

      <section className="section">
        <h2>Characters and monsters</h2>
        <div className="character-grid">
          {combatCharacters.map((character) => {
            const index = state.characters.findIndex(item => item.id === character.id);
            return (
            <CharacterCard
              key={character.id}
              character={character}
              index={index}
              role={role}
              conditions={state.conditionDatabase || []}
              active={state.combatState.active && index === state.combatState.currentTurn}
              played={state.combatState.active && state.combatState.playedThisRound.includes(index)}
              submitAction={submitAction}
              onOpenEffects={() => setEffectCharacterId(String(character.id))}
              onOpenSpells={() => onOpenSpells(String(character.id))}
              onOpenInventory={() => onOpenInventory(String(character.id))}
              onOpenMonsters={() => onOpenMonsters(String(character.id))}
            />
            );
          })}
        </div>
      </section>
      {effectCharacter && (
        <EffectModal
          character={effectCharacter}
          canEdit={isDM || effectCharacter.type === 'player'}
          conditions={state.conditionDatabase || []}
          submitAction={submitAction}
          onClose={() => setEffectCharacterId(null)}
        />
      )}
    </div>
  );
}

function AddCharacterForm({ submitAction }: { submitAction: Props['submitAction'] }) {
  const [form, setForm] = useState({
    name: '',
    type: 'player',
    maxHp: '10',
    currentHp: '',
    ac: '10',
    initBonus: '0',
    maxPower: '0',
    maxReactions: '1'
  });

  function update(key: string, value: string) {
    setForm(current => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return;
    await submitAction({
      type: 'character.add',
      payload: {
        name: form.name.trim(),
        type: form.type,
        maxHp: Number(form.maxHp) || 1,
        currentHp: Number(form.currentHp) || Number(form.maxHp) || 1,
        ac: Number(form.ac) || 10,
        initBonus: Number(form.initBonus) || 0,
        maxPower: Number(form.maxPower) || 0,
        maxReactions: Number(form.maxReactions) || 1,
        currentReactions: Number(form.maxReactions) || 1
      }
    });
    setForm(current => ({ ...current, name: '', currentHp: '' }));
  }

  return (
    <form className="form-grid" onSubmit={submit} data-testid="add-character-form">
      <input value={form.name} onChange={event => update('name', event.target.value)} placeholder="Name" />
      <select value={form.type} onChange={event => update('type', event.target.value)}>
        <option value="player">Player</option>
        <option value="monster">Monster</option>
      </select>
      <input value={form.maxHp} onChange={event => update('maxHp', event.target.value)} type="number" placeholder="Max HP" />
      <input value={form.currentHp} onChange={event => update('currentHp', event.target.value)} type="number" placeholder="Current HP" />
      <input value={form.ac} onChange={event => update('ac', event.target.value)} type="number" placeholder="AC" />
      <input value={form.initBonus} onChange={event => update('initBonus', event.target.value)} type="number" placeholder="Initiative bonus" />
      <input value={form.maxPower} onChange={event => update('maxPower', event.target.value)} type="number" placeholder="Max Power" />
      <input value={form.maxReactions} onChange={event => update('maxReactions', event.target.value)} type="number" placeholder="Reactions" />
      <button className="btn success">Add</button>
    </form>
  );
}

function AddMonsterFromDatabase({ monsters, submitAction }: { monsters: MonsterDatabaseEntry[]; submitAction: Props['submitAction'] }) {
  const [selectedMonster, setSelectedMonster] = useState<MonsterDatabaseEntry | null>(null);
  const [count, setCount] = useState('1');
  const [search, setSearch] = useState('');
  const matchingMonsters = matchingItems(monsters, search);

  async function addMonster() {
    const monster = selectedMonster && matchingMonsters.includes(selectedMonster) ? selectedMonster : matchingMonsters[0] || monsters[0];
    if (!monster) return;
    const copies = Math.max(1, Number(count) || 1);
    for (let index = 0; index < copies; index += 1) {
      const name = copies > 1 ? `${String(monster.name || 'Monster')} ${index + 1}` : String(monster.name || 'Monster');
      const power = monster.monsterAbilities?.power;
      const maxPower = Number(power?.max ?? monster.maxPower ?? 0) || 0;
      const currentPower = Number(power?.current ?? maxPower) || 0;
      await submitAction({
        type: 'character.add',
        payload: {
          name,
          type: 'monster',
          maxHp: Number(monster.hp || monster.maxHp || 1),
          currentHp: Number(monster.hp || monster.maxHp || 1),
          ac: Number(monster.ac || 10),
          maxReactions: Number(monster.maxReactions || 1),
          currentReactions: Number(monster.maxReactions || 1),
          initBonus: Number(monster.initBonus || 0),
          maxPower,
          currentPower,
          powerName: String(power?.name || monster.powerName || 'Power'),
          monsterData: monster,
          monsterAbilities: monster.monsterAbilities
        }
      });
      if (monster.hasLairActions || monster.hasMythicActions) {
        await submitAction({
          type: 'character.add',
          payload: {
            name: `${name} ${monster.hasMythicActions ? 'Mythic' : 'Lair'} Actions`,
            type: 'monster',
            maxHp: 1,
            currentHp: 1,
            ac: 10,
            maxReactions: 0,
            currentReactions: 0,
            initBonus: 0,
            initiative: 20,
            maxPower: 0,
            powerName: 'Power',
            monsterData: {
              name: `${name} ${monster.hasMythicActions ? 'Mythic' : 'Lair'} Actions`,
              hp: 1,
              ac: 10,
              initBonus: 0,
              description: monster.hasMythicActions ? entriesToDescription(monster.mythicActions) : entriesToDescription(monster.lairActions),
              actions: monster.hasMythicActions ? monster.mythicActions : monster.lairActions
            }
          }
        });
      }
    }
  }

  return (
    <div className="stack compact-stack">
      <SearchPicker
        items={monsters}
        query={search}
        onQueryChange={setSearch}
        selectedId={String((selectedMonster || monsters[0])?.id || '')}
        onSelect={setSelectedMonster}
        placeholder="Search monsters"
        getId={monster => String(monster.id)}
        getLabel={monster => String(monster.name || 'Monster')}
        getMeta={monster => `HP ${monster.hp || monster.maxHp || '-'} · AC ${monster.ac || '-'}`}
        getDescription={monster => String(monster.description || monster.statblock || '').slice(0, 120)}
      />
      <div className="button-row">
      <input className="small-input" type="number" min={1} value={count} onChange={event => setCount(event.target.value)} />
      <button className="btn success" onClick={addMonster}>Add to combat</button>
      </div>
    </div>
  );
}

function InitiativeLine({ characters, currentTurn, played }: { characters: Character[]; currentTurn: number; played: number[] }) {
  return (
    <div className="initiative-line">
      {characters.map((character, index) => (character.type === 'monster' || character.activeInCombat !== false) && (
        <span key={character.id} className={index === currentTurn ? 'current' : played.includes(index) ? 'played' : ''}>
          {character.name} ({character.initiative ?? '-'})
        </span>
      ))}
    </div>
  );
}

function CharacterCard({
  character,
  index,
  role,
  conditions,
  active,
  played,
  submitAction,
  onOpenEffects,
  onOpenSpells,
  onOpenInventory,
  onOpenMonsters
}: {
  character: Character;
  index: number;
  role: ClientRole;
  conditions: Array<Record<string, unknown>>;
  active: boolean;
  played: boolean;
  submitAction: Props['submitAction'];
  onOpenEffects: () => void;
  onOpenSpells: () => void;
  onOpenInventory: () => void;
  onOpenMonsters: () => void;
}) {
  const isDM = role === 'dm';
  const canEdit = isDM || character.type === 'player';
  const [drafts, setDrafts] = useState({ damage: '', healing: '', tempHp: '', effect: '' });
  const hpPercent = useMemo(() => Math.max(0, Math.min(100, (character.currentHp / character.maxHp) * 100)), [character.currentHp, character.maxHp]);

  function setDraft(key: string, value: string) {
    setDrafts(current => ({ ...current, [key]: value }));
  }

  async function applyHp(key: 'damage' | 'healing') {
    const raw = Number(drafts[key]);
    if (!raw) return;
    await submitAction({ type: 'character.adjustHp', payload: { characterId: character.id, amount: key === 'damage' ? -Math.abs(raw) : Math.abs(raw) } });
    setDraft(key, '');
  }

  async function addEffect() {
    if (!drafts.effect.trim()) return;
    await submitAction({ type: 'effect.add', payload: { characterId: character.id, name: drafts.effect.trim() } });
    setDraft('effect', '');
  }

  function duplicateMonster() {
    submitAction({
      type: 'character.add',
      payload: {
        name: `${character.name} copy`,
        type: 'monster',
        maxHp: character.maxHp,
        currentHp: character.maxHp,
        ac: character.ac,
        initBonus: character.initBonus,
        maxPower: character.maxPower || 0,
        maxReactions: character.maxReactions ?? 1,
        currentReactions: character.maxReactions ?? 1,
        powerName: character.powerName || 'Power',
        monsterData: character.monsterData,
        monsterAbilities: character.monsterAbilities
      }
    });
  }

  return (
    <article className={`character-card ${active ? 'active' : ''} ${played ? 'played' : ''}`} data-testid={`character-${character.name}`}>
      <div className="card-header">
        <div>
          <button className="name-button" onClick={onOpenEffects} title="Open conditions and effects">
            {character.name}
          </button>
          <span className="type-pill">{character.type === 'player' ? 'Player' : 'Monster'}</span>
        </div>
        <div className="button-row compact">
          {isDM && character.type === 'monster' && <span className="type-pill">#{index + 1}</span>}
          {character.type === 'player' && <button className="btn purple small" onClick={onOpenSpells}>Sheet</button>}
          {character.type === 'player' && <button className="btn purple small" onClick={onOpenInventory}>Inventory</button>}
          {isDM && character.type === 'monster' && <button className="btn purple small" onClick={onOpenMonsters}>Abilities</button>}
          {isDM && character.type === 'monster' && <button className="btn success small" onClick={duplicateMonster}>Duplicate</button>}
          {isDM && <button className="btn danger small" onClick={() => submitAction({ type: 'character.remove', payload: { characterId: character.id } })}>Remove</button>}
        </div>
      </div>

      <div className="stats-grid">
        <Stat label="HP" value={role === 'player' && character.type === 'monster' ? monsterHealthLabel(character.currentHp, character.maxHp) : `${character.currentHp}/${character.maxHp}`} />
        <Stat label="Temp" value={String(character.tempHp || 0)} />
        <Stat label="AC" value={String(armorClass(character))} />
        <Stat label="Init" value={String(character.initiative ?? '-')} />
        <Stat label="React" value={`${character.currentReactions ?? character.maxReactions ?? 1}/${character.maxReactions ?? 1}`} />
        {isDM && character.type === 'monster' && <Stat label={character.powerName || 'Power'} value={`${character.currentPower || 0}/${character.maxPower || 0}`} />}
      </div>

      {(isDM || character.type === 'player') && (
        <div className="hp-bar">
          <div className={`hp-fill ${hpClass(character.currentHp, character.maxHp)}`} style={{ width: `${hpPercent}%` }} />
        </div>
      )}

      <div className="effect-row">
        {character.effects.map((effect, effectIndex) => {
          const condition = conditionForEffect(conditions, effect);
          const tooltip = conditionTooltip(condition);
          const opensMenu = effectRequiresManagement(effect, condition);
          return (
            <button
              className={`effect-tag ${conditionKindClass(condition)}`}
              key={`${effectToString(effect)}-${effectIndex}`}
              onClick={() => {
                if (opensMenu) {
                  onOpenEffects();
                  return;
                }
                if (canEdit) submitAction({ type: 'effect.remove', payload: { characterId: character.id, index: effectIndex } });
              }}
              title={tooltip}
              data-tooltip={tooltip}
            >
              {effectToString(effect)}
            </button>
          );
        })}
      </div>

      {canEdit && (
        <div className="card-controls">
          <div className="quick-row">
            <button className="btn danger small" onClick={() => submitAction({ type: 'character.adjustHp', payload: { characterId: character.id, amount: -1 } })}>HP -1</button>
            <button className="btn danger small" onClick={() => submitAction({ type: 'character.adjustHp', payload: { characterId: character.id, amount: -10 } })}>HP -10</button>
            <button className="btn success small" onClick={() => submitAction({ type: 'character.adjustHp', payload: { characterId: character.id, amount: 1 } })}>HP +1</button>
            <button className="btn success small" onClick={() => submitAction({ type: 'character.adjustHp', payload: { characterId: character.id, amount: 10 } })}>HP +10</button>
          </div>
          <div className="quick-row">
            {Array.from({ length: Math.max(0, character.maxReactions ?? 1) }, (_, reactionIndex) => {
              const currentReactions = character.currentReactions ?? character.maxReactions ?? 1;
              const isAvailable = reactionIndex < currentReactions;
              return (
                <button
                  key={reactionIndex}
                  className={`feature-box ${isAvailable ? '' : 'used'}`}
                  onClick={() => submitAction({ type: 'character.reaction.set', payload: { characterId: character.id, value: currentReactions + (isAvailable ? -1 : 1) } })}
                  aria-label={`${character.name} reaction ${reactionIndex + 1}`}
                  title="Reaction"
                />
              );
            })}
          </div>
          <div className="input-action-row">
            <input value={drafts.damage} onChange={event => setDraft('damage', event.target.value)} type="number" placeholder="Damage" data-testid={`damage-${character.name}`} />
            <button className="btn danger small" onClick={() => applyHp('damage')}>Apply</button>
            <input value={drafts.healing} onChange={event => setDraft('healing', event.target.value)} type="number" placeholder="Heal" data-testid={`heal-${character.name}`} />
            <button className="btn success small" onClick={() => applyHp('healing')}>Apply</button>
          </div>
          <div className="input-action-row">
            <input value={drafts.tempHp} onChange={event => setDraft('tempHp', event.target.value)} type="number" placeholder="Temp HP" />
            <button className="btn warning small" onClick={() => submitAction({ type: 'character.setTempHp', payload: { characterId: character.id, value: Number(drafts.tempHp) || 0 } }).then(() => setDraft('tempHp', ''))}>Set</button>
            <input value={drafts.effect} onChange={event => setDraft('effect', event.target.value)} placeholder="Effect" />
            <button className="btn purple small" onClick={addEffect}>Add</button>
          </div>
          {isDM && (
            <div className="input-action-row">
              <input
                type="number"
                value={character.initiative ?? ''}
                onChange={event => submitAction({ type: 'character.setInitiative', payload: { characterId: character.id, value: event.target.value } })}
                placeholder="Initiative"
              />
              {character.type === 'monster' && (
                <input
                  type="number"
                  value={character.currentPower ?? 0}
                  onChange={event => submitAction({ type: 'character.updatePower', payload: { characterId: character.id, value: Number(event.target.value) || 0 } })}
                  placeholder="Power"
                />
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export function EffectModal({
  character,
  canEdit,
  conditions,
  submitAction,
  onClose
}: {
  character: Character;
  canEdit: boolean;
  conditions: Array<Record<string, unknown>>;
  submitAction: Props['submitAction'];
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedCondition, setSelectedCondition] = useState<Record<string, unknown> | null>(conditions[0] || null);
  const [custom, setCustom] = useState('');
  const [level, setLevel] = useState('1');
  const [ability, setAbility] = useState('strength');
  const [diceCount, setDiceCount] = useState('2');
  const [diceSides, setDiceSides] = useState('4');
  const [damageType, setDamageType] = useState('fire');
  const matchingConditions = matchingItems(conditions, search);
  const conditionForAdd = selectedCondition && matchingConditions.includes(selectedCondition) ? selectedCondition : matchingConditions[0] || selectedCondition;
  const isAbilityAdjustment = Boolean(conditionForAdd?.statAdjustmentType);
  const hasDice = conditionHasDice(conditionForAdd);

  function selectCondition(condition: Record<string, unknown>) {
    setSelectedCondition(condition);
    setLevel('1');
    setDiceCount(String(condition.defaultDiceCount || 2));
    setDiceSides(String(condition.defaultDiceSides || 4));
    setDamageType(String(condition.defaultDamageType || ''));
  }

  async function addEffect(name: string, condition?: Record<string, unknown>) {
    const trimmed = name.trim();
    const diceEnabled = conditionHasDice(condition);
    if (!trimmed) return;
    await submitAction({
      type: 'effect.add',
      payload: {
        characterId: character.id,
        name: trimmed,
        level: condition?.hasLevels ? Number(level) || 1 : null,
        ability: condition?.statAdjustmentType ? ability : null,
        value: condition?.statAdjustmentType ? Number(level) || 1 : null,
        diceCount: diceEnabled ? Number(diceCount) || Number(condition?.defaultDiceCount) || 1 : null,
        diceSides: diceEnabled ? Number(diceSides) || Number(condition?.defaultDiceSides) || 4 : null,
        damageType: diceEnabled ? damageType || String(condition?.defaultDamageType || '') : null
      }
    });
    setCustom('');
  }

  return (
    <Modal>
      <div className="modal-card">
        <div className="section-title-row">
          <div>
            <h2>Conditions for {character.name}</h2>
            <p>Click an active effect to remove it.</p>
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <div className="effect-row modal-effects">
          {character.effects.length === 0 && <p className="empty">No active effects.</p>}
          {character.effects.map((effect, index) => (
            <ActiveEffectRow
              key={`${effectToString(effect)}-${index}`}
              characterId={character.id}
              effect={effect}
              index={index}
              canEdit={canEdit}
              condition={conditions.find(condition => String(condition.name) === effectName(effect))}
              submitAction={submitAction}
            />
          ))}
        </div>

        {canEdit && (
          <div className="stack compact-stack">
            <div className="form-grid">
              <div className="form-wide">
                <SearchPicker
                  items={conditions}
                  query={search}
                  onQueryChange={setSearch}
                  selectedId={String(conditionForAdd?.id || '')}
                  onSelect={selectCondition}
                  placeholder="Search conditions"
                  getId={condition => String(condition.id)}
                  getLabel={condition => String(condition.name || 'Condition')}
                  getMeta={condition => summaryForCondition(condition)}
                  getDescription={condition => String(condition.description || condition.effect || '').slice(0, 140)}
                />
              </div>
              {isAbilityAdjustment && (
                <select value={ability} onChange={event => setAbility(event.target.value)}>
                  {ABILITIES.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
                </select>
              )}
              {(conditionForAdd?.hasLevels || isAbilityAdjustment) && (
                <input
                  data-testid="condition-level-input"
                  value={level}
                  onChange={event => setLevel(event.target.value)}
                  type="number"
                  min={1}
                  max={isAbilityAdjustment ? 30 : Number(conditionForAdd?.maxLevel || 20)}
                  placeholder={isAbilityAdjustment ? 'Score / amount' : 'Level'}
                />
              )}
              {hasDice && (
                <>
                  <input value={diceCount} onChange={event => setDiceCount(event.target.value)} type="number" min={1} placeholder="Dice count" />
                  <input value={diceSides} onChange={event => setDiceSides(event.target.value)} type="number" min={2} placeholder="Die sides" />
                  <input value={damageType} onChange={event => setDamageType(event.target.value)} placeholder="Damage type" />
                </>
              )}
              <button
                className="btn success"
                onClick={() => {
                  if (conditionForAdd) addEffect(String(conditionForAdd.name || ''), conditionForAdd);
                }}
              >
                Add selected
              </button>
            </div>
            <div className="form-grid">
              <input value={custom} onChange={event => setCustom(event.target.value)} placeholder="Custom effect" />
              <button className="btn success" onClick={() => addEffect(custom)}>Add custom</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ActiveEffectRow({
  characterId,
  effect,
  index,
  canEdit,
  condition,
  submitAction
}: {
  characterId: string;
  effect: Character['effects'][number];
  index: number;
  canEdit: boolean;
  condition?: Record<string, unknown>;
  submitAction: Props['submitAction'];
}) {
  const hasLevels = Boolean(condition?.hasLevels || (typeof effect !== 'string' && effect.level));
  const hasDice = conditionHasDice(condition) || (typeof effect !== 'string' && Boolean(effect.diceCount && effect.diceSides));
  const level = typeof effect === 'string' ? 1 : Number(effect.level || 1);
  const maxLevel = Number(condition?.maxLevel || 20);
  const [diceCount, setDiceCount] = useState(typeof effect === 'string' ? '' : String(effect.diceCount || condition?.defaultDiceCount || ''));
  const [diceSides, setDiceSides] = useState(typeof effect === 'string' ? '' : String(effect.diceSides || condition?.defaultDiceSides || ''));
  const [damageType, setDamageType] = useState(typeof effect === 'string' ? '' : String(effect.damageType || condition?.defaultDamageType || ''));

  return (
    <div className="active-effect-row">
      <span className={`effect-tag ${conditionKindClass(condition)}`} title={conditionTooltip(condition)}>{effectToString(effect)}</span>
      {condition && (
        <div className="effect-description">
          <MarkdownRenderer text={String(condition.description || condition.effect || '')} emptyLabel="No condition details." />
        </div>
      )}
      {canEdit && hasLevels && (
        <>
          <button
            data-testid={`effect-level-down-${index}`}
            className="btn danger small"
            disabled={level <= 1}
            onClick={() => submitAction({ type: 'effect.level.set', payload: { characterId, index, level: level - 1, maxLevel } })}
          >
            -1
          </button>
          <span className="type-pill">Level {level}/{maxLevel}</span>
          <button
            data-testid={`effect-level-up-${index}`}
            className="btn success small"
            disabled={level >= maxLevel}
            onClick={() => submitAction({ type: 'effect.level.set', payload: { characterId, index, level: level + 1, maxLevel } })}
          >
            +1
          </button>
        </>
      )}
      {canEdit && hasDice && (
        <div className="dice-effect-controls">
          <input className="tiny-input" value={diceCount} onChange={event => setDiceCount(event.target.value)} type="number" min={1} aria-label={`${effectToString(effect)} dice count`} />
          <span>d</span>
          <input className="tiny-input" value={diceSides} onChange={event => setDiceSides(event.target.value)} type="number" min={2} aria-label={`${effectToString(effect)} die sides`} />
          <input className="small-input" value={damageType} onChange={event => setDamageType(event.target.value)} placeholder="type" aria-label={`${effectToString(effect)} damage type`} />
          <button
            className="btn small"
            onClick={() => submitAction({ type: 'effect.dice.set', payload: { characterId, index, diceCount: Number(diceCount) || 0, diceSides: Number(diceSides) || 0, damageType } })}
          >
            Save dice
          </button>
        </div>
      )}
      {canEdit && (
        <button className="btn danger small" onClick={() => submitAction({ type: 'effect.remove', payload: { characterId, index } })}>
          Remove
        </button>
      )}
    </div>
  );
}

function effectName(effect: Character['effects'][number]) {
  return typeof effect === 'string' ? effect : effect.name;
}

function conditionForEffect(conditions: Array<Record<string, unknown>>, effect: Character['effects'][number]) {
  const name = effectName(effect).toLowerCase();
  return conditions.find(condition => String(condition.name || '').toLowerCase() === name);
}

export function effectRequiresManagement(effect: Character['effects'][number], condition?: Record<string, unknown>) {
  return Boolean(condition?.hasLevels || conditionHasDice(condition) || (typeof effect !== 'string' && (effect.level || (effect.diceCount && effect.diceSides))));
}

function conditionHasDice(condition?: Record<string, unknown> | null) {
  return Boolean(condition?.hasDice || condition?.defaultDiceCount || condition?.defaultDiceSides || condition?.defaultDamageType || condition?.damageType);
}

function summaryForCondition(condition: Record<string, unknown>) {
  const parts = [String(condition.kind || 'neutral')];
  if (condition.hasLevels) parts.push(`levels 1-${condition.maxLevel || 6}`);
  if (conditionHasDice(condition)) parts.push(`${condition.defaultDiceCount || 1}d${condition.defaultDiceSides || 4}${condition.defaultDamageType ? ` ${condition.defaultDamageType}` : ''}`);
  return parts.join(' · ');
}

function conditionKindClass(condition?: Record<string, unknown>) {
  const kind = String(condition?.kind || 'neutral').toLowerCase();
  if (kind === 'buff') return 'effect-buff';
  if (kind === 'debuff') return 'effect-debuff';
  return 'effect-neutral';
}

function conditionTooltip(condition?: Record<string, unknown>) {
  if (!condition) return 'Custom effect';
  return String(condition.description || condition.effect || condition.name || 'Condition');
}

function matchingItems<T>(items: T[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter(item => Object.values(item as Record<string, unknown>).join(' ').toLowerCase().includes(needle));
}

function entriesToDescription(entries?: Array<{ name: string; description: string }>) {
  return (entries || []).map(entry => entry.description || `**${entry.name}.**`).join('\n\n');
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
