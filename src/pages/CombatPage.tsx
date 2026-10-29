import { NumberInput } from '../components/NumberInput';
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from 'react';
import type { Character, ClientRole, GameAction, GameState, MonsterDatabaseEntry } from '../shared/types';
import { effectToString, hpClass, monsterHealthLabel } from '../shared/defaults';
import { CollapsiblePanelGroup } from '../components/CollapsiblePanel';
import { MarkdownEditor, MarkdownRenderer } from '../components/Markdown';
import { Modal } from '../components/Modal';
import { SearchPicker } from '../components/SearchPicker';
import { ABILITIES, armorClass, effectiveMaxHp } from '../shared/characterSheet';

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
              title: 'Add character / monster / object',
              summary: 'Create a combatant or a fixed-initiative object.',
              content: <AddCharacterForm submitAction={submitAction} />
            },
            ...(state.monsterDatabase.length > 0 ? [{
              id: 'add-monster-db',
              title: 'Add monster / object from database',
              summary: 'Search saved monsters and non-monster objects.',
              content: <AddMonsterFromDatabase monsters={state.monsterDatabase} submitAction={submitAction} />
            }] : [])
          ]}
        />
      )}

      <section id="combat-header" className="section page-sticky-section">
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

      {isDM && state.activeEncounterId && <ActiveEncounterBrief state={state} submitAction={submitAction} />}

      <section className="section">
        <h2>Characters and monsters</h2>
        <div className="character-grid">
          {combatCharacters.map((character) => {
            const index = state.characters.findIndex(item => item.id === character.id);
            return (
            <CharacterCard
              key={character.id}
              character={character}
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
    maxReactions: '1',
    fixedInitiative: '20', description: ''
  });
  const [hasHpAc, setHasHpAc] = useState(false);
  const isObject = form.type === 'nonMonster';

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
        type: isObject ? 'monster' : form.type,
        isNonMonster: isObject,
        hasHpAc: !isObject || hasHpAc,
        ...(isObject ? {
          fixedInitiative: Number(form.fixedInitiative), initiative: Number(form.fixedInitiative),
          monsterData: { name: form.name.trim(), entityKind: 'nonMonster', hasHpAc, fixedInitiative: Number(form.fixedInitiative), description: form.description }
        } : {}),
        maxHp: Number(form.maxHp) || 1,
        currentHp: form.currentHp === '' ? Number(form.maxHp) || 1 : Number(form.currentHp),
        ac: Number(form.ac) || 10,
        initBonus: Number(form.initBonus) || 0,
        maxPower: Number(form.maxPower) || 0,
        maxReactions: Number(form.maxReactions),
        currentReactions: Number(form.maxReactions)
      }
    });
    setForm(current => ({ ...current, name: '', currentHp: '' }));
  }

  return (
    <form className="form-grid" onSubmit={submit} data-testid="add-character-form">
      <label className="field-card"><span>Name</span><input value={form.name} onChange={event => update('name', event.target.value)} placeholder="Name" required /></label>
      <label className="field-card"><span>Combatant type</span><select value={form.type} onChange={event => {
        update('type', event.target.value);
        update('maxReactions', event.target.value === 'nonMonster' ? '0' : '1');
      }}>
        <option value="player">Player</option>
        <option value="monster">Monster</option>
        <option value="nonMonster">Non-monster object</option>
      </select></label>
      {isObject && <>
        <label className="field-card"><span>Fixed initiative</span><NumberInput value={form.fixedInitiative} onChange={event => update('fixedInitiative', event.target.value)} placeholder="Fixed initiative" /></label>
        <label className="inline-check"><input type="checkbox" checked={hasHpAc} onChange={event => setHasHpAc(event.target.checked)} />Track HP / AC</label>
      </>}
      {(!isObject || hasHpAc) && <>
        <label className="field-card"><span>Max HP</span><NumberInput value={form.maxHp} onChange={event => update('maxHp', event.target.value)} min={1} placeholder="Max HP" /></label>
        <label className="field-card"><span>Current HP (defaults to max)</span><NumberInput value={form.currentHp} onChange={event => update('currentHp', event.target.value)} min={0} placeholder="Current HP" /></label>
        <label className="field-card"><span>Armor class</span><NumberInput value={form.ac} onChange={event => update('ac', event.target.value)} min={0} placeholder="AC" /></label>
      </>}
      {!isObject && <>
        <label className="field-card"><span>Initiative bonus</span><NumberInput value={form.initBonus} onChange={event => update('initBonus', event.target.value)} placeholder="Initiative bonus" /></label>
        <label className="field-card"><span>Max Power</span><NumberInput value={form.maxPower} onChange={event => update('maxPower', event.target.value)} min={0} placeholder="Max Power" /></label>
      </>}
      <label className="field-card"><span>Reactions</span><NumberInput value={form.maxReactions} onChange={event => update('maxReactions', event.target.value)} min={0} placeholder="Reactions" /></label>
      {isObject && <div className="form-wide"><MarkdownEditor value={form.description} onChange={value => update('description', value)} label="Object notes / actions" /></div>}
      <button className="btn success">Add</button>
    </form>
  );
}

function AddMonsterFromDatabase({ monsters, submitAction }: { monsters: MonsterDatabaseEntry[]; submitAction: Props['submitAction'] }) {
  const [selectedMonster, setSelectedMonster] = useState<MonsterDatabaseEntry | null>(null);
  const [count, setCount] = useState('1');
  const [groupCount, setGroupCount] = useState('1');
  const [groupFilter, setGroupFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Extract distinct groups from database
  const availableGroups = useMemo(() => {
    const groups = new Set<string>();
    monsters.forEach(m => { if (m.group) groups.add(m.group); });
    return Array.from(groups).sort();
  }, [monsters]);

  // Pre-filter by group before text search
  const groupFiltered = monsters.filter(m => (!groupFilter || m.group === groupFilter) && (entityFilter === 'all' || (m.entityKind === 'nonMonster' ? 'objects' : 'monsters') === entityFilter));
  const matchingMonsters = matchingItems(groupFiltered, search);

  async function addMonster() {
    const monster = selectedMonster && matchingMonsters.includes(selectedMonster) ? selectedMonster : matchingMonsters[0];
    if (!monster) return;
    const copies = Math.max(1, Number(count) || 1);
    const groups = monster.entityKind === 'nonMonster' ? 1 : Math.min(copies, Math.max(1, Number(groupCount) || 1));
    // Assign each copy to a group for shared initiative
    const groupIds: string[] = [];
    for (let g = 0; g < groups; g++) {
      groupIds.push(`grp_${Date.now()}_${g}`);
    }

    for (let index = 0; index < copies; index += 1) {
      const name = copies > 1 ? `${String(monster.name || 'Monster')} ${index + 1}` : String(monster.name || 'Monster');
      const power = monster.monsterAbilities?.power;
      const maxPower = Number(power?.max ?? monster.maxPower ?? 0) || 0;
      const currentPower = Number(power?.current ?? maxPower) || 0;
      const groupIndex = groups > 1 ? index % groups : 0;
      const gId = groups > 1 ? groupIds[groupIndex] : null;
      const gName = groups > 1 ? `Group ${groupIndex + 1}` : null;
      await submitAction({
        type: 'character.add',
        payload: {
          name,
          type: 'monster',
          maxHp: Number(monster.hp || monster.maxHp || 1),
          currentHp: Number(monster.hp || monster.maxHp || 1),
          ac: Number(monster.ac || 10),
          maxReactions: Number(monster.maxReactions ?? (monster.entityKind === 'nonMonster' ? 0 : 1)),
          currentReactions: Number(monster.maxReactions ?? (monster.entityKind === 'nonMonster' ? 0 : 1)),
          initBonus: Number(monster.initBonus || 0),
          isNonMonster: monster.entityKind === 'nonMonster',
          hasHpAc: monster.entityKind !== 'nonMonster' || Boolean(monster.hasHpAc),
          fixedInitiative: monster.fixedInitiative,
          initiative: monster.entityKind === 'nonMonster' ? Number(monster.fixedInitiative ?? 20) : null,
          maxPower,
          currentPower,
          powerName: String(power?.name || monster.powerName || 'Power'),
          groupId: gId,
          groupName: gName,
          hasMultipleTurns: Boolean(monster.hasMultipleTurns),
          monsterData: monster,
          monsterAbilities: monster.monsterAbilities
        }
      });
      if (monster.hasLairActions) {
        await submitAction({
          type: 'character.add',
          payload: {
            name: `${name} Lair Actions`,
            type: 'monster',
            maxHp: 1,
            currentHp: 1,
            ac: 10,
            maxReactions: 0,
            currentReactions: 0,
            initBonus: 0,
            initiative: Number(monster.lairActionInitiative || 20),
            fixedInitiative: Number(monster.lairActionInitiative || 20),
            isNonMonster: true,
            hasHpAc: false,
            associatedObjectKind: 'lair',
            maxPower: 0,
            powerName: 'Power',
            monsterData: {
              name: `${name} Lair Actions`, entityKind: 'nonMonster', hasHpAc: false,
              fixedInitiative: Number(monster.lairActionInitiative || 20), initBonus: 0,
              description: entriesToDescription(monster.lairActions), actions: monster.lairActions
            }
          }
        });
      }
      if (monster.hasMythicActions) {
        await submitAction({ type: 'character.add', payload: {
          name: `${name} Mythic Actions`, type: 'monster', maxHp: 0, currentHp: 0, ac: 0,
          maxReactions: 0, currentReactions: 0, initBonus: 0,
          initiative: Number(monster.mythicActionInitiative || 20), fixedInitiative: Number(monster.mythicActionInitiative || 20),
          isNonMonster: true, hasHpAc: false, associatedObjectKind: 'mythic', maxPower: 0, powerName: 'Power',
          monsterData: { name: `${name} Mythic Actions`, entityKind: 'nonMonster', hasHpAc: false, fixedInitiative: Number(monster.mythicActionInitiative || 20), initBonus: 0, description: entriesToDescription(monster.mythicActions), actions: monster.mythicActions }
        }});
      }
    }
  }

  return (
    <div className="stack compact-stack">
      <label className="field-card"><span>Database entries</span><select aria-label="Database entity type" value={entityFilter} onChange={event => { setEntityFilter(event.target.value); setSelectedMonster(null); }}>
        <option value="all">Monsters and non-monster objects</option>
        <option value="monsters">Monsters</option>
        <option value="objects">Non-monster objects</option>
      </select></label>
      {availableGroups.length > 0 && (
        <select
          value={groupFilter}
          onChange={e => { setGroupFilter(e.target.value); setSelectedMonster(null); setSearch(''); }}
          title="Filter monsters by group / category"
        >
          <option value="">All Groups</option>
          {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      )}
      <SearchPicker
        items={groupFiltered}
        query={search}
        onQueryChange={setSearch}
        selectedId={String((selectedMonster || matchingMonsters[0])?.id || '')}
        onSelect={setSelectedMonster}
        placeholder="Search monsters / objects"
        getId={monster => String(monster.id)}
        getLabel={monster => String(monster.name || 'Monster')}
        getMeta={monster => monster.entityKind === 'nonMonster' ? `Non-monster · Initiative ${monster.fixedInitiative ?? 20}` : `HP ${monster.hp || monster.maxHp || '-'} · AC ${monster.ac || '-'}` + (monster.group ? ` · ${monster.group}` : '')}
      />
      <div className="button-row">
        <label title="Total number of copies to add" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9em' }}>
          Count:
          <NumberInput className="small-input" type="number" min={1} value={count} onChange={event => setCount(event.target.value)} style={{ width: '60px' }} />
        </label>
        <label title="Number of initiative groups — monsters in the same group share a single initiative roll" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9em' }}>
          Groups:
          <NumberInput className="small-input" type="number" min={1} value={groupCount} onChange={event => setGroupCount(event.target.value)} style={{ width: '60px' }} />
        </label>
        <button className="btn success" disabled={!matchingMonsters.length} onClick={addMonster}>Add to combat</button>
      </div>
    </div>
  );
}

function InitiativeLine({ characters, currentTurn, played }: { characters: Character[]; currentTurn: number; played: number[] }) {
  return (
    <nav className="initiative-line" aria-label="Initiative order">
      {characters.map((character, index) => (character.type === 'monster' || character.activeInCombat !== false) && (
        <button type="button" key={character.id} className={index === currentTurn ? 'current' : played.includes(index) ? 'played' : ''} aria-label={`Go to ${character.name}`} aria-current={index === currentTurn ? 'step' : undefined} onClick={() => {
          const card = document.getElementById(`combatant-${character.id}`);
          if (!card) return;
          const headerHeight = document.getElementById('combat-header')?.getBoundingClientRect().height || 0;
          window.scrollBy({ top: card.getBoundingClientRect().top - headerHeight - 12, behavior: 'auto' });
          card.focus({ preventScroll: true });
        }}>
          {character.name} ({character.initiative ?? '-'})
        </button>
      ))}
    </nav>
  );
}

function CharacterCard({
  character,
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
  const [expanded, setExpanded] = useState(false);
  const isNonMonster = Boolean(character.isNonMonster || character.monsterData?.entityKind === 'nonMonster');
  const hasHpAc = !isNonMonster || Boolean(character.hasHpAc || character.monsterData?.hasHpAc);
  const maxHp = effectiveMaxHp(character);
  const instanceName = character.id.endsWith('_turn2') ? character.name.replace(/ \(Turn 2\)$/, '') : character.name;
  const monsterNumber = instanceName === character.monsterData?.name ? 0 : Number(instanceName.match(/\s+(\d+)$/)?.[1] || 0);
  const hpPercent = useMemo(() => Math.max(0, Math.min(100, (character.currentHp / maxHp) * 100)), [character.currentHp, maxHp]);

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
    <article id={`combatant-${character.id}`} tabIndex={-1} className={`character-card ${active ? 'active' : ''} ${played ? 'played' : ''}`} data-testid={`character-${character.name}`}>
      <div className="card-header">
        <div>
          <button className="name-button" onClick={onOpenEffects} title="Open conditions and effects">
            {character.name}
          </button>
          <span className="type-pill">{character.type === 'player' ? 'Player' : isNonMonster ? 'Object' : 'Monster'}</span>
        </div>
        <div className="button-row compact">
          <button className={`btn small input-toggle ${expanded ? 'active' : ''}`} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>input</button>
          {character.type === 'player' && <button className="btn purple small" onClick={onOpenSpells}>Sheet</button>}
          {character.type === 'player' && <button className="btn purple small" onClick={onOpenInventory}>Inventory</button>}
          {isDM && character.type === 'monster' && <button className="btn purple small" onClick={onOpenMonsters}>Abilities</button>}
          {isDM && character.type === 'monster' && <button className="btn success small" onClick={duplicateMonster}>Duplicate</button>}
          {isDM && <button className="btn danger small" onClick={() => submitAction({ type: 'character.remove', payload: { characterId: character.id } })}>Remove</button>}
        </div>
      </div>

      <div className="stats-grid">
        {hasHpAc && <Stat label="HP" tone={role === 'player' && character.type === 'monster' ? hpClass(character.currentHp, maxHp) : ''} value={role === 'player' && character.type === 'monster' ? monsterHealthLabel(character.currentHp, maxHp) : `${character.currentHp}/${maxHp}`} />}
        {hasHpAc && <Stat label="Temp" value={String(character.tempHp || 0)} />}
        {hasHpAc && <Stat label="AC" value={String(armorClass(character))} />}
        <Stat label="Init" value={String(character.initiative ?? '-')} />
        {isDM && character.type === 'monster' && <Stat label={character.powerName || 'Power'} value={`${character.currentPower || 0}/${character.maxPower || 0}`} />}
      </div>

      {hasHpAc && (isDM || character.type === 'player') && (
        <div className="hp-bar">
          <div className={`hp-fill ${hpClass(character.currentHp, maxHp)}`} style={{ width: `${hpPercent}%` }} />
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
              {typeof effect !== 'string' && effect.remainingRounds && <span className="effect-duration" title={`${effect.remainingRounds} rounds remaining; expires at round end`}>{effect.remainingRounds}</span>}
            </button>
          );
        })}
      </div>

      {canEdit && (
        <div className="card-controls">
          <div className="quick-row">
            {hasHpAc && <><button className="btn danger small" onClick={() => submitAction({ type: 'character.adjustHp', payload: { characterId: character.id, amount: -1 } })}>HP -1</button>
            <button className="btn danger small" onClick={() => submitAction({ type: 'character.adjustHp', payload: { characterId: character.id, amount: -10 } })}>HP -10</button>
            <button className="btn success small" onClick={() => submitAction({ type: 'character.adjustHp', payload: { characterId: character.id, amount: 1 } })}>HP +1</button>
            <button className="btn success small" onClick={() => submitAction({ type: 'character.adjustHp', payload: { characterId: character.id, amount: 10 } })}>HP +10</button></>}
            {expanded && character.type === 'monster' && (
              <>
                <button
                  className="btn danger small"
                  onClick={() => submitAction({
                    type: 'character.updatePower',
                    payload: {
                      characterId: character.id,
                      delta: -1
                    }
                  })}
                >
                  {character.monsterAbilities?.power?.name || 'Power'} -1
                </button>
                <button
                  className="btn success small"
                  onClick={() => submitAction({
                    type: 'character.updatePower',
                    payload: {
                      characterId: character.id,
                      delta: 1
                    }
                  })}
                >
                  {character.monsterAbilities?.power?.name || 'Power'} +1
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <div className="quick-row">
        <span>Reakce: {Math.max(0, (character.maxReactions ?? 1) - (character.currentReactions ?? character.maxReactions ?? 1))}/{character.maxReactions ?? 1} used · {character.currentReactions ?? character.maxReactions ?? 1} available</span>
        {Array.from({ length: Math.max(0, character.maxReactions ?? 1) }, (_, reactionIndex) => {
          const currentReactions = character.currentReactions ?? character.maxReactions ?? 1;
          const usedReactions = (character.maxReactions ?? 1) - currentReactions;
          const isUsed = reactionIndex < usedReactions;
          return (
            <button
              key={reactionIndex}
              className={`feature-box ${isUsed ? 'used' : ''}`}
              disabled={!canEdit}
              aria-pressed={isUsed}
              onClick={() => submitAction({ type: 'character.reaction.set', payload: { characterId: character.id, value: currentReactions + (isUsed ? 1 : -1) } })}
              aria-label={`${character.name} reaction ${reactionIndex + 1}`}
              title={isUsed ? 'Used reaction' : 'Available reaction'}
            />
          );
        })}
      </div>
      {expanded && canEdit && (
        <div className="card-controls">
          {hasHpAc && <div className="input-action-row">
            <NumberInput value={drafts.damage} onChange={event => setDraft('damage', event.target.value)} type="number" placeholder="Damage" data-testid={`damage-${character.name}`} />
            <button className="btn danger small" onClick={() => applyHp('damage')}>Apply</button>
            <NumberInput value={drafts.healing} onChange={event => setDraft('healing', event.target.value)} type="number" placeholder="Heal" data-testid={`heal-${character.name}`} />
            <button className="btn success small" onClick={() => applyHp('healing')}>Apply</button>
          </div>}
          <div className={`input-action-row ${hasHpAc ? '' : 'object-effect-row'}`}>
            {hasHpAc && <>
            <NumberInput value={drafts.tempHp} onChange={event => setDraft('tempHp', event.target.value)} type="number" placeholder="Temp HP" />
            <button className="btn warning small" onClick={() => submitAction({ type: 'character.setTempHp', payload: { characterId: character.id, value: Number(drafts.tempHp) || 0 } }).then(() => setDraft('tempHp', ''))}>Set</button></>}
            <input value={drafts.effect} onChange={event => setDraft('effect', event.target.value)} placeholder="Effect" />
            <button className="btn purple small" onClick={addEffect}>Add</button>
          </div>
          {isDM && !isNonMonster && (
            <div className="input-action-row">
              <NumberInput
                type="number"
                value={character.initiative ?? ''}
                onCommit={value => submitAction({ type: 'character.setInitiative', payload: { characterId: character.id, value } })}
                placeholder="Initiative"
              />
              {character.type === 'monster' && (
                <NumberInput
                  type="number"
                  value={character.currentPower ?? 0}
                  onCommit={value => submitAction({ type: 'character.updatePower', payload: { characterId: character.id, value } })}
                  placeholder="Power"
                />
              )}
            </div>
          )}
          {isDM && character.type === 'monster' && !isNonMonster && <label className="monster-number-field">Monster number <small>(0 = none)</small><NumberInput min={0} value={monsterNumber} aria-label="Monster number" onCommit={value => submitAction({ type: 'character.setMonsterNumber', payload: { characterId: character.id, value } })} /></label>}
        </div>
      )}
      {expanded && isNonMonster && Boolean(character.monsterData?.description) && <MarkdownRenderer text={String(character.monsterData?.description || '')} />}
    </article>
  );
}

function ActiveEncounterBrief({ state, submitAction }: { state: GameState; submitAction: Props['submitAction'] }) {
  const encounter = (state.encounters || []).find(item => item.id === state.activeEncounterId);
  if (!encounter) return null;
  return (
    <section className="section encounter-brief">
      <div className="section-title-row"><div><h2>Encounter: {encounter.name}</h2><p>DM notes and available reinforcements.</p></div></div>
      <MarkdownRenderer text={encounter.notes} emptyLabel="No encounter notes." />
      {encounter.reserve.length > 0 && <div className="reserve-row"><strong>Monster reserve</strong>{encounter.reserve.map(entry => {
        const monster = state.monsterDatabase.find(item => item.id === entry.monsterId);
        if (!monster) return null;
        return <span className="reserve-entry" key={entry.id}>{monster.name} ×{entry.quantity}<button className="btn success small" onClick={() => submitAction({ type: 'encounter.reserve.addToCombat', page: 'encounters', payload: { encounterId: encounter.id, entryId: entry.id, quantity: 1 } })}>Add</button></span>;
      })}</div>}
    </section>
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
  const [remainingRounds, setRemainingRounds] = useState('');
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
        ...(Number(remainingRounds) > 0 ? { remainingRounds: Number(remainingRounds) } : {}),
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
            <details><summary>Duration (optional)</summary><label>Rounds, expires at round end<NumberInput className="small-input" min={0} value={remainingRounds} onChange={event => setRemainingRounds(event.target.value)} placeholder="No limit" /></label></details>
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
                <NumberInput
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
                  <NumberInput value={diceCount} onChange={event => setDiceCount(event.target.value)} type="number" min={1} placeholder="Dice count" />
                  <NumberInput value={diceSides} onChange={event => setDiceSides(event.target.value)} type="number" min={2} placeholder="Die sides" />
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
          <NumberInput className="tiny-input" value={diceCount} onChange={event => setDiceCount(event.target.value)} type="number" min={1} aria-label={`${effectToString(effect)} dice count`} />
          <span>d</span>
          <NumberInput className="tiny-input" value={diceSides} onChange={event => setDiceSides(event.target.value)} type="number" min={2} aria-label={`${effectToString(effect)} die sides`} />
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
        <details className="effect-duration-editor"><summary>Duration{typeof effect !== 'string' && effect.remainingRounds ? ` · ${effect.remainingRounds}` : ''}</summary><label>Remaining rounds<NumberInput className="small-input" min={0} value={typeof effect === 'string' ? '' : effect.remainingRounds ?? ''} onCommit={value => submitAction({ type: 'effect.duration.set', payload: { characterId, index, remainingRounds: value || null } })} /></label><small>0 removes the timer.</small></details>
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
  return Boolean(condition?.hasLevels || conditionHasDice(condition) || (typeof effect !== 'string' && (effect.level || effect.remainingRounds || (effect.diceCount && effect.diceSides))));
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

function matchingItems<T>(items: T[], query: string) {
  const parsed = parseQuery(query);
  if (!parsed.needle) return items;
  return items.filter(item => {
    if (parsed.nameOnly) {
      const name = String((item as Record<string, any>).name || '').toLowerCase();
      return name.includes(parsed.needle);
    }
    return Object.values(item as Record<string, unknown>).join(' ').toLowerCase().includes(parsed.needle);
  });
}


function entriesToDescription(entries?: Array<{ name: string; description: string }>) {
  return (entries || []).map(entry => entry.description || `**${entry.name}.**`).join('\n\n');
}

function Stat({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div className={`stat ${tone ? `health-${tone}` : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
