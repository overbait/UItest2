// Basic initial types - will be expanded

export interface SavedPreset {
  id: string;
  name: string;
  civDraftId: string | null;
  mapDraftId: string | null;
  hostName: string;
  guestName: string;
  scores: { host: number; guest: number };
  boxSeriesFormat: 'bo1' | 'bo3' | 'bo5' | 'bo7' | null;
  boxSeriesGames: BoxSeriesGame[];
}

export interface BoxSeriesGame {
  map: string | null;
  hostCiv: string | null;
  guestCiv: string | null;
  winner: 'host' | 'guest' | null;
}

export interface Aoe2cmRawDraftData {
  id?: string;
  draftId?: string;
  nameHost?: string;
  nameGuest?: string;
  preset?: {
    name?: string;
    turns?: Array<{ player: string; action: string }>;
    draftOptions?: Array<{ id: string; name: string }>;
  };
  events?: Array<{
    actionType?: string;
    executingPlayer?: string;
    chosenOptionId?: string;
  }>;
  nextAction?: number;
  status?: string; // e.g., "COMPLETED", "IN_PROGRESS"
  ongoing?: boolean;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

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
  status: 'inProgress' | 'completed' | 'unknown';
  currentTurnPlayer?: string;
  currentAction?: string;
}

// New Types for Studio Interface
export interface StudioElement {
  id: string;
  type: string; // e.g., 'ScoreDisplay', 'MapImage'
  position: { x: number; y: number };
  size: { width: number; height: number };
  // Potentially other properties like styleOverrides, dataBinding, etc.
  [key: string]: any; // Allow other properties for flexibility initially
}

export interface SavedStudioLayout {
  id: string;
  name: string;
  layout: StudioElement[];
}

export interface CombinedDraftState {
  civDraftId: string | null;
  mapDraftId: string | null;
  hostName: string;
  guestName: string;
  scores: { host: number; guest: number };
  
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
  activePresetId: string | null;

  boxSeriesFormat: 'bo1' | 'bo3' | 'bo5' | 'bo7' | null;
  boxSeriesGames: BoxSeriesGame[];

  // New state for Studio Interface
  studioLayout: StudioElement[];
  savedStudioLayouts: SavedStudioLayout[];
}
