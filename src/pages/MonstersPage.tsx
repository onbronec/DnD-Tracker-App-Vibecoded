import { ReactNode, useEffect, useMemo, useState } from 'react';
import type { AbilityKey, Character, GameAction, GameState, MonsterAbilities, MonsterTextEntry } from '../shared/types';
import { CollapsiblePanel } from '../components/CollapsiblePanel';
import { MarkdownRenderer } from '../components/Markdown';

interface Props {
  state: GameState;
  submitAction: (action: GameAction) => Promise<unknown>;
  selectedCharacterId?: string | null;
  onSelectCharacter: (characterId: string) => void;
  onBackToCombat: () => void;
}

export function MonstersPage({ state, submitAction, selectedCharacterId, onSelectCharacter, onBackToCombat }: Props) {
  const monsters = state.characters.filter(character => character.type === 'monster');
  const [selectedId, setSelectedId] = useState(selectedCharacterId || monsters[0]?.id || '');
  const selected = useMemo(
    () => monsters.find(character => String(character.id) === String(selectedId)) || monsters[0],
    [monsters, selectedId]
  );

  useEffect(() => {
    if (selectedCharacterId && monsters.some(character => String(character.id) === String(selectedCharacterId))) {
      setSelectedId(String(selectedCharacterId));
    }
  }, [selectedCharacterId]);

  useEffect(() => {
    if (!selectedId && monsters[0]) {
      const fallback = String(monsters[0].id);
      setSelectedId(fallback);
      onSelectCharacter(fallback);
    } else if (selectedId && monsters.length > 0 && !monsters.some(character => String(character.id) === String(selectedId))) {
      const fallback = String(monsters[0].id);
      setSelectedId(fallback);
      onSelectCharacter(fallback);
    }
  }, [monsters, selectedId, onSelectCharacter]);

  function selectCharacter(characterId: string) {
    setSelectedId(characterId);
    onSelectCharacter(characterId);
  }

  if (!selected) {
    return (
      <section className="section page-sticky-section">
        <div className="section-title-row">
          <div>
            <h2>Monster Abilities</h2>
            <p>No monsters in combat.</p>
          </div>
          <button className="btn" onClick={onBackToCombat}>Back to Combat</button>
        </div>
      </section>
    );
  }

  return (
    <div className="stack">
      <section className="section page-sticky-section">
        <div className="section-title-row">
          <div>
            <h2>Monster Abilities</h2>
            <p>DM-only resource and ability tracking.</p>
          </div>
          <div className="button-row">
            <select value={String(selected.id)} onChange={event => selectCharacter(event.target.value)}>
              {monsters.map(monster => <option key={monster.id} value={String(monster.id)}>{monster.name}</option>)}
            </select>
            <button className="btn" onClick={onBackToCombat}>Back to Combat</button>
          </div>
        </div>
      </section>
      <MonsterDetail monster={selected} submitAction={submitAction} />
    </div>
  );
}

