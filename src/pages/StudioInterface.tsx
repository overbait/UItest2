import React, { useState, useMemo } from 'react';
import useDraftStore from '../store/draftStore';
import ScoreDisplayElement from '../components/studio/ScoreDisplayElement';
import { StudioElement, SavedStudioLayout } from '../types/draft';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import 'react-resizable/css/styles.css';
import SettingsPanel from '../components/studio/SettingsPanel';

const MIN_ELEMENT_WIDTH = 50; // Minimum width for an element during pivot drag

const StudioInterface: React.FC = () => {
  const {
    studioLayout, savedStudioLayouts, selectedElementId, addStudioElement,
    updateStudioElementPosition, updateStudioElementSize, updateStudioElementSettings, // Added updateStudioElementSettings
    saveCurrentStudioLayout, loadStudioLayout, deleteStudioLayout, setSelectedElementId
  } = useDraftStore(state => state);

  const [newLayoutName, setNewLayoutName] = useState<string>("");
  const selectedElement = useMemo(() => studioLayout.find(el => el.id === selectedElementId) || null, [selectedElementId, studioLayout]);

  const handleAddScoreDisplay = () => { addStudioElement("ScoreDisplay"); };

  const handleDrag = (elementId: string, data: DraggableData) => {
    const element = studioLayout.find(el => el.id === elementId);
    if (!element) return;

    if (element.isPivotLocked && data.deltaX !== 0) { // Only apply special logic for horizontal drag with pivot locked
      const currentCenterX = element.position.x + element.size.width / 2;
      let deltaX = data.deltaX; // Actual change in element's left position by draggable

      // Proposed new width based on the drag
      let newWidth = element.size.width - (deltaX * 2);

      // Clamp width and adjust deltaX if clamping occurs, to keep logic consistent
      if (newWidth < MIN_ELEMENT_WIDTH) {
        newWidth = MIN_ELEMENT_WIDTH;
        // If newWidth was clamped, the effective "pull" or "push" (deltaX*2) was too large.
        // Recalculate the deltaX that would result in MIN_ELEMENT_WIDTH
        // element.size.width - (effective_deltaX * 2) = MIN_ELEMENT_WIDTH
        // effective_deltaX * 2 = element.size.width - MIN_ELEMENT_WIDTH
        // effective_deltaX = (element.size.width - MIN_ELEMENT_WIDTH) / 2
        // The sign of deltaX matters. If deltaX was positive (shrinking), effective_deltaX should be positive.
        // If deltaX was negative (expanding), effective_deltaX should be negative.
        if (deltaX > 0) { // Was shrinking
            deltaX = (element.size.width - MIN_ELEMENT_WIDTH) / 2;
        } else { // Was expanding, but this case shouldn't be hit if MIN_ELEMENT_WIDTH is the floor.
                 // This logic primarily handles shrinking beyond min width.
                 // For expansion, it's typically not constrained by MIN_ELEMENT_WIDTH unless original width was already MIN.
            // If original width is MIN_ELEMENT_WIDTH and deltaX is negative (trying to expand),
            // then newWidth = MIN_ELEMENT_WIDTH - (-small_negative_delta * 2) = MIN_ELEMENT_WIDTH + positive_value
            // This is fine. Clamping primarily affects shrinking.
        }
      }

      // New X position to keep the center stationary
      const newX = currentCenterX - newWidth / 2;

      updateStudioElementSettings(elementId, {
        position: { x: newX, y: element.position.y + data.deltaY }, // Keep vertical drag normal
        size: { ...element.size, width: newWidth }
      });

    } else if (element.isPivotLocked && data.deltaY !== 0) { // Normal vertical drag if pivot is locked
        updateStudioElementPosition(elementId, { x: element.position.x, y: element.position.y + data.deltaY });
    }
    else { // Pivot not locked or no horizontal movement
      updateStudioElementPosition(elementId, { x: data.x, y: data.y });
    }
  };

  const handleResizeStop = (elementId: string, data: ResizeCallbackData) => {
    const currentElement = studioLayout.find(el => el.id === elementId);
    const currentScale = currentElement?.scale || 1;
    // ResizableBox gives dimensions of its own box, which is unscaled.
    updateStudioElementSize(elementId, { width: data.size.width / currentScale, height: data.size.height / currentScale });
  };

  const handleSaveLayout = () => { if (newLayoutName.trim() === "") { alert("Please enter a name."); return; } saveCurrentStudioLayout(newLayoutName.trim()); setNewLayoutName(""); };
  const handleElementClick = (elementId: string) => { setSelectedElementId(elementId); };
  const handleCloseSettingsPanel = () => { setSelectedElementId(null); };

  // Styles (shortened for brevity)
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
        {/* Toolbox content */}
        <h2 style={{ marginBottom: '1rem', color: '#a0a0a0', fontSize: '1.1em', textAlign: 'center', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>Toolbox</h2>
        <div style={toolboxSectionStyle}><h3 style={toolboxHeaderStyle}>Elements</h3><button onClick={handleAddScoreDisplay} style={buttonStyle}>Add Score Display</button></div>
        <div style={toolboxSectionStyle}><h3 style={toolboxHeaderStyle}>Save Current Layout</h3><input type="text" placeholder="Layout Name" value={newLayoutName} onChange={(e) => setNewLayoutName(e.target.value)} style={inputStyle}/><button onClick={handleSaveLayout} style={buttonStyle}>Save Layout</button></div>
        <div style={{flexGrow: 1, overflowY: 'auto'}}><h3 style={toolboxHeaderStyle}>Saved Layouts</h3>{savedStudioLayouts.length === 0 && <p style={{fontSize: '0.8em', color: '#777'}}>No saved layouts yet.</p>}<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{savedStudioLayouts.map((layout: SavedStudioLayout) => (<li key={layout.id} style={listItemStyle}><span style={layoutNameStyle} title={layout.name}>{layout.name}</span><div><button onClick={() => loadStudioLayout(layout.id)} style={{...actionButtonStyle, backgroundColor: '#28a745', color: 'white'}} title="Load">Load</button><button onClick={() => { if(confirm('Delete?')) deleteStudioLayout(layout.id)}} style={{...actionButtonStyle, backgroundColor: '#dc3545', color: 'white'}} title="Delete">Del</button></div></li>))}</ul></div>
      </aside>
      <main style={{ flexGrow: 1, padding: '1rem', position: 'relative', overflow: 'hidden' }} onClick={(e) => { if (e.target === e.currentTarget) { setSelectedElementId(null); } }}>
        <h2 style={{ marginBottom: '1rem', color: '#a0a0a0', textAlign: 'center', fontSize: '1.1em' }}>Canvas</h2>
        <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 60px - 2rem - 30px)', border: '1px dashed #444', overflow: 'hidden', backgroundColor: '#0d0d0d' }}>
          {studioLayout.map((element: StudioElement) => {
            const isSelected = element.id === selectedElementId;
            const currentScale = element.scale || 1;
            const selectionStyle: React.CSSProperties = isSelected ? { zIndex: 1 } : { zIndex: 0 };
            let content = null;
            if (element.type === "ScoreDisplay") { content = <ScoreDisplayElement element={element} />; }
            else { content = <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dotted #555'}}>Unknown: {element.type}</div>; }

            return (
              <Draggable
                  key={element.id}
                  handle=".drag-handle"
                  position={{ x: element.position.x, y: element.position.y }}
                  onDrag={(e: DraggableEvent, data: DraggableData) => handleDrag(element.id, data)}
                  bounds="parent">
                <ResizableBox
                    width={element.size.width}
                    height={element.size.height}
                    onResizeStop={(e, data) => handleResizeStop(element.id, data)}
                    minConstraints={[MIN_ELEMENT_WIDTH / currentScale, 30 / currentScale]}
                    maxConstraints={[800 / currentScale, 600 / currentScale]}
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
        </div>
      </main>
      <SettingsPanel selectedElement={selectedElement} onClose={handleCloseSettingsPanel} />
    </div>
  );
};
export default StudioInterface;
