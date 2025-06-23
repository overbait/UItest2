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
const ANIMATION_SPREAD_RETURN_DURATION_MS = 2000; // This is for the CSS transition on the base class when animation class is removed
// Total time the item is considered "actively animating" by the hook for the initial spread increase part
const ACTIVE_ANIMATION_DURATION_MS = ANIMATION_SPREAD_INCREASE_DURATION_MS;

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
  const [isAnimatingThisItem, setIsAnimatingThisItem] = useState(false); // True during the ACTIVE_ANIMATION_DURATION_MS

  const itemIsTheLastAction = useMemo(() => {
    if (!itemName || !lastDraftAction) return false;
    if (lastDraftAction.itemType === 'civ' && !activeCivDraftId) return false;
    if (lastDraftAction.itemType === 'map' && !activeMapDraftId) return false;
    return lastDraftAction.item === itemName && lastDraftAction.itemType === itemType;
  }, [itemName, itemType, lastDraftAction, activeCivDraftId, activeMapDraftId]);

  useEffect(() => {
    // Guard for stale lastDraftAction if context is not active for this item type
    if (!isDraftContextActive && lastDraftAction && lastDraftAction.item === itemName && lastDraftAction.itemType === itemType) {
      if (animationClass !== '') setAnimationClass('');
      if (imageOpacity !== 1) setImageOpacity(1);
      if (processedTimestamp === lastDraftAction.timestamp) {
        setProcessedTimestamp(null);
      }
      if(isAnimatingThisItem) setIsAnimatingThisItem(false);
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
        // Target opacity for fade-in should consider if item is also affected
        setImageOpacity(currentStatus === 'affected' ? 0.8 : 1);
      }, 50); // CSS transition for opacity is IMAGE_FADE_IN_DURATION_MS

      setAnimationClass(`animate-spread-increase-${lastDraftAction!.action}`);

      const endActiveIncreasePhaseTimer = setTimeout(() => {
        setIsAnimatingThisItem(false);
        // When isAnimatingThisItem becomes false, the `else if (!isAnimatingThisItem)` block below
        // will clear the `animate-spread-increase-*` class in the next render,
        // allowing the CSS transition on the base element to animate the glow back to normal.
      }, ACTIVE_ANIMATION_DURATION_MS); // Active part of animation (increase phase)

      return () => {
        clearTimeout(fadeInTimer);
        clearTimeout(endActiveIncreasePhaseTimer);
      };
    } else if (isAnimatingThisItem && !itemIsTheLastAction) {
      // Interrupted: This item WAS in its active animation phase, but is no longer the last action.
      setIsAnimatingThisItem(false); // Stop its active animation phase
      setAnimationClass(''); // Immediately remove animation class
      setImageOpacity(targetOpacity); // Set to its correct current non-animating opacity
    } else if (!isAnimatingThisItem) {
      // Not actively animating (initial state, or after active animation phase ended, or interrupted and reset).
      setImageOpacity(targetOpacity);
      // If animationClass was for spread increase and item is no longer in active animation, clear it.
      // This allows the CSS transition on the base class to take over for the return glow.
      if (animationClass.startsWith('animate-spread-increase-')) {
        setAnimationClass('');
      } else if (animationClass !== '' ) { // Clear any other potentially stale animation class
        setAnimationClass('');
      }
    }
  }, [
    itemName, itemType, lastDraftAction, currentStatus,
    processedTimestamp, isAnimatingThisItem, itemIsTheLastAction,
    animationClass, isDraftContextActive, imageOpacity
  ]);

  return { animationClass, imageOpacity };
};

export default useDraftAnimation;
