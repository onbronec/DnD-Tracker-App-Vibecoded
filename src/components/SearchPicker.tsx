import { ReactNode } from 'react';

interface Props<T> {
  items: T[];
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (item: T) => void;
  selectedId?: string;
  placeholder: string;
  emptyLabel?: string;
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  getMeta?: (item: T) => ReactNode;
  getDescription?: (item: T) => ReactNode;
  limit?: number;
}

export function SearchPicker<T>({
  items,
  query,
  onQueryChange,
  onSelect,
  selectedId,
  placeholder,
  emptyLabel = 'No matches.',
  getId,
  getLabel,
  getMeta,
  getDescription,
  limit = 8
}: Props<T>) {
  const parsed = parseQuery(query);
  const results = items
    .filter(item => {
      if (!parsed.needle) return true;
      return (parsed.nameOnly ? getLabel(item) : searchText(item)).toLowerCase().includes(parsed.needle);
    })
    .slice(0, limit);

  return (
    <div className="search-picker">
      <input value={query} onChange={event => onQueryChange(event.target.value)} placeholder={placeholder} />
      <div className="search-results" role="listbox" aria-label={placeholder}>
        {results.length === 0 && <p className="empty">{emptyLabel}</p>}
        {results.map(item => {
          const id = getId(item);
          return (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={selectedId === id}
              className={`search-result ${selectedId === id ? 'selected' : ''}`}
              onClick={() => onSelect(item)}
            >
              <strong>{getLabel(item)}</strong>
              {getMeta && <span className="search-result-meta">{getMeta(item)}</span>}
              {getDescription && <small>{getDescription(item)}</small>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function searchText(item: unknown) {
  if (!item || typeof item !== 'object') return String(item || '').toLowerCase();
  return Object.values(item as Record<string, unknown>).join(' ').toLowerCase();
}

function parseQuery(query: string) {
  const trimmed = query.trim();
  const quoted = trimmed.match(/^"(.+)"$/);
  return {
    needle: (quoted ? quoted[1] : trimmed).toLowerCase(),
    nameOnly: Boolean(quoted)
  };
}
