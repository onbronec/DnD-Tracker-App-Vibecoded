import { ReactNode, useEffect, useMemo, useState } from 'react';
import type { AbilityKey, Character, GameAction, GameState, MonsterAbilities, MonsterDatabaseEntry, MonsterTextEntry, SpellDatabaseEntry } from '../shared/types';
import { CollapsiblePanel } from '../components/CollapsiblePanel';
import { NumberInput } from '../components/NumberInput';
import { MarkdownRenderer, DatabaseReferenceModal } from '../components/Markdown';
import { useDatabaseReferences, DatabaseReference } from '../components/DatabaseReferences';
import { EffectModal, effectRequiresManagement } from './CombatPage';
import { effectToString, hpClass } from '../shared/defaults';
import { armorClass, effectiveMaxHp } from '../shared/characterSheet';
import { ReactionUsage } from '../components/ReactionUsage';

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
  const [activeSection, setActiveSection] = useState('monster-overview');
  const [conditionsOpen, setConditionsOpen] = useState(false);
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

  // Scroll-spy: update active index entry as user scrolls
  useEffect(() => {
    function updateActiveSection() {
      const sections = document.querySelectorAll<HTMLElement>('[data-monster-section]');
      let best: { id: string; top: number } | null = null;
      sections.forEach(el => {
        const top = el.getBoundingClientRect().top;
        if (top < 180 && (best === null || top > best.top)) {
          best = { id: el.getAttribute('data-monster-section') || '', top };
        }
      });
      if (best) setActiveSection((best as { id: string }).id);
    }
    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    return () => window.removeEventListener('scroll', updateActiveSection);
  }, [selected?.id]);

  function scrollToSection(id: string) {
    const section = document.querySelector(`[data-monster-section="${id}"]`);
    if (section) window.scrollBy({ top: section.getBoundingClientRect().top - (document.getElementById('monster-header')?.getBoundingClientRect().height || 0) - 12, behavior: 'auto' });
  }

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

  // Build index nav links from what the selected monster actually has
  const monsterData = (selected.monsterData || {}) as Record<string, unknown>;
  const abilities = (selected.monsterAbilities || (monsterData.monsterAbilities as MonsterAbilities) || {}) as MonsterAbilities;
  const indexLinks: Array<{ id: string; label: string }> = [
    { id: 'monster-overview', label: 'Overview' },
    { id: 'monster-trackers', label: 'Trackers' },
    ...(abilities.spellcasting?.enabled ? [{ id: 'monster-spellcasting', label: 'Spellcasting' }] : []),
    ...(Array.isArray(monsterData.defensiveFeatures) && (monsterData.defensiveFeatures as unknown[]).length > 0 ? [{ id: 'monster-section-Defensive Features', label: 'Defensive' }] : []),
    ...(Array.isArray(monsterData.features) && (monsterData.features as unknown[]).length > 0 ? [{ id: 'monster-section-Features', label: 'Features' }] : []),
    ...(Array.isArray(monsterData.actions) && (monsterData.actions as unknown[]).length > 0 ? [{ id: 'monster-section-Actions', label: 'Actions' }] : []),
    ...(Array.isArray(monsterData.bonusActions) && (monsterData.bonusActions as unknown[]).length > 0 ? [{ id: 'monster-section-Bonus Actions', label: 'Bonus Actions' }] : []),
    ...(Array.isArray(monsterData.reactions) && (monsterData.reactions as unknown[]).length > 0 ? [{ id: 'monster-section-Reactions', label: 'Reactions' }] : []),
    ...(Array.isArray(monsterData.legendaryActionEntries) && (monsterData.legendaryActionEntries as unknown[]).length > 0 ? [{ id: 'monster-section-Legendary Actions', label: 'Legendary' }] : []),
    ...(Array.isArray(monsterData.lairActions) && (monsterData.lairActions as unknown[]).length > 0 ? [{ id: 'monster-section-Lair Actions', label: 'Lair' }] : []),
    ...(Array.isArray(monsterData.mythicActions) && (monsterData.mythicActions as unknown[]).length > 0 ? [{ id: 'monster-section-Mythic Actions', label: 'Mythic' }] : []),
  ];

  const groupLabel = (selected.monsterData as Record<string, unknown> | undefined)?.group as string | undefined
    || (selected.groupName as string | undefined);

  return (
    <div className="sheet-page-layout">
      <aside className="sheet-index" aria-label="Monster ability sections">
        <h3>Index</h3>
        <select className="sheet-mobile-index" aria-label="Go to monster section" value={activeSection} onChange={event => scrollToSection(event.target.value)}>{indexLinks.map(link => <option key={link.id} value={link.id}>{link.label}</option>)}</select>
        {indexLinks.map(link => (
          <button
            key={link.id}
            className={activeSection === link.id ? 'active' : ''}
            onClick={() => scrollToSection(link.id)}
          >
            {link.label}
          </button>
        ))}
      </aside>
      <div className="stack sheet-main">
        <section id="monster-header" className="section page-sticky-section sheet-header">
          <div className="section-title-row">
            <div>
              <h2>Monster Abilities</h2>
              <p>DM-only resource and ability tracking.</p>
            </div>
            <div className="button-row">
              <div className="monster-selection">
                <select value={String(selected.id)} onChange={event => selectCharacter(event.target.value)}>
                  {monsters.map(monster => {
                    const mData = (monster.monsterData || {}) as Record<string, unknown>;
                    const grp = (mData.group as string | undefined) || (monster.groupName as string | undefined);
                    return (
                      <option key={monster.id} value={String(monster.id)}>
                        {monster.name}{grp ? ` [${grp}]` : ''}
                      </option>
                    );
                  })}
                </select>
                {groupLabel && (
                  <span className="type-pill" style={{ fontSize: '0.75rem', background: 'var(--purple)', color: 'white', padding: '2px 8px', borderRadius: '999px' }}>
                    {groupLabel}
                  </span>
                )}
              </div>
              <button className="btn" onClick={onBackToCombat}>Back to Combat</button>
            </div>
          </div>
          <div className="monster-vitals" aria-label={`${selected.name} combat status`}>
            {(!selected.isNonMonster || selected.hasHpAc) && <div className="monster-live-hp"><strong>HP {selected.currentHp}/{effectiveMaxHp(selected)}</strong>{selected.tempHp > 0 && <small>Temp {selected.tempHp}</small>}<div className="hp-bar"><div className={`hp-fill ${hpClass(selected.currentHp, effectiveMaxHp(selected))}`} style={{ width: `${Math.max(0, Math.min(100, selected.currentHp / effectiveMaxHp(selected) * 100))}%` }} /></div></div>}
            <ReactionUsage character={selected} />
            <div className="effect-row">
              {selected.effects.map((effect, index) => {
                const name = typeof effect === 'string' ? effect : effect.name;
                const condition = state.conditionDatabase.find(item => String(item.name).toLowerCase() === name.toLowerCase());
                return <button key={`${name}-${index}`} className={`effect-tag effect-${condition?.kind || 'neutral'}`} title={String(condition?.description || condition?.effect || name)} onClick={() => {
                  if (effectRequiresManagement(effect, condition)) setConditionsOpen(true);
                  else submitAction({ type: 'effect.remove', payload: { characterId: selected.id, index } });
                }}>{effectToString(effect)}{typeof effect !== 'string' && effect.remainingRounds && <span className="effect-duration">{effect.remainingRounds}</span>}</button>;
              })}
            </div>
            <button className="btn purple small" onClick={() => setConditionsOpen(true)}>Conditions</button>
          </div>
        </section>
        <MonsterDetail monster={selected} submitAction={submitAction} spellDatabase={state.spellDatabase} />
      </div>
      {conditionsOpen && <EffectModal character={selected} canEdit conditions={state.conditionDatabase} submitAction={submitAction} onClose={() => setConditionsOpen(false)} />}
    </div>
  );
}

