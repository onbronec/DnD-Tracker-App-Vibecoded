import { useEffect, useMemo, useRef, useState } from 'react';
import { connectSocket, type SocketClient } from './socket';
import type { ActionLogEntry, ClientRole, GameAction, GameState, PageScope } from '../shared/types';

export function useGameSocket() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const requestedMode = (params.get('mode') === 'player' ? 'player' : 'dm') as ClientRole;
  const token = params.get('token');
  const [role, setRole] = useState<ClientRole>('player');
  const [connected, setConnected] = useState(false);
  const [invalidDmToken, setInvalidDmToken] = useState(false);
  const [state, setState] = useState<GameState | null>(null);
  const [history, setHistory] = useState<ActionLogEntry[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const clientRef = useRef<SocketClient | null>(null);

  useEffect(() => {
    const client = connectSocket({
      mode: requestedMode,
      token,
      onRegistered(nextRole, validDmToken) {
        setRole(nextRole);
        setInvalidDmToken(!validDmToken);
      },
      onState(nextState) {
        setState(nextState);
        setHistory(nextState.actionLog || []);
      },
      onHistory(log) {
        setHistory(log);
      },
      onError(message) {
        setToast(message);
      }
    });

    clientRef.current = client;
    client.socket.on('connect', () => setConnected(true));
    client.socket.on('disconnect', () => setConnected(false));

    return () => {
      client.socket.disconnect();
      clientRef.current = null;
    };
  }, [requestedMode, token]);

  async function submitAction(action: GameAction) {
    const result = await clientRef.current?.submitAction(action);
    if (result && !result.ok) setToast(result.error || 'Akce selhala.');
    return result;
  }

  async function undo(page: PageScope) {
    const result = await clientRef.current?.undo(page);
    if (result && !result.ok) setToast(result.error || 'Undo selhalo.');
    return result;
  }

  async function redo(page: PageScope) {
    const result = await clientRef.current?.redo(page);
    if (result && !result.ok) setToast(result.error || 'Redo selhalo.');
    return result;
  }

  async function autosave() {
    if (!token) {
      setToast('DM token chybi, autosave nelze spustit.');
      return { ok: false };
    }
    try {
      const response = await fetch(`/api/autosave?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Autosave selhal.');
      setToast('Autosave ulozen.');
      return { ok: true };
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Autosave selhal.');
      return { ok: false };
    }
  }

  return {
    requestedMode,
    role,
    connected,
    invalidDmToken,
    state,
    history,
    toast,
    setToast,
    submitAction,
    undo,
    redo,
    autosave
  };
}
