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
  
  civPicksHost: string[];
  civBansHost: string[];
  civPicksGuest: string[];
  civBansGuest: string[];
  
  mapPicksHost: string[]; 
  mapBansHost: string[];  
  mapPicksGuest: string[];
  mapBansGuest: string[]; 

  mapPicksGlobal: string[];
  mapBansGlobal: string[];

  status?: string; 
  currentTurnPlayer?: string; 
  currentAction?: string; 
}

// ========== Saved Preset Type ==========
export interface SavedPreset {
  id: string; 
  name: string; 
  civDraftId: string | null;
  mapDraftId: string | null;
  hostName: string;
  guestName: string;
  scores: { host: number; guest: number };
  boxSeriesFormat: 'bo1' | 'bo3' | 'bo5' | 'bo7' | null; // Added
  boxSeriesGames: Array<{ // Added
    map: string | null;
    hostCiv: string | null;
    guestCiv: string | null;
    winner: 'host' | 'guest' | null;
  }>;
}

// ========== Combined UI State ==========

/**
 * Represents the combined state for the UI, holding data from
 * potentially two separate drafts (civ and map) and UI-specific states.
 */
export interface CombinedDraftState {
  civDraftId: string | null;
  mapDraftId: string | null;
  
  hostName: string;  
  guestName: string; 
  
  scores: {
    host: number;
    guest: number;
  };
  
  civPicksHost: string[];
  civBansHost: string[];
  civPicksGuest: string[];
  civBansGuest: string[];
  
  mapPicksHost: string[];
  mapBansHost: string[];
  mapPicksGuest: string[];
  mapBansGuest: string[];

  mapPicksGlobal: string[];
  mapBansGlobal: string[];
  
  civDraftStatus: ConnectionStatus;
  civDraftError: string | null;
  isLoadingCivDraft: boolean;
  
  mapDraftStatus: ConnectionStatus;
  mapDraftError: string | null;
  isLoadingMapDraft: boolean;

  savedPresets: SavedPreset[]; 

  boxSeriesFormat: 'bo1' | 'bo3' | 'bo5' | 'bo7' | null;
  boxSeriesGames: Array<{ 
    map: string | null; 
    hostCiv: string | null; 
    guestCiv: string | null; 
    winner: 'host' | 'guest' | null;
  }>;
  activePresetId: string | null; // Added
}


// ========== Raw Data Structures from aoe2cm.net API ==========

export interface Aoe2cmRawPlayerInfo { 
  name: string;
}

export interface Aoe2cmRawEventData {
  player: string; 
  executingPlayer: string; 
  actionType: string; 
  chosenOptionId: string; 
  isRandomlyChosen?: boolean;
  offset?: number;
}

export interface Aoe2cmRawDraftOption {
  id: string;
  name: string;
  imageUrls?: { [key: string]: string };
  i18nPrefix?: string;
  category?: string; 
}

export interface Aoe2cmRawPresetTurn {
  player: string; 
  action: string; 
}

export interface Aoe2cmRawPresetData {
  name: string;
  presetId: string;
  draftOptions: Aoe2cmRawDraftOption[];
  turns: Aoe2cmRawPresetTurn[];
  categoryLimits?: any; 
}

export interface Aoe2cmRawDraftData {
  id?: string; 
  draftId?: string; 
  
  nameHost?: string;    
  nameGuest?: string;   
  host?: string | Aoe2cmRawPlayerInfo; 
  guest?: string | Aoe2cmRawPlayerInfo; 
  
  events: Aoe2cmRawEventData[];
  preset: Aoe2cmRawPresetData;
  
  nextAction?: number; 
  status?: string;     
  ongoing?: boolean;   
  
  fixedNames?: boolean;
  hostConnected?: boolean;
  guestConnected?: boolean;
  hostReady?: boolean;
  guestReady?: boolean;
  startTimestamp?: number;
}

// ========== Generic API Response Wrapper ==========
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
  };
}
