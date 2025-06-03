import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import axios from 'axios';

import {
  DraftState,
  ConnectionStatus,
  Aoe2cmRawDraftData,
  // Aoe2cmRawPlayerData, // Player data is more directly part of Aoe2cmRawDraftData
  // Aoe2cmRawEventData, // Event structure is part of Aoe2cmRawDraftData
} from '../types/draft';

const DRAFT_DATA_API_BASE_URL = 'https://aoe2cm.net/api';

interface DraftStore {
  draft: DraftState | null;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  draftId: string | null;
  isLoading: boolean;

  connectToDraft: (draftIdOrUrl: string) => Promise<boolean>;
  disconnectFromDraft: () => void;
  reconnect: () => Promise<boolean>;
  extractDraftIdFromUrl: (url: string) => string | null;
}

const transformRawDraftDataToDraftState = (
  raw: Aoe2cmRawDraftData
): DraftState => {
  const hostName = raw.nameHost || 'Host';
  const guestName = raw.nameGuest || 'Guest';

  const hostCivPicks: string[] = [];
  const hostCivBans: string[] = [];
  const guestCivPicks: string[] = [];
  const guestCivBans: string[] = [];
  const mapPicks: string[] = [];
  const mapBans: string[] = [];

  const getOptionNameById = (optionId: string): string => {
    const option = raw.preset?.draftOptions?.find(opt => opt.id === optionId);
    if (option?.name) {
      return option.name.startsWith('aoe4.') ? option.name.substring(5) : option.name;
    }
    // Fallback if name not found, use the ID but clean it up if it's a civ
    return optionId.startsWith('aoe4.') ? optionId.substring(5) : optionId;
  };

  raw.events?.forEach(event => {
    const action = event.actionType?.toLowerCase() || ''; // Use actionType
    const executingPlayer = event.executingPlayer; // HOST or GUEST
    const chosenOptionId = event.chosenOptionId;

    if (!chosenOptionId) return;

    const optionName = getOptionNameById(chosenOptionId);
    const isCiv = chosenOptionId.startsWith('aoe4.'); // Heuristic for civ

    if (action === 'pick') {
      if (isCiv) {
        if (executingPlayer === 'HOST' && !hostCivPicks.includes(optionName)) hostCivPicks.push(optionName);
        else if (executingPlayer === 'GUEST' && !guestCivPicks.includes(optionName)) guestCivPicks.push(optionName);
      } else { // It's a map
        if (!mapPicks.includes(optionName)) mapPicks.push(optionName); // Assuming map picks are global or assigned based on context not directly in event player for maps
      }
    } else if (action === 'ban') {
      if (isCiv) {
        if (executingPlayer === 'HOST' && !hostCivBans.includes(optionName)) hostCivBans.push(optionName);
        else if (executingPlayer === 'GUEST' && !guestCivBans.includes(optionName)) guestCivBans.push(optionName);
      } else { // It's a map
        if (!mapBans.includes(optionName)) mapBans.push(optionName);
      }
    } else if (action === 'snipe') { // Handle snipes as bans for the opponent
      if (isCiv) {
        if (executingPlayer === 'HOST' && !guestCivBans.includes(optionName)) guestCivBans.push(optionName); // Host snipes, Guest's civ is banned for Guest
        else if (executingPlayer === 'GUEST' && !hostCivBans.includes(optionName)) hostCivBans.push(optionName); // Guest snipes, Host's civ is banned for Host
      } else { // It's a map
         // If a map is sniped, it's typically removed from the opponent's picks or becomes a general ban.
         // For simplicity, adding to general mapBans.
        if (!mapBans.includes(optionName)) mapBans.push(optionName);
      }
    }
  });
  
  let currentTurnPlayerDisplay: string | undefined = 'none';
  let currentActionDisplay: string | undefined = 'unknown';
  let draftStatus: DraftState['status'] = 'unknown';

  if (raw.preset?.turns && typeof raw.nextAction === 'number') {
    if (raw.nextAction >= raw.preset.turns.length) {
      draftStatus = 'completed';
    } else {
      draftStatus = 'inProgress';
      const currentTurnInfo = raw.preset.turns[raw.nextAction];
      if (currentTurnInfo) {
          currentTurnPlayerDisplay = currentTurnInfo.player; // This is 'HOST', 'GUEST', or 'NONE'
          currentActionDisplay = currentTurnInfo.action?.toUpperCase().replace('G', '');
          // Map 'HOST'/'GUEST' from turn info to actual player names for display if needed, or keep as role
          if (currentTurnPlayerDisplay === 'HOST') currentTurnPlayerDisplay = hostName;
          else if (currentTurnPlayerDisplay === 'GUEST') currentTurnPlayerDisplay = guestName;
      }
    }
  } else if (raw.status) { // Fallback to root status if available
    draftStatus = raw.status.toLowerCase() as DraftState['status'];
  }


  return {
    id: raw.id || raw.draftId || 'unknown-draft',
    hostName,
    guestName,
    hostCivPicks,
    hostCivBans,
    guestCivPicks,
    guestCivBans,
    mapPicks,
    mapBans,
    status: draftStatus,
    currentTurnPlayer: currentTurnPlayerDisplay,
    currentAction: currentActionDisplay,
  };
};

