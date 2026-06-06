import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { AbilityKey, Character, CharacterAbility, CharacterSpellbook, ClientRole, CustomFeature, GameAction, GameState, SpellDatabaseEntry } from '../shared/types';
import { CollapsiblePanelGroup } from '../components/CollapsiblePanel';
import { Modal } from '../components/Modal';
import { MarkdownEditor, MarkdownRenderer } from '../components/Markdown';
import { SearchPicker } from '../components/SearchPicker';
import { EffectModal, effectRequiresManagement } from './CombatPage';
import { effectToString, hpClass } from '../shared/defaults';
import { groupedSpells, isCantrip, isEpicSpell, isNormalPreparedSpell, spellIsActive } from '../shared/spells';
import {
  ABILITIES,
  SKILLS,
  abilityModifier,
  abilityCheckBonus,
  armorClass,
  adjustedAbilityScores,
  clampAbilityScore,
  clampProficiencyBonus,
  saveBonus,
  skillAbility,
  signed,
  skillBonus,
  spellAttackBonus,
  spellSaveDc,
  spellcastingAbility,
  initiativeBonus
} from '../shared/characterSheet';

interface Props {
  state: GameState;
  role: ClientRole;
  submitAction: (action: GameAction) => Promise<unknown>;
  selectedCharacterId?: string | null;
  onSelectCharacter: (characterId: string) => void;
  onBackToCombat: () => void;
}

type RestRegainType = 'none' | 'all' | 'fixed' | 'input';

