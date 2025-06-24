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
const applyStateFromLocalStorage = (sourceTabIdentifier?: string) => {
  // console.log('[CustomStorage applyState] Attempting to apply state from localStorage.');
  try {
    const rawStateFromStorage = localStorage.getItem(STORE_NAME);
    if (rawStateFromStorage) {
      const persistedWrapperState = JSON.parse(rawStateFromStorage);
      // Assuming {state: actualAppState, version: ...} structure based on prior log analysis
      const actualAppState = persistedWrapperState.state;

      if (actualAppState && typeof actualAppState === 'object') {
        const updates: Partial<ReturnType<typeof useDraftStore.getState>> = {};
        const previousActivePresetId = useDraftStore.getState().activePresetId; // Get previous value

        // Define properties to sync from the persisted state
        const propertiesToSync: (keyof typeof actualAppState)[] = [
          // Original properties
          'currentCanvases', 'activeCanvasId', 'scores', 'hostName',
          'guestName', 'layoutLastUpdated', 'civDraftId', 'mapDraftId',
          'boxSeriesFormat', 'boxSeriesGames', 'activePresetId',

          // Added properties
          'hostColor', 'guestColor', 'hostFlag', 'guestFlag',
          'aoe2cmRawDraftOptions',
          'civPicksHost', 'civBansHost', 'civPicksGuest', 'civBansGuest', 'civPicksGlobal',
          'mapPicksHost', 'mapBansHost', 'mapPicksGuest', 'mapBansGuest', 'mapPicksGlobal', 'mapBansGlobal',
          'forceMapPoolUpdate',
          'draftIsLikelyFinished', 'isNewSessionAwaitingFirstDraft',
          'socketStatus', 'socketError', 'socketDraftType'
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
          if (sourceTabIdentifier === 'BroadcastView via StorageEvent') {
            console.log(`[CustomStorage applyState - ${sourceTabIdentifier}] Updates to be applied:`, JSON.parse(JSON.stringify(updates)));
            if (updates.hasOwnProperty('currentCanvases') || updates.hasOwnProperty('activeCanvasId')) {
              console.log(`[CustomStorage applyState - ${sourceTabIdentifier}] Canvas-related data in updates:`, {
                currentCanvases: updates.currentCanvases,
                activeCanvasId: updates.activeCanvasId
              });
            } else {
              console.log(`[CustomStorage applyState - ${sourceTabIdentifier}] No canvas-related (currentCanvases, activeCanvasId) data in this specific update batch.`);
            }
          }
          useDraftStore.setState(updates);
          // console.debug('[CustomStorage applyState] Store selectively updated from localStorage. Applied properties:', Object.keys(updates)); // Changed to debug/commented

          // Check if activePresetId changed and dispatch event
          if (sourceTabIdentifier && sourceTabIdentifier !== '' && updates.hasOwnProperty('activePresetId')) {
            const newActivePresetId = updates.activePresetId;
            if (newActivePresetId !== previousActivePresetId) {
              console.log(`[CustomStorage applyState] activePresetId changed from "${previousActivePresetId}" to "${newActivePresetId}". Dispatching 'externalPresetChange' event.`);
              window.dispatchEvent(new CustomEvent('externalPresetChange', { detail: { oldId: previousActivePresetId, newId: newActivePresetId } }));
            }
          }

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

    // console.debug('[CustomStorage] Studio tab saving state:', { name, /*loggedValue: valueForLogging,*/ rawValueToStore: valueToStore, timestamp: new Date().toISOString() });

    console.log(
      '[CustomStorage setItem] Attempting to write to localStorage. Key:', name,
      // Log a summary of the value, especially focusing on the part that should change
      // For example, try to find the active layout and its number of canvases/elements
      // This requires parsing valueToStore if it's a stringified object.
      'Value being written (summary - check for layout changes):', valueToStore.substring(0, 500) + "..." // Log a snippet first
    );

    try {
      const parsedValueForLog = JSON.parse(valueToStore);
      if (parsedValueForLog && parsedValueForLog.state && parsedValueForLog.state.savedStudioLayouts && parsedValueForLog.state.activeStudioLayoutId) {
        const activeLayout = parsedValueForLog.state.savedStudioLayouts.find(l => l.id === parsedValueForLog.state.activeStudioLayoutId);
        if (activeLayout && activeLayout.canvases) {
          const activeCanvasInLayout = activeLayout.canvases.find(c => c.id === activeLayout.activeCanvasId);
          console.log(
            '[CustomStorage setItem] Parsed value details: ActiveLayoutID:', parsedValueForLog.state.activeStudioLayoutId,
            'ActiveCanvasID in Layout:', activeLayout.activeCanvasId,
            'Total Canvases in Active Layout:', activeLayout.canvases.length,
            'Elements in Active Canvas of Layout:', activeCanvasInLayout ? activeCanvasInLayout.layout.length : 'N/A'
          );
        } else {
          console.log('[CustomStorage setItem] Parsed value, but active layout or its canvases not found as expected.');
        }
      } else {
         console.log('[CustomStorage setItem] Parsed value does not have expected structure (state.savedStudioLayouts or state.activeStudioLayoutId).');
      }
    } catch (e) {
      console.warn('[CustomStorage setItem] Could not parse valueToStore for detailed logging:', e);
    }

    localStorageWriteInProgressByThisTab = true;
    localStorage.setItem(name, valueToStore);
    setTimeout(() => { localStorageWriteInProgressByThisTab = false; }, 0); // Reset for storage event

    if (channel) {
      isOriginTab = true; // Set BEFORE postMessage
      try {
        // console.debug('[CustomStorage setItem] Attempting to post message. Message:', { storeKey: name, type: 'zustand_store_update' });
        channel.postMessage({ storeKey: name, type: 'zustand_store_update' });
        // console.debug('[CustomStorage setItem] Message posted successfully.');
      } catch (e) {
        console.error('[CustomStorage setItem] Error during channel.postMessage:', e);
      } finally {
        isOriginTab = false; // Reset AFTER postMessage, in a finally block
      }
    } else {
      console.warn('[CustomStorage setItem] Channel is null, cannot post message.');
      // isOriginTab = false; // Not strictly necessary here if channel is null, as onmessage won't fire
    }
  },
  removeItem: (name: string): void => {
    // console.debug('[CustomStorage] removeItem:', { name, timestamp: new Date().toISOString() });

    localStorageWriteInProgressByThisTab = true;
    localStorage.removeItem(name);
    setTimeout(() => { localStorageWriteInProgressByThisTab = false; }, 0); // Reset for storage event

    if (channel) {
      isOriginTab = true; // Set BEFORE postMessage
      try {
        // console.debug('[CustomStorage removeItem] Attempting to post message. Message:', { storeKey: name, type: 'zustand_store_update' });
        channel.postMessage({ storeKey: name, type: 'zustand_store_update' });
        // console.debug('[CustomStorage removeItem] Message posted successfully.');
      } catch (e) {
        console.error('[CustomStorage removeItem] Error during channel.postMessage:', e);
      } finally {
        isOriginTab = false; // Reset AFTER postMessage, in a finally block
      }
    } else {
      console.warn('[CustomStorage removeItem] Channel is null, cannot post message.');
      // isOriginTab = false; // Not strictly necessary here
    }
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
      // For BroadcastChannel updates, we don't have a direct 'BroadcastView' context like in storage event
      // So, we pass a generic identifier or none at all.
      // console.debug('[CustomStorage BC.onmessage] Received store update signal via BroadcastChannel. Triggering state application.'); // Changed to debug/commented
      applyStateFromLocalStorage('BroadcastChannelEvent');
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
  if (event.key !== STORE_NAME) {
    return; // Only process events for our store
  }

  // Controller tabs should ignore storage events to prevent self-update loops.
  // They rely on BroadcastChannel for updates from other tabs.
  // IS_BROADCAST_STUDIO will be added as a flag in the next plan step.
  if ((window as any).IS_TECHNICAL_INTERFACE || (window as any).IS_BROADCAST_STUDIO) {
    console.debug('[CustomStorage storage.event] Event ignored: running in a controller tab (TechnicalInterface or BroadcastStudio).');
    return;
  }

  // The localStorageWriteInProgressByThisTab check is a general safeguard,
  // primarily for tabs that might both write and listen to storage events.
  if (localStorageWriteInProgressByThisTab) {
    console.debug('[CustomStorage storage.event] Event ignored: localStorageWriteInProgressByThisTab is true in this listening tab.');
    return;
  }

  const isBroadcastViewContext = (window as any).IS_BROADCAST_VIEW === true;
  let sourceIdentifier = isBroadcastViewContext ? 'BroadcastView via StorageEvent' : 'OtherListener via StorageEvent';

  console.debug(`[CustomStorage storage.event - ${sourceIdentifier}] Received event. Applying state.`);

  if (isBroadcastViewContext) {
    try {
      const rawState = localStorage.getItem(STORE_NAME);
      console.log(`[CustomStorage storage.event - ${sourceIdentifier}] Raw data from localStorage:`, rawState ? rawState.substring(0, 300) + "..." : "null"); // Log snippet
      if (rawState) {
        const parsedForLog = JSON.parse(rawState);
        console.log(`[CustomStorage storage.event - ${sourceIdentifier}] Parsed state for logging:`, {
          stateExists: !!parsedForLog.state,
          currentCanvasesCount: parsedForLog.state?.currentCanvases?.length,
          activeCanvasId: parsedForLog.state?.activeCanvasId
        });
      }
    } catch (e) {
      console.error(`[CustomStorage storage.event - ${sourceIdentifier}] Error parsing localStorage for logging:`, e);
    }
  }
  applyStateFromLocalStorage(sourceIdentifier); // Pass the identifier
});
console.log('[CustomStorage] Window storage event listener RE-ATTACHED for key:', STORE_NAME); // This one can stay as log for init