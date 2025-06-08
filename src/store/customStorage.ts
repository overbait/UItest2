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
        console.log('[CustomStorage] Posting to BroadcastChannel:', { name, type: 'zustand_store_update', timestamp: new Date().toISOString() });
        channel.postMessage({ storeKey: name, type: 'zustand_store_update' });
      } catch (e) {
        console.error('[CustomStorage] Failed to post message to BroadcastChannel:', e);
      }
    }
    setTimeout(() => { isOriginTab = false; }, 50);
  },
  removeItem: (name: string): void => {
    console.log('[CustomStorage] removeItem:', { name, timestamp: new Date().toISOString() });
    isOriginTab = true;
    localStorage.removeItem(name);
    if (channel) {
      try {
        channel.postMessage({ storeKey: name, type: 'zustand_store_update' });
      } catch (e) {
        console.error('[CustomStorage] Failed to post message to BroadcastChannel for remove:', e);
      }
    }
    setTimeout(() => { isOriginTab = false; }, 50);
  },
};

if (channel) {
  channel.onmessage = async (event: any) => {
    console.log('[CustomStorage] BroadcastView received state:', {
      storeKey: event.data.storeKey,
      type: event.data.type,
      timestamp: new Date().toISOString(),
    });
    if (isOriginTab) {
      console.log('[CustomStorage] Ignoring self-originated BroadcastChannel message.');
      return;
    }

    const { storeKey, type } = event.data;
    if (type === 'zustand_store_update' && storeKey === STORE_NAME) {
      console.log('[CustomStorage] Received store update from BroadcastChannel. Rehydrating.');
      try {
        await (useDraftStore.persist as any).rehydrate();
        console.log('[CustomStorage] Store rehydrated successfully:', {
          state: JSON.parse(JSON.stringify(useDraftStore.getState())), // Deep copy for logging
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.error('[CustomStorage] Error during rehydration:', e);
      }
    }
  };
  console.log('[CustomStorage] BroadcastChannel listener attached for rehydration.');
}