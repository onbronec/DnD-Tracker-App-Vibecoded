import { createContext, ReactNode, useContext, useMemo } from 'react';
import type { GameState } from '../shared/types';

export type DatabaseReferenceKind = 'condition' | 'spell' | 'monster';

export interface DatabaseReference {
  kind: DatabaseReferenceKind;
  id: string;
  name: string;
  item: Record<string, unknown>;
}

const DatabaseReferenceContext = createContext<DatabaseReference[]>([]);

export function DatabaseReferenceProvider({ state, children }: { state: GameState; children: ReactNode }) {
  const references = useMemo(() => {
    const result: DatabaseReference[] = [];
    (state.conditionDatabase || []).forEach(item => addReference(result, 'condition', item));
    (state.spellDatabase || []).forEach(item => addReference(result, 'spell', item as unknown as Record<string, unknown>));
    (state.monsterDatabase || []).forEach(item => addReference(result, 'monster', item));
    return result.sort((a, b) => b.name.length - a.name.length);
  }, [state.conditionDatabase, state.spellDatabase, state.monsterDatabase]);

  return (
    <DatabaseReferenceContext.Provider value={references}>
      {children}
    </DatabaseReferenceContext.Provider>
  );
}

export function useDatabaseReferences() {
  return useContext(DatabaseReferenceContext);
}

function addReference(result: DatabaseReference[], kind: DatabaseReferenceKind, item: Record<string, unknown>) {
  const name = String(item.name || '').trim();
  if (!name) return;
  result.push({
    kind,
    id: String(item.id || `${kind}:${name}`),
    name,
    item
  });
}
