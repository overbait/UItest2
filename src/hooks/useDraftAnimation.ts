// src/hooks/useDraftAnimation.ts
import { useState, useEffect, useMemo } from 'react';
import useDraftStore from '../store/draftStore';
import { LastDraftAction } from '../types/draft';

interface AnimationOutput {
  animationClass: string;
  imageOpacity: number;
}

// Timings for new glow spread animation:
const ANIMATION_SPREAD_INCREASE_DURATION_MS = 2000;
const ANIMATION_SPREAD_RETURN_DURATION_MS = 2000;
// Total time the item is considered in a "special animated glow state" by the hook.
// The hook will apply 'increase' for 2s. Then remove it. The CSS handles the return transition.
// So, isAnimatingThisItem could be true for just the increase phase, or the whole 4s.
// Let's make isAnimatingThisItem true for the whole 4s for clarity.
const TOTAL_ANIMATED_GLOW_DURATION_MS = ANIMATION_SPREAD_INCREASE_DURATION_MS + ANIMATION_SPREAD_RETURN_DURATION_MS;

// Image fade-in duration (distinct from glow)
const IMAGE_FADE_IN_DURATION_MS = 500; // Standard 0.5s fade for images, happens concurrently

const useDraftAnimation = (
  itemName: string | null | undefined,
  itemType: 'civ' | 'map',
  currentStatus: 'picked' | 'banned' | 'default' | 'affected' | 'adminPicked'
): AnimationOutput => {
  const lastDraftAction = useDraftStore(state => state.lastDraftAction);
  const activeCivDraftId = useDraftStore(state => state.civDraftId);
  const activeMapDraftId = useDraftStore(state => state.mapDraftId);
  const isDraftContextActive = itemType === 'civ' ? !!activeCivDraftId : !!activeMapDraftId;

  const [animationClass, setAnimationClass] = useState('');
  const [imageOpacity, setImageOpacity] = useState(1);
  const [processedTimestamp, setProcessedTimestamp] = useState<number | null>(null);
  const [isAnimatingThisItem, setIsAnimatingThisItem] = useState(false);

  const itemIsTheLastAction = useMemo(() => {
    if (!itemName || !lastDraftAction) return false;
    if (lastDraftAction.itemType === 'civ' && !activeCivDraftId) return false;
    if (lastDraftAction.itemType === 'map' && !activeMapDraftId) return false;
    return lastDraftAction.item === itemName && lastDraftAction.itemType === itemType;
  }, [itemName, itemType, lastDraftAction, activeCivDraftId, activeMapDraftId]);

  useEffect(() => {
    if (!isDraftContextActive && lastDraftAction) {
      if (animationClass !== '') setAnimationClass('');
      if (imageOpacity !== 1) setImageOpacity(1);
      if (lastDraftAction.item === itemName && lastDraftAction.itemType === itemType && processedTimestamp === lastDraftAction.timestamp) {
        setProcessedTimestamp(null);
      }
      return;
    }

    const shouldStartAnimation =
      itemIsTheLastAction &&
      lastDraftAction &&
      lastDraftAction.timestamp !== processedTimestamp &&
      isDraftContextActive;

    let targetOpacity = 1;
    if (currentStatus === 'affected') {
      targetOpacity = 0.8;
    }

    if (shouldStartAnimation) {
      setIsAnimatingThisItem(true);
      setProcessedTimestamp(lastDraftAction!.timestamp);

      setImageOpacity(0);
      const fadeInTimer = setTimeout(() => {
        setImageOpacity(currentStatus === 'affected' ? 0.8 : 1);
      }, 50);

      // Apply class for glow increase animation
      setAnimationClass(`animate-spread-increase-${lastDraftAction!.action}`);

      // Timer to remove the "increase" class. The return to normal glow will be handled by CSS transition.
      // However, to make isAnimatingThisItem cover the whole 4s period:
      const removeIncreaseClassTimer = setTimeout(() => {
        // This timeout is effectively just for conceptual phase change.
        // The actual removal of the class will happen when isAnimatingThisItem becomes false.
        // For now, let's not change class here, but let endAnimationTimer handle full cycle.
        // If we wanted a 2-stage class system:
        // setAnimationClass(`animate-spread-return-${lastDraftAction!.action}`);
      }, ANIMATION_SPREAD_INCREASE_DURATION_MS);


      const endAnimationTimer = setTimeout(() => {
        setIsAnimatingThisItem(false);
      }, TOTAL_ANIMATED_GLOW_DURATION_MS); // After 4 seconds total

      return () => {
        clearTimeout(fadeInTimer);
        clearTimeout(removeIncreaseClassTimer);
        clearTimeout(endAnimationTimer);
      };
    } else if (isAnimatingThisItem && !itemIsTheLastAction) {
      // Interrupted
      setIsAnimatingThisItem(false);
      setAnimationClass('');
      setImageOpacity(targetOpacity);
    } else if (!isAnimatingThisItem) {
      // Not animating or animation ended
      setImageOpacity(targetOpacity);
      if (animationClass !== '' && !animationClass.startsWith('animate-spread-increase-')) {
        // If it had a 'return' class or something else, clear it.
        // Or, more simply, if it's not animating, it should have no *animation specific* class.
        setAnimationClass('');
      } else if (animationClass.startsWith('animate-spread-increase-') && !itemIsTheLastAction) {
        // This case means an animation was active, it finished its increase phase,
        // but before isAnimatingThisItem was set to false by its own timer, another item became last action.
        // So, it should also revert.
         setAnimationClass('');
      }
       // If animationClass is 'animate-spread-increase-*' and isAnimatingThisItem is false (due to endAnimationTimer),
       // this block will run, and animationClass will be set to ''. This removal triggers CSS transition back to normal.
       if (animationClass !== '' && !isAnimatingThisItem) {
           setAnimationClass('');
       }
    }
  }, [
    itemName, itemType, lastDraftAction, currentStatus,
    processedTimestamp, isAnimatingThisItem, itemIsTheLastAction,
    animationClass, isDraftContextActive, imageOpacity // Added imageOpacity
  ]);

  return { animationClass, imageOpacity };
};

export default useDraftAnimation;
