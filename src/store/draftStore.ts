import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import axios from 'axios';

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

  // Add new action signatures for canvas management
  setActiveCanvas: (canvasId: string) => void;
  addCanvas: (name?: string) => void;
  removeCanvas: (canvasId: string) => void;
  updateCanvasName: (canvasId: string, newName: string) => void;
  setActiveStudioLayoutId: (layoutId: string | null) => void;
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
  savedPresets: [], activePresetId: null, boxSeriesFormat: null, boxSeriesGames: [],

  currentCanvases: initialCanvases,
  activeCanvasId: initialDefaultCanvasId,
  savedStudioLayouts: [],
  selectedElementId: null,
  activeStudioLayoutId: null,
  layoutLastUpdated: null,
  hostColor: null,
  guestColor: null,
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

const useDraftStore = create<DraftStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialCombinedState,
        _resetCurrentSessionState: () => {
          const newDefaultCanvasId = `default-rst-${Date.now()}`;
          const defaultCanvases: StudioCanvas[] = [{ id: newDefaultCanvasId, name: 'Default', layout: [] }];
          const currentSavedPresets = get().savedPresets;
          const currentSavedStudioLayouts = get().savedStudioLayouts;

          set({
            ...initialCombinedState,
            savedPresets: currentSavedPresets,
            savedStudioLayouts: currentSavedStudioLayouts,
            currentCanvases: defaultCanvases,
            activeCanvasId: newDefaultCanvasId,
            selectedElementId: null,
            activeStudioLayoutId: null,
            hostColor: null,
            guestColor: null,
          });
        },
        _updateActivePresetIfNeeded: () => { const { activePresetId, savedPresets, hostName, guestName, scores, civDraftId, mapDraftId, boxSeriesFormat, boxSeriesGames, hostColor, guestColor } = get(); if (activePresetId) { const presetIndex = savedPresets.findIndex(p => p.id === activePresetId); if (presetIndex !== -1) { const updatedPreset: SavedPreset = { ...savedPresets[presetIndex], hostName, guestName, scores: { ...scores }, civDraftId, mapDraftId, boxSeriesFormat, boxSeriesGames: JSON.parse(JSON.stringify(boxSeriesGames)), hostColor, guestColor }; const newSavedPresets = [...savedPresets]; newSavedPresets[presetIndex] = updatedPreset; set({ savedPresets: newSavedPresets }); } } },
        extractDraftIdFromUrl: (url: string) => { try { if (url.startsWith('http://') || url.startsWith('https://')) { const urlObj = new URL(url); if (urlObj.hostname.includes('aoe2cm.net')) { const pathMatch = /\/draft\/([a-zA-Z0-9]+)/.exec(urlObj.pathname); if (pathMatch && pathMatch[1]) return pathMatch[1]; const observerPathMatch = /\/observer\/([a-zA-Z0-9]+)/.exec(urlObj.pathname); if (observerPathMatch && observerPathMatch[1]) return observerPathMatch[1]; } const pathSegments = urlObj.pathname.split('/'); const potentialId = pathSegments.pop() || pathSegments.pop(); if (potentialId && /^[a-zA-Z0-9_-]+$/.test(potentialId) && potentialId.length > 3) return potentialId; const draftIdParam = urlObj.searchParams.get('draftId') || urlObj.searchParams.get('id'); if (draftIdParam) return draftIdParam; } if (/^[a-zA-Z0-9_-]+$/.test(url) && url.length > 3) return url; return null; } catch (error) { if (/^[a-zA-Z0-9_-]+$/.test(url) && url.length > 3) return url; return null; } },
        connectToDraft: async (draftIdOrUrl: string, draftType: 'civ' | 'map') => {
          if (draftType === 'civ') set({ isLoadingCivDraft: true, civDraftStatus: 'connecting', civDraftError: null });
          else set({ isLoadingMapDraft: true, mapDraftStatus: 'connecting', mapDraftError: null });

          const extractedId = get().extractDraftIdFromUrl(draftIdOrUrl);
          if (!extractedId) {
            const errorMsg = 'Invalid Draft ID or URL provided.';
            if (draftType === 'civ') set({ isLoadingCivDraft: false, civDraftStatus: 'error', civDraftError: errorMsg });
            else set({ isLoadingMapDraft: false, mapDraftStatus: 'error', mapDraftError: errorMsg });
            return false;
          }

          const currentActivePresetId = get().activePresetId;
          const savedPresetsArray = get().savedPresets;
          const activePreset = currentActivePresetId ? savedPresetsArray.find(p => p.id === currentActivePresetId) : null;
          if (activePreset) {
            if ((draftType === 'civ' && activePreset.civDraftId !== extractedId) || (draftType === 'map' && activePreset.mapDraftId !== extractedId)) {
              set({ activePresetId: null });
            }
          } else {
            set({ activePresetId: null });
          }

          if (draftType === 'civ') set({ civDraftId: extractedId });
          else set({ mapDraftId: extractedId });

          const apiUrl = `${DRAFT_DATA_API_BASE_URL}/draft/${extractedId}`;
          try {
            const response = await axios.get<Aoe2cmRawDraftData>(apiUrl);
            if (!response.data || typeof response.data !== 'object') throw new Error('Received invalid or empty data structure from the API.');
            const rawDraftData = response.data;
            if (!rawDraftData.preset || !rawDraftData.preset.draftOptions) throw new Error('Preset data or draftOptions missing in API response.');

            const processedData = transformRawDataToSingleDraft(rawDraftData, draftType);

            // Determine new player names
            let newHostName = get().hostName;
            let newGuestName = get().guestName;
            if (draftType === 'civ') {
              newHostName = processedData.hostName || get().hostName;
              newGuestName = processedData.guestName || get().guestName;
            } else { // map draft
              newHostName = get().hostName === initialPlayerNameHost ? (processedData.hostName || get().hostName) : get().hostName;
              newGuestName = get().guestName === initialPlayerNameGuest ? (processedData.guestName || get().guestName) : get().guestName;
            }

            // Prepare pick/ban lists from processedData
            const newCivPicksHost = draftType === 'civ' ? (processedData.civPicksHost || []) : get().civPicksHost;
            const newCivBansHost = draftType === 'civ' ? (processedData.civBansHost || []) : get().civBansHost;
            const newCivPicksGuest = draftType === 'civ' ? (processedData.civPicksGuest || []) : get().civPicksGuest;
            const newCivBansGuest = draftType === 'civ' ? (processedData.civBansGuest || []) : get().civBansGuest;

            const newMapPicksHost = draftType === 'map' ? (processedData.mapPicksHost || []) : get().mapPicksHost;
            const newMapBansHost = draftType === 'map' ? (processedData.mapBansHost || []) : get().mapBansHost;
            const newMapPicksGuest = draftType === 'map' ? (processedData.mapPicksGuest || []) : get().mapPicksGuest;
            const newMapBansGuest = draftType === 'map' ? (processedData.mapBansGuest || []) : get().mapBansGuest;
            const newMapPicksGlobal = draftType === 'map' ? (processedData.mapPicksGlobal || []) : get().mapPicksGlobal;
            const newMapBansGlobal = draftType === 'map' ? (processedData.mapBansGlobal || []) : get().mapBansGlobal;

            // ***** First (Immediate) Set Call *****
            set(state => ({
              ...state,
              hostName: newHostName,
              guestName: newGuestName,
              civPicksHost: newCivPicksHost,
              civBansHost: newCivBansHost,
              civPicksGuest: newCivPicksGuest,
              civBansGuest: newCivBansGuest,
              mapPicksHost: newMapPicksHost,
              mapBansHost: newMapBansHost,
              mapPicksGuest: newMapPicksGuest,
              mapBansGuest: newMapBansGuest,
              mapPicksGlobal: newMapPicksGlobal,
              mapBansGlobal: newMapBansGlobal,
            }));

            // Series Format Detection Logic (after initial data update)
            const presetName = rawDraftData.preset.name?.toLowerCase() || '';
            let detectedFormat: 'bo1' | 'bo3' | 'bo5' | 'bo7' | null = get().boxSeriesFormat; // Use current format as default
            // Only try to detect format if activePresetId is null (meaning not loading a saved preset)
            // AND boxSeriesFormat is not already set by the user.
            if (get().activePresetId === null && !get().boxSeriesFormat) {
              if (presetName.includes('bo1')) detectedFormat = 'bo1';
              else if (presetName.includes('bo3')) detectedFormat = 'bo3';
              else if (presetName.includes('bo5')) detectedFormat = 'bo5';
              else if (presetName.includes('bo7')) detectedFormat = 'bo7';
            }

            // If detected format is different from current, or if current is null and detected is not
            if (detectedFormat && get().boxSeriesFormat !== detectedFormat) {
              get().setBoxSeriesFormat(detectedFormat); // This will use the new pick lists from the set call above
            }

            // ***** Final Set Call for Status and boxSeriesGames Alignment *****
            set(state => {
              let finalBoxSeriesGames = state.boxSeriesGames;
              if (state.boxSeriesFormat) {
                  // Re-fetch current pick lists from state (which are now fresh)
                  const currentMapPicksH = state.mapPicksHost;
                  const currentMapPicksG = state.mapPicksGuest;
                  const currentMapPicksGl = state.mapPicksGlobal;
                  const currentCivPicksH = state.civPicksHost;
                  const currentCivPicksG = state.civPicksGuest;

                  const combinedMapPicks = Array.from(new Set([...currentMapPicksH, ...currentMapPicksG, ...currentMapPicksGl]));

                  finalBoxSeriesGames = state.boxSeriesGames.map((game, index) => ({
                      ...game,
                      map: draftType === 'map' ? (combinedMapPicks[index] !== undefined ? combinedMapPicks[index] : game.map) : game.map,
                      hostCiv: draftType === 'civ' ? (currentCivPicksH[index] !== undefined ? currentCivPicksH[index] : game.hostCiv) : game.hostCiv,
                      guestCiv: draftType === 'civ' ? (currentCivPicksG[index] !== undefined ? currentCivPicksG[index] : game.guestCiv) : game.guestCiv,
                  }));
              } else {
                  finalBoxSeriesGames = []; // No format, no games
              }

              if (draftType === 'civ') {
                return {
                  ...state,
                  civDraftStatus: 'connected',
                  isLoadingCivDraft: false,
                  civDraftError: null,
                  boxSeriesGames: finalBoxSeriesGames,
                };
              } else { // map draft
                return {
                  ...state,
                  mapDraftStatus: 'connected',
                  isLoadingMapDraft: false,
                  mapDraftError: null,
                  boxSeriesGames: finalBoxSeriesGames,
                };
              }
            });

            get()._updateActivePresetIfNeeded();
            return true;
          } catch (error) {
            let errorMessage = `Failed to fetch or process ${draftType} draft data.`;
            if (axios.isAxiosError(error)) errorMessage += ` Server: ${error.response?.status || 'N/A'}: ${error.message}`;
            else errorMessage += ` Error: ${(error as Error).message}`;
            if (draftType === 'civ') set({ isLoadingCivDraft: false, civDraftStatus: 'error', civDraftError: errorMessage, activePresetId: null });
            else set({ isLoadingMapDraft: false, mapDraftStatus: 'error', mapDraftError: errorMessage, activePresetId: null });
            return false;
          }
        },
        disconnectDraft: (draftType: 'civ' | 'map') => { if (draftType === 'civ') { set({ civDraftId: null, civDraftStatus: 'disconnected', civDraftError: null, isLoadingCivDraft: false, civPicksHost: [], civBansHost: [], civPicksGuest: [], civBansGuest: [], hostName: get().mapDraftId ? get().hostName : initialPlayerNameHost, guestName: get().mapDraftId ? get().guestName : initialPlayerNameGuest, boxSeriesGames: get().boxSeriesGames.map(game => ({ ...game, hostCiv: null, guestCiv: null })), activePresetId: null, }); } else { set({ mapDraftId: null, mapDraftStatus: 'disconnected', mapDraftError: null, isLoadingMapDraft: false, mapPicksHost: [], mapBansHost: [], mapPicksGuest: [], mapBansGuest: [], mapPicksGlobal: [], mapBansGlobal: [], boxSeriesGames: get().boxSeriesGames.map(game => ({ ...game, map: null })), activePresetId: null, }); } if (!get().civDraftId && !get().mapDraftId) set({ boxSeriesFormat: null, boxSeriesGames: [], activePresetId: null }); },
        reconnectDraft: async (draftType: 'civ' | 'map') => { const idToReconnect = draftType === 'civ' ? get().civDraftId : get().mapDraftId; if (!idToReconnect) { const errorMsg = `No ${draftType} draft ID to reconnect.`; if (draftType === 'civ') set({ civDraftError: errorMsg }); else set({ mapDraftError: errorMsg }); return false; } return get().connectToDraft(idToReconnect, draftType); },
        setHostName: (name: string) => { set({ hostName: name }); get()._updateActivePresetIfNeeded(); },
        setGuestName: (name: string) => { set({ guestName: name }); get()._updateActivePresetIfNeeded(); },
        setHostColor: (color) => set({ hostColor: color }),
        setGuestColor: (color) => set({ guestColor: color }),
        switchPlayerSides: () => {
          const {
            hostName, guestName, scores,
            civPicksHost, civBansHost, civPicksGuest, civBansGuest,
            mapPicksHost, mapBansHost, mapPicksGuest, mapBansGuest,
            boxSeriesGames, hostColor, guestColor // Added hostColor and guestColor
          } = get(); // Assuming 'get' is from Zustand store setup

          // Temporary variables to hold original values for swapping
          const tempHostColor = hostColor; // Store hostColor
          const tempGuestColor = guestColor; // Store guestColor
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
            hostColor: tempGuestColor, // Swap hostColor
            guestColor: tempHostColor, // Swap guestColor
          });
          get()._updateActivePresetIfNeeded(); // Crucial for saving to presets
        },
        incrementScore: (player: 'host' | 'guest') => { set(state => ({ scores: { ...state.scores, [player]: state.scores[player] + 1 }})); get()._updateActivePresetIfNeeded(); },
        decrementScore: (player: 'host' | 'guest') => { set(state => ({ scores: { ...state.scores, [player]: Math.max(0, state.scores[player] - 1) }})); get()._updateActivePresetIfNeeded(); },
        saveCurrentAsPreset: (name?: string) => { const { civDraftId, mapDraftId, hostName, guestName, scores, savedPresets, boxSeriesFormat, boxSeriesGames, hostColor, guestColor } = get(); const presetName = name || `${hostName} vs ${guestName} - ${new Date().toLocaleDateString()}`; const existingPresetIndex = savedPresets.findIndex(p => p.name === presetName); const presetIdToUse = existingPresetIndex !== -1 ? savedPresets[existingPresetIndex].id : Date.now().toString(); const presetData: SavedPreset = { id: presetIdToUse, name: presetName, civDraftId, mapDraftId, hostName, guestName, scores: { ...scores }, boxSeriesFormat, boxSeriesGames: JSON.parse(JSON.stringify(boxSeriesGames)), hostColor, guestColor }; if (existingPresetIndex !== -1) { const updatedPresets = [...savedPresets]; updatedPresets[existingPresetIndex] = presetData; set({ savedPresets: updatedPresets, activePresetId: presetData.id }); } else set({ savedPresets: [...savedPresets, presetData], activePresetId: presetData.id }); },
        loadPreset: async (presetId: string) => { const preset = get().savedPresets.find(p => p.id === presetId); if (preset) { set({ activePresetId: preset.id, civDraftId: preset.civDraftId, mapDraftId: preset.mapDraftId, hostName: preset.hostName, guestName: preset.guestName, scores: { ...preset.scores }, boxSeriesFormat: preset.boxSeriesFormat, boxSeriesGames: JSON.parse(JSON.stringify(preset.boxSeriesGames)), hostColor: preset.hostColor || null, guestColor: preset.guestColor || null, civDraftStatus: 'disconnected', civDraftError: null, isLoadingCivDraft: false, mapDraftStatus: 'disconnected', mapDraftError: null, isLoadingMapDraft: false, civPicksHost: [], civBansHost: [], civPicksGuest: [], civBansGuest: [], mapPicksHost: [], mapBansHost: [], mapPicksGuest: [], mapBansGuest: [], mapPicksGlobal: [], mapBansGlobal: [] }); if (preset.civDraftId) await get().connectToDraft(preset.civDraftId, 'civ'); if (preset.mapDraftId) await get().connectToDraft(preset.mapDraftId, 'map'); set({ activePresetId: preset.id }); } },
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
            hostColor: state.hostColor, // Persist hostColor
            guestColor: state.guestColor, // Persist guestColor

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

export default useDraftStore;
