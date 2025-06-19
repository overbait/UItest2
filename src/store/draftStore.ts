import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

import {
  CombinedDraftState,
  ConnectionStatus,
  Aoe2cmRawDraftData,
  SingleDraftData,
  SavedPreset,
  StudioElement,
  SavedStudioLayout,
  StudioCanvas, // <-- Add this
  MapItem,
  // CombinedDraftState as CombinedDraftStateType, // This line is no longer needed
  CombinedDraftState as OriginalCombinedDraftState, // Import original for augmentation
} from '../types/draft';

import { customLocalStorageWithBroadcast } from './customStorage'; // Adjust path if needed

// Augment CombinedDraftState locally
export interface CombinedDraftState extends OriginalCombinedDraftState {
  forceMapPoolUpdate: number;
}

// The local CombinedDraftState interface that extended CombinedDraftStateType is no longer needed.
// The imported CombinedDraftState from ../types/draft now includes isNewSessionAwaitingFirstDraft.

const DRAFT_DATA_API_BASE_URL = 'https://aoe2cm.net/api';
const DRAFT_WEBSOCKET_URL_PLACEHOLDER = 'wss://aoe2cm.net'; // Base domain

interface DraftStore extends CombinedDraftState {
  connectToDraft: (draftIdOrUrl: string, draftType: 'civ' | 'map') => Promise<boolean>;
  disconnectDraft: (draftType: 'civ' | 'map') => void;
  reconnectDraft: (draftType: 'civ' | 'map') => Promise<boolean>;
  extractDraftIdFromUrl: (url: string) => string | null;

  setHostName: (name: string) => void;
  setGuestName: (name: string) => void;
  switchPlayerSides: () => void;
  incrementScore: (player: 'host' | 'guest') => void;
  decrementScore: (player: 'host' | 'guest') => void;
  
  saveCurrentAsPreset: (name?: string) => void; // Reverted to void
  loadPreset: (presetId: string) => Promise<void>;
  deletePreset: (presetId: string) => void;
  updatePresetName: (presetId: string, newName: string) => void;

  setBoxSeriesFormat: (format: 'bo1' | 'bo3' | 'bo5' | 'bo7' | null) => void;
  updateBoxSeriesGame: (gameIndex: number, field: 'map' | 'hostCiv' | 'guestCiv', value: string | null) => void;
  setGameWinner: (gameIndex: number, winningPlayer: 'host' | 'guest' | null) => void;
  _resetCurrentSessionState: () => void;
  _updateActivePresetIfNeeded: () => void;

  // Studio Actions
  addStudioElement: (elementType: string) => void;
  updateStudioElementPosition: (elementId: string, position: { x: number, y: number }) => void;
  updateStudioElementSize: (elementId: string, size: { width: number, height: number }) => void;
  setSelectedElementId: (elementId: string | null) => void;
  updateStudioElementSettings: (elementId: string, settings: Partial<StudioElement>) => void;
  removeStudioElement: (elementId: string) => void;

  // Studio Layout Preset Actions
  saveCurrentStudioLayout: (name: string) => void;
  loadStudioLayout: (layoutId: string) => void;
  deleteStudioLayout: (layoutId: string) => void;
  updateStudioLayoutName: (layoutId: string, newName: string) => void;

  // Player Color Actions
  setHostColor: (color: string | null) => void;
  setGuestColor: (color: string | null) => void;

  // Player Flag Actions
  setHostFlag: (flag: string | null) => void;
  setGuestFlag: (flag: string | null) => void;

  // Add new action signatures for canvas management
  setActiveCanvas: (canvasId: string) => void;
  addCanvas: (name?: string) => void;
  removeCanvas: (canvasId: string) => void;
  updateCanvasName: (canvasId: string, newName: string) => void;
  setActiveStudioLayoutId: (layoutId: string | null) => void;

  // WebSocket Actions
  connectToWebSocket: (draftId: string, draftType: 'civ' | 'map') => void;
  disconnectWebSocket: () => void;
  // handleWebSocketMessage: (messageData: any) => void; // Removed
  resetActiveCanvasLayout: () => void; // New action
}

const initialScores = { host: 0, guest: 0 };
const initialPlayerNameHost = 'Player 1';
const initialPlayerNameGuest = 'Player 2';

const initialDefaultCanvasId = `default-${Date.now()}`;
const initialCanvases: StudioCanvas[] = [{ id: initialDefaultCanvasId, name: 'Default', layout: [] }];

// Initial flags are now derived in TechnicalInterface.tsx based on playerFlagMappings in localStorage.
// The store's hostFlag/guestFlag will be null initially, then populated.

const initialCombinedState: CombinedDraftState = {
  civDraftId: null, mapDraftId: null, hostName: initialPlayerNameHost, guestName: initialPlayerNameGuest,
  scores: { ...initialScores }, civPicksHost: [], civBansHost: [], civPicksGuest: [], civBansGuest: [],
  mapPicksHost: [], mapBansHost: [], mapPicksGuest: [], mapBansGuest: [], mapPicksGlobal: [], mapBansGlobal: [],
  civDraftStatus: 'disconnected', civDraftError: null, isLoadingCivDraft: false,
  mapDraftStatus: 'disconnected', mapDraftError: null, isLoadingMapDraft: false,
  socketStatus: 'disconnected',
  socketError: null,
  socketDraftType: null,
  aoe2cmRawDraftOptions: undefined,
  savedPresets: [], activePresetId: null, boxSeriesFormat: null, boxSeriesGames: [],

  currentCanvases: initialCanvases,
  activeCanvasId: initialDefaultCanvasId,
  savedStudioLayouts: [],
  selectedElementId: null,
  activeStudioLayoutId: null,
  layoutLastUpdated: null,
  hostColor: null,
  guestColor: null,
  hostFlag: null, // Initialize to null
  guestFlag: null, // Initialize to null
  // aoe2cmRawDraftOptions is added above
  socketDraftType: null, // Added for socket draft type tracking
  draftIsLikelyFinished: false,
  isNewSessionAwaitingFirstDraft: false, // Initial value
  forceMapPoolUpdate: 0,
};

// Helper function _calculateUpdatedBoxSeriesGames is removed as per previous subtask to refactor _updateBoxSeriesGamesFromPicks directly.
// If it's needed for next steps, it would be re-introduced.

const transformRawDataToSingleDraft = ( raw: Aoe2cmRawDraftData, draftType: 'civ' | 'map' ): Partial<SingleDraftData> => {
  const hostName = raw.nameHost || 'Host'; const guestName = raw.nameGuest || 'Guest';
  const output: Partial<SingleDraftData> = { id: raw.id || raw.draftId || 'unknown-id', hostName, guestName, civPicksHost: [], civBansHost: [], civPicksGuest: [], civBansGuest: [], mapPicksHost: [], mapBansHost: [], mapPicksGuest: [], mapBansGuest: [], mapPicksGlobal: [], mapBansGlobal: [], };
  const getOptionNameById = (optionId: string): string => { const option = raw.preset?.draftOptions?.find(opt => opt.id === optionId); if (option?.name) return option.name.startsWith('aoe4.') ? option.name.substring(5) : option.name; return optionId.startsWith('aoe4.') ? optionId.substring(5) : optionId; };
  raw.events?.forEach(event => {
    const action = event.actionType?.toLowerCase() || '';
    const executingPlayer = event.executingPlayer;
    const chosenOptionId = event.chosenOptionId;
    if (!chosenOptionId) return;
    const optionName = getOptionNameById(chosenOptionId);
    const isCivAction = draftType === 'civ' || chosenOptionId.startsWith('aoe4.');
    const isMapAction = draftType === 'map' || !chosenOptionId.startsWith('aoe4.');

    if (action === 'pick') {
      if (isCivAction && draftType === 'civ') {
        if (executingPlayer === 'HOST') {
          if (!output.civPicksHost) output.civPicksHost = [];
          if (!output.civPicksHost.includes(optionName)) output.civPicksHost.push(optionName);
        } else if (executingPlayer === 'GUEST') {
          if (!output.civPicksGuest) output.civPicksGuest = [];
          if (!output.civPicksGuest.includes(optionName)) output.civPicksGuest.push(optionName);
        }
      } else if (isMapAction && draftType === 'map') {
        if (executingPlayer === 'HOST') {
          if (!output.mapPicksHost) output.mapPicksHost = [];
          if (!output.mapPicksHost.includes(optionName)) output.mapPicksHost.push(optionName);
        } else if (executingPlayer === 'GUEST') {
          if (!output.mapPicksGuest) output.mapPicksGuest = [];
          if (!output.mapPicksGuest.includes(optionName)) output.mapPicksGuest.push(optionName);
        } else if (executingPlayer === 'NONE') {
          if (!output.mapPicksGlobal) output.mapPicksGlobal = [];
          if (!output.mapPicksGlobal.includes(optionName)) output.mapPicksGlobal.push(optionName);
        }
      }
    } else if (action === 'ban') {
      if (isCivAction && draftType === 'civ') {
        if (executingPlayer === 'HOST') {
          if (!output.civBansHost) output.civBansHost = [];
          if (!output.civBansHost.includes(optionName)) output.civBansHost.push(optionName);
        } else if (executingPlayer === 'GUEST') {
          if (!output.civBansGuest) output.civBansGuest = [];
          if (!output.civBansGuest.includes(optionName)) output.civBansGuest.push(optionName);
        }
      } else if (isMapAction && draftType === 'map') {
        if (executingPlayer === 'HOST') {
          if (!output.mapBansHost) output.mapBansHost = [];
          if (!output.mapBansHost.includes(optionName)) output.mapBansHost.push(optionName);
        } else if (executingPlayer === 'GUEST') {
          if (!output.mapBansGuest) output.mapBansGuest = [];
          if (!output.mapBansGuest.includes(optionName)) output.mapBansGuest.push(optionName);
        } else if (executingPlayer === 'NONE') {
          if (!output.mapBansGlobal) output.mapBansGlobal = [];
          if (!output.mapBansGlobal.includes(optionName)) output.mapBansGlobal.push(optionName);
        }
      }
    } else if (action === 'snipe') {
      if (isCivAction && draftType === 'civ') {
        if (executingPlayer === 'HOST') {
          if (!output.civBansGuest) output.civBansGuest = [];
          if (!output.civBansGuest.includes(optionName)) output.civBansGuest.push(optionName);
        } else if (executingPlayer === 'GUEST') {
          if (!output.civBansHost) output.civBansHost = [];
          if (!output.civBansHost.includes(optionName)) output.civBansHost.push(optionName);
        }
      } else if (isMapAction && draftType === 'map') {
        if (executingPlayer === 'HOST') {
          if (!output.mapBansGuest) output.mapBansGuest = [];
          if (!output.mapBansGuest.includes(optionName)) output.mapBansGuest.push(optionName);
        } else if (executingPlayer === 'GUEST') {
          if (!output.mapBansHost) output.mapBansHost = [];
          if (!output.mapBansHost.includes(optionName)) output.mapBansHost.push(optionName);
        }
      }
    }
  });

  if (draftType === 'map' && raw.preset?.draftOptions) {
    const allMapOptions = raw.preset.draftOptions
      .filter(opt => !opt.id.startsWith('aoe4.'))
      .map(opt => getOptionNameById(opt.id));
    const pickedOrBannedMaps = new Set<string>([
      ...(output.mapPicksHost || []), ...(output.mapPicksGuest || []), ...(output.mapPicksGlobal || []),
      ...(output.mapBansHost || []), ...(output.mapBansGuest || []), ...(output.mapBansGlobal || []),
    ]);
    const remainingMaps: string[] = allMapOptions.filter(mapName => !pickedOrBannedMaps.has(mapName));
    if (remainingMaps.length === 1) {
      if (!output.mapPicksGlobal) output.mapPicksGlobal = [];
      if (!output.mapPicksGlobal.includes(remainingMaps[0])) output.mapPicksGlobal.push(remainingMaps[0]);
    }
  }

  let currentTurnPlayerDisplay: string | undefined = 'none'; let currentActionDisplay: string | undefined = 'unknown'; let draftStatus: SingleDraftData['status'] = 'unknown'; if (raw.preset?.turns && typeof raw.nextAction === 'number') { if (raw.nextAction >= raw.preset.turns.length) draftStatus = 'completed'; else { draftStatus = 'inProgress'; const currentTurnInfo = raw.preset.turns[raw.nextAction]; if (currentTurnInfo) { currentTurnPlayerDisplay = currentTurnInfo.player === 'HOST' ? hostName : currentTurnInfo.player === 'GUEST' ? guestName : 'None'; currentActionDisplay = currentTurnInfo.action?.toUpperCase().replace('G', ''); } } } else if (raw.status) draftStatus = raw.status.toLowerCase() as SingleDraftData['status']; else if (raw.ongoing === false) draftStatus = 'completed'; else if (raw.ongoing === true) draftStatus = 'inProgress';
  output.status = draftStatus; output.currentTurnPlayer = currentTurnPlayerDisplay; output.currentAction = currentActionDisplay; return output;
};

const getOptionNameFromStore = (optionId: string, draftOptions: Aoe2cmRawDraftData['preset']['draftOptions'] | undefined): string => {
  if (!draftOptions) {
    return optionId.startsWith('aoe4.') ? optionId.substring(5) : optionId;
  }
  const option = draftOptions.find(opt => opt.id === optionId);
  if (option?.name) {
    return option.name.startsWith('aoe4.') ? option.name.substring(5) : option.name;
  }
  return optionId.startsWith('aoe4.') ? optionId.substring(5) : optionId;
};

const _calculateUpdatedBoxSeriesGames = (
  boxSeriesFormat: 'bo1' | 'bo3' | 'bo5' | 'bo7' | null,
  currentBoxSeriesGames: Array<{ map: string | null; hostCiv: string | null; guestCiv: string | null; winner: 'host' | 'guest' | null }>,
  civPicksHost: string[],
  civPicksGuest: string[],
  mapPicksHost: string[],
  mapPicksGuest: string[],
  mapPicksGlobal: string[]
): Array<{ map: string | null; hostCiv: string | null; guestCiv: string | null; winner: 'host' | 'guest' | null }> => {
  let numGames = 0;
  if (boxSeriesFormat === 'bo1') numGames = 1;
  else if (boxSeriesFormat === 'bo3') numGames = 3;
  else if (boxSeriesFormat === 'bo5') numGames = 5;
  else if (boxSeriesFormat === 'bo7') numGames = 7;

  if (numGames === 0) return [];

  if (numGames === 0) return [];

  // Create a combined list of unique map picks, prioritizing host, then guest, then global.
  const combinedMapPicks = Array.from(new Set([...mapPicksHost, ...mapPicksGuest, ...mapPicksGlobal]));

  const newBoxSeriesArray = Array(numGames).fill(null).map((_, index) => {
    const existingGame = currentBoxSeriesGames && currentBoxSeriesGames[index] ? currentBoxSeriesGames[index] : { winner: null };

    const mapForGame = combinedMapPicks[index] || null;

    return {
      map: mapForGame,
      hostCiv: civPicksHost[index] || null,
      guestCiv: civPicksGuest[index] || null,
      winner: existingGame.winner || null, // Preserve winner if already set
    };
  });
  return newBoxSeriesArray;
};

