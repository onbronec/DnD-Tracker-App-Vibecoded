import { useEffect, useState } from 'react';
import type { Character, CharacterCasting, GameAction, SpellDatabaseEntry } from '../shared/types';
import { castingLevels, castingResource } from '../shared/casting';
import { spellIsActive } from '../shared/spells';
import { NumberInput } from './NumberInput';

type Submit = (action: GameAction) => Promise<unknown>;

export function CastingResources({ character, submitAction, levels, sticky = false }: { character: Character; submitAction: Submit; levels?: string[]; sticky?: boolean }) {
  const [top, setTop] = useState(0);
  useEffect(() => {
    if (!sticky) return;
    const header = document.getElementById('sheet-top');
    const update = () => setTop((header?.getBoundingClientRect().height || 0) + 8);
    update();
    if (typeof ResizeObserver === 'undefined' || !header) return;
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => observer.disconnect();
  }, [sticky]);
  const seen = new Set<string>();
  const rows = (levels || castingLevels(character)).filter(level => {
    const resource = castingResource(character, level);
    const id = resource.kind === 'spark' ? 'spark' : resource.kind === 'feature' ? resource.feature?.id || `missing-${level}` : level;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  if (!rows.length) return null;
  return <div className={`casting-resources ${sticky ? 'casting-resources-sticky' : ''}`} style={sticky ? { top } : undefined} aria-label="Casting resources">
    {rows.map(level => {
      const resource = castingResource(character, level);
      return <div className="casting-resource" key={level}>
        <span><strong>{resource.label}</strong> {resource.kind === 'free' ? 'No resource' : `${resource.available}/${resource.max}`}{resource.kind === 'spark' && resource.active ? ' · condition first' : ''}</span>
        {resource.kind !== 'free' && <button className="btn small" disabled={resource.available < 1} onClick={() => submitAction(resource.kind === 'spark' ? { type: 'spell.spark.spend', payload: { characterId: character.id } } : resource.kind === 'feature' ? { type: 'spell.feature.uses', payload: { characterId: character.id, featureId: resource.feature?.id, delta: 1 } } : { type: 'spell.slot.spend', payload: { characterId: character.id, level } })}>Use</button>}
      </div>;
    })}
  </div>;
}

export function SpellCastControl({ character, spell, submitAction }: { character: Character; spell: SpellDatabaseEntry; submitAction: Submit }) {
  const [level, setLevel] = useState(spell.levelKey);
  const levels = /^[1-9]$/.test(spell.levelKey) ? [...new Set([spell.levelKey, ...castingLevels(character).filter(key => /^[1-9]$/.test(key) && Number(key) >= Number(spell.levelKey))])] : [spell.levelKey];
  const resource = castingResource(character, level);
  const active = spellIsActive(spell, character.spellbook);
  return <div className="spell-cast-section"><CastingResources character={character} submitAction={submitAction} levels={[level]} /><div className="spell-cast-controls">
    {levels.length > 1 && <label>Cast at level<select aria-label="Cast at level" value={level} onChange={event => setLevel(event.target.value)}>{levels.map(key => <option key={key} value={key}>Level {key}</option>)}</select></label>}
    <span>{resource.kind === 'free' ? 'No resource needed' : `${resource.label}: ${resource.available} available`}</span>
    <button className="btn purple" disabled={!active || resource.available < 1} onClick={() => submitAction({ type: 'spell.cast', payload: { characterId: character.id, spellId: spell.id, level } })}>Cast {spell.name}</button>
    {!active && <small>Not prepared</small>}
  </div></div>;
}

export function CastingSettings({ character, submitAction }: { character: Character; submitAction: Submit }) {
  const [casting, setCasting] = useState<CharacterCasting>(character.casting || { type: 'standard', featureByLevel: {} });
  const [maxima, setMaxima] = useState<Record<string, number>>(Object.fromEntries(['6', '7', '8', '9'].map(level => [level, character.spellSlots[level]?.max || 0])));
  const features = character.customFeatures;
  function featureSelect(value: string, update: (id: string) => void, label: string) {
    return <select aria-label={label} value={value} onChange={event => update(event.target.value)}><option value="">Native spellslots / none</option>{value && !features.some(feature => feature.id === value) && <option value={value}>Missing feature — choose another</option>}{features.map(feature => <option key={feature.id} value={feature.id}>{feature.name}</option>)}</select>;
  }
  return <form className="casting-settings" onSubmit={event => { event.preventDefault(); submitAction({ type: 'spell.casting.update', payload: { characterId: character.id, casting, slotMaxByLevel: maxima } }); }}>
    <label className="field-card"><span>Casting type</span><select aria-label="Casting type" value={casting.type} onChange={event => setCasting(current => ({ ...current, type: event.target.value as CharacterCasting['type'] }))}><option value="standard">Standard</option><option value="warlock">Warlock — short-rest levels 1–9</option><option value="divineSpark">Divine Spark — epic spells</option></select></label>
    {casting.type === 'warlock' && <>
      <label className="field-card"><span>Shared resource for levels 1–5</span>{featureSelect(casting.featureByLevel['1'] || '', id => setCasting(current => ({ ...current, featureByLevel: { ...current.featureByLevel, ...Object.fromEntries(['1', '2', '3', '4', '5'].map(level => [level, id])) } })), 'Shared level 1–5 resource')}</label>
      <div className="form-grid">{['6', '7', '8', '9'].map(level => <label className="field-card" key={level}><span>Level {level} resource</span>{featureSelect(casting.featureByLevel[level] || '', id => setCasting(current => ({ ...current, featureByLevel: { ...current.featureByLevel, [level]: id } })), `Level ${level} resource`)}{!casting.featureByLevel[level] && <><span>Native slots</span><NumberInput min={0} max={100} aria-label={`Level ${level} native slots`} value={maxima[level]} onChange={event => setMaxima(current => ({ ...current, [level]: Number(event.target.value) }))} /></>}</label>)}</div>
      <p>Linked features and native slots at levels 1–9 recover on short and long rests. Each cast spends one shared use.</p>
    </>}
    {casting.type === 'divineSpark' && <>
      <label className="field-card"><span>Divine Spark feature</span>{featureSelect(casting.sparkFeatureId || '', id => setCasting(current => ({ ...current, sparkFeatureId: id })), 'Divine Spark feature')}</label>
      <label className="field-card"><span>Condition consumed first</span><input value={casting.sparkCondition || 'Divine Spark'} onChange={event => setCasting(current => ({ ...current, sparkCondition: event.target.value }))} /></label>
      <p>Each epic cast removes the active condition first; otherwise it spends one feature use. Epic spellslots are not spent.</p>
    </>}
    <button className="btn success">Save casting type</button>
  </form>;
}
