import { create } from 'zustand';
import { devtools } from 'zustand/middleware'; // Persist can be re-added later if needed
import axios from 'axios';

import {
  DraftState,
  ConnectionStatus,
  // Types needed for raw data parsing
  Aoe2cmRawDraftData,
  Aoe2cmRawPlayerData,
  Aoe2cmRawEventData,
  // Aoe2cmRawPresetData, // Might not be needed if we only parse events for picks/bans
  // Aoe2cmRawPresetTurn,
} from '../types/draft';

// URLs
const AOE2CM_BASE_URL = 'https://aoe2cm.net';
const CORS_PROXY_URL = 'https://corsproxy.io/?';

// Simplified Draft Store Interface
interface DraftStore {
  draft: DraftState | null;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  draftId: string | null;
  isLoading: boolean; // Keep isLoading for user feedback during fetch

  connectToDraft: (draftIdOrUrl: string) => Promise<boolean>;
  disconnectFromDraft: () => void;
  reconnect: () => Promise<boolean>; // Might be simplified or removed if no WebSockets
  extractDraftIdFromUrl: (url: string) => string | null;
}

// Simplified transformation function
const transformRawDraftDataToDraftState = (
  raw: Aoe2cmRawDraftData
): DraftState => {
  const hostName = raw.host?.name || 'Host'; // Fallback if name is not in player object
  const guestName = raw.guest?.name || 'Guest'; // Fallback

  const hostCivPicks: string[] = [];
  const hostCivBans: string[] = [];
  const guestCivPicks: string[] = [];
  const guestCivBans: string[] = [];
  const mapPicks: string[] = [];
  const mapBans: string[] = [];

  // Determine player roles from raw data if possible, otherwise assume based on event.player
  // This is a simplified assumption; a more robust way would be to map player names from events
  // to the host/guest objects if raw.host/guest are just strings.
  // For now, we assume raw.host.name and raw.guest.name are reliable.

  raw.events?.forEach(event => {
    const action = event.action?.toLowerCase() || '';
    const player = event.player?.toLowerCase(); // Could be 'host', 'guest', or actual player names

    const isHostAction = player === 'host' || (raw.host && player === (raw.host as Aoe2cmRawPlayerData).name?.toLowerCase());
    const isGuestAction = player === 'guest' || (raw.guest && player === (raw.guest as Aoe2cmRawPlayerData).name?.toLowerCase());

    if (event.civ) {
      if (action.includes('pick')) {
        if (isHostAction) hostCivPicks.push(event.civ);
        else if (isGuestAction) guestCivPicks.push(event.civ);
      } else if (action.includes('ban')) {
        if (isHostAction) hostCivBans.push(event.civ);
        else if (isGuestAction) guestCivBans.push(event.civ);
      }
    } else if (event.map) {
      if (action.includes('pick')) {
        // Map picks might be global or attributed to the current turn player.
        // For simplicity, let's assume global or assign to host if player is ambiguous.
        // This needs refinement based on actual aoe2cm.net data structure for map picks.
        mapPicks.push(event.map);
      } else if (action.includes('ban')) {
        mapBans.push(event.map);
      }
    }
  });
  
  let currentTurnPlayerDisplay: string | undefined = 'none';
  let currentActionDisplay: string | undefined = 'unknown';

  if (raw.preset?.turns && typeof raw.currentTurnNo === 'number' && raw.currentTurnNo < raw.preset.turns.length) {
    const currentTurnInfo = raw.preset.turns[raw.currentTurnNo];
    currentTurnPlayerDisplay = currentTurnInfo.player;
    currentActionDisplay = currentTurnInfo.action?.toUpperCase().replace('G', ''); // e.g. GPICK -> PICK
  }


  return {
    id: raw.id,
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
            if (urlObj.hostname === 'aoe2cm.net' || urlObj.hostname === 'www.aoe2cm.net') {
              const pathMatch = /\/draft\/([a-zA-Z0-9]+)/.exec(urlObj.pathname);
              if (pathMatch && pathMatch[1]) return pathMatch[1];
              const draftIdParam = urlObj.searchParams.get('draftId');
              if (draftIdParam) return draftIdParam;
            }
          }
          if (/^[a-zA-Z0-9]+$/.test(url)) {
            return url;
          }
          return null;
        } catch (error) {
          if (/^[a-zA-Z0-9]+$/.test(url)) {
            return url;
          }
          return null;
        }
      },

      connectToDraft: async (draftIdOrUrl: string) => {
        set({ isLoading: true, connectionStatus: 'connecting', connectionError: null, draft: null });

        const extractedId = get().extractDraftIdFromUrl(draftIdOrUrl);
        if (!extractedId) {
          set({ isLoading: false, connectionStatus: 'error', connectionError: 'Invalid Draft ID or URL' });
          return false;
        }
        set({ draftId: extractedId });

        const draftJsUrl = `${AOE2CM_BASE_URL}/draft/${extractedId}.js`;
        const proxyUrl = `${CORS_PROXY_URL}${encodeURIComponent(draftJsUrl)}`;
        let responseText: string | null = null;

        try {
          // Try direct fetch first (might fail due to CORS in browser, but good for Node.js or if server has CORS)
           try {
            const directResponse = await axios.get<string>(draftJsUrl, { transformResponse: (res) => res });
            responseText = directResponse.data;
            console.log("Fetched directly from:", draftJsUrl);
            set({ connectionError: null });
          } catch (directError) {
            console.warn(`Direct fetch to ${draftJsUrl} failed, trying proxy...`, directError);
            set({ connectionError: `Direct fetch failed. Retrying via proxy... (${(directError as Error).message})` });
            const proxyResponse = await axios.get<string>(proxyUrl, { transformResponse: (res) => res });
            responseText = proxyResponse.data;
            console.log("Fetched via proxy from:", proxyUrl);
            set({ connectionError: null }); 
          }

          if (!responseText) {
            throw new Error('Received empty response for draft data.');
          }

          const match = responseText.match(/var\s+draftData\s*=\s*(\{[\s\S]*?\});/);
          if (!match || !match[1]) {
            console.error("Raw response text:", responseText);
            throw new Error('Could not find or parse draftData variable in the response script.');
          }
          
          let rawDraftData: Aoe2cmRawDraftData;
          try {
            rawDraftData = JSON.parse(match[1]);
          } catch (jsonError) {
            console.error("Failed to parse JSON from draftData variable:", match[1], jsonError);
            throw new Error('Failed to parse JSON from draftData variable.');
          }

          const draftState = transformRawDraftDataToDraftState(rawDraftData);
          set({ draft: draftState, connectionStatus: 'connected', isLoading: false, connectionError: null });
          return true;

        } catch (error) {
          console.error('Error connecting to draft:', error);
          set({
            isLoading: false,
            connectionStatus: 'error',
            connectionError: `Failed to fetch or process draft data: ${(error as Error).message}`,
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
      name: 'aoe2-draft-overlay-simplified-storage', // Changed name to avoid conflict with old store
    }
  )
);

export default useDraftStore;
