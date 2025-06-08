import React, { useState, useMemo, useRef, useEffect } from 'react';
import useDraftStore from '../store/draftStore';
import ScoreDisplayElement from '../components/studio/ScoreDisplayElement';
import { StudioElement, SavedStudioLayout } from '../types/draft';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import 'react-resizable/css/styles.css';
import SettingsPanel from '../components/studio/SettingsPanel';

const MIN_ELEMENT_WIDTH_PERCENT = 50 / 1920;
const MIN_ELEMENT_HEIGHT_PERCENT = 30 / 1080;
// REF_WIDTH and REF_HEIGHT are removed as direct constants here, percentages are used.
// For clarity, where 1920/1080 are used in calculations, they refer to the reference resolution for percentages.

const StudioInterface: React.FC = () => {
  const {
    // studioLayout, // REMOVE THIS
    currentCanvases,    // ADD
    activeCanvasId,     // ADD
    activeStudioLayoutId,     // ADD
    setActiveStudioLayoutId,  // ADD
    updateStudioLayoutName, // ADD
    savedStudioLayouts, selectedElementId,
    addStudioElement,
    updateStudioElementPosition, updateStudioElementSize, updateStudioElementSettings,
    saveCurrentStudioLayout, loadStudioLayout, deleteStudioLayout, setSelectedElementId,
    addCanvas,          // ADD
    setActiveCanvas,    // ADD
    removeCanvas        // ADD
  } = useDraftStore(state => state);

  const [newLayoutName, setNewLayoutName] = useState<string>("");
  const [studioCanvasDimensions, setStudioCanvasDimensions] = useState({ width: 1920, height: 1080 });
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setStudioCanvasDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(container);
    // Initial set
    setStudioCanvasDimensions({
        width: container.offsetWidth,
        height: container.offsetHeight,
    });

    return () => resizeObserver.unobserve(container);
  }, []); // Empty dependency array, runs once on mount

  const activeCanvas = useMemo(() => currentCanvases.find(c => c.id === activeCanvasId), [currentCanvases, activeCanvasId]);
  const activeLayout = useMemo(() => activeCanvas?.layout || [], [activeCanvas]);
  const selectedElement = useMemo(() => activeLayout.find(el => el.id === selectedElementId) || null, [selectedElementId, activeLayout]);

  const handleAddScoreDisplay = () => { addStudioElement("ScoreDisplay"); };

  const handleDrag = (elementId: string, data: DraggableData) => {
    const element = activeLayout.find(el => el.id === elementId);
    if (!element) return;

    if (element.isPivotLocked) {
      // Convert stored percentage-based pos/size to current display pixels for pivot logic
      const displayElementX = element.position.x * studioCanvasDimensions.width;
      const displayElementY = element.position.y * studioCanvasDimensions.height;
      const displayElementWidth = element.size.width * studioCanvasDimensions.width;
      // const displayElementHeight = element.size.height * studioCanvasDimensions.height; // Height is preserved in this logic

      let newY_display = displayElementY + data.deltaY; // new Y position in display pixels

      const currentX_display = displayElementX;
      const currentUnscaledWidth_display = displayElementWidth;
      const currentScale = element.scale || 1;
      const currentPivotOffset_unscaled = element.pivotInternalOffset || 0;

      let finalX_display = currentX_display;
      let finalUnscaledWidth_display = currentUnscaledWidth_display;
      // finalPivotOffset_unscaled_calculated is not used to update store, so its calculation can remain as is or be removed if not otherwise needed.
      // let finalPivotOffset_unscaled_calculated = currentPivotOffset_unscaled;

      if (data.deltaX !== 0) {
          const pivotScreenX_fixed_display = currentX_display + (currentUnscaledWidth_display / 2) * currentScale;
          const effectiveUnscaledDrag_display = data.deltaX / currentScale;

          const minDisplayWidth = MIN_ELEMENT_WIDTH_PERCENT * studioCanvasDimensions.width;

          const targetUnconstrainedWidth_display = currentUnscaledWidth_display - (2 * effectiveUnscaledDrag_display);
          finalUnscaledWidth_display = Math.max(minDisplayWidth, targetUnconstrainedWidth_display);

          // const actualUnscaledDragAppliedToEdge_display = (currentUnscaledWidth_display - finalUnscaledWidth_display) / 2;
          finalX_display = pivotScreenX_fixed_display - (finalUnscaledWidth_display / 2) * currentScale;
          // finalPivotOffset_unscaled_calculated = currentPivotOffset_unscaled - (2 * actualUnscaledDragAppliedToEdge_display);
      }

      // Convert calculated display values back to percentages for storing
      const percentPositionX = finalX_display / studioCanvasDimensions.width;
      const percentPositionY = newY_display / studioCanvasDimensions.height;
      const percentSizeWidth = finalUnscaledWidth_display / studioCanvasDimensions.width;

      updateStudioElementSettings(elementId, {
          position: { x: percentPositionX, y: percentPositionY },
          size: {
              width: percentSizeWidth,
              height: element.size.height // This is already a percentage
          },
          pivotInternalOffset: element.pivotInternalOffset // Remains unchanged
      });

    } else { // Pivot not locked
      const percentX = data.x / studioCanvasDimensions.width;
      const percentY = data.y / studioCanvasDimensions.height;
      updateStudioElementPosition(elementId, { x: percentX, y: percentY });
    }
  };

  const handleResizeStop = (elementId: string, data: ResizeCallbackData) => {
    const currentElement = activeLayout.find(el => el.id === elementId);
    if (!currentElement) return;
    const currentScale = currentElement.scale || 1;

    const newDisplayWidthUnscaled = data.size.width / currentScale;
    const newDisplayHeightUnscaled = data.size.height / currentScale;

    const percentWidth = newDisplayWidthUnscaled / studioCanvasDimensions.width;
    const percentHeight = newDisplayHeightUnscaled / studioCanvasDimensions.height;
    updateStudioElementSize(elementId, { width: percentWidth, height: percentHeight });
  };

  const handleSaveLayout = () => { if (newLayoutName.trim() === "") { alert("Please enter a name."); return; } saveCurrentStudioLayout(newLayoutName.trim()); setNewLayoutName(""); };
  const handleElementClick = (elementId: string) => { setSelectedElementId(elementId); };
  const handleCloseSettingsPanel = () => { setSelectedElementId(null); };

  // Styles (assuming complete from previous versions)
  const toolboxSectionStyle: React.CSSProperties = { marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #444',};
  const toolboxHeaderStyle: React.CSSProperties = { fontSize: '1em', color: '#ccc', marginBottom: '8px',};
  const inputStyle: React.CSSProperties = { width: 'calc(100% - 22px)', padding: '8px 10px', marginBottom: '10px', backgroundColor: '#2c2c2c', border: '1px solid #555', color: 'white', borderRadius: '4px',};
  const buttonStyle: React.CSSProperties = { display: 'block', width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', textAlign: 'center', fontSize: '0.9em',};
  const listItemStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 5px', borderBottom: '1px solid #2a2a2a', fontSize: '0.85em',};
  const layoutNameStyle: React.CSSProperties = { flexGrow: 1, marginRight: '10px', color: '#f0f0f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',};
  const actionButtonStyle: React.CSSProperties = { padding: '5px 8px', fontSize: '0.8em', marginLeft: '5px', cursor: 'pointer', borderRadius: '3px', border: 'none',};

  return (
    <div style={{ backgroundColor: 'black', color: 'white', minHeight: 'calc(100vh - 60px)', display: 'flex', overflow: 'hidden', position: 'relative' }}>
      <aside style={{ width: '250px', borderRight: '1px solid #333', padding: '1rem', backgroundColor: '#1a1a1a', overflowY: 'auto', display: 'flex', flexDirection: 'column', zIndex: 1 }}>
        <h2 style={{ marginBottom: '1rem', color: '#a0a0a0', fontSize: '1.1em', textAlign: 'center', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>Toolbox</h2>
        <div style={toolboxSectionStyle}><h3 style={toolboxHeaderStyle}>Elements</h3><button onClick={handleAddScoreDisplay} style={buttonStyle}>Add Score Display</button></div>
        <div style={toolboxSectionStyle}><h3 style={toolboxHeaderStyle}>Save Current Layout</h3><input type="text" placeholder="Layout Name" value={newLayoutName} onChange={(e) => setNewLayoutName(e.target.value)} style={inputStyle}/><button onClick={handleSaveLayout} style={buttonStyle}>Save Layout</button></div>
        <div style={{flexGrow: 1, overflowY: 'auto'}}><h3 style={toolboxHeaderStyle}>Saved Layouts</h3>{savedStudioLayouts.length === 0 && <p style={{fontSize: '0.8em', color: '#777'}}>No saved layouts yet.</p>}<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{savedStudioLayouts.map((layout: SavedStudioLayout) => (
          <li
            key={layout.id}
            style={{
              ...listItemStyle,
              backgroundColor: layout.id === activeStudioLayoutId ? '#2a2a4a' : (listItemStyle.backgroundColor || 'transparent'), // Subtle highlight
              borderLeft: layout.id === activeStudioLayoutId ? '3px solid #00dd00' : (listItemStyle.borderLeft || 'none'),
              paddingLeft: layout.id === activeStudioLayoutId ? '12px' : (listItemStyle.paddingLeft || '5px'),
            }}
          >
            <span
              style={{
                ...layoutNameStyle,
                fontWeight: layout.id === activeStudioLayoutId ? 'bold' : (layoutNameStyle.fontWeight || 'normal')
              }}
              title={layout.name}
            >
              {layout.name} {layout.id === activeStudioLayoutId && <em style={{fontSize: '0.9em', color: '#00dd00'}}> (auto-saving)</em>}
            </span>
            <div>
              <button onClick={() => loadStudioLayout(layout.id)} style={{...actionButtonStyle, backgroundColor: '#28a745', color: 'white'}} title="Load">Load</button>
              {layout.name !== "(auto)" && (
                <button
                  onClick={() => {
                    const currentName = layout.name;
                    const newName = prompt("Enter new name for layout:", currentName);
                    if (newName && newName.trim() !== "" && newName.trim() !== currentName) {
                      updateStudioLayoutName(layout.id, newName.trim());
                    }
                  }}
                  style={{
                    ...actionButtonStyle,
                    backgroundColor: '#6c757d',
                  }}
                  title="Rename layout"
                >
                  Rename
                </button>
              )}
              <button onClick={() => { if(confirm('Delete?')) deleteStudioLayout(layout.id)}} style={{...actionButtonStyle, backgroundColor: '#dc3545', color: 'white'}} title="Delete">Del</button>
              {layout.id === activeStudioLayoutId && layout.name !== "(auto)" && (
                <button
                  onClick={() => setActiveStudioLayoutId(null)}
                  style={{
                    ...actionButtonStyle,
                    backgroundColor: '#ffc107',
                    color: 'black',
                  }}
                  title="Stop auto-saving to this layout (will use/create '(auto)' next)"
                >
                  Detach
                </button>
              )}
            </div>
          </li>
        ))}</ul></div>
      </aside>
      <main style={{ flexGrow: 1, padding: '1rem', position: 'relative', overflow: 'hidden' }} onClick={(e) => { if (e.target === e.currentTarget) { setSelectedElementId(null); } }}>
        {/* Tab Bar Start */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0px', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1, overflowX: 'auto', paddingBottom: '5px' /* For scrollbar space if needed */ }}> {/* Container for tabs */}
            {currentCanvases.map(canvas => (
              <button
                key={canvas.id}
                onClick={() => setActiveCanvas(canvas.id)}
                style={{
                  backgroundColor: canvas.id === activeCanvasId ? '#007bff' : '#3c3c3c',
                  color: canvas.id === activeCanvasId ? 'white' : '#ccc',
                  border: `1px solid ${canvas.id === activeCanvasId ? '#007bff' : '#555'}`,
                  padding: '6px 12px', marginRight: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em',
                  display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', flexShrink: 0
                }}
                title={canvas.name}
              >
                {canvas.name.length > 15 ? canvas.name.substring(0, 12) + '...' : canvas.name} {/* Truncate long names */}
                <span
                  title="Open canvas in new window (placeholder)"
                  onClick={(e) => {
                    e.stopPropagation();
                    const broadcastUrl = `/index.html?view=broadcast&canvasId=${canvas.id}`;
                    // Open in a new tab without specific window features, letting the browser decide size/appearance.
                    window.open(broadcastUrl, '_blank');
                    console.log('Attempting to open broadcast view in new tab for canvas ID:', canvas.id, 'at URL:', broadcastUrl);
                  }}
                  style={{
                    width: '10px', height: '10px', backgroundColor: 'white',
                    border: '1px solid #666', marginLeft: '8px', cursor: 'pointer',
                    display: 'inline-block'
                  }}
                ></span>
                {currentCanvases.length > 1 && (
                  <button
                    title="Remove canvas"
                    onClick={(e) => {
                      e.stopPropagation();
                      if(confirm(`Are you sure you want to delete canvas "${canvas.name}"?`)) removeCanvas(canvas.id);
                    }}
                    style={{
                      background: 'transparent', border: 'none', color: '#aaa',
                      marginLeft: '5px', cursor: 'pointer', fontSize: '1.2em',
                      padding: '0 3px', lineHeight: '1', fontWeight: 'bold'
                    }}
                  >
                    &times;
                  </button>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              addCanvas(); // Call addCanvas without a name argument
            }}
            style={{
              backgroundColor: '#28a745', color: 'white', border: 'none',
              padding: '6px 10px', borderRadius: '4px', cursor: 'pointer',
              fontSize: '0.9em', marginLeft: '10px', flexShrink: 0
            }}
            title="Add new canvas"
          >
            +
          </button>
        </div>
        {/* Tab Bar End */}
        <div
          ref={canvasContainerRef}
          style={{
            position: 'relative',
            border: '1px dashed #444',
            overflow: 'hidden',
            backgroundColor: '#0d0d0d',

            // Aspect ratio logic:
            width: '100%', // Take full width of <main>'s content box
            aspectRatio: '16 / 9',

            maxHeight: 'calc(100vh - 60px - 2rem - 30px - 50px)', // This was the explicit height before

            margin: 'auto', // This will center it if it's constrained by maxHeight and becomes narrower.
          }}
        >
          {activeLayout.map((element: StudioElement) => {
            const isSelected = element.id === selectedElementId;
            const currentScale = element.scale || 1;
            const selectionStyle: React.CSSProperties = isSelected ? { zIndex: 1 } : { zIndex: 0 };

            // Convert percentage-based stored values to display pixels for rendering
            const displayX = element.position.x * studioCanvasDimensions.width;
            const displayY = element.position.y * studioCanvasDimensions.height;
            const unscaledDisplayWidth = element.size.width * studioCanvasDimensions.width;
            const unscaledDisplayHeight = element.size.height * studioCanvasDimensions.height;

            // Constraints for ResizableBox
            const minDisplayConstraintWidth = MIN_ELEMENT_WIDTH_PERCENT * studioCanvasDimensions.width;
            const minDisplayConstraintHeight = MIN_ELEMENT_HEIGHT_PERCENT * studioCanvasDimensions.height;
            const maxDisplayConstraintWidth = studioCanvasDimensions.width; // 100% of canvas display width
            const maxDisplayConstraintHeight = studioCanvasDimensions.height; // 100% of canvas display height

            let content = null;
            if (element.type === "ScoreDisplay") { content = <ScoreDisplayElement element={element} />; }
            else { content = <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dotted #555'}}>Unknown: {element.type}</div>; }

            return (
              <Draggable
                  key={element.id}
                  handle=".drag-handle"
                  position={{ x: displayX, y: displayY }}
                  onDrag={(e: DraggableEvent, data: DraggableData) => handleDrag(element.id, data)}
                  // No bounds="parent"
                  >
                <ResizableBox
                    width={unscaledDisplayWidth * currentScale}
                    height={unscaledDisplayHeight * currentScale}
                    onResizeStop={(e, data) => handleResizeStop(element.id, data)}
                    minConstraints={[minDisplayConstraintWidth / currentScale, minDisplayConstraintHeight / currentScale]}
                    maxConstraints={[maxDisplayConstraintWidth / currentScale, maxDisplayConstraintHeight / currentScale]}
                    style={{ ...selectionStyle }}
                    className="drag-handle">
                  <div
                       onClick={(e) => { e.stopPropagation(); handleElementClick(element.id);}}
                       style={{
                           width: '100%', height: '100%', overflow: 'hidden',
                           boxSizing: 'border-box',
                           border: `1px solid ${element.borderColor || 'transparent'}`,
                           background: element.backgroundColor || 'transparent',
                           cursor: 'move',
                           transform: `scale(${currentScale})`,
                           transformOrigin: 'top left',
                       }}>
                    {content}
                  </div>
                </ResizableBox>
              </Draggable>
            );
          })}
          {/* Debug Overlay for StudioInterface Canvas Start */}
          {/* Border for conceptual 1920x1080 within the responsive canvas */}
          <div
            style={{
              position: 'absolute',
              left: '0%',
              top: '0%',
              width: '100%', // 100% of the 16:9 container
              height: '100%', // 100% of the 16:9 container
              border: '1px dashed red', // Dashed to differentiate from BroadcastView's solid if needed, or keep solid
              boxSizing: 'border-box',
              pointerEvents: 'none',
            }}
          ></div>

          {/* Horizontal center line (50% of container height) */}
          <div
            style={{
              position: 'absolute',
              left: '0%',
              top: '50%',
              width: '100%',
              height: '1px',
              backgroundColor: 'rgba(255, 0, 0, 0.5)', // Slightly transparent red
              transform: 'translateY(-0.5px)', // Center 1px line
              pointerEvents: 'none',
            }}
          ></div>

          {/* Vertical center line (50% of container width) */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '0%',
              width: '1px',
              height: '100%',
              backgroundColor: 'rgba(255, 0, 0, 0.5)', // Slightly transparent red
              transform: 'translateX(-0.5px)', // Center 1px line
              pointerEvents: 'none',
            }}
          ></div>
          {/* Debug Overlay for StudioInterface Canvas End */}
        </div>
      </main>
      <SettingsPanel selectedElement={selectedElement} onClose={handleCloseSettingsPanel} />
    </div>
  );
};
export default StudioInterface;