function MonsterDetail({ monster, submitAction }: { monster: Character; submitAction: Props['submitAction'] }) {
  const monsterData = (monster.monsterData || {}) as Record<string, unknown>;
  const abilities: MonsterAbilities = monster.monsterAbilities || (monsterData.monsterAbilities as MonsterAbilities) || {};
  const legendary = abilities.legendaryActions;
  const power = abilities.power || { enabled: Boolean(monster.maxPower), name: monster.powerName || 'Power', max: monster.maxPower || 0, current: monster.currentPower || 0 };
  const spellcasting = abilities.spellcasting || {
    enabled: Boolean(abilities.spellcastingType && abilities.spellcastingType !== 'none'),
    spellcastingType: abilities.spellcastingType,
    spellcastingLevel: abilities.spellcastingLevel,
    spellSlots: abilities.spellSlots,
    perDaySpells: abilities.perDaySpells
  };
  const stats = (monsterData.stats || {}) as Partial<Record<AbilityKey, number>>;
  const textSections = [
    { title: 'Defensive Features', entries: monsterData.defensiveFeatures as MonsterTextEntry[] | undefined },
    { title: 'Features', entries: monsterData.features as MonsterTextEntry[] | undefined },
    { title: 'Actions', entries: monsterData.actions as MonsterTextEntry[] | undefined },
    { title: 'Bonus Actions', entries: monsterData.bonusActions as MonsterTextEntry[] | undefined },
    { title: 'Reactions', entries: monsterData.reactions as MonsterTextEntry[] | undefined },
    { title: 'Legendary Actions', entries: monsterData.legendaryActionEntries as MonsterTextEntry[] | undefined },
    { title: 'Lair Actions', entries: monsterData.lairActions as MonsterTextEntry[] | undefined },
    { title: 'Mythic Actions', entries: monsterData.mythicActions as MonsterTextEntry[] | undefined }
  ].filter(section => Array.isArray(section.entries) && section.entries.length > 0);

  return (
    <>
      <section className="section">
        <div className="section-title-row">
          <div>
            <h2>{monster.name}</h2>
            <p>{[monsterData.size, monsterData.type, monsterData.challenge ? `CR ${monsterData.challenge}` : ''].filter(Boolean).join(' · ') || 'Monster combat sheet'}</p>
          </div>
        </div>
        <div className="stats-grid">
          <div className="stat"><span>HP</span><strong>{monster.currentHp}/{monster.maxHp}</strong></div>
          <div className="stat"><span>AC</span><strong>{monster.ac || 10}</strong></div>
          <div className="stat"><span>Speed</span><strong>{String(monsterData.speed || '-')}</strong></div>
          <div className="stat"><span>Initiative</span><strong>{monster.initiative ?? `${monster.initBonus >= 0 ? '+' : ''}${monster.initBonus}`}</strong></div>
          <div className="stat"><span>{power.name || monster.powerName || 'Power'}</span><strong>{monster.currentPower || power.current || 0}/{monster.maxPower || power.max || 0}</strong></div>
          <div className="stat"><span>Spellcasting</span><strong>{spellcasting.enabled ? 'yes' : 'none'}</strong></div>
          <div className="stat"><span>Legendary</span><strong>{legendary?.enabled ? `${legendary.used || 0}/${legendary.max || 0}` : '-'}</strong></div>
        </div>
        <AbilityScoresGrid stats={stats} />
        <div className="monster-meta-grid">
          {monsterData.saves && <Meta label="Saves" value={String(monsterData.saves)} />}
          {monsterData.skills && <Meta label="Skills" value={String(monsterData.skills)} />}
          {monsterData.senses && <Meta label="Senses" value={String(monsterData.senses)} />}
          {monsterData.languages && <Meta label="Languages" value={String(monsterData.languages)} />}
          {monsterData.proficiency && <Meta label="Proficiency" value={String(monsterData.proficiency)} />}
        </div>
      </section>

      <section className="section">
        <h2>Trackers</h2>
        <div className="monster-tracker-grid">
          {power.enabled && (
            <TrackerCard title={power.name || monster.powerName || 'Power'} subtitle={`${monster.currentPower || 0}/${monster.maxPower || 0}`}>
              <div className="button-row">
                <button className="btn danger small" onClick={() => submitAction({ type: 'character.updatePower', payload: { characterId: monster.id, value: (monster.currentPower || 0) - 1 } })}>-1</button>
                <button className="btn success small" onClick={() => submitAction({ type: 'character.updatePower', payload: { characterId: monster.id, value: (monster.currentPower || 0) + 1 } })}>+1</button>
              </div>
            </TrackerCard>
          )}
          {(abilities.customFeatures || []).map((feature, index) => (
            <TrackerCard key={`${feature.name}-${index}`} title={feature.name} subtitle={`${feature.used || 0}/${feature.maxUses || 0} used`}>
              <UseBoxes
                max={feature.maxUses || 0}
                used={feature.used || 0}
                onSet={used => submitAction({ type: 'monster.feature.uses', payload: { characterId: monster.id, index, used } })}
              />
            </TrackerCard>
          ))}
          {legendary?.enabled && (
            <TrackerCard title="Legendary Actions" subtitle={`${legendary.used || 0}/${legendary.max || 0} used, resets on monster turn`}>
              <UseBoxes
                max={legendary.max || 0}
                used={legendary.used || 0}
                onSet={used => submitAction({ type: 'monster.legendary.uses', payload: { characterId: monster.id, used } })}
              />
            </TrackerCard>
          )}
          {abilities.epicActions?.enabled && (abilities.epicActions.actions || []).map((action, index) => (
            <TrackerCard key={`${action.name}-${index}`} title={`Epic: ${action.name}`} subtitle={`${action.used || 0}/${action.maxUses || 0} used, resets on monster turn`}>
              <UseBoxes
                max={action.maxUses || 0}
                used={action.used || 0}
                onSet={used => submitAction({ type: 'monster.epic.uses', payload: { characterId: monster.id, index, used } })}
              />
              {action.description && <MarkdownRenderer text={action.description} />}
            </TrackerCard>
          ))}
        </div>
      </section>

      {spellcasting.enabled && (
        <section className="section">
          <h2>Spellcasting</h2>
          <div className="monster-spell-grid">
            {Object.entries(spellcasting.spellSlots || {}).map(([level, slots]) => (
              <TrackerCard key={level} title={levelLabel(level)} subtitle={slots.atWill ? 'At will' : `${slots.used || 0}/${slots.max || 0} used`}>
                {slots.atWill ? (
                  <span className="type-pill">At will</span>
                ) : (
                  <UseBoxes
                    max={slots.max || 0}
                    used={slots.used || 0}
                    onSet={used => submitAction({ type: 'monster.spellSlot.toggle', payload: { characterId: monster.id, level, index: Math.max(0, used - 1) } })}
                  />
                )}
              </TrackerCard>
            ))}
            {(spellcasting.atWillSpells || []).length > 0 && (
              <TrackerCard title="At will spells" subtitle={`${spellcasting.atWillSpells?.length || 0} spells`}>
                <MarkdownRenderer text={(spellcasting.atWillSpells || []).map(spellReference).join(', ')} />
              </TrackerCard>
            )}
            {(spellcasting.perDaySpells || []).map((spell, index) => (
              <TrackerCard key={`${spell.name}-${index}`} title={spell.name} subtitle={`${spell.used || 0}/${spell.maxUses || 0} used per day`}>
                <MarkdownRenderer text={spellReference(spell.name)} />
                <UseBoxes
                  max={spell.maxUses || 0}
                  used={spell.used || 0}
                  onSet={used => submitAction({ type: 'monster.perDaySpell.uses', payload: { characterId: monster.id, index, used } })}
                />
              </TrackerCard>
            ))}
          </div>
        </section>
      )}

      {textSections.map(section => (
        <MonsterTextSection key={section.title} title={section.title} entries={section.entries || []} />
      ))}

      {monsterData.description && (
        <CollapsiblePanel title="Original statblock" summary="Raw imported Markdown for reference.">
          <MarkdownRenderer text={String(monsterData.description)} />
        </CollapsiblePanel>
      )}
    </>
  );
}

