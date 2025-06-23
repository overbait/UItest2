// src/hooks/useDraftAnimation.ts
import { useState, useEffect, useMemo } from 'react';
import useDraftStore from '../store/draftStore';
import { LastDraftAction } from '../types/draft';

interface AnimationState {
  animationClass: string;
  imageOpacity: number;
}

const ANIMATION_DURATION_MS = 500; // 0.5s for initial glow and fade-in
const SUSTAINED_GLOW_DELAY_MS = ANIMATION_DURATION_MS; // Start sustain animation after initial one finishes
const RESET_ANIMATION_STATE_MS = SUSTAINED_GLOW_DELAY_MS + 2000; // 2s for sustain + initial

const useDraftAnimation = (
  itemName: string | null | undefined,
  itemType: 'civ' | 'map',
  currentStatus: 'picked' | 'banned' | 'default' | 'affected' | 'adminPicked' // Extended to include all known statuses
): AnimationState => {
  const lastDraftAction = useDraftStore(state => state.lastDraftAction);
  const hostColor = useDraftStore(state => state.hostColor); // Assuming player colors might influence glow
  const guestColor = useDraftStore(state => state.guestColor); // Assuming player colors might influence glow

  const [animationState, setAnimationState] = useState<AnimationState>({
    animationClass: '',
    imageOpacity: 1, // Default to visible, animation sequence will handle fade-in for active item
  });
  const [isActiveAction, setIsActiveAction] = useState(false);
  const [processedTimestamp, setProcessedTimestamp] = useState<number | null>(null);

  const itemMatchesLastAction = useMemo(() => {
    if (!itemName || !lastDraftAction) return false;
    return lastDraftAction.item === itemName && lastDraftAction.itemType === itemType;
  }, [itemName, itemType, lastDraftAction]);

  useEffect(() => {
    // Set initial image opacity based on status when component mounts or status changes (but not due to animation)
    // This is important if the item is already picked/banned when the component loads.
    // The animation will then override this if it's the *last action*.
    if (!isActiveAction) { // Only apply if not in an active animation sequence for this item
      if (currentStatus === 'picked' || currentStatus === 'banned' || currentStatus === 'adminPicked') {
        setAnimationState(prev => ({ ...prev, imageOpacity: 1 }));
      } else {
        setAnimationState(prev => ({ ...prev, imageOpacity: 1 })); // Default/affected should be visible
      }
    }
  }, [currentStatus, itemName, isActiveAction]);


  useEffect(() => {
    if (itemMatchesLastAction && lastDraftAction && lastDraftAction.timestamp !== processedTimestamp) {
      setProcessedTimestamp(lastDraftAction.timestamp);
      setIsActiveAction(true);
      const actionType = lastDraftAction.action; // 'pick' or 'ban'

      // Initial animation phase
      setAnimationState({
        animationClass: `animate-${actionType}-initial`, // e.g., animate-pick-initial
        imageOpacity: 0, // Start image as transparent for fade-in
      });

      // Start fade-in for image
      const imageFadeTimer = setTimeout(() => {
        setAnimationState(prev => ({
          ...prev,
          imageOpacity: 1,
        }));
      }, 50); // Slight delay to ensure CSS transition for opacity catches the change

      // Transition to sustained glow phase
      const sustainTimer = setTimeout(() => {
        setAnimationState(prev => ({ // Use prev to ensure we don't lose opacity if it was set
          ...prev,
          animationClass: `animate-${actionType}-sustain`, // e.g., animate-pick-sustain
        }));
      }, SUSTAINED_GLOW_DELAY_MS);

      // Timer to clear the "active action" state for this item
      const resetTimer = setTimeout(() => {
        setIsActiveAction(false);
        // The animationClass will be cleared by the !isActiveAction condition in the next render cycle,
        // or if another item becomes the lastDraftAction.
        // No need to explicitly set animationClass to '' here, as it might prematurely stop sustain transition
        // if the timing is tight. Let the natural state flow handle it.
      }, RESET_ANIMATION_STATE_MS); // Use the defined constant

      return () => {
        clearTimeout(imageFadeTimer);
        clearTimeout(sustainTimer);
        clearTimeout(resetTimer);
      };
    } else if (!itemMatchesLastAction && isActiveAction) {
      // This item was active, but a new lastDraftAction occurred for a *different* item.
      // Reset this item's animation immediately.
      setIsActiveAction(false);
      setAnimationState({ animationClass: '', imageOpacity: 1 }); // Reset and ensure visible
      // setProcessedTimestamp(null); // Not strictly needed here, as a new action for *this* item will have a new timestamp
    } else if (!isActiveAction) {
      // This item is not animating. Ensure its animationClass is clear.
      // The imageOpacity is managed by the other useEffect based on currentStatus.
      if (animationState.animationClass !== '') { // Only set state if it needs changing
        setAnimationState(prev => ({ ...prev, animationClass: '' }));
      }
    }
  }, [lastDraftAction, itemMatchesLastAction, isActiveAction, currentStatus, processedTimestamp, animationState.animationClass]);


  // If an item is not the lastDraftAction but is picked/banned,
  // it should still have a "normal" (50%) glow. This will be handled by
  // static CSS classes in the components themselves based on `currentStatus`.
  // The `animationClass` from this hook is primarily for the *newly updated* item.

  return animationState;
};

export default useDraftAnimation;
