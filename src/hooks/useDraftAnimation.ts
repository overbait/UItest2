// src/hooks/useDraftAnimation.ts
import { useMemo } from 'react';
import useDraftStore from '../store/draftStore';

interface DebugAnimationOutput {
  animationClass: string;
  imageOpacity: number;
  debugStatus?: string;
}

const useDraftAnimation_DEBUG = (
  itemName: string | null | undefined,
  itemType: 'civ' | 'map',
  currentStatus: string
): DebugAnimationOutput => {
  const lastDraftAction = useDraftStore(state => state.lastDraftAction);
  const activeCivDraftId = useDraftStore(state => state.civDraftId);
  const activeMapDraftId = useDraftStore(state => state.mapDraftId);
  // const isDraftContextActive = itemType === 'civ' ? !!activeCivDraftId : !!activeMapDraftId;
  // Refined isDraftContextActive: also check if the lastDraftAction matches the itemType's active draft ID
  let isContextActuallyActiveForThisItemTypeInLastAction = false;
  if (lastDraftAction) {
    if (lastDraftAction.itemType === 'civ' && activeCivDraftId && lastDraftAction.id === activeCivDraftId) {
      isContextActuallyActiveForThisItemTypeInLastAction = true;
    } else if (lastDraftAction.itemType === 'map' && activeMapDraftId && lastDraftAction.id === activeMapDraftId) {
      isContextActuallyActiveForThisItemTypeInLastAction = true;
    }
    // If lastDraftAction has no ID, or ID doesn't match active draft, context is not active for it.
    // This handles cases where lastDraftAction might be from a *different* draft that was previously active.
  }
   // A simpler check for general draft activity for the item's type
  const isGeneralDraftContextActive = itemType === 'civ' ? !!activeCivDraftId : !!activeMapDraftId;


  const itemIsTheLastAction = useMemo(() => {
    if (!itemName || !lastDraftAction) {
      return false;
    }
    // Original check:
    // return lastDraftAction.item === itemName && lastDraftAction.itemType === itemType;

    // Refined check: Ensure the lastDraftAction is relevant to an *active* draft of the item's type
    // And that the lastDraftAction's specific draft ID (if available) matches the currently active draft ID for that type.
    let lastActionIsRelevant = false;
    if (lastDraftAction.item === itemName && lastDraftAction.itemType === itemType) {
      if (itemType === 'civ' && activeCivDraftId) {
        // If lastDraftAction doesn't have an ID, assume it's for the current civ draft if one is active.
        // If it *does* have an ID, it must match.
        lastActionIsRelevant = !lastDraftAction.id || lastDraftAction.id === activeCivDraftId;
      } else if (itemType === 'map' && activeMapDraftId) {
        lastActionIsRelevant = !lastDraftAction.id || lastDraftAction.id === activeMapDraftId;
      }
    }
    return lastActionIsRelevant;

  }, [itemName, itemType, lastDraftAction, activeCivDraftId, activeMapDraftId]);

  // Conceptual logging
  // console.log(`[DEBUG_HOOK] Item: ${itemName}, Type: ${itemType}, Status: ${currentStatus}, LdA: ${lastDraftAction?.itemType === itemType ? lastDraftAction?.item : 'N/A'}, IsLdAForActiveDraft: ${itemIsTheLastAction}, GenCtxActive: ${isGeneralDraftContextActive}`);

  let targetOpacity = 1;
  // For this debug step, we are NOT implementing the affected state opacity yet to isolate the disappearance.
  // if (currentStatus === 'affected' && isGeneralDraftContextActive) { // Only apply affected if context is active
  //   targetOpacity = 0.8; // Will be for step 3 of main plan
  // }


  if (itemIsTheLastAction) { // itemIsTheLastAction now implies context is active and relevant
    return {
      animationClass: 'debugLastActionItem',
      imageOpacity: 1, // Always visible if it's the last action
      debugStatus: `DEBUG_LAST_ACTION (Status: ${currentStatus})`,
    };
  }

  return {
    animationClass: '',
    imageOpacity: targetOpacity,
    debugStatus: `DEBUG_NORMAL (Status: ${currentStatus})`,
  };
};

export default useDraftAnimation_DEBUG;
