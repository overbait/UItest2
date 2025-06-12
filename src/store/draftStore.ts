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
  StudioCanvas // <-- Add this
} from '../types/draft';

import { customLocalStorageWithBroadcast } from './customStorage'; // Adjust path if needed

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
  
  saveCurrentAsPreset: (name?: string) => void;
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
};

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
        // CIV 'NONE' picks are not explicitly handled for output.civPicksGlobal here, as they are not standard.
      } else if (isMapAction && draftType === 'map') {
        if (executingPlayer === 'HOST') {
          if (!output.mapPicksHost) output.mapPicksHost = [];
          if (!output.mapPicksHost.includes(optionName)) output.mapPicksHost.push(optionName);
        } else if (executingPlayer === 'GUEST') {
          if (!output.mapPicksGuest) output.mapPicksGuest = [];
          if (!output.mapPicksGuest.includes(optionName)) output.mapPicksGuest.push(optionName);
        } else if (executingPlayer === 'NONE') { // Handle 'NONE' for global map picks
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
        // CIV 'NONE' bans are not standard.
      } else if (isMapAction && draftType === 'map') {
        if (executingPlayer === 'HOST') {
          if (!output.mapBansHost) output.mapBansHost = [];
          if (!output.mapBansHost.includes(optionName)) output.mapBansHost.push(optionName);
        } else if (executingPlayer === 'GUEST') {
          if (!output.mapBansGuest) output.mapBansGuest = [];
          if (!output.mapBansGuest.includes(optionName)) output.mapBansGuest.push(optionName);
        } else if (executingPlayer === 'NONE') { // Handle 'NONE' for global map bans
          if (!output.mapBansGlobal) output.mapBansGlobal = [];
          if (!output.mapBansGlobal.includes(optionName)) output.mapBansGlobal.push(optionName);
        }
      }
    } else if (action === 'snipe') {
      if (isCivAction && draftType === 'civ') {
        if (executingPlayer === 'HOST') { // Host snipes Guest's civ
          if (!output.civBansGuest) output.civBansGuest = [];
          if (!output.civBansGuest.includes(optionName)) output.civBansGuest.push(optionName);
        } else if (executingPlayer === 'GUEST') { // Guest snipes Host's civ
          if (!output.civBansHost) output.civBansHost = [];
          if (!output.civBansHost.includes(optionName)) output.civBansHost.push(optionName);
        }
      } else if (isMapAction && draftType === 'map') {
        if (executingPlayer === 'HOST') { // Host snipes Guest's map
          if (!output.mapBansGuest) output.mapBansGuest = [];
          if (!output.mapBansGuest.includes(optionName)) output.mapBansGuest.push(optionName);
        } else if (executingPlayer === 'GUEST') { // Guest snipes Host's map
          if (!output.mapBansHost) output.mapBansHost = [];
          if (!output.mapBansHost.includes(optionName)) output.mapBansHost.push(optionName);
        }
        // SNIPE 'NONE' is not standard.
      }
    }
  });

  // New logic for auto-picking the last map (This was added in a previous subtask and should be preserved after the forEach loop)
  if (draftType === 'map' && raw.preset?.draftOptions) {
    const allMapOptions = raw.preset.draftOptions
      .filter(opt => !opt.id.startsWith('aoe4.')) // Filter out civ options using opt.id
      .map(opt => getOptionNameById(opt.id));

    const pickedOrBannedMaps = new Set<string>([
      ...(output.mapPicksHost || []),
      ...(output.mapPicksGuest || []),
      ...(output.mapPicksGlobal || []),
      ...(output.mapBansHost || []),
      ...(output.mapBansGuest || []),
      ...(output.mapBansGlobal || []),
    ]);

    const remainingMaps: string[] = [];
    for (const mapName of allMapOptions) {
      if (!pickedOrBannedMaps.has(mapName)) {
        remainingMaps.push(mapName);
      }
    }

    if (remainingMaps.length === 1) {
      if (!output.mapPicksGlobal) {
        output.mapPicksGlobal = [];
      }
      // Ensure the map isn't already somehow globally picked
      if (!output.mapPicksGlobal.includes(remainingMaps[0])) {
        output.mapPicksGlobal.push(remainingMaps[0]);
      }
    }
  }
  // End of new logic

  let currentTurnPlayerDisplay: string | undefined = 'none'; let currentActionDisplay: string | undefined = 'unknown'; let draftStatus: SingleDraftData['status'] = 'unknown'; if (raw.preset?.turns && typeof raw.nextAction === 'number') { if (raw.nextAction >= raw.preset.turns.length) draftStatus = 'completed'; else { draftStatus = 'inProgress'; const currentTurnInfo = raw.preset.turns[raw.nextAction]; if (currentTurnInfo) { currentTurnPlayerDisplay = currentTurnInfo.player === 'HOST' ? hostName : currentTurnInfo.player === 'GUEST' ? guestName : 'None'; currentActionDisplay = currentTurnInfo.action?.toUpperCase().replace('G', ''); } } } else if (raw.status) draftStatus = raw.status.toLowerCase() as SingleDraftData['status']; else if (raw.ongoing === false) draftStatus = 'completed'; else if (raw.ongoing === true) draftStatus = 'inProgress';
  output.status = draftStatus; output.currentTurnPlayer = currentTurnPlayerDisplay; output.currentAction = currentActionDisplay; return output;
};

const getOptionNameFromStore = (optionId: string, draftOptions: Aoe2cmRawDraftData['preset']['draftOptions'] | undefined): string => {
  // Ensure prefix removal even if draftOptions are not available (e.g. early live events)
  if (!draftOptions) {
    return optionId.startsWith('aoe4.') ? optionId.substring(5) : optionId;
  }
  // If draftOptions are available, try to find the name from them
  const option = draftOptions.find(opt => opt.id === optionId);
  if (option?.name) {
    return option.name.startsWith('aoe4.') ? option.name.substring(5) : option.name;
  }
  // Fallback: if name not found in draftOptions, or if option itself was not found,
  // still try to remove prefix from the optionId itself.
  return optionId.startsWith('aoe4.') ? optionId.substring(5) : optionId;
};