export function SpellsPage({ state, role, submitAction, selectedCharacterId, onSelectCharacter, onBackToCombat }: Props) {
  const players = state.characters.filter(character => character.type === 'player');
  const [selectedId, setSelectedId] = useState(selectedCharacterId || players[0]?.id || '');
  const [activeSection, setActiveSection] = useState('sheet-health');
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

  useEffect(() => {
    function updateActiveSection() {
      const visible = SHEET_NAV_LINKS
        .map(link => ({ id: link.id, top: document.getElementById(link.id)?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY }))
        .filter(item => item.top < 180)
        .sort((a, b) => b.top - a.top)[0];
      if (visible) setActiveSection(visible.id);
    }

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    return () => window.removeEventListener('scroll', updateActiveSection);
  }, [selected?.id]);

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (!selected) {
    return (
      <section className="section">
        <div className="section-title-row">
          <div>
            <h2>Character Sheets</h2>
            <p>No player characters.</p>
          </div>
          <button className="btn" onClick={onBackToCombat}>Back to Combat</button>
        </div>
      </section>
    );
  }

  return (
    <div className="sheet-page-layout">
      <aside className="sheet-index" aria-label="Character sheet sections">
        <h3>Index</h3>
        {SHEET_NAV_LINKS.map(link => (
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
        <section id="sheet-top" className="section page-sticky-section">
          <div className="section-title-row">
            <div>
              <h2>Character Sheets</h2>
              <p>Player-safe tracking for sheets, slots, hit dice and features.</p>
            </div>
            <div className="button-row">
              <select data-testid="spell-character-select" value={String(selected.id)} onChange={event => selectCharacter(event.target.value)}>
                {players.map(character => <option key={character.id} value={String(character.id)}>{character.name}</option>)}
              </select>
              <button className="btn" onClick={onBackToCombat}>Back to Combat</button>
            </div>
          </div>
        </section>
        <HealthConditionsPanel character={selected} role={role} conditions={state.conditionDatabase || []} submitAction={submitAction} />
        <CharacterGeneral character={selected} submitAction={submitAction} />
        <CharacterSheet character={selected} submitAction={submitAction} />
        <section id="sheet-tools" className="sheet-section-anchor">
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
        </section>
        <SpellSlots character={selected} submitAction={submitAction} />
        <ActionsWiki character={selected} submitAction={submitAction} />
        <SpellbookSection character={selected} spellDatabase={state.spellDatabase || []} submitAction={submitAction} />
        <HitDice character={selected} submitAction={submitAction} />
        <Features character={selected} submitAction={submitAction} />
        <AbilitiesWiki character={selected} submitAction={submitAction} />
      </div>
    </div>
  );
}

const SHEET_SECTION_LINKS = [
  { id: 'sheet-top', label: 'Character' },
  { id: 'sheet-health', label: 'Health & Conditions' },
  { id: 'sheet-general', label: 'General' },
  { id: 'sheet-core', label: 'Scores, Saves & Skills' },
  { id: 'sheet-tools', label: 'Setup & Features' },
  { id: 'sheet-spell-slots', label: 'Spell Slots' },
  { id: 'sheet-actions', label: 'Actions & Attacks' },
  { id: 'sheet-spells-known', label: 'Spells Known' },
  { id: 'sheet-hit-dice', label: 'Hit Dice' },
  { id: 'sheet-features', label: 'Custom Features' },
  { id: 'sheet-abilities', label: 'Abilities' }
];

const SHEET_NAV_LINKS = SHEET_SECTION_LINKS.filter(link => link.id !== 'sheet-top');

function HealthConditionsPanel({
  character,
  role,
  conditions,
  submitAction
}: {
  character: Character;
  role: ClientRole;
  conditions: Array<Record<string, unknown>>;
  submitAction: Props['submitAction'];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [drafts, setDrafts] = useState({ damage: '', healing: '', tempHp: '' });
  const hpPercent = useMemo(() => Math.max(0, Math.min(100, (character.currentHp / character.maxHp) * 100)), [character.currentHp, character.maxHp]);

  function setDraft(key: 'damage' | 'healing' | 'tempHp', value: string) {
    setDrafts(current => ({ ...current, [key]: value }));
  }

  async function applyHp(key: 'damage' | 'healing') {
    const raw = Number(drafts[key]);
    if (!raw) return;
    await submitAction({ type: 'character.adjustHp', payload: { characterId: character.id, amount: key === 'damage' ? -Math.abs(raw) : Math.abs(raw) } });
    setDraft(key, '');
  }

  return (
    <section id="sheet-health" className="section sheet-section-anchor">
      <div className="section-title-row">
        <div>
          <h2>Health & Conditions</h2>
          <p>Same HP and condition controls as the combat tracker.</p>
        </div>
        <button className="btn purple" onClick={() => setModalOpen(true)}>Conditions</button>
      </div>

      <div className="stats-grid">
        <div className="stat"><span>HP</span><strong>{character.currentHp}/{character.maxHp}</strong></div>
        <div className="stat"><span>Temp</span><strong>{character.tempHp || 0}</strong></div>
        <div className="stat"><span>AC</span><strong>{character.ac || 10}</strong></div>
        <div className="stat"><span>Conditions</span><strong>{character.effects.length}</strong></div>
      </div>

      <div className="hp-bar">
        <div className={`hp-fill ${hpClass(character.currentHp, character.maxHp)}`} style={{ width: `${hpPercent}%` }} />
      </div>

      <div className="effect-row">
        {character.effects.length === 0 && <p className="empty">No active conditions.</p>}
        {character.effects.map((effect, index) => {
          const condition = conditionForEffect(conditions, effect);
          const tooltip = String(condition?.description || condition?.effect || condition?.name || 'Custom effect');
          const opensMenu = effectRequiresManagement(effect, condition);
          return (
            <button
              key={`${effectToString(effect)}-${index}`}
              className={`effect-tag ${conditionKindClass(condition)}`}
              title={tooltip}
              data-tooltip={tooltip}
              onClick={() => {
                if (opensMenu) {
                  setModalOpen(true);
                  return;
                }
                submitAction({ type: 'effect.remove', payload: { characterId: character.id, index } });
              }}
            >
              {effectToString(effect)}
            </button>
          );
        })}
      </div>

      <div className="card-controls">
        <div className="quick-row">
          <button className="btn danger small" onClick={() => submitAction({ type: 'character.adjustHp', payload: { characterId: character.id, amount: -1 } })}>HP -1</button>
          <button className="btn danger small" onClick={() => submitAction({ type: 'character.adjustHp', payload: { characterId: character.id, amount: -10 } })}>HP -10</button>
          <button className="btn success small" onClick={() => submitAction({ type: 'character.adjustHp', payload: { characterId: character.id, amount: 1 } })}>HP +1</button>
          <button className="btn success small" onClick={() => submitAction({ type: 'character.adjustHp', payload: { characterId: character.id, amount: 10 } })}>HP +10</button>
        </div>
        <div className="input-action-row">
          <input value={drafts.damage} onChange={event => setDraft('damage', event.target.value)} type="number" placeholder="Damage" data-testid={`sheet-damage-${character.name}`} />
          <button className="btn danger small" onClick={() => applyHp('damage')}>Apply</button>
          <input value={drafts.healing} onChange={event => setDraft('healing', event.target.value)} type="number" placeholder="Heal" data-testid={`sheet-heal-${character.name}`} />
          <button className="btn success small" onClick={() => applyHp('healing')}>Apply</button>
        </div>
        <div className="input-action-row two-column-actions">
          <input value={drafts.tempHp} onChange={event => setDraft('tempHp', event.target.value)} type="number" placeholder="Temp HP" />
          <button className="btn warning small" onClick={() => submitAction({ type: 'character.setTempHp', payload: { characterId: character.id, value: Number(drafts.tempHp) || 0 } }).then(() => setDraft('tempHp', ''))}>Set</button>
        </div>
      </div>

      {modalOpen && (
        <EffectModal
          character={character}
          canEdit={role === 'dm' || character.type === 'player'}
          conditions={conditions}
          submitAction={submitAction}
          onClose={() => setModalOpen(false)}
        />
      )}
    </section>
  );
}

function conditionForEffect(conditions: Array<Record<string, unknown>>, effect: Character['effects'][number]) {
  const name = (typeof effect === 'string' ? effect : effect.name).toLowerCase();
  return conditions.find(condition => String(condition.name || '').toLowerCase() === name);
}

function conditionKindClass(condition?: Record<string, unknown>) {
  const kind = String(condition?.kind || 'neutral').toLowerCase();
  if (kind === 'buff') return 'effect-buff';
  if (kind === 'debuff') return 'effect-debuff';
  return 'effect-neutral';
}

function CharacterGeneral({ character, submitAction }: { character: Character; submitAction: Props['submitAction'] }) {
  const [editing, setEditing] = useState(false);
  const adjusted = adjustedAbilityScores(character);
  const castingAbility = spellcastingAbility(character);
  const speeds = character.sheetGeneral?.speeds || {};
  const visibleSpeeds = [
    ['Walk', speeds.walk ?? 30],
    ['Fly', speeds.fly ?? 0],
    ['Hover', speeds.hover ?? 0],
    ['Swim', speeds.swim ?? 0],
    ['Climb', speeds.climb ?? 0],
    ['Burrow', speeds.burrow ?? 0]
  ].filter(([, value], index) => index === 0 || Number(value) > 0);

  return (
    <section id="sheet-general" className="section sheet-section-anchor">
      <div className="section-title-row">
        <div>
          <h2>General</h2>
          <p>Compact combat and spellcasting reference.</p>
        </div>
        <button className="btn" onClick={() => setEditing(true)}>Edit General</button>
      </div>
      <div className="stats-grid compact-stats-grid">
        <div className="stat"><span>AC</span><strong>{armorClass(character)}</strong><small>{bonusMeta(character, 'ac') || `Base ${character.ac || 10}`}</small></div>
        <div className="stat"><span>Initiative</span><strong>{character.initiative ?? signed(initiativeBonus(character, adjusted.scores) + (character.initBonus || 0))}</strong><small>{bonusMeta(character, 'initiative') || `Base ${signed(character.initBonus || 0)}`}</small></div>
        <div className="stat"><span>Spell DC</span><strong>{spellSaveDc(character, adjusted.scores)}</strong><small>{bonusMeta(character, 'spellDc')}</small></div>
        <div className="stat"><span>Spell Attack</span><strong>{signed(spellAttackBonus(character, adjusted.scores))}</strong><small>{bonusMeta(character, 'spellAttack')}</small></div>
        <div className="stat"><span>Casting</span><strong>{ABILITIES.find(ability => ability.key === castingAbility)?.short}</strong></div>
        <div className="stat"><span>Reactions</span><strong>{character.currentReactions ?? character.maxReactions ?? 1}/{character.maxReactions ?? 1}</strong></div>
      </div>
      <div className="sheet-speed-row">
        {visibleSpeeds.map(([label, value]) => (
          <span className="type-pill" key={String(label)}>{label}: {value} ft.</span>
        ))}
      </div>
      {editing && (
        <SheetEditorModal
          character={character}
          onClose={() => setEditing(false)}
          onSave={async payload => {
            await submitAction({ type: 'spell.sheet.update', payload: { characterId: character.id, ...payload } });
            setEditing(false);
          }}
        />
      )}
    </section>
  );
}

function bonusMeta(character: Character, targetType: string) {
  return (character.sheetBonuses || [])
    .filter(bonus => bonus.targetType === targetType)
    .map(bonus => `${bonus.valueMode === 'halfProficiency' ? 'half PB' : signed(Number(bonus.value) || 0)}${bonus.source ? ` / ${bonus.source}` : ''}`)
    .join(', ');
}

function CharacterSheet({ character, submitAction }: { character: Character; submitAction: Props['submitAction'] }) {
  const [editing, setEditing] = useState(false);
  const adjusted = adjustedAbilityScores(character);

  return (
    <section id="sheet-core" className="section sheet-section-anchor">
      <div className="section-title-row">
        <div>
          <h2>{character.name} Character Sheet</h2>
          <p>Base scores are editable. Temporary ability-score conditions are applied in this view.</p>
        </div>
        <div className="button-row">
          <button className="btn" onClick={() => setEditing(true)}>Edit Sheet</button>
        </div>
      </div>

      <div className="sheet-ability-grid">
        {ABILITIES.map(ability => {
          const base = character.abilityScores?.[ability.key] ?? 10;
          const score = adjusted.scores[ability.key];
          const changed = base !== score;
          return (
            <div className={`sheet-ability-card ${changed ? 'adjusted' : ''}`} key={ability.key}>
              <span>{ability.short}</span>
              <strong>{score}</strong>
              <p>{signed(abilityModifier(score))}{changed ? ` / base ${base}` : ''}</p>
              {adjusted.adjustments[ability.key] && <small>{adjusted.adjustments[ability.key]?.join(', ')}</small>}
            </div>
          );
        })}
      </div>

      <div className="sheet-columns">
        <SheetBonusList
          title="Saving Throws"
          rows={ABILITIES.map(ability => ({
            key: ability.key,
            label: ability.label,
            meta: (character.savingThrowProficiencies || []).includes(ability.key) ? 'proficient' : '',
            value: saveBonus(character, ability.key, adjusted.scores)
          }))}
        />
        <SheetBonusList
          title="Skills"
          rows={SKILLS.map(skill => ({
            key: skill.key,
            label: skill.label,
            meta: `${ABILITIES.find(ability => ability.key === skillAbility(character, skill.key))?.short}${(character.skillExpertise || []).includes(skill.key) ? ' / expertise' : (character.skillProficiencies || []).includes(skill.key) ? ' / proficient' : ''}`,
            value: skillBonus(character, skill.key, adjusted.scores)
          }))}
        />
        <SheetBonusList
          title="Ability Checks"
          rows={ABILITIES.map(ability => ({
            key: ability.key,
            label: ability.label,
            meta: ability.short,
            value: abilityCheckBonus(character, ability.key, adjusted.scores)
          }))}
        />
      </div>

      {editing && (
        <SheetEditorModal
          character={character}
          onClose={() => setEditing(false)}
          onSave={async payload => {
            await submitAction({ type: 'spell.sheet.update', payload: { characterId: character.id, ...payload } });
            setEditing(false);
          }}
        />
      )}
    </section>
  );
}

function SheetBonusList({ title, rows }: { title: string; rows: Array<{ key: string; label: string; value: number; meta?: string }> }) {
  return (
    <div className="sheet-list">
      <h3>{title}</h3>
      {rows.map(row => (
        <div className="sheet-list-row" key={row.key}>
          <div>
            <strong>{row.label}</strong>
            {row.meta && <span>{row.meta}</span>}
          </div>
          <b>{signed(row.value)}</b>
        </div>
      ))}
    </div>
  );
}

function SheetEditorModal({ character, onClose, onSave }: { character: Character; onClose: () => void; onSave: (payload: Record<string, unknown>) => Promise<unknown> }) {
  const [proficiencyBonus, setProficiencyBonus] = useState(String(character.proficiencyBonus || 2));
  const [baseAc, setBaseAc] = useState(String(character.ac || 10));
  const [baseInitBonus, setBaseInitBonus] = useState(String(character.initBonus || 0));
  const [maxReactions, setMaxReactions] = useState(String(character.maxReactions ?? 1));
  const [spellAbility, setSpellAbility] = useState<AbilityKey>(spellcastingAbility(character));
  const [speeds, setSpeeds] = useState<Record<string, string>>(() => {
    const current = character.sheetGeneral?.speeds || {};
    return {
      walk: String(current.walk ?? 30),
      fly: String(current.fly ?? 0),
      hover: String(current.hover ?? 0),
      swim: String(current.swim ?? 0),
      climb: String(current.climb ?? 0),
      burrow: String(current.burrow ?? 0)
    };
  });
  const [scores, setScores] = useState<Record<AbilityKey, string>>(() => ABILITIES.reduce((result, ability) => {
    result[ability.key] = String(character.abilityScores?.[ability.key] ?? 10);
    return result;
  }, {} as Record<AbilityKey, string>));
  const [saveProficiencies, setSaveProficiencies] = useState<AbilityKey[]>(character.savingThrowProficiencies || []);
  const [skillProficiencies, setSkillProficiencies] = useState<string[]>(character.skillProficiencies || []);
  const [skillExpertise, setSkillExpertise] = useState<string[]>(character.skillExpertise || []);
  const [intimidationAbility, setIntimidationAbility] = useState<AbilityKey>(character.skillAbilityOverrides?.intimidation || 'charisma');
  const [sheetBonuses, setSheetBonuses] = useState(() => (character.sheetBonuses || []).map(bonus => ({ ...bonus })));

  function toggle<T extends string>(values: T[], value: T, checked: boolean) {
    return checked ? [...new Set([...values, value])] : values.filter(item => item !== value);
  }

  function save() {
    const nextScores = ABILITIES.reduce((result, ability) => {
      result[ability.key] = clampAbilityScore(Number(scores[ability.key]));
      return result;
    }, {} as Record<AbilityKey, number>);
    const expertise = skillExpertise;
    onSave({
      proficiencyBonus: clampProficiencyBonus(Number(proficiencyBonus)),
      ac: Number(baseAc) || 10,
      initBonus: Number(baseInitBonus) || 0,
      maxReactions: Number(maxReactions) || 0,
      abilityScores: nextScores,
      savingThrowProficiencies: saveProficiencies,
      skillProficiencies: [...new Set([...skillProficiencies, ...expertise])],
      skillExpertise: expertise,
      skillAbilityOverrides: intimidationAbility === 'strength' ? { ...(character.skillAbilityOverrides || {}), intimidation: 'strength' } : { ...(character.skillAbilityOverrides || {}), intimidation: 'charisma' },
      sheetBonuses,
      sheetGeneral: {
        spellcastingAbility: spellAbility,
        speeds: Object.fromEntries(Object.entries(speeds).map(([key, value]) => [key, Number(value) || 0]))
      }
    });
  }

  function updateBonus(index: number, patch: Record<string, unknown>) {
    setSheetBonuses(current => current.map((bonus, bonusIndex) => bonusIndex === index ? { ...bonus, ...patch } : bonus));
  }

  return (
    <Modal>
      <div className="modal-card sheet-editor-modal">
        <div className="section-title-row">
          <div>
            <h2>Edit {character.name} Sheet</h2>
            <p>Temporary condition adjustments are not edited here.</p>
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <div className="form-grid">
          <label className="field-card">
            <span>Proficiency Bonus</span>
            <input value={proficiencyBonus} onChange={event => setProficiencyBonus(event.target.value)} type="number" min={0} max={10} />
          </label>
          <label className="field-card">
            <span>Base AC</span>
            <input value={baseAc} onChange={event => setBaseAc(event.target.value)} type="number" min={0} />
          </label>
          <label className="field-card">
            <span>Initiative Bonus</span>
            <input value={baseInitBonus} onChange={event => setBaseInitBonus(event.target.value)} type="number" />
          </label>
          <label className="field-card">
            <span>Reactions</span>
            <input value={maxReactions} onChange={event => setMaxReactions(event.target.value)} type="number" min={0} />
          </label>
          <label className="field-card">
            <span>Spellcasting Ability</span>
            <select value={spellAbility} onChange={event => setSpellAbility(event.target.value as AbilityKey)}>
              {ABILITIES.map(ability => <option key={ability.key} value={ability.key}>{ability.label}</option>)}
            </select>
          </label>
          {Object.keys(speeds).map(speed => (
            <label className="field-card" key={speed}>
              <span>{speed}</span>
              <input value={speeds[speed]} onChange={event => setSpeeds(current => ({ ...current, [speed]: event.target.value }))} type="number" min={0} />
            </label>
          ))}
          {ABILITIES.map(ability => (
            <label className="field-card" key={ability.key}>
              <span>{ability.label}</span>
              <input
                value={scores[ability.key]}
                onChange={event => setScores(current => ({ ...current, [ability.key]: event.target.value }))}
                type="number"
                min={1}
                max={30}
              />
            </label>
          ))}
        </div>
        <div className="sheet-editor-columns">
          <div className="sheet-edit-list">
            <h3>Saving Throw Proficiencies</h3>
            {ABILITIES.map(ability => (
              <label className="inline-check" key={ability.key}>
                <input
                  type="checkbox"
                  checked={saveProficiencies.includes(ability.key)}
                  onChange={event => setSaveProficiencies(current => toggle(current, ability.key, event.target.checked))}
                />
                {ability.label}
              </label>
            ))}
          </div>
          <div className="sheet-edit-list">
            <h3>Skill Proficiencies And Expertise</h3>
            <label className="field-card">
              <span>Intimidation ability</span>
              <select value={intimidationAbility} onChange={event => setIntimidationAbility(event.target.value as AbilityKey)}>
                <option value="charisma">Charisma</option>
                <option value="strength">Strength</option>
              </select>
            </label>
            {SKILLS.map(skill => (
              <div className="skill-edit-row" key={skill.key}>
                <span>{skill.label}</span>
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={skillProficiencies.includes(skill.key) || skillExpertise.includes(skill.key)}
                    onChange={event => setSkillProficiencies(current => toggle(current, skill.key, event.target.checked))}
                  />
                  Prof
                </label>
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={skillExpertise.includes(skill.key)}
                    onChange={event => {
                      setSkillExpertise(current => toggle(current, skill.key, event.target.checked));
                      if (event.target.checked) setSkillProficiencies(current => toggle(current, skill.key, true));
                    }}
                  />
                  Exp
                </label>
              </div>
            ))}
          </div>
        </div>
        <div className="sheet-edit-list sheet-bonus-editor">
          <div className="section-title-row">
            <div>
              <h3>Numeric Bonuses</h3>
              <p>Applies to saves, skills or raw ability checks. Use half proficiency for Jack-of-all-trades style rules.</p>
            </div>
            <button
              className="btn small"
              onClick={() => setSheetBonuses(current => [...current, { id: `draft-${Date.now()}`, targetType: 'skill', targetKey: 'perception', value: 1, valueMode: 'fixed', source: '', note: '', condition: 'always' }])}
            >
              Add bonus
            </button>
          </div>
          {sheetBonuses.length === 0 && <p className="empty">No sheet bonuses.</p>}
          {sheetBonuses.map((bonus, index) => (
            <div className="sheet-bonus-row" key={bonus.id || index}>
              <select value={bonus.targetType} onChange={event => updateBonus(index, { targetType: event.target.value })}>
                <option value="allSaves">All saves</option>
                <option value="save">Specific save</option>
                <option value="allSkills">All skills</option>
                <option value="skill">Specific skill</option>
                <option value="allAbilityChecks">All ability checks</option>
                <option value="abilityCheck">Specific ability check</option>
                <option value="ac">AC</option>
                <option value="initiative">Initiative</option>
                <option value="spellAttack">Spell attack</option>
                <option value="spellDc">Spell DC</option>
              </select>
              <select value={bonus.targetKey || ''} onChange={event => updateBonus(index, { targetKey: event.target.value })} disabled={String(bonus.targetType).startsWith('all') || ['ac', 'initiative', 'spellAttack', 'spellDc'].includes(String(bonus.targetType))}>
                <option value="">Target...</option>
                {bonus.targetType === 'save' || bonus.targetType === 'abilityCheck'
                  ? ABILITIES.map(ability => <option key={ability.key} value={ability.key}>{ability.label}</option>)
                  : SKILLS.map(skill => <option key={skill.key} value={skill.key}>{skill.label}</option>)}
              </select>
              <select value={bonus.valueMode || 'fixed'} onChange={event => updateBonus(index, { valueMode: event.target.value, value: event.target.value === 'halfProficiency' ? 0 : bonus.value })}>
                <option value="fixed">Fixed</option>
                <option value="halfProficiency">Half proficiency</option>
              </select>
              {bonus.valueMode !== 'halfProficiency' && (
                <input value={String(bonus.value ?? 0)} onChange={event => updateBonus(index, { value: Number(event.target.value) || 0 })} type="number" placeholder="Bonus" />
              )}
              <select value={bonus.condition || 'always'} onChange={event => updateBonus(index, { condition: event.target.value })}>
                <option value="always">Always</option>
                <option value="ifNotProficientOrExpert">If not proficient/expert</option>
              </select>
              <input value={bonus.source || ''} onChange={event => updateBonus(index, { source: event.target.value })} placeholder="Source" />
              <input value={bonus.note || ''} onChange={event => updateBonus(index, { note: event.target.value })} placeholder="Note" />
              <button className="btn danger small" onClick={() => setSheetBonuses(current => current.filter((_, bonusIndex) => bonusIndex !== index))}>Remove</button>
            </div>
          ))}
        </div>
        <div className="button-row rest-row">
          <button className="btn success" onClick={save}>Save Sheet</button>
          <button className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Modal>
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
    <section id="sheet-spell-slots" className="section sheet-section-anchor">
      <h2>Spell slots</h2>
      {levels.length === 0 && <p className="empty">No spell slots configured.</p>}
      <div className="spell-slot-grid">
        {levels.map(([level, slots]) => (
          <div key={level} className="spell-level">
            <strong>{spellSlotLabel(level)}: {slots.max - slots.used}/{slots.max}</strong>
            <div className="dot-row">
              {Array.from({ length: slots.max }, (_, index) => (
                <button
                  key={index}
                  className={`dot ${index < slots.used ? 'used' : ''}`}
                  onClick={() => submitAction({ type: 'spell.slot.toggle', payload: { characterId: character.id, level, index } })}
                  aria-label={`Toggle ${spellSlotLabel(level)} slot ${index + 1}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function spellSlotLabel(level: string) {
  const epic = level.match(/^epic([1-3])$/);
  if (epic) return `Epic ${epic[1]}`;
  const numeric = Number(level);
  if (numeric >= 10 && numeric <= 12) return `Epic ${numeric - 9}`;
  return `Level ${level}`;
}

function SpellbookSection({
  character,
  spellDatabase,
  submitAction
}: {
  character: Character;
  spellDatabase: SpellDatabaseEntry[];
  submitAction: Props['submitAction'];
}) {
  const spellbook = normalizedSpellbook(character.spellbook);
  const knownSpells = spellbook.knownSpellIds
    .map(id => spellDatabase.find(spell => spell.id === id))
    .filter(Boolean) as SpellDatabaseEntry[];
  const [detailSpell, setDetailSpell] = useState<SpellDatabaseEntry | null>(null);
  const [editing, setEditing] = useState(false);
  const [preparing, setPreparing] = useState(false);

  return (
    <section id="sheet-spells-known" className="section sheet-section-anchor">
      <div className="section-title-row">
        <div>
          <h2>Spells Known</h2>
          <p>{knownSpells.length} known spell{knownSpells.length === 1 ? '' : 's'}{spellbook.preparesSpells ? ` · Prepared ${preparedSummary(knownSpells, spellbook)}` : ''}</p>
        </div>
        <div className="button-row">
          <button className="btn" onClick={() => setEditing(true)}>Edit spell list</button>
          {spellbook.preparesSpells && <button className="btn purple" onClick={() => setPreparing(true)}>Change prepared spells</button>}
        </div>
      </div>

      {knownSpells.length === 0 && <p className="empty">No known spells yet.</p>}
      <div className="spellbook-groups">
        {groupedSpells(knownSpells).map(group => (
          <div className="spellbook-group" key={group.key}>
            <h3>{group.label}</h3>
            <div className="spellbook-list">
              {group.spells.map(spell => {
                const active = spellIsActive(spell, spellbook);
                return (
                  <button
                    key={spell.id}
                    className={`spell-card ${active ? '' : 'unprepared'}`}
                    onClick={() => setDetailSpell(spell)}
                    data-testid={`spell-${spell.name}`}
                  >
                    <strong>{spell.name}</strong>
                    <span>{spell.school || 'Unknown school'} · {spell.castingTime || 'Casting time unknown'}</span>
                    {!active && <small>Known, not prepared</small>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {detailSpell && <SpellDetailModal spell={detailSpell} onClose={() => setDetailSpell(null)} />}
      {editing && (
        <SpellbookEditorModal
          character={character}
          spellDatabase={spellDatabase}
          spellbook={spellbook}
          submitAction={submitAction}
          onClose={() => setEditing(false)}
        />
      )}
      {preparing && (
        <PreparedSpellsModal
          character={character}
          spells={knownSpells}
          spellbook={spellbook}
          submitAction={submitAction}
          onClose={() => setPreparing(false)}
        />
      )}
    </section>
  );
}

function SpellbookEditorModal({
  character,
  spellDatabase,
  spellbook,
  submitAction,
  onClose
}: {
  character: Character;
  spellDatabase: SpellDatabaseEntry[];
  spellbook: CharacterSpellbook;
  submitAction: Props['submitAction'];
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SpellDatabaseEntry | null>(null);
  const [preparesSpells, setPreparesSpells] = useState(spellbook.preparesSpells);
  const [preparedNonEpicMax, setPreparedNonEpicMax] = useState(String(spellbook.preparedNonEpicMax || 0));
  const [preparedEpicMax, setPreparedEpicMax] = useState(String(spellbook.preparedEpicMax || 0));
  const knownSet = new Set(spellbook.knownSpellIds);
  const available = spellDatabase.filter(spell => !knownSet.has(spell.id));
  const firstMatch = matchingSpells(available, query)[0] || available[0] || null;
  const spellToAdd = selected && available.includes(selected) ? selected : firstMatch;

  async function saveSettings() {
    await submitAction({
      type: 'spellbook.settings.update',
      payload: {
        characterId: character.id,
        preparesSpells,
        preparedNonEpicMax: Number(preparedNonEpicMax) || 0,
        preparedEpicMax: Number(preparedEpicMax) || 0
      }
    });
  }

  return (
    <Modal>
      <div className="modal-card sheet-editor-modal">
        <div className="section-title-row">
          <div>
            <h2>Edit {character.name} Spell List</h2>
            <p>Search the spell database and add known spells.</p>
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <div className="stack compact-stack">
          <SearchPicker
            items={available}
            query={query}
            onQueryChange={setQuery}
            selectedId={String(spellToAdd?.id || '')}
            onSelect={setSelected}
            placeholder="Search spells"
            getId={spell => spell.id}
            getLabel={spell => spell.name}
            getMeta={spell => `${spell.levelLabel} · ${spell.school || 'Unknown school'}`}
            getDescription={spell => `${spell.classes.join(', ')} · ${spell.source || ''}`.trim()}
          />
          <div className="button-row">
            <button
              className="btn success"
              disabled={!spellToAdd}
              onClick={() => spellToAdd && submitAction({ type: 'spellbook.known.add', payload: { characterId: character.id, spellId: spellToAdd.id } })}
            >
              Add selected spell
            </button>
          </div>

          <div className="form-grid">
            <label className="inline-check">
              <input type="checkbox" checked={preparesSpells} onChange={event => setPreparesSpells(event.target.checked)} />
              Prepares spells
            </label>
            <input value={preparedNonEpicMax} onChange={event => setPreparedNonEpicMax(event.target.value)} type="number" min={0} placeholder="Prepared non-epic max" />
            <input value={preparedEpicMax} onChange={event => setPreparedEpicMax(event.target.value)} type="number" min={0} placeholder="Prepared epic max" />
            <button className="btn success" onClick={saveSettings}>Save spellcasting settings</button>
          </div>

          <div className="spellbook-known-list">
            {spellbook.knownSpellIds.length === 0 && <p className="empty">No known spells.</p>}
            {spellbook.knownSpellIds.map(id => spellDatabase.find(spell => spell.id === id)).filter(Boolean).map(spell => (
              <div className="spellbook-known-row" key={spell!.id}>
                <div>
                  <strong>{spell!.name}</strong>
                  <span>{spell!.levelLabel} · {spell!.school || 'Unknown school'}</span>
                </div>
                <button className="btn danger small" onClick={() => submitAction({ type: 'spellbook.known.remove', payload: { characterId: character.id, spellId: spell!.id } })}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function PreparedSpellsModal({
  character,
  spells,
  spellbook,
  submitAction,
  onClose
}: {
  character: Character;
  spells: SpellDatabaseEntry[];
  spellbook: CharacterSpellbook;
  submitAction: Props['submitAction'];
  onClose: () => void;
}) {
  const [prepared, setPrepared] = useState<string[]>(spellbook.preparedSpellIds);

  function toggle(spell: SpellDatabaseEntry, checked: boolean) {
    setPrepared(current => checked ? [...new Set([...current, spell.id])] : current.filter(id => id !== spell.id));
  }

  const normalCount = prepared.filter(id => spells.find(spell => spell.id === id && isNormalPreparedSpell(spell))).length;
  const epicCount = prepared.filter(id => spells.find(spell => spell.id === id && isEpicSpell(spell))).length;

  return (
    <Modal>
      <div className="modal-card sheet-editor-modal">
        <div className="section-title-row">
          <div>
            <h2>Prepared Spells</h2>
            <p>Non-epic {normalCount}/{spellbook.preparedNonEpicMax} · Epic {epicCount}/{spellbook.preparedEpicMax}</p>
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <div className="spellbook-groups">
          {groupedSpells(spells.filter(spell => !isCantrip(spell))).map(group => (
            <div className="spellbook-group" key={group.key}>
              <h3>{group.label}</h3>
              <div className="spellbook-prepare-list">
                {group.spells.map(spell => {
                  const checked = prepared.includes(spell.id);
                  const limitedOut = !checked && ((isNormalPreparedSpell(spell) && normalCount >= spellbook.preparedNonEpicMax) || (isEpicSpell(spell) && epicCount >= spellbook.preparedEpicMax));
                  return (
                    <label className="inline-check spell-prepare-row" key={spell.id}>
                      <input type="checkbox" checked={checked} disabled={limitedOut} onChange={event => toggle(spell, event.target.checked)} />
                      <span>{spell.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="button-row rest-row">
          <button className="btn success" onClick={() => submitAction({ type: 'spellbook.prepared.set', payload: { characterId: character.id, preparedSpellIds: prepared } }).then(onClose)}>Save prepared spells</button>
          <button className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

function SpellDetailModal({ spell, onClose }: { spell: SpellDatabaseEntry; onClose: () => void }) {
  return (
    <Modal className="item-modal-backdrop">
      <div className="modal-card item-modal-card">
        <div className="section-title-row">
          <div>
            <h2>{spell.name}</h2>
            <p>{spell.levelLabel} · {spell.school || 'Unknown school'} · {spell.source || 'Unknown source'}</p>
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <div className="stats-grid">
          <div className="stat"><span>Casting</span><strong>{spell.castingTime || '-'}</strong></div>
          <div className="stat"><span>Range</span><strong>{spell.range || '-'}</strong></div>
          <div className="stat"><span>Duration</span><strong>{spell.duration || '-'}</strong></div>
          <div className="stat"><span>Components</span><strong>{spell.components || '-'}</strong></div>
        </div>
        <div className="item-detail-body">
          <MarkdownRenderer text={spell.description} emptyLabel="No spell description." />
          {spell.atHigherLevels && (
            <>
              <h3>At Higher Levels</h3>
              <MarkdownRenderer text={spell.atHigherLevels} />
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

function normalizedSpellbook(spellbook?: CharacterSpellbook): CharacterSpellbook {
  return {
    knownSpellIds: spellbook?.knownSpellIds || [],
    preparedSpellIds: spellbook?.preparedSpellIds || [],
    preparesSpells: Boolean(spellbook?.preparesSpells),
    preparedNonEpicMax: spellbook?.preparedNonEpicMax || 0,
    preparedEpicMax: spellbook?.preparedEpicMax || 0
  };
}

function preparedSummary(spells: SpellDatabaseEntry[], spellbook: CharacterSpellbook) {
  const normal = spellbook.preparedSpellIds.filter(id => spells.find(spell => spell.id === id && isNormalPreparedSpell(spell))).length;
  const epic = spellbook.preparedSpellIds.filter(id => spells.find(spell => spell.id === id && isEpicSpell(spell))).length;
  return `${normal}/${spellbook.preparedNonEpicMax} non-epic, ${epic}/${spellbook.preparedEpicMax} epic`;
}

function matchingSpells(spells: SpellDatabaseEntry[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return spells;
  return spells.filter(spell => Object.values(spell).join(' ').toLowerCase().includes(needle));
}

function HitDice({ character, submitAction }: { character: Character; submitAction: Props['submitAction'] }) {
  return (
    <section id="sheet-hit-dice" className="section sheet-section-anchor">
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
    <section id="sheet-features" className="section sheet-section-anchor">
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

function AbilitiesWiki({ character, submitAction }: { character: Character; submitAction: Props['submitAction'] }) {
  const abilities = character.characterAbilities || [];
  const [detail, setDetail] = useState<CharacterAbility | null>(null);
  const [editing, setEditing] = useState(false);
  const [editingTarget, setEditingTarget] = useState<CharacterAbility | null>(null);

  return (
    <section id="sheet-abilities" className="section sheet-section-anchor">
      <div className="section-title-row">
        <div>
          <h2>Abilities</h2>
          <p>{abilities.length === 0 ? 'Character wiki entries for abilities, items, features and notes.' : `${abilities.length} character wiki entr${abilities.length === 1 ? 'y' : 'ies'}.`}</p>
        </div>
        <button className="btn" onClick={() => setEditing(true)}>Edit abilities</button>
      </div>

      {abilities.length === 0 && <p className="empty">No abilities recorded yet.</p>}
      <div className="ability-wiki-grid">
        {abilities.map(ability => (
          <button
            key={ability.id}
            className="ability-wiki-card"
            onClick={() => setDetail(ability)}
            data-testid={`ability-${ability.name}`}
          >
            <strong>{ability.name}</strong>
            {ability.source && <span>{ability.source}</span>}
          </button>
        ))}
      </div>

      {detail && (
        <AbilityDetailModal
          ability={detail}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setEditingTarget(detail);
            setDetail(null);
            setEditing(true);
          }}
        />
      )}
      {editing && (
        <AbilityEditorModal
          character={character}
          initialEditing={editingTarget}
          submitAction={submitAction}
          onClose={() => {
            setEditing(false);
            setEditingTarget(null);
          }}
        />
      )}
    </section>
  );
}

function ActionsWiki({ character, submitAction }: { character: Character; submitAction: Props['submitAction'] }) {
  const actions = character.characterActions || [];
  const [detail, setDetail] = useState<CharacterAbility | null>(null);
  const [editing, setEditing] = useState(false);
  const [editingTarget, setEditingTarget] = useState<CharacterAbility | null>(null);

  return (
    <section id="sheet-actions" className="section sheet-section-anchor">
      <div className="section-title-row">
        <div>
          <h2>Actions / Attacks</h2>
          <p>{actions.length === 0 ? 'Attacks, common actions and combat reminders.' : `${actions.length} action entr${actions.length === 1 ? 'y' : 'ies'}.`}</p>
        </div>
        <button className="btn" onClick={() => setEditing(true)}>Edit actions</button>
      </div>

      {actions.length === 0 && <p className="empty">No actions recorded yet.</p>}
      <div className="ability-wiki-grid">
        {actions.map(action => (
          <button key={action.id} className="ability-wiki-card" onClick={() => setDetail(action)} data-testid={`action-${action.name}`}>
            <strong>{action.name}</strong>
            {action.source && <span>{action.source}</span>}
          </button>
        ))}
      </div>

      {detail && (
        <AbilityDetailModal
          ability={detail}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setEditingTarget(detail);
            setDetail(null);
            setEditing(true);
          }}
        />
      )}
      {editing && (
        <ActionEditorModal
          character={character}
          initialEditing={editingTarget}
          submitAction={submitAction}
          onClose={() => {
            setEditing(false);
            setEditingTarget(null);
          }}
        />
      )}
    </section>
  );
}

function ActionEditorModal({
  character,
  initialEditing,
  submitAction,
  onClose
}: {
  character: Character;
  initialEditing: CharacterAbility | null;
  submitAction: Props['submitAction'];
  onClose: () => void;
}) {
  const actions = character.characterActions || [];
  const [editingAction, setEditingAction] = useState<CharacterAbility | null>(initialEditing);

  async function saveAction(action: Partial<CharacterAbility>) {
    await submitAction({ type: 'spell.action.upsert', payload: { characterId: character.id, action } });
    setEditingAction(null);
  }

  return (
    <Modal>
      <div className="modal-card sheet-editor-modal">
        <div className="section-title-row">
          <div>
            <h2>Edit {character.name} Actions</h2>
            <p>Combat-facing action and attack notes. Markdown references are supported.</p>
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <div className="ability-editor-layout">
          <div className="spellbook-known-list">
            {actions.length === 0 && <p className="empty">No saved actions.</p>}
            {actions.map(action => (
              <div className="spellbook-known-row" key={action.id}>
                <div>
                  <strong>{action.name}</strong>
                  <span>{action.source || 'Action / attack'}</span>
                </div>
                <div className="button-row">
                  <button className="btn small" onClick={() => setEditingAction(action)}>Edit</button>
                  <button className="btn danger small" onClick={() => submitAction({ type: 'spell.action.remove', payload: { characterId: character.id, id: action.id } })}>Remove</button>
                </div>
              </div>
            ))}
          </div>
          <AbilityForm
            key={editingAction?.id || 'new-action'}
            initial={editingAction}
            submitLabel={editingAction ? 'Save action' : 'Add action'}
            onSubmit={saveAction}
          />
        </div>
      </div>
    </Modal>
  );
}

function AbilityDetailModal({ ability, onClose, onEdit }: { ability: CharacterAbility; onClose: () => void; onEdit: () => void }) {
  return (
    <Modal className="item-modal-backdrop">
      <div className="modal-card item-modal-card">
        <div className="section-title-row">
          <div>
            <h2>{ability.name}</h2>
            <p>{ability.source || 'Character ability'}</p>
          </div>
          <div className="button-row">
            <button className="btn" onClick={onEdit}>Edit</button>
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        </div>
        <div className="item-detail-body">
          <MarkdownRenderer text={ability.description} emptyLabel="No ability notes yet." />
        </div>
      </div>
    </Modal>
  );
}

function AbilityEditorModal({
  character,
  initialEditing,
  submitAction,
  onClose
}: {
  character: Character;
  initialEditing: CharacterAbility | null;
  submitAction: Props['submitAction'];
  onClose: () => void;
}) {
  const abilities = character.characterAbilities || [];
  const [editingAbility, setEditingAbility] = useState<CharacterAbility | null>(initialEditing);

  async function saveAbility(ability: Partial<CharacterAbility>) {
    await submitAction({
      type: 'spell.ability.upsert',
      payload: {
        characterId: character.id,
        ability
      }
    });
    setEditingAbility(null);
  }

  return (
    <Modal>
      <div className="modal-card sheet-editor-modal">
        <div className="section-title-row">
          <div>
            <h2>Edit {character.name} Abilities</h2>
            <p>Small character wiki entries. These do not change mechanics by themselves.</p>
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <div className="ability-editor-layout">
          <div className="spellbook-known-list">
            {abilities.length === 0 && <p className="empty">No saved abilities.</p>}
            {abilities.map(ability => (
              <div className="spellbook-known-row" key={ability.id}>
                <div>
                  <strong>{ability.name}</strong>
                  <span>{ability.source || 'Character ability'}</span>
                </div>
                <div className="button-row">
                  <button className="btn small" onClick={() => setEditingAbility(ability)}>Edit</button>
                  <button
                    className="btn danger small"
                    onClick={() => submitAction({ type: 'spell.ability.remove', payload: { characterId: character.id, id: ability.id } })}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <AbilityForm
            key={editingAbility?.id || 'new-ability'}
            initial={editingAbility}
            submitLabel={editingAbility ? 'Save ability' : 'Add ability'}
            onSubmit={saveAbility}
          />
        </div>
      </div>
    </Modal>
  );
}

function AbilityForm({
  initial,
  submitLabel,
  onSubmit
}: {
  initial: CharacterAbility | null;
  submitLabel: string;
  onSubmit: (ability: Partial<CharacterAbility>) => Promise<unknown>;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [source, setSource] = useState(initial?.source || '');
  const [description, setDescription] = useState(initial?.description || '');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    await onSubmit({
      id: initial?.id,
      name: name.trim(),
      source: source.trim(),
      description
    });
    if (!initial) {
      setName('');
      setSource('');
      setDescription('');
    }
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <input value={name} onChange={event => setName(event.target.value)} placeholder="Ability heading" />
      <input value={source} onChange={event => setSource(event.target.value)} placeholder="Optional source, item or feature" />
      <div className="form-wide">
        <MarkdownEditor
          value={description}
          onChange={setDescription}
          label="Ability notes"
          placeholder="Markdown notes, rules text, item explanation or reminders"
        />
      </div>
      <button className="btn success">{submitLabel}</button>
    </form>
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
