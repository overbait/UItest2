import React, { useMemo } from 'react';
import useDraftStore from '../store/draftStore';
import { StudioElement } from '../types/draft';
import ScoreDisplayElement from '../components/studio/ScoreDisplayElement'; // Assuming this is needed

interface BroadcastViewProps {
  targetCanvasId: string;
}

const BroadcastView: React.FC<BroadcastViewProps> = ({ targetCanvasId }) => {
  const { currentCanvases } = useDraftStore(state => ({
    currentCanvases: state.currentCanvases,
  }));

  const canvasToRender = useMemo(() => {
    return currentCanvases.find(canvas => canvas.id === targetCanvasId);
  }, [currentCanvases, targetCanvasId]);

  if (!canvasToRender) {
    return (
      <div style={{ width: '1920px', height: '1080px', backgroundColor: 'rgba(255,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px' }}>
        Canvas with ID '{targetCanvasId}' not found in current layout.
      </div>
    );
  }

  return (
    <div
      style={{
        width: '1920px',
        height: '1080px',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'transparent', // Crucial for OBS
        // border: '1px dotted rgba(255,255,255,0.1)', // Optional: for dev/setup
      }}
    >
      {canvasToRender.layout.map((element: StudioElement) => {
        let content = null;
        if (element.type === "ScoreDisplay") {
          content = <ScoreDisplayElement element={element} isBroadcast={true} />;
        } else {
          content = (
            <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dotted #555', color: '#ccc' }}>
              Unknown Element: {element.type}
            </div>
          );
        }

        const currentScale = element.scale || 1;

        return (
          <div
            key={element.id}
            style={{
              position: 'absolute',
              left: `${element.position.x}px`,
              top: `${element.position.y}px`,
              width: `${element.size.width * currentScale}px`, // Apply scale to size for outer box
              height: `${element.size.height * currentScale}px`, // Apply scale to size for outer box
              boxSizing: 'border-box',
            }}
          >
            <div style={{
                width: `${element.size.width}px`, // Original unscaled width for content
                height: `${element.size.height}px`, // Original unscaled height for content
                transform: `scale(${currentScale})`,
                transformOrigin: 'top left',
                overflow: 'hidden',
                backgroundColor: element.backgroundColor || 'transparent',
                border: `1px solid ${element.borderColor || 'transparent'}`,
                boxSizing: 'border-box',
            }}>
               {content}
            </div>
          </div>
        );
      })}
      {/* Debug Overlay Start */}
      {/* Border for 1920x1080 canvas */}
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

      {/* Horizontal center line */}
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

      {/* Vertical center line */}
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
      {/* Debug Overlay End */}
    </div>
  );
};

export default BroadcastView;
