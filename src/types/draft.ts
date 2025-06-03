/**
 * Simplified Types for Age of Empires II Draft Overlay
 * Focused on core draft data: player names, civ/map picks and bans.
 */

// ========== Core Draft Data ==========

/**
 * Represents a player in the draft.
 * For now, we'll mostly use hostName and guestName directly in DraftState.
 */
export interface Player {
  id: string; // 'host' or 'guest'
  name: string;
  // Score and role might be added back later if essential for basic display
}

/**
 * Represents a civilization.
 * Simplified to name, as this is what we'll likely get from the raw .js data.
 */
export interface Civilization {
  id: string; // Could be the name itself if no specific ID is provided
  name: string;
  imageUrl?: string; // Optional, if available and needed for display
}

/**
 * Represents a map.
 * Simplified to name.
 */
export interface GameMap {
  id: string; // Could be the name itself
  name: string;
  imageUrl?: string; // Optional
}

/**
 * Core state of the current draft being observed.
 * This is the primary data structure we aim to populate.
 */
export interface DraftState {
  id: string; // The draft ID (e.g., "gSQZO")
  hostName: string;
  guestName: string;
  
  hostCivPicks: string[];  // Array of civilization names
  hostCivBans: string[];   // Array of civilization names
  
  guestCivPicks: string[]; // Array of civilization names
  guestCivBans: string[];  // Array of civilization names
  
  mapPicks: string[];      // Array of map names
  mapBans: string[];       // Array of map names

  // Optional: if the raw data provides these easily, they can be useful.
  // availableCivilizations?: string[]; // Full list of civs in the draft pool
  // availableMaps?: string[];        // Full list of maps in the draft pool

  status?: 'waiting' | 'inProgress' | 'completed' | 'error' | 'unknown' | string; // Basic status
  currentTurnPlayer?: 'host' | 'guest' | 'none' | string; // Who is currently picking/banning
  currentAction?: string; // e.g., "PICK", "BAN"
}

// ========== Connection Status ==========
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// Minimal API response structure if we need to wrap direct data fetching
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
  };
}

// Raw data structures expected from aoe2cm.net/draft/{id}.js file
// These are based on observation and might need adjustment.

export interface Aoe2cmRawPlayerData {
  name: string;
  civs?: (string | { id?: string; name: string; image?: string; action?: string })[]; // Picks
  bans?: (string | { id?: string; name: string; image?: string; action?: string })[]; // Bans
  // Other potential fields: ready, score, etc.
}

export interface Aoe2cmRawEventData {
  player: 'host' | 'guest' | 'admin' | 'SERVER' | string; // Player names might appear here too
  action: string; // e.g., "gpick", "gban", "pick", "ban", "reveal"
  civ?: string;    // Civilization name or ID
  map?: string;    // Map name or ID
  id?: number;     // Event ID / Turn ID
  timestamp?: number;
  hidden?: boolean;
  parallel?: boolean;
  exclusivity?: string; // e.g., "GLOBAL"
  // other event properties
}

export interface Aoe2cmRawPresetTurn {
  action: string; // e.g. "gpick"
  player: 'host' | 'guest' | 'admin' | 'none';
  // other preset turn properties
}

export interface Aoe2cmRawPresetData {
  name: string;
  id?: string;
  turns: Aoe2cmRawPresetTurn[];
  options?: (Civilization | GameMap)[]; // This might contain the pool of civs/maps
  // other preset properties
}

export interface Aoe2cmRawDraftData {
  id: string;
  host: Aoe2cmRawPlayerData;  // Or just a name string: string
  guest: Aoe2cmRawPlayerData; // Or just a name string: string
  preset: Aoe2cmRawPresetData;
  events: Aoe2cmRawEventData[];
  status: string; // e.g., "CREATED", "IN_PROGRESS", "COMPLETED"
  currentTurnNo?: number; // Current turn number (0-indexed)
  // other fields
}
