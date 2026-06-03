import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { AbilityKey, Character, ClientRole, CustomFeature, GameAction, GameState } from '../shared/types';
import { CollapsiblePanelGroup } from '../components/CollapsiblePanel';
import { Modal } from '../components/Modal';
import { EffectModal } from './CombatPage';
import { effectToString, hpClass } from '../shared/defaults';
import {
  ABILITIES,
  SKILLS,
  abilityModifier,
  adjustedAbilityScores,
  clampAbilityScore,
  clampProficiencyBonus,
  saveBonus,
  signed,
  skillBonus
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
        <HitDice character={selected} submitAction={submitAction} />
        <Features character={selected} submitAction={submitAction} />
      </div>
    </div>
  );
}

const SHEET_SECTION_LINKS = [
  { id: 'sheet-top', label: 'Character' },
  { id: 'sheet-health', label: 'Health & Conditions' },
  { id: 'sheet-core', label: 'Scores, Saves & Skills' },
  { id: 'sheet-tools', label: 'Setup & Features' },
  { id: 'sheet-spell-slots', label: 'Spell Slots' },
  { id: 'sheet-hit-dice', label: 'Hit Dice' },
  { id: 'sheet-features', label: 'Custom Features' }
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
          return (
            <button
              key={`${effectToString(effect)}-${index}`}
              className={`effect-tag ${conditionKindClass(condition)}`}
              title={tooltip}
              data-tooltip={tooltip}
              onClick={() => setModalOpen(true)}
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
            meta: `${ABILITIES.find(ability => ability.key === skill.ability)?.short}${(character.skillExpertise || []).includes(skill.key) ? ' / expertise' : (character.skillProficiencies || []).includes(skill.key) ? ' / proficient' : ''}`,
            value: skillBonus(character, skill.key, adjusted.scores)
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
  const [scores, setScores] = useState<Record<AbilityKey, string>>(() => ABILITIES.reduce((result, ability) => {
    result[ability.key] = String(character.abilityScores?.[ability.key] ?? 10);
    return result;
  }, {} as Record<AbilityKey, string>));
  const [saveProficiencies, setSaveProficiencies] = useState<AbilityKey[]>(character.savingThrowProficiencies || []);
  const [skillProficiencies, setSkillProficiencies] = useState<string[]>(character.skillProficiencies || []);
  const [skillExpertise, setSkillExpertise] = useState<string[]>(character.skillExpertise || []);

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
      abilityScores: nextScores,
      savingThrowProficiencies: saveProficiencies,
      skillProficiencies: [...new Set([...skillProficiencies, ...expertise])],
      skillExpertise: expertise
    });
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
