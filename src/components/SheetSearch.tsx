import { useState } from 'react';
import type { Character, SpellDatabaseEntry } from '../shared/types';
import { actionTypeLabel } from '../shared/actions';

interface SearchEntry { id: string; name: string; description: string; meta: string; scope: string; open?: boolean }

export function SheetSearch({ character, spells, sections, conditions = [] }: { character: Character; spells: SpellDatabaseEntry[]; sections: Array<{ id: string; label: string }>; conditions?: Array<Record<string, unknown>> }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const entries: SearchEntry[] = sections.map(section => ({ id: section.id, name: section.label, description: '', meta: 'Section', scope: '' }));
  character.effects.forEach((effect, index) => {
    const name = typeof effect === 'string' ? effect : effect.name;
    const condition = conditions.find(item => String(item.name).toLowerCase() === name.toLowerCase());
    entries.push({ id: `effect-${index}`, name, description: String(condition?.description || condition?.effect || ''), meta: 'Condition', scope: '#sheet-health' });
  });
  character.customFeatures.forEach((feature, index) => {
    const id = `feature-${feature.id || index}`;
    entries.push({ id, name: feature.name, description: feature.description || '', meta: 'Custom Feature', scope: '#sheet-features' });
    feature.actions?.forEach(action => entries.push({ id: `${id}-${action.id}`, name: action.name, description: action.description, meta: `${feature.name} · ${actionTypeLabel(action.actionType)}`, scope: '#sheet-features' }));
  });
  character.characterActions?.forEach(action => entries.push({ id: `action-${action.id}`, name: action.name, description: `${action.description} ${action.source || ''}`, meta: actionTypeLabel(action.actionType), scope: '#sheet-actions', open: true }));
  character.characterAbilities?.forEach(ability => entries.push({ id: `ability-${ability.id}`, name: ability.name, description: `${ability.description} ${ability.source || ''}`, meta: 'Ability', scope: '#sheet-abilities', open: true }));
  spells.filter(spell => character.spellbook?.knownSpellIds.includes(spell.id)).forEach(spell => entries.push({ id: `spell-${spell.id}`, name: spell.name, description: `${spell.description} ${spell.atHigherLevels || ''}`, meta: `Spell · ${spell.levelLabel || spell.levelKey}`, scope: '#sheet-spells-known', open: true }));
  const trimmed = query.trim().toLowerCase();
  const quoted = trimmed.length > 1 && trimmed.startsWith('"') && trimmed.endsWith('"');
  const needle = quoted ? trimmed.slice(1, -1) : trimmed;
  const matches = entries.filter(entry => (quoted ? entry.name : `${entry.name} ${entry.description} ${entry.meta}`).toLowerCase().includes(needle)).slice(0, 12);
  const showResults = Boolean(trimmed) && focused;

  function select(entry: SearchEntry) {
    setQuery('');
    const scope = entry.scope ? document.querySelector(entry.scope) : document;
    const element = entry.scope
      ? Array.from(scope?.querySelectorAll<HTMLElement>('[data-sheet-entry]') || []).find(item => item.dataset.sheetEntry === entry.id)
      : document.getElementById(entry.id);
    if (!element) return;
    if (entry.open) element.click();
    else {
      const details = element.matches('details') ? [element] : Array.from(element.querySelectorAll('details')).slice(0, 1);
      details.forEach(detail => { (detail as HTMLDetailsElement).open = true; });
    }
    requestAnimationFrame(() => {
      const headerHeight = document.getElementById('sheet-top')?.getBoundingClientRect().height || 0;
      window.scrollBy({ top: element.getBoundingClientRect().top - headerHeight - 12, behavior: 'auto' });
      element.classList.remove('sheet-search-highlight');
      void element.offsetWidth;
      element.classList.add('sheet-search-highlight');
    });
  }

  return <div className="sheet-search" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}>
    <input type="search" role="combobox" aria-autocomplete="list" aria-label={`Search ${character.name}'s sheet`} placeholder="Search this sheet…" value={query} aria-expanded={showResults} aria-controls="sheet-search-results" aria-activedescendant={showResults && matches[active] ? `sheet-search-result-${active}` : undefined} onFocus={() => setFocused(true)} onChange={event => { setQuery(event.target.value); setActive(0); setFocused(true); }} onKeyDown={event => {
      if (event.key === 'Escape') setQuery('');
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setActive(current => Math.max(0, Math.min(matches.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)))); }
      if (event.key === 'Enter' && matches[active]) { event.preventDefault(); select(matches[active]); }
    }} />
    {query && <button className="btn small" aria-label="Clear sheet search" onClick={() => setQuery('')}>×</button>}
    {showResults && <div className="sheet-search-results" id="sheet-search-results" role="listbox" aria-label="Sheet search results">
      {matches.length === 0 && <p className="empty">No matches in this sheet.</p>}
      {matches.map((entry, index) => <button type="button" role="option" id={`sheet-search-result-${index}`} key={`${entry.scope}-${entry.id}`} aria-selected={index === active} onMouseEnter={() => setActive(index)} onClick={() => select(entry)}><strong>{entry.name}</strong><small>{entry.meta}</small></button>)}
    </div>}
  </div>;
}
