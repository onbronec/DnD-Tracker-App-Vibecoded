import { useEffect, useMemo, useState } from 'react';
import { useGameSocket } from './client/useGameSocket';
import type { PageScope } from './shared/types';
import { CombatPage } from './pages/CombatPage';
import { InventoryPage } from './pages/InventoryPage';
import { SpellsPage } from './pages/SpellsPage';
import { MonstersPage } from './pages/MonstersPage';
import { DatabasesPage } from './pages/DatabasesPage';
import { HistoryPanel } from './components/HistoryPanel';

const PAGES: Array<{ id: PageScope; label: string; dmOnly?: boolean }> = [
  { id: 'combat', label: 'Combat' },
  { id: 'spells', label: 'Spells & Abilities' },
  { id: 'monsters', label: 'Monster Abilities', dmOnly: true },
  { id: 'inventory', label: 'Inventory' },
  { id: 'databases', label: 'Databases' }
];

export function App() {
  const socket = useGameSocket();
  const [page, setPage] = useState<PageScope>('combat');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(true);

  const state = socket.state;
  const isDM = socket.role === 'dm';
  const visiblePages = useMemo(() => PAGES.filter(item => isDM || !item.dmOnly), [isDM]);

  useEffect(() => {
    if (!visiblePages.some(item => item.id === page)) setPage('combat');
  }, [isDM, page, visiblePages]);

  useEffect(() => {
    if (!socket.toast) return;
    const timer = window.setTimeout(() => socket.setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [socket.toast, socket.setToast]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const editingText = tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || target?.isContentEditable;
      const modalOpen = Boolean(document.querySelector('[role="dialog"]'));
      if (editingText || modalOpen) return;

      if ((event.key === ' ' || event.key === 'PageUp') && page === 'combat' && socket.role === 'dm' && state?.combatState.active) {
        event.preventDefault();
        socket.submitAction({ type: 'combat.nextTurn' });
      } else if (event.key === 'PageDown' && page === 'combat' && socket.role === 'dm' && state?.combatState.active) {
        event.preventDefault();
        socket.submitAction({ type: 'combat.previousTurn' });
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        if (event.shiftKey) socket.redo(page);
        else socket.undo(page);
      }
    }

    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, [page, socket, state?.combatState.active]);

  if (!state) {
    return (
      <main className="app-shell">
        <div className="loading-card">Pripojuji tracker...</div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>DnD Combat Tracker</h1>
          <p>Server-authoritative local Wi-Fi session tracker</p>
        </div>
        <div className="status-stack">
          <span className={`pill ${isDM ? 'dm' : 'player'}`}>{isDM ? 'DM View' : 'Player View'}</span>
          <span className={`connection ${socket.connected ? 'ok' : 'bad'}`}>{socket.connected ? 'Connected' : 'Disconnected'}</span>
          {isDM && <button className="btn success small" onClick={socket.autosave}>Autosave</button>}
          {socket.invalidDmToken && <span className="warning-text">DM token invalid - player mode active</span>}
        </div>
      </header>

      <nav className="nav-bar" aria-label="Tracker sections">
        {visiblePages.map(item => (
          <button
            key={item.id}
            className={`nav-btn ${page === item.id ? 'active' : ''}`}
            onClick={() => setPage(item.id)}
          >
            {item.label}
          </button>
        ))}
        <button className="nav-btn history-toggle" onClick={() => setHistoryOpen(value => !value)}>
          History
        </button>
      </nav>

      {socket.toast && (
        <div className="toast">
          {socket.toast}
        </div>
      )}

      <div className={`workspace ${historyOpen ? 'with-history' : ''}`}>
        <section className="page-frame">
          {page === 'combat' && (
            <CombatPage
              state={state}
              role={socket.role}
              submitAction={socket.submitAction}
              onOpenSpells={(characterId) => {
                setSelectedCharacterId(characterId);
                setPage('spells');
              }}
              onOpenInventory={(characterId) => {
                setSelectedCharacterId(characterId);
                setPage('inventory');
              }}
              onOpenMonsters={(characterId) => {
                setSelectedCharacterId(characterId);
                setPage('monsters');
              }}
            />
          )}
          {page === 'spells' && (
            <SpellsPage
              state={state}
              role={socket.role}
              submitAction={socket.submitAction}
              selectedCharacterId={selectedCharacterId}
              onSelectCharacter={setSelectedCharacterId}
              onBackToCombat={() => setPage('combat')}
            />
          )}
          {page === 'monsters' && isDM && (
            <MonstersPage
              state={state}
              submitAction={socket.submitAction}
              selectedCharacterId={selectedCharacterId}
              onSelectCharacter={setSelectedCharacterId}
              onBackToCombat={() => setPage('combat')}
            />
          )}
          {page === 'inventory' && (
            <InventoryPage
              state={state}
              role={socket.role}
              submitAction={socket.submitAction}
              selectedCharacterId={selectedCharacterId}
              onSelectCharacter={setSelectedCharacterId}
              onBackToCombat={() => setPage('combat')}
            />
          )}
          {page === 'databases' && <DatabasesPage state={state} role={socket.role} submitAction={socket.submitAction} onBackToCombat={() => setPage('combat')} />}
        </section>
        {historyOpen && (
          <HistoryPanel
            currentPage={page}
            entries={socket.history}
            onUndo={() => socket.undo(page)}
            onRedo={() => socket.redo(page)}
          />
        )}
      </div>
    </main>
  );
}
