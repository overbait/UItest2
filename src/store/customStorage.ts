import { StateStorage } from 'zustand/middleware';
import useDraftStore from './draftStore'; // Import the store itself

const STORE_NAME = 'aoe2-draft-overlay-combined-storage-v1'; // Must match the 'name' in persist options
const BROADCAST_CHANNEL_NAME = 'zustand_store_sync_channel';
let channel: BroadcastChannel | null = null;

try {
  channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
} catch (e) {
  console.warn('BroadcastChannel API not available or failed to initialize. Cross-tab sync might be less responsive.', e);
}

// Flag to track if the current tab initiated the change
let isOriginTab = false;

export const customLocalStorageWithBroadcast: StateStorage = {
  getItem: (name: string): string | null => {
    const value = localStorage.getItem(name);
    console.log('[CustomStorage] getItem:', { name, value, timestamp: new Date().toISOString() });
    return value;
  },
  setItem: (name: string, value: string): void => {
    console.log('[CustomStorage] Studio tab saving state:', { name, value, timestamp: new Date().toISOString() });
    isOriginTab = true; // Mark this tab as the originator
    localStorage.setItem(name, value);
    if (channel) {
      try {
        console.log('[CustomStorage] Posting to BroadcastChannel:', { name, type: 'zustand_store_update', timestamp: new Date().toISOString() });
        channel.postMessage({ storeKey: name, type: 'zustand_store_update' });
      } catch (e) {
        console.error('Failed to post message to BroadcastChannel:', e);
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
        console.error('Failed to post message (remove) to BroadcastChannel:', e);
      }
    }
    setTimeout(() => { isOriginTab = false; }, 50);
  },
};

if (channel) {
  channel.onmessage = async (event: MessageEvent) => {
    console.log('[CustomStorage] BroadcastView tab receiving state:', {
      storeKey: event.data.storeKey,
      type: event.data.type,
      timestamp: new Date().toISOString(),
    });
    if (isOriginTab) {
      console.log('[CustomStorage] Ignoring self-originated BroadcastChannel message.');
      return; // Don't rehydrate if this tab caused the change
    }

    const { storeKey, type } = event.data;
    if (type === 'zustand_store_update' && storeKey === STORE_NAME) {
      console.log('[CustomStorage] Received store update notification from BroadcastChannel. Rehydrating.');
      try {
        await (useDraftStore.persist as any).rehydrate();
        console.log('[CustomStorage] Store rehydrated successfully:', {
          state: useDraftStore.getState(),
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.error('[CustomStorage] Error during manual rehydration:', e);
      }
    }
  };
  console.log('[CustomStorage] BroadcastChannel listener attached for rehydration.');
}