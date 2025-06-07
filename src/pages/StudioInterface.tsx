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

    if (element.isPivotLocked) {
      // Calculate the visual center of the element before this drag operation
      // This center should remain fixed relative to the parent during mirrored drag.
      // However, react-draggable moves the whole element. We need to counteract this.
      // data.deltaX is the change in the element's top-left corner by react-draggable's default action.

      let newWidth = element.size.width - (data.deltaX * 2); // Times 2 because one side moves in, other out
      if (newWidth < MIN_ELEMENT_WIDTH) {
        newWidth = MIN_ELEMENT_WIDTH;
      }

      // To keep center fixed: if left edge moves by deltaX, and width changes by -2*deltaX,
      // the new X must be element.position.x + deltaX. Draggable already does this.
      // We only need to update the width.
      // The position update will be handled by react-draggable's default behavior if not fully controlled,
      // or by setting its position prop.
      // Let's try updating width and let Draggable handle its position update based on 'position' prop.
      // The change in X (data.x) is the new absolute position.
      // The deltaX is how much it moved from the last onDrag event.

      // For a fixed pivot, if we drag the left edge by deltaX_edge:
      // new_pos_x = pos_x + deltaX_edge
      // new_width = width - 2 * deltaX_edge
      // react-draggable's data.deltaX is the delta of the top-left corner. So this is deltaX_edge.

      const newX = element.position.x + data.deltaX; // This is where Draggable wants to move it
                                                    // For pivot, we want center to be "stable"
                                                    // This means if left side is dragged by data.deltaX,
                                                    // right side also moves by data.deltaX effectively.

      // If we are adjusting width to keep center, the element's own X might not need complex adjustment
      // if Draggable's 'position' is controlled.
      // Let's try: new position is data.x, data.y (from Draggable)
      // and adjust width based on data.deltaX (change from last drag event for the element's origin)

      // Store the new width
      updateStudioElementSettings(elementId, {
        position: { x: data.x, y: data.y }, // Let draggable report the new position
        size: { ...element.size, width: newWidth }
      });

    } else {
      // Standard drag: update position based on where Draggable moved the element
      updateStudioElementPosition(elementId, { x: data.x, y: data.y });
    }
  };

  const handleResizeStop = (elementId: string, data: ResizeCallbackData) => {
    const currentElement = studioLayout.find(el => el.id === elementId);
    const currentScale = currentElement?.scale || 1;
    updateStudioElementSize(elementId, { width: data.size.width / currentScale, height: data.size.height / currentScale });
  };
  const handleSaveLayout = () => { if (newLayoutName.trim() === "") { alert("Please enter a name."); return; } saveCurrentStudioLayout(newLayoutName.trim()); setNewLayoutName(""); };
  const handleElementClick = (elementId: string) => { setSelectedElementId(elementId); };
  const handleCloseSettingsPanel = () => { setSelectedElementId(null); };

  // Styles (shortened for brevity, assuming they are complete as before)
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
            const selectionStyle: React.CSSProperties = isSelected ? { outline: '2px solid #007bff', outlineOffset: '2px', zIndex: 1 } : { zIndex: 0 };
            let content = null;
            if (element.type === "ScoreDisplay") { content = <ScoreDisplayElement element={element} />; }
            else { content = <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dotted #555'}}>Unknown: {element.type}</div>; }

            return (
              <Draggable
                  key={element.id}
                  handle=".drag-handle"
                  position={{ x: element.position.x, y: element.position.y }}
                  onDrag={(e: DraggableEvent, data: DraggableData) => handleDrag(element.id, data)} // Changed to onDrag
                  // onStop is removed for now, or can be used for final position update if needed.
                  bounds="parent">
                <ResizableBox
                    width={element.size.width}
                    height={element.size.height}
                    onResizeStop={(e, data) => handleResizeStop(element.id, data)}
                    minConstraints={[MIN_ELEMENT_WIDTH, 30]} // Use MIN_ELEMENT_WIDTH
                    maxConstraints={[800, 600]}
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