const useDraftStore = create<DraftStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialCombinedState,

        connectToWebSocket: (draftId: string, draftType: 'civ' | 'map') => {
          if (currentSocket) {
            console.log("Disconnecting previous socket before creating a new one. Old socket draft ID:", currentSocket.io.opts.query?.draftId);
            currentSocket.disconnect();
            currentSocket = null;
          }

          try {
            set({ socketStatus: 'connecting', socketError: null, socketDraftType: draftType, draftIsLikelyFinished: false });

            currentSocket = io(DRAFT_WEBSOCKET_URL_PLACEHOLDER, { // URL is wss://aoe2cm.net
              path: '/socket.io/',  // Specify the path for Socket.IO engine
              query: {
                draftId: draftId,
                EIO: '4',
              },
              transports: ['websocket'],
              reconnection: false,
            });

            currentSocket.on('connect', () => {
              console.log(`Socket.IO connected for draft ${draftId}, type ${draftType}. Socket ID: ${currentSocket?.id}`);
              const currentStoreDraftId = get()[draftType === 'civ' ? 'civDraftId' : 'mapDraftId'];
              // Ensure this connection is still the one expected by the store
              if (get().socketDraftType === draftType && currentStoreDraftId === draftId) {
                const loadStatusUpdate = draftType === 'civ' ?
                    { isLoadingCivDraft: false, civDraftStatus: 'live' as ConnectionStatus } :
                    { isLoadingMapDraft: false, mapDraftStatus: 'live' as ConnectionStatus };
                set({ socketStatus: 'live', socketError: null, ...loadStatusUpdate });

                // Add event listeners after successful connection and context validation
                if (currentSocket) {
                  // Comprehensive removal of listeners before re-adding
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
                  // currentSocket.off('onAny'); // Typically not removed explicitly

                  // The existing .on('act', ...) and other listeners will follow.
                  // This change only adds the .off() calls.
                  // The original .off('act') and .off('countdown') are now covered by the comprehensive list.

                  currentSocket.on('draft_state', (data) => {
                    console.log('Socket.IO "draft_state" event received:', data);
                    let stateChanged = false;
                    if (data && typeof data === 'object') {
                      if (typeof data.nameHost === 'string') {
                        set({ hostName: data.nameHost });
                        stateChanged = true;
                      }
                      if (typeof data.nameGuest === 'string') {
                        set({ guestName: data.nameGuest });
                        stateChanged = true;
                      }
                    } else {
                      console.warn('Socket.IO "draft_state" event received invalid data:', data);
                    }
                    if (stateChanged) {
                      get()._updateActivePresetIfNeeded();
                      get()._updateBoxSeriesGamesFromPicks();
                    }
                  });

                  currentSocket.on('playerEvent', (eventPayload) => {
                    console.log('Socket.IO "playerEvent" event received:', eventPayload);
                    if (!eventPayload || typeof eventPayload !== 'object' ||
                        !eventPayload.hasOwnProperty('player') ||
                        !eventPayload.hasOwnProperty('actionType') ||
                        !eventPayload.hasOwnProperty('chosenOptionId')) {
                      console.warn('Socket.IO "playerEvent": Received event with invalid or missing properties (player, actionType, chosenOptionId):', eventPayload);
                      return;
                    }

                    const { player, actionType, chosenOptionId } = eventPayload;
                    // Normalize the player field (e.g., if server sends 'host', store might use 'HOST')
                    const executingPlayer = typeof player === 'string' ? player.toUpperCase() as 'HOST' | 'GUEST' | 'NONE' : player;

                    let optionName: string;
                    const currentDraftOptions = get().aoe2cmRawDraftOptions;
                    const currentSocketDraftType = get().socketDraftType;

                    if (actionType === 'ban' && chosenOptionId === "HIDDEN_BAN") {
                      optionName = "Hidden Ban";
                    } else if (typeof chosenOptionId === 'string' && chosenOptionId.length > 0) {
                      optionName = getOptionNameFromStore(chosenOptionId, currentDraftOptions);
                    } else if (chosenOptionId === "") { // Allow empty string for chosenOptionId (e.g. skip pick/ban)
                      optionName = "";
                    } else {
                      console.warn('Socket.IO "playerEvent": Received event with invalid chosenOptionId:', chosenOptionId, "Payload:", eventPayload);
                      return;
                    }

                    let effectiveDraftType: 'civ' | 'map' | null = null;
                    if (chosenOptionId === "HIDDEN_BAN") {
                      effectiveDraftType = currentSocketDraftType;
                    } else if (typeof chosenOptionId === 'string' && chosenOptionId.startsWith('aoe4.')) {
                      effectiveDraftType = 'civ';
                    } else if (typeof chosenOptionId === 'string' && chosenOptionId.length > 0) { // Covers non-aoe4 string IDs
                      effectiveDraftType = 'map';
                    } else if (chosenOptionId === "" && currentSocketDraftType) { // For skip actions, rely on current draft type
                        effectiveDraftType = currentSocketDraftType;
                    }

                    let stateChanged = false;
                    if (effectiveDraftType === 'civ') {
                      stateChanged = true;
                      if (actionType === 'pick') {
                        if (executingPlayer === 'HOST') set(state => ({ civPicksHost: [...new Set([...state.civPicksHost, optionName])] }));
                        else if (executingPlayer === 'GUEST') set(state => ({ civPicksGuest: [...new Set([...state.civPicksGuest, optionName])] }));
                        else { stateChanged = false; console.warn(`Socket.IO "playerEvent": Invalid executingPlayer '${executingPlayer}' for civ pick.`); }
                      } else if (actionType === 'ban') {
                        if (executingPlayer === 'HOST') set(state => ({ civBansHost: [...new Set([...state.civBansHost, optionName])] }));
                        else if (executingPlayer === 'GUEST') set(state => ({ civBansGuest: [...new Set([...state.civBansGuest, optionName])] }));
                        else { stateChanged = false; console.warn(`Socket.IO "playerEvent": Invalid executingPlayer '${executingPlayer}' for civ ban.`); }
                      } else if (actionType === 'snipe') {
                        if (executingPlayer === 'HOST') set(state => ({ civBansGuest: [...new Set([...state.civBansGuest, optionName])] })); // Host snipes Guest
                        else if (executingPlayer === 'GUEST') set(state => ({ civBansHost: [...new Set([...state.civBansHost, optionName])] })); // Guest snipes Host
                        else { stateChanged = false; console.warn(`Socket.IO "playerEvent": Invalid executingPlayer '${executingPlayer}' for civ snipe.`); }
                      } else { stateChanged = false; /* Unknown actionType for civ */ }
                    } else if (effectiveDraftType === 'map') {
                      stateChanged = true;
                      if (actionType === 'pick') {
                        if (executingPlayer === 'HOST') set(state => ({ mapPicksHost: [...new Set([...state.mapPicksHost, optionName])] }));
                        else if (executingPlayer === 'GUEST') set(state => ({ mapPicksGuest: [...new Set([...state.mapPicksGuest, optionName])] }));
                        else if (executingPlayer === 'NONE') set(state => ({ mapPicksGlobal: [...new Set([...state.mapPicksGlobal, optionName])] }));
                        else { stateChanged = false; console.warn(`Socket.IO "playerEvent": Invalid executingPlayer '${executingPlayer}' for map pick.`); }
                      } else if (actionType === 'ban') {
                        if (executingPlayer === 'HOST') set(state => ({ mapBansHost: [...new Set([...state.mapBansHost, optionName])] }));
                        else if (executingPlayer === 'GUEST') set(state => ({ mapBansGuest: [...new Set([...state.mapBansGuest, optionName])] }));
                        else if (executingPlayer === 'NONE') set(state => ({ mapBansGlobal: [...new Set([...state.mapBansGlobal, optionName])] }));
                        else { stateChanged = false; console.warn(`Socket.IO "playerEvent": Invalid executingPlayer '${executingPlayer}' for map ban.`); }
                      } else if (actionType === 'snipe') {
                        if (executingPlayer === 'HOST') set(state => ({ mapBansGuest: [...new Set([...state.mapBansGuest, optionName])] })); // Host snipes Guest
                        else if (executingPlayer === 'GUEST') set(state => ({ mapBansHost: [...new Set([...state.mapBansHost, optionName])] })); // Guest snipes Host
                        else { stateChanged = false; console.warn(`Socket.IO "playerEvent": Invalid executingPlayer '${executingPlayer}' for map snipe.`); }
                      } else { stateChanged = false; /* Unknown actionType for map */ }
                    } else {
                      if (chosenOptionId === "HIDDEN_BAN") {
                        console.warn(`Socket.IO "playerEvent": Could not determine type (civ/map) for HIDDEN_BAN. socketDraftType: ${currentSocketDraftType}. Event not applied.`);
                      } else if (chosenOptionId === "") {
                        console.warn(`Socket.IO "playerEvent": Could not determine type (civ/map) for empty chosenOptionId (skip). socketDraftType: ${currentSocketDraftType}. Event not applied.`);
                      } else {
                        console.warn(`Socket.IO "playerEvent": Could not determine type (civ/map) for event with chosenOptionId: ${chosenOptionId}. Event not applied. socketDraftType: ${currentSocketDraftType}`);
                      }
                    }

                    if (stateChanged) {
                      get()._updateActivePresetIfNeeded();
                    }
                  });

                  currentSocket.on('act', (eventPayload) => {
                    console.log('Socket.IO "act" event received:', eventPayload); // Already present
                    if (!eventPayload || typeof eventPayload !== 'object') {
                      console.warn('Socket.IO "act": Received event with invalid payload:', eventPayload);
                      return;
                    }
                    const { executingPlayer, chosenOptionId, actionType } = eventPayload;
                    // Ensure chosenOptionId property is present, even if its value is null or empty string
                    if (!actionType || !eventPayload.hasOwnProperty('chosenOptionId')) {
                      console.warn('Socket.IO "act": Received event with missing actionType or chosenOptionId property:', eventPayload);
                      return;
                    }

                    let optionName: string;
                    const currentDraftOptions = get().aoe2cmRawDraftOptions;
                    const currentSocketDraftType = get().socketDraftType;

                    if (actionType === 'ban' && chosenOptionId === "HIDDEN_BAN") {
                      optionName = "Hidden Ban";
                    } else if (typeof chosenOptionId === 'string' && chosenOptionId.length > 0) {
                      const rawOptionName = getOptionNameFromStore(chosenOptionId, currentDraftOptions);
                      // Example logging for prefix removal, can be removed after verification if too verbose
                      if (chosenOptionId.startsWith('aoe4.') && !rawOptionName.startsWith('aoe4.')) {
                        console.log(`[Prefix Removal Test in 'act'] Original chosenOptionId: ${chosenOptionId}, Cleaned optionName: ${rawOptionName}`);
                      }
                      optionName = rawOptionName;
                    } else if (chosenOptionId === "") {
                      optionName = "";
                    } else {
                      console.warn('Received "act" event with invalid chosenOptionId:', chosenOptionId, "Payload:", eventPayload);
                      return;
                    }

                    let effectiveDraftType: 'civ' | 'map' | null = null;
                    if (chosenOptionId === "HIDDEN_BAN") {
                      effectiveDraftType = currentSocketDraftType;
                    } else if (typeof chosenOptionId === 'string' && chosenOptionId.startsWith('aoe4.')) {
                      effectiveDraftType = 'civ';
                    } else if (typeof chosenOptionId === 'string' && chosenOptionId.length > 0) {
                      effectiveDraftType = 'map';
                    } else if (chosenOptionId === "" && currentSocketDraftType) {
                      effectiveDraftType = currentSocketDraftType;
                    }
                    // No change to chosenOptionId === "" handling, it's valid for skips.

                    if (effectiveDraftType === 'civ') {
                      if (actionType === 'pick') {
                        if (executingPlayer === 'HOST') set(state => ({ civPicksHost: [...new Set([...state.civPicksHost, optionName])] }));
                        else if (executingPlayer === 'GUEST') set(state => ({ civPicksGuest: [...new Set([...state.civPicksGuest, optionName])] }));
                      } else if (actionType === 'ban') {
                        if (executingPlayer === 'HOST') set(state => ({ civBansHost: [...new Set([...state.civBansHost, optionName])] }));
                        else if (executingPlayer === 'GUEST') set(state => ({ civBansGuest: [...new Set([...state.civBansGuest, optionName])] }));
                      } else if (actionType === 'snipe') {
                        if (executingPlayer === 'HOST') set(state => ({ civBansGuest: [...new Set([...state.civBansGuest, optionName])] }));
                        else if (executingPlayer === 'GUEST') set(state => ({ civBansHost: [...new Set([...state.civBansHost, optionName])] }));
                      }
                    } else if (effectiveDraftType === 'map') {
                      if (actionType === 'pick') {
                        if (executingPlayer === 'HOST') set(state => ({ mapPicksHost: [...new Set([...state.mapPicksHost, optionName])] }));
                        else if (executingPlayer === 'GUEST') set(state => ({ mapPicksGuest: [...new Set([...state.mapPicksGuest, optionName])] }));
                        else if (executingPlayer === 'NONE') set(state => ({ mapPicksGlobal: [...new Set([...state.mapPicksGlobal, optionName])] }));
                      } else if (actionType === 'ban') {
                        if (executingPlayer === 'HOST') set(state => ({ mapBansHost: [...new Set([...state.mapBansHost, optionName])] }));
                        else if (executingPlayer === 'GUEST') set(state => ({ mapBansGuest: [...new Set([...state.mapBansGuest, optionName])] }));
                        else if (executingPlayer === 'NONE') set(state => ({ mapBansGlobal: [...new Set([...state.mapBansGlobal, optionName])] }));
                      } else if (actionType === 'snipe') {
                        if (executingPlayer === 'HOST') set(state => ({ mapBansGuest: [...new Set([...state.mapBansGuest, optionName])] }));
                        else if (executingPlayer === 'GUEST') set(state => ({ mapBansHost: [...new Set([...state.mapBansHost, optionName])] }));
                      }
                    } else {
                      if (chosenOptionId === "HIDDEN_BAN") {
                        console.warn(`Socket.IO "act": Could not determine type (civ/map) for HIDDEN_BAN. socketDraftType: ${currentSocketDraftType}. Event not applied for HIDDEN_BAN.`);
                      } else if (chosenOptionId === "") {
                        // This case means effectiveDraftType was null AND chosenOptionId was ""
                        // This implies currentSocketDraftType was also null.
                        console.warn(`Socket.IO "act": Could not determine type (civ/map) for skip action (empty chosenOptionId) because socketDraftType is null. Event not applied.`);
                      } else {
                        console.warn(`Socket.IO "act": Could not determine type (civ/map) for event with chosenOptionId: ${chosenOptionId}. Event not applied. socketDraftType: ${currentSocketDraftType}`);
                      }
                    }
                    get()._updateActivePresetIfNeeded();
                    get()._updateBoxSeriesGamesFromPicks();
                  });

                  currentSocket.on('countdown', (countdownPayload) => {
                    console.log('Socket.IO "countdown" event received:', countdownPayload);
                    if (countdownPayload && typeof countdownPayload === 'object' && countdownPayload.hasOwnProperty('value')) {
                      // Placeholder for state update:
                      // set({ currentCountdownValue: countdownPayload.value, currentCountdownDisplay: countdownPayload.display });
                    } else {
                      console.warn('Socket.IO "countdown": Received event with invalid payload:', countdownPayload);
                    }
                  });

                  // Add the onAny listener for debugging
                  currentSocket.onAny((eventName, ...args) => {
                    console.log('Socket.IO [DEBUG] event received:', eventName, args);
                  });

                  currentSocket.off('draft_update'); // Remove previous listener if any
                  currentSocket.on('draft_update', (data) => {
                    console.log('Socket.IO "draft_update" event received:', data); // Already present

                    if (typeof data !== 'object' || data === null) {
                      console.warn('Socket.IO "draft_update": Invalid data type received:', data);
                      return;
                    }

                    let stateChanged = false;

                    // Update Player Names
                    if (typeof data.nameHost === 'string') {
                      set({ hostName: data.nameHost });
                      stateChanged = true;
                    }
                    if (typeof data.nameGuest === 'string') {
                      set({ guestName: data.nameGuest });
                      stateChanged = true;
                    }

                    // Update Draft Options
                    if (data.preset && data.preset.draftOptions && Array.isArray(data.preset.draftOptions)) {
                      set({ aoe2cmRawDraftOptions: data.preset.draftOptions });
                      stateChanged = true;
                    }

                    // Process Past Events (data.events)
                    if (data.events && Array.isArray(data.events)) {
                      const currentDraftOptions = get().aoe2cmRawDraftOptions; // Use the latest from the store (possibly updated above)
                      const currentSocketDraftType = get().socketDraftType;

                      data.events.forEach(event => {
                        if (!event || typeof event !== 'object' || !event.actionType || !event.hasOwnProperty('chosenOptionId')) {
                          console.warn('Socket.IO "draft_update": Skipping invalid event in event array processing:', event);
                          return; // continue to next event
                        }

                        const { executingPlayer, chosenOptionId, actionType } = event;
                        let optionName: string;

                        if (actionType === 'ban' && chosenOptionId === "HIDDEN_BAN") {
                          optionName = "Hidden Ban";
                        } else if (typeof chosenOptionId === 'string') { // Allow empty string for chosenOptionId
                          optionName = getOptionNameFromStore(chosenOptionId, currentDraftOptions);
                        } else {
                          console.warn('Socket.IO "draft_update": Invalid chosenOptionId in event array item:', chosenOptionId, "Event:", event);
                          return;
                        }

                        let effectiveDraftType: 'civ' | 'map' | null = null;
                        if (chosenOptionId === "HIDDEN_BAN") {
                          effectiveDraftType = currentSocketDraftType;
                        } else if (typeof chosenOptionId === 'string' && chosenOptionId.startsWith('aoe4.')) {
                          effectiveDraftType = 'civ';
                        } else if (typeof chosenOptionId === 'string') { // Includes empty string, assume map if not 'aoe4.'
                          effectiveDraftType = 'map';
                        }

                        if (effectiveDraftType === 'civ') {
                          stateChanged = true; // Assume state changes if type matches
                          if (actionType === 'pick') {
                            if (executingPlayer === 'HOST') set(state => ({ civPicksHost: [...new Set([...state.civPicksHost, optionName])] }));
                            else if (executingPlayer === 'GUEST') set(state => ({ civPicksGuest: [...new Set([...state.civPicksGuest, optionName])] }));
                          } else if (actionType === 'ban') {
                            if (executingPlayer === 'HOST') set(state => ({ civBansHost: [...new Set([...state.civBansHost, optionName])] }));
                            else if (executingPlayer === 'GUEST') set(state => ({ civBansGuest: [...new Set([...state.civBansGuest, optionName])] }));
                          } else if (actionType === 'snipe') {
                            if (executingPlayer === 'HOST') set(state => ({ civBansGuest: [...new Set([...state.civBansGuest, optionName])] }));
                            else if (executingPlayer === 'GUEST') set(state => ({ civBansHost: [...new Set([...state.civBansHost, optionName])] }));
                          } else { stateChanged = false; } // No valid action type for civ
                        } else if (effectiveDraftType === 'map') {
                          stateChanged = true; // Assume state changes if type matches
                          if (actionType === 'pick') {
                            if (executingPlayer === 'HOST') set(state => ({ mapPicksHost: [...new Set([...state.mapPicksHost, optionName])] }));
                            else if (executingPlayer === 'GUEST') set(state => ({ mapPicksGuest: [...new Set([...state.mapPicksGuest, optionName])] }));
                            else if (executingPlayer === 'NONE') set(state => ({ mapPicksGlobal: [...new Set([...state.mapPicksGlobal, optionName])] }));
                          } else if (actionType === 'ban') {
                            if (executingPlayer === 'HOST') set(state => ({ mapBansHost: [...new Set([...state.mapBansHost, optionName])] }));
                            else if (executingPlayer === 'GUEST') set(state => ({ mapBansGuest: [...new Set([...state.mapBansGuest, optionName])] }));
                            else if (executingPlayer === 'NONE') set(state => ({ mapBansGlobal: [...new Set([...state.mapBansGlobal, optionName])] }));
                          } else if (actionType === 'snipe') {
                            if (executingPlayer === 'HOST') set(state => ({ mapBansGuest: [...new Set([...state.mapBansGuest, optionName])] }));
                            else if (executingPlayer === 'GUEST') set(state => ({ mapBansHost: [...new Set([...state.mapBansHost, optionName])] }));
                          } else { stateChanged = false; } // No valid action type for map
                        } else {
                          console.warn(`Socket.IO "draft_update": Could not determine type (civ/map) for event processing. chosenOptionId: ${chosenOptionId}, socketDraftType: ${currentSocketDraftType}`);
                        }
                      });
                    }

                    if (stateChanged) {
                      get()._updateActivePresetIfNeeded();
                      get()._updateBoxSeriesGamesFromPicks();
                      // No TODO needed now as _updateBoxSeriesGamesFromPicks handles it.
                    }
                  });

                  // currentSocket.off('adminEvent'); // Already handled by comprehensive .off() at the start
                  currentSocket.on('adminEvent', (data) => {
                    console.log('Socket.IO "adminEvent" received:', data); // Already present
                    if (data && data.action === "REVEAL_BANS" && data.events && Array.isArray(data.events)) {
                      console.log('Socket.IO "adminEvent": Processing REVEAL_BANS action with events:', data.events);
                      let stateChanged = false;
                      const currentDraftOptions = get().aoe2cmRawDraftOptions;
                      const currentSocketDraftType = get().socketDraftType; // Used for context if HIDDEN_BAN was ambiguous

                      data.events.forEach(revealedBanEvent => {
                        if (!revealedBanEvent || typeof revealedBanEvent !== 'object' ||
                            !revealedBanEvent.actionType || revealedBanEvent.actionType !== 'ban' ||
                            !revealedBanEvent.hasOwnProperty('chosenOptionId') || // Check for presence
                            revealedBanEvent.chosenOptionId === "HIDDEN_BAN") { // Still skip if it's a placeholder
                          console.warn('Socket.IO "adminEvent" (REVEAL_BANS): Skipping invalid, non-ban, or already hidden ban event:', revealedBanEvent);
                          return;
                        }

                        const { executingPlayer, chosenOptionId } = revealedBanEvent;
                        const optionName = getOptionNameFromStore(chosenOptionId, currentDraftOptions);

                        let effectiveDraftType: 'civ' | 'map' | null = null;
                        if (typeof chosenOptionId === 'string' && chosenOptionId.startsWith('aoe4.')) {
                          effectiveDraftType = 'civ';
                        } else if (typeof chosenOptionId === 'string') { // If not 'aoe4.' and is a string, assume map.
                          effectiveDraftType = 'map';
                        } else {
                           // Fallback to socketDraftType if chosenOptionId is not a string or not decisive
                           effectiveDraftType = currentSocketDraftType;
                        }

                        let targetBanListKey: keyof CombinedDraftState | null = null;

                        if (effectiveDraftType === 'civ') {
                          if (executingPlayer === 'HOST') targetBanListKey = 'civBansHost';
                          else if (executingPlayer === 'GUEST') targetBanListKey = 'civBansGuest';
                        } else if (effectiveDraftType === 'map') {
                          if (executingPlayer === 'HOST') targetBanListKey = 'mapBansHost';
                          else if (executingPlayer === 'GUEST') targetBanListKey = 'mapBansGuest';
                          else if (executingPlayer === 'NONE') targetBanListKey = 'mapBansGlobal';
                        }

                        if (targetBanListKey) {
                          const currentBanList = [...(get()[targetBanListKey] as string[])];
                          const hiddenBanIndex = currentBanList.indexOf("Hidden Ban");

                          if (hiddenBanIndex !== -1) {
                            currentBanList[hiddenBanIndex] = optionName;
                            set(state => ({ ...state, [targetBanListKey as string]: currentBanList }));
                            stateChanged = true;
                          } else {
                            console.warn(`Socket.IO "adminEvent" (REVEAL_BANS): "Hidden Ban" placeholder not found in ${targetBanListKey} for revealed ban:`, revealedBanEvent, `List was:`, currentBanList);
                          }
                        } else {
                          console.warn(`Socket.IO "adminEvent" (REVEAL_BANS): Could not determine target ban list for event:`, revealedBanEvent, `EffectiveDraftType: ${effectiveDraftType}`);
                        }
                      });

                      if (stateChanged) {
                        console.log('Socket.IO "adminEvent" (REVEAL_BANS): State updated due to revealed bans.');
                        get()._updateActivePresetIfNeeded();
                      } else {
                        console.log('Socket.IO "adminEvent" (REVEAL_BANS): No state changes made from REVEAL_BANS event (e.g., no hidden bans found or events were invalid).');
                      }
                    } else if (data && data.action === "REVEAL_BANS") {
                        console.warn('Socket.IO "adminEvent": REVEAL_BANS action received but "events" array is missing or invalid.', data);
                    } else if (data) { // Log for other admin events if any
                        console.log('Socket.IO "adminEvent": Received admin event of type:', data.action, data);
                    } else {
                        console.warn('Socket.IO "adminEvent": Received invalid data for adminEvent:', data);
                    }
                  });

                  // Emit join and ready events after all listeners are set up
                  console.log(`Socket.IO emitting 'join_draft' for draftId: ${draftId}`);
                  currentSocket.emit('join_draft', { draftId: draftId });

                  console.log(`Socket.IO emitting 'player_ready' for draftId: ${draftId} as OBSERVER`);
                  currentSocket.emit('player_ready', {
                    draftId: draftId,
                    playerType: 'OBSERVER'
                  });
                  // Developer Note: The exact event names ('join_draft', 'player_ready') and their
                  // payloads are educated guesses. These may need adjustment based on server expectations.
                  // The duplicated adminEvent listener block that followed here has been removed.
                } // End if(currentSocket) for adding listeners

              } else { // Context changed or old socket
                console.warn("Socket.IO connected, but draft context in store changed or this is an old socket. Disconnecting this socket. Store Draft ID:", currentStoreDraftId, "Socket Draft ID in query:", currentSocket?.io.opts.query?.draftId);
                currentSocket?.disconnect();
              }

              // Add draft_finished listener
              if (currentSocket) { // This check is important as currentSocket might have been disconnected if context changed
                // currentSocket.off('draft_finished'); // Already handled by bulk .off() at the start of connect handler's `if (currentSocket)`
                currentSocket.on('draft_finished', (data) => {
                  console.log('Socket.IO "draft_finished" event received:', data); // Log already present, prefix verified
                  // This event signals the draft is over from the server side.
                  // We set a flag that the 'disconnect' handler can check.
                  set({ draftIsLikelyFinished: true });
                });
              }
            }); // End of currentSocket.on('connect', () => { ... })

            // currentSocket.off('connect_error'); // Already handled by bulk .off() at the start of connectToWebSocket
            currentSocket.on('connect_error', (err) => {
              console.error(`Socket.IO connection error for draft ${draftId} (type ${draftType}):`, err.message, err.cause);
              const errorMessage = `Socket.IO connection error: ${err.message}. Real-time updates unavailable.`;
              const currentStoreDraftId = get()[draftType === 'civ' ? 'civDraftId' : 'mapDraftId'];
              const draftStatusField = draftType === 'civ' ? 'civDraftStatus' : 'mapDraftStatus';
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
              const localDraftId = draftId; // Capture from function scope
              const localDraftType = draftType; // Capture from function scope
              const wasLikelyFinished = get().draftIsLikelyFinished; // Capture before reset

              console.log(`Socket.IO disconnected for draft ${localDraftId} (type ${localDraftType}). Reason: ${reason}. Socket ID was: ${currentSocket?.id || 'already cleared or different instance'}. Was likely finished: ${wasLikelyFinished}`);

              const currentStoreDraftIdForThisType = get()[localDraftType === 'civ' ? 'civDraftId' : 'mapDraftId'];

              // Only update state if this disconnect event is for the draft we currently care about for this type
              if (get().socketDraftType === localDraftType && currentStoreDraftIdForThisType === localDraftId) {
                let statusUpdate: Partial<CombinedDraftState> = {
                  socketStatus: 'disconnected',
                  socketError: null,
                  socketDraftType: null,
                };
                if (reason !== 'io server disconnect' && reason !== 'io client disconnect') {
                  statusUpdate.socketError = `Live connection closed: ${reason}. Updates stopped.`;
                  statusUpdate.socketStatus = 'error';
                  // Log the potential error when statusUpdate.socketError is set
                  console.warn(`Socket.IO for ${localDraftType} draft ${localDraftId} disconnected with potential error. New status: ${statusUpdate.socketStatus}, Error: ${statusUpdate.socketError}`);
                  // Also update the main draft status to 'error' and turn off loading.
                  const draftErrorStatusUpdate = localDraftType === 'civ' ?
                    { isLoadingCivDraft: false, civDraftStatus: 'error' as ConnectionStatus, civDraftError: statusUpdate.socketError } :
                    { isLoadingMapDraft: false, mapDraftStatus: 'error' as ConnectionStatus, mapDraftError: statusUpdate.socketError };
                  statusUpdate = { ...statusUpdate, ...draftErrorStatusUpdate };
                } else {
                  // For client or server initiated disconnects that are not errors, ensure loading is false.
                  const draftLoadingUpdate = localDraftType === 'civ' ?
                    { isLoadingCivDraft: false } : { isLoadingMapDraft: false };
                  statusUpdate = { ...statusUpdate, ...draftLoadingUpdate };
                }
                set(statusUpdate);
              } else {
                 // If the disconnect is not for the currently active draft type/ID, still ensure loading flags are reset
                 // if this socket instance was responsible for that draft type.
                 if (currentSocket && currentSocket.io.opts.query?.draftId === localDraftId && get().socketDraftType === localDraftType) {
                    const draftLoadingUpdate = localDraftType === 'civ' ?
                        { isLoadingCivDraft: false } : { isLoadingMapDraft: false };
                    set(draftLoadingUpdate);
                 }
              }

              // Nullify currentSocket if this specific instance is the one that disconnected.
              // This check is important to avoid nullifying a new socket if events arrive out of order.
              if (currentSocket && currentSocket.io.opts.query?.draftId === localDraftId) {
                 currentSocket = null;
              }

              // Reset the flag after its value for this disconnect event has been captured
              if (wasLikelyFinished) {
                set({ draftIsLikelyFinished: false });
              }

              const shouldAttemptHttpFallback = wasLikelyFinished || reason === 'io server disconnect' || reason === 'transport close';

              if (shouldAttemptHttpFallback && localDraftId && localDraftType) {
                // Enhanced log for triggering HTTP fallback
                console.log(`[HTTP Fallback Triggered] Attempting HTTP fallback for ${localDraftType} draft ${localDraftId} due to disconnect reason: '${reason}' and wasLikelyFinished: ${wasLikelyFinished}.`);
                // The existing log below also serves a similar purpose, but the one above is more specific to the trigger condition.
                // console.log(`WebSocket for ${localDraftType} draft ${localDraftId} disconnected (reason: ${reason}, wasLikelyFinished: ${wasLikelyFinished}). Attempting HTTP fallback.`);
                setTimeout(() => {
                    const currentStatus = get()[localDraftType === 'civ' ? 'civDraftStatus' : 'mapDraftStatus'];
                    if (currentStatus !== 'connecting' && currentStatus !== 'live') {
                         get().connectToDraft(localDraftId, localDraftType);
                    } else {
                         console.log(`HTTP fallback for ${localDraftId} skipped, another connection attempt is already in progress or live (status: ${currentStatus}).`);
                    }
                }, 1000);
              }
            });

          } catch (initError) {
            console.error(`Failed to initialize Socket.IO for draft ${draftId} (type ${draftType}):`, initError);
            const message = initError instanceof Error ? initError.message : "Failed to initialize Socket.IO.";
            set({ socketStatus: 'error', socketError: `Setup error: ${message}`, socketDraftType: null });
            if (currentSocket) { // If somehow currentSocket got assigned before full failure
                currentSocket.disconnect();
                currentSocket = null;
            }
          }
        },

        disconnectWebSocket: () => {
          if (currentSocket) {
            console.log("Calling currentSocket.disconnect() for draft ID:", currentSocket.io.opts.query?.draftId, "Socket ID:", currentSocket.id);
            currentSocket.disconnect();
            // The 'disconnect' event handler for currentSocket should handle setting currentSocket to null
            // and updating related store states.
            // However, to ensure immediate nullification if the event handler doesn't fire or is delayed:
            currentSocket = null;
          }
          // Always ensure the state reflects disconnection, regardless of whether a socket instance existed.
          set({ socketStatus: 'disconnected', socketError: null, socketDraftType: null });
        },

        // handleWebSocketMessage removed

        _resetCurrentSessionState: () => {
          // Removed localStorage.removeItem for lastHostFlag and lastGuestFlag
          const newDefaultCanvasId = `default-rst-${Date.now()}`;
          const defaultCanvases: StudioCanvas[] = [{ id: newDefaultCanvasId, name: 'Default', layout: [] }];
          const currentSavedPresets = get().savedPresets; // Keep these
          const currentSavedStudioLayouts = get().savedStudioLayouts; // Keep these

          set({
            // Re-apply initial values for things that should reset, explicitly setting flags to null
            civDraftId: null, mapDraftId: null, hostName: initialPlayerNameHost, guestName: initialPlayerNameGuest,
            scores: { ...initialScores }, civPicksHost: [], civBansHost: [], civPicksGuest: [], civBansGuest: [],
            mapPicksHost: [], mapBansHost: [], mapPicksGuest: [], mapBansGuest: [], mapPicksGlobal: [], mapBansGlobal: [],
            civDraftStatus: 'disconnected', civDraftError: null, isLoadingCivDraft: false,
            mapDraftStatus: 'disconnected', mapDraftError: null, isLoadingMapDraft: false,
            socketStatus: 'disconnected', // Reset WebSocket state
            socketError: null,            // Reset WebSocket state
            socketDraftType: null,        // Reset socket draft type
            draftIsLikelyFinished: false, // Reset flag
            aoe2cmRawDraftOptions: undefined, // Reset draft options
            activePresetId: null, boxSeriesFormat: null, boxSeriesGames: [],

            hostFlag: null, // Explicitly null
            guestFlag: null, // Explicitly null
            hostColor: null, // Assuming colors also reset
            guestColor: null,

            currentCanvases: defaultCanvases,
            activeCanvasId: newDefaultCanvasId,
            selectedElementId: null,
            activeStudioLayoutId: null,
            layoutLastUpdated: null,

            // Keep persistent parts
            savedPresets: currentSavedPresets,
            savedStudioLayouts: currentSavedStudioLayouts,
          });
        },

        _updateBoxSeriesGamesFromPicks: () => {
          const { boxSeriesFormat, boxSeriesGames, mapPicksHost, mapPicksGuest, mapPicksGlobal, civPicksHost, civPicksGuest } = get();

          if (!boxSeriesFormat) {
            return; // Only update if a BoX format is active
          }

          const combinedMapPicks = Array.from(new Set([...mapPicksHost, ...mapPicksGuest, ...mapPicksGlobal]));
          let changed = false;

          const newBoxSeriesGames = boxSeriesGames.map((game, index) => {
            const updatedGame = { ...game }; // Create a new game object to avoid direct state mutation before set

            // Update map if current slot is null and a map is available
            if (updatedGame.map === null && combinedMapPicks[index] !== undefined) {
              updatedGame.map = combinedMapPicks[index];
              changed = true;
            }

            // Update host civ if current slot is null and a civ is available
            if (updatedGame.hostCiv === null && civPicksHost[index] !== undefined) {
              updatedGame.hostCiv = civPicksHost[index];
              changed = true;
            }

            // Update guest civ if current slot is null and a civ is available
            if (updatedGame.guestCiv === null && civPicksGuest[index] !== undefined) {
              updatedGame.guestCiv = civPicksGuest[index];
              changed = true;
            }
            return updatedGame;
          });

          if (changed) {
            // console.log('[BoX Series Update] Automatically updating BoX series games from picks.');
            set({ boxSeriesGames: newBoxSeriesGames });
            // Call _updateActivePresetIfNeeded to ensure the preset is saved with the new boxSeriesGames
            // This is important if this function is called from contexts where _updateActivePresetIfNeeded doesn't naturally follow
            get()._updateActivePresetIfNeeded();
          }
        },

        _updateActivePresetIfNeeded: () => { const { activePresetId, savedPresets, hostName, guestName, scores, civDraftId, mapDraftId, boxSeriesFormat, boxSeriesGames, hostColor, guestColor } = get(); if (activePresetId) { const presetIndex = savedPresets.findIndex(p => p.id === activePresetId); if (presetIndex !== -1) { const updatedPreset: SavedPreset = { ...savedPresets[presetIndex], hostName, guestName, scores: { ...scores }, civDraftId, mapDraftId, boxSeriesFormat, boxSeriesGames: JSON.parse(JSON.stringify(boxSeriesGames)), hostColor, guestColor }; const newSavedPresets = [...savedPresets]; newSavedPresets[presetIndex] = updatedPreset; set({ savedPresets: newSavedPresets }); } } },
        extractDraftIdFromUrl: (url: string) => { try { if (url.startsWith('http://') || url.startsWith('https://')) { const urlObj = new URL(url); if (urlObj.hostname.includes('aoe2cm.net')) { const pathMatch = /\/draft\/([a-zA-Z0-9]+)/.exec(urlObj.pathname); if (pathMatch && pathMatch[1]) return pathMatch[1]; const observerPathMatch = /\/observer\/([a-zA-Z0-9]+)/.exec(urlObj.pathname); if (observerPathMatch && observerPathMatch[1]) return observerPathMatch[1]; } const pathSegments = urlObj.pathname.split('/'); const potentialId = pathSegments.pop() || pathSegments.pop(); if (potentialId && /^[a-zA-Z0-9_-]+$/.test(potentialId) && potentialId.length > 3) return potentialId; const draftIdParam = urlObj.searchParams.get('draftId') || urlObj.searchParams.get('id'); if (draftIdParam) return draftIdParam; } if (/^[a-zA-Z0-9_-]+$/.test(url) && url.length > 3) return url; return null; } catch (error) { if (/^[a-zA-Z0-9_-]+$/.test(url) && url.length > 3) return url; return null; } },

        connectToDraft: async (draftIdOrUrl: string, draftType: 'civ' | 'map') => {
          // Initial Setup
          if (draftType === 'civ') {
            set({ isLoadingCivDraft: true, civDraftStatus: 'connecting', civDraftError: null, civDraftId: null });
          } else {
            set({ isLoadingMapDraft: true, mapDraftStatus: 'connecting', mapDraftError: null, mapDraftId: null });
          }
          // Clear the other draft type's ID if it's not a dual connection scenario (which it isn't currently)
          // This ensures that if we switch from a civ draft to a map draft, the civDraftId is cleared.
          // However, current preset logic might rely on both IDs being present for a "full" preset.
          // For now, let's only set the current draftType's ID and related status.
          // Consider if `activePresetId` should be nulled immediately or after WS/HTTP attempt.

          const extractedId = get().extractDraftIdFromUrl(draftIdOrUrl);

          if (!extractedId) {
            const errorMsg = 'Invalid Draft ID or URL provided.';
            if (draftType === 'civ') {
              set({ isLoadingCivDraft: false, civDraftStatus: 'error', civDraftError: errorMsg });
            } else {
              set({ isLoadingMapDraft: false, mapDraftStatus: 'error', mapDraftError: errorMsg });
            }
            return false;
          }

          // Update draft ID for the current type
          if (draftType === 'civ') {
            set({ civDraftId: extractedId });
          } else {
            set({ mapDraftId: extractedId });
          }

          // Clear activePresetId if the new extractedId doesn't match the one in the active preset for the given draftType
          const currentActivePresetId = get().activePresetId;
          const savedPresetsArray = get().savedPresets;
          const activePreset = currentActivePresetId ? savedPresetsArray.find(p => p.id === currentActivePresetId) : null;
          if (activePreset) {
            if ((draftType === 'civ' && activePreset.civDraftId !== extractedId) ||
                (draftType === 'map' && activePreset.mapDraftId !== extractedId)) {
              set({ activePresetId: null });
            }
          } else {
            // If no active preset, ensure it's null (it might be already, but good to be explicit)
            set({ activePresetId: null });
          }


          // HTTP First Approach: Always fetch draft data via HTTP first.
          console.log(`[ConnectToDraft] Attempting to fetch ${draftType} draft ${extractedId} via HTTP.`);
          const apiUrl = `${DRAFT_DATA_API_BASE_URL}/draft/${extractedId}`;

          try {
            const response = await axios.get<Aoe2cmRawDraftData>(apiUrl);
            console.log(`[ConnectToDraft] HTTP data received for ${extractedId}. Processing...`);

            if (!response.data || typeof response.data !== 'object') {
              throw new Error('Received invalid or empty data structure from the API.');
            }
            const rawDraftData = response.data;
            if (!rawDraftData.preset || !rawDraftData.preset.draftOptions) {
              // Even if preset/draftOptions are missing, we might still want to connect to WebSocket if ongoing.
              // For now, let's treat this as an error for data consistency, but this could be revisited.
              console.warn(`[ConnectToDraft] Preset data or draftOptions missing in API response for ${extractedId}.`, rawDraftData);
              // throw new Error('Preset data or draftOptions missing in API response.'); // Potentially too strict
            }

            const processedData = transformRawDataToSingleDraft(rawDraftData, draftType);

            // Determine host and guest names based on fetched data, preserving existing names if they are not default/live placeholders
            let newHostName = get().hostName;
            let newGuestName = get().guestName;
            const isHostNameDefaultOrLive = get().hostName === initialPlayerNameHost || get().hostName === "Host (Live)";
            const isGuestNameDefaultOrLive = get().guestName === initialPlayerNameGuest || get().guestName === "Guest (Live)";

            if (processedData.hostName) newHostName = isHostNameDefaultOrLive ? processedData.hostName : get().hostName;
            if (processedData.guestName) newGuestName = isGuestNameDefaultOrLive ? processedData.guestName : get().guestName;


            // Update store with fetched data
            set(state => ({
              ...state,
              aoe2cmRawDraftOptions: rawDraftData.preset?.draftOptions || state.aoe2cmRawDraftOptions, // Preserve old options if new ones are missing
              hostName: newHostName,
              guestName: newGuestName,
              civPicksHost: draftType === 'civ' ? (processedData.civPicksHost || []) : state.civPicksHost,
              civBansHost: draftType === 'civ' ? (processedData.civBansHost || []) : state.civBansHost,
              civPicksGuest: draftType === 'civ' ? (processedData.civPicksGuest || []) : state.civPicksGuest,
              civBansGuest: draftType === 'civ' ? (processedData.civBansGuest || []) : state.civBansGuest,
              mapPicksHost: draftType === 'map' ? (processedData.mapPicksHost || []) : state.mapPicksHost,
              mapBansHost: draftType === 'map' ? (processedData.mapBansHost || []) : state.mapBansHost,
              mapPicksGuest: draftType === 'map' ? (processedData.mapPicksGuest || []) : state.mapPicksGuest,
              mapBansGuest: draftType === 'map' ? (processedData.mapBansGuest || []) : state.mapBansGuest,
              mapPicksGlobal: draftType === 'map' ? (processedData.mapPicksGlobal || []) : state.mapPicksGlobal,
              mapBansGlobal: draftType === 'map' ? (processedData.mapBansGlobal || []) : state.mapBansGlobal,
            }));

            // Update draft status based on HTTP fetch
            if (draftType === 'civ') {
              set({ isLoadingCivDraft: false, civDraftStatus: 'connected', civDraftError: null });
            } else {
              set({ isLoadingMapDraft: false, mapDraftStatus: 'connected', mapDraftError: null });
            }

            // Auto-detect Box Series Format if not already set by user or preset
            if (rawDraftData.preset?.name) {
              const presetName = rawDraftData.preset.name.toLowerCase();
              let detectedFormat: 'bo1' | 'bo3' | 'bo5' | 'bo7' | null = get().boxSeriesFormat;
              if (get().activePresetId === null && !get().boxSeriesFormat) { // Only if no active preset and no format set
                if (presetName.includes('bo1')) detectedFormat = 'bo1';
                else if (presetName.includes('bo3')) detectedFormat = 'bo3';
                else if (presetName.includes('bo5')) detectedFormat = 'bo5';
                else if (presetName.includes('bo7')) detectedFormat = 'bo7';

                if (detectedFormat && get().boxSeriesFormat !== detectedFormat) {
                    console.log(`[ConnectToDraft] Auto-detected BoX format: ${detectedFormat} for ${extractedId}`);
                    get().setBoxSeriesFormat(detectedFormat); // This will initialize boxSeriesGames
                }
              }
            }

            get()._updateBoxSeriesGamesFromPicks(); // Populate BoX series from fetched picks
            get()._updateActivePresetIfNeeded();    // Save to preset if active

            // Conditional WebSocket Connection
            if (rawDraftData.ongoing === true) {
              console.log(`[ConnectToDraft] Draft ${extractedId} is ongoing. Attempting WebSocket connection.`);
              get().connectToWebSocket(extractedId, draftType);
            } else {
              console.log(`[ConnectToDraft] Draft ${extractedId} is not ongoing (completed or status unknown). WebSocket connection will not be attempted.`);
              // Ensure any existing WebSocket connection for this ID (if any) is disconnected
              // and socket status is appropriate.
              if (get().socketDraftType === draftType && (get().civDraftId === extractedId || get().mapDraftId === extractedId)) {
                 get().disconnectWebSocket(); // This sets socketStatus to 'disconnected'
              } else {
                // If no specific socket was active for this draft, ensure general socket status is clear
                set({socketStatus: 'disconnected', socketError: null, socketDraftType: null});
              }
            }
            return true; // HTTP fetch was successful

          } catch (error) {
            let httpErrorMessage = "Failed to fetch draft data via HTTP.";
            if (axios.isAxiosError(error)) {
              httpErrorMessage = `Server responded with status ${error.response?.status || 'N/A'}: ${error.message}`;
            } else if (error instanceof Error) {
              httpErrorMessage = error.message;
            }

            const finalErrorMessage = `Failed to connect to draft ${extractedId}: ${httpErrorMessage}`;
            console.error(`[ConnectToDraft] ${finalErrorMessage}`, error);

            if (draftType === 'civ') {
              set({ isLoadingCivDraft: false, civDraftStatus: 'error', civDraftError: finalErrorMessage, activePresetId: null });
            } else { // map draft
              set({ isLoadingMapDraft: false, mapDraftStatus: 'error', mapDraftError: finalErrorMessage, activePresetId: null });
            }
            // Ensure WebSocket is disconnected on HTTP error too
            get().disconnectWebSocket();
            return false;
          }
        },
        disconnectDraft: (draftType: 'civ' | 'map') => {
          get().disconnectWebSocket(); // Disconnect WebSocket regardless of draft type first
          if (draftType === 'civ') { set({ civDraftId: null, civDraftStatus: 'disconnected', civDraftError: null, isLoadingCivDraft: false, civPicksHost: [], civBansHost: [], civPicksGuest: [], civBansGuest: [], hostName: get().mapDraftId ? get().hostName : initialPlayerNameHost, guestName: get().mapDraftId ? get().guestName : initialPlayerNameGuest, boxSeriesGames: get().boxSeriesGames.map(game => ({ ...game, hostCiv: null, guestCiv: null })), activePresetId: null, }); } else { set({ mapDraftId: null, mapDraftStatus: 'disconnected', mapDraftError: null, isLoadingMapDraft: false, mapPicksHost: [], mapBansHost: [], mapPicksGuest: [], mapBansGuest: [], mapPicksGlobal: [], mapBansGlobal: [], boxSeriesGames: get().boxSeriesGames.map(game => ({ ...game, map: null })), activePresetId: null, }); } if (!get().civDraftId && !get().mapDraftId) set({ boxSeriesFormat: null, boxSeriesGames: [], activePresetId: null }); },
        reconnectDraft: async (draftType: 'civ' | 'map') => { const idToReconnect = draftType === 'civ' ? get().civDraftId : get().mapDraftId; if (!idToReconnect) { const errorMsg = `No ${draftType} draft ID to reconnect.`; if (draftType === 'civ') set({ civDraftError: errorMsg }); else set({ mapDraftError: errorMsg }); return false; } return get().connectToDraft(idToReconnect, draftType); },
        setHostName: (name: string) => { set({ hostName: name }); get()._updateActivePresetIfNeeded(); },
        setGuestName: (name: string) => { set({ guestName: name }); get()._updateActivePresetIfNeeded(); },
        setHostColor: (color) => { set({ hostColor: color }); get()._updateActivePresetIfNeeded(); },
        setGuestColor: (color) => { set({ guestColor: color }); get()._updateActivePresetIfNeeded(); },
        setHostFlag: (flag: string | null) => {
          set({ hostFlag: flag });
          // localStorage.setItem removed
          get()._updateActivePresetIfNeeded();
        },
        setGuestFlag: (flag: string | null) => {
          set({ guestFlag: flag });
          // localStorage.setItem removed
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
          get()._updateActivePresetIfNeeded(); // Crucial for saving to presets
        },
        incrementScore: (player: 'host' | 'guest') => { set(state => ({ scores: { ...state.scores, [player]: state.scores[player] + 1 }})); get()._updateActivePresetIfNeeded(); },
        decrementScore: (player: 'host' | 'guest') => { set(state => ({ scores: { ...state.scores, [player]: Math.max(0, state.scores[player] - 1) }})); get()._updateActivePresetIfNeeded(); },
        saveCurrentAsPreset: (name?: string) => { const { civDraftId, mapDraftId, hostName, guestName, scores, savedPresets, boxSeriesFormat, boxSeriesGames, hostColor, guestColor } = get(); const presetName = name || `${hostName} vs ${guestName} - ${new Date().toLocaleDateString()}`; const existingPresetIndex = savedPresets.findIndex(p => p.name === presetName); const presetIdToUse = existingPresetIndex !== -1 ? savedPresets[existingPresetIndex].id : Date.now().toString(); const presetData: SavedPreset = { id: presetIdToUse, name: presetName, civDraftId, mapDraftId, hostName, guestName, scores: { ...scores }, boxSeriesFormat, boxSeriesGames: JSON.parse(JSON.stringify(boxSeriesGames)), hostColor, guestColor }; if (existingPresetIndex !== -1) { const updatedPresets = [...savedPresets]; updatedPresets[existingPresetIndex] = presetData; set({ savedPresets: updatedPresets, activePresetId: presetData.id }); } else set({ savedPresets: [...savedPresets, presetData], activePresetId: presetData.id }); },
        loadPreset: async (presetId: string) => { const preset = get().savedPresets.find(p => p.id === presetId); if (preset) { set({ activePresetId: preset.id, civDraftId: preset.civDraftId, mapDraftId: preset.mapDraftId, hostName: preset.hostName, guestName: preset.guestName, scores: { ...preset.scores }, boxSeriesFormat: preset.boxSeriesFormat, boxSeriesGames: JSON.parse(JSON.stringify(preset.boxSeriesGames)), hostColor: preset.hostColor || null, guestColor: preset.guestColor || null, /* hostFlag and guestFlag removed */ civDraftStatus: 'disconnected', civDraftError: null, isLoadingCivDraft: false, mapDraftStatus: 'disconnected', mapDraftError: null, isLoadingMapDraft: false, civPicksHost: [], civBansHost: [], civPicksGuest: [], civBansGuest: [], mapPicksHost: [], mapBansHost: [], mapPicksGuest: [], mapBansGuest: [], mapPicksGlobal: [], mapBansGlobal: [] }); if (preset.civDraftId) await get().connectToDraft(preset.civDraftId, 'civ'); if (preset.mapDraftId) await get().connectToDraft(preset.mapDraftId, 'map'); set({ activePresetId: preset.id }); } },
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

            // const REF_WIDTH_CONST = 1920; // Removed
            // const REF_HEIGHT_CONST = 1080; // Removed

            const initialX_px = 10;
            const initialY_px = 10 + (activeCanvas.layout.length * 20); // Stagger new elements
            const initialWidth_px = 250;
            const initialHeight_px = 40;

            const newElement: StudioElement = {
              id: Date.now().toString(), type: elementType,
              position: {
                x: initialX_px,
                y: initialY_px
              },
              size: {
                width: initialWidth_px,
                height: initialHeight_px
              },
              fontFamily: 'Arial', showName: true, showScore: true,
              backgroundColor: 'transparent', borderColor: 'transparent',
              scale: 1, isPivotLocked: false, pivotInternalOffset: 0,
            };
            const updatedCanvases = state.currentCanvases.map(canvas =>
              canvas.id === state.activeCanvasId
                ? { ...canvas, layout: [...canvas.layout, newElement] }
                : canvas
            );
            return {
              ...state,
              currentCanvases: JSON.parse(JSON.stringify(updatedCanvases)),
              layoutLastUpdated: Date.now()
            };
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
            return {
              ...state,
              currentCanvases: JSON.parse(JSON.stringify(updatedCanvases)),
              layoutLastUpdated: Date.now()
            };
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
            return {
              ...state,
              currentCanvases: JSON.parse(JSON.stringify(updatedCanvases)),
              layoutLastUpdated: Date.now()
            };
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
                      // Simply merge settings. No positional adjustment for 'top left' origin when scale changes.
                      return { ...el, ...settings };
                    }
                    return el;
                  }),
                };
              }
              return canvas;
            });
            return {
              ...state,
              currentCanvases: JSON.parse(JSON.stringify(updatedCanvases)),
              layoutLastUpdated: Date.now()
            };
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
            return {
              ...state,
              currentCanvases: JSON.parse(JSON.stringify(updatedCanvases)),
              selectedElementId: newSelectedElementId,
              layoutLastUpdated: Date.now()
            };
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
            return {
              ...state,
              savedStudioLayouts: [...state.savedStudioLayouts, newLayoutPreset],
              activeStudioLayoutId: newLayoutId,
            };
          });
        },
        loadStudioLayout: (layoutId: string) => {
          set(state => {
            const layoutToLoad = state.savedStudioLayouts.find(l => l.id === layoutId);
            if (layoutToLoad) {
              const canvasesToLoad = Array.isArray(layoutToLoad.canvases) && layoutToLoad.canvases.length > 0
                ? layoutToLoad.canvases
                : [{ id: `default-load-${Date.now()}`, name: 'Default', layout: [] }];

              let newActiveCanvasId = layoutToLoad.activeCanvasId;
              if (!newActiveCanvasId || !canvasesToLoad.find(c => c.id === newActiveCanvasId)) {
                newActiveCanvasId = canvasesToLoad[0].id;
              }

              return {
                ...state,
                currentCanvases: JSON.parse(JSON.stringify(canvasesToLoad)),
                activeCanvasId: newActiveCanvasId,
                selectedElementId: null,
                activeStudioLayoutId: layoutId,
              };
            }
            return state;
          });
        },
        deleteStudioLayout: (layoutId: string) => {
          set(state => {
            const newSavedLayouts = state.savedStudioLayouts.filter(l => l.id !== layoutId);
            let newActiveStudioLayoutId = state.activeStudioLayoutId;
            if (state.activeStudioLayoutId === layoutId) {
              newActiveStudioLayoutId = null;
            }
            return {
              ...state,
              savedStudioLayouts: newSavedLayouts,
              activeStudioLayoutId: newActiveStudioLayoutId,
            };
          });
        },
        updateStudioLayoutName: (layoutId: string, newName: string) => { set(state => ({ savedStudioLayouts: state.savedStudioLayouts.map(l => l.id === layoutId ? { ...l, name: newName } : l), })); },

        // Implement New Canvas Actions
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
            return {
              ...state,
              currentCanvases: [...state.currentCanvases, newCanvas],
              activeCanvasId: newCanvasId,
              selectedElementId: null,
            };
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
            return {
              ...state,
              currentCanvases: newCanvases,
              activeCanvasId: newActiveCanvasId,
              selectedElementId: null,
            };
          });
          get()._autoSaveOrUpdateActiveStudioLayout();
        },
        updateCanvasName: (canvasId: string, newName: string) => {
          set(state => ({
            ...state,
            currentCanvases: state.currentCanvases.map(c =>
              c.id === canvasId ? { ...c, name: newName } : c
            ),
          }));
          get()._autoSaveOrUpdateActiveStudioLayout();
        },
        setActiveStudioLayoutId: (layoutId: string | null) => {
          set({ activeStudioLayoutId: layoutId });
        },

        _autoSaveOrUpdateActiveStudioLayout: () => {
          const { activeStudioLayoutId, savedStudioLayouts, currentCanvases, activeCanvasId } = get();
          const autoSavePresetName = "(auto)";

          if (activeStudioLayoutId) {
            // Update the currently active, user-named preset (or the "(auto)" preset if it's the active one)
            const updatedLayouts = savedStudioLayouts.map(layout =>
              layout.id === activeStudioLayoutId
                ? {
                    ...layout,
                    canvases: JSON.parse(JSON.stringify(currentCanvases)), // Deep copy
                    activeCanvasId: activeCanvasId,
                  }
                : layout
            );
            set({ savedStudioLayouts: updatedLayouts });
          } else {
            // No active user-named preset, use or create the "(auto)" preset
            let autoPreset = savedStudioLayouts.find(layout => layout.name === autoSavePresetName);
            if (autoPreset) {
              // Update existing "(auto)" preset
              const updatedAutoPreset = {
                ...autoPreset,
                canvases: JSON.parse(JSON.stringify(currentCanvases)),
                activeCanvasId: activeCanvasId,
              };
              const updatedLayouts = savedStudioLayouts.map(layout =>
                layout.id === autoPreset!.id ? updatedAutoPreset : layout
              );
              set({ savedStudioLayouts: updatedLayouts, activeStudioLayoutId: autoPreset.id }); // Set it as active
            } else {
              // Create new "(auto)" preset
              const newAutoLayoutId = `studiolayout-auto-${Date.now()}`;
              const newAutoLayoutPreset: SavedStudioLayout = {
                id: newAutoLayoutId,
                name: autoSavePresetName,
                canvases: JSON.parse(JSON.stringify(currentCanvases)),
                activeCanvasId: activeCanvasId,
              };
              set({
                savedStudioLayouts: [...savedStudioLayouts, newAutoLayoutPreset],
                activeStudioLayoutId: newAutoLayoutId, // Set it as active
              });
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
            // hostFlag and guestFlag removed from partialize
            currentCanvases: state.currentCanvases,
            activeCanvasId: state.activeCanvasId,
            savedStudioLayouts: state.savedStudioLayouts,
            selectedElementId: state.selectedElementId,
            activeStudioLayoutId: state.activeStudioLayoutId,
            layoutLastUpdated: state.layoutLastUpdated,
        }),
        storage: customLocalStorageWithBroadcast, // <-- Add this line
        onRehydrateStorage: (state, error) => {
          if (error) {
            console.error('LOGAOEINFO: [draftStore] Error during rehydration:', error);
          } else {
            // state here is the full state after hydration
            // We need to ensure state is not undefined before accessing its properties
            if (state) {
              console.debug('LOGAOEINFO: [draftStore] Rehydration finished. Current store state:', { // Changed to debug
                savedPresetsCount: state.savedPresets?.length ?? 'undefined',
                activePresetId: state.activePresetId,
                savedStudioLayoutsCount: state.savedStudioLayouts?.length ?? 'undefined',
                // For brevity, don't log the full arrays here if they can be large,
                // but let's log them for now for debugging.
                // savedPresets: state.savedPresets, // Commented out for brevity
                // savedStudioLayouts: state.savedStudioLayouts // Commented out for brevity
              });
            } else {
              console.debug('LOGAOEINFO: [draftStore] Rehydration finished, but state is undefined (no persisted state found or an issue occurred before this log).'); // Changed to debug
            }
          }
        },
        merge: (persistedStateFromStorage: any, currentState: CombinedDraftState): CombinedDraftState => {
          // console.debug('LOGAOEINFO: [draftStore Merge] Merge function called.'); // Changed to debug
          // console.debug('LOGAOEINFO: [draftStore Merge] Raw persistedStateFromStorage received:', persistedStateFromStorage); // Changed to debug
          // console.debug('LOGAOEINFO: [draftStore Merge] currentState (initial state or current in-memory state):', { // Changed to debug
          //   savedPresetsCount: currentState.savedPresets?.length,
          //   savedStudioLayoutsCount: currentState.savedStudioLayouts?.length
          //   // Do not log full currentState arrays to keep logs cleaner unless necessary
          // });

          let actualPersistedState: Partial<CombinedDraftState> | undefined | null;
          // Check if persistedStateFromStorage is the wrapper object { state: ..., version: ... }
          // Also check if persistedStateFromStorage itself is populated
          if (persistedStateFromStorage &&
              typeof persistedStateFromStorage === 'object' &&
              persistedStateFromStorage.hasOwnProperty('state') &&
              persistedStateFromStorage.hasOwnProperty('version')) {
            actualPersistedState = persistedStateFromStorage.state as Partial<CombinedDraftState>;
            // console.debug('LOGAOEINFO: [draftStore Merge] Detected wrapper object. Using persistedStateFromStorage.state for merge.'); // Changed to debug
          } else {
            actualPersistedState = persistedStateFromStorage as Partial<CombinedDraftState>;
            // console.debug('LOGAOEINFO: [draftStore Merge] Did not detect wrapper object, using persistedStateFromStorage directly for merge.'); // Changed to debug
          }

          // Now, actualPersistedState holds what we believe is the true persisted application state.
          // Check if it's valid before proceeding with the merge.
          if (typeof actualPersistedState !== 'object' || actualPersistedState === null) {
            console.warn('LOGAOEINFO: [draftStore Merge] actualPersistedState is not a valid object or is null after potential unwrap. Returning currentState.', actualPersistedState);
            return currentState;
          }

          // Log details of the state that will actually be merged
          // console.debug('LOGAOEINFO: [draftStore Merge] actualPersistedState.savedPresets (to be merged):', actualPersistedState.savedPresets?.length, actualPersistedState.savedPresets); // Changed to debug
          // console.debug('LOGAOEINFO: [draftStore Merge] actualPersistedState.savedStudioLayouts (to be merged):', actualPersistedState.savedStudioLayouts?.length, actualPersistedState.savedStudioLayouts); // Changed to debug

          // Perform the merge
          // The `actualPersistedState` should be a partial state containing only what was persisted.
          const mergedState = { ...currentState, ...actualPersistedState };

          // Log details of the final merged state for the arrays of interest
          // console.debug('LOGAOEINFO: [draftStore Merge] mergedState.savedPresets after merge:', mergedState.savedPresets?.length, mergedState.savedPresets); // Changed to debug
          // console.debug('LOGAOEINFO: [draftStore Merge] mergedState.savedStudioLayouts after merge:', mergedState.savedStudioLayouts?.length, mergedState.savedStudioLayouts); // Changed to debug

          return mergedState;
        },
        deserialize: (str: string) => {
          // console.debug('LOGAOEINFO: [draftStore Deserialize] Received string to deserialize:', str); // Changed to debug
          if (str === null || str === undefined || typeof str !== 'string') {
            console.warn('LOGAOEINFO: [draftStore Deserialize] Received null, undefined, or non-string value. Returning undefined.', str);
            // Persist middleware expects deserialized state or undefined if it cannot be parsed.
            // If str is null (e.g. storage empty), JSON.parse(null) would error.
            // Returning undefined is a common way to signal no persisted state.
            return undefined;
          }
          try {
            const parsedState = JSON.parse(str);
            // console.debug('LOGAOEINFO: [draftStore Deserialize] Successfully parsed string to object:', parsedState); // Changed to debug
            return parsedState;
          } catch (error) {
            console.error('LOGAOEINFO: [draftStore Deserialize] Error parsing string:', error, 'String was:', str);
            // If parsing fails, return undefined so merge function can handle it (e.g. by using currentState)
            return undefined;
          }
        },
      }
    )
  )
);