export function monsterDatabaseEntryToPreviewCharacter(monster: MonsterDatabaseEntry): Character {
  const power = monster.monsterAbilities?.power;
  const maxPower = Number(power?.max ?? monster.maxPower ?? 0) || 0;
  const currentPower = Number(power?.current ?? maxPower) || 0;
  const hp = Number(monster.hp || monster.maxHp || 1) || 1;
  const isNonMonster = monster.entityKind === 'nonMonster';
  return {
    id: `monster-preview-${monster.id || monster.name}`,
    name: monster.name || 'Monster',
    type: 'monster',
    maxHp: isNonMonster && !monster.hasHpAc ? 0 : hp,
    currentHp: isNonMonster && !monster.hasHpAc ? 0 : hp,
    tempHp: 0,
    ac: isNonMonster && !monster.hasHpAc ? 0 : (Number(monster.ac || 10) || 10),
    initBonus: Number(monster.initBonus || 0) || 0,
    initiative: isNonMonster ? Number(monster.fixedInitiative || 20) : null,
    maxReactions: Number(monster.maxReactions || 1) || 0,
    currentReactions: Number(monster.maxReactions || 1) || 0,
    maxPower,
    currentPower,
    powerName: power?.name || monster.powerName || 'Power',
    effects: [],
    activeInCombat: false,
    revealedToPlayers: false,
    monsterData: monster as unknown as Record<string, unknown>,
    monsterAbilities: monster.monsterAbilities,
    spellcasterLevel: 0,
    spellSlots: {},
    customFeatures: [],
    characterAbilities: [],
    characterActions: [],
    hitDice: { max: 0, current: 0 },
    proficiencyBonus: 0,
    abilityScores: {
      strength: monster.stats?.strength ?? 10,
      dexterity: monster.stats?.dexterity ?? 10,
      constitution: monster.stats?.constitution ?? 10,
      intelligence: monster.stats?.intelligence ?? 10,
      wisdom: monster.stats?.wisdom ?? 10,
      charisma: monster.stats?.charisma ?? 10
    },
    savingThrowProficiencies: [],
    skillProficiencies: [],
    skillExpertise: [],
    inventory: {
      currency: { manaCoins: 0, platinum: 0, gold: 0, silver: 0, copper: 0 },
      spellComponents: [],
      potions: [],
      scrolls: [],
      generalItems: [],
      magicItems: []
    },
    spellbook: {
      knownSpellIds: [],
      preparedSpellIds: [],
      preparesSpells: false,
      preparedNonEpicMax: 0,
      preparedEpicMax: 0
    },
    hasMultipleTurns: monster.hasMultipleTurns,
    isNonMonster,
    hasHpAc: !isNonMonster || Boolean(monster.hasHpAc),
    fixedInitiative: isNonMonster ? Number(monster.fixedInitiative || 20) : undefined,
    group: monster.group
  };
}

