import React, { useState, useMemo } from 'react'; // Added useMemo
import useDraftStore from '../store/draftStore';
import ScoreDisplayElement from '../components/studio/ScoreDisplayElement';
import { StudioElement, SavedStudioLayout } from '../types/draft';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import 'react-resizable/css/styles.css';
import SettingsPanel from '../components/studio/SettingsPanel'; // Import SettingsPanel

const StudioInterface: React.FC = () => {
  const {
    studioLayout,
    savedStudioLayouts,
    selectedElementId,
    addStudioElement,
    updateStudioElementPosition,
    updateStudioElementSize,
    saveCurrentStudioLayout,
    loadStudioLayout,
    deleteStudioLayout,
    setSelectedElementId,
  } = useDraftStore(state => ({
    studioLayout: state.studioLayout,
    savedStudioLayouts: state.savedStudioLayouts,
    selectedElementId: state.selectedElementId,
    addStudioElement: state.addStudioElement,
    updateStudioElementPosition: state.updateStudioElementPosition,
    updateStudioElementSize: state.updateStudioElementSize,
    saveCurrentStudioLayout: state.saveCurrentStudioLayout,
    loadStudioLayout: state.loadStudioLayout,
    deleteStudioLayout: state.deleteStudioLayout,
    setSelectedElementId: state.setSelectedElementId,
  }));

  const [newLayoutName, setNewLayoutName] = useState<string>("");

  // Find the selected element object based on selectedElementId
  const selectedElement = useMemo(() => {
    if (!selectedElementId) return null;
    return studioLayout.find(el => el.id === selectedElementId) || null;
  }, [selectedElementId, studioLayout]);

  const handleAddScoreDisplay = () => { addStudioElement("ScoreDisplay"); };
  const handleDragStop = (elementId: string, data: DraggableData) => { updateStudioElementPosition(elementId, { x: data.x, y: data.y }); };
  const handleResizeStop = (elementId: string, size: { width: number, height: number }) => { updateStudioElementSize(elementId, size); };
  const handleSaveLayout = () => { if (newLayoutName.trim() === "") { alert("Please enter a name for the layout."); return; } saveCurrentStudioLayout(newLayoutName.trim()); setNewLayoutName(""); };
  const handleElementClick = (elementId: string) => { setSelectedElementId(elementId); };
  const handleCloseSettingsPanel = () => { setSelectedElementId(null); };

  const toolboxSectionStyle: React.CSSProperties = { marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #444',};
  const toolboxHeaderStyle: React.CSSProperties = { fontSize: '1em', color: '#ccc', marginBottom: '8px',};
  const inputStyle: React.CSSProperties = { width: 'calc(100% - 22px)', padding: '8px 10px', marginBottom: '10px', backgroundColor: '#2c2c2c', border: '1px solid #555', color: 'white', borderRadius: '4px',};
  const buttonStyle: React.CSSProperties = { display: 'block', width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', textAlign: 'center', fontSize: '0.9em',};
  const listItemStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 5px', borderBottom: '1px solid #2a2a2a', fontSize: '0.85em',};
  const layoutNameStyle: React.CSSProperties = { flexGrow: 1, marginRight: '10px', color: '#f0f0f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',};
  const actionButtonStyle: React.CSSProperties = { padding: '5px 8px', fontSize: '0.8em', marginLeft: '5px', cursor: 'pointer', borderRadius: '3px', border: 'none',};

  return (
    <div style={{ backgroundColor: 'black', color: 'white', minHeight: 'calc(100vh - 60px)', display: 'flex', overflow: 'hidden', position: 'relative' /* For SettingsPanel absolute positioning context */ }}>
      <aside style={{ width: '250px', borderRight: '1px solid #333', padding: '1rem', backgroundColor: '#1a1a1a', overflowY: 'auto', display: 'flex', flexDirection: 'column', zIndex: 1 /* Ensure toolbox is below settings panel if it overlaps */ }}>
        <h2 style={{ marginBottom: '1rem', color: '#a0a0a0', fontSize: '1.1em', textAlign: 'center', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>Toolbox</h2>
        <div style={toolboxSectionStyle}><h3 style={toolboxHeaderStyle}>Elements</h3><button onClick={handleAddScoreDisplay} style={buttonStyle}>Add Score Display</button></div>
        <div style={toolboxSectionStyle}><h3 style={toolboxHeaderStyle}>Save Current Layout</h3><input type="text" placeholder="Layout Name" value={newLayoutName} onChange={(e) => setNewLayoutName(e.target.value)} style={inputStyle}/><button onClick={handleSaveLayout} style={buttonStyle}>Save Layout</button></div>
        <div style={{flexGrow: 1, overflowY: 'auto'}}><h3 style={toolboxHeaderStyle}>Saved Layouts</h3>{savedStudioLayouts.length === 0 && <p style={{fontSize: '0.8em', color: '#777'}}>No saved layouts yet.</p>}<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{savedStudioLayouts.map((layout: SavedStudioLayout) => (<li key={layout.id} style={listItemStyle}><span style={layoutNameStyle} title={layout.name}>{layout.name}</span><div><button onClick={() => loadStudioLayout(layout.id)} style={{...actionButtonStyle, backgroundColor: '#28a745', color: 'white'}} title="Load layout">Load</button><button onClick={() => { if(confirm('Delete this layout?')) deleteStudioLayout(layout.id)}} style={{...actionButtonStyle, backgroundColor: '#dc3545', color: 'white'}} title="Delete layout">Del</button></div></li>))}</ul></div>
      </aside>

      <main style={{ flexGrow: 1, padding: '1rem', position: 'relative', overflow: 'hidden' }} onClick={(e) => { if (e.target === e.currentTarget) { setSelectedElementId(null); } }}>
        <h2 style={{ marginBottom: '1rem', color: '#a0a0a0', textAlign: 'center', fontSize: '1.1em' }}>Canvas</h2>
        <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 60px - 2rem - 30px)', border: '1px dashed #444', overflow: 'hidden', backgroundColor: '#0d0d0d' }}>
          {studioLayout.map((element: StudioElement) => {
            const isSelected = element.id === selectedElementId;
            const selectionStyle: React.CSSProperties = isSelected ? { outline: '2px solid #007bff', outlineOffset: '2px', zIndex: 1 /* Bring selected slightly forward if needed */ } : { zIndex: 0 };
            let content = null;
            if (element.type === "ScoreDisplay") { content = <ScoreDisplayElement element={element} />; }
            else { content = <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dotted #555'}}>Unknown: {element.type}</div>; }
            return (
              <Draggable key={element.id} handle=".drag-handle" position={{ x: element.position.x, y: element.position.y }} onStop={(e, data) => handleDragStop(element.id, data)} bounds="parent">
                <ResizableBox width={element.size.width} height={element.size.height} onResizeStop={(e, data) => handleResizeStop(element.id, data.size)} minConstraints={[50, 30]} maxConstraints={[800, 600]}
                              style={{ width: `${element.size.width}px`, height: `${element.size.height}px`, boxSizing: 'border-box', ...selectionStyle }}
                              className="drag-handle">
                  <div onClick={(e) => { e.stopPropagation(); handleElementClick(element.id);}} style={{width: '100%', height: '100%', overflow: 'hidden', boxSizing: 'border-box', border: `1px solid ${element.borderColor || 'transparent'}`, background: element.backgroundColor || 'transparent', cursor: 'move'}}>
                    {content}
                  </div>
                </ResizableBox>
              </Draggable>
            );
          })}
        </div>
      </main>

      <SettingsPanel
        selectedElement={selectedElement}
        onClose={handleCloseSettingsPanel}
      />
    </div>
  );
};

export default StudioInterface;
