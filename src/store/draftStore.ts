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
  StudioCanvas
} from '../types/draft';

import { customLocalStorageWithBroadcast } from './customStorage';

const DRAFT_DATA_API_BASE_URL = 'https://aoe2cm.net/api';
const DRAFT_WEBSOCKET_URL_PLACEHOLDER = 'wss://aoe2cm.net';

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

  addStudioElement: (elementType: string) => void;
  updateStudioElementPosition: (elementId: string, position: { x: number, y: number }) => void;
  updateStudioElementSize: (elementId: string, size: { width: number, height: number }) => void;
  setSelectedElementId: (elementId: string | null) => void;
  updateStudioElementSettings: (elementId: string, settings: Partial<StudioElement>) => void;
  removeStudioElement: (elementId: string) => void;

  saveCurrentStudioLayout: (name: string) => void;
  loadStudioLayout: (layoutId: string) => void;
  deleteStudioLayout: (layoutId: string) => void;
  updateStudioLayoutName: (layoutId: string, newName: string) => void;

  setHostColor: (color: string | null) => void;
  setGuestColor: (color: string | null) => void;

  setHostFlag: (flag: string | null) => void;
  setGuestFlag: (flag: string | null) => void;

  setActiveCanvas: (canvasId: string) => void;
  addCanvas: (name?: string) => void;
  removeCanvas: (canvasId: string) => void;
  updateCanvasName: (canvasId: string, newName: string) => void;
  setActiveStudioLayoutId: (layoutId: string | null) => void;

  connectToWebSocket: (draftId: string, draftType: 'civ' | 'map') => void;
  disconnectWebSocket: () => void;
  // handleWebSocketMessage removed
}

const initialScores = { host: 0, guest: 0 };
const initialPlayerNameHost = 'Player 1';
const initialPlayerNameGuest = 'Player 2';

const initialDefaultCanvasId = `default-${Date.now()}`;
const initialCanvases: StudioCanvas[] = [{ id: initialDefaultCanvasId, name: 'Default', layout: [] }];

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
  draftIsLikelyFinished: false,
  savedPresets: [], activePresetId: null, boxSeriesFormat: null, boxSeriesGames: [],
  currentCanvases: initialCanvases,
  activeCanvasId: initialDefaultCanvasId,
  savedStudioLayouts: [],
  selectedElementId: null,
  activeStudioLayoutId: null,
  layoutLastUpdated: null,
  hostColor: null,
  guestColor: null,
  hostFlag: null,
  guestFlag: null,
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
        if (executingPlayer === 'HOST') { if (!output.civPicksHost) output.civPicksHost = []; if (!output.civPicksHost.includes(optionName)) output.civPicksHost.push(optionName); }
        else if (executingPlayer === 'GUEST') { if (!output.civPicksGuest) output.civPicksGuest = []; if (!output.civPicksGuest.includes(optionName)) output.civPicksGuest.push(optionName); }
      } else if (isMapAction && draftType === 'map') {
        if (executingPlayer === 'HOST') { if (!output.mapPicksHost) output.mapPicksHost = []; if (!output.mapPicksHost.includes(optionName)) output.mapPicksHost.push(optionName); }
        else if (executingPlayer === 'GUEST') { if (!output.mapPicksGuest) output.mapPicksGuest = []; if (!output.mapPicksGuest.includes(optionName)) output.mapPicksGuest.push(optionName); }
        else if (executingPlayer === 'NONE') { if (!output.mapPicksGlobal) output.mapPicksGlobal = []; if (!output.mapPicksGlobal.includes(optionName)) output.mapPicksGlobal.push(optionName); }
      }
    } else if (action === 'ban') {
      if (isCivAction && draftType === 'civ') {
        if (executingPlayer === 'HOST') { if (!output.civBansHost) output.civBansHost = []; if (!output.civBansHost.includes(optionName)) output.civBansHost.push(optionName); }
        else if (executingPlayer === 'GUEST') { if (!output.civBansGuest) output.civBansGuest = []; if (!output.civBansGuest.includes(optionName)) output.civBansGuest.push(optionName); }
      } else if (isMapAction && draftType === 'map') {
        if (executingPlayer === 'HOST') { if (!output.mapBansHost) output.mapBansHost = []; if (!output.mapBansHost.includes(optionName)) output.mapBansHost.push(optionName); }
        else if (executingPlayer === 'GUEST') { if (!output.mapBansGuest) output.mapBansGuest = []; if (!output.mapBansGuest.includes(optionName)) output.mapBansGuest.push(optionName); }
        else if (executingPlayer === 'NONE') { if (!output.mapBansGlobal) output.mapBansGlobal = []; if (!output.mapBansGlobal.includes(optionName)) output.mapBansGlobal.push(optionName); }
      }
    } else if (action === 'snipe') {
      if (isCivAction && draftType === 'civ') {
        if (executingPlayer === 'HOST') { if (!output.civBansGuest) output.civBansGuest = []; if (!output.civBansGuest.includes(optionName)) output.civBansGuest.push(optionName); }
        else if (executingPlayer === 'GUEST') { if (!output.civBansHost) output.civBansHost = []; if (!output.civBansHost.includes(optionName)) output.civBansHost.push(optionName); }
      } else if (isMapAction && draftType === 'map') {
        if (executingPlayer === 'HOST') { if (!output.mapBansGuest) output.mapBansGuest = []; if (!output.mapBansGuest.includes(optionName)) output.mapBansGuest.push(optionName); }
        else if (executingPlayer === 'GUEST') { if (!output.mapBansHost) output.mapBansHost = []; if (!output.mapBansHost.includes(optionName)) output.mapBansHost.push(optionName); }
      }
    }
  });
  if (draftType === 'map' && raw.preset?.draftOptions) {
    const allMapOptions = raw.preset.draftOptions.filter(opt => !opt.id.startsWith('aoe4.')).map(opt => getOptionNameById(opt.id));
    const pickedOrBannedMaps = new Set<string>([...(output.mapPicksHost || []), ...(output.mapPicksGuest || []), ...(output.mapPicksGlobal || []), ...(output.mapBansHost || []), ...(output.mapBansGuest || []), ...(output.mapBansGlobal || []),]);
    const remainingMaps: string[] = allMapOptions.filter(mapName => !pickedOrBannedMaps.has(mapName));
    if (remainingMaps.length === 1) { if (!output.mapPicksGlobal) output.mapPicksGlobal = []; if (!output.mapPicksGlobal.includes(remainingMaps[0])) output.mapPicksGlobal.push(remainingMaps[0]); }
  }
  let currentTurnPlayerDisplay: string | undefined = 'none'; let currentActionDisplay: string | undefined = 'unknown'; let draftStatus: SingleDraftData['status'] = 'unknown'; if (raw.preset?.turns && typeof raw.nextAction === 'number') { if (raw.nextAction >= raw.preset.turns.length) draftStatus = 'completed'; else { draftStatus = 'inProgress'; const currentTurnInfo = raw.preset.turns[raw.nextAction]; if (currentTurnInfo) { currentTurnPlayerDisplay = currentTurnInfo.player === 'HOST' ? hostName : currentTurnInfo.player === 'GUEST' ? guestName : 'None'; currentActionDisplay = currentTurnInfo.action?.toUpperCase().replace('G', ''); } } } else if (raw.status) draftStatus = raw.status.toLowerCase() as SingleDraftData['status']; else if (raw.ongoing === false) draftStatus = 'completed'; else if (raw.ongoing === true) draftStatus = 'inProgress';
  output.status = draftStatus; output.currentTurnPlayer = currentTurnPlayerDisplay; output.currentAction = currentActionDisplay; return output;
};

const getOptionNameFromStore = (optionId: string, draftOptions: Aoe2cmRawDraftData['preset']['draftOptions'] | undefined): string => {
  if (!draftOptions) return optionId;
  const option = draftOptions.find(opt => opt.id === optionId);
  if (option?.name) return option.name.startsWith('aoe4.') ? option.name.substring(5) : option.name;
  return optionId.startsWith('aoe4.') ? optionId.substring(5) : optionId;
};

let currentSocket: Socket | null = null;

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

            currentSocket = io(DRAFT_WEBSOCKET_URL_PLACEHOLDER, {
              path: '/socket.io/',
              query: { draftId: draftId, EIO: '4' },
              transports: ['websocket'],
              reconnection: false,
            });

            currentSocket.on('connect', () => {
              console.log(`Socket.IO connected for draft ${draftId}, type ${draftType}. Socket ID: ${currentSocket?.id}`);
              const currentStoreDraftId = get()[draftType === 'civ' ? 'civDraftId' : 'mapDraftId'];
              if (get().socketDraftType === draftType && currentStoreDraftId === draftId) {
                set({ socketStatus: 'live', socketError: null });

                if (currentSocket) {
                  currentSocket.off('playerEvent');
                  currentSocket.off('countdown');
                  currentSocket.off('draft_update');
                  currentSocket.off('adminEvent');
                  currentSocket.off('draft_finished');

                  currentSocket.on('playerEvent', (payload) => {
                    console.log('Socket.IO "playerEvent" event received:', payload);
                    if (!payload || !Array.isArray(payload) || payload.length === 0 || !payload[0] || typeof payload[0] !== 'object') {
                      console.warn('Received "playerEvent" with invalid payload structure:', payload); return;
                    }
                    const eventPayload = payload[0];
                    if (!eventPayload.actionType || eventPayload.chosenOptionId === undefined) {
                      console.warn('Received "playerEvent" with missing actionType or chosenOptionId property in event data:', eventPayload); return;
                    }
                    const { executingPlayer, chosenOptionId, actionType } = eventPayload;
                    let optionName: string;
                    const currentDraftOptions = get().aoe2cmRawDraftOptions;
                    const currentSocketDraftType = get().socketDraftType;
                    if (actionType === 'ban' && chosenOptionId === "HIDDEN_BAN") { optionName = "Hidden Ban"; }
                    else if (typeof chosenOptionId === 'string' && chosenOptionId.length > 0) { optionName = getOptionNameFromStore(chosenOptionId, currentDraftOptions); }
                    else if (chosenOptionId === "") { optionName = ""; }
                    else { console.warn('Received "playerEvent" event with invalid chosenOptionId:', chosenOptionId, "Payload:", eventPayload); return; }

                    let effectiveDraftType: 'civ' | 'map' | null = null;
                    if (chosenOptionId === "HIDDEN_BAN") { effectiveDraftType = currentSocketDraftType; }
                    else if (typeof chosenOptionId === 'string' && chosenOptionId.startsWith('aoe4.')) { effectiveDraftType = 'civ'; }
                    else if (typeof chosenOptionId === 'string' && chosenOptionId.length > 0) { effectiveDraftType = 'map'; }
                    else if (chosenOptionId === "" && currentSocketDraftType) { effectiveDraftType = currentSocketDraftType; }

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
                      if (chosenOptionId === "HIDDEN_BAN") { console.warn(`Could not determine type (civ/map) for HIDDEN_BAN via playerEvent. socketDraftType: ${currentSocketDraftType}. Event not applied.`); }
                      else { console.warn(`Could not determine type (civ/map) for playerEvent with chosenOptionId: ${chosenOptionId}. Event not applied. socketDraftType: ${currentSocketDraftType}`); }
                    }
                    get()._updateActivePresetIfNeeded();
                  });

                  currentSocket.on('countdown', (countdownPayload) => {
                    console.log('Socket.IO "countdown" event received:', countdownPayload);
                    if (countdownPayload && typeof countdownPayload === 'object' && countdownPayload.hasOwnProperty('value')) {
                      // set({ currentCountdownValue: countdownPayload.value, currentCountdownDisplay: countdownPayload.display });
                    } else { console.warn('Received "countdown" event with invalid payload:', countdownPayload); }
                  });

                  currentSocket.onAny((eventName, ...args) => { console.log('Socket.IO [DEBUG] event received:', eventName, args); });

                  currentSocket.on('draft_update', (payload) => {
                    console.log('Socket.IO "draft_update" event received:', payload);
                    if (!payload || !Array.isArray(payload) || payload.length === 0 || !payload[0] || typeof payload[0] !== 'object') {
                      console.warn('Invalid payload received for draft_update:', payload); return;
                    }
                    const data = payload[0];
                    let stateChanged = false;
                    if (typeof data.nameHost === 'string' && get().hostName !== data.nameHost) { set({ hostName: data.nameHost }); stateChanged = true; }
                    if (typeof data.nameGuest === 'string' && get().guestName !== data.nameGuest) { set({ guestName: data.nameGuest }); stateChanged = true; }
                    if (data.preset && data.preset.draftOptions && Array.isArray(data.preset.draftOptions)) {
                      set({ aoe2cmRawDraftOptions: data.preset.draftOptions }); stateChanged = true;
                    }
                    if (data.events && Array.isArray(data.events)) {
                      const currentDraftOptions = get().aoe2cmRawDraftOptions;
                      const currentSocketDraftType = get().socketDraftType;
                      data.events.forEach(event => {
                        if (!event || typeof event !== 'object' || !event.actionType || event.chosenOptionId === undefined) {
                          console.warn('Skipping invalid event in draft_update processing:', event); return;
                        }
                        const { executingPlayer, chosenOptionId, actionType } = event;
                        let optionName: string;
                        if (actionType === 'ban' && chosenOptionId === "HIDDEN_BAN") { optionName = "Hidden Ban"; }
                        else if (typeof chosenOptionId === 'string') { optionName = getOptionNameFromStore(chosenOptionId, currentDraftOptions); }
                        else { console.warn('Invalid chosenOptionId in draft_update event:', chosenOptionId, "Event:", event); return; }
                        let effectiveDraftType: 'civ' | 'map' | null = null;
                        if (chosenOptionId === "HIDDEN_BAN") { effectiveDraftType = currentSocketDraftType; }
                        else if (typeof chosenOptionId === 'string' && chosenOptionId.startsWith('aoe4.')) { effectiveDraftType = 'civ'; }
                        else if (typeof chosenOptionId === 'string') { effectiveDraftType = 'map'; }

                        let listModifiedInThisEvent = false;
                        if (effectiveDraftType === 'civ') {
                          if (actionType === 'pick') {
                            if (executingPlayer === 'HOST') set(state => ({ civPicksHost: [...new Set([...state.civPicksHost, optionName])] }));
                            else if (executingPlayer === 'GUEST') set(state => ({ civPicksGuest: [...new Set([...state.civPicksGuest, optionName])] }));
                            listModifiedInThisEvent = true;
                          } else if (actionType === 'ban') {
                            if (executingPlayer === 'HOST') set(state => ({ civBansHost: [...new Set([...state.civBansHost, optionName])] }));
                            else if (executingPlayer === 'GUEST') set(state => ({ civBansGuest: [...new Set([...state.civBansGuest, optionName])] }));
                            listModifiedInThisEvent = true;
                          } else if (actionType === 'snipe') {
                            if (executingPlayer === 'HOST') set(state => ({ civBansGuest: [...new Set([...state.civBansGuest, optionName])] }));
                            else if (executingPlayer === 'GUEST') set(state => ({ civBansHost: [...new Set([...state.civBansHost, optionName])] }));
                            listModifiedInThisEvent = true;
                          }
                        } else if (effectiveDraftType === 'map') {
                          if (actionType === 'pick') {
                            if (executingPlayer === 'HOST') set(state => ({ mapPicksHost: [...new Set([...state.mapPicksHost, optionName])] }));
                            else if (executingPlayer === 'GUEST') set(state => ({ mapPicksGuest: [...new Set([...state.mapPicksGuest, optionName])] }));
                            else if (executingPlayer === 'NONE') set(state => ({ mapPicksGlobal: [...new Set([...state.mapPicksGlobal, optionName])] }));
                            listModifiedInThisEvent = true;
                          } else if (actionType === 'ban') {
                            if (executingPlayer === 'HOST') set(state => ({ mapBansHost: [...new Set([...state.mapBansHost, optionName])] }));
                            else if (executingPlayer === 'GUEST') set(state => ({ mapBansGuest: [...new Set([...state.mapBansGuest, optionName])] }));
                            else if (executingPlayer === 'NONE') set(state => ({ mapBansGlobal: [...new Set([...state.mapBansGlobal, optionName])] }));
                            listModifiedInThisEvent = true;
                          } else if (actionType === 'snipe') {
                            if (executingPlayer === 'HOST') set(state => ({ mapBansGuest: [...new Set([...state.mapBansGuest, optionName])] }));
                            else if (executingPlayer === 'GUEST') set(state => ({ mapBansHost: [...new Set([...state.mapBansHost, optionName])] }));
                            listModifiedInThisEvent = true;
                          }
                        } else { console.warn(`draft_state: Could not determine type for event processing. chosenOptionId: ${chosenOptionId}, socketDraftType: ${currentSocketDraftType}`); }
                        if(listModifiedInThisEvent) stateChanged = true;
                      });
                    }
                    if (stateChanged) { get()._updateActivePresetIfNeeded(); }
                  });

                  currentSocket.on('adminEvent', (data) => {
                    console.log('Socket.IO "adminEvent" received:', data);
                    if (data && data.action === "REVEAL_BANS" && data.events && Array.isArray(data.events)) {
                      console.log('Processing REVEAL_BANS event:', data.events);
                      let stateChanged = false;
                      const currentDraftOptions = get().aoe2cmRawDraftOptions;
                      const currentSocketDraftType = get().socketDraftType;
                      data.events.forEach(revealedBanEvent => {
                        if (!revealedBanEvent || typeof revealedBanEvent !== 'object' || !revealedBanEvent.actionType || revealedBanEvent.actionType !== 'ban' || revealedBanEvent.chosenOptionId === undefined || revealedBanEvent.chosenOptionId === "HIDDEN_BAN") {
                          console.warn('Skipping invalid or already hidden ban event in REVEAL_BANS:', revealedBanEvent); return;
                        }
                        const { executingPlayer, chosenOptionId } = revealedBanEvent;
                        const optionName = getOptionNameFromStore(chosenOptionId, currentDraftOptions);
                        let effectiveDraftType: 'civ' | 'map' | null = null;
                        if (typeof chosenOptionId === 'string' && chosenOptionId.startsWith('aoe4.')) { effectiveDraftType = 'civ'; }
                        else if (typeof chosenOptionId === 'string') { effectiveDraftType = 'map'; }
                        else { effectiveDraftType = currentSocketDraftType; }
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
                          } else { console.warn(`REVEAL_BANS: "Hidden Ban" placeholder not found in ${targetBanListKey} for revealed ban:`, revealedBanEvent, `List was:`, currentBanList); }
                        } else { console.warn(`REVEAL_BANS: Could not determine target ban list for event:`, revealedBanEvent, `EffectiveDraftType: ${effectiveDraftType}`); }
                      });
                      if (stateChanged) { get()._updateActivePresetIfNeeded(); }
                    }
                  });

                  currentSocket.on('draft_finished', (data) => {
                    console.log('Socket.IO "draft_finished" event received:', data);
                    set({ draftIsLikelyFinished: true });
                  });

                  // // console.log(`Socket.IO emitting 'join_draft' for draftId: ${draftId}`);
                  // // currentSocket.emit('join_draft', { draftId: draftId });
                  // // console.log(`Socket.IO emitting 'player_ready' for draftId: ${draftId} as OBSERVER`);
                  // // currentSocket.emit('player_ready', {
                  // //   draftId: draftId,
                  // //   playerType: 'OBSERVER'
                  // // });
                  // Developer Note: Experimental emits for 'join_draft' and 'player_ready' are currently
                  // commented out to test if 'draft_state' and 'playerEvent' listeners are sufficient.
                }
              } else {
                console.warn("Socket.IO connected, but draft context in store changed or this is an old socket. Disconnecting this socket. Store Draft ID:", currentStoreDraftId, "Socket Draft ID in query:", currentSocket?.io.opts.query?.draftId);
                currentSocket?.disconnect();
              }
            });

            currentSocket.on('connect_error', (err) => {