const useDraftStore = create<DraftStore>()(
  devtools(
    (set, get) => ({
      draft: null,
      connectionStatus: 'disconnected',
      connectionError: null,
      draftId: null,
      isLoading: false,

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

      connectToDraft: async (draftIdOrUrl: string) => {
        set({ isLoading: true, connectionStatus: 'connecting', connectionError: null, draft: null });

        const extractedId = get().extractDraftIdFromUrl(draftIdOrUrl);
        if (!extractedId) {
          set({ isLoading: false, connectionStatus: 'error', connectionError: 'Invalid Draft ID or URL provided.' });
          return false;
        }
        set({ draftId: extractedId });
        
        const apiUrl = `${DRAFT_DATA_API_BASE_URL}/draft/${extractedId}`;
        
        try {
          console.log(`Attempting to fetch draft data from: ${apiUrl}`);
          const response = await axios.get<Aoe2cmRawDraftData>(apiUrl); 
          
          console.log('Raw response from API:', response.data);

          if (!response.data || typeof response.data !== 'object') {
            throw new Error('Received invalid or empty data structure from the API.');
          }
          
          const rawDraftData = response.data;
          // Ensure preset and draftOptions are available before transforming
          if (!rawDraftData.preset || !rawDraftData.preset.draftOptions) {
            console.error('Preset data or draftOptions missing in API response:', rawDraftData);
            throw new Error('Preset data or draftOptions missing in API response.');
          }

          const draftState = transformRawDraftDataToDraftState(rawDraftData);
          
          set({ draft: draftState, connectionStatus: 'connected', isLoading: false, connectionError: null });
          return true;

        } catch (error) {
          let errorMessage = `Failed to fetch or process draft data from API (${apiUrl}).`;
          if (axios.isAxiosError(error)) {
            errorMessage += ` Server responded with ${error.response?.status || 'no status'}: ${error.message}`;
            console.error('Axios error connecting to API:', error.response?.data || error.toJSON());
          } else {
            errorMessage += ` Error: ${(error as Error).message}`;
            console.error('Error connecting to API:', error);
          }
          
          set({
            isLoading: false,
            connectionStatus: 'error',
            connectionError: errorMessage,
            draft: null,
          });
          return false;
        }
      },

      disconnectFromDraft: () => {
        set({
          draft: null,
          draftId: null,
          connectionStatus: 'disconnected',
          connectionError: null,
          isLoading: false,
        });
      },

      reconnect: async () => {
        const { draftId, connectToDraft } = get();
        if (!draftId) {
          set({ connectionError: "No draft ID to reconnect to."});
          return false;
        }
        return await connectToDraft(draftId); 
      },
    }),
    {
      name: 'aoe2-draft-overlay-simplified-storage-v4', 
    }
  )
);

export default useDraftStore;