let currentSocket: Socket | null = null; // Updated type

// @ts-ignore
useDraftStore.subscribe(
  // @ts-ignore
  (state, prevState) => {
    // console.log('Global state change detected in draftStore:', state);

    // Check if the activeStudioLayoutId has changed from a non-null value to null
    if (prevState.activeStudioLayoutId && !state.activeStudioLayoutId) {
      const autoSaveLayout = state.savedStudioLayouts.find(layout => layout.name === "(auto)");
      if (autoSaveLayout) {
        // console.log(`LOGAOEINFO: [draftStore Global Sub] activeStudioLayoutId became null. Restoring (auto) preset: ${autoSaveLayout.id}`);
        // useDraftStore.setState({ activeStudioLayoutId: autoSaveLayout.id });
        // ^ This was causing an infinite loop. The logic for auto-saving/restoring (auto)
        // should be handled within the actions that modify layouts or activeStudioLayoutId directly.
        // For now, we just log. A more sophisticated approach might be needed if direct state manipulation here is truly required.
      }
    }

    // Broadcast specific state changes to other tabs/windows.
    // This is a simplified example. You might want to be more specific about what changes trigger a broadcast.
    // if (state.layoutLastUpdated !== prevState.layoutLastUpdated) {
    //   customLocalStorageWithBroadcast.setItem('aoe2-draft-overlay-combined-storage-v1', JSON.stringify(useDraftStore.getState()));
    // }
  }
);


export default useDraftStore;