function AbilityScoresGrid({ stats }: { stats: Partial<Record<AbilityKey, number>> }) {
  const entries: Array<[AbilityKey, string]> = [
    ['strength', 'STR'],
    ['dexterity', 'DEX'],
    ['constitution', 'CON'],
    ['intelligence', 'INT'],
    ['wisdom', 'WIS'],
    ['charisma', 'CHA']
  ];
  return (
    <div className="sheet-ability-grid monster-ability-grid">
      {entries.map(([key, label]) => {
        const score = Number(stats[key]) || 10;
        const mod = Math.floor((score - 10) / 2);
        return (
          <div className="sheet-ability-card" key={key}>
            <span>{label}</span>
            <strong>{score}</strong>
            <small>{mod >= 0 ? '+' : ''}{mod}</small>
          </div>
        );
      })}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="monster-meta">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TrackerCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <article className="monster-tracker-card">
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      {children}
    </article>
  );
}

function UseBoxes({ max, used, onSet }: { max: number; used: number; onSet: (used: number) => void }) {
  const count = Math.max(0, max);
  if (count > 10) {
    const percent = count > 0 ? Math.min(100, Math.max(0, (used / count) * 100)) : 0;
    return (
      <div className="feature-bar-controls">
        <button className="btn danger small" onClick={() => onSet(Math.max(0, used - 1))}>-1</button>
        <div className="feature-bar"><div className="feature-bar-fill" style={{ width: `${percent}%` }} /></div>
        <button className="btn success small" onClick={() => onSet(Math.min(count, used + 1))}>+1</button>
      </div>
    );
  }
  return (
    <div className="feature-box-row">
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          className={`feature-box ${index < used ? 'used' : ''}`}
          onClick={() => onSet(index < used ? index : index + 1)}
          aria-label={`Set used to ${index + 1}`}
        />
      ))}
    </div>
  );
}

function MonsterTextSection({ title, entries }: { title: string; entries: MonsterTextEntry[] }) {
  return (
    <section className="section">
      <h2>{title}</h2>
      <div className="monster-entry-list">
        {entries.map((entry, index) => (
          <article className="monster-entry-card" key={`${entry.name}-${index}`}>
            <h3>{entry.name}</h3>
            <MarkdownRenderer text={entry.description} />
          </article>
        ))}
      </div>
    </section>
  );
}

function levelLabel(level: string) {
  if (level === 'epic1') return 'Epic 1';
  if (level === 'epic2') return 'Epic 2';
  if (level === 'epic3') return 'Epic 3';
  return `Level ${level}`;
}

function spellReference(name: string) {
  return /^[A-Za-z0-9_-]+$/.test(name) ? `@${name}` : `@[${name}]`;
}
