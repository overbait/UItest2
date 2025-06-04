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

export interface Aoe2cmRawDraftData { /* ... */ } // Assuming full content from previous state

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface SingleDraftData { /* ... */ } // Assuming full content from previous state

// Updated Types for Studio Interface
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
  scale?: number; // New property for scale
  [key: string]: any;
}

export interface SavedStudioLayout {
  id: string;
  name: string;
  layout: StudioElement[];
}

export interface CombinedDraftState {
  /* ... existing fields ... */
  civDraftId: string | null; mapDraftId: string | null; hostName: string; guestName: string;
  scores: { host: number; guest: number }; civPicksHost: string[]; civBansHost: string[];
  civPicksGuest: string[]; civBansGuest: string[]; mapPicksHost: string[]; mapBansHost: string[];
  mapPicksGuest: string[]; mapBansGuest: string[]; mapPicksGlobal: string[]; mapBansGlobal: string[];
  civDraftStatus: ConnectionStatus; civDraftError: string | null; isLoadingCivDraft: boolean;
  mapDraftStatus: ConnectionStatus; mapDraftError: string | null; isLoadingMapDraft: boolean;
  savedPresets: SavedPreset[]; activePresetId: string | null;
  boxSeriesFormat: 'bo1' | 'bo3' | 'bo5' | 'bo7' | null; boxSeriesGames: BoxSeriesGame[];
  studioLayout: StudioElement[];
  savedStudioLayouts: SavedStudioLayout[];
  selectedElementId?: string | null;
}
