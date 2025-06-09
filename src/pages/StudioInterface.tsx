import React, { useState, useMemo, useEffect } from 'react';
import useDraftStore from '../store/draftStore';
import ScoreDisplayElement from '../components/studio/ScoreDisplayElement';
import { StudioElement, SavedStudioLayout } from '../types/draft';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import 'react-resizable/css/styles.css';
import SettingsPanel from '../components/studio/SettingsPanel';

const MIN_ELEMENT_WIDTH = 50;

const StudioInterface: React.FC = () => {
  const {
    currentCanvases,
    activeCanvasId,
    activeStudioLayoutId,
    setActiveStudioLayoutId,
    updateStudioLayoutName,
    savedStudioLayouts,
    selectedElementId,
    addStudioElement,
    updateStudioElementPosition, updateStudioElementSize, updateStudioElementSettings,
    saveCurrentStudioLayout, loadStudioLayout, deleteStudioLayout, setSelectedElementId,
    addCanvas,
    setActiveCanvas,
    removeCanvas,
    // Added for Draft Presets
    savedPresets,
    activePresetId,
    saveCurrentAsPreset,
    loadPreset,
    deletePreset,
    updatePresetName
  } = useDraftStore(state => state);

  const [newLayoutName, setNewLayoutName] = useState<string>("");
  const [newDraftPresetName, setNewDraftPresetName] = useState<string>(""); // Added for Draft Presets input

  const activeCanvas = useMemo(() => currentCanvases.find(c => c.id === activeCanvasId), [currentCanvases, activeCanvasId]);
  const activeLayout = useMemo(() => activeCanvas?.layout || [], [activeCanvas]);
  const selectedElement = useMemo(() => activeLayout.find(el => el.id === selectedElementId) || null, [selectedElementId, activeLayout]);

  const handleAddScoreDisplay = () => { addStudioElement("ScoreDisplay"); };

  const handleDrag = (elementId: string, data: DraggableData) => {
    const element = activeLayout.find(el => el.id === elementId);
    if (!element) return;

    if (element.isPivotLocked) {
    // Vertical drag part (screen coordinates)
    let newY_screen = element.position.y + data.deltaY;

    // Current state values
    const currentX_screen = element.position.x;
    const currentUnscaledWidth = element.size.width;
    const currentUnscaledHeight = element.size.height; // Preserve height
    const currentScale = element.scale || 1;
    const currentPivotOffset_unscaled = element.pivotInternalOffset || 0;

    // Initialize final values to current state for the case data.deltaX === 0
    let finalX_screen = currentX_screen;
    let finalUnscaledWidth = currentUnscaledWidth;
    let finalPivotOffset_unscaled = currentPivotOffset_unscaled;

    if (data.deltaX !== 0) { // Horizontal drag occurred
        // Calculate the fixed screen X-coordinate of the pivot (element's center)
        // This uses the state *before* the current drag delta.
        const pivotScreenX_fixed = currentX_screen + (currentUnscaledWidth / 2) * currentScale;

        // Convert screen drag delta to an equivalent unscaled drag for one edge
        const effectiveUnscaledDrag = data.deltaX / currentScale;

        // Determine the new unscaled width, constrained by MIN_ELEMENT_WIDTH
        const targetUnconstrainedWidth = currentUnscaledWidth - (2 * effectiveUnscaledDrag);
        finalUnscaledWidth = Math.max(MIN_ELEMENT_WIDTH, targetUnconstrainedWidth);

        // Calculate the actual change applied to one edge in unscaled units
        // This is based on the difference between current width and the (potentially clamped) final width.
        const actualUnscaledDragAppliedToEdge = (currentUnscaledWidth - finalUnscaledWidth) / 2;

        // Calculate the new top-left X screen coordinate to keep the pivotScreenX_fixed stationary
        finalX_screen = pivotScreenX_fixed - (finalUnscaledWidth / 2) * currentScale;

        // Calculate the new unscaled pivot offset
        finalPivotOffset_unscaled = currentPivotOffset_unscaled - (2 * actualUnscaledDragAppliedToEdge);
    }

    // Update the element's state
    updateStudioElementSettings(elementId, {
        position: { x: finalX_screen, y: newY_screen },
        size: { width: finalUnscaledWidth, height: currentUnscaledHeight },
        pivotInternalOffset: finalPivotOffset_unscaled
    });

    } else { // Pivot not locked - normal drag
      // data.x and data.y are the new absolute positions of the top-left corner from Draggable's perspective
      updateStudioElementPosition(elementId, { x: data.x, y: data.y });
    }
  };

  const handleResizeStop = (elementId: string, data: ResizeCallbackData) => {
    const currentElement = activeLayout.find(el => el.id === elementId);
    const currentScale = currentElement?.scale || 1;
    updateStudioElementSize(elementId, { width: data.size.width / currentScale, height: data.size.height / currentScale });
  };

  const handleSaveLayout = () => { if (newLayoutName.trim() === "") { alert("Please enter a name."); return; } saveCurrentStudioLayout(newLayoutName.trim()); setNewLayoutName(""); };
  const handleElementClick = (elementId: string) => { setSelectedElementId(elementId); };
  const handleCloseSettingsPanel = () => { setSelectedElementId(null); };

  const toolboxSectionStyle: React.CSSProperties = { marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #444',};
  const toolboxHeaderStyle: React.CSSProperties = { fontSize: '1em', color: '#ccc', marginBottom: '8px',};
  const inputStyle: React.CSSProperties = { width: 'calc(100% - 22px)', padding: '8px 10px', marginBottom: '10px', backgroundColor: '#2c2c2c', border: '1px solid #555', color: 'white', borderRadius: '4px',};
  const buttonStyle: React.CSSProperties = { display: 'block', width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', textAlign: 'center', fontSize: '0.9em',};
  const listItemStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 5px', borderBottom: '1px solid #2a2a2a', fontSize: '0.85em',};
  const layoutNameStyle: React.CSSProperties = { flexGrow: 1, marginRight: '10px', color: '#f0f0f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',};
  const actionButtonStyle: React.CSSProperties = { padding: '5px 8px', fontSize: '0.8em', marginLeft: '5px', cursor: 'pointer', borderRadius: '3px', border: 'none',};

  useEffect(() => {
    const { activePresetId, savedPresets, loadPreset, hostName, scores } = useDraftStore.getState();

    // Log current state for debugging
    console.log('[StudioInterface Mount] Initial state from store:', { activePresetId, savedPresetsCount: savedPresets.length, hostName });

    if (activePresetId && savedPresets && savedPresets.length > 0) {
      const presetToLoad = savedPresets.find(p => p.id === activePresetId);

      if (presetToLoad) {
        console.log('[StudioInterface Mount] Found active preset to load:', presetToLoad);
        // Check if preset data seems to be already applied to avoid redundant loads.
        // This check might need to be more robust depending on what `loadPreset` exactly does.
        // For example, if loadPreset also fetches fresh draft data, this check might be too simple.
        const isAlreadyLoaded = hostName === presetToLoad.hostName &&
                              JSON.stringify(scores) === JSON.stringify(presetToLoad.scores) &&
                              useDraftStore.getState().civDraftId === presetToLoad.civDraftId &&
                              useDraftStore.getState().mapDraftId === presetToLoad.mapDraftId;


        if (!isAlreadyLoaded) {
          console.log('[StudioInterface Mount] Active preset data not yet fully applied to current state. Calling loadPreset.');
          loadPreset(activePresetId);
        } else {
          console.log('[StudioInterface Mount] Active preset data seems to be already applied. Skipping loadPreset.');
        }
      } else {
        console.log('[StudioInterface Mount] Active preset ID found, but corresponding preset not in savedPresets. ID:', activePresetId);
        // Optionally, clear the invalid activePresetId from the store here
        // useDraftStore.setState({ activePresetId: null });
      }
    } else {
      console.log('[StudioInterface Mount] No activePresetId found or no savedPresets. Skipping auto-load.');
    }
  }, []); // Empty dependency array ensures this runs once on mount

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
              backgroundColor: layout.id === activeStudioLayoutId ? '#2a2a4a' : (listItemStyle.backgroundColor || 'transparent'),
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

        {/* Draft Presets Section Start */}
        <div style={toolboxSectionStyle}>
          <h3 style={toolboxHeaderStyle}>Save Current Draft</h3>
          <input
            type="text"
            placeholder="Draft Preset Name (optional)"
            value={newDraftPresetName}
            onChange={(e) => setNewDraftPresetName(e.target.value)}
            style={inputStyle}
          />
          <button
            onClick={() => {
              if (newDraftPresetName.trim() === "") {
                saveCurrentAsPreset(); // Store handles default name
              } else {
                saveCurrentAsPreset(newDraftPresetName.trim());
              }
              setNewDraftPresetName(""); // Clear input after saving
            }}
            style={buttonStyle}
          >
            Save Draft Preset
          </button>
        </div>
        <div style={{flexGrow: 1, overflowY: 'auto'}}>
          <h3 style={toolboxHeaderStyle}>Saved Draft Presets</h3>
          {savedPresets.length === 0 && <p style={{fontSize: '0.8em', color: '#777'}}>No draft presets yet.</p>}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {savedPresets.map((preset) => (
              <li
                key={preset.id}
                style={{
                  ...listItemStyle,
                  backgroundColor: preset.id === activePresetId ? '#2a2a4a' : 'transparent',
                  borderLeft: preset.id === activePresetId ? `3px solid #007bff` : 'none',
                  paddingLeft: preset.id === activePresetId ? '12px' : (listItemStyle.paddingLeft || '5px'),
                }}
              >
                <span
                  style={{
                    ...layoutNameStyle,
                    fontWeight: preset.id === activePresetId ? 'bold' : 'normal'
                  }}
                  title={preset.name}
                >
                  {preset.name} {preset.id === activePresetId && <em style={{fontSize: '0.9em', color: '#007bff'}}> (active)</em>}
                </span>
                <div>
                  <button
                    onClick={() => loadPreset(preset.id)}
                    style={{...actionButtonStyle, backgroundColor: '#28a745', color: 'white'}}
                    title="Load preset"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => {
                      const currentName = preset.name;
                      const newName = prompt("Enter new name for preset:", currentName);
                      if (newName && newName.trim() !== "" && newName.trim() !== currentName) {
                        updatePresetName(preset.id, newName.trim());
                      }
                    }}
                    style={{...actionButtonStyle, backgroundColor: '#6c757d', color: 'white'}}
                    title="Rename preset"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      if(confirm(`Are you sure you want to delete preset "${preset.name}"?`)) {
                        deletePreset(preset.id);
                      }
                    }}
                    style={{...actionButtonStyle, backgroundColor: '#dc3545', color: 'white'}}
                    title="Delete preset"
                  >
                    Del
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
        {/* Draft Presets Section End */}
      </aside>
      <main style={{ flexGrow: 1, padding: '1rem', position: 'relative', overflow: 'hidden' }} onClick={(e) => { if (e.target === e.currentTarget) { setSelectedElementId(null); } }}>
        {/* Tab Bar Start */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0px', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1, overflowX: 'auto', paddingBottom: '5px' }}>
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
                {canvas.name.length > 15 ? canvas.name.substring(0, 12) + '...' : canvas.name}
                <span
                  title="Open canvas in new window (placeholder)"
                  onClick={(e) => {
                    e.stopPropagation();
                    const broadcastUrl = `/index.html?view=broadcast&canvasId=${canvas.id}`;
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
              addCanvas();
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
          style={{
            position: 'relative',
            border: '1px dashed #444',
            overflow: 'hidden',
            backgroundColor: '#0d0d0d',
            width: '100%',
            aspectRatio: '16 / 9',
            maxHeight: 'calc(100vh - 60px - 2rem - 30px - 50px)',
            margin: 'auto',
          }}
        >
          {activeLayout.map((element: StudioElement) => {
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
                  >
                <ResizableBox
                    width={element.size.width * currentScale}
                    height={element.size.height * currentScale}
                    onResizeStop={(e, data) => handleResizeStop(element.id, data)}
                    minConstraints={[MIN_ELEMENT_WIDTH / currentScale, 30 / currentScale]}
                    maxConstraints={[800 / currentScale, 600 / currentScale]}
                    style={{ ...selectionStyle, position: 'absolute' }}
                    className="drag-handle">
                  <div
                       onClick={(e) => { e.stopPropagation(); handleElementClick(element.id);}}
                       style={{
                           width: element.size.width + 'px', height: element.size.height + 'px', overflow: 'hidden',
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
