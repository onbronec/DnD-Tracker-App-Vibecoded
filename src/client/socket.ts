import { io, Socket } from 'socket.io-client';
import type { ActionLogEntry, ClientRole, GameAction, GameState, PageScope } from '../shared/types';

export interface SocketClient {
  socket: Socket;
  submitAction: (action: GameAction) => Promise<{ ok: boolean; error?: string; entry?: ActionLogEntry }>;
  undo: (page: PageScope) => Promise<{ ok: boolean; error?: string }>;
  redo: (page: PageScope) => Promise<{ ok: boolean; error?: string }>;
}

export function connectSocket(params: {
  mode: ClientRole;
  token: string | null;
  onRegistered: (role: ClientRole, validDmToken: boolean) => void;
  onState: (state: GameState) => void;
  onHistory: (log: ActionLogEntry[]) => void;
  onError: (message: string) => void;
}): SocketClient {
  const socket = io();

  socket.on('connect', () => {
    socket.emit('auth:register', { mode: params.mode, token: params.token });
  });

  socket.on('auth:registered', (payload: { role: ClientRole; validDmToken: boolean }) => {
    params.onRegistered(payload.role, payload.validDmToken);
  });

  socket.on('state:init', (state: GameState) => {
    params.onState(state);
  });

  socket.on('state:patch', (payload: { state: GameState }) => {
    params.onState(payload.state);
  });

  socket.on('history:updated', (log: ActionLogEntry[]) => {
    params.onHistory(log);
  });

  socket.on('action:rejected', (payload: { error: string }) => {
    params.onError(payload.error);
  });

  socket.on('history:error', (payload: { error: string }) => {
    params.onError(payload.error);
  });

  return {
    socket,
    submitAction(action) {
      return new Promise(resolve => {
        socket.emit('action:submit', action, resolve);
      });
    },
    undo(page) {
      return new Promise(resolve => {
        socket.emit('history:undo', { page }, resolve);
      });
    },
    redo(page) {
      return new Promise(resolve => {
        socket.emit('history:redo', { page }, resolve);
      });
    }
  };
}
