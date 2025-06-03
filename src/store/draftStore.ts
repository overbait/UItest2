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
  // Extract player names: aoe2cm.net/api for recent drafts shows nameHost/nameGuest
  // The /api/draft/:id endpoint might return an object with a 'host' and 'guest' object,
  // or direct nameHost/nameGuest. We need to be flexible.
  const hostName = typeof raw.host === 'object' ? raw.host?.name : raw.nameHost || raw.host || 'Host';
  const guestName = typeof raw.guest === 'object' ? raw.guest?.name : raw.nameGuest || raw.guest || 'Guest';

  const hostCivPicks: string[] = [];
  const hostCivBans: string[] = [];
  const guestCivPicks: string[] = [];
  const guestCivBans: string[] = [];
  const mapPicks: string[] = [];
  const mapBans: string[] = [];

  // Process events array to determine picks and bans
  // The player in event might be 'host', 'guest', or the actual player name.
  raw.events?.forEach(event => {
    const action = event.action?.toLowerCase() || '';
    const playerIdentifier = event.player; // This could be 'host', 'guest', or actual name

    let isHostAction = false;
    let isGuestAction = false;

    if (playerIdentifier === 'host' || playerIdentifier === hostName) {
      isHostAction = true;
    } else if (playerIdentifier === 'guest' || playerIdentifier === guestName) {
      isGuestAction = true;
    }

    // Check for civilization actions
    if (event.civ) {
      // Actions like "PICK", "BAN", "GPICK", "GBAN", "SNIPE", "STEAL"
      // For simplicity, we'll consider "pick", "gpick", "steal" as picks
      // and "ban", "gban", "snipe" as bans.
      if (action.includes('pick') || action.includes('steal')) {
        if (isHostAction && !hostCivPicks.includes(event.civ)) hostCivPicks.push(event.civ);
        else if (isGuestAction && !guestCivPicks.includes(event.civ)) guestCivPicks.push(event.civ);
      } else if (action.includes('ban') || action.includes('snipe')) {
        if (isHostAction && !hostCivBans.includes(event.civ)) hostCivBans.push(event.civ);
        else if (isGuestAction && !guestCivBans.includes(event.civ)) guestCivBans.push(event.civ);
      }
    }
    // Check for map actions
    else if (event.map) {
      if (action.includes('pick') || action.includes('steal')) {
        if (!mapPicks.includes(event.map)) mapPicks.push(event.map); // Maps are often global or picked by one player for the match
      } else if (action.includes('ban') || action.includes('snipe')) {
        if (!mapBans.includes(event.map)) mapBans.push(event.map);
      }
    }
  });
  
  let currentTurnPlayerDisplay: string | undefined = 'none';
  let currentActionDisplay: string | undefined = 'unknown';

  if (raw.preset?.turns && typeof raw.currentTurnNo === 'number' && raw.currentTurnNo < raw.preset.turns.length) {
    const currentTurnInfo = raw.preset.turns[raw.currentTurnNo];
    if (currentTurnInfo) {
        currentTurnPlayerDisplay = currentTurnInfo.player;
        currentActionDisplay = currentTurnInfo.action?.toUpperCase().replace('G', '');
    }
  }

  return {
    id: raw.id || raw.draftId || 'unknown-draft', // draftId is from recentdrafts example
    hostName,
    guestName,
    hostCivPicks,
    hostCivBans,
    guestCivPicks,
    guestCivBans,
    mapPicks,
    mapBans,
    status: raw.status?.toLowerCase() || (raw.ongoing === false ? 'completed' : raw.ongoing === true ? 'inprogress' : 'unknown'),
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
            if (urlObj.hostname.includes('aoe2cm.net')) { // Specific to aoe2cm.net
              const pathMatch = /\/draft\/([a-zA-Z0-9]+)/.exec(urlObj.pathname);
              if (pathMatch && pathMatch[1]) return pathMatch[1];
              // Check for observer link structure if applicable
              const observerPathMatch = /\/observer\/([a-zA-Z0-9]+)/.exec(urlObj.pathname);
              if (observerPathMatch && observerPathMatch[1]) return observerPathMatch[1];
            }
            // Generic ID extraction for other potential URLs (like shtopr-aoe4)
            const pathSegments = urlObj.pathname.split('/');
            const potentialId = pathSegments.pop() || pathSegments.pop(); 
            if (potentialId && /^[a-zA-Z0-9_-]+$/.test(potentialId) && potentialId.length > 3) {
                return potentialId;
            }
             const draftIdParam = urlObj.searchParams.get('draftId') || urlObj.searchParams.get('id');
             if (draftIdParam) return draftIdParam;
          }
          // If not a URL, or parsing failed, assume it's a raw ID
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
          // We expect a direct JSON response from this API endpoint
          const response = await axios.get<Aoe2cmRawDraftData>(apiUrl); 
          
          console.log('Raw response from API:', response.data);

          if (!response.data || typeof response.data !== 'object') {
            throw new Error('Received invalid or empty data structure from the API.');
          }
          
          const rawDraftData = response.data;
          const draftState = transformRawDraftDataToDraftState(rawDraftData);
          
          set({ draft: draftState, connectionStatus: 'connected', isLoading: false, connectionError: null });
          return true;

        } catch (error) {
          let errorMessage = `Failed to fetch draft data from API (${apiUrl}).`;
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
      name: 'aoe2-draft-overlay-simplified-storage-v4', // Incremented version for fresh state
    }
  )
);

export default useDraftStore;
