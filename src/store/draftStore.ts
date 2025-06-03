import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import axios from 'axios';
import io, { Socket } from 'socket.io-client';

import {
  DraftState,
  ConnectionStatus,
  DraftUIConfig,
  DraftAction,
  WebSocketEvent,
  DraftUpdateEvent,
  TurnTimerEvent,
  ChatMessageEvent,
  DraftDataForAI,
  AICustomizationCommand,
  Civilization,
  GameMap,
  DraftActionResult,
  ApiResponse,
} from '../types/draft';

// Base URL for API requests
const API_BASE_URL = 'https://aoe2cm.net/api';
const SOCKET_URL = 'https://aoe2cm.net';

// Default UI configuration
const DEFAULT_UI_CONFIG: DraftUIConfig = {
  positions: {
    hostName: { x: 20, y: 20, width: 200, height: 40, zIndex: 10, visible: true },
    guestName: { x: 20, y: 70, width: 200, height: 40, zIndex: 10, visible: true },
    hostScore: { x: 230, y: 20, width: 40, height: 40, zIndex: 10, visible: true },
    guestScore: { x: 230, y: 70, width: 40, height: 40, zIndex: 10, visible: true },
    hostCivs: { x: 20, y: 120, width: 250, height: 300, zIndex: 10, visible: true },
    guestCivs: { x: 20, y: 430, width: 250, height: 300, zIndex: 10, visible: true },
    maps: { x: 280, y: 120, width: 250, height: 200, zIndex: 10, visible: true },
    status: { x: 280, y: 330, width: 250, height: 40, zIndex: 10, visible: true },
    timer: { x: 280, y: 380, width: 250, height: 40, zIndex: 10, visible: true },
  },
  fonts: {
    playerNames: 'font-medieval',
    civilizations: 'font-game',
    maps: 'font-game',
    status: 'font-technical',
  },
  colors: {
    background: 'transparent',
    text: '#F5F5DC',
    hostHighlight: '#4CAF50',
    guestHighlight: '#2196F3',
    pick: '#4CAF50',
    ban: '#F44336',
    snipe: '#FF9800',
  },
  images: {
    background: '',
    hostLogo: '',
    guestLogo: '',
    customImages: {},
  },
  animations: {
    enabled: true,
    duration: 500,
    type: 'fade',
  },
};

// Interface for the draft store state
interface DraftStore {
  // Draft data
  draft: DraftState | null;
  civilizations: Civilization[];
  maps: GameMap[];
  
  // Connection state
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  socket: Socket | null;
  draftId: string | null;
  
  // UI configuration
  uiConfig: DraftUIConfig;
  
  // Timer state
  turnTimer: {
    remainingTime: number;
    totalTime: number;
  };
  
  // Chat messages
  chatMessages: ChatMessageEvent[];
  
  // Loading states
  isLoading: boolean;
  
  // Actions
  connectToDraft: (draftIdOrUrl: string) => Promise<boolean>;
  disconnectFromDraft: () => void;
  reconnect: () => Promise<boolean>;
  
  // Draft actions
  updateDraftState: (newState: Partial<DraftState>) => void;
  performAction: (action: DraftAction) => Promise<DraftActionResult>;
  
  // UI configuration actions
  updateUIConfig: (config: Partial<DraftUIConfig>) => void;
  resetUIConfig: () => void;
  updateElementPosition: (
    element: keyof DraftUIConfig['positions'], 
    position: { x?: number; y?: number; width?: number; height?: number; zIndex?: number; visible?: boolean }
  ) => void;
  
  // Player actions
  updatePlayerScore: (role: 'host' | 'guest', score: number) => void;
  updatePlayerName: (role: 'host' | 'guest', name: string) => void;
  
  // AI integration
  getDraftDataForAI: () => DraftDataForAI;
  executeAICustomization: (command: AICustomizationCommand) => void;
  
  // Utility methods
  extractDraftIdFromUrl: (url: string) => string | null;
  getCivilizationById: (id: string) => Civilization | undefined;
  getMapById: (id: string) => GameMap | undefined;
}

