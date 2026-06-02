export type ClientRole = 'dm' | 'player';
export type PageScope = 'combat' | 'spells' | 'monsters' | 'inventory' | 'databases';

export interface Effect {
  name: string;
  level?: number | null;
}

export interface Inventory {
  currency: {
    manaCoins: number;
    platinum: number;
    gold: number;
    silver: number;
    copper: number;
  };
  spellComponents: Array<Record<string, unknown>>;
  potions: Array<{ id?: string; name: string; quantity: number; description?: string }>;
  scrolls: Array<{ id?: string; spellName: string; quantity: number; description?: string }>;
  generalItems: Array<string | { id?: string; name: string; quantity?: number; description?: string; notes?: string }>;
  magicItems: Array<{ id?: string; name: string; itemType?: string; rarity?: string; description?: string; attuned?: boolean }>;
}

export interface Character {
  id: string;
  name: string;
  type: 'player' | 'monster';
  maxHp: number;
  currentHp: number;
  tempHp: number;
  ac: number;
  initBonus: number;
  initiative: number | null;
  maxPower?: number;
  currentPower?: number;
  powerName?: string;
  effects: Effect[];
  activeInCombat?: boolean;
  revealedToPlayers: boolean;
  groupId?: string | null;
  groupName?: string | null;
  monsterData?: Record<string, unknown>;
  monsterAbilities?: MonsterAbilities;
  spellcasterLevel: number;
  spellSlots: Record<string, { max: number; used: number }>;
  customFeatures: CustomFeature[];
  hitDice: { max: number; current: number };
  inventory: Inventory;
}

export interface CustomFeature {
  name: string;
  maxUses: number;
  used: number;
  restType?: string;
  regainType?: string;
  regainAmount?: number;
  shortRestRegainType?: string;
  shortRestRegainAmount?: number;
  longRestRegainType?: string;
  longRestRegainAmount?: number;
  statusName?: string;
  statusEffect?: boolean;
}

export interface MonsterAbilities {
  enabled?: boolean;
  spellcastingType?: string;
  spellcastingLevel?: number;
  spellSlots?: Record<string, { max: number; used: number }>;
  perDaySpells?: Array<{ name: string; maxUses: number; used: number }>;
  customFeatures?: CustomFeature[];
  legendaryActions?: { enabled: boolean; max: number; used: number };
}

export interface CombatState {
  active: boolean;
  currentTurn: number;
  round: number;
  playedThisRound: number[];
}

export interface ActionLogEntry {
  id: string;
  sequence: number;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: ClientRole;
  page: PageScope;
  type: string;
  label: string;
  reversible: boolean;
  undone: boolean;
  visibility?: 'all' | 'dm';
}

export interface GameState {
  schemaVersion: number;
  characters: Character[];
  combatState: CombatState;
  monsterDatabase: Array<Record<string, unknown>>;
  magicItemDatabase: Array<Record<string, unknown>>;
  potionDatabase: Array<Record<string, unknown>>;
  conditionDatabase: Array<Record<string, unknown>>;
  itemDatabase: Array<Record<string, unknown>>;
  actionLog: ActionLogEntry[];
  redoStacks: Record<string, string[]>;
  nextSequence: number;
}

export interface GameAction<TPayload = Record<string, unknown>> {
  type: string;
  page?: PageScope;
  payload?: TPayload;
}
