import { StateStorage } from 'zustand/middleware';
import useDraftStore from './draftStore';

const STORE_NAME = 'aoe2-draft-overlay-combined-storage-v1';
const BROADCAST_CHANNEL_NAME = 'zustand_store_sync_channel';
let channel: BroadcastChannel | null = null;

try {
  channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
} catch (e) {
  console.warn('[CustomStorage] BroadcastChannel API not available or failed to initialize. Cross-tab sync might be less responsive.', e);
}

let isOriginTab = false;
let localStorageWriteInProgressByThisTab = false;

// Helper function to apply state updates from localStorage
const applyStateFromLocalStorage = () => {
  // console.log('[CustomStorage applyState] Attempting to apply state from localStorage.');
  try {
    const rawStateFromStorage = localStorage.getItem(STORE_NAME);
    if (rawStateFromStorage) {
      const persistedWrapperState = JSON.parse(rawStateFromStorage);
      // Assuming {state: actualAppState, version: ...} structure based on prior log analysis
      const actualAppState = persistedWrapperState.state;

      if (actualAppState && typeof actualAppState === 'object') {
        const updates: Partial<ReturnType<typeof useDraftStore.getState>> = {};

        // Define properties to sync from the persisted state
        const propertiesToSync: (keyof typeof actualAppState)[] = [
          'currentCanvases', 'activeCanvasId', 'scores', 'hostName',
          'guestName', 'layoutLastUpdated', 'civDraftId', 'mapDraftId',
          'boxSeriesFormat', 'boxSeriesGames', 'activePresetId'
        ];

        propertiesToSync.forEach(key => {
          if (actualAppState.hasOwnProperty(key)) {
            const value = actualAppState[key];
            if (Array.isArray(value)) {
              (updates as any)[key] = JSON.parse(JSON.stringify(value));
            } else if (typeof value === 'object' && value !== null && value.constructor === Object) {
              (updates as any)[key] = JSON.parse(JSON.stringify(value));
            } else {
              (updates as any)[key] = value;
            }
          }
        });

        if (Object.keys(updates).length > 0) {
          useDraftStore.setState(updates);
          // console.debug('[CustomStorage applyState] Store selectively updated from localStorage. Applied properties:', Object.keys(updates)); // Changed to debug/commented
        } else {
          // console.debug('[CustomStorage applyState] No relevant own properties found in stored state to apply, or actualAppState was empty.'); // Changed to debug/commented
        }
      } else {
        console.warn('[CustomStorage applyState] Could not find .state property in parsed localStorage data, or it was null/undefined or not an object.');
      }
    } else {
      console.warn('[CustomStorage applyState] Null value from localStorage.getItem (item may have been removed or not set). No state applied from localStorage.');
    }
  } catch (e) {
    console.error('[CustomStorage applyState] Error during state application from localStorage:', e);
  }
};

