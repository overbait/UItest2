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

export interface StudioElement {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  fontFamily?: string;
  showName?: boolean;
  showScore?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  scale?: number;
  isPivotLocked?: boolean; // New property for mirror/pivot functionality
  pivotInternalOffset?: number;
  [key: string]: any;
}

export interface SavedStudioLayout {
  id: string;
  name: string;
  canvases: StudioCanvas[]; // Replaces 'layout'
  activeCanvasId: string | null; // Stores the last active canvas ID for this layout
}

export interface CombinedDraftState {
  civDraftId: string | null; mapDraftId: string | null; hostName: string; guestName: string;
  scores: { host: number; guest: number }; civPicksHost: string[]; civBansHost: string[];
  civPicksGuest: string[]; civBansGuest: string[]; mapPicksHost: string[]; mapBansHost: string[];
  mapPicksGuest: string[]; mapBansGuest: string[]; mapPicksGlobal: string[]; mapBansGlobal: string[];
  civDraftStatus: ConnectionStatus; civDraftError: string | null; isLoadingCivDraft: boolean;
  mapDraftStatus: ConnectionStatus; mapDraftError: string | null; isLoadingMapDraft: boolean;
  savedPresets: SavedPreset[]; activePresetId: string | null;
  boxSeriesFormat: 'bo1' | 'bo3' | 'bo5' | 'bo7' | null; boxSeriesGames: BoxSeriesGame[];
  // studioLayout: StudioElement[]; // This line is removed
  currentCanvases: StudioCanvas[];
  activeCanvasId: string | null;
  savedStudioLayouts: SavedStudioLayout[]; // This should already exist
  selectedElementId: string | null; // This should already exist
  activeStudioLayoutId: string | null;
}

// Define StudioCanvas type
export interface StudioCanvas {
  id: string; // Unique identifier for the canvas
  name: string; // User-friendly name for the tab, e.g., "Scene 1" or "Default"
  layout: StudioElement[]; // Array of elements on this canvas
}
