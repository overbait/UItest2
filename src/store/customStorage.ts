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

// Helper function to apply state updates from localStorage
const applyStateFromLocalStorage = () => {
  console.log('[CustomStorage applyState] Attempting to apply state from localStorage.');
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
          console.log('[CustomStorage applyState] Store selectively updated from localStorage. Applied properties:', Object.keys(updates));
        } else {
          console.log('[CustomStorage applyState] No relevant own properties found in stored state to apply, or actualAppState was empty.');
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
    let parsedValue = null;
    try {
      parsedValue = value ? JSON.parse(value) : null;
    } catch (e) {
      console.error('[CustomStorage] Failed to parse getItem value:', { name, value, error: e });
    }
    console.log('[CustomStorage] getItem:', { name, value: parsedValue, rawValue: value, timestamp: new Date().toISOString() });
    return value;
  },
  setItem: (name: string, value: any): void => {
    let valueToStore: string;
    let valueForLogging: any = value; // Default to actual value for logging if it's already an object

    if (typeof value === 'string') {
        valueToStore = value;
        try {
            // If it's a string, try to parse it for structured logging
            valueForLogging = JSON.parse(value);
        } catch (e) {
            // If parsing fails, valueForLogging remains the original string.
            // This is not an error for setItem itself, as it can store any string.
            // console.warn(`[CustomStorage] setItem received a string value that is not valid JSON (this is okay, just for logging): ${name}`, e);
        }
    } else if (typeof value === 'object' && value !== null) {
        console.warn(`[CustomStorage] setItem received an object directly. Stringifying. This may indicate an issue upstream (e.g., persist middleware). Name: ${name}`, value);
        try {
            valueToStore = JSON.stringify(value);
            // valueForLogging is already the object, which is good for logging.
        } catch (e) {
            console.error(`[CustomStorage] CRITICAL: Failed to stringify object in setItem. Cannot save. Name: ${name}`, e, 'Value:', value);
            return;
        }
    } else {
        console.error(`[CustomStorage] CRITICAL: setItem received unexpected value type: ${typeof value}. Cannot save. Name: ${name}`, 'Value:', value);
        return;
    }

    // The previous rawValue in log was 'value' itself, now it's 'valueToStore'
    console.log('[CustomStorage] Studio tab saving state:', { name, loggedValue: valueForLogging, rawValueToStore: valueToStore, timestamp: new Date().toISOString() });

    isOriginTab = true;
    localStorage.setItem(name, valueToStore);

    if (channel) {
      try {
        console.log('[CustomStorage setItem] Attempting to post message. Channel valid: true. Message:', { storeKey: name, type: 'zustand_store_update' });
        channel.postMessage({ storeKey: name, type: 'zustand_store_update' });
        console.log('[CustomStorage setItem] Message posted successfully.');
      } catch (e) {
        console.error('[CustomStorage setItem] Error during channel.postMessage:', e);
      }
    } else {
      console.warn('[CustomStorage setItem] Channel is null, cannot post message.');
    }
    setTimeout(() => { isOriginTab = false; }, 50);
  },
  removeItem: (name: string): void => {
    console.log('[CustomStorage] removeItem:', { name, timestamp: new Date().toISOString() });
    isOriginTab = true;
    localStorage.removeItem(name);
    if (channel) {
      try {
        console.log('[CustomStorage removeItem] Attempting to post message. Channel valid: true. Message:', { storeKey: name, type: 'zustand_store_update' });
        channel.postMessage({ storeKey: name, type: 'zustand_store_update' });
        console.log('[CustomStorage removeItem] Message posted successfully.');
      } catch (e) {
        console.error('[CustomStorage removeItem] Error during channel.postMessage:', e);
      }
    } else {
      console.warn('[CustomStorage removeItem] Channel is null, cannot post message.');
    }
    setTimeout(() => { isOriginTab = false; }, 50);
  },
};

if (channel) {
  console.log('[CustomStorage] Attaching BroadcastChannel listeners. Channel object is valid.');
  channel.onmessage = (event: MessageEvent) => {
    console.log('[CustomStorage BC.onmessage] Broadcast message received:', {
      data: event.data,
      origin: event.origin,
      timestamp: new Date().toISOString(),
    });

    if (isOriginTab) {
      console.log('[CustomStorage BC.onmessage] Ignoring self-originated BroadcastChannel message.');
      return;
    }

    if (!event.data || typeof event.data.type !== 'string' || typeof event.data.storeKey !== 'string') {
        console.warn('[CustomStorage BC.onmessage] Received malformed BroadcastChannel message or message of unknown type/storeKey:', event.data);
        return;
    }

    const { storeKey, type } = event.data;

    if (type === 'zustand_store_update' && storeKey === STORE_NAME) {
      console.log('[CustomStorage BC.onmessage] Received store update signal via BroadcastChannel. Triggering state application.');
      applyStateFromLocalStorage();
    } else {
      console.log('[CustomStorage BC.onmessage] Received BroadcastChannel message not matching current store/type:', { storeKey, type });
    }
  };

  channel.onmessageerror = (event: MessageEvent) => {
    console.error('[CustomStorage] BroadcastChannel ONMESSAGEERROR received:', {
      data: event.data,
      origin: event.origin,
      lastEventId: event.lastEventId, // Common properties for error events
      source: event.source,
      ports: event.ports,
      errorEventDetails: event // Log the whole event for more details
    });
  };
  console.log('[CustomStorage] BroadcastChannel onmessage and onmessageerror listeners attached.');
} else {
  console.error('[CustomStorage] BroadcastChannel object is NULL. Listeners not attached. Cross-tab sync will not work.');
}

// Add this towards the end of the file
window.addEventListener('storage', (event: StorageEvent) => {
  if (event.key === STORE_NAME) {
    console.log('[CustomStorage storage.event] Received storage event for store key:', event.key,
                'URL:', event.url
               );
    applyStateFromLocalStorage();
  }
});
console.log('[CustomStorage] Window storage event listener attached for key:', STORE_NAME);