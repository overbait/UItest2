// src/hooks/useDraftAnimation.ts
import { useState, useEffect, useMemo } from 'react';
import useDraftStore from '../store/draftStore';
import { LastDraftAction } from '../types/draft';

interface AnimationOutput {
  animationClass: string;
  imageOpacity: number;
}

// Timings: 1s intensify, 1s fade to sustain. Total 2s special glow.
const ANIMATION_INTENSIFY_DURATION_MS = 1000;
const ANIMATION_SUSTAIN_TRANSITION_DELAY_MS = ANIMATION_INTENSIFY_DURATION_MS; // Apply sustain class after intensify animation
const ANIMATION_SUSTAIN_TRANSITION_DURATION_MS = 1000; // CSS transition for sustain glow takes this long
const TOTAL_ANIMATED_GLOW_DURATION_MS = ANIMATION_INTENSIFY_DURATION_MS + ANIMATION_SUSTAIN_TRANSITION_DURATION_MS;

// Image fade-in duration (distinct from glow)
const IMAGE_FADE_IN_DURATION_MS = 500; // Standard 0.5s fade for images

const useDraftAnimation = (
  itemName: string | null | undefined,
  itemType: 'civ' | 'map',
  currentStatus: 'picked' | 'banned' | 'default' | 'affected' | 'adminPicked'
): AnimationOutput => {
  const lastDraftAction = useDraftStore(state => state.lastDraftAction);

  const [animationClass, setAnimationClass] = useState('');
  const [imageOpacity, setImageOpacity] = useState(1); // Default to visible
  const [processedTimestamp, setProcessedTimestamp] = useState<number | null>(null);
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

    let targetOpacity = 1;
    if (currentStatus === 'affected') {
      targetOpacity = 0.9; // Target for affected items
    }

    if (shouldStartAnimation) {
      setIsAnimatingThisItem(true);
      setProcessedTimestamp(lastDraftAction!.timestamp);

      // Start image fade-in sequence
      setImageOpacity(0); // Start transparent
      const fadeInTimer = setTimeout(() => {
        // Target opacity depends on whether it also became 'affected' simultaneously
        // However, a newly picked/banned item is unlikely to be 'affected' immediately.
        // So, for a pick/ban animation, it usually fades to opacity 1.
        // If lastDraftAction also implies affected status, targetOpacity would be 0.9.
        setImageOpacity(currentStatus === 'affected' ? 0.9 : 1);
      }, 50); // Small delay, actual fade duration is CSS (IMAGE_FADE_IN_DURATION_MS)

      setAnimationClass(`animate-${lastDraftAction!.action}-initial`);

      const sustainGlowTimer = setTimeout(() => {
        // Check if still animating this specific action before changing class
        if (isAnimatingThisItem && lastDraftAction && lastDraftAction.timestamp === processedTimestamp) {
             setAnimationClass(`animate-${lastDraftAction!.action}-sustain`);
        }
      }, ANIMATION_SUSTAIN_TRANSITION_DELAY_MS);

      const endAnimationTimer = setTimeout(() => {
        setIsAnimatingThisItem(false);
        // When animation ends, class will be cleared by the !isAnimatingThisItem block
      }, TOTAL_ANIMATED_GLOW_DURATION_MS);

      return () => {
        clearTimeout(fadeInTimer);
        clearTimeout(sustainGlowTimer);
        clearTimeout(endAnimationTimer);
      };
    } else if (isAnimatingThisItem && !itemIsTheLastAction) {
      // Interrupted: This item WAS animating, but is no longer the target.
      setIsAnimatingThisItem(false); // Stop its animation sequence
      setAnimationClass('');
      setImageOpacity(targetOpacity); // Set to its correct non-animating opacity
    } else if (!isAnimatingThisItem) {
      // Not animating: ensure correct opacity and no lingering animation classes.
      // This handles initial state, after animation ends, or if status changes externally.
      setImageOpacity(targetOpacity);
      if (animationClass !== '') {
        setAnimationClass('');
      }
    }
  }, [
    itemName,
    itemType,
    lastDraftAction,
    currentStatus,
    processedTimestamp,
    isAnimatingThisItem,
    itemIsTheLastAction,
    animationClass
  ]);

  return { animationClass, imageOpacity };
};

export default useDraftAnimation;
