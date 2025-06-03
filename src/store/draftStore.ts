import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import axios from 'axios';

import {
  CombinedDraftState,
  ConnectionStatus,
  Aoe2cmRawDraftData,
  SingleDraftData,
  // Aoe2cmRawEventData, // Part of Aoe2cmRawDraftData
  // Aoe2cmRawDraftOption, // Part of Aoe2cmRawDraftData
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
  swapScores: () => void;
  swapCivPlayers: () => void;
  swapMapPlayers: () => void;
}

const initialScores = { host: 0, guest: 0 };
const initialPlayerNameHost = 'Host';
const initialPlayerNameGuest = 'Guest';

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
};

const transformRawDataToSingleDraft = (
  raw: Aoe2cmRawDraftData,
  draftType: 'civ' | 'map'
): Partial<SingleDraftData> => {
  const output: Partial<SingleDraftData> = {
    id: raw.id || raw.draftId || 'unknown-id',
    hostName: raw.nameHost || 'Host',
    guestName: raw.nameGuest || 'Guest',
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
      // Remove "aoe4." prefix for civ names if present
      return option.name.startsWith('aoe4.') ? option.name.substring(5) : option.name;
    }
    return optionId.startsWith('aoe4.') ? optionId.substring(5) : optionId;
  };

  raw.events?.forEach(event => {
    const action = event.actionType?.toLowerCase() || '';
    const executingPlayer = event.executingPlayer; // "HOST" or "GUEST"
    const chosenOptionId = event.chosenOptionId;

    if (!chosenOptionId) return;

    const optionName = getOptionNameById(chosenOptionId);
    // Determine if it's a civ or map based on draftType and optionId structure
    // This heuristic might need refinement based on more draft examples.
    const isCivAction = draftType === 'civ' || chosenOptionId.startsWith('aoe4.');
    const isMapAction = draftType === 'map' || !chosenOptionId.startsWith('aoe4.');


    if (action === 'pick') {
      if (isCivAction && draftType === 'civ') {
        if (executingPlayer === 'HOST' && !output.civPicksHost!.includes(optionName)) output.civPicksHost!.push(optionName);
        else if (executingPlayer === 'GUEST' && !output.civPicksGuest!.includes(optionName)) output.civPicksGuest!.push(optionName);
      } else if (isMapAction && draftType === 'map') {
        // For maps, let's assume per-player picks if UI requires it, otherwise global.
        // The UI screenshot suggests per-player map picks/bans.
        if (executingPlayer === 'HOST' && !output.mapPicksHost!.includes(optionName)) output.mapPicksHost!.push(optionName);
        else if (executingPlayer === 'GUEST' && !output.mapPicksGuest!.includes(optionName)) output.mapPicksGuest!.push(optionName);
        // if (!output.mapPicksGlobal!.includes(optionName)) output.mapPicksGlobal!.push(optionName);
      }
    } else if (action === 'ban') {
      if (isCivAction && draftType === 'civ') {
        if (executingPlayer === 'HOST' && !output.civBansHost!.includes(optionName)) output.civBansHost!.push(optionName);
        else if (executingPlayer === 'GUEST' && !output.civBansGuest!.includes(optionName)) output.civBansGuest!.push(optionName);
      } else if (isMapAction && draftType === 'map') {
        if (executingPlayer === 'HOST' && !output.mapBansHost!.includes(optionName)) output.mapBansHost!.push(optionName);
        else if (executingPlayer === 'GUEST' && !output.mapBansGuest!.includes(optionName)) output.mapBansGuest!.push(optionName);
        // if (!output.mapBansGlobal!.includes(optionName)) output.mapBansGlobal!.push(optionName);
      }
    } else if (action === 'snipe') {
         if (isCivAction && draftType === 'civ') {
            if (executingPlayer === 'HOST' && !output.civBansGuest!.includes(optionName)) output.civBansGuest!.push(optionName);
            else if (executingPlayer === 'GUEST' && !output.civBansHost!.includes(optionName)) output.civBansHost!.push(optionName);
        } else if (isMapAction && draftType === 'map') {
            if (executingPlayer === 'HOST' && !output.mapBansGuest!.includes(optionName)) output.mapBansGuest!.push(optionName);
            else if (executingPlayer === 'GUEST' && !output.mapBansHost!.includes(optionName)) output.mapBansHost!.push(optionName);
            // if (!output.mapBansGlobal!.includes(optionName)) output.mapBansGlobal!.push(optionName);
        }
    }
  });

  if (raw.preset?.turns && typeof raw.nextAction === 'number') {
    if (raw.nextAction >= raw.preset.turns.length) {
      output.status = 'completed';
    } else {
      output.status = 'inProgress';
      const currentTurnInfo = raw.preset.turns[raw.nextAction];
      if (currentTurnInfo) {
        output.currentTurnPlayer = currentTurnInfo.player === 'HOST' ? output.hostName : currentTurnInfo.player === 'GUEST' ? output.guestName : 'None';
        output.currentAction = currentTurnInfo.action?.toUpperCase().replace('G', '');
      }
    }
  } else if (raw.status) {
    output.status = raw.status.toLowerCase();
  } else if (raw.ongoing === false) {
    output.status = 'completed';
  } else if (raw.ongoing === true) {
    output.status = 'inProgress';
  }

  return output;
};


