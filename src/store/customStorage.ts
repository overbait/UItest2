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
    // Existing onmessage logic from the previous successful subtask:
    console.log('[CustomStorage] Broadcast message received:', {
      data: event.data, // Log the actual data received
      origin: event.origin, // Log origin for security/debugging
      timestamp: new Date().toISOString(),
    });

    if (isOriginTab) {
      console.log('[CustomStorage] Ignoring self-originated BroadcastChannel message.');
      return;
    }

    // Ensure event.data and event.data.type exist before trying to access them
    if (!event.data || typeof event.data.type !== 'string' || typeof event.data.storeKey !== 'string') {
        console.warn('[CustomStorage] Received malformed BroadcastChannel message or message of unknown type/storeKey:', event.data);
        return;
    }

    const { storeKey, type } = event.data;

    if (type === 'zustand_store_update' && storeKey === STORE_NAME) {
      console.log('[CustomStorage] Received store update signal. Manually applying relevant state from localStorage.');
      try {
        const rawStateFromStorage = localStorage.getItem(STORE_NAME);
        if (rawStateFromStorage) {
          const persistedWrapperState = JSON.parse(rawStateFromStorage);

          const actualAppState = persistedWrapperState.state;

          if (actualAppState) {
            const updates: Partial<typeof useDraftStore.getState> = {};

            if (actualAppState.hasOwnProperty('currentCanvases')) {
              updates.currentCanvases = JSON.parse(JSON.stringify(actualAppState.currentCanvases));
            }
            if (actualAppState.hasOwnProperty('activeCanvasId')) {
              updates.activeCanvasId = actualAppState.activeCanvasId;
            }
            if (actualAppState.hasOwnProperty('scores')) {
              updates.scores = JSON.parse(JSON.stringify(actualAppState.scores));
            }
            if (actualAppState.hasOwnProperty('hostName')) {
              updates.hostName = actualAppState.hostName;
            }
            if (actualAppState.hasOwnProperty('guestName')) {
              updates.guestName = actualAppState.guestName;
            }
            if (actualAppState.hasOwnProperty('layoutLastUpdated')) {
                updates.layoutLastUpdated = actualAppState.layoutLastUpdated;
            }

            if (Object.keys(updates).length > 0) {
                useDraftStore.setState(updates);
                console.log('[CustomStorage] Store selectively updated from localStorage. New relevant state parts:', JSON.parse(JSON.stringify(updates)));
            } else {
                console.log('[CustomStorage] No relevant state parts found in localStorage to update.');
            }

          } else {
            console.warn('[CustomStorage] Could not find .state property in parsed localStorage data, or actualAppState is null/undefined.');
          }
        } else {
          console.warn('[CustomStorage] Null value from localStorage.getItem, cannot update state.');
        }
      } catch (e) {
        console.error('[CustomStorage] Error during manual state application from localStorage:', e);
      }
    } else {
      console.log('[CustomStorage] Received BroadcastChannel message not matching current store/type:', { storeKey, type });
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