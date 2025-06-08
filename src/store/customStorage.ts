import { StateStorage, StorageValue } from 'zustand/middleware';

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

// Flag to prevent processing self-emitted storage events if we dispatch synthetic ones
let isSelfTriggered = false;

export const customLocalStorageWithBroadcast: StateStorage = {
  getItem: (name: string): string | null | Promise<string | null> => {
    // console.log('[CustomStorage] getItem:', name);
    return localStorage.getItem(name);
  },
  setItem: (name: string, value: string): void | Promise<void> => {
    // console.log('[CustomStorage] setItem:', name, 'value length:', value.length);
    isSelfTriggered = true; // Mark that this change originates from this tab
    localStorage.setItem(name, value);
    if (channel) {
      try {
        // console.log('[CustomStorage] Posting to BroadcastChannel:', name);
        channel.postMessage({ key: name, newValue: value }); // Send key and new value
      } catch (e) {
        console.error('Failed to post message to BroadcastChannel:', e);
        // Potentially close and nullify channel if it's broken
        // channel?.close(); channel = null;
      }
    }
    // Reset flag after a short delay, assuming storage event (if any) would have fired
    setTimeout(() => { isSelfTriggered = false; }, 50);
  },
  removeItem: (name: string): void | Promise<void> => {
    // console.log('[CustomStorage] removeItem:', name);
    isSelfTriggered = true;
    localStorage.removeItem(name);
    if (channel) {
      try {
        channel.postMessage({ key: name, newValue: null }); // Indicate removal
      } catch (e) {
        console.error('Failed to post message (remove) to BroadcastChannel:', e);
      }
    }
    setTimeout(() => { isSelfTriggered = false; }, 50);
  },
};

if (channel) {
  channel.onmessage = (event: MessageEvent) => {
    // console.log('[CustomStorage] Received from BroadcastChannel:', event.data);
    if (isSelfTriggered) {
      // console.log('[CustomStorage] Ignoring self-triggered message from BroadcastChannel');
      return;
    }

    const { key, newValue } = event.data;
    if (typeof key === 'string') {
      // Dispatch a synthetic storage event to trigger Zustand's persist middleware listener
      // This makes Zustand re-read from localStorage and update the state.
      // Note: The actual newValue in the event might not be perfectly what Zustand expects
      // if it does complex parsing, but the event itself is the trigger.
      // The key being STORE_NAME is important for Zustand's listener.

      // console.log(`[CustomStorage] Dispatching synthetic storage event for key: ${STORE_NAME} due to BroadcastChannel message for actual key: ${key}`);

      // We need to simulate the event as if the entire store state string changed
      // because Zustand's default listener for 'storage' event on localStorage
      // expects the event.key to be the store name.

      // Get the current persisted string from localStorage to pass as newValue
      const fullStoreState = localStorage.getItem(STORE_NAME);

      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORE_NAME, // Zustand's persist middleware listens for changes to its main storage key
          newValue: fullStoreState, // The new state of the entire persisted object
          oldValue: null, // old value is not strictly necessary for Zustand to re-check
          storageArea: localStorage,
          url: window.location.href,
        })
      );
    }
  };
  // console.log('[CustomStorage] BroadcastChannel listener attached.');
}
