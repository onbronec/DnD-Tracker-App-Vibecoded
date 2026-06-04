export type ClientRole = 'dm' | 'player';
export type PageScope = 'combat' | 'spells' | 'monsters' | 'inventory' | 'databases' | 'toolbelt';

export interface Effect {
  name: string;
  level?: number | null;
  ability?: AbilityKey | null;
  value?: number | null;
  diceCount?: number | null;
  diceSides?: number | null;
  damageType?: string | null;
}

export type AbilityKey = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

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
  proficiencyBonus: number;
  abilityScores: Record<AbilityKey, number>;
  savingThrowProficiencies: AbilityKey[];
  skillProficiencies: string[];
  skillExpertise: string[];
  inventory: Inventory;
  spellbook: CharacterSpellbook;
}

export interface CharacterSpellbook {
  knownSpellIds: string[];
  preparedSpellIds: string[];
  preparesSpells: boolean;
  preparedNonEpicMax: number;
  preparedEpicMax: number;
}

export interface SpellDatabaseEntry {
  id: string;
  name: string;
  levelKey: string;
  levelLabel: string;
  classes: string[];
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  ritual: boolean;
  source: string;
  page: string;
  description: string;
  atHigherLevels: string;
  tags: string[];
  importKey?: string;
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
  spellDatabase: SpellDatabaseEntry[];
  itemDatabase: Array<Record<string, unknown>>;
  actionLog: ActionLogEntry[];
  redoStacks: Record<string, string[]>;
  nextSequence: number;
  toolbelt: ToolbeltState;
}

export interface GameAction<TPayload = Record<string, unknown>> {
  type: string;
  page?: PageScope;
  payload?: TPayload;
}

export interface ToolbeltState {
  diceRolls: Record<string, DiceHistoryEntry[]>;
  improvNames: ImprovNameEntry[];
  calendar: WorldCalendarState;
  notes: ToolbeltNote[];
}

export interface DiceHistoryEntry {
  id: string;
  actorId: string;
  actorName: string;
  expression: string;
  total: number;
  detail: string;
  mode: string;
  rerollOnes: boolean;
  timestamp: string;
}

export interface ImprovNameEntry {
  id: string;
  name: string;
  timestamp: string;
}

export interface WorldCalendarState {
  weekday: string;
  day: number;
  month: string;
  year: number;
  records: CalendarRecord[];
}

export interface CalendarRecord {
  id: string;
  dateKey: string;
  text: string;
  timestamp: string;
}

export interface ToolbeltNote {
  id: string;
  date: string;
  title: string;
  text: string;
  timestamp: string;
}
