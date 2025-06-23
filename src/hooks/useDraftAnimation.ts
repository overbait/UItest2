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
const TOTAL_ANIMATED_GLOW_DURATION_MS = ANIMATION_SPREAD_INCREASE_DURATION_MS; // Hook applies "increase" class for this duration. Return is passive.
// Correction: isAnimatingThisItem will be true for the "increase" phase.
// The return phase is handled by CSS transition when the class is removed.
const ACTIVE_ANIMATION_DURATION_MS = ANIMATION_SPREAD_INCREASE_DURATION_MS; // 2000ms. Hook actively manages class for this long.

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
    // Guard for stale lastDraftAction if context is not active
    if (!isDraftContextActive && lastDraftAction && lastDraftAction.item === itemName && lastDraftAction.itemType === itemType) {
      if (animationClass !== '') setAnimationClass('');
      if (imageOpacity !== 1) setImageOpacity(1); // Default to fully visible
      if (processedTimestamp === lastDraftAction.timestamp) {
        setProcessedTimestamp(null); // Allow re-processing if context becomes active again
      }
      if(isAnimatingThisItem) setIsAnimatingThisItem(false); // Stop any active animation
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

      setAnimationClass(`animate-spread-increase-${lastDraftAction!.action}`);

      // This timer is to manage the duration of the "isAnimatingThisItem" state.
      // After this duration, the item is no longer considered "actively animating the increase".
      const endActiveIncreasePhaseTimer = setTimeout(() => {
        setIsAnimatingThisItem(false);
        // When isAnimatingThisItem becomes false, the useEffect's `else if (!isAnimatingThisItem)`
        // block will run, which will clear the `animate-spread-increase-*` class,
        // allowing the CSS transition on the base element to animate the glow back to normal.
      }, ACTIVE_ANIMATION_DURATION_MS); // End active animation after the "increase" phase.

      return () => {
        clearTimeout(fadeInTimer);
        // clearTimeout(removeIncreaseClassTimer); // This timer was removed in previous step of thought process
        clearTimeout(endActiveIncreasePhaseTimer);
      };
    } else if (isAnimatingThisItem && !itemIsTheLastAction) {
      // Interrupted: This item WAS animating, but is no longer the target.
      setIsAnimatingThisItem(false); // Stop its animation sequence
      setAnimationClass('');
      setImageOpacity(targetOpacity); // Set to its correct non-animating opacity
    } else if (!isAnimatingThisItem) {
      // Not animating or animation has ended its "active" phase.
      setImageOpacity(targetOpacity);
      // If class was 'animate-spread-increase-*', clear it to allow CSS transition for return.
      if (animationClass.startsWith('animate-spread-increase-')) {
        setAnimationClass('');
      } else if (animationClass !== '') { // Clear any other potentially stale animation class
        setAnimationClass('');
      }
    }
  }, [
    itemName, itemType, lastDraftAction, currentStatus,
    processedTimestamp, isAnimatingThisItem, itemIsTheLastAction,
    animationClass, isDraftContextActive, imageOpacity // imageOpacity added to ensure effect re-runs if it's changed externally
  ]);

  return { animationClass, imageOpacity };
};

export default useDraftAnimation;
