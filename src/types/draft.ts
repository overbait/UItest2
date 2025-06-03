/**
 * Types for the Age of Empires II Draft Overlay
 * Based on the aoe2cm.net API and draft system
 */

// ========== Player Information ==========
export interface Player {
  id: string;
  name: string;
  role: 'host' | 'guest';
  score?: number;
}

// ========== Civilization Types ==========
export interface Civilization {
  id: string;
  name: string;
  displayName?: string;
  uniqueUnits?: string[];
  uniqueTechs?: string[];
  teamBonus?: string;
  civilizationBonus?: string[];
  expansion?: string;
  imageUrl?: string;
}

// ========== Map Types ==========
export interface GameMap {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  imageUrl?: string;
}

// ========== Action Types ==========
export type ActionType = 'PICK' | 'BAN' | 'SNIPE' | 'REVEAL_PICKS' | 'REVEAL_BANS' | 'REVEAL_SNIPES' | 'REVEAL_ALL';
export type ActionExclusivity = 'NONEXCLUSIVE' | 'EXCLUSIVE' | 'GLOBAL';

export interface DraftAction {
  type: ActionType;
  player: 'host' | 'guest' | 'none'; // 'none' for admin actions like REVEAL
  civilizationId?: string;
  mapId?: string;
  hidden?: boolean;
  exclusivity?: ActionExclusivity;
  parallel?: boolean;
  timestamp?: number;
}

export interface DraftActionResult {
  action: DraftAction;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
}

// ========== Turn Types ==========
export interface Turn {
  id: number;
  player: 'host' | 'guest' | 'none';
  action: ActionType;
  exclusivity: ActionExclusivity;
  hidden: boolean;
  parallel: boolean;
}

// ========== Draft State ==========
export interface DraftState {
  id: string;
  name?: string;
  presetId?: string;
  presetName?: string;
  status: 'waiting' | 'inProgress' | 'completed' | 'abandoned';
  host: Player;
  guest: Player;
  turns: Turn[];
  currentTurn: number;
  hostCivs: {
    picks: Civilization[];
    bans: Civilization[];
    snipes: Civilization[];
  };
  guestCivs: {
    picks: Civilization[];
    bans: Civilization[];
    snipes: Civilization[];
  };
  maps: {
    picks: GameMap[];
    bans: GameMap[];
  };
  availableCivilizations: Civilization[];
  availableMaps: GameMap[];
  startTime?: number;
  endTime?: number;
  turnTimeLimit?: number; // in seconds
  spectators?: number;
}

// ========== Preset Types ==========
export interface Preset {
  id: string;
  name: string;
  description?: string;
  turns: Turn[];
  civilizationPool: string[]; // IDs of available civilizations
  mapPool?: string[]; // IDs of available maps
  turnTimeLimit?: number; // in seconds
  hidden?: boolean;
  official?: boolean;
  author?: string;
  createdAt?: number;
  updatedAt?: number;
}

// ========== API Response Types ==========
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface DraftListResponse {
  drafts: {
    id: string;
    name?: string;
    presetId: string;
    presetName: string;
    host: string;
    guest: string;
    status: 'waiting' | 'inProgress' | 'completed' | 'abandoned';
    startTime?: number;
    spectators?: number;
  }[];
  total: number;
}

export interface PresetListResponse {
  presets: {
    id: string;
    name: string;
    description?: string;
    official?: boolean;
    author?: string;
    createdAt?: number;
  }[];
  total: number;
}

export interface CivilizationListResponse {
  civilizations: Civilization[];
  total: number;
}

export interface MapListResponse {
  maps: GameMap[];
  total: number;
}

// ========== WebSocket Event Types ==========
export type WebSocketEventType = 
  | 'connect'
  | 'disconnect'
  | 'error'
  | 'draftCreated'
  | 'draftJoined'
  | 'draftUpdate'
  | 'draftAction'
  | 'draftCompleted'
  | 'draftAbandoned'
  | 'spectatorJoined'
  | 'spectatorLeft'
  | 'turnTimerUpdate'
  | 'chatMessage';

export interface WebSocketEvent<T = any> {
  type: WebSocketEventType;
  draftId?: string;
  data?: T;
  timestamp: number;
}

export interface DraftUpdateEvent {
  draft: DraftState;
  lastAction?: DraftAction;
}

export interface TurnTimerEvent {
  turnId: number;
  remainingTime: number; // in seconds
  totalTime: number; // in seconds
}

export interface ChatMessageEvent {
  sender: string;
  message: string;
  role: 'host' | 'guest' | 'spectator' | 'system';
}

// ========== Validation Types ==========
export interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

// ========== Connection Status ==========
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface ConnectionState {
  status: ConnectionStatus;
  draftId?: string;
  error?: string;
  lastConnected?: number;
  reconnectAttempts?: number;
}

// ========== UI Configuration ==========
export interface DraftElementPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
  zIndex?: number;
  visible?: boolean;
}

export interface DraftUIConfig {
  positions: {
    hostName?: DraftElementPosition;
    guestName?: DraftElementPosition;
    hostScore?: DraftElementPosition;
    guestScore?: DraftElementPosition;
    hostCivs?: DraftElementPosition;
    guestCivs?: DraftElementPosition;
    maps?: DraftElementPosition;
    status?: DraftElementPosition;
    timer?: DraftElementPosition;
    customElements?: Record<string, DraftElementPosition>;
  };
  fonts: {
    playerNames?: string;
    civilizations?: string;
    maps?: string;
    status?: string;
  };
  colors: {
    background?: string;
    text?: string;
    hostHighlight?: string;
    guestHighlight?: string;
    pick?: string;
    ban?: string;
    snipe?: string;
  };
  images: {
    background?: string;
    hostLogo?: string;
    guestLogo?: string;
    customImages?: Record<string, string>;
  };
  animations: {
    enabled: boolean;
    duration?: number;
    type?: 'fade' | 'slide' | 'bounce' | 'none';
  };
}

// ========== AI Integration Types ==========
export interface DraftDataForAI {
  draftId: string;
  presetId: string;
  host: {
    name: string;
    score: number;
    picks: string[];
    bans: string[];
    snipes: string[];
  };
  guest: {
    name: string;
    score: number;
    picks: string[];
    bans: string[];
    snipes: string[];
  };
  maps: {
    picks: string[];
    bans: string[];
  };
  currentTurn: number;
  status: string;
}

export interface AICustomizationCommand {
  type: 'setPosition' | 'setFont' | 'setColor' | 'setImage' | 'setAnimation';
  element: string;
  value: any;
}
