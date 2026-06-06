import { useEffect, useMemo, useState } from 'react';
import { useGameSocket } from './client/useGameSocket';
import type { GameAction, PageScope, WorldCalendarState } from './shared/types';
import { CombatPage } from './pages/CombatPage';
import { InventoryPage } from './pages/InventoryPage';
import { SpellsPage } from './pages/SpellsPage';
import { MonstersPage } from './pages/MonstersPage';
import { DatabasesPage } from './pages/DatabasesPage';
import { HistoryPanel } from './components/HistoryPanel';
import { Toolbelt } from './components/Toolbelt';
import { DatabaseReferenceProvider } from './components/DatabaseReferences';

const PAGES: Array<{ id: PageScope; label: string; dmOnly?: boolean }> = [
  { id: 'combat', label: 'Combat' },
  { id: 'spells', label: 'Character Sheets' },
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

  async function submitPageAction(action: GameAction) {
    if (action.type !== 'spell.rest.all') return socket.submitAction(action);
    const restType = String(action.payload?.restType || 'short');
    if (restType === 'short') {
      const result = await socket.submitAction(action);
      if (window.confirm('End the current in-game day?')) {
        await socket.submitAction({ type: 'toolbelt.calendar.advanceDays', page: 'toolbelt', payload: { days: 1 } });
      }
      return result;
    }

    const current = formatCalendar(state?.toolbelt?.calendar);
    const next = window.prompt('Set the new in-game date after this long rest.', current);
    const result = await socket.submitAction(action);
    if (next) {
      const parsed = parseCalendar(next, state?.toolbelt?.calendar);
      await socket.submitAction({ type: 'toolbelt.calendar.setDate', page: 'toolbelt', payload: parsed });
    }
    return result;
  }

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
        <div className="loading-card">Pripojuji DnD Companion...</div>
      </main>
    );
  }

  return (
    <DatabaseReferenceProvider state={state}>
      <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>DnD Companion</h1>
          <p>Server-authoritative local Wi-Fi session companion</p>
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
              submitAction={submitPageAction}
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
              submitAction={submitPageAction}
              selectedCharacterId={selectedCharacterId}
              onSelectCharacter={setSelectedCharacterId}
              onBackToCombat={() => setPage('combat')}
            />
          )}
          {page === 'monsters' && isDM && (
            <MonstersPage
              state={state}
              submitAction={submitPageAction}
              selectedCharacterId={selectedCharacterId}
              onSelectCharacter={setSelectedCharacterId}
              onBackToCombat={() => setPage('combat')}
            />
          )}
          {page === 'inventory' && (
            <InventoryPage
              state={state}
              role={socket.role}
              submitAction={submitPageAction}
              selectedCharacterId={selectedCharacterId}
              onSelectCharacter={setSelectedCharacterId}
              onBackToCombat={() => setPage('combat')}
            />
          )}
          {page === 'databases' && <DatabasesPage state={state} role={socket.role} submitAction={submitPageAction} onBackToCombat={() => setPage('combat')} />}
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
      <Toolbelt role={socket.role} state={state} submitAction={socket.submitAction} />
      </main>
    </DatabaseReferenceProvider>
  );
}

function formatCalendar(calendar?: WorldCalendarState) {
  const current = calendar || { weekday: 'Tuesday', day: 23, month: 'December', year: 502, records: [] };
  return `${current.weekday} ${current.day} ${current.month} ${current.year}`;
}

function parseCalendar(value: string, fallback?: WorldCalendarState) {
  const current = fallback || { weekday: 'Tuesday', day: 23, month: 'December', year: 502, records: [] };
  const parts = value.trim().split(/\s+/);
  return {
    weekday: parts[0] || current.weekday,
    day: Number(parts[1]) || current.day,
    month: parts[2] || current.month,
    year: Number(parts[3]) || current.year
  };
}
