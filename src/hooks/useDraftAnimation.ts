// src/hooks/useDraftAnimation.ts
import { useState, useEffect, useMemo } from 'react';
import useDraftStore from '../store/draftStore';
import { LastDraftAction } from '../types/draft';

interface AnimationOutput {
  animationClass: string;
  imageOpacity: number;
}

// New timing: 1s intensify, 1s fade to sustain. Total 2s special glow.
const ANIMATION_INTENSIFY_DURATION_MS = 1000; // Phase 1: 0 to 100% glow
const ANIMATION_SUSTAIN_TRANSITION_DELAY_MS = ANIMATION_INTENSIFY_DURATION_MS; // When to start fading to 50%
const ANIMATION_SUSTAIN_TRANSITION_DURATION_MS = 1000; // Phase 2: 100% to 50% glow
const TOTAL_ANIMATED_GLOW_DURATION_MS = ANIMATION_INTENSIFY_DURATION_MS + ANIMATION_SUSTAIN_TRANSITION_DURATION_MS; // Total 2s

const useDraftAnimation = (
  itemName: string | null | undefined,
  itemType: 'civ' | 'map',
  currentStatus: 'picked' | 'banned' | 'default' | 'affected' | 'adminPicked'
): AnimationOutput => {
  const lastDraftAction = useDraftStore(state => state.lastDraftAction);

  // Local state for this specific item's animation properties
  const [animationClass, setAnimationClass] = useState('');
  const [imageOpacity, setImageOpacity] = useState(1); // Default to visible

  // Tracks if the current lastDraftAction.timestamp has been processed by this hook instance for this item
  const [processedTimestamp, setProcessedTimestamp] = useState<number | null>(null);
  // Tracks if this specific item is currently in an active animation sequence
  const [isAnimatingThisItem, setIsAnimatingThisItem] = useState(false);

  const itemIsTheLastAction = useMemo(() => {
    if (!itemName || !lastDraftAction) return false;
    return lastDraftAction.item === itemName && lastDraftAction.itemType === itemType;
  }, [itemName, itemType, lastDraftAction]);

  useEffect(() => {
    const shouldStartAnimation =
      itemIsTheLastAction &&
      lastDraftAction &&
      lastDraftAction.timestamp !== processedTimestamp;

    if (shouldStartAnimation) {
      setIsAnimatingThisItem(true);
      setProcessedTimestamp(lastDraftAction!.timestamp);
      setImageOpacity(0);
      setAnimationClass(`animate-${lastDraftAction!.action}-initial`);

      const fadeInTimer = setTimeout(() => {
        setImageOpacity(1);
      }, 50);

      const sustainGlowTimer = setTimeout(() => {
        // Only update class if still animating *this* item and this action
        if (isAnimatingThisItem && lastDraftAction && lastDraftAction.timestamp === processedTimestamp) {
             setAnimationClass(`animate-${lastDraftAction!.action}-sustain`);
        }
      }, ANIMATION_SUSTAIN_TRANSITION_DELAY_MS); // Use new constant

      const endAnimationTimer = setTimeout(() => {
        setIsAnimatingThisItem(false);
      }, TOTAL_ANIMATED_GLOW_DURATION_MS); // Use new constant

      return () => {
        clearTimeout(fadeInTimer);
        clearTimeout(sustainGlowTimer);
        clearTimeout(endAnimationTimer);
      };
    } else if (isAnimatingThisItem && !itemIsTheLastAction) {
      // Interrupted: This item WAS animating, but is no longer the target.
      setIsAnimatingThisItem(false);
      setAnimationClass('');
      setImageOpacity(1);
    } else if (!isAnimatingThisItem) {
      // Not animating: ensure it's visible and has no lingering animation classes.
      // This also handles the state after an animation sequence naturally ends.
      setImageOpacity(1);
      if (animationClass !== '') {
        setAnimationClass('');
      }
    }
  }, [
    itemName,
    itemType,
    lastDraftAction,
    // currentStatus, // currentStatus might not be needed if opacity is always 1 when not animating
    processedTimestamp,
    isAnimatingThisItem, // Critical for managing state transitions
    itemIsTheLastAction,
    animationClass // To allow clearing it when !isAnimatingThisItem
  ]);

  return { animationClass, imageOpacity };
};

export default useDraftAnimation;
