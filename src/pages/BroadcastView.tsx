import React, { useEffect, useMemo, useState } from 'react';
import useDraftStore from '../store/draftStore';
import { StudioElement } from '../types/draft';
import ScoreOnlyElement from '../components/studio/ScoreOnlyElement';
import NicknamesOnlyElement from '../components/studio/NicknamesOnlyElement';
import BoXSeriesOverviewElement from '../components/studio/BoXSeriesOverviewElement';
import CountryFlagsElement from '../components/studio/CountryFlagsElement';
import ColorGlowElement from '../components/studio/ColorGlowElement';
import MapPoolElement from '../components/studio/MapPoolElement';
import CivPoolElement from '../components/studio/CivPoolElement';
import BackgroundImageElement from '../components/studio/BackgroundImageElement'; // Import new component
// All elements are now imported.
// import useDraftStore from '../store/draftStore'; // Keep for debug overlay if needed for other parts <-- REMOVED DUPLICATE

interface BroadcastViewProps {
  // targetCanvasId: string; // No longer take ID
  canvasToRenderFromApp: StudioCanvas | null; // Take the object directly
}

const BroadcastView: React.FC<BroadcastViewProps> = ({ canvasToRenderFromApp }) => {
  // const { currentCanvasesFromHook, activeCanvasIdFromHook } = useDraftStore(state => ({
  // currentCanvasesFromHook: state.currentCanvases,
  // activeCanvasIdFromHook: state.activeCanvasId,
  // }));

  useEffect(() => {
    (window as any).IS_BROADCAST_VIEW = true;
    // Note: externalPresetChange listener might not be relevant if data is passed via prop
    // but keeping it for now doesn't hurt.
    const handlePresetChange = (event: Event) => {
      console.log('[BroadcastView] Detected externalPresetChange event, reloading page. Details:', (event as CustomEvent).detail);
      window.location.reload();
    };
    window.addEventListener('externalPresetChange', handlePresetChange);
    return () => {
      (window as any).IS_BROADCAST_VIEW = false;
      window.removeEventListener('externalPresetChange', handlePresetChange);
    };
  }, []);

  const canvasToRender = canvasToRenderFromApp; // Use the prop directly

  // For debug overlay, still useful to see some store state if needed
  const { activeCanvasIdFromHook: storeActiveId, currentCanvasesFromHook: storeCanvases } = useDraftStore(state => ({
    activeCanvasIdFromHook: state.activeCanvasId,
    currentCanvasesFromHook: state.currentCanvases,
  }));


  if (!canvasToRender) {
    const message = "No canvas data provided to BroadcastView component.";
    return (
      <div style={{ width: '1920px', height: '1080px', backgroundColor: 'rgba(255,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px' }}>
        {message}
      </div>
    );
  }

  // if (canvasToRender) { // Ensure canvasToRender is not null before logging its properties
  //   console.log('BroadcastView - canvasToRender:', JSON.parse(JSON.stringify(canvasToRender))); // Log a deep clone for cleaner inspection
  //   console.log('BroadcastView - canvasToRender.layout:', canvasToRender.layout); // Log the layout array directly
  // }

  const debugInfoStyle: React.CSSProperties = {
    position: 'absolute',
    top: '10px',
    left: '10px',
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: 'white',
    padding: '10px',
    zIndex: 9999,
    fontSize: '12px',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap', // To respect newlines
  };

  // const backgroundImageStyle: React.CSSProperties = { // Old style, no longer needed here
  //   position: 'absolute',
  //   top: 0,
  //   left: 0,
  //   width: '100%',
  //   height: '100%',
  //   objectFit: 'cover',
  //   zIndex: -1,
  // };

  return (
    <div
      style={{
        width: '1920px',
        height: '1080px',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: canvasToRender.backgroundColor || 'transparent', // Canvas background color remains
        border: canvasToRender.showBroadcastBorder === false ? '1px dashed transparent' : '1px dashed #777', // Conditional border
      }}
    >
      <div style={debugInfoStyle}>
        DEBUG INFO (BroadcastView):
        Prop Canvas ID: {canvasToRenderFromApp?.id || "N/A (no prop)"}
        Prop Canvas Name: {canvasToRenderFromApp?.name || "N/A"}
        Prop Layout Count: {canvasToRenderFromApp?.layout?.length ?? "N/A"}
        Store Active ID: {storeActiveId || "N/A"}
        Store Canvas Count: {storeCanvases.length}
        User Agent (for OBS debugging): {navigator.userAgent}
      </div>
      {/* Old direct background image rendering removed */}
      {canvasToRender.layout.map((element: StudioElement, index: number) => { // Added index for key
        // console.log('BroadcastView - Rendering element.type:', element.type);
        // console.log('BroadcastView - Rendering element object:', JSON.parse(JSON.stringify(element))); // Deep clone for cleaner log
        const currentScale = element.scale || 1;

        const outerDivStyle: React.CSSProperties = {
          position: 'absolute',
          left: `${element.position.x}px`,
          top: `${element.position.y}px`,
          width: `${element.size.width * currentScale}px`,
          height: `${element.size.height * currentScale}px`,
          boxSizing: 'border-box',
          // Minimal direct styling, relying on child for visibility
          // border: '1px solid red', // Keep for now to see if the box itself is there
        };

        const fixedChildStyle: React.CSSProperties = {
          position: 'fixed', // Fixed positioning to try and break out of parent constraints
          top: `${100 + index * 30}px`, // Staggered fixed position for each element
          left: '50px',
          width: '200px',
          height: '25px',
          backgroundColor: 'magenta',
          color: 'white',
          zIndex: 10000 + index, // Ensure it's above debug overlay if possible
          border: '1px solid white',
          fontSize: '10px',
          overflow: 'hidden',
          padding: '2px',
        };

        // const currentOverflow = (element.type === "MapPoolElement" || element.type === "CivPoolElement") ? 'visible' : 'hidden';

        // const innerDivStyle = {
        //   width: `${element.size.width}px`,
        //   height: `${element.size.height}px`,
        //   transform: `scale(${currentScale})`,
        //   transformOrigin: 'top left',
        //   overflow: currentOverflow, // Use the conditional overflow
        //   boxSizing: 'border-box',
        // };

        // Simplified content for testing
        const content = (
          <>
            {/* This fixed child is the main thing we hope to see */}
            <div style={fixedChildStyle}>
              FIXED TEST: {element.type} ({element.id}) @ {element.position.x},{element.position.y}
            </div>
            {/* This content is inside the absolutely positioned parent */}
            <div style={{ width: '100%', height: '100%', border: '1px dotted cyan', color: 'lime', fontSize: '10px', overflow: 'hidden', boxSizing: 'border-box' }}>
              ABS: {element.type} ({element.id})
              <br/>
              Sz: {element.size.width}x{element.size.height} Sc: {currentScale}
            </div>
          </>
        );

        // Always render the placeholder
        // if (!content) {
        //   return null;
        // }

        return (
          <div
            key={element.id || `debug-${index}`} // Use element.id if available, otherwise index
            style={outerDivStyle}
          >
            {/* <div style={innerDivStyle}> */} {/* Temporarily remove inner div for simplicity */}
               {content}
            {/* </div> */}
          </div>
        );
      })}
      {/* Debug Overlay Start */}
      {/*
      <div
        style={{
          position: 'absolute',
          left: '0px',
          top: '0px',
          width: '1920px',
          height: '1080px',
          border: '1px solid red',
          boxSizing: 'border-box', // Ensures border is within the dimensions
          pointerEvents: 'none', // So it doesn't interfere with any (future) interaction
        }}
      ></div>

      <div
        style={{
          position: 'absolute',
          left: '0px',
          top: '539.5px', // 1080 / 2 - (1/2) = 540 - 0.5 (for 1px line centering)
          width: '1920px',
          height: '1px',
          backgroundColor: 'red',
          pointerEvents: 'none',
        }}
      ></div>

      <div
        style={{
          position: 'absolute',
          left: '959.5px', // 1920 / 2 - (1/2) = 960 - 0.5 (for 1px line centering)
          top: '0px',
          width: '1px',
          height: '1080px',
          backgroundColor: 'red',
          pointerEvents: 'none',
        }}
      ></div>
      */}
      {/* Debug Overlay End */}
    </div>
  );
};

export default BroadcastView;