// Create the store with Zustand
const useDraftStore = create<DraftStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        draft: null,
        civilizations: [],
        maps: [],
        connectionStatus: 'disconnected',
        connectionError: null,
        socket: null,
        draftId: null,
        uiConfig: DEFAULT_UI_CONFIG,
        turnTimer: {
          remainingTime: 0,
          totalTime: 30,
        },
        chatMessages: [],
        isLoading: false,
        
        // Connect to a draft using ID or URL
        connectToDraft: async (draftIdOrUrl: string) => {
          set({ isLoading: true, connectionStatus: 'connecting' });
          
          try {
            // Extract draft ID if a URL was provided
            const draftId = get().extractDraftIdFromUrl(draftIdOrUrl) || draftIdOrUrl;
            
            // Fetch draft data
            const response = await axios.get<ApiResponse<DraftState>>(`${API_BASE_URL}/draft/${draftId}`);
            
            if (!response.data.success || !response.data.data) {
              set({ 
                connectionStatus: 'error', 
                connectionError: response.data.error?.message || 'Failed to fetch draft data',
                isLoading: false 
              });
              return false;
            }
            
            // Fetch civilizations if not already loaded
            if (get().civilizations.length === 0) {
              const civsResponse = await axios.get<ApiResponse<Civilization[]>>(`${API_BASE_URL}/civilizations`);
              if (civsResponse.data.success && civsResponse.data.data) {
                set({ civilizations: civsResponse.data.data });
              }
            }
            
            // Fetch maps if not already loaded
            if (get().maps.length === 0) {
              const mapsResponse = await axios.get<ApiResponse<GameMap[]>>(`${API_BASE_URL}/maps`);
              if (mapsResponse.data.success && mapsResponse.data.data) {
                set({ maps: mapsResponse.data.data });
              }
            }
            
            // Setup WebSocket connection
            const socket = io(`${SOCKET_URL}`, {
              query: { draftId },
              transports: ['websocket'],
            });
            
            // Setup socket event handlers
            socket.on('connect', () => {
              set({ connectionStatus: 'connected', connectionError: null });
              socket.emit('joinDraft', { draftId, role: 'spectator' });
            });
            
            socket.on('disconnect', () => {
              set({ connectionStatus: 'disconnected' });
            });
            
            socket.on('error', (error: any) => {
              set({ 
                connectionStatus: 'error', 
                connectionError: typeof error === 'string' ? error : 'WebSocket connection error' 
              });
            });
            
            socket.on('draftUpdate', (event: WebSocketEvent<DraftUpdateEvent>) => {
              if (event.data?.draft) {
                set({ draft: event.data.draft });
                
                // Update turn timer if available
                if (event.data.draft.turnTimeLimit) {
                  set({
                    turnTimer: {
                      remainingTime: event.data.draft.turnTimeLimit,
                      totalTime: event.data.draft.turnTimeLimit,
                    }
                  });
                }
              }
            });
            
            socket.on('turnTimerUpdate', (event: WebSocketEvent<TurnTimerEvent>) => {
              if (event.data) {
                set({
                  turnTimer: {
                    remainingTime: event.data.remainingTime,
                    totalTime: event.data.totalTime,
                  }
                });
              }
            });
            
            socket.on('chatMessage', (event: WebSocketEvent<ChatMessageEvent>) => {
              if (event.data) {
                set(state => ({
                  chatMessages: [...state.chatMessages, event.data!],
                }));
              }
            });
            
            // Set the draft state and connection info
            set({
              draft: response.data.data,
              draftId,
              socket,
              connectionStatus: 'connected',
              connectionError: null,
              isLoading: false,
            });
            
            return true;
          } catch (error) {
            console.error('Error connecting to draft:', error);
            set({ 
              connectionStatus: 'error', 
              connectionError: error instanceof Error ? error.message : 'Unknown error',
              isLoading: false 
            });
            return false;
          }
        },
        
        // Disconnect from the current draft
        disconnectFromDraft: () => {
          const { socket } = get();
          if (socket) {
            socket.disconnect();
          }
          
          set({
            draft: null,
            socket: null,
            draftId: null,
            connectionStatus: 'disconnected',
            connectionError: null,
            chatMessages: [],
          });
        },
        
        // Reconnect to the current draft
        reconnect: async () => {
          const { draftId, disconnectFromDraft, connectToDraft } = get();
          
          if (!draftId) {
            return false;
          }
          
          disconnectFromDraft();
          return await connectToDraft(draftId);
        },
        
        // Update the draft state
        updateDraftState: (newState: Partial<DraftState>) => {
          set(state => ({
            draft: state.draft ? { ...state.draft, ...newState } : null,
          }));
        },
        
        // Perform a draft action (e.g., pick, ban)
        performAction: async (action: DraftAction) => {
          const { draftId, socket } = get();
          
          if (!draftId || !socket) {
            return {
              action,
              success: false,
              errorCode: 'NO_CONNECTION',
              errorMessage: 'Not connected to a draft',
            };
          }
          
          try {
            return new Promise<DraftActionResult>((resolve) => {
              socket.emit('draftAction', { draftId, action }, (result: DraftActionResult) => {
                resolve(result);
              });
            });
          } catch (error) {
            return {
              action,
              success: false,
              errorCode: 'ACTION_FAILED',
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        },
        
        // Update UI configuration
        updateUIConfig: (config: Partial<DraftUIConfig>) => {
          set(state => ({
            uiConfig: {
              ...state.uiConfig,
              ...config,
              positions: {
                ...state.uiConfig.positions,
                ...(config.positions || {}),
              },
              fonts: {
                ...state.uiConfig.fonts,
                ...(config.fonts || {}),
              },
              colors: {
                ...state.uiConfig.colors,
                ...(config.colors || {}),
              },
              images: {
                ...state.uiConfig.images,
                ...(config.images || {}),
                customImages: {
                  ...state.uiConfig.images.customImages,
                  ...(config.images?.customImages || {}),
                },
              },
              animations: {
                ...state.uiConfig.animations,
                ...(config.animations || {}),
              },
            },
          }));
        },
        
        // Reset UI configuration to defaults
        resetUIConfig: () => {
          set({ uiConfig: DEFAULT_UI_CONFIG });
        },
        
        // Update the position of a UI element
        updateElementPosition: (element, position) => {
          set(state => ({
            uiConfig: {
              ...state.uiConfig,
              positions: {
                ...state.uiConfig.positions,
                [element]: {
                  ...state.uiConfig.positions[element],
                  ...position,
                },
              },
            },
          }));
        },
        
        // Update player score
        updatePlayerScore: (role, score) => {
          set(state => {
            if (!state.draft) return state;
            
            const updatedDraft = { ...state.draft };
            if (role === 'host') {
              updatedDraft.host = { ...updatedDraft.host, score };
            } else {
              updatedDraft.guest = { ...updatedDraft.guest, score };
            }
            
            return { draft: updatedDraft };
          });
        },
        
        // Update player name
        updatePlayerName: (role, name) => {
          set(state => {
            if (!state.draft) return state;
            
            const updatedDraft = { ...state.draft };
            if (role === 'host') {
              updatedDraft.host = { ...updatedDraft.host, name };
            } else {
              updatedDraft.guest = { ...updatedDraft.guest, name };
            }
            
            return { draft: updatedDraft };
          });
        },
        
        // Get structured draft data for AI integration
        getDraftDataForAI: () => {
          const { draft } = get();
          
          if (!draft) {
            return {
              draftId: '',
              presetId: '',
              host: { name: '', score: 0, picks: [], bans: [], snipes: [] },
              guest: { name: '', score: 0, picks: [], bans: [], snipes: [] },
              maps: { picks: [], bans: [] },
              currentTurn: 0,
              status: 'unknown',
            };
          }
          
          return {
            draftId: draft.id,
            presetId: draft.presetId || '',
            host: {
              name: draft.host.name,
              score: draft.host.score || 0,
              picks: draft.hostCivs.picks.map(civ => civ.name),
              bans: draft.hostCivs.bans.map(civ => civ.name),
              snipes: draft.hostCivs.snipes.map(civ => civ.name),
            },
            guest: {
              name: draft.guest.name,
              score: draft.guest.score || 0,
              picks: draft.guestCivs.picks.map(civ => civ.name),
              bans: draft.guestCivs.bans.map(civ => civ.name),
              snipes: draft.guestCivs.snipes.map(civ => civ.name),
            },
            maps: {
              picks: draft.maps.picks.map(map => map.name),
              bans: draft.maps.bans.map(map => map.name),
            },
            currentTurn: draft.currentTurn,
            status: draft.status,
          };
        },
        
        // Execute AI customization commands
        executeAICustomization: (command: AICustomizationCommand) => {
          const { updateUIConfig, updateElementPosition } = get();
          
          switch (command.type) {
            case 'setPosition':
              if (command.element in get().uiConfig.positions) {
                updateElementPosition(
                  command.element as keyof DraftUIConfig['positions'],
                  command.value
                );
              }
              break;
              
            case 'setFont':
              updateUIConfig({
                fonts: {
                  [command.element]: command.value,
                },
              });
              break;
              
            case 'setColor':
              updateUIConfig({
                colors: {
                  [command.element]: command.value,
                },
              });
              break;
              
            case 'setImage':
              updateUIConfig({
                images: {
                  [command.element]: command.value,
                },
              });
              break;
              
            case 'setAnimation':
              updateUIConfig({
                animations: command.value,
              });
              break;
          }
        },
        
        // Extract draft ID from a URL
        extractDraftIdFromUrl: (url: string) => {
          try {
            const urlObj = new URL(url);
            
            // Check if the URL is from aoe2cm.net
            if (urlObj.hostname === 'aoe2cm.net') {
              // Extract draft ID from path or query parameter
              const pathMatch = /\/draft\/([a-zA-Z0-9]+)/.exec(urlObj.pathname);
              if (pathMatch && pathMatch[1]) {
                return pathMatch[1];
              }
              
              // Check for draftId query parameter
              const draftId = urlObj.searchParams.get('draftId');
              if (draftId) {
                return draftId;
              }
            }
            
            return null;
          } catch (error) {
            // If the input is not a valid URL, check if it might be just a draft ID
            if (/^[a-zA-Z0-9]+$/.test(url)) {
              return url;
            }
            return null;
          }
        },
        
        // Get civilization by ID
        getCivilizationById: (id: string) => {
          return get().civilizations.find(civ => civ.id === id);
        },
        
        // Get map by ID
        getMapById: (id: string) => {
          return get().maps.find(map => map.id === id);
        },
      }),
      {
        name: 'aoe2-draft-overlay-storage',
        partialize: (state) => ({
          uiConfig: state.uiConfig,
          civilizations: state.civilizations,
          maps: state.maps,
        }),
      }
    )
  )
);

export default useDraftStore;
