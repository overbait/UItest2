import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import axios from 'axios';

import {
  DraftState,
  ConnectionStatus,
  Aoe2cmRawDraftData,
  Aoe2cmRawPlayerData,
} from '../types/draft';

// Configurable base URL for the draft data API.
// This should be set based on user's findings (e.g., from shtopr-aoe4.cowlandia.net or aoe2cm.net API).
const DRAFT_DATA_API_BASE_URL = ''; // Intentionally empty - to be configured or discovered

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

// This transformation function will likely need significant adjustments
// once the actual API response structure is known.
const transformRawDraftDataToDraftState = (
  raw: Aoe2cmRawDraftData 
): DraftState => {
  const hostName = raw.host?.name || 'Host';
  const guestName = raw.guest?.name || 'Guest';

  const hostCivPicks: string[] = [];
  const hostCivBans: string[] = [];
  const guestCivPicks: string[] = [];
  const guestCivBans: string[] = [];
  const mapPicks: string[] = [];
  const mapBans: string[] = [];

  // Attempt to get picks/bans from player objects if they exist
  if (raw.host && (raw.host as Aoe2cmRawPlayerData).civs) {
    ((raw.host as Aoe2cmRawPlayerData).civs || []).forEach(civOrString => {
      const civName = typeof civOrString === 'string' ? civOrString : civOrString.name;
      if (civName) hostCivPicks.push(civName);
    });
  }
  if (raw.host && (raw.host as Aoe2cmRawPlayerData).bans) {
    ((raw.host as Aoe2cmRawPlayerData).bans || []).forEach(civOrString => {
      const civName = typeof civOrString === 'string' ? civOrString : civOrString.name;
      if (civName) hostCivBans.push(civName);
    });
  }
  if (raw.guest && (raw.guest as Aoe2cmRawPlayerData).civs) {
    ((raw.guest as Aoe2cmRawPlayerData).civs || []).forEach(civOrString => {
      const civName = typeof civOrString === 'string' ? civOrString : civOrString.name;
      if (civName) guestCivPicks.push(civName);
    });
  }
  if (raw.guest && (raw.guest as Aoe2cmRawPlayerData).bans) {
    ((raw.guest as Aoe2cmRawPlayerData).bans || []).forEach(civOrString => {
      const civName = typeof civOrString === 'string' ? civOrString : civOrString.name;
      if (civName) guestCivBans.push(civName);
    });
  }

  // Fallback or primary: Process events array if it exists
  if (raw.events && Array.isArray(raw.events)) {
    raw.events.forEach(event => {
      const action = event.action?.toLowerCase() || '';
      const player = event.player?.toLowerCase();

      const isHostAction = player === 'host' || (raw.host && player === (raw.host as Aoe2cmRawPlayerData).name?.toLowerCase());
      const isGuestAction = player === 'guest' || (raw.guest && player === (raw.guest as Aoe2cmRawPlayerData).name?.toLowerCase());

      if (event.civ) {
        if (action.includes('pick') && !hostCivPicks.includes(event.civ) && !guestCivPicks.includes(event.civ)) {
          if (isHostAction) hostCivPicks.push(event.civ);
          else if (isGuestAction) guestCivPicks.push(event.civ);
        } else if (action.includes('ban') && !hostCivBans.includes(event.civ) && !guestCivBans.includes(event.civ)) {
          if (isHostAction) hostCivBans.push(event.civ);
          else if (isGuestAction) guestCivBans.push(event.civ);
        }
      } else if (event.map) {
        if (action.includes('pick') && !mapPicks.includes(event.map)) {
          mapPicks.push(event.map);
        } else if (action.includes('ban') && !mapBans.includes(event.map)) {
          mapBans.push(event.map);
        }
      }
    });
  }
  
  let currentTurnPlayerDisplay: string | undefined = 'none';
  let currentActionDisplay: string | undefined = 'unknown';

  if (raw.preset?.turns && typeof raw.currentTurnNo === 'number' && raw.currentTurnNo < raw.preset.turns.length) {
    const currentTurnInfo = raw.preset.turns[raw.currentTurnNo];
    currentTurnPlayerDisplay = currentTurnInfo.player;
    currentActionDisplay = currentTurnInfo.action?.toUpperCase().replace('G', '');
  }

  return {
    id: raw.id || 'unknown-draft',
    hostName,
    guestName,
    hostCivPicks,
    hostCivBans,
    guestCivPicks,
    guestCivBans,
    mapPicks,
    mapBans,
    status: raw.status?.toLowerCase() || 'unknown',
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
            // Generic check for a path segment that looks like a draft ID
            const pathSegments = urlObj.pathname.split('/');
            const potentialId = pathSegments.pop() || pathSegments.pop(); // Get last or second to last segment
            if (potentialId && /^[a-zA-Z0-9_-]+$/.test(potentialId) && potentialId.length > 3) { // Basic ID check
                // Check if hostname is a known draft service, if not, it might be a direct API link
                if (urlObj.hostname.includes('aoe2cm.net') || urlObj.hostname.includes('cowlandia.net')) {
                    return potentialId;
                }
                // If it's not a known frontend, assume the URL might be the API base itself
                // or the ID is in a query param.
                const draftIdParam = urlObj.searchParams.get('draftId') || urlObj.searchParams.get('id');
                if (draftIdParam) return draftIdParam;
                return potentialId; // Fallback to path segment
            }
          }
          // If not a URL, or parsing failed, assume it's a raw ID
          if (/^[a-zA-Z0-9_-]+$/.test(url) && url.length > 3) {
            return url;
          }
          return null;
        } catch (error) {
          // If URL parsing fails, it might be just an ID
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

        let apiUrl = '';
        if (DRAFT_DATA_API_BASE_URL) {
          // Assuming the API endpoint structure is /drafts/{id} or similar. This might need adjustment.
          apiUrl = `${DRAFT_DATA_API_BASE_URL}/drafts/${extractedId}`; 
        } else {
          // If DRAFT_DATA_API_BASE_URL is not set, we must rely on the user providing a full API URL
          // or we cannot proceed. For now, we'll try to see if draftIdOrUrl itself is a full API URL.
          if (draftIdOrUrl.startsWith('http://') || draftIdOrUrl.startsWith('https://')) {
            try {
                new URL(draftIdOrUrl); // check if it's a valid URL
                apiUrl = draftIdOrUrl; // Assume the user provided the full API endpoint
                console.warn(`DRAFT_DATA_API_BASE_URL is not set. Using provided URL as full API endpoint: ${apiUrl}`);
            } catch (_) {
                // Not a valid URL, and base is not set.
            }
          }
          
          if (!apiUrl) {
            const placeholderApiUrl = `https://api.placeholder.com/drafts/${extractedId}`; // Placeholder
            console.warn(`DRAFT_DATA_API_BASE_URL is not set. API endpoint discovery needed. Attempting placeholder: ${placeholderApiUrl}`);
            // Set error and stop if no base URL and not a full URL provided by user
            set({ 
                isLoading: false, 
                connectionStatus: 'error', 
                connectionError: 'Draft API Base URL is not configured. Cannot fetch data. Please provide a full API URL or configure the base URL.',
                draft: null 
            });
            return false;
          }
        }
        
        try {
          console.log(`Attempting to fetch draft data from: ${apiUrl}`);
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
            console.error('Axios error connecting to API:', error.toJSON());
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
        // When reconnecting, we might need to re-evaluate the API URL if it was dynamically determined
        // For now, connectToDraft will use the stored draftId, which is fine if it's just the ID.
        // If draftId stored the full URL, connectToDraft logic needs to handle that.
        // The current extractDraftIdFromUrl should give us just the ID.
        return await connectToDraft(draftId); 
      },
    }),
    {
      name: 'aoe2-draft-overlay-simplified-storage-v3', // Incremented version for fresh state
    }
  )
);

export default useDraftStore;
