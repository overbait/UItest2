import React, { useState } from 'react'; // Added useState
import useDraftStore from '../../store/draftStore';
import ScoreDisplayElement from '../../components/studio/ScoreDisplayElement';
import { StudioElement, SavedStudioLayout } from '../../types/draft'; // Added SavedStudioLayout
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import 'react-resizable/css/styles.css';

const StudioInterface: React.FC = () => {
  const {
    studioLayout,
    savedStudioLayouts, // Added
    addStudioElement,
    updateStudioElementPosition,
    updateStudioElementSize,
    saveCurrentStudioLayout, // Added
    loadStudioLayout,       // Added
    deleteStudioLayout,     // Added
    // updateStudioLayoutName, // For future enhancement
  } = useDraftStore(state => ({
    studioLayout: state.studioLayout,
    savedStudioLayouts: state.savedStudioLayouts,
    addStudioElement: state.addStudioElement,
    updateStudioElementPosition: state.updateStudioElementPosition,
    updateStudioElementSize: state.updateStudioElementSize,
    saveCurrentStudioLayout: state.saveCurrentStudioLayout,
    loadStudioLayout: state.loadStudioLayout,
    deleteStudioLayout: state.deleteStudioLayout,
    // updateStudioLayoutName: state.updateStudioLayoutName,
  }));

  const [newLayoutName, setNewLayoutName] = useState<string>("");

  const handleAddScoreDisplay = () => {
    addStudioElement("ScoreDisplay");
  };

  const handleDragStop = (elementId: string, data: DraggableData) => {
    updateStudioElementPosition(elementId, { x: data.x, y: data.y });
  };

  const handleResizeStop = (elementId: string, size: { width: number, height: number }) => {
    updateStudioElementSize(elementId, size);
  };

  const handleSaveLayout = () => {
    if (newLayoutName.trim() === "") {
      alert("Please enter a name for the layout.");
      return;
    }
    saveCurrentStudioLayout(newLayoutName.trim());
    setNewLayoutName(""); // Clear input after saving
  };

  const toolboxSectionStyle: React.CSSProperties = {
    marginBottom: '20px',
    paddingBottom: '10px',
    borderBottom: '1px solid #444',
  };

  const toolboxHeaderStyle: React.CSSProperties = {
    fontSize: '1em',
    color: '#ccc',
    marginBottom: '8px',
  };

  const inputStyle: React.CSSProperties = {
    width: 'calc(100% - 22px)', // Account for padding/border
    padding: '8px 10px',
    marginBottom: '10px',
    backgroundColor: '#2c2c2c',
    border: '1px solid #555',
    color: 'white',
    borderRadius: '4px',
  };

  const buttonStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    textAlign: 'center',
    fontSize: '0.9em',
  };

  const listItemStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 5px',
    borderBottom: '1px solid #2a2a2a',
    fontSize: '0.85em',
  };

  const layoutNameStyle: React.CSSProperties = {
    flexGrow: 1,
    marginRight: '10px',
    color: '#f0f0f0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const actionButtonStyle: React.CSSProperties = {
    padding: '5px 8px',
    fontSize: '0.8em',
    marginLeft: '5px',
    cursor: 'pointer',
    borderRadius: '3px',
    border: 'none',
  };


  return (
    <div style={{ backgroundColor: 'black', color: 'white', minHeight: 'calc(100vh - 60px)', display: 'flex', overflow: 'hidden' }}>
      <aside style={{ width: '250px', borderRight: '1px solid #333', padding: '1rem', backgroundColor: '#1a1a1a', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ marginBottom: '1rem', color: '#a0a0a0', fontSize: '1.1em', textAlign: 'center', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>Toolbox</h2>

        <div style={toolboxSectionStyle}>
          <h3 style={toolboxHeaderStyle}>Elements</h3>
          <button onClick={handleAddScoreDisplay} style={buttonStyle}>
            Add Score Display
          </button>
          {/* Future elements will be added here */}
        </div>

        <div style={toolboxSectionStyle}>
          <h3 style={toolboxHeaderStyle}>Save Current Layout</h3>
          <input
            type="text"
            placeholder="Layout Name"
            value={newLayoutName}
            onChange={(e) => setNewLayoutName(e.target.value)}
            style={inputStyle}
          />
          <button onClick={handleSaveLayout} style={buttonStyle}>
            Save Layout
          </button>
        </div>

        <div style={{flexGrow: 1, overflowY: 'auto'}}> {/* Make this section scrollable */}
          <h3 style={toolboxHeaderStyle}>Saved Layouts</h3>
          {savedStudioLayouts.length === 0 && <p style={{fontSize: '0.8em', color: '#777'}}>No saved layouts yet.</p>}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {savedStudioLayouts.map((layout: SavedStudioLayout) => (
              <li key={layout.id} style={listItemStyle}>
                <span style={layoutNameStyle} title={layout.name}>{layout.name}</span>
                <div>
                  <button
                    onClick={() => loadStudioLayout(layout.id)}
                    style={{...actionButtonStyle, backgroundColor: '#28a745', color: 'white'}}
                    title="Load this layout"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => { if(confirm('Are you sure you want to delete this layout?')) deleteStudioLayout(layout.id)}}
                    style={{...actionButtonStyle, backgroundColor: '#dc3545', color: 'white'}}
                    title="Delete this layout"
                  >
                    Del
                  </button>
                  {/* TODO: Add rename functionality here */}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <main style={{ flexGrow: 1, padding: '1rem', position: 'relative', overflow: 'hidden' }}>
        <h2 style={{ marginBottom: '1rem', color: '#a0a0a0', textAlign: 'center', fontSize: '1.1em' }}>Canvas</h2>
        <div style={{
            position: 'relative', width: '100%', height: 'calc(100vh - 60px - 2rem - 30px)',
            border: '1px dashed #444', overflow: 'hidden', backgroundColor: '#0d0d0d'
        }}>
          {studioLayout.map((element: StudioElement) => {
            let content = null;
            if (element.type === "ScoreDisplay") {
              content = <ScoreDisplayElement />;
            } else {
              content = <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dotted #555'}}>Unknown: {element.type}</div>;
            }

            return (
              <Draggable
                key={element.id}
                handle=".drag-handle"
                position={{ x: element.position.x, y: element.position.y }}
                onStop={(e: DraggableEvent, data: DraggableData) => handleDragStop(element.id, data)}
                bounds="parent"
              >
                <ResizableBox
                  width={element.size.width}
                  height={element.size.height}
                  onResizeStop={(e, data: ResizeCallbackData) => handleResizeStop(element.id, data.size)}
                  minConstraints={[50, 30]}
                  maxConstraints={[800, 600]}
                  style={{ width: `${element.size.width}px`, height: `${element.size.height}px`, boxSizing: 'border-box' }}
                  className="drag-handle"
                >
                  <div style={{width: '100%', height: '100%', overflow: 'hidden', boxSizing: 'border-box', border: '1px solid #444', background: '#22272b'}}>
                    {content}
                  </div>
                </ResizableBox>
              </Draggable>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default StudioInterface;