const useDraftStore = create<DraftStore>()(
  devtools(
    (set, get) => ({
      ...initialCombinedState,

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
          
          if (draftType === 'civ') {
            set({
              hostName: processedData.hostName || get().hostName, // Prioritize civ draft for names
              guestName: processedData.guestName || get().guestName,
              civPicksHost: processedData.civPicksHost || [],
              civBansHost: processedData.civBansHost || [],
              civPicksGuest: processedData.civPicksGuest || [],
              civBansGuest: processedData.civBansGuest || [],
              civDraftStatus: 'connected',
              isLoadingCivDraft: false,
              civDraftError: null,
            });
          } else { // map draft
            set(state => ({
              // Only update names if they are still default, otherwise keep civ draft names
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
            }));
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
          
          if (draftType === 'civ') set({ isLoadingCivDraft: false, civDraftStatus: 'error', civDraftError: errorMessage });
          else set({ isLoadingMapDraft: false, mapDraftStatus: 'error', mapDraftError: errorMessage });
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
            // Reset relevant data, but keep player names if map draft is still connected
            civPicksHost: [], civBansHost: [], civPicksGuest: [], civBansGuest: [],
            hostName: get().mapDraftId ? get().hostName : initialPlayerNameHost,
            guestName: get().mapDraftId ? get().guestName : initialPlayerNameGuest,
          });
        } else {
          set({
            mapDraftId: null,
            mapDraftStatus: 'disconnected',
            mapDraftError: null,
            isLoadingMapDraft: false,
            mapPicksHost: [], mapBansHost: [], mapPicksGuest: [], mapBansGuest: [],
            mapPicksGlobal: [], mapBansGlobal: [],
          });
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

      setHostName: (name: string) => set({ hostName: name }),
      setGuestName: (name: string) => set({ guestName: name }),
      incrementScore: (player: 'host' | 'guest') => set(state => ({
        scores: { ...state.scores, [player]: state.scores[player] + 1 }
      })),
      decrementScore: (player: 'host' | 'guest') => set(state => ({
        scores: { ...state.scores, [player]: Math.max(0, state.scores[player] - 1) }
      })),
      swapScores: () => set(state => ({
        scores: { host: state.scores.guest, guest: state.scores.host }
      })),
      swapCivPlayers: () => set(state => ({
        hostName: state.guestName,
        guestName: state.hostName,
        civPicksHost: state.civPicksGuest,
        civPicksGuest: state.civPicksHost,
        civBansHost: state.civBansGuest,
        civBansGuest: state.civBansHost,
        // Optionally swap scores too, or handle separately
        // scores: { host: state.scores.guest, guest: state.scores.host },
      })),
      swapMapPlayers: () => set(state => ({
        // Player names are not swapped here as they are primarily tied to civ draft
        mapPicksHost: state.mapPicksGuest,
        mapPicksGuest: state.mapPicksHost,
        mapBansHost: state.mapBansGuest,
        mapBansGuest: state.mapBansHost,
      })),
    }),
    {
      name: 'aoe2-draft-overlay-combined-storage-v1', 
    }
  )
);

export default useDraftStore;