const useDraftStore = create<DraftStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialCombinedState,

        connectToWebSocket: (draftId: string, draftType: 'civ' | 'map') => {
          console.log(`[connectToWebSocket] Attempting connection for draft ID: ${draftId}, type: ${draftType}`);
          if (currentSocket) {
            console.log("Disconnecting previous socket before creating a new one. Old socket draft ID:", currentSocket.io.opts.query?.draftId);
            currentSocket.disconnect();
            currentSocket = null;
          }

          try {
            set({ socketStatus: 'connecting', socketError: null, socketDraftType: draftType, draftIsLikelyFinished: false });

            currentSocket = io(DRAFT_WEBSOCKET_URL_PLACEHOLDER, {
              path: '/socket.io/',
              query: { draftId: draftId, EIO: '4' },
              transports: ['websocket'],
              reconnection: false,
            });

            // Ensure all previous listeners are removed before attaching new ones
            // This is crucial to prevent duplicate event handling if connectToWebSocket is called multiple times
            // for the same socket instance, though current logic disconnects old sockets.
            if (currentSocket) {
                currentSocket.off('connect');
                currentSocket.off('draft_state');
                currentSocket.off('playerEvent');
                currentSocket.off('act');
                currentSocket.off('adminEvent');
                currentSocket.off('draft_update');
                currentSocket.off('countdown');
                currentSocket.off('draft_finished');
                currentSocket.off('connect_error');
                currentSocket.off('disconnect');
                // currentSocket.off('any'); // If you also want to remove the .onAny listener
            }

            currentSocket.on('connect', () => {
              console.log(`Socket.IO "connect" event: Successfully connected for draft ${draftId}, type ${draftType}. Socket ID: ${currentSocket?.id}`);
              const currentStoreDraftId = get()[draftType === 'civ' ? 'civDraftId' : 'mapDraftId'];
              if (get().socketDraftType === draftType && currentStoreDraftId === draftId) {
                const loadStatusUpdate = draftType === 'civ' ?
                    { isLoadingCivDraft: false, civDraftStatus: 'live' as ConnectionStatus } :
                    { isLoadingMapDraft: false, mapDraftStatus: 'live' as ConnectionStatus };
                set({ socketStatus: 'live', socketError: null, ...loadStatusUpdate });

                // Re-attach listeners specific to an active connection
                if (currentSocket) {
                  currentSocket.on('draft_state', (data) => {
                    console.log('[draftStore] Socket.IO "draft_state" event received:', data);

                    if (!data || typeof data !== 'object') {
                      console.warn('[draftStore] Socket.IO "draft_state": Received invalid data type or null/undefined data:', data);
                      return;
                    }

                    let actualStateChangeOccurred = false;

                    set(state => {
                      let newNameHost = state.hostName;
                      let newNameGuest = state.guestName;
                      let newAoe2cmRawDraftOptions = state.aoe2cmRawDraftOptions;

                      // Handle name updates
                      if (typeof data.nameHost === 'string' && state.hostName !== data.nameHost) {
                        newNameHost = data.nameHost;
                        actualStateChangeOccurred = true;
                      }
                      if (typeof data.nameGuest === 'string' && state.guestName !== data.nameGuest) {
                        newNameGuest = data.nameGuest;
                        actualStateChangeOccurred = true;
                      }

                      // Handle preset options update
                      if (data.preset && data.preset.draftOptions && Array.isArray(data.preset.draftOptions)) {
                        if (JSON.stringify(state.aoe2cmRawDraftOptions) !== JSON.stringify(data.preset.draftOptions)) {
                          newAoe2cmRawDraftOptions = data.preset.draftOptions;
                          actualStateChangeOccurred = true;
                        }
                      }

                      // Initialize temporary pick/ban arrays from current state
                      let tempCivPicksHost = [...state.civPicksHost];
                      let tempCivBansHost = [...state.civBansHost];
                      let tempCivPicksGuest = [...state.civPicksGuest];
                      let tempCivBansGuest = [...state.civBansGuest];
                      let tempMapPicksHost = [...state.mapPicksHost];
                      let tempMapBansHost = [...state.mapBansHost];
                      let tempMapPicksGuest = [...state.mapPicksGuest];
                      let tempMapBansGuest = [...state.mapBansGuest];
                      let tempMapPicksGlobal = [...state.mapPicksGlobal];
                      let tempMapBansGlobal = [...state.mapBansGlobal];

                      let eventsProcessedCausingChange = false;
                      if (data.events && Array.isArray(data.events)) {
                        console.log('[draftStore] Socket.IO "draft_state": Processing historical events count:', data.events.length);
                        const currentSocketDraftType = state.socketDraftType; // Consistent draft type for event processing

                        data.events.forEach(event => {
                          if (!event || typeof event !== 'object' || !event.actionType || !event.hasOwnProperty('chosenOptionId')) {
                            console.warn('[draftStore] Socket.IO "draft_state": Skipping invalid event in historical event array:', event);
                            return;
                          }
                          const { executingPlayer, chosenOptionId, actionType } = event;
                          const optionName = (actionType === 'ban' && chosenOptionId === "HIDDEN_BAN") ? "Hidden Ban" :
                                           (typeof chosenOptionId === 'string') ? getOptionNameFromStore(chosenOptionId, newAoe2cmRawDraftOptions || state.aoe2cmRawDraftOptions) : "";

                          if (optionName === "" && !(actionType === 'ban' && chosenOptionId === "HIDDEN_BAN") && (typeof chosenOptionId !== 'string' || chosenOptionId.length === 0)) {
                            console.warn('[draftStore] Socket.IO "draft_state": Invalid or empty chosenOptionId in historical event:', chosenOptionId, "Event:", event);
                            return;
                          }

                          let effectiveDraftType: 'civ' | 'map' | null = null;
                          if (chosenOptionId === "HIDDEN_BAN") effectiveDraftType = currentSocketDraftType;
                          else if (typeof chosenOptionId === 'string' && chosenOptionId.startsWith('aoe4.')) effectiveDraftType = 'civ';
                          else if (typeof chosenOptionId === 'string' && chosenOptionId.length > 0) effectiveDraftType = 'map';

                          let individualEventChangedList = false;
                          if (effectiveDraftType === 'civ') {
                            if (actionType === 'pick') {
                              if (executingPlayer === 'HOST' && !tempCivPicksHost.includes(optionName)) { tempCivPicksHost.push(optionName); individualEventChangedList = true; }
                              else if (executingPlayer === 'GUEST' && !tempCivPicksGuest.includes(optionName)) { tempCivPicksGuest.push(optionName); individualEventChangedList = true; }
                            } else if (actionType === 'ban') {
                              if (executingPlayer === 'HOST' && !tempCivBansHost.includes(optionName)) { tempCivBansHost.push(optionName); individualEventChangedList = true; }
                              else if (executingPlayer === 'GUEST' && !tempCivBansGuest.includes(optionName)) { tempCivBansGuest.push(optionName); individualEventChangedList = true; }
                            } else if (actionType === 'snipe') {
                              if (executingPlayer === 'HOST' && !tempCivBansGuest.includes(optionName)) { tempCivBansGuest.push(optionName); individualEventChangedList = true; }
                              else if (executingPlayer === 'GUEST' && !tempCivBansHost.includes(optionName)) { tempCivBansHost.push(optionName); individualEventChangedList = true; }
                            }
                          } else if (effectiveDraftType === 'map') {
                            if (actionType === 'pick') {
                              if (executingPlayer === 'HOST' && !tempMapPicksHost.includes(optionName)) { tempMapPicksHost.push(optionName); individualEventChangedList = true; }
                              else if (executingPlayer === 'GUEST' && !tempMapPicksGuest.includes(optionName)) { tempMapPicksGuest.push(optionName); individualEventChangedList = true; }
                              else if (executingPlayer === 'NONE' && !tempMapPicksGlobal.includes(optionName)) { tempMapPicksGlobal.push(optionName); individualEventChangedList = true; }
                            } else if (actionType === 'ban') {
                              if (executingPlayer === 'HOST' && !tempMapBansHost.includes(optionName)) { tempMapBansHost.push(optionName); individualEventChangedList = true; }
                              else if (executingPlayer === 'GUEST' && !tempMapBansGuest.includes(optionName)) { tempMapBansGuest.push(optionName); individualEventChangedList = true; }
                              else if (executingPlayer === 'NONE' && !tempMapBansGlobal.includes(optionName)) { tempMapBansGlobal.push(optionName); individualEventChangedList = true; }
                            } else if (actionType === 'snipe') {
                              if (executingPlayer === 'HOST' && !tempMapBansGuest.includes(optionName)) { tempMapBansGuest.push(optionName); individualEventChangedList = true; }
                              else if (executingPlayer === 'GUEST' && !tempMapBansHost.includes(optionName)) { tempMapBansHost.push(optionName); individualEventChangedList = true; }
                            }
                          } else {
                             console.warn(`[draftStore] Socket.IO "draft_state": Could not determine type (civ/map) for historical event. chosenOptionId: ${chosenOptionId}, socketDraftType: ${currentSocketDraftType}`);
                          }
                          if (individualEventChangedList) eventsProcessedCausingChange = true;
                        });
                      }

                      if (eventsProcessedCausingChange) actualStateChangeOccurred = true;

                      if (!actualStateChangeOccurred) {
                        return state; // No changes from names, options, or events
                      }

                      // If any change occurred (names, options, or events), recalculate boxSeriesGames
                      const newBoxSeriesGames = _calculateUpdatedBoxSeriesGames(
                        state.boxSeriesFormat,
                        state.boxSeriesGames, // Use initial state.boxSeriesGames to preserve winners if format is same
                        tempCivPicksHost,
                        tempCivPicksGuest,
                        tempMapPicksHost,
                        tempMapPicksGuest,
                        tempMapPicksGlobal
                      );

                      // Final check if newBoxSeriesGames itself changed compared to original state's games
                      if (JSON.stringify(newBoxSeriesGames) !== JSON.stringify(state.boxSeriesGames)) {
                        actualStateChangeOccurred = true;
                      } else if (!eventsProcessedCausingChange && newNameHost === state.hostName && newNameGuest === state.guestName && newAoe2cmRawDraftOptions === state.aoe2cmRawDraftOptions) {
                        // If only boxSeriesGames were potentially the change, but they ended up being the same, and no other changes, then no actual change occurred.
                        actualStateChangeOccurred = false;
                      }


                      if (actualStateChangeOccurred) {
                        return {
                          ...state,
                          hostName: newNameHost,
                          guestName: newNameGuest,
                          aoe2cmRawDraftOptions: newAoe2cmRawDraftOptions,
                          civPicksHost: tempCivPicksHost, civBansHost: tempCivBansHost,
                          civPicksGuest: tempCivPicksGuest, civBansGuest: tempCivBansGuest,
                          mapPicksHost: tempMapPicksHost, mapBansHost: tempMapBansHost,
                          mapPicksGuest: tempMapPicksGuest, mapBansGuest: tempMapBansGuest,
                          mapPicksGlobal: tempMapPicksGlobal, mapBansGlobal: tempMapBansGlobal,
                          boxSeriesGames: newBoxSeriesGames
                        };
                      } else {
                        return state; // No actual change
                      }
                    });

                    if (actualStateChangeOccurred) {
                      console.log('[draftStore] Socket.IO "draft_state": State updated due to names, options, or historical events. Calling _updateActivePresetIfNeeded.');
                      get()._updateActivePresetIfNeeded();
                    }
                  });

                  // playerEvent handler (NEW)
                  currentSocket.on('playerEvent', (eventPayload) => {
                    console.log('[draftStore] Socket.IO "playerEvent" event received:', eventPayload);
                    if (!eventPayload || typeof eventPayload !== 'object' ||
                        !eventPayload.hasOwnProperty('player') || // 'player' instead of 'executingPlayer' from backend
                        !eventPayload.hasOwnProperty('actionType') ||
                        !eventPayload.hasOwnProperty('chosenOptionId')) {
                      console.warn('[draftStore] Socket.IO "playerEvent": Received event with invalid or missing properties (player, actionType, chosenOptionId):', eventPayload);
                      return;
                    }

                    const { player, actionType, chosenOptionId } = eventPayload;
                    // Normalize player to executingPlayer ('HOST', 'GUEST', 'NONE')
                    const executingPlayer = typeof player === 'string' ? player.toUpperCase() as 'HOST' | 'GUEST' | 'NONE' : player;


                    let optionName: string;
                    const currentDraftOptions = get().aoe2cmRawDraftOptions; // Assuming aoe2cmRawDraftOptions is the correct source for option names
                    const currentSocketDraftType = get().socketDraftType;

                    if (actionType === 'ban' && chosenOptionId === "HIDDEN_BAN") {
                      optionName = "Hidden Ban";
                    } else if (typeof chosenOptionId === 'string' && chosenOptionId.length > 0) {
                      optionName = getOptionNameFromStore(chosenOptionId, currentDraftOptions);
                    } else if (chosenOptionId === "") { // Handle potential "skip" or empty actions
                      optionName = "";
                    } else {
                      console.warn('[draftStore] Socket.IO "playerEvent": Received event with invalid chosenOptionId:', chosenOptionId, "Payload:", eventPayload);
                      return;
                    }

                    let effectiveDraftType: 'civ' | 'map' | null = null;
                    if (chosenOptionId === "HIDDEN_BAN") { // If it's a hidden ban, rely on the current socket's draft type
                        effectiveDraftType = currentSocketDraftType;
                    } else if (typeof chosenOptionId === 'string' && chosenOptionId.startsWith('aoe4.')) {
                        effectiveDraftType = 'civ';
                    } else if (typeof chosenOptionId === 'string' && chosenOptionId.length > 0) { // Non-empty and not starting with aoe4.
                        effectiveDraftType = 'map';
                    } else if (chosenOptionId === "" && currentSocketDraftType) { // For skips, use current socket type
                        effectiveDraftType = currentSocketDraftType;
                    }
                    // No else here; if chosenOptionId is invalid (and not empty string), it's caught by prior checks.

                    let pickBanStateChanged = false;
                    set(state => {
                        let tempCivPicksHost = state.civPicksHost;
                        let tempCivBansHost = state.civBansHost;
                        let tempCivPicksGuest = state.civPicksGuest;
                        let tempCivBansGuest = state.civBansGuest;
                        let tempMapPicksHost = state.mapPicksHost;
                        let tempMapBansHost = state.mapBansHost;
                        let tempMapPicksGuest = state.mapPicksGuest;
                        let tempMapBansGuest = state.mapBansGuest;
                        let tempMapPicksGlobal = state.mapPicksGlobal;
                        let tempMapBansGlobal = state.mapBansGlobal;

                        // This variable will be set to true by the outer scope's pickBanStateChanged
                        // if effectiveDraftType and actionType are valid.
                        // We re-evaluate it here to ensure atomicity.
                        let actuallyCausedPickBanChange = false;

                        if (effectiveDraftType === 'civ') {
                            if (actionType === 'pick') {
                                if (executingPlayer === 'HOST') tempCivPicksHost = [...new Set([...state.civPicksHost, optionName])];
                                else if (executingPlayer === 'GUEST') tempCivPicksGuest = [...new Set([...state.civPicksGuest, optionName])];
                                else pickBanStateChanged = false; // Outer scope variable
                            } else if (actionType === 'ban') {
                                if (executingPlayer === 'HOST') tempCivBansHost = [...new Set([...state.civBansHost, optionName])];
                                else if (executingPlayer === 'GUEST') tempCivBansGuest = [...new Set([...state.civBansGuest, optionName])];
                                else pickBanStateChanged = false;
                            } else if (actionType === 'snipe') {
                                if (executingPlayer === 'HOST') tempCivBansGuest = [...new Set([...state.civBansGuest, optionName])];
                                else if (executingPlayer === 'GUEST') tempCivBansHost = [...new Set([...state.civBansHost, optionName])];
                                else pickBanStateChanged = false;
                            } else pickBanStateChanged = false;
                        } else if (effectiveDraftType === 'map') {
                            if (actionType === 'pick') {
                                if (executingPlayer === 'HOST') tempMapPicksHost = [...new Set([...state.mapPicksHost, optionName])];
                                else if (executingPlayer === 'GUEST') tempMapPicksGuest = [...new Set([...state.mapPicksGuest, optionName])];
                                else if (executingPlayer === 'NONE') tempMapPicksGlobal = [...new Set([...state.mapPicksGlobal, optionName])];
                                else pickBanStateChanged = false;
                            } else if (actionType === 'ban') {
                                if (executingPlayer === 'HOST') tempMapBansHost = [...new Set([...state.mapBansHost, optionName])];
                                else if (executingPlayer === 'GUEST') tempMapBansGuest = [...new Set([...state.mapBansGuest, optionName])];
                                else if (executingPlayer === 'NONE') tempMapBansGlobal = [...new Set([...state.mapBansGlobal, optionName])];
                                else pickBanStateChanged = false;
                            } else if (actionType === 'snipe') {
                                if (executingPlayer === 'HOST') tempMapBansGuest = [...new Set([...state.mapBansGuest, optionName])];
                                else if (executingPlayer === 'GUEST') tempMapBansHost = [...new Set([...state.mapBansHost, optionName])];
                                else pickBanStateChanged = false;
                            } else pickBanStateChanged = false;
                        } else {
                             // This case is already logged outside and pickBanStateChanged is set to false there.
                             // No specific state update needed here, just ensure pickBanStateChanged remains false.
                            pickBanStateChanged = false;
                        }

                        // Check if the pick/ban arrays actually changed to update the outer scope variable correctly
                        actuallyCausedPickBanChange =
                            tempCivPicksHost !== state.civPicksHost ||
                            tempCivBansHost !== state.civBansHost ||
                            tempCivPicksGuest !== state.civPicksGuest ||
                            tempCivBansGuest !== state.civBansGuest ||
                            tempMapPicksHost !== state.mapPicksHost ||
                            tempMapBansHost !== state.mapBansHost ||
                            tempMapPicksGuest !== state.mapPicksGuest ||
                            tempMapBansGuest !== state.mapBansGuest ||
                            tempMapPicksGlobal !== state.mapPicksGlobal ||
                            tempMapBansGlobal !== state.mapBansGlobal;

                        if (!actuallyCausedPickBanChange) {
                            pickBanStateChanged = false; // Synchronize outer variable if no change occurred
                            return state; // No change, return current state
                        }

                        // If a pick/ban change occurred, calculate newBoxSeriesGames
                        const newBoxSeriesGames = _calculateUpdatedBoxSeriesGames(
                            state.boxSeriesFormat,
                            state.boxSeriesGames, // Pass original BoX state for winner preservation
                            tempCivPicksHost,
                            tempCivPicksGuest,
                            tempMapPicksHost,
                            tempMapPicksGuest,
                            tempMapPicksGlobal
                        );

                        return {
                            ...state,
                            civPicksHost: tempCivPicksHost, civBansHost: tempCivBansHost,
                            civPicksGuest: tempCivPicksGuest, civBansGuest: tempCivBansGuest,
                            mapPicksHost: tempMapPicksHost, mapBansHost: tempMapBansHost,
                            mapPicksGuest: tempMapPicksGuest, mapBansGuest: tempMapBansGuest,
                            mapPicksGlobal: tempMapPicksGlobal, mapBansGlobal: tempMapBansGlobal,
                            boxSeriesGames: newBoxSeriesGames
                        };
                    });

                    // pickBanStateChanged is now correctly determined by whether the set function
                    // actually returned a new state object due to pick/ban list changes.
                    // The logic for setting pickBanStateChanged based on effectiveDraftType and actionType
                    // is still outside the set call, which is fine for controlling the _updateActivePresetIfNeeded call.
                    if (pickBanStateChanged) {
                      console.log('[draftStore] Socket.IO "playerEvent": State updated, calling _updateActivePresetIfNeeded.');
                      get()._updateActivePresetIfNeeded();
                    }
                  });

                  currentSocket.on('act', (eventPayload) => {
                    console.log('Socket.IO "act" event received:', eventPayload);
                    if (!eventPayload || typeof eventPayload !== 'object') {
                      console.warn('[draftStore] Socket.IO "act": Received event with invalid payload:', eventPayload);
                      return;
                    }
                    const { executingPlayer, chosenOptionId, actionType } = eventPayload;
                    if (!actionType || !eventPayload.hasOwnProperty('chosenOptionId')) {
                      console.warn('[draftStore] Socket.IO "act": Received event with missing actionType or chosenOptionId property:', eventPayload);
                      return;
                    }

                    let optionName: string;
                    const currentDraftOptions = get().aoe2cmRawDraftOptions;
                    const currentSocketDraftType = get().socketDraftType;

                    if (actionType === 'ban' && chosenOptionId === "HIDDEN_BAN") {
                      optionName = "Hidden Ban";
                    } else if (typeof chosenOptionId === 'string' && chosenOptionId.length > 0) {
                      const rawOptionName = getOptionNameFromStore(chosenOptionId, currentDraftOptions);
                      if (chosenOptionId.startsWith('aoe4.') && !rawOptionName.startsWith('aoe4.')) {
                        console.log(`[Prefix Removal Test in 'act'] Original chosenOptionId: ${chosenOptionId}, Cleaned optionName: ${rawOptionName}`);
                      }
                      optionName = rawOptionName;
                    } else if (chosenOptionId === "") {
                      optionName = ""; // Allows for "skip" actions if applicable by backend
                    } else {
                      console.warn('[draftStore] Socket.IO "act": Received event with invalid chosenOptionId:', chosenOptionId, "Payload:", eventPayload);
                      return;
                    }

                    let effectiveDraftType: 'civ' | 'map' | null = null;
                    if (chosenOptionId === "HIDDEN_BAN") effectiveDraftType = currentSocketDraftType;
                    else if (typeof chosenOptionId === 'string' && chosenOptionId.startsWith('aoe4.')) effectiveDraftType = 'civ';
                    else if (typeof chosenOptionId === 'string' && chosenOptionId.length > 0) effectiveDraftType = 'map';
                    else if (chosenOptionId === "" && currentSocketDraftType) effectiveDraftType = currentSocketDraftType;
                    set(state => {
                        let tempCivPicksHost = state.civPicksHost;
                        let tempCivBansHost = state.civBansHost;
                        let tempCivPicksGuest = state.civPicksGuest;
                        let tempCivBansGuest = state.civBansGuest;
                        let tempMapPicksHost = state.mapPicksHost;
                        let tempMapBansHost = state.mapBansHost;
                        let tempMapPicksGuest = state.mapPicksGuest;
                        let tempMapBansGuest = state.mapBansGuest;
                        let tempMapPicksGlobal = state.mapPicksGlobal;
                        let tempMapBansGlobal = state.mapBansGlobal;
                        let actuallyCausedPickBanChange = false;

                        if (effectiveDraftType === 'civ') {
                            if (actionType === 'pick') {
                                if (executingPlayer === 'HOST') tempCivPicksHost = [...new Set([...state.civPicksHost, optionName])];
                                else if (executingPlayer === 'GUEST') tempCivPicksGuest = [...new Set([...state.civPicksGuest, optionName])];
                                else pickBanStateChanged = false;
                            } else if (actionType === 'ban') {
                                if (executingPlayer === 'HOST') tempCivBansHost = [...new Set([...state.civBansHost, optionName])];
                                else if (executingPlayer === 'GUEST') tempCivBansGuest = [...new Set([...state.civBansGuest, optionName])];
                                else pickBanStateChanged = false;
                            } else if (actionType === 'snipe') {
                                if (executingPlayer === 'HOST') tempCivBansGuest = [...new Set([...state.civBansGuest, optionName])];
                                else if (executingPlayer === 'GUEST') tempCivBansHost = [...new Set([...state.civBansHost, optionName])];
                                else pickBanStateChanged = false;
                            } else pickBanStateChanged = false;
                        } else if (effectiveDraftType === 'map') {
                            if (actionType === 'pick') {
                                if (executingPlayer === 'HOST') tempMapPicksHost = [...new Set([...state.mapPicksHost, optionName])];
                                else if (executingPlayer === 'GUEST') tempMapPicksGuest = [...new Set([...state.mapPicksGuest, optionName])];
                                else if (executingPlayer === 'NONE') tempMapPicksGlobal = [...new Set([...state.mapPicksGlobal, optionName])];
                                else pickBanStateChanged = false;
                            } else if (actionType === 'ban') {
                                if (executingPlayer === 'HOST') tempMapBansHost = [...new Set([...state.mapBansHost, optionName])];
                                else if (executingPlayer === 'GUEST') tempMapBansGuest = [...new Set([...state.mapBansGuest, optionName])];
                                else if (executingPlayer === 'NONE') tempMapBansGlobal = [...new Set([...state.mapBansGlobal, optionName])];
                                else pickBanStateChanged = false;
                            } else if (actionType === 'snipe') {
                                if (executingPlayer === 'HOST') tempMapBansGuest = [...new Set([...state.mapBansGuest, optionName])];
                                else if (executingPlayer === 'GUEST') tempMapBansHost = [...new Set([...state.mapBansHost, optionName])];
                                else pickBanStateChanged = false;
                            } else pickBanStateChanged = false;
                        } else {
                            // This case is logged outside, and pickBanStateChanged is set to false there.
                            pickBanStateChanged = false;
                        }

                        actuallyCausedPickBanChange =
                            tempCivPicksHost !== state.civPicksHost ||
                            tempCivBansHost !== state.civBansHost ||
                            tempCivPicksGuest !== state.civPicksGuest ||
                            tempCivBansGuest !== state.civBansGuest ||
                            tempMapPicksHost !== state.mapPicksHost ||
                            tempMapBansHost !== state.mapBansHost ||
                            tempMapPicksGuest !== state.mapPicksGuest ||
                            tempMapBansGuest !== state.mapBansGuest ||
                            tempMapPicksGlobal !== state.mapPicksGlobal ||
                            tempMapBansGlobal !== state.mapBansGlobal;

                        if (!actuallyCausedPickBanChange) {
                            pickBanStateChanged = false;
                            return state;
                        }

                        const newBoxSeriesGames = _calculateUpdatedBoxSeriesGames(
                            state.boxSeriesFormat,
                            state.boxSeriesGames,
                            tempCivPicksHost,
                            tempCivPicksGuest,
                            tempMapPicksHost,
                            tempMapPicksGuest,
                            tempMapPicksGlobal
                        );

                        return {
                            ...state,
                            civPicksHost: tempCivPicksHost, civBansHost: tempCivBansHost,
                            civPicksGuest: tempCivPicksGuest, civBansGuest: tempCivBansGuest,
                            mapPicksHost: tempMapPicksHost, mapBansHost: tempMapBansHost,
                            mapPicksGuest: tempMapPicksGuest, mapBansGuest: tempMapBansGuest,
                            mapPicksGlobal: tempMapPicksGlobal, mapBansGlobal: tempMapBansGlobal,
                            boxSeriesGames: newBoxSeriesGames
                        };
                    });
                    // The outer pickBanStateChanged is set based on valid effectiveDraftType and actionType
                    // before the set call. If the set call results in no actual change to pick/ban arrays,
                    // it will internally set pickBanStateChanged to false.
                    if(pickBanStateChanged) {
                        console.log('[draftStore] Socket.IO "act": State updated, calling _updateActivePresetIfNeeded.');
                        get()._updateActivePresetIfNeeded();
                    }
                  });

                  currentSocket.on('countdown', (countdownPayload) => {
                    console.log('Socket.IO "countdown" event received:', countdownPayload);
                    if (countdownPayload && typeof countdownPayload === 'object' && countdownPayload.hasOwnProperty('value')) {
                      // TODO: Implement actual state update for countdown if needed by the UI
                      // For example: set({ currentCountdownValue: countdownPayload.value, currentCountdownDisplay: countdownPayload.display });
                      console.log('[draftStore] Socket.IO "countdown": Processed payload:', countdownPayload);
                    } else {
                      console.warn('[draftStore] Socket.IO "countdown": Received event with invalid payload:', countdownPayload);
                    }
                  });

                  currentSocket.onAny((eventName, ...args) => {
                    console.log('Socket.IO [DEBUG] event received:', eventName, args);
                  });

                  currentSocket.on('draft_update', (data) => {
                    console.log('Socket.IO "draft_update" event received:', data);

                    // Added stateChanged flag to call _updateActivePresetIfNeeded only once
                    let draftUpdateStateChanged = false;
                    set(state => {
                        let newHostName = state.hostName;
                        let newGuestName = state.guestName;
                        let newAoe2cmRawDraftOptions = state.aoe2cmRawDraftOptions;

                        let tempCivPicksHost = [...state.civPicksHost];
                        let tempCivBansHost = [...state.civBansHost];
                        let tempCivPicksGuest = [...state.civPicksGuest];
                        let tempCivBansGuest = [...state.civBansGuest];
                        let tempMapPicksHost = [...state.mapPicksHost];
                        let tempMapBansHost = [...state.mapBansHost];
                        let tempMapPicksGuest = [...state.mapPicksGuest];
                        let tempMapBansGuest = [...state.mapBansGuest];
                        let tempMapPicksGlobal = [...state.mapPicksGlobal];
                        let tempMapBansGlobal = [...state.mapBansGlobal];

                        if (typeof data !== 'object' || data === null) {
                            console.warn('[draftStore] Socket.IO "draft_update": Invalid data type received:', data);
                            return state; // No changes if data is invalid
                        }

                        // Name updates
                        if (typeof data.nameHost === 'string' && newHostName !== data.nameHost) {
                            newHostName = data.nameHost;
                            draftUpdateStateChanged = true;
                        }
                        if (typeof data.nameGuest === 'string' && newGuestName !== data.nameGuest) {
                            newGuestName = data.nameGuest;
                            draftUpdateStateChanged = true;
                        }
                        // Draft options update
                        if (data.preset && data.preset.draftOptions && Array.isArray(data.preset.draftOptions)) {
                            // Basic check for actual change to avoid unnecessary re-renders if options are identical
                            if (JSON.stringify(newAoe2cmRawDraftOptions) !== JSON.stringify(data.preset.draftOptions)) {
                                newAoe2cmRawDraftOptions = data.preset.draftOptions;
                                draftUpdateStateChanged = true;
                            }
                        }

                        // Event processing
                        if (data.events && Array.isArray(data.events)) {
                            const currentSocketDraftType = state.socketDraftType; // Use state's socketDraftType for consistency within loop
                            data.events.forEach(event => {
                                if (!event || typeof event !== 'object' || !event.actionType || !event.hasOwnProperty('chosenOptionId')) {
                                    console.warn('[draftStore] Socket.IO "draft_update": Skipping invalid event in event array processing:', event);
                                    return;
                                }
                                const { executingPlayer, chosenOptionId, actionType } = event;
                                let optionName = (actionType === 'ban' && chosenOptionId === "HIDDEN_BAN") ? "Hidden Ban" :
                                                 (typeof chosenOptionId === 'string') ? getOptionNameFromStore(chosenOptionId, newAoe2cmRawDraftOptions) : "";

                                if (optionName === "" && !(actionType === 'ban' && chosenOptionId === "HIDDEN_BAN") && (typeof chosenOptionId !== 'string' || chosenOptionId.length === 0) ) {
                                     console.warn('[draftStore] Socket.IO "draft_update": Invalid or empty chosenOptionId in event array item (and not a Hidden Ban):', chosenOptionId, "Event:", event);
                                     return;
                                }

                                let effectiveDraftType: 'civ' | 'map' | null = null;
                                if (chosenOptionId === "HIDDEN_BAN") effectiveDraftType = currentSocketDraftType;
                                else if (typeof chosenOptionId === 'string' && chosenOptionId.startsWith('aoe4.')) effectiveDraftType = 'civ';
                                else if (typeof chosenOptionId === 'string' && chosenOptionId.length > 0) effectiveDraftType = 'map';

                                let individualEventCausedChange = false; // Tracks if THIS specific event changed a pick/ban list
                                if (effectiveDraftType === 'civ') {
                                    const originalCivPicksHost = [...tempCivPicksHost]; const originalCivBansHost = [...tempCivBansHost];
                                    const originalCivPicksGuest = [...tempCivPicksGuest]; const originalCivBansGuest = [...tempCivBansGuest];
                                    if (actionType === 'pick') {
                                        if (executingPlayer === 'HOST') tempCivPicksHost = [...new Set([...tempCivPicksHost, optionName])];
                                        else if (executingPlayer === 'GUEST') tempCivPicksGuest = [...new Set([...tempCivPicksGuest, optionName])];
                                    } else if (actionType === 'ban') {
                                        if (executingPlayer === 'HOST') tempCivBansHost = [...new Set([...tempCivBansHost, optionName])];
                                        else if (executingPlayer === 'GUEST') tempCivBansGuest = [...new Set([...tempCivBansGuest, optionName])];
                                    } else if (actionType === 'snipe') {
                                        if (executingPlayer === 'HOST') tempCivBansGuest = [...new Set([...tempCivBansGuest, optionName])];
                                        else if (executingPlayer === 'GUEST') tempCivBansHost = [...new Set([...tempCivBansHost, optionName])];
                                    }
                                    if (tempCivPicksHost.length !== originalCivPicksHost.length || tempCivBansHost.length !== originalCivBansHost.length ||
                                        tempCivPicksGuest.length !== originalCivPicksGuest.length || tempCivBansGuest.length !== originalCivBansGuest.length) {
                                        individualEventCausedChange = true;
                                    }
                                } else if (effectiveDraftType === 'map') {
                                    const originalMapPicksHost = [...tempMapPicksHost]; const originalMapBansHost = [...tempMapBansHost];
                                    const originalMapPicksGuest = [...tempMapPicksGuest]; const originalMapBansGuest = [...tempMapBansGuest];
                                    const originalMapPicksGlobal = [...tempMapPicksGlobal]; const originalMapBansGlobal = [...tempMapBansGlobal];
                                    if (actionType === 'pick') {
                                        if (executingPlayer === 'HOST') tempMapPicksHost = [...new Set([...tempMapPicksHost, optionName])];
                                        else if (executingPlayer === 'GUEST') tempMapPicksGuest = [...new Set([...tempMapPicksGuest, optionName])];
                                        else if (executingPlayer === 'NONE') tempMapPicksGlobal = [...new Set([...tempMapPicksGlobal, optionName])];
                                    } else if (actionType === 'ban') {
                                        if (executingPlayer === 'HOST') tempMapBansHost = [...new Set([...tempMapBansHost, optionName])];
                                        else if (executingPlayer === 'GUEST') tempMapBansGuest = [...new Set([...tempMapBansGuest, optionName])];
                                        else if (executingPlayer === 'NONE') tempMapBansGlobal = [...new Set([...tempMapBansGlobal, optionName])];
                                    } else if (actionType === 'snipe') {
                                        if (executingPlayer === 'HOST') tempMapBansGuest = [...new Set([...tempMapBansGuest, optionName])];
                                        else if (executingPlayer === 'GUEST') tempMapBansHost = [...new Set([...tempMapBansHost, optionName])];
                                    }
                                    if (tempMapPicksHost.length !== originalMapPicksHost.length || tempMapBansHost.length !== originalMapBansHost.length ||
                                        tempMapPicksGuest.length !== originalMapPicksGuest.length || tempMapBansGuest.length !== originalMapBansGuest.length ||
                                        tempMapPicksGlobal.length !== originalMapPicksGlobal.length || tempMapBansGlobal.length !== originalMapBansGlobal.length) {
                                        individualEventCausedChange = true;
                                    }
                                } else {
                                    console.warn(`[draftStore] Socket.IO "draft_update": Could not determine type (civ/map) for event processing. chosenOptionId: ${chosenOptionId}, socketDraftType: ${currentSocketDraftType}`);
                                }
                                if (individualEventCausedChange) draftUpdateStateChanged = true; // If any event causes a change, the overall draft update caused a change
                            });
                        }

                        // If any state changed (names, options, or any event caused pick/ban change), then calculate new BoxSeriesGames and return new state
                        if (draftUpdateStateChanged) {
                            const newBoxSeriesGames = _calculateUpdatedBoxSeriesGames(
                                state.boxSeriesFormat,
                                state.boxSeriesGames, // original games to preserve winners
                                tempCivPicksHost,    // final updated lists
                                tempCivPicksGuest,
                                tempMapPicksHost,
                                tempMapPicksGuest,
                                tempMapPicksGlobal
                                // Bans are not typically passed to _calculateUpdatedBoxSeriesGames as they don't directly determine map/civ slots
                            );
                            return {
                                ...state,
                                hostName: newHostName, guestName: newGuestName, aoe2cmRawDraftOptions: newAoe2cmRawDraftOptions,
                                civPicksHost: tempCivPicksHost, civBansHost: tempCivBansHost,
                                civPicksGuest: tempCivPicksGuest, civBansGuest: tempCivBansGuest,
                                mapPicksHost: tempMapPicksHost, mapBansHost: tempMapBansHost,
                                mapPicksGuest: tempMapPicksGuest, mapBansGuest: tempMapBansGuest,
                                mapPicksGlobal: tempMapPicksGlobal, mapBansGlobal: tempMapBansGlobal,
                                boxSeriesGames: newBoxSeriesGames
                            };
                        }
                        return state;
                    });
                    if(draftUpdateStateChanged) {
                        console.log('[draftStore] Socket.IO "draft_update": State updated, calling _updateActivePresetIfNeeded.');
                        get()._updateActivePresetIfNeeded();
                    }
                  });

                  currentSocket.on('adminEvent', (data) => {
                    console.log('Socket.IO "adminEvent" received:', data);
                    if (data && data.action === "REVEAL_BANS" && data.events && Array.isArray(data.events)) {
                      console.log('[draftStore] Socket.IO "adminEvent": Processing REVEAL_BANS action with events:', data.events);
                      let bansRevealedStateChanged = false;
                      set(state => {
                          let newCivBansHost = [...state.civBansHost];
                          let newCivBansGuest = [...state.civBansGuest];
                          let newMapBansHost = [...state.mapBansHost];
                          let newMapBansGuest = [...state.mapBansGuest];
                          let newMapBansGlobal = [...state.mapBansGlobal];

                          const currentDraftOptions = state.aoe2cmRawDraftOptions;
                          const currentSocketDraftType = state.socketDraftType;

                          data.events.forEach(revealedBanEvent => {
                              if (!revealedBanEvent || typeof revealedBanEvent !== 'object' ||
                                  !revealedBanEvent.actionType || revealedBanEvent.actionType !== 'ban' ||
                                  !revealedBanEvent.hasOwnProperty('chosenOptionId') || typeof revealedBanEvent.chosenOptionId !== 'string' ||
                                  revealedBanEvent.chosenOptionId === "HIDDEN_BAN" || revealedBanEvent.chosenOptionId === "") { // Also skip empty string IDs
                                  console.warn('[draftStore] Socket.IO "adminEvent" (REVEAL_BANS): Skipping invalid, non-ban, already hidden, or empty chosenOptionId ban event:', revealedBanEvent);
                                  return; // Continue to next event
                              }
                              const { executingPlayer, chosenOptionId } = revealedBanEvent;
                              // Use currentDraftOptions from state within set for consistency
                              const optionName = getOptionNameFromStore(chosenOptionId, currentDraftOptions);

                              let effectiveDraftType: 'civ' | 'map' | null = null;
                              if (chosenOptionId.startsWith('aoe4.')) effectiveDraftType = 'civ';
                              else effectiveDraftType = 'map'; // Assuming non-aoe4. are maps for reveal_bans context

                              let targetBanList: string[] | null = null;
                              let listKeyForUpdate: keyof CombinedDraftState | null = null; // To make the update more dynamic

                              if (effectiveDraftType === 'civ') {
                                  if (executingPlayer === 'HOST') { targetBanList = newCivBansHost; listKeyForUpdate = 'civBansHost';}
                                  else if (executingPlayer === 'GUEST') { targetBanList = newCivBansGuest; listKeyForUpdate = 'civBansGuest'; }
                              } else if (effectiveDraftType === 'map') {
                                  if (executingPlayer === 'HOST') { targetBanList = newMapBansHost; listKeyForUpdate = 'mapBansHost';}
                                  else if (executingPlayer === 'GUEST') { targetBanList = newMapBansGuest; listKeyForUpdate = 'mapBansGuest';}
                                  else if (executingPlayer === 'NONE') { targetBanList = newMapBansGlobal; listKeyForUpdate = 'mapBansGlobal';}
                              }

                              if (targetBanList && listKeyForUpdate) {
                                  const hiddenBanIndex = targetBanList.indexOf("Hidden Ban");
                                  if (hiddenBanIndex !== -1) {
                                      const updatedList = [...targetBanList];
                                      updatedList[hiddenBanIndex] = optionName;

                                      // Update the correct list directly
                                      if (listKeyForUpdate === 'civBansHost') newCivBansHost = updatedList;
                                      else if (listKeyForUpdate === 'civBansGuest') newCivBansGuest = updatedList;
                                      else if (listKeyForUpdate === 'mapBansHost') newMapBansHost = updatedList;
                                      else if (listKeyForUpdate === 'mapBansGuest') newMapBansGuest = updatedList;
                                      else if (listKeyForUpdate === 'mapBansGlobal') newMapBansGlobal = updatedList;

                                      bansRevealedStateChanged = true;
                                  } else {
                                      console.warn(`[draftStore] Socket.IO "adminEvent" (REVEAL_BANS): "Hidden Ban" placeholder not found for revealed ban:`, revealedBanEvent, `List was for key ${listKeyForUpdate}:`, targetBanList);
                                  }
                              } else {
                                  console.warn(`[draftStore] Socket.IO "adminEvent" (REVEAL_BANS): Could not determine target ban list for event:`, revealedBanEvent, `EffectiveDraftType: ${effectiveDraftType}`);
                              }
                          });

                          if (bansRevealedStateChanged) {
                            // Re-calculate boxSeriesGames only if map bans changed, civ bans usually don't affect map layout in BoX
                            const mapBansChanged = newMapBansHost !== state.mapBansHost || newMapBansGuest !== state.mapBansGuest || newMapBansGlobal !== state.mapBansGlobal;
                            const newBoxSeriesGames = mapBansChanged ? _calculateUpdatedBoxSeriesGames(state.boxSeriesFormat, state.boxSeriesGames, state.civPicksHost, state.civPicksGuest, newMapBansHost, newMapBansGuest, newMapBansGlobal) : state.boxSeriesGames;
                            return { ...state, civBansHost: newCivBansHost, civBansGuest: newCivBansGuest, mapBansHost: newMapBansHost, mapBansGuest: newMapBansGuest, mapBansGlobal: newMapBansGlobal, boxSeriesGames: newBoxSeriesGames};
                          }
                          return state; // Return original state if no changes
                      });
                      if (bansRevealedStateChanged) {
                        console.log('[draftStore] Socket.IO "adminEvent" (REVEAL_BANS): State updated due to revealed bans, calling _updateActivePresetIfNeeded.');
                        get()._updateActivePresetIfNeeded();
                      } else {
                        console.log('[draftStore] Socket.IO "adminEvent" (REVEAL_BANS): No state changes made from REVEAL_BANS event (e.g., no Hidden Bans found or events were invalid).');
                      }
                    } else if (data && data.action === "REVEAL_BANS") {
                        console.warn('[draftStore] Socket.IO "adminEvent": REVEAL_BANS action received but "events" array is missing or invalid.', data);
                    } else if (data && typeof data === 'object' && data.action) {
                        console.log('[draftStore] Socket.IO "adminEvent": Received admin event of type:', data.action, 'Payload:', data);
                    } else {
                        console.warn('[draftStore] Socket.IO "adminEvent": Received invalid data for adminEvent:', data);
                    }
                  });

                  console.log(`Socket.IO emitting 'join_draft' for draftId: ${draftId}`);
                  currentSocket.emit('join_draft', { draftId: draftId });
                  console.log(`Socket.IO emitting 'player_ready' for draftId: ${draftId} as OBSERVER`);
                  currentSocket.emit('player_ready', { draftId: draftId, playerType: 'OBSERVER' });
                }
              } else {
                console.warn("Socket.IO connected, but draft context in store changed or this is an old socket. Disconnecting this socket. Store Draft ID:", currentStoreDraftId, "Socket Draft ID in query:", currentSocket?.io.opts.query?.draftId);
                currentSocket?.disconnect();
              }

              // This is where the event listeners for an active connection are set up.
              // 'draft_state' and 'playerEvent' are already handled above the 'act' handler.
              // 'act', 'countdown', 'draft_update', 'adminEvent' are also defined above.
              // 'draft_finished' is below.
              // 'connect_error' and 'disconnect' are handled outside this 'connect' success block.

              if (currentSocket) {
                currentSocket.on('draft_finished', (data) => {
                  console.log('Socket.IO "draft_finished" event received:', data);
                  // data might be null or an empty object, the event itself is the signal
                  set({ draftIsLikelyFinished: true });
                  console.log('[draftStore] Socket.IO "draft_finished": draftIsLikelyFinished set to true.');
                });
              }
            }); // End of currentSocket.on('connect')

            // These handlers are for the socket instance itself, not tied to a successful 'connect' event body
            currentSocket.on('connect_error', (err) => {
              console.error(`Socket.IO "connect_error" event for draft ${draftId} (type ${draftType}):`, err.message, err.cause);
              const errorMessage = `Socket.IO connection error: ${err.message}. Live updates may be unavailable.`;
              const currentStoreDraftId = get()[draftType === 'civ' ? 'civDraftId' : 'mapDraftId'];
              const draftStatusField = draftType === 'civ' ? 'civDraftStatus' : 'mapDraftStatus'; // Corrected variable name
              const loadingFlagField = draftType === 'civ' ? 'isLoadingCivDraft' : 'isLoadingMapDraft';
              const errorField = draftType === 'civ' ? 'civDraftError' : 'mapDraftError';

              if (get().socketDraftType === draftType && currentStoreDraftId === draftId) {
                set({
                  socketStatus: 'error',
                  socketError: errorMessage,
                  socketDraftType: null,
                  [draftStatusField]: 'error',
                  [loadingFlagField]: false,
                  [errorField]: errorMessage,
                });
              }
              if (currentSocket && currentSocket.io.opts.query?.draftId === draftId) {
                 currentSocket.disconnect();
                 currentSocket = null;
              }
            });

            currentSocket.on('disconnect', (reason) => {
              const localDraftId = draftId;
              const localDraftType = draftType;
              const wasLikelyFinished = get().draftIsLikelyFinished;

              console.log(`Socket.IO "disconnect" event for draft ${localDraftId} (type ${localDraftType}). Reason: ${reason}. Socket ID was: ${currentSocket?.id || 'already cleared or different instance'}. Was draft likely finished: ${wasLikelyFinished}`);

              const currentStoreDraftIdForThisType = get()[localDraftType === 'civ' ? 'civDraftId' : 'mapDraftId'];
              const currentSocketDraftTypeInStore = get().socketDraftType; // Store this before it's potentially nulled by set

              // Check if this disconnect event is relevant to the current active socket draft context
              if (currentSocketDraftTypeInStore === localDraftType && currentStoreDraftIdForThisType === localDraftId) {
                let statusUpdate: Partial<CombinedDraftState> = {
                  // These are always set if the disconnect is relevant
                  socketStatus: 'disconnected',
                  socketError: null, // Clear previous socket error on a clean disconnect
                  socketDraftType: null, // This draft type is no longer live via socket
                };
                const draftSpecificUpdates: Partial<CombinedDraftState> = {};

                // If the disconnect was not clean (e.g., server initiated, transport error)
                if (reason !== 'io server disconnect' && reason !== 'io client disconnect') {
                  statusUpdate.socketError = `Live connection closed unexpectedly: ${reason}. Updates stopped.`;
                  statusUpdate.socketStatus = 'error'; // Overall socket status is error
                  console.warn(`[draftStore] Socket.IO for ${localDraftType} draft ${localDraftId} disconnected with potential error. New socketStatus: 'error', Error: ${statusUpdate.socketError}`);

                  // Update the specific draft's status to error as well
                  if (localDraftType === 'civ') {
                    draftSpecificUpdates.isLoadingCivDraft = false;
                    draftSpecificUpdates.civDraftStatus = 'error';
                    draftSpecificUpdates.civDraftError = statusUpdate.socketError;
                  } else { // map
                    draftSpecificUpdates.isLoadingMapDraft = false;
                    draftSpecificUpdates.mapDraftStatus = 'error';
                    draftSpecificUpdates.mapDraftError = statusUpdate.socketError;
                  }
                } else { // Clean disconnect (client or server initiated)
                  // Only ensure loading flags are false for this draft type
                  if (localDraftType === 'civ') {
                    draftSpecificUpdates.isLoadingCivDraft = false;
                    // Potentially keep civDraftStatus as 'connected' if HTTP was successful and draft is not ongoing
                    if (get().civDraftStatus === 'live') draftSpecificUpdates.civDraftStatus = 'connected';
                  } else { // map
                    draftSpecificUpdates.isLoadingMapDraft = false;
                    if (get().mapDraftStatus === 'live') draftSpecificUpdates.mapDraftStatus = 'connected';
                  }
                   console.log(`[draftStore] Socket.IO for ${localDraftType} draft ${localDraftId} disconnected cleanly. Reason: ${reason}.`);
                }
                set({ ...statusUpdate, ...draftSpecificUpdates });
              } else {
                 // Disconnect event is for an old/irrelevant socket instance or draft context
                 console.log(`[draftStore] Socket.IO disconnect event for ${localDraftId} (type ${localDraftType}) ignored as it's not the active socket draft type/ID. Current store socketDraftType: ${currentSocketDraftTypeInStore}, ID for this type: ${currentStoreDraftIdForThisType}`);
                 // Still, ensure loading flag for this specific draft type is false if its socket was the one disconnecting
                 if (currentSocket && currentSocket.io.opts.query?.draftId === localDraftId && currentSocketDraftTypeInStore === localDraftType) {
                    const draftLoadingUpdate = localDraftType === 'civ' ?
                        { isLoadingCivDraft: false } : { isLoadingMapDraft: false };
                    set(draftLoadingUpdate);
                 }
              }

              // Clear the global currentSocket if this instance was the one that disconnected
              if (currentSocket && currentSocket.io.opts.query?.draftId === localDraftId) {
                 console.log(`[draftStore] Clearing currentSocket variable as its instance for draft ${localDraftId} disconnected.`);
                 currentSocket.removeAllListeners(); // Defensive cleanup
                 currentSocket = null;
              }

              // Reset draftIsLikelyFinished after processing disconnect
              if (wasLikelyFinished) {
                set({ draftIsLikelyFinished: false });
              }

              // HTTP Fallback Logic (remains largely the same)
              // Only attempt fallback if the disconnect was not a clean client-initiated one ('io client disconnect')
              // and if the draft wasn't likely finished.
              const shouldAttemptHttpFallback = !wasLikelyFinished &&
                                                reason !== 'io client disconnect' &&
                                                (reason === 'io server disconnect' || reason === 'transport close' || reason.startsWith('ping timeout') || reason.startsWith('transport error'));


              if (shouldAttemptHttpFallback && localDraftId && localDraftType) {
                console.log(`[draftStore] [HTTP Fallback Triggered] Attempting HTTP fallback for ${localDraftType} draft ${localDraftId} due to disconnect reason: '${reason}' and wasLikelyFinished: ${wasLikelyFinished}.`);
                setTimeout(() => {
                    const currentStatus = get()[localDraftType === 'civ' ? 'civDraftStatus' : 'mapDraftStatus'];
                    // Check if we are not already connecting/live for this specific draft type
                    if (currentStatus !== 'connecting' && currentStatus !== 'live') {
                         console.log(`[draftStore] [HTTP Fallback] Calling connectToDraft for ${localDraftId}`);
                         get().connectToDraft(localDraftId, localDraftType);
                    } else {
                         console.log(`[draftStore] [HTTP Fallback] Fallback for ${localDraftId} skipped, another connection attempt is already in progress or live (status: ${currentStatus}).`);
                    }
                }, 1000); // Delay before attempting fallback
              }
            }); // End of currentSocket.on('disconnect')

          } catch (initError) {
            console.error(`[draftStore] Failed to initialize Socket.IO for draft ${draftId} (type ${draftType}):`, initError);
            const message = initError instanceof Error ? initError.message : "Failed to initialize Socket.IO.";
            const initErrorUpdate: Partial<CombinedDraftState> = {
                socketStatus: 'error',
                socketError: `Socket setup error: ${message}`,
                socketDraftType: null, // Failed to setup for this type
            };
            if (draftType === 'civ') {
                initErrorUpdate.civDraftStatus = 'error';
                initErrorUpdate.civDraftError = message;
                initErrorUpdate.isLoadingCivDraft = false;
            } else {
                initErrorUpdate.mapDraftStatus = 'error';
                initErrorUpdate.mapDraftError = message;
                initErrorUpdate.isLoadingMapDraft = false;
            }
            set(initErrorUpdate);

            if (currentSocket) {
                currentSocket.disconnect();
                currentSocket = null;
            }
          }
        },

        disconnectWebSocket: () => {
          if (currentSocket) {
            console.log("Calling currentSocket.disconnect() for draft ID:", currentSocket.io.opts.query?.draftId, "Socket ID:", currentSocket.id);
            currentSocket.disconnect();
            currentSocket = null;
          }
          set({ socketStatus: 'disconnected', socketError: null, socketDraftType: null });
        },

        _resetCurrentSessionState: () => {
          // Preserving layout related state:
          // currentCanvases, activeCanvasId, savedStudioLayouts, activeStudioLayoutId
          // are preserved by not including them in the `set` call's payload,
          // as `set` performs a shallow merge.
          // The get() calls for currentSavedPresets and currentSavedStudioLayouts are removed
          // as these properties are intended to be preserved by not being part of the reset payload.

          set(state => ({
            // Reset draft-specific parts
            civDraftId: null,
            mapDraftId: null,
            hostName: initialPlayerNameHost,
            guestName: initialPlayerNameGuest,
            scores: { ...initialScores },
            civPicksHost: [], civBansHost: [], civPicksGuest: [], civBansGuest: [],
            mapPicksHost: [], mapBansHost: [], mapPicksGuest: [], mapBansGuest: [], mapPicksGlobal: [], mapBansGlobal: [],
            civDraftStatus: 'disconnected' as ConnectionStatus, civDraftError: null, isLoadingCivDraft: false,
            mapDraftStatus: 'disconnected' as ConnectionStatus, mapDraftError: null, isLoadingMapDraft: false,
            socketStatus: 'disconnected' as ConnectionStatus,
            socketError: null,
            socketDraftType: null,
            draftIsLikelyFinished: false,
            aoe2cmRawDraftOptions: undefined,
            activePresetId: null, // Explicitly reset activePresetId
            boxSeriesFormat: null,
            boxSeriesGames: [],
            hostFlag: null,
            guestFlag: null,
            hostColor: null,
            guestColor: null,
            isNewSessionAwaitingFirstDraft: true,

            // Reset UI selection state but not the layout structure itself
            selectedElementId: null,
            layoutLastUpdated: null,

            // Properties to preserve (by not mentioning them, they remain as per current state):
            // currentCanvases: state.currentCanvases,
            // activeCanvasId: state.activeCanvasId,
            // savedStudioLayouts: state.savedStudioLayouts, // These are already preserved by not being in the partial state to reset
            // activeStudioLayoutId: state.activeStudioLayoutId,

            // Ensure activePresetId is reset as per original logic for resetting session state
            // activePresetId: null, // This was already set above, removed duplicate
          }));
        },

        // _updateBoxSeriesGamesFromPicks is now removed and replaced by the local helper _calculateUpdatedBoxSeriesGames
        // The actual update to the store will be handled by the calling actions (next subtask).

        _updateActivePresetIfNeeded: () => { const { activePresetId, savedPresets, hostName, guestName, scores, civDraftId, mapDraftId, boxSeriesFormat, boxSeriesGames, hostColor, guestColor } = get(); if (activePresetId) { const presetIndex = savedPresets.findIndex(p => p.id === activePresetId); if (presetIndex !== -1) { const updatedPreset: SavedPreset = { ...savedPresets[presetIndex], hostName, guestName, scores: { ...scores }, civDraftId, mapDraftId, boxSeriesFormat, boxSeriesGames: JSON.parse(JSON.stringify(boxSeriesGames)), hostColor, guestColor }; const newSavedPresets = [...savedPresets]; newSavedPresets[presetIndex] = updatedPreset; set({ savedPresets: newSavedPresets }); } } },
        extractDraftIdFromUrl: (url: string) => { try { if (url.startsWith('http://') || url.startsWith('https://')) { const urlObj = new URL(url); if (urlObj.hostname.includes('aoe2cm.net')) { const pathMatch = /\/draft\/([a-zA-Z0-9]+)/.exec(urlObj.pathname); if (pathMatch && pathMatch[1]) return pathMatch[1]; const observerPathMatch = /\/observer\/([a-zA-Z0-9]+)/.exec(urlObj.pathname); if (observerPathMatch && observerPathMatch[1]) return observerPathMatch[1]; } const pathSegments = urlObj.pathname.split('/'); const potentialId = pathSegments.pop() || pathSegments.pop(); if (potentialId && /^[a-zA-Z0-9_-]+$/.test(potentialId) && potentialId.length > 3) return potentialId; const draftIdParam = urlObj.searchParams.get('draftId') || urlObj.searchParams.get('id'); if (draftIdParam) return draftIdParam; } if (/^[a-zA-Z0-9_-]+$/.test(url) && url.length > 3) return url; return null; } catch (error) { if (/^[a-zA-Z0-9_-]+$/.test(url) && url.length > 3) return url; return null; } },

        connectToDraft: async (draftIdOrUrl: string, draftType: 'civ' | 'map') => {
          // Initial logging for function call, before extractedId is defined for this scope
          console.log(`[connectToDraft] Entry. draftIdOrUrl: ${draftIdOrUrl}, draftType: ${draftType}, activePresetId: ${get().activePresetId}`);
          const wasNewSessionAwaitingFirstDraft = get().isNewSessionAwaitingFirstDraft; // Get before async

          if (draftType === 'civ') {
            set({ isLoadingCivDraft: true, civDraftStatus: 'connecting', civDraftError: null });
          } else {
            set({ isLoadingMapDraft: true, mapDraftStatus: 'connecting', mapDraftError: null });
          }
          const extractedId = get().extractDraftIdFromUrl(draftIdOrUrl); // Main declaration

          // Now log the extractedId
          console.log('[connectToDraft] Called for draft ID:', extractedId, 'Type:', draftType, 'Initiated by loadPreset for preset ID:', get().activePresetId);

          if (!extractedId) {
            // ... rest of the logic for !extractedId
            const errorMsg = 'Invalid Draft ID or URL provided.';
            if (draftType === 'civ') {
              set({ isLoadingCivDraft: false, civDraftStatus: 'error', civDraftError: errorMsg });
            } else {
              set({ isLoadingMapDraft: false, mapDraftStatus: 'error', mapDraftError: errorMsg });
            }
            return false;
          }

          if (draftType === 'civ') set({ civDraftId: extractedId }); else set({ mapDraftId: extractedId });

          // Removing/commenting out the block that nullifies activePresetId prematurely.
          // const currentActivePresetId = get().activePresetId;
          // const savedPresetsArray = get().savedPresets;
          // const activePreset = currentActivePresetId ? savedPresetsArray.find(p => p.id === currentActivePresetId) : null;
          // if (activePreset) {
          //   if ((draftType === 'civ' && activePreset.civDraftId !== extractedId) ||
          //       (draftType === 'map' && activePreset.mapDraftId !== extractedId)) {
          //     // set({ activePresetId: null }); // Problematic line - REMOVED
          //   }
          // } else {
          //   // set({ activePresetId: null }); // Also potentially problematic - REMOVED
          // }

          console.log(`[ConnectToDraft] Attempting to fetch ${draftType} draft ${extractedId} via HTTP.`);
          const apiUrl = `${DRAFT_DATA_API_BASE_URL}/draft/${extractedId}`;

          try {
            const response = await axios.get<Aoe2cmRawDraftData>(apiUrl);
            console.log(`[ConnectToDraft] HTTP data received for ${extractedId}. Processing...`);

            if (!response.data || typeof response.data !== 'object') {
              throw new Error('Received invalid or empty data structure from the API.');
            }
            const rawDraftData = response.data;

            console.log(`[ConnectToDraft] Full rawDraftData for ID ${extractedId}:`, JSON.stringify(rawDraftData, null, 2));

            const processedData = transformRawDataToSingleDraft(rawDraftData, draftType);

            if (wasNewSessionAwaitingFirstDraft) {
              const hostNameForPreset = processedData.hostName || (draftType === 'civ' && rawDraftData.nameHost) || initialPlayerNameHost;
              const guestNameForPreset = processedData.guestName || (draftType === 'civ' && rawDraftData.nameGuest) || initialPlayerNameGuest;

              const presetName = `${hostNameForPreset} vs ${guestNameForPreset} - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`; // Changed to toLocaleTimeString

              // Temporarily update store with current draft ID and names before saving preset
              set(state => ({
                ...state,
                [draftType === 'civ' ? 'civDraftId' : 'mapDraftId']: extractedId,
                hostName: hostNameForPreset,
                guestName: guestNameForPreset,
                // Ensure other relevant fields for saveCurrentAsPreset are up-to-date if needed
              }));

              get().saveCurrentAsPreset(presetName); // Reverted: No await

              set({ isNewSessionAwaitingFirstDraft: false });
              set(state => ({ forceMapPoolUpdate: state.forceMapPoolUpdate + 1 }));
              console.log('[connectToDraft] Incremented forceMapPoolUpdate to trigger UI refresh.');
            }

            // Determine hostName, guestName, respecting existing if not default
            let newHostName = get().hostName;
            let newGuestName = get().guestName;
            const isHostNameDefaultOrLive = get().hostName === initialPlayerNameHost || get().hostName === "Host (Live)";
            const isGuestNameDefaultOrLive = get().guestName === initialPlayerNameGuest || get().guestName === "Guest (Live)";
            if (processedData.hostName) newHostName = isHostNameDefaultOrLive ? processedData.hostName : get().hostName;
            if (processedData.guestName) newGuestName = isGuestNameDefaultOrLive ? processedData.guestName : get().guestName;

            // Extract pick/ban arrays from HTTP response data
            const httpCivPicksHost = processedData.civPicksHost || [];
            const httpCivBansHost = processedData.civBansHost || [];
            const httpCivPicksGuest = processedData.civPicksGuest || [];
            const httpCivBansGuest = processedData.civBansGuest || [];
            const httpMapPicksHost = processedData.mapPicksHost || [];
            const httpMapBansHost = processedData.mapBansHost || [];
            const httpMapPicksGuest = processedData.mapPicksGuest || [];
            const httpMapBansGuest = processedData.mapBansGuest || [];
            const httpMapPicksGlobal = processedData.mapPicksGlobal || [];
            const httpMapBansGlobal = processedData.mapBansGlobal || [];

            // Handle BoX Format Detection (before the main set call)
            let detectedFormatDuringLoad: CombinedDraftState['boxSeriesFormat'] = null;
            const currentBoxSeriesFormat = get().boxSeriesFormat; // Get current format from state

            const parseNameForBoX = (nameString: string | undefined): CombinedDraftState['boxSeriesFormat'] | null => {
              console.log(`[parseNameForBoX] Checking nameString: "${nameString}"`);
              if (!nameString) return null;
              let format: CombinedDraftState['boxSeriesFormat'] | null = null;
              const bestOfMatch = nameString.match(/best of (\d+)(?:[^a-zA-Z0-9]|$)/i);
              console.log(`[parseNameForBoX] bestOfMatch result:`, bestOfMatch);
              if (bestOfMatch && bestOfMatch[1]) {
                const number = parseInt(bestOfMatch[1]);
                if ([1, 3, 5, 7].includes(number)) {
                  format = `bo${number}` as CombinedDraftState['boxSeriesFormat'];
                }
              }
              if (!format) {
                const boMatch = nameString.match(/bo\s*(\d+)/i);
                console.log(`[parseNameForBoX] boMatch result:`, boMatch);
                if (boMatch && boMatch[1]) {
                  const number = parseInt(boMatch[1]);
                  if ([1, 3, 5, 7].includes(number)) {
                    format = `bo${number}` as CombinedDraftState['boxSeriesFormat'];
                  }
                }
              }
              console.log(`[parseNameForBoX] Determined format: ${format} for nameString: "${nameString}"`);
              return format;
            };

            // Only auto-detect if no active preset is loaded and no format is currently set by the user
            if (get().activePresetId === null && !currentBoxSeriesFormat) {
              detectedFormatDuringLoad = parseNameForBoX(rawDraftData.preset?.name);
              if (detectedFormatDuringLoad) {
                console.log(`[ConnectToDraft] Auto-detected BoX format (from preset name): ${detectedFormatDuringLoad} for draft ID ${extractedId} from preset name: "${rawDraftData.preset?.name}"`);
              } else if (rawDraftData.name) { // Fallback to draft name
                detectedFormatDuringLoad = parseNameForBoX(rawDraftData.name);
                if (detectedFormatDuringLoad) {
                  console.log(`[ConnectToDraft] Auto-detected BoX format (from draft name): ${detectedFormatDuringLoad} for draft ID ${extractedId} from draft name: "${rawDraftData.name}"`);
                }
              }
            }
            const formatToUse = detectedFormatDuringLoad || currentBoxSeriesFormat;

            // Single, consolidated set call
            set(state => {
                console.log(`[connectToDraft] Updating aoe2cmRawDraftOptions. DraftType: ${draftType}. Current options length: ${state.aoe2cmRawDraftOptions?.length || 0}. New options length: ${rawDraftData.preset?.draftOptions?.length || 0}.`);
                // Determine final pick/ban arrays: use HTTP data if current draftType matches, else keep existing state
                const finalCivPicksHost = draftType === 'civ' ? httpCivPicksHost : state.civPicksHost;
                const finalCivBansHost = draftType === 'civ' ? httpCivBansHost : state.civBansHost;
                const finalCivPicksGuest = draftType === 'civ' ? httpCivPicksGuest : state.civPicksGuest;
                const finalCivBansGuest = draftType === 'civ' ? httpCivBansGuest : state.civBansGuest;

                const finalMapPicksHost = draftType === 'map' ? httpMapPicksHost : state.mapPicksHost;
                const finalMapBansHost = draftType === 'map' ? httpMapBansHost : state.mapBansHost;
                const finalMapPicksGuest = draftType === 'map' ? httpMapPicksGuest : state.mapPicksGuest;
                const finalMapBansGuest = draftType === 'map' ? httpMapBansGuest : state.mapBansGuest;
                const finalMapPicksGlobal = draftType === 'map' ? httpMapPicksGlobal : state.mapPicksGlobal;
                const finalMapBansGlobal = draftType === 'map' ? httpMapBansGlobal : state.mapBansGlobal;

                // If format changes due to detection, currentBoxSeriesGames should be empty to rebuild fresh
                // otherwise, use state.boxSeriesGames to preserve winners.
                const baseGamesForCalc = (detectedFormatDuringLoad && detectedFormatDuringLoad !== state.boxSeriesFormat) ? [] : state.boxSeriesGames;

                const newBoxSeriesGames = _calculateUpdatedBoxSeriesGames(
                    formatToUse,
                    baseGamesForCalc,
                    finalCivPicksHost,
                    finalCivPicksGuest,
                    finalMapPicksHost,
                    finalMapPicksGuest,
                    finalMapPicksGlobal
                );

                const updatePayload: Partial<CombinedDraftState> = {
                    ...state, // Start with current state
                    hostName: newHostName,
                    guestName: newGuestName,
                    // Ensure the correct log is present before the conditional assignment
                    aoe2cmRawDraftOptions: draftType === 'map'
                                           ? (rawDraftData.preset?.draftOptions || state.aoe2cmRawDraftOptions)
                                           : state.aoe2cmRawDraftOptions,

                    civPicksHost: finalCivPicksHost, civBansHost: finalCivBansHost,
                    civPicksGuest: finalCivPicksGuest, civBansGuest: finalCivBansGuest,
                    mapPicksHost: finalMapPicksHost, mapBansHost: finalMapBansHost,
                    mapPicksGuest: finalMapPicksGuest, mapBansGuest: finalMapBansGuest,
                    mapPicksGlobal: finalMapPicksGlobal, mapBansGlobal: finalMapBansGlobal,

                    boxSeriesGames: newBoxSeriesGames,
                };

                // If a new format was detected and it's different from current state, apply it
                if (detectedFormatDuringLoad && detectedFormatDuringLoad !== state.boxSeriesFormat) {
                    updatePayload.boxSeriesFormat = detectedFormatDuringLoad;
                }

                // Update status and loading flags
                if (draftType === 'civ') {
                    updatePayload.isLoadingCivDraft = false;
                    updatePayload.civDraftStatus = 'connected';
                    updatePayload.civDraftError = null;
                } else { // map
                    updatePayload.isLoadingMapDraft = false;
                    updatePayload.mapDraftStatus = 'connected';
                    updatePayload.mapDraftError = null;
                }
                return updatePayload;
            });

            get()._updateActivePresetIfNeeded();

            if (rawDraftData.ongoing === true) {
              console.log(`[ConnectToDraft] Draft ${extractedId} is ongoing. Attempting WebSocket connection.`);
              get().connectToWebSocket(extractedId, draftType);
            } else {
              console.log(`[ConnectToDraft] Draft ${extractedId} is not ongoing (completed or status unknown). WebSocket connection will not be attempted.`);
              if (get().socketDraftType === draftType && (get().civDraftId === extractedId || get().mapDraftId === extractedId)) {
                 get().disconnectWebSocket();
              } else {
                set({socketStatus: 'disconnected', socketError: null, socketDraftType: null});
              }
            }
            return true;

          } catch (error) {
            let httpErrorMessage = "Failed to fetch draft data via HTTP.";
            if (axios.isAxiosError(error)) {
              httpErrorMessage = `Server responded with status ${error.response?.status || 'N/A'}: ${error.message}`;
            } else if (error instanceof Error) {
              httpErrorMessage = error.message;
            }
            console.warn(`[ConnectToDraft] HTTP fetch for draft ${extractedId} (type ${draftType}) failed: ${httpErrorMessage}. Proceeding with WebSocket connection attempt.`);
            get().connectToWebSocket(extractedId, draftType);
            return true;
          }
        },
        disconnectDraft: (draftType: 'civ' | 'map') => {
          get().disconnectWebSocket();
          if (draftType === 'civ') { set({ civDraftId: null, civDraftStatus: 'disconnected', civDraftError: null, isLoadingCivDraft: false, civPicksHost: [], civBansHost: [], civPicksGuest: [], civBansGuest: [], hostName: get().mapDraftId ? get().hostName : initialPlayerNameHost, guestName: get().mapDraftId ? get().guestName : initialPlayerNameGuest, boxSeriesGames: get().boxSeriesGames.map(game => ({ ...game, hostCiv: null, guestCiv: null })), activePresetId: null, }); } else { set({ mapDraftId: null, mapDraftStatus: 'disconnected', mapDraftError: null, isLoadingMapDraft: false, mapPicksHost: [], mapBansHost: [], mapPicksGuest: [], mapBansGuest: [], mapPicksGlobal: [], mapBansGlobal: [], boxSeriesGames: get().boxSeriesGames.map(game => ({ ...game, map: null })), activePresetId: null, }); } if (!get().civDraftId && !get().mapDraftId) set({ boxSeriesFormat: null, boxSeriesGames: [], activePresetId: null }); },
        reconnectDraft: async (draftType: 'civ' | 'map') => { const idToReconnect = draftType === 'civ' ? get().civDraftId : get().mapDraftId; if (!idToReconnect) { const errorMsg = `No ${draftType} draft ID to reconnect.`; if (draftType === 'civ') set({ civDraftError: errorMsg }); else set({ mapDraftError: errorMsg }); return false; } return get().connectToDraft(idToReconnect, draftType); },
        setHostName: (name: string) => { set({ hostName: name }); get()._updateActivePresetIfNeeded(); },
        setGuestName: (name: string) => { set({ guestName: name }); get()._updateActivePresetIfNeeded(); },
        setHostColor: (color) => { set({ hostColor: color }); get()._updateActivePresetIfNeeded(); },
        setGuestColor: (color) => { set({ guestColor: color }); get()._updateActivePresetIfNeeded(); },
        setHostFlag: (flag: string | null) => {
          set({ hostFlag: flag });
          get()._updateActivePresetIfNeeded();
        },
        setGuestFlag: (flag: string | null) => {
          set({ guestFlag: flag });
          get()._updateActivePresetIfNeeded();
        },
        switchPlayerSides: () => {
          const {
            hostName, guestName, scores,
            civPicksHost, civBansHost, civPicksGuest, civBansGuest,
            mapPicksHost, mapBansHost, mapPicksGuest, mapBansGuest,
            boxSeriesGames, hostColor, guestColor, hostFlag, guestFlag
          } = get();

          const tempHostColor = hostColor;
          const tempGuestColor = guestColor;
          const tempHostFlag = hostFlag;
          const tempGuestFlag = guestFlag;
          const tempHostName = hostName;
          const tempGuestName = guestName;
          const tempScoresHost = scores.host;
          const tempScoresGuest = scores.guest;
          const tempCivPicksHost = [...civPicksHost];
          const tempCivBansHost = [...civBansHost];
          const tempCivPicksGuest = [...civPicksGuest];
          const tempCivBansGuest = [...civBansGuest];
          const tempMapPicksHost = [...mapPicksHost];
          const tempMapBansHost = [...mapBansHost];
          const tempMapPicksGuest = [...mapPicksGuest];
          const tempMapBansGuest = [...mapBansGuest];

          const newBoxSeriesGames = boxSeriesGames.map(game => ({
            ...game,
            hostCiv: game.guestCiv,
            guestCiv: game.hostCiv,
            winner: game.winner === 'host' ? 'guest' : game.winner === 'guest' ? 'host' : game.winner,
          }));

          set({
            hostName: tempGuestName,
            guestName: tempHostName,
            scores: {
              host: tempScoresGuest,
              guest: tempScoresHost,
            },
            civPicksHost: tempCivPicksGuest,
            civBansHost: tempCivBansGuest,
            civPicksGuest: tempCivPicksHost,
            civBansGuest: tempCivBansHost,
            mapPicksHost: tempMapPicksGuest,
            mapBansHost: tempMapBansGuest,
            mapPicksGuest: tempMapPicksHost,
            mapBansGuest: tempMapBansHost,
            boxSeriesGames: newBoxSeriesGames,
            hostColor: tempGuestColor,
            guestColor: tempHostColor,
            hostFlag: tempGuestFlag,
            guestFlag: tempHostFlag,
          });
          get()._updateActivePresetIfNeeded();
        },
        incrementScore: (player: 'host' | 'guest') => { set(state => ({ scores: { ...state.scores, [player]: state.scores[player] + 1 }})); get()._updateActivePresetIfNeeded(); },
        decrementScore: (player: 'host' | 'guest') => { set(state => ({ scores: { ...state.scores, [player]: Math.max(0, state.scores[player] - 1) }})); get()._updateActivePresetIfNeeded(); },
        saveCurrentAsPreset: (name?: string) => { // Reverted to sync
          console.log('[saveCurrentAsPreset] Attempting to save preset. Provided name:', name, 'Current state context:', { hostName: get().hostName, guestName: get().guestName, civDraftId: get().civDraftId, mapDraftId: get().mapDraftId });
          const { civDraftId, mapDraftId, hostName, guestName, scores, savedPresets, boxSeriesFormat, boxSeriesGames, hostColor, guestColor } = get();
          const presetName = name || `${hostName} vs ${guestName} - ${new Date().toLocaleDateString()}`;
          const existingPresetIndex = savedPresets.findIndex(p => p.name === presetName);
          const presetIdToUse = existingPresetIndex !== -1 ? savedPresets[existingPresetIndex].id : Date.now().toString();
          const presetData: SavedPreset = { id: presetIdToUse, name: presetName, civDraftId, mapDraftId, hostName, guestName, scores: { ...scores }, boxSeriesFormat, boxSeriesGames: JSON.parse(JSON.stringify(boxSeriesGames)), hostColor, guestColor };

          if (existingPresetIndex !== -1) {
            console.log('[saveCurrentAsPreset] Updating existing preset. Name:', presetName, 'ID:', presetIdToUse, 'Updated data:', presetData);
            const updatedPresets = [...savedPresets];
            updatedPresets[existingPresetIndex] = presetData;
            set({ savedPresets: updatedPresets, activePresetId: presetData.id });
          } else {
            console.log('[saveCurrentAsPreset] Creating new preset. Name:', presetName, 'ID:', presetIdToUse, 'Data:', presetData);
            set({ savedPresets: [...savedPresets, presetData], activePresetId: presetData.id });
          }
          // Removed the data reloading logic that called connectToDraft
        },
        loadPreset: async (presetId: string) => {
          console.log('[loadPreset] Starting to load preset ID:', presetId);
          const preset = get().savedPresets.find(p => p.id === presetId);
          if (preset) {
            set({ activePresetId: preset.id, civDraftId: preset.civDraftId, mapDraftId: preset.mapDraftId, hostName: preset.hostName, guestName: preset.guestName, scores: { ...preset.scores }, boxSeriesFormat: preset.boxSeriesFormat, boxSeriesGames: JSON.parse(JSON.stringify(preset.boxSeriesGames)), hostColor: preset.hostColor || null, guestColor: preset.guestColor || null, civDraftStatus: 'disconnected', civDraftError: null, isLoadingCivDraft: false, mapDraftStatus: 'disconnected', mapDraftError: null, isLoadingMapDraft: false, civPicksHost: [], civBansHost: [], civPicksGuest: [], civBansGuest: [], mapPicksHost: [], mapBansHost: [], mapPicksGuest: [], mapBansGuest: [], mapPicksGlobal: [], mapBansGlobal: [] });
            set({ aoe2cmRawDraftOptions: undefined });
            console.log('[loadPreset] Cleared aoe2cmRawDraftOptions for preset ID:', presetId);
            if (preset.civDraftId) await get().connectToDraft(preset.civDraftId, 'civ');
            if (preset.mapDraftId) await get().connectToDraft(preset.mapDraftId, 'map');
            set({ activePresetId: preset.id }); // Ensure activePresetId is set after connections
            console.log('[loadPreset] Finished processing preset ID:', presetId, 'Current aoe2cmRawDraftOptions:', get().aoe2cmRawDraftOptions);
          }
        },
        deletePreset: (presetId: string) => { const currentActiveId = get().activePresetId; set(state => ({ savedPresets: state.savedPresets.filter(p => p.id !== presetId) })); if (currentActiveId === presetId) get()._resetCurrentSessionState(); },
        updatePresetName: (presetId: string, newName: string) => { set(state => ({ savedPresets: state.savedPresets.map(p => p.id === presetId ? { ...p, name: newName } : p), activePresetId: state.activePresetId === presetId ? presetId : state.activePresetId, })); get()._updateActivePresetIfNeeded(); },
        setBoxSeriesFormat: (format) => { let numGames = 0; if (format === 'bo1') numGames = 1; else if (format === 'bo3') numGames = 3; else if (format === 'bo5') numGames = 5; else if (format === 'bo7') numGames = 7; let newGames = Array(numGames).fill(null).map(() => ({ map: null, hostCiv: null, guestCiv: null, winner: null })); const state = get(); if (numGames > 0) { const combinedMapPicks = Array.from(new Set([...state.mapPicksHost, ...state.mapPicksGuest, ...state.mapPicksGlobal])).filter(Boolean); newGames = newGames.map((_game, index) => ({ map: combinedMapPicks[index] || null, hostCiv: state.civPicksHost[index] || null, guestCiv: state.civPicksGuest[index] || null, winner: null, })); } set({ boxSeriesFormat: format, boxSeriesGames: newGames }); get()._updateActivePresetIfNeeded(); },
        updateBoxSeriesGame: (gameIndex, field, value) => { set(state => { const newGames = [...state.boxSeriesGames]; if (newGames[gameIndex]) { newGames[gameIndex] = { ...newGames[gameIndex], [field]: value, winner: null }; return { boxSeriesGames: newGames }; } return state; }); get()._updateActivePresetIfNeeded(); },
        setGameWinner: (gameIndex, winningPlayer) => { set(state => { const newGames = [...state.boxSeriesGames]; if (newGames[gameIndex]) { if (newGames[gameIndex].winner === winningPlayer) newGames[gameIndex] = { ...newGames[gameIndex], winner: null }; else newGames[gameIndex] = { ...newGames[gameIndex], winner: winningPlayer }; } let hostScore = 0; let guestScore = 0; newGames.forEach(game => { if (game.winner === 'host') hostScore++; else if (game.winner === 'guest') guestScore++; }); return { boxSeriesGames: newGames, scores: { host: hostScore, guest: guestScore }}; }); get()._updateActivePresetIfNeeded(); },

        addStudioElement: (elementType: string) => {
          set(state => {
            const activeCanvas = state.currentCanvases.find(c => c.id === state.activeCanvasId);
            if (!activeCanvas) {
              console.error("No active canvas found for addStudioElement!");
              return state;
            }

            const initialX_px = 10;
            const initialY_px = 10 + (activeCanvas.layout.length * 20); // Basic stacking

            let newElement: StudioElement;

            if (elementType === "BoXSeriesOverview") {
              newElement = {
                id: Date.now().toString(),
                type: elementType,
                position: { x: initialX_px, y: initialY_px },
                size: { width: 420, height: 320 }, // New W/H to account for padding and Bo5
                fontFamily: 'Arial, sans-serif', // Default font
                fontFamilyGameTitle: undefined, // Use CSS default initially for Game X title
                backgroundColor: 'transparent',
                borderColor: 'transparent',
                scale: 1,
                isPivotLocked: false,
                hideCivs: false, // Added hideCivs default
                // No showName or showScore here
              };
            } else if (elementType === "ScoreOnly") {
              newElement = {
                id: Date.now().toString(), type: elementType,
                position: { x: initialX_px, y: initialY_px },
                size: { width: 100, height: 40 },
                fontFamily: 'Arial, sans-serif',
                backgroundColor: 'transparent',
                borderColor: 'transparent',
                scale: 1,
                isPivotLocked: false,
                pivotInternalOffset: 0,
              };
            } else if (elementType === "NicknamesOnly") {
              newElement = {
                id: Date.now().toString(), type: elementType,
                position: { x: initialX_px, y: initialY_px },
                size: { width: 300, height: 40 },
                fontFamily: 'Arial, sans-serif',
                backgroundColor: 'transparent',
                borderColor: 'transparent',
                scale: 1,
                isPivotLocked: false, // Changed from true
                pivotInternalOffset: 50,
                // textColor is intentionally not set here, will default in component
              };
            } else if (elementType === "CountryFlags") {
              newElement = {
                id: Date.now().toString(),
                type: elementType,
                position: { x: initialX_px, y: initialY_px },
                size: { width: 120, height: 40 },
                fontFamily: 'Arial, sans-serif',
                backgroundColor: 'transparent',
                borderColor: 'transparent',
                textColor: 'white',
                scale: 1,
                isPivotLocked: false,
                pivotInternalOffset: 10,
              };
            } else if (elementType === "ColorGlowElement") {
              newElement = {
                id: Date.now().toString(),
                type: elementType,
                position: { x: initialX_px, y: initialY_px },
                size: { width: 250, height: 150 }, // Increased default size
                fontFamily: 'Arial, sans-serif',
                backgroundColor: 'transparent',
                borderColor: 'transparent',
                textColor: 'white',
                scale: 1,
                isPivotLocked: false,
                pivotInternalOffset: 10,
              };
            } else if (elementType === "MapPoolElement") {
              newElement = {
                id: Date.now().toString(),
                type: "MapPoolElement",
                position: { x: initialX_px, y: initialY_px },
                size: { width: 500, height: 220 },
                fontFamily: 'Arial, sans-serif',
                backgroundColor: 'transparent',
                borderColor: 'transparent',
                scale: 1,
                isPivotLocked: false,
                horizontalSplitOffset: 0,
                player1MapPool: [],
                player2MapPool: [],
              };
            } else if (elementType === "CivPoolElement") {
              newElement = {
                id: Date.now().toString(),
                type: "CivPoolElement", // Ensure this type matches what's passed from StudioInterface
                position: { x: initialX_px, y: initialY_px },
                size: { width: 500, height: 180 }, // Adjusted height
                fontFamily: 'Arial, sans-serif',
                backgroundColor: 'transparent',
                borderColor: 'transparent',
                scale: 1,
                isPivotLocked: false,
                horizontalSplitOffset: 0,
                // player1CivPool and player2CivPool are derived from store, not needed here
              };
            } else {
              // This 'else' block might represent the old "ScoreDisplay" or any other generic type.
              // It should NOT include showName or showScore.
              newElement = {
                id: Date.now().toString(), type: elementType,
                position: { x: initialX_px, y: initialY_px },
                size: { width: 250, height: 40 }, // Default generic size
                fontFamily: 'Arial, sans-serif',
                backgroundColor: 'transparent',
                borderColor: 'transparent',
                scale: 1,
                isPivotLocked: false,
                pivotInternalOffset: 0,
              };
            }
            const updatedCanvases = state.currentCanvases.map(canvas =>
              canvas.id === state.activeCanvasId
                ? { ...canvas, layout: [...canvas.layout, newElement] }
                : canvas
            );
            return { ...state, currentCanvases: JSON.parse(JSON.stringify(updatedCanvases)), layoutLastUpdated: Date.now() };
          });
          get()._autoSaveOrUpdateActiveStudioLayout();
        },
        updateStudioElementPosition: (elementId: string, position: { x: number, y: number }) => {
          set(state => {
            const updatedCanvases = state.currentCanvases.map(canvas =>
              canvas.id === state.activeCanvasId
                ? { ...canvas, layout: canvas.layout.map(el => el.id === elementId ? { ...el, position } : el) }
                : canvas
            );
            return { ...state, currentCanvases: JSON.parse(JSON.stringify(updatedCanvases)), layoutLastUpdated: Date.now() };
          });
          get()._autoSaveOrUpdateActiveStudioLayout();
        },
        updateStudioElementSize: (elementId: string, size: { width: number, height: number }) => {
          set(state => {
            const updatedCanvases = state.currentCanvases.map(canvas =>
              canvas.id === state.activeCanvasId
                ? { ...canvas, layout: canvas.layout.map(el => el.id === elementId ? { ...el, size } : el) }
                : canvas
            );
            return { ...state, currentCanvases: JSON.parse(JSON.stringify(updatedCanvases)), layoutLastUpdated: Date.now() };
          });
          get()._autoSaveOrUpdateActiveStudioLayout();
        },
        setSelectedElementId: (elementId: string | null) => { set({ selectedElementId: elementId }); },
        updateStudioElementSettings: (elementId: string, settings: Partial<StudioElement>) => {
          set(state => {
            const updatedCanvases = state.currentCanvases.map(canvas => {
              if (canvas.id === state.activeCanvasId) {
                return {
                  ...canvas,
                  layout: canvas.layout.map(el => {
                    if (el.id === elementId) {
                      return { ...el, ...settings };
                    }
                    return el;
                  }),
                };
              }
              return canvas;
            });
            return { ...state, currentCanvases: JSON.parse(JSON.stringify(updatedCanvases)), layoutLastUpdated: Date.now() };
          });
          get()._autoSaveOrUpdateActiveStudioLayout();
        },
        removeStudioElement: (elementId: string) => {
          set(state => {
            let newSelectedElementId = state.selectedElementId;
            const updatedCanvases = state.currentCanvases.map(canvas => {
              if (canvas.id === state.activeCanvasId) {
                const newLayout = canvas.layout.filter(el => el.id !== elementId);
                if (newLayout.length < canvas.layout.length && state.selectedElementId === elementId) {
                  newSelectedElementId = null;
                }
                return { ...canvas, layout: newLayout };
              }
              return canvas;
            });
            return { ...state, currentCanvases: JSON.parse(JSON.stringify(updatedCanvases)), selectedElementId: newSelectedElementId, layoutLastUpdated: Date.now() };
          });
          get()._autoSaveOrUpdateActiveStudioLayout();
        },
        saveCurrentStudioLayout: (name: string) => {
          set(state => {
            const newLayoutId = `studiolayout-${Date.now()}`;
            const newLayoutPreset: SavedStudioLayout = {
              id: newLayoutId,
              name,
              canvases: JSON.parse(JSON.stringify(state.currentCanvases)),
              activeCanvasId: state.activeCanvasId,
            };
            return { ...state, savedStudioLayouts: [...state.savedStudioLayouts, newLayoutPreset], activeStudioLayoutId: newLayoutId };
          });
        },
        loadStudioLayout: (layoutId: string) => {
          set(state => {
            const currentLayoutCanvases = get().currentCanvases; // Use get() for current state outside of map
            const currentActiveCanvasId = get().activeCanvasId;
            const layoutToLoad = state.savedStudioLayouts.find(l => l.id === layoutId);

            if (layoutToLoad) {
              // Basic check for idempotency: if the target layout seems already loaded, do nothing.
              // This compares the activeCanvasId and a stringified version of the canvases array.
              if (currentActiveCanvasId === layoutToLoad.activeCanvasId &&
                  JSON.stringify(currentLayoutCanvases) === JSON.stringify(layoutToLoad.canvases)) {
                // console.log(`[loadStudioLayout] Layout ${layoutId} is already active and matches current state. Skipping load.`);
                return state; // Return current state, no changes needed
              }

              const canvasesToLoad = Array.isArray(layoutToLoad.canvases) && layoutToLoad.canvases.length > 0
                ? layoutToLoad.canvases
                : [{ id: `default-load-${Date.now()}`, name: 'Default', layout: [] }];

              let newActiveCanvasId = layoutToLoad.activeCanvasId;
              if (!newActiveCanvasId || !canvasesToLoad.find(c => c.id === newActiveCanvasId)) {
                newActiveCanvasId = canvasesToLoad[0].id;
              }
              // If we are here, it means the layout is different or not loaded, so apply it.
              return { ...state, currentCanvases: JSON.parse(JSON.stringify(canvasesToLoad)), activeCanvasId: newActiveCanvasId, selectedElementId: null, activeStudioLayoutId: layoutId };
            }
            return state; // Return current state if layoutToLoad is not found
          });
        },
        deleteStudioLayout: (layoutId: string) => {
          set(state => {
            const newSavedLayouts = state.savedStudioLayouts.filter(l => l.id !== layoutId);
            let newActiveStudioLayoutId = state.activeStudioLayoutId;
            if (state.activeStudioLayoutId === layoutId) {
              newActiveStudioLayoutId = null;
            }
            return { ...state, savedStudioLayouts: newSavedLayouts, activeStudioLayoutId: newActiveStudioLayoutId };
          });
        },
        updateStudioLayoutName: (layoutId: string, newName: string) => { set(state => ({ savedStudioLayouts: state.savedStudioLayouts.map(l => l.id === layoutId ? { ...l, name: newName } : l), })); },
        setActiveCanvas: (canvasId: string) => {
          set(state => {
            if (state.currentCanvases.find(c => c.id === canvasId)) {
              return { ...state, activeCanvasId: canvasId, selectedElementId: null };
            }
            console.warn(`setActiveCanvas: Canvas ID ${canvasId} not found.`);
            return state;
          });
        },
        addCanvas: (name?: string) => {
          set(state => {
            const newCanvasId = `canvas-${Date.now()}`;
            const newCanvasName = name || `Canvas ${state.currentCanvases.length + 1}`;
            const newCanvas: StudioCanvas = { id: newCanvasId, name: newCanvasName, layout: [] };
            return { ...state, currentCanvases: [...state.currentCanvases, newCanvas], activeCanvasId: newCanvasId, selectedElementId: null };
          });
          get()._autoSaveOrUpdateActiveStudioLayout();
        },
        removeCanvas: (canvasId: string) => {
          set(state => {
            if (state.currentCanvases.length <= 1) return state;
            const newCanvases = state.currentCanvases.filter(c => c.id !== canvasId);
            let newActiveCanvasId = state.activeCanvasId;
            if (state.activeCanvasId === canvasId) {
              newActiveCanvasId = newCanvases.length > 0 ? newCanvases[0].id : null;
            }
            return { ...state, currentCanvases: newCanvases, activeCanvasId: newActiveCanvasId, selectedElementId: null };
          });
          get()._autoSaveOrUpdateActiveStudioLayout();
        },
      updateCanvasName: (canvasId: string, newName: string) => {
        set(state => {
          const newTrimmedName = newName.trim();
          let changeMade = false;
          const updatedCanvases = state.currentCanvases.map(canvas => {
            if (canvas.id === canvasId) {
              const finalName = newTrimmedName === "" ? canvas.name : newTrimmedName;
              if (canvas.name !== finalName) {
                changeMade = true;
                return { ...canvas, name: finalName };
              }
            }
            return canvas;
          });

          if (!changeMade) {
            return state; // No actual change in names
          }

          return {
            ...state,
            currentCanvases: updatedCanvases,
            layoutLastUpdated: Date.now(),
          };
        });
        const stateForLogging = get();
        console.log('LOGAOEINFO: [updateCanvasName] State after set for canvas rename. currentCanvases:', JSON.parse(JSON.stringify(stateForLogging.currentCanvases.map(c => ({id: c.id, name: c.name}))))); // Log only id and name for brevity
        console.log('LOGAOEINFO: [updateCanvasName] ActiveStudioLayoutId before calling _autoSaveOrUpdateActiveStudioLayout:', stateForLogging.activeStudioLayoutId);
        get()._autoSaveOrUpdateActiveStudioLayout();
      },
        setActiveStudioLayoutId: (layoutId: string | null) => {
          set({ activeStudioLayoutId: layoutId });
        },

        resetActiveCanvasLayout: () => {
          set(state => {
            const updatedCanvases = state.currentCanvases.map(canvas =>
              canvas.id === state.activeCanvasId
                ? { ...canvas, layout: [] } // Reset layout for the active canvas
                : canvas
            );
            // If the active canvas was found and its layout reset, update relevant state
            // Check if the layout actually changed to prevent unnecessary updates
            const originalActiveCanvas = state.currentCanvases.find(sc => sc.id === state.activeCanvasId);
            const newActiveCanvas = updatedCanvases.find(uc => uc.id === state.activeCanvasId);

            if (originalActiveCanvas && newActiveCanvas && originalActiveCanvas.layout.length > 0 && newActiveCanvas.layout.length === 0) {
              return {
                ...state,
                currentCanvases: updatedCanvases,
                selectedElementId: null, // Also clear selected element
                layoutLastUpdated: Date.now()
              };
            }
            return state; // Return original state if active canvas not found or no change made
          });
          get()._autoSaveOrUpdateActiveStudioLayout();
        },

        _autoSaveOrUpdateActiveStudioLayout: () => {
          const { activeStudioLayoutId, savedStudioLayouts, currentCanvases, activeCanvasId } = get();
          const autoSavePresetName = "(auto)";

          console.log('LOGAOEINFO: [_autoSaveOrUpdateActiveStudioLayout] Called. Active Layout ID:', activeStudioLayoutId);
          console.log('LOGAOEINFO: [_autoSaveOrUpdateActiveStudioLayout] currentCanvases being processed:', JSON.parse(JSON.stringify(currentCanvases)));

          if (activeStudioLayoutId) {
            let updatedLayoutObject: SavedStudioLayout | null = null;
            const updatedLayouts = savedStudioLayouts.map(layout => {
              if (layout.id === activeStudioLayoutId) {
                updatedLayoutObject = { ...layout, canvases: JSON.parse(JSON.stringify(currentCanvases)), activeCanvasId: activeCanvasId };
                return updatedLayoutObject;
              }
              return layout;
            });
            set({ savedStudioLayouts: updatedLayouts });
            if (updatedLayoutObject) {
              console.log('LOGAOEINFO: [_autoSaveOrUpdateActiveStudioLayout] Layout updated in savedStudioLayouts (activeStudioLayoutId case):', JSON.parse(JSON.stringify(updatedLayoutObject)));
            }
          } else {
            let autoPreset = savedStudioLayouts.find(layout => layout.name === autoSavePresetName);
            if (autoPreset) {
              const updatedAutoPreset = { ...autoPreset, canvases: JSON.parse(JSON.stringify(currentCanvases)), activeCanvasId: activeCanvasId };
              const updatedLayouts = savedStudioLayouts.map(layout => layout.id === autoPreset!.id ? updatedAutoPreset : layout);
              set({ savedStudioLayouts: updatedLayouts, activeStudioLayoutId: autoPreset.id });
              console.log('LOGAOEINFO: [_autoSaveOrUpdateActiveStudioLayout] Layout updated in savedStudioLayouts (autoPreset found case):', JSON.parse(JSON.stringify(updatedAutoPreset)));
            } else {
              const newAutoLayoutId = `studiolayout-auto-${Date.now()}`;
              const newAutoLayoutPreset: SavedStudioLayout = { id: newAutoLayoutId, name: autoSavePresetName, canvases: JSON.parse(JSON.stringify(currentCanvases)), activeCanvasId: activeCanvasId };
              set({ savedStudioLayouts: [...savedStudioLayouts, newAutoLayoutPreset], activeStudioLayoutId: newAutoLayoutId });
              console.log('LOGAOEINFO: [_autoSaveOrUpdateActiveStudioLayout] New layout added to savedStudioLayouts (autoPreset not found case):', JSON.parse(JSON.stringify(newAutoLayoutPreset)));
            }
          }
        },
      }),
      {
        name: 'aoe2-draft-overlay-combined-storage-v1',
        partialize: (state) => ({
            hostName: state.hostName, guestName: state.guestName, scores: state.scores,
            savedPresets: state.savedPresets, civDraftId: state.civDraftId, mapDraftId: state.mapDraftId,
            boxSeriesFormat: state.boxSeriesFormat, boxSeriesGames: state.boxSeriesGames,
            activePresetId: state.activePresetId,
            hostColor: state.hostColor,
            guestColor: state.guestColor,
            currentCanvases: state.currentCanvases,
            activeCanvasId: state.activeCanvasId,
            savedStudioLayouts: state.savedStudioLayouts,
            selectedElementId: state.selectedElementId,
            activeStudioLayoutId: state.activeStudioLayoutId,
            layoutLastUpdated: state.layoutLastUpdated,
        }),
        storage: customLocalStorageWithBroadcast,
        onRehydrateStorage: (state, error) => {
          if (error) console.error('LOGAOEINFO: [draftStore] Error during rehydration:', error);
          else if (state) console.debug('LOGAOEINFO: [draftStore] Rehydration finished.');
          else console.debug('LOGAOEINFO: [draftStore] Rehydration finished, no persisted state found.');
        },
        merge: (persistedStateFromStorage: any, currentState: CombinedDraftState): CombinedDraftState => {
          let actualPersistedState: Partial<CombinedDraftState> | undefined | null;
          if (persistedStateFromStorage && typeof persistedStateFromStorage === 'object' && persistedStateFromStorage.hasOwnProperty('state') && persistedStateFromStorage.hasOwnProperty('version')) {
            actualPersistedState = persistedStateFromStorage.state as Partial<CombinedDraftState>;
          } else {
            actualPersistedState = persistedStateFromStorage as Partial<CombinedDraftState>;
          }
          if (typeof actualPersistedState !== 'object' || actualPersistedState === null) {
            return currentState;
          }
          return { ...currentState, ...actualPersistedState };
        },
        deserialize: (str: string) => {
          if (str === null || str === undefined || typeof str !== 'string') return undefined;
          try {
            return JSON.parse(str);
          } catch (error) {
            console.error('LOGAOEINFO: [draftStore Deserialize] Error parsing string:', error, 'String was:', str);
            return undefined;
          }
        },
      }
    )
  )
);

let currentSocket: Socket | null = null;

useDraftStore.subscribe(
  (state, prevState) => {
    if (prevState.activeStudioLayoutId && !state.activeStudioLayoutId) {
      const autoSaveLayout = state.savedStudioLayouts.find(layout => layout.name === "(auto)");
      if (autoSaveLayout) {
        // Potentially restore auto-save if active layout becomes null
      }
    }
  }
);


export default useDraftStore;
// [end of src/store/draftStore.ts] // This marker was removed in the actual modification
