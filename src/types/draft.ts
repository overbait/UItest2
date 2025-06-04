/**
 * Types for AoE Draft Overlay
 * Focused on data structures for fetching, processing, and displaying draft information.
 */

// ========== Connection Status ==========
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// ========== Processed Data for a Single Draft (Civ or Map) ==========

/**
 * Represents the processed and structured data from a single draft ID (either civ or map).
 * This is the output of transforming raw API data.
 */
export interface SingleDraftData {
  id: string;
  hostName: string;
  guestName: string;
  
  // These will be populated based on whether it's a civ or map draft
  // For a civ draft, civPicks/Bans will be filled.
  // For a map draft, mapPicks/Bans will be filled.
  civPicksHost: string[];
  civBansHost: string[];
  civPicksGuest: string[];
  civBansGuest: string[];
  
  mapPicksHost: string[]; // Populated if map draft is side-specific
  mapBansHost: string[];  // Populated if map draft is side-specific
  mapPicksGuest: string[];// Populated if map draft is side-specific
  mapBansGuest: string[]; // Populated if map draft is side-specific

  // If map picks/bans are treated as global for some draft types
  mapPicksGlobal: string[];
  mapBansGlobal: string[];

  status?: string; // e.g., "inProgress", "completed"
  currentTurnPlayer?: string; // Name of the player or role (Host/Guest)
  currentAction?: string; // e.g., "PICK", "BAN"
  
  // Raw events can be stored for debugging or more complex logic later
  // rawEvents?: Aoe2cmRawEventData[]; 
}

// ========== Saved Preset Type ==========
export interface SavedPreset {
  id: string; // Unique ID for the preset (e.g., timestamp or UUID)
  name: string; // User-defined or auto-generated name (e.g., "PlayerA vs PlayerB Bo5")
  civDraftId: string | null;
  mapDraftId: string | null;
  hostName: string;
  guestName: string;
  scores: { host: number; guest: number };
}

// ========== Combined UI State ==========

/**
 * Represents the combined state for the UI, holding data from
 * potentially two separate drafts (civ and map) and UI-specific states.
 */
export interface CombinedDraftState {
  civDraftId: string | null;
  mapDraftId: string | null;
  
  hostName: string;  // Usually derived from civ draft, or first loaded
  guestName: string; // Usually derived from civ draft, or first loaded
  
  scores: {
    host: number;
    guest: number;
  };
  
  // Civ picks and bans
  civPicksHost: string[];
  civBansHost: string[];
  civPicksGuest: string[];
  civBansGuest: string[];
  
  // Map picks and bans (per-player, as suggested by UI screenshot)
  mapPicksHost: string[];
  mapBansHost: string[];
  mapPicksGuest: string[];
  mapBansGuest: string[];

  // Global map picks/bans (if a draft type doesn't specify per-player for maps)
  // These might be populated if the transform logic determines maps are global for a specific preset.
  mapPicksGlobal: string[];
  mapBansGlobal: string[];
  
  // Status and error tracking for civ draft
  civDraftStatus: ConnectionStatus;
  civDraftError: string | null;
  isLoadingCivDraft: boolean;
  
  // Status and error tracking for map draft
  mapDraftStatus: ConnectionStatus;
  mapDraftError: string | null;
  isLoadingMapDraft: boolean;

  savedPresets: SavedPreset[]; // Added for storing user-saved presets

  // New properties for BoX series
  boxSeriesFormat: 'bo1' | 'bo3' | 'bo5' | 'bo7' | null;
  boxSeriesGames: Array<{ 
    map: string | null; 
    hostCiv: string | null; 
    guestCiv: string | null; 
  }>;
}


// ========== Raw Data Structures from aoe2cm.net API ==========
// These represent the direct JSON response from `https://aoe2cm.net/api/draft/:id`

export interface Aoe2cmRawPlayerInfo { // Can be a simple name or a more complex object
  name: string;
  // Other potential fields: civs, bans (if API provides them directly on player objects)
}

export interface Aoe2cmRawEventData {
  player: string; // "HOST", "GUEST", or actual player name
  executingPlayer: string; // "HOST" or "GUEST"
  actionType: string; // "pick", "ban", "snipe", etc.
  chosenOptionId: string; // ID of the civ or map
  isRandomlyChosen?: boolean;
  offset?: number;
  // other event properties
}

export interface Aoe2cmRawDraftOption {
  id: string;
  name: string;
  imageUrls?: { [key: string]: string };
  i18nPrefix?: string;
  category?: string; // Useful to distinguish civs from maps if not clear from ID
}

export interface Aoe2cmRawPresetTurn {
  player: string; // "HOST", "GUEST", "NONE"
  action: string; // e.g., "PICK", "BAN"
  // other preset turn properties
}

export interface Aoe2cmRawPresetData {
  name: string;
  presetId: string;
  draftOptions: Aoe2cmRawDraftOption[];
  turns: Aoe2cmRawPresetTurn[];
  categoryLimits?: any; // Can be more specific if needed
}

export interface Aoe2cmRawDraftData {
  id?: string; // For /api/draft/:id, this is the ID from the URL
  draftId?: string; // For /api/recentdrafts, this field exists
  
  nameHost?: string;    // Directly available in the JSON response
  nameGuest?: string;   // Directly available in the JSON response
  host?: string | Aoe2cmRawPlayerInfo; // Sometimes just name, sometimes object
  guest?: string | Aoe2cmRawPlayerInfo; // Sometimes just name, sometimes object
  
  events: Aoe2cmRawEventData[];
  preset: Aoe2cmRawPresetData;
  
  nextAction?: number; // Index of the next turn/action
  status?: string;     // e.g., "COMPLETED", "ONGOING" (might not be present in all responses)
  ongoing?: boolean;   // From recentdrafts endpoint
  
  fixedNames?: boolean;
  hostConnected?: boolean;
  guestConnected?: boolean;
  hostReady?: boolean;
  guestReady?: boolean;
  startTimestamp?: number;
  // ... any other fields observed in the API response
}

// ========== Generic API Response Wrapper ==========
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
  };
}
