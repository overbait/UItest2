import { StateStorage } from 'zustand/middleware';
import useDraftStore from './draftStore'; // Import the store itself

const STORE_NAME = 'aoe2-draft-overlay-combined-storage-v1'; // Must match the 'name' in persist options
const BROADCAST_CHANNEL_NAME = 'zustand_store_sync_channel';
let channel: BroadcastChannel | null = null;

try {
  channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
} catch (e) {
  // BroadcastChannel might not be supported (e.g., some Safari versions, Node.js for testing)
  // Or blocked by security settings. Fallback to localStorage-only default behavior.
  console.warn('BroadcastChannel API not available or failed to initialize. Cross-tab sync might be less responsive.', e);
}

// Flag to track if the current tab initiated the change
let isOriginTab = false;

export const customLocalStorageWithBroadcast: StateStorage = {
  getItem: (name: string): string | null => {
    // console.log('[CustomStorage] getItem:', name);
    return localStorage.getItem(name);
  },
  setItem: (name: string, value: string): void => {
    // console.log('[CustomStorage] setItem:', name, 'value length:', value.length);
    isOriginTab = true; // Mark this tab as the originator
    localStorage.setItem(name, value);
    if (channel) {
      try {
        // Send a simple update notification, not the whole state
        // console.log('[CustomStorage] Posting to BroadcastChannel:', name);
        channel.postMessage({ storeKey: name, type: 'zustand_store_update' });
      } catch (e) {
        console.error('Failed to post message to BroadcastChannel:', e);
      }
    }
    // Reset the flag shortly after, so this tab can receive external messages later
    setTimeout(() => { isOriginTab = false; }, 50);
  },
  removeItem: (name: string): void => {
    // console.log('[CustomStorage] removeItem:', name);
    isOriginTab = true;
    localStorage.removeItem(name);
    if (channel) {
      try {
        channel.postMessage({ storeKey: name, type: 'zustand_store_update' }); // Also an update
      } catch (e) {
        console.error('Failed to post message (remove) to BroadcastChannel:', e);
      }
    }
    setTimeout(() => { isOriginTab = false; }, 50);
  },
};

if (channel) {
  channel.onmessage = async (event: MessageEvent) => {
    // console.log('[CustomStorage] Received from BroadcastChannel:', event.data);
    if (isOriginTab) {
      // console.log('[CustomStorage] Ignoring self-originated BroadcastChannel message.');
      return; // Don't rehydrate if this tab caused the change
    }

    const { storeKey, type } = event.data;
    if (type === 'zustand_store_update' && storeKey === STORE_NAME) {
      // console.log('[CustomStorage] Received store update notification from BroadcastChannel. Rehydrating.');
      try {
        // Access the persist API and call rehydrate
        // This assumes `useDraftStore.persist.rehydrate` is available and works as expected.
        // Zustand's persist middleware typically exposes this.
        await (useDraftStore.persist as any).rehydrate();
        // console.log('[CustomStorage] Store rehydrated successfully.');
      } catch (e) {
        console.error('[CustomStorage] Error during manual rehydration:', e);
      }
    }
  };
  // console.log('[CustomStorage] BroadcastChannel listener attached for rehydration.');
}
