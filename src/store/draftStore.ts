import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import axios from 'axios';

import {
  CombinedDraftState,
  ConnectionStatus,
  Aoe2cmRawDraftData,
  SingleDraftData,
  SavedPreset,
} from '../types/draft';

const DRAFT_DATA_API_BASE_URL = 'https://aoe2cm.net/api';

interface DraftStore extends CombinedDraftState {
  connectToDraft: (draftIdOrUrl: string, draftType: 'civ' | 'map') => Promise<boolean>;
  disconnectDraft: (draftType: 'civ' | 'map') => void;
  reconnectDraft: (draftType: 'civ' | 'map') => Promise<boolean>;
  extractDraftIdFromUrl: (url: string) => string | null;

  setHostName: (name: string) => void;
  setGuestName: (name: string) => void;
  incrementScore: (player: 'host' | 'guest') => void;
  decrementScore: (player: 'host' | 'guest') => void;
  // swapScores, swapCivPlayers, swapMapPlayers removed as UI was removed

  saveCurrentAsPreset: (name?: string) => void;
  loadPreset: (presetId: string) => Promise<void>;
  deletePreset: (presetId: string) => void;
  updatePresetName: (presetId: string, newName: string) => void;

  setBoxSeriesFormat: (format: 'bo1' | 'bo3' | 'bo5' | 'bo7' | null) => void;
  updateBoxSeriesGame: (gameIndex: number, field: 'map' | 'hostCiv' | 'guestCiv', value: string | null) => void;
  setGameWinner: (gameIndex: number, winningPlayer: 'host' | 'guest' | null) => void;
  _resetCurrentSessionState: () => void;
}

const initialScores = { host: 0, guest: 0 };
const initialPlayerNameHost = 'Player 1';
const initialPlayerNameGuest = 'Player 2';

const initialCombinedState: CombinedDraftState = {
  civDraftId: null,
  mapDraftId: null,
  hostName: initialPlayerNameHost,
  guestName: initialPlayerNameGuest,
  scores: { ...initialScores },
  civPicksHost: [],
  civBansHost: [],
  civPicksGuest: [],
  civBansGuest: [],
  mapPicksHost: [],
  mapBansHost: [],
  mapPicksGuest: [],
  mapBansGuest: [],
  mapPicksGlobal: [],
  mapBansGlobal: [],
  civDraftStatus: 'disconnected',
  civDraftError: null,
  isLoadingCivDraft: false,
  mapDraftStatus: 'disconnected',
  mapDraftError: null,
  isLoadingMapDraft: false,
  savedPresets: [],
  boxSeriesFormat: null,
  boxSeriesGames: [],
  activePresetId: null,
};

const transformRawDataToSingleDraft = (
  raw: Aoe2cmRawDraftData,
  draftType: 'civ' | 'map'
): Partial<SingleDraftData> => {
  const hostName = raw.nameHost || 'Host';
  const guestName = raw.nameGuest || 'Guest';

  const output: Partial<SingleDraftData> = {
    id: raw.id || raw.draftId || 'unknown-id',
    hostName,
    guestName,
    civPicksHost: [],
    civBansHost: [],
    civPicksGuest: [],
    civBansGuest: [],
    mapPicksHost: [],
    mapBansHost: [],
    mapPicksGuest: [],
    mapBansGuest: [],
    mapPicksGlobal: [],
    mapBansGlobal: [],
  };

  const getOptionNameById = (optionId: string): string => {
    const option = raw.preset?.draftOptions?.find(opt => opt.id === optionId);
    if (option?.name) {
      return option.name.startsWith('aoe4.') ? option.name.substring(5) : option.name;
    }
    return optionId.startsWith('aoe4.') ? optionId.substring(5) : optionId;
  };

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
        if (executingPlayer === 'HOST' && !output.civPicksHost!.includes(optionName)) output.civPicksHost!.push(optionName);
        else if (executingPlayer === 'GUEST' && !output.civPicksGuest!.includes(optionName)) output.civPicksGuest!.push(optionName);
      } else if (isMapAction && draftType === 'map') {
        if (executingPlayer === 'HOST' && !output.mapPicksHost!.includes(optionName)) output.mapPicksHost!.push(optionName);
        else if (executingPlayer === 'GUEST' && !output.mapPicksGuest!.includes(optionName)) output.mapPicksGuest!.push(optionName);
      }
    } else if (action === 'ban') {
      if (isCivAction && draftType === 'civ') {
        if (executingPlayer === 'HOST' && !output.civBansHost!.includes(optionName)) output.civBansHost!.push(optionName);
        else if (executingPlayer === 'GUEST' && !output.civBansGuest!.includes(optionName)) output.civBansGuest!.push(optionName);
      } else if (isMapAction && draftType === 'map') {
        if (executingPlayer === 'HOST' && !output.mapBansHost!.includes(optionName)) output.mapBansHost!.push(optionName);
        else if (executingPlayer === 'GUEST' && !output.mapBansGuest!.includes(optionName)) output.mapBansGuest!.push(optionName);
      }
    } else if (action === 'snipe') {
         if (isCivAction && draftType === 'civ') {
            if (executingPlayer === 'HOST' && !output.civBansGuest!.includes(optionName)) output.civBansGuest!.push(optionName);
            else if (executingPlayer === 'GUEST' && !output.civBansHost!.includes(optionName)) output.civBansHost!.push(optionName);
        } else if (isMapAction && draftType === 'map') {
            if (executingPlayer === 'HOST' && !output.mapBansGuest!.includes(optionName)) output.mapBansGuest!.push(optionName);
            else if (executingPlayer === 'GUEST' && !output.mapBansHost!.includes(optionName)) output.mapBansHost!.push(optionName);
        }
    }
  });
  
  let currentTurnPlayerDisplay: string | undefined = 'none';
  let currentActionDisplay: string | undefined = 'unknown';
  let draftStatus: SingleDraftData['status'] = 'unknown';

  if (raw.preset?.turns && typeof raw.nextAction === 'number') {
    if (raw.nextAction >= raw.preset.turns.length) {
      draftStatus = 'completed';
    } else {
      draftStatus = 'inProgress';
      const currentTurnInfo = raw.preset.turns[raw.nextAction];
      if (currentTurnInfo) {
          currentTurnPlayerDisplay = currentTurnInfo.player === 'HOST' ? hostName : currentTurnInfo.player === 'GUEST' ? guestName : 'None';
          currentActionDisplay = currentTurnInfo.action?.toUpperCase().replace('G', '');
      }
    }
  } else if (raw.status) {
    draftStatus = raw.status.toLowerCase() as SingleDraftData['status'];
  } else if (raw.ongoing === false) {
    draftStatus = 'completed';
  } else if (raw.ongoing === true) {
    draftStatus = 'inProgress';
  }

  output.status = draftStatus;
  output.currentTurnPlayer = currentTurnPlayerDisplay;
  output.currentAction = currentActionDisplay;

  return output;
};


const useDraftStore = create<DraftStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialCombinedState,

        _resetCurrentSessionState: () => {
          set({
            ...initialCombinedState, // Reset to all initial values
            savedPresets: get().savedPresets, // Keep saved presets
          });
        },

        extractDraftIdFromUrl: (url: string) => {
          try {
            if (url.startsWith('http://') || url.startsWith('https://')) {
              const urlObj = new URL(url);
              if (urlObj.hostname.includes('aoe2cm.net')) { 
                const pathMatch = /\/draft\/([a-zA-Z0-9]+)/.exec(urlObj.pathname);
                if (pathMatch && pathMatch[1]) return pathMatch[1];
                const observerPathMatch = /\/observer\/([a-zA-Z0-9]+)/.exec(urlObj.pathname);
                if (observerPathMatch && observerPathMatch[1]) return observerPathMatch[1];
              }
              const pathSegments = urlObj.pathname.split('/');
              const potentialId = pathSegments.pop() || pathSegments.pop(); 
              if (potentialId && /^[a-zA-Z0-9_-]+$/.test(potentialId) && potentialId.length > 3) {
                return potentialId;
              }
             const draftIdParam = urlObj.searchParams.get('draftId') || urlObj.searchParams.get('id');
             if (draftIdParam) return draftIdParam;
            }
            if (/^[a-zA-Z0-9_-]+$/.test(url) && url.length > 3) {
              return url;
            }
            return null;
          } catch (error) {
            if (/^[a-zA-Z0-9_-]+$/.test(url) && url.length > 3) {
              return url;
            }
            return null;
          }
        },

        connectToDraft: async (draftIdOrUrl: string, draftType: 'civ' | 'map') => {
          if (draftType === 'civ') {
            set({ isLoadingCivDraft: true, civDraftStatus: 'connecting', civDraftError: null });
          } else {
            set({ isLoadingMapDraft: true, mapDraftStatus: 'connecting', mapDraftError: null });
          }

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

          let shouldClearActivePreset = true;
          if (activePreset) {
            if ((draftType === 'civ' && activePreset.civDraftId === extractedId) ||
                (draftType === 'map' && activePreset.mapDraftId === extractedId)) {
              // Loading an ID that matches the active preset, so don't clear activePresetId yet
              shouldClearActivePreset = false;
            }
          }
          if(shouldClearActivePreset) {
            set({ activePresetId: null });
          }
          
          if (draftType === 'civ') set({ civDraftId: extractedId });
          else set({ mapDraftId: extractedId });
          
          const apiUrl = `${DRAFT_DATA_API_BASE_URL}/draft/${extractedId}`;
          
          try {
            console.log(`Attempting to fetch ${draftType} draft data from: ${apiUrl}`);
            const response = await axios.get<Aoe2cmRawDraftData>(apiUrl); 
            console.log(`Raw response for ${draftType} draft from API:`, response.data);

            if (!response.data || typeof response.data !== 'object') {
              throw new Error('Received invalid or empty data structure from the API.');
            }
            
            const rawDraftData = response.data;
            if (!rawDraftData.preset || !rawDraftData.preset.draftOptions) {
              console.error('Preset data or draftOptions missing in API response:', rawDraftData);
              throw new Error('Preset data or draftOptions missing in API response.');
            }
            
            const processedData = transformRawDataToSingleDraft(rawDraftData, draftType);
            
            const presetName = rawDraftData.preset.name?.toLowerCase() || '';
            let detectedFormat: 'bo1' | 'bo3' | 'bo5' | 'bo7' | null = get().boxSeriesFormat; 
            if (!detectedFormat) { 
                if (presetName.includes('bo1')) detectedFormat = 'bo1';
                else if (presetName.includes('bo3')) detectedFormat = 'bo3';
                else if (presetName.includes('bo5')) detectedFormat = 'bo5';
                else if (presetName.includes('bo7')) detectedFormat = 'bo7';
            }

            if (detectedFormat && get().boxSeriesFormat !== detectedFormat) {
              get().setBoxSeriesFormat(detectedFormat); 
              console.log(`Auto-detected and set BoX format: ${detectedFormat} from preset name: "${rawDraftData.preset.name}"`);
            }
            
            if (draftType === 'civ') {
              set(state => ({
                hostName: processedData.hostName || state.hostName,
                guestName: processedData.guestName || state.guestName,
                civPicksHost: processedData.civPicksHost || [],
                civBansHost: processedData.civBansHost || [],
                civPicksGuest: processedData.civPicksGuest || [],
                civBansGuest: processedData.civBansGuest || [],
                civDraftStatus: 'connected',
                isLoadingCivDraft: false,
                civDraftError: null,
                boxSeriesGames: state.boxSeriesFormat ? 
                  state.boxSeriesGames.map((game, index) => ({
                    ...game,
                    hostCiv: processedData.civPicksHost?.[index] || game.hostCiv || null, 
                    guestCiv: processedData.civPicksGuest?.[index] || game.guestCiv || null,
                  })) 
                  : [],
              }));
            } else { 
              set(state => {
                const combinedMapPicks = Array.from(new Set([
                  ...(processedData.mapPicksHost || []),
                  ...(processedData.mapPicksGuest || []),
                  ...(processedData.mapPicksGlobal || [])
                ]));

                return {
                  hostName: state.hostName === initialPlayerNameHost ? (processedData.hostName || state.hostName) : state.hostName,
                  guestName: state.guestName === initialPlayerNameGuest ? (processedData.guestName || state.guestName) : state.guestName,
                  mapPicksHost: processedData.mapPicksHost || [],
                  mapBansHost: processedData.mapBansHost || [],
                  mapPicksGuest: processedData.mapPicksGuest || [],
                  mapBansGuest: processedData.mapBansGuest || [],
                  mapPicksGlobal: processedData.mapPicksGlobal || [],
                  mapBansGlobal: processedData.mapBansGlobal || [],
                  mapDraftStatus: 'connected',
                  isLoadingMapDraft: false,
                  mapDraftError: null,
                  boxSeriesGames: state.boxSeriesFormat ?
                    state.boxSeriesGames.map((game, index) => ({
                      ...game, 
                      map: combinedMapPicks[index] || game.map || null,
                    }))
                    : [],
                };
              });
            }
            return true;

          } catch (error) {
            let errorMessage = `Failed to fetch or process ${draftType} draft data from API (${apiUrl}).`;
            if (axios.isAxiosError(error)) {
              errorMessage += ` Server responded with ${error.response?.status || 'no status'}: ${error.message}`;
              console.error(`Axios error connecting to ${draftType} API:`, error.response?.data || error.toJSON());
            } else {
              errorMessage += ` Error: ${(error as Error).message}`;
              console.error(`Error connecting to ${draftType} API:`, error);
            }
            
            if (draftType === 'civ') set({ isLoadingCivDraft: false, civDraftStatus: 'error', civDraftError: errorMessage, activePresetId: null });
            else set({ isLoadingMapDraft: false, mapDraftStatus: 'error', mapDraftError: errorMessage, activePresetId: null });
            return false;
          }
        },

        disconnectDraft: (draftType: 'civ' | 'map') => {
          if (draftType === 'civ') {
            set({
              civDraftId: null,
              civDraftStatus: 'disconnected',
              civDraftError: null,
              isLoadingCivDraft: false,
              civPicksHost: [], civBansHost: [], civPicksGuest: [], civBansGuest: [],
              hostName: get().mapDraftId ? get().hostName : initialPlayerNameHost, 
              guestName: get().mapDraftId ? get().guestName : initialPlayerNameGuest,
              boxSeriesGames: get().boxSeriesGames.map(game => ({ ...game, hostCiv: null, guestCiv: null })),
              activePresetId: null, 
            });
          } else { 
            set({
              mapDraftId: null,
              mapDraftStatus: 'disconnected',
              mapDraftError: null,
              isLoadingMapDraft: false,
              mapPicksHost: [], mapBansHost: [], mapPicksGuest: [], mapBansGuest: [],
              mapPicksGlobal: [], mapBansGlobal: [],
              boxSeriesGames: get().boxSeriesGames.map(game => ({ ...game, map: null })),
              activePresetId: null, 
            });
          }
           if (!get().civDraftId && !get().mapDraftId) { // If both are disconnected, fully reset BoX
            set({ boxSeriesFormat: null, boxSeriesGames: [], activePresetId: null });
          }
        },

        reconnectDraft: async (draftType: 'civ' | 'map') => {
          const idToReconnect = draftType === 'civ' ? get().civDraftId : get().mapDraftId;
          if (!idToReconnect) {
            const errorMsg = `No ${draftType} draft ID to reconnect to.`;
            if (draftType === 'civ') set({ civDraftError: errorMsg });
            else set({ mapDraftError: errorMsg });
            return false;
          }
          return get().connectToDraft(idToReconnect, draftType);
        },

        setHostName: (name: string) => set({ hostName: name, activePresetId: null }),
        setGuestName: (name: string) => set({ guestName: name, activePresetId: null }),
        incrementScore: (player: 'host' | 'guest') => set(state => ({
          scores: { ...state.scores, [player]: state.scores[player] + 1 },
          activePresetId: null,
        })),
        decrementScore: (player: 'host' | 'guest') => set(state => ({
          scores: { ...state.scores, [player]: Math.max(0, state.scores[player] - 1) },
          activePresetId: null,
        })),
        // swapScores, swapCivPlayers, swapMapPlayers removed
        
        saveCurrentAsPreset: (name?: string) => {
          const { civDraftId, mapDraftId, hostName, guestName, scores, savedPresets, boxSeriesFormat, boxSeriesGames } = get();
          const presetName = name || `${hostName} vs ${guestName} - ${new Date().toLocaleDateString()}`;
          
          const existingPresetIndex = savedPresets.findIndex(p => p.name === presetName);
          const presetIdToUse = existingPresetIndex !== -1 ? savedPresets[existingPresetIndex].id : Date.now().toString();
          
          const presetData: SavedPreset = {
            id: presetIdToUse,
            name: presetName,
            civDraftId,
            mapDraftId,
            hostName,
            guestName,
            scores: { ...scores },
            boxSeriesFormat,
            boxSeriesGames: JSON.parse(JSON.stringify(boxSeriesGames)), 
          };

          if (existingPresetIndex !== -1) {
            const updatedPresets = [...savedPresets];
            updatedPresets[existingPresetIndex] = presetData;
            set({ savedPresets: updatedPresets, activePresetId: presetData.id });
          } else {
            set({ savedPresets: [...savedPresets, presetData], activePresetId: presetData.id });
          }
        },
        loadPreset: async (presetId: string) => {
          const preset = get().savedPresets.find(p => p.id === presetId);
          if (preset) {
            set({ // Set activePresetId first, so connectToDraft knows this is a preset load
              activePresetId: preset.id, 
              civDraftId: preset.civDraftId,
              mapDraftId: preset.mapDraftId,
              hostName: preset.hostName,
              guestName: preset.guestName,
              scores: { ...preset.scores },
              boxSeriesFormat: preset.boxSeriesFormat,
              boxSeriesGames: JSON.parse(JSON.stringify(preset.boxSeriesGames)), 
              civDraftStatus: 'disconnected', civDraftError: null, isLoadingCivDraft: false,
              mapDraftStatus: 'disconnected', mapDraftError: null, isLoadingMapDraft: false,
              civPicksHost: [], civBansHost: [], civPicksGuest: [], civBansGuest: [],
              mapPicksHost: [], mapBansHost: [], mapPicksGuest: [], mapBansGuest: [],
              mapPicksGlobal: [], mapBansGlobal: [],
            });
            
            let civConnected = false;
            let mapConnected = false;

            if (preset.civDraftId) {
              civConnected = await get().connectToDraft(preset.civDraftId, 'civ');
            }
            if (preset.mapDraftId) {
              mapConnected = await get().connectToDraft(preset.mapDraftId, 'map');
            }
            // If any connection failed, or no IDs to connect, it's no longer pristine active preset
            if ((preset.civDraftId && !civConnected) || (preset.mapDraftId && !mapConnected) || (!preset.civDraftId && !preset.mapDraftId)) {
                 set({ activePresetId: preset.id }); // Still mark as active for UI, but it might be "dirty" if fetches change things
            } else {
                 set({ activePresetId: preset.id }); // Confirm active ID
            }
          }
        },
        deletePreset: (presetId: string) => {
          const currentActiveId = get().activePresetId;
          set(state => ({
            savedPresets: state.savedPresets.filter(p => p.id !== presetId),
          }));
          if (currentActiveId === presetId) {
            get()._resetCurrentSessionState();
          }
        },
        updatePresetName: (presetId: string, newName: string) => {
          set(state => ({
            savedPresets: state.savedPresets.map(p =>
              p.id === presetId ? { ...p, name: newName } : p
            ),
            activePresetId: state.activePresetId === presetId ? presetId : state.activePresetId,
          }));
        },

        setBoxSeriesFormat: (format) => {
          let numGames = 0;
          if (format === 'bo1') numGames = 1;
          else if (format === 'bo3') numGames = 3;
          else if (format === 'bo5') numGames = 5;
          else if (format === 'bo7') numGames = 7;
        
          let newGames = Array(numGames).fill(null).map(() => ({
            map: null,
            hostCiv: null,
            guestCiv: null,
            winner: null,
          }));

          const state = get();
          if (numGames > 0) {
            const combinedMapPicks = Array.from(new Set([
              ...state.mapPicksHost,
              ...state.mapPicksGuest,
              ...state.mapPicksGlobal,
            ])).filter(Boolean);

            newGames = newGames.map((_game, index) => ({
              map: combinedMapPicks[index] || null,
              hostCiv: state.civPicksHost[index] || null,
              guestCiv: state.civPicksGuest[index] || null,
              winner: null, 
            }));
          }
        
          set({ boxSeriesFormat: format, boxSeriesGames: newGames, activePresetId: null });
        },
        updateBoxSeriesGame: (gameIndex, field, value) => {
          set(state => {
            const newGames = [...state.boxSeriesGames];
            if (newGames[gameIndex]) {
              newGames[gameIndex] = { 
                ...newGames[gameIndex], 
                [field]: value,
                winner: null, 
              };
              return { boxSeriesGames: newGames, activePresetId: null };
            }
            return state;
          });
        },
        setGameWinner: (gameIndex: number, winningPlayer: 'host' | 'guest' | null) => {
          set(state => {
            const newGames = [...state.boxSeriesGames];
            if (newGames[gameIndex]) {
              if (newGames[gameIndex].winner === winningPlayer) { 
                newGames[gameIndex] = { ...newGames[gameIndex], winner: null };
              } else {
                newGames[gameIndex] = { ...newGames[gameIndex], winner: winningPlayer };
              }
            }

            let hostScore = 0;
            let guestScore = 0;
            newGames.forEach(game => {
              if (game.winner === 'host') hostScore++;
              else if (game.winner === 'guest') guestScore++;
            });

            return { 
              boxSeriesGames: newGames,
              scores: { host: hostScore, guest: guestScore },
              activePresetId: null,
            };
          });
        },
      }),
      {
        name: 'aoe2-draft-overlay-combined-storage-v1',
        partialize: (state) => ({
            hostName: state.hostName,
            guestName: state.guestName,
            scores: state.scores,
            savedPresets: state.savedPresets,
            civDraftId: state.civDraftId,
            mapDraftId: state.mapDraftId,
            boxSeriesFormat: state.boxSeriesFormat,
            boxSeriesGames: state.boxSeriesGames,
            activePresetId: state.activePresetId, 
        }),
      }
    )
  )
);

export default useDraftStore;