export function MonsterDetail({
  monster,
  submitAction,
  spellDatabase,
  readOnly = false
}: {
  monster: Character;
  submitAction: Props['submitAction'];
  spellDatabase?: SpellDatabaseEntry[];
  readOnly?: boolean;
}) {
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

  const spellsByName = useMemo(() => new Map((spellDatabase || []).map(spell => [spell.name.toLowerCase(), spell])), [spellDatabase]);
  const isCounterspellName = (name: string) => {
    const s = spellsByName.get(name.trim().toLowerCase());
    return s?.isCounterspell || s?.source?.toLowerCase() === 'counterspell' || name.toLowerCase().includes('counterspell');
  };
  const stats = (monsterData.stats || {}) as Partial<Record<AbilityKey, number>>;
  const isNonMonster = Boolean(monster.isNonMonster || monsterData.entityKind === 'nonMonster');
  const hasHpAc = !isNonMonster || Boolean(monster.hasHpAc || monsterData.hasHpAc);
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
      <section className="section sheet-section-anchor" data-monster-section="monster-overview">
        <div className="section-title-row">
          <div>
            <h2>{monster.name}</h2>
            <p>{isNonMonster ? `Non-monster object · fixed initiative ${monster.fixedInitiative ?? monster.initiative ?? 20}` : ([monsterData.size, monsterData.type, monsterData.challenge ? `CR ${monsterData.challenge}` : ''].filter(Boolean).join(' · ') || 'Monster combat sheet')}</p>
          </div>
        </div>
        <div className="stats-grid">
          {hasHpAc && <div className="stat"><span>HP</span><strong>{monster.currentHp}/{effectiveMaxHp(monster)}</strong></div>}
          {hasHpAc && <div className="stat"><span>AC</span><strong>{armorClass(monster)}</strong></div>}
          {!isNonMonster && <div className="stat"><span>Speed</span><strong>{String(monsterData.speed || '-')}</strong></div>}
          <div className="stat"><span>Initiative</span><strong>{monster.initiative ?? `${monster.initBonus >= 0 ? '+' : ''}${monster.initBonus}`}</strong></div>
          <div className="stat"><span>{power.name || monster.powerName || 'Power'}</span><strong>{monster.currentPower || power.current || 0}/{monster.maxPower || power.max || 0}</strong></div>
          <div className="stat"><span>Spellcasting</span><strong>{spellcasting.enabled ? 'yes' : 'none'}</strong></div>
          <div className="stat"><span>Legendary</span><strong>{legendary?.enabled ? `${legendary.used || 0}/${legendary.max || 0}` : '-'}</strong></div>
        </div>
        {!isNonMonster && <><AbilityScoresGrid stats={stats} />
        <div className="monster-meta-grid">
          {monsterData.saves && <Meta label="Saves" value={String(monsterData.saves)} />}
          {monsterData.skills && <Meta label="Skills" value={String(monsterData.skills)} />}
          {monsterData.senses && <Meta label="Senses" value={String(monsterData.senses)} />}
          {monsterData.languages && <Meta label="Languages" value={String(monsterData.languages)} />}
          {monsterData.proficiency && <Meta label="Proficiency" value={String(monsterData.proficiency)} />}
          {monsterData.damageResistances && <Meta label="Damage Resistances" value={String(monsterData.damageResistances)} />}
          {monsterData.damageImmunities && <Meta label="Damage Immunities" value={String(monsterData.damageImmunities)} />}
          {monsterData.conditionImmunities && (
            <Meta
              label="Condition Immunities"
              value={<ConditionImmunitiesValue value={String(monsterData.conditionImmunities)} />}
            />
          )}
          {monsterData.damageVulnerabilities && <Meta label="Damage Vulnerabilities" value={String(monsterData.damageVulnerabilities)} />}
        </div></>}
      </section>

      <section className="section sheet-section-anchor" data-monster-section="monster-trackers">
        <h2>Trackers</h2>
        {readOnly && (
          <p className="empty">
            Preview mode. HP, power, spell slots and ability uses are shown from the database entry and do not change combat.
          </p>
        )}
        <div className="monster-tracker-grid">
          {power.enabled && (
            <TrackerCard title={power.name || monster.powerName || 'Power'} subtitle={`${monster.currentPower || 0}/${monster.maxPower || 0}`}>
              <div className="button-row">
                <button className="btn danger small" disabled={readOnly} onClick={() => submitAction({ type: 'character.updatePower', payload: { characterId: monster.id, delta: -1 } })}>-1</button>
                <NumberInput className="small-input" value={monster.currentPower || 0} disabled={readOnly} min={0} onCommit={value => submitAction({ type: 'character.updatePower', payload: { characterId: monster.id, value } })} aria-label={`${power.name || 'Power'} current`} />
                <button className="btn success small" disabled={readOnly} onClick={() => submitAction({ type: 'character.updatePower', payload: { characterId: monster.id, delta: 1 } })}>+1</button>
              </div>
            </TrackerCard>
          )}
          {(abilities.customFeatures || [])
            .map((feature, index) => ({ feature, index }))
            .filter(({ feature }) => feature.trackerType && feature.trackerType !== 'none')
            .map(({ feature, index }) => {
              let subtitle = '';
              if (feature.trackerType === 'day') subtitle = `Per Day (${feature.used || 0}/${feature.maxUses || 0} used)`;
              else if (feature.trackerType === 'rest') subtitle = `Per Rest (${feature.used || 0}/${feature.maxUses || 0} used)`;
              else if (feature.trackerType === 'round') subtitle = `Per Round (${feature.used || 0}/${feature.maxUses || 0} used)`;
              else if (feature.trackerType === 'recharge') subtitle = `Recharge (${feature.rechargeValue}–6)`;
              else if (feature.trackerType === 'power') subtitle = `Costs ${feature.costAmount || 1} ${power.name || 'Power'}`;
              else if (feature.trackerType === 'slot') subtitle = `Costs Lvl ${feature.costSpellLevel || 1} Slot`;

              return (
                <TrackerCard key={`${feature.name}-${index}`} title={feature.name} subtitle={subtitle}>
                  {(feature.trackerType === 'day' || feature.trackerType === 'rest' || feature.trackerType === 'round') && (
                    <UseBoxes
                      max={feature.maxUses || 0}
                      used={feature.used || 0}
                      disabled={readOnly}
                      onSet={(used, delta) => submitAction({ type: 'monster.feature.uses', payload: { characterId: monster.id, index, used, delta } })}
                    />
                  )}
                  {feature.trackerType === 'recharge' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Status:</span>
                        <strong style={{ color: feature.used ? '#ef4444' : '#10b981' }}>
                          {feature.used ? 'Exhausted' : 'Ready'}
                        </strong>
                      </div>
                      {feature.used === 1 ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn success small"
                            disabled={readOnly || Boolean(feature.rechargeAttempted)}
                            title={feature.rechargeAttempted ? 'Already rolled this turn. Advance the turn to roll again.' : `Roll d6 — need ${feature.rechargeValue || 5}–6 to recharge`}
                            style={{ flex: 1, opacity: feature.rechargeAttempted ? 0.5 : 1 }}
                            onClick={() => {
                              const roll = Math.floor(Math.random() * 6) + 1;
                              const target = feature.rechargeValue || 5;
                              const success = roll >= target;
                              alert(`Recharge roll for ${feature.name} (${target}–6): Rolled ${roll}. ${success ? 'SUCCESS — recharged!' : 'FAILED.'}`);
                              if (success) {
                                submitAction({
                                  type: 'monster.feature.uses',
                                  payload: { characterId: monster.id, index, used: 0, rechargeAttempted: false }
                                });
                              } else {
                                // Mark attempt even on failure
                                submitAction({
                                  type: 'monster.feature.uses',
                                  payload: { characterId: monster.id, index, used: feature.used, rechargeAttempted: true }
                                });
                              }
                            }}
                          >
                            {feature.rechargeAttempted ? 'Rolled this turn' : `Roll Recharge (${feature.rechargeValue || 5}–6)`}
                          </button>
                          <button
                            className="btn small"
                            disabled={readOnly}
                            title="Manually refresh ability — ignores the recharge roll"
                            onClick={() => submitAction({
                              type: 'monster.feature.uses',
                              payload: { characterId: monster.id, index, used: 0, rechargeAttempted: false }
                            })}
                          >
                            Refresh
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn danger small"
                          disabled={readOnly}
                          onClick={() => {
                            submitAction({
                              type: 'monster.feature.uses',
                              payload: { characterId: monster.id, index, used: 1, rechargeAttempted: false }
                            });
                          }}
                        >
                          Mark Used
                        </button>
                      )}
                    </div>
                  )}
                  {feature.trackerType === 'power' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Uses:</span>
                        <strong>{feature.used || 0}</strong>
                      </div>
                      <button
                        className="btn small purple"
                        disabled={readOnly}
                        onClick={async () => {
                          const currentVal = monster.currentPower ?? 0;
                          const cost = feature.costAmount || 1;
                          if (currentVal < cost) {
                            alert(`Not enough ${power.name || 'Power'}! Need ${cost}, have ${currentVal}.`);
                            return;
                          }
                          await submitAction({ type: 'character.updatePower', payload: { characterId: monster.id, value: currentVal - cost } });
                          await submitAction({ type: 'monster.feature.uses', payload: { characterId: monster.id, index, used: (feature.used || 0) + 1 } });
                        }}
                      >
                        Use (Costs {feature.costAmount || 1} {power.name || 'Power'})
                      </button>
                      {feature.used > 0 && (
                        <button
                          className="btn danger small"
                          disabled={readOnly}
                          onClick={() => submitAction({ type: 'monster.feature.uses', payload: { characterId: monster.id, index, used: 0 } })}
                        >
                          Reset Uses
                        </button>
                      )}
                    </div>
                  )}
                  {feature.trackerType === 'slot' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Uses:</span>
                        <strong>{feature.used || 0}</strong>
                      </div>
                      <button
                        className="btn small purple"
                        disabled={readOnly}
                        onClick={async () => {
                          const lvlKey = feature.costSpellLevel || '1';
                          const currSlots = spellcasting.spellSlots?.[lvlKey] || { max: 0, used: 0 };
                          if (currSlots.max > 0 && currSlots.used >= currSlots.max) {
                            alert(`No level {lvlKey} spell slots remaining!`);
                            return;
                          }
                          await submitAction({ type: 'monster.spellSlot.toggle', payload: { characterId: monster.id, level: lvlKey, index: currSlots.used } });
                          await submitAction({ type: 'monster.feature.uses', payload: { characterId: monster.id, index, used: (feature.used || 0) + 1 } });
                        }}
                      >
                        Use (Costs Lvl {feature.costSpellLevel || 1} Slot)
                      </button>
                      {feature.used > 0 && (
                        <button
                          className="btn danger small"
                          disabled={readOnly}
                          onClick={() => submitAction({ type: 'monster.feature.uses', payload: { characterId: monster.id, index, used: 0 } })}
                        >
                          Reset Uses
                        </button>
                      )}
                    </div>
                  )}
                </TrackerCard>
              );
            })}
          {legendary?.enabled && (
            <TrackerCard title="Legendary Actions" subtitle={`${legendary.used || 0}/${legendary.max || 0} used, resets on monster turn`}>
              <UseBoxes
                max={legendary.max || 0}
                used={legendary.used || 0}
                disabled={readOnly}
                onSet={(used, delta) => submitAction({ type: 'monster.legendary.uses', payload: { characterId: monster.id, used, delta } })}
              />
            </TrackerCard>
          )}
          {abilities.epicActions?.enabled && (abilities.epicActions.actions || []).map((action, index) => (
            <TrackerCard key={`${action.name}-${index}`} title={`Epic: ${action.name}`} subtitle={`${action.used || 0}/${action.maxUses || 0} used, resets on monster turn`}>
              <UseBoxes
                max={action.maxUses || 0}
                used={action.used || 0}
                disabled={readOnly}
                onSet={(used, delta) => submitAction({ type: 'monster.epic.uses', payload: { characterId: monster.id, index, used, delta } })}
              />
              {action.description && <MarkdownRenderer text={action.description} />}
            </TrackerCard>
          ))}
        </div>
      </section>

      {spellcasting.enabled && (
        <section className="section sheet-section-anchor" data-monster-section="monster-spellcasting">
          <h2>Spellcasting</h2>
          {((spellcasting.counterspells && spellcasting.counterspells.length > 0) ||
            (spellcasting.atWillSpells || []).some(name => isCounterspellName(name)) ||
            (spellcasting.perDaySpells || []).some(spell => isCounterspellName(spell.name))) && (
            <div className="monster-spell-counterspells" style={{ borderLeft: '3px solid #7c3aed', paddingLeft: '12px', marginBottom: '16px' }}>
              <h3 style={{ color: '#a78bfa' }}>Counterspells</h3>
              <div style={{ marginTop: '8px', fontSize: '0.95em' }}>
                <MarkdownRenderer
                  text={
                    spellcasting.counterspells && spellcasting.counterspells.length > 0
                      ? spellcasting.counterspells.map(spellReference).join(', ')
                      : [
                          ...(spellcasting.atWillSpells || []).filter(name => isCounterspellName(name)),
                          ...(spellcasting.perDaySpells || []).filter(spell => isCounterspellName(spell.name)).map(s => s.name)
                        ].map(spellReference).join(', ')
                  }
                />
              </div>
            </div>
          )}
          <div className="monster-spell-grid">
            {Object.entries(spellcasting.spellSlots || {}).map(([level, slots]) => (
              <TrackerCard key={level} title={levelLabel(level)} subtitle={slots.atWill ? 'At will' : `${slots.used || 0}/${slots.max || 0} used`}>
                {slots.atWill ? (
                  <span className="type-pill">At will</span>
                ) : (
                  <UseBoxes
                    max={slots.max || 0}
                    used={slots.used || 0}
                    disabled={readOnly}
                    onSet={(used, delta) => submitAction({ type: 'monster.spellSlot.toggle', payload: { characterId: monster.id, level, used, delta } })}
                  />
                )}
                {slots.spells && slots.spells.length > 0 && (
                  <div style={{ marginTop: '10px', fontSize: '0.9em', width: '100%', borderTop: '1px solid #2a2a35', paddingTop: '8px' }}>
                    <MarkdownRenderer text={slots.spells.map(spellReference).join(', ')} />
                  </div>
                )}
              </TrackerCard>
            ))}
            {(spellcasting.atWillSpells || []).filter(name => !isCounterspellName(name)).length > 0 && (
              <TrackerCard title="At will spells" subtitle={`${(spellcasting.atWillSpells || []).filter(name => !isCounterspellName(name)).length} spells`}>
                <MarkdownRenderer text={(spellcasting.atWillSpells || []).filter(name => !isCounterspellName(name)).map(spellReference).join(', ')} />
              </TrackerCard>
            )}
            {(spellcasting.perDaySpells || [])
              .map((spell, index) => ({ spell, index }))
              .filter(item => !isCounterspellName(item.spell.name))
              .map(({ spell, index }) => (
                <TrackerCard key={`${spell.name}-${index}`} title={spell.name} subtitle={`${spell.used || 0}/${spell.maxUses || 0} used per day`}>
                  <MarkdownRenderer text={spellReference(spell.name)} />
                  <UseBoxes
                    max={spell.maxUses || 0}
                    used={spell.used || 0}
                    disabled={readOnly}
                    onSet={(used, delta) => submitAction({ type: 'monster.perDaySpell.uses', payload: { characterId: monster.id, index, used, delta } })}
                  />
                </TrackerCard>
              ))}
          </div>
        </section>
      )}

      {textSections.map(section => (
        <MonsterTextSection key={section.title} title={section.title} sectionId={`monster-section-${section.title}`} entries={section.entries || []} />
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

function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="monster-meta">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ConditionImmunitiesValue({ value }: { value: string }) {
  const references = useDatabaseReferences();
  const [detail, setDetail] = useState<DatabaseReference | null>(null);

  const items = useMemo(() => {
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }, [value]);

  if (items.length === 0) return <span>-</span>;

  return (
    <>
      {items.map((item, index) => {
        const match = references.find(ref => ref.kind === 'condition' && ref.name.toLowerCase() === item.toLowerCase());
        const element = match ? (
          <button
            type="button"
            className="markdown-reference markdown-reference-condition"
            style={{
              padding: '1px 6px',
              margin: '0 2px',
              font: 'inherit',
              fontWeight: 800,
              fontSize: 'inherit'
            }}
            onClick={() => setDetail(match)}
          >
            {item}
          </button>
        ) : (
          item
        );
        return (
          <span key={index}>
            {element}
            {index < items.length - 1 && ', '}
          </span>
        );
      })}
      {detail && <DatabaseReferenceModal reference={detail} onClose={() => setDetail(null)} />}
    </>
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

function UseBoxes({ max, used, onSet, disabled = false }: { max: number; used: number; onSet: (used: number, delta?: number) => unknown; disabled?: boolean }) {
  const count = Math.max(0, max);
  if (count > 10) {
    const percent = count > 0 ? Math.min(100, Math.max(0, (used / count) * 100)) : 0;
    return (
      <div className="feature-bar-controls">
        <button className="btn danger small" disabled={disabled} onClick={() => onSet(Math.max(0, used - 1), -1)}>-1</button>
        <div className="feature-bar"><div className="feature-bar-fill" style={{ width: `${percent}%` }} /></div>
        <NumberInput className="small-input" value={used} min={0} max={count} disabled={disabled} onCommit={onSet} aria-label="Uses spent" />
        <button className="btn success small" disabled={disabled} onClick={() => onSet(Math.min(count, used + 1), 1)}>+1</button>
      </div>
    );
  }
  return (
    <div className="feature-box-row">
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          className={`feature-box ${index < used ? 'used' : ''}`}
          disabled={disabled}
          onClick={() => onSet(index < used ? index : index + 1)}
          aria-label={`Set used to ${index + 1}`}
        />
      ))}
    </div>
  );
}

function MonsterTextSection({ title, sectionId, entries }: { title: string; sectionId?: string; entries: MonsterTextEntry[] }) {
  return (
    <section className="section sheet-section-anchor" data-monster-section={sectionId || title}>
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