export const customLocalStorageWithBroadcast: StateStorage = {
  getItem: (name: string): string | null => {
    const value = localStorage.getItem(name);
    // console.debug('[CustomStorage] getItem:', { name, value, timestamp: new Date().toISOString() }); // Changed to debug/commented
    return value;
  },
  setItem: (name: string, value: any): void => {
    let valueToStore: string;
    // let valueForLogging: any = value; // Logging reduced

    if (typeof value === 'string') {
        valueToStore = value;
        // try { valueForLogging = JSON.parse(value); } catch (e) { /* ignore for logging */ }
    } else if (typeof value === 'object' && value !== null) {
        // console.warn(`[CustomStorage] setItem received an object directly. Stringifying. Name: ${name}`, value); // Keep as warn
        try {
            valueToStore = JSON.stringify(value);
            // valueForLogging = value;
        } catch (e) {
            console.error(`[CustomStorage] CRITICAL: Failed to stringify object in setItem. Cannot save. Name: ${name}`, e, 'Value:', value);
            return;
        }
    } else {
        console.error(`[CustomStorage] CRITICAL: setItem received unexpected value type: ${typeof value}. Cannot save. Name: ${name}`, 'Value:', value);
        return;
    }

    // console.debug('[CustomStorage] Studio tab saving state:', { name, /*loggedValue: valueForLogging,*/ rawValueToStore: valueToStore, timestamp: new Date().toISOString() }); // Changed to debug/commented

    isOriginTab = true; // For BroadcastChannel
    localStorageWriteInProgressByThisTab = true;
    localStorage.setItem(name, valueToStore);
    setTimeout(() => { localStorageWriteInProgressByThisTab = false; }, 0);

    if (channel) {
      try {
        // console.debug('[CustomStorage setItem] Attempting to post message. Message:', { storeKey: name, type: 'zustand_store_update' }); // Changed to debug/commented
        channel.postMessage({ storeKey: name, type: 'zustand_store_update' });
        // console.debug('[CustomStorage setItem] Message posted successfully.'); // Changed to debug/commented
        isOriginTab = false;
      } catch (e) {
        console.error('[CustomStorage setItem] Error during channel.postMessage:', e);
        isOriginTab = false;
      }
    } else {
      // console.warn('[CustomStorage setItem] Channel is null, cannot post message.'); // Keep as warn
      isOriginTab = false;
    }
    // setTimeout(() => { isOriginTab = false; }, 50); // Removed
  },
  removeItem: (name: string): void => {
    // console.debug('[CustomStorage] removeItem:', { name, timestamp: new Date().toISOString() }); // Changed to debug/commented
    isOriginTab = true; // For BroadcastChannel
    localStorageWriteInProgressByThisTab = true;
    localStorage.removeItem(name);
    setTimeout(() => { localStorageWriteInProgressByThisTab = false; }, 0);

    if (channel) {
      try {
        // console.debug('[CustomStorage removeItem] Attempting to post message. Message:', { storeKey: name, type: 'zustand_store_update' }); // Changed to debug/commented
        channel.postMessage({ storeKey: name, type: 'zustand_store_update' });
        // console.debug('[CustomStorage removeItem] Message posted successfully.'); // Changed to debug/commented
        isOriginTab = false;
      } catch (e) {
        console.error('[CustomStorage removeItem] Error during channel.postMessage:', e);
        isOriginTab = false;
      }
    } else {
      // console.warn('[CustomStorage removeItem] Channel is null, cannot post message.'); // Keep as warn
      isOriginTab = false;
    }
    // setTimeout(() => { isOriginTab = false; }, 50); // Removed
  },
};

if (channel) {
  // console.log('[CustomStorage] Attaching BroadcastChannel listeners. Channel object is valid.');
  channel.onmessage = (event: MessageEvent) => {
    // console.log('[CustomStorage BC.onmessage] Broadcast message received:', {
    //   data: event.data,
    //   origin: event.origin,
    //   timestamp: new Date().toISOString(),
    // });

    if (isOriginTab) {
      // console.debug('[CustomStorage BC.onmessage] Ignoring self-originated BroadcastChannel message.'); // Changed to debug/commented
      return;
    }

    if (!event.data || typeof event.data.type !== 'string' || typeof event.data.storeKey !== 'string') {
        console.warn('[CustomStorage BC.onmessage] Received malformed BroadcastChannel message or message of unknown type/storeKey:', event.data);
        return;
    }

    const { storeKey, type } = event.data;

    if (type === 'zustand_store_update' && storeKey === STORE_NAME) {
      // console.debug('[CustomStorage BC.onmessage] Received store update signal via BroadcastChannel. Triggering state application.'); // Changed to debug/commented
      applyStateFromLocalStorage();
    } else {
      // console.debug('[CustomStorage BC.onmessage] Received BroadcastChannel message not matching current store/type:', { storeKey, type }); // Changed to debug/commented
    }
  };

  channel.onmessageerror = (event: MessageEvent) => {
    console.error('[CustomStorage] BroadcastChannel ONMESSAGEERROR received:', {
      data: event.data,
      origin: event.origin,
      // lastEventId: event.lastEventId, // Common properties for error events
      // source: event.source,
      // ports: event.ports,
      errorEventDetails: event // Log the whole event for more details
    });
  };
  // console.log('[CustomStorage] BroadcastChannel onmessage and onmessageerror listeners attached.');
} else {
  console.warn('[CustomStorage] BroadcastChannel object is NULL or not supported. Cross-tab sync will be limited.');
}

// Add this towards the end of the file
window.addEventListener('storage', (event: StorageEvent) => {
  if (localStorageWriteInProgressByThisTab) {
    console.debug('[CustomStorage storage.event] Ignored event, likely self-originated by this tab.');
    return;
  }
  if (event.key === STORE_NAME) {
    // Basic log to confirm event is received, can be made more conditional later
    console.debug('[CustomStorage storage.event] Received storage event for store key:', event.key, 'URL:', event.url); // Changed to debug
    // For now, call applyStateFromLocalStorage directly.
    // We will need to be more selective later to avoid issues in TechnicalInterface.
    applyStateFromLocalStorage();
  }
});
console.log('[CustomStorage] Window storage event listener RE-ATTACHED for key:', STORE_NAME); // This one can stay as log for init