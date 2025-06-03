import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import axios from 'axios';

import {
  DraftState,
  ConnectionStatus,
  Aoe2cmRawDraftData,
  Aoe2cmRawPlayerData,
} from '../types/draft';

const LOCAL_AOE2CM2_API_BASE_URL = 'http://localhost:5000/api';

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
  const hostName = raw.host?.name || 'Host';
  const guestName = raw.guest?.name || 'Guest';

  const hostCivPicks: string[] = [];
  const hostCivBans: string[] = [];
  const guestCivPicks: string[] = [];
  const guestCivBans: string[] = [];
  const mapPicks: string[] = [];
  const mapBans: string[] = [];

  // Assuming the local aoe2cm2 API response might have a similar events structure
  // or that picks/bans are directly available on player objects.
  // This part will likely need adjustment based on the actual API response.

  // Attempt to get picks/bans from player objects if they exist (common in some API designs)
  if (raw.host && (raw.host as Aoe2cmRawPlayerData).civs) {
    ((raw.host as Aoe2cmRawPlayerData).civs || []).forEach(civOrString => {
      const civName = typeof civOrString === 'string' ? civOrString : civOrString.name;
      // Assuming all civs in 'civs' are picks for now, this might need refinement
      // based on 'action' property if present
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


  // Fallback or primary: Process events array if it exists and is structured as expected
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
          set({ isLoading: false, connectionStatus: 'error', connectionError: 'Invalid Draft ID or URL provided.' });
          return false;
        }
        set({ draftId: extractedId });

        const apiUrl = `${LOCAL_AOE2CM2_API_BASE_URL}/drafts/${extractedId}`;

        try {
          console.log(`Attempting to fetch draft data from local aoe2cm2 API: ${apiUrl}`);
          const response = await axios.get<Aoe2cmRawDraftData>(apiUrl);
          
          console.log('Raw response from local aoe2cm2 API:', response.data);

          if (!response.data || typeof response.data !== 'object') {
            throw new Error('Received invalid or empty data structure from local aoe2cm2 API.');
          }
          
          const rawDraftData = response.data;
          const draftState = transformRawDraftDataToDraftState(rawDraftData);
          
          set({ draft: draftState, connectionStatus: 'connected', isLoading: false, connectionError: null });
          return true;

        } catch (error) {
          let errorMessage = `Failed to fetch draft data from local aoe2cm2 server (${apiUrl}).`;
          if (axios.isAxiosError(error)) {
            errorMessage += ` Server responded with ${error.response?.status || 'no status'}: ${error.message}`;
            console.error('Axios error connecting to local aoe2cm2 API:', error.toJSON());
          } else {
            errorMessage += ` Error: ${(error as Error).message}`;
            console.error('Error connecting to local aoe2cm2 API:', error);
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
      name: 'aoe2-draft-overlay-simplified-storage-v2', // Changed name again to ensure fresh state
    }
  )
);

export default useDraftStore;
