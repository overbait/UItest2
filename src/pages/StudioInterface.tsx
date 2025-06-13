import React, { useState, useMemo, useEffect } from 'react';
import useDraftStore from '../store/draftStore';
import ScoreOnlyElement from '../components/studio/ScoreOnlyElement'; // New
import NicknamesOnlyElement from '../components/studio/NicknamesOnlyElement'; // New
import BoXSeriesOverviewElement from '../components/studio/BoXSeriesOverviewElement';
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
    savedStudioLayouts, selectedElementId,
    addStudioElement,
    updateStudioElementPosition, updateStudioElementSize, updateStudioElementSettings,
    saveCurrentStudioLayout, loadStudioLayout, deleteStudioLayout, setSelectedElementId,
    addCanvas,
    setActiveCanvas,
    removeCanvas
  } = useDraftStore(state => state);

  // Logging for savedStudioLayouts and activeStudioLayoutId
  console.log('LOGAOEINFO: [StudioInterface Render] savedStudioLayouts from store:', savedStudioLayouts, 'Active Studio Layout ID:', activeStudioLayoutId);

  useEffect(() => {
    (window as any).IS_BROADCAST_STUDIO = true;
    return () => {
      (window as any).IS_BROADCAST_STUDIO = false;
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount

  const [newLayoutName, setNewLayoutName] = useState<string>("");
  const [isElementsOpen, setIsElementsOpen] = useState<boolean>(true);
  const [isSaveLayoutOpen, setIsSaveLayoutOpen] = useState<boolean>(true);
  const [isLayoutsListOpen, setIsLayoutsListOpen] = useState<boolean>(true);
  const [editingCanvasId, setEditingCanvasId] = useState<string | null>(null);
  const [editingCanvasName, setEditingCanvasName] = useState<string>("");

  const activeCanvas = useMemo(() => currentCanvases.find(c => c.id === activeCanvasId), [currentCanvases, activeCanvasId]);
  const activeLayout = useMemo(() => activeCanvas?.layout || [], [activeCanvas]);
  const selectedElement = useMemo(() => activeLayout.find(el => el.id === selectedElementId) || null, [selectedElementId, activeLayout]);

  const handleAddScoreOnly = () => { addStudioElement("ScoreOnly"); };
  const handleAddNicknamesOnly = () => { addStudioElement("NicknamesOnly"); };
  const handleAddBoXSeriesOverview = () => { addStudioElement("BoXSeriesOverview"); };

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
        if (element.type === "ScoreDisplay") {
          // For ScoreDisplay, pivotInternalOffset is the width of the central score column.
          // If element width shrinks (actualUnscaledDragAppliedToEdge > 0), pivot offset must shrink.
          // If element width grows (actualUnscaledDragAppliedToEdge < 0), pivot offset can grow.
          // Change in pivot offset is 2 * actualUnscaledDragAppliedToEdge (since width change is total)
          finalPivotOffset_unscaled = Math.max(0, currentPivotOffset_unscaled - (2 * actualUnscaledDragAppliedToEdge));
        } else if (element.type === "BoXSeriesOverview") {
          // For BoXSeriesOverview, pivotInternalOffset is the width of EACH of the two spacer columns
          // next to the central map.
          // If element width shrinks (actualUnscaledDragAppliedToEdge > 0), these spacers must shrink.
          // If element width grows (actualUnscaledDragAppliedToEdge < 0), these spacers can grow.
          // The change to each spacer is actualUnscaledDragAppliedToEdge.
          finalPivotOffset_unscaled = Math.max(0, currentPivotOffset_unscaled - actualUnscaledDragAppliedToEdge);
        }
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
    // Ensure all necessary fields are pulled from the store.
    // Note: Using getState() inside useEffect is fine for one-time reads on mount.
    // If this effect were to re-run based on these values changing, you'd select them with useDraftStore(state => ...)
    const { activePresetId, savedPresets, loadPreset, hostName, scores, civDraftId, mapDraftId } = useDraftStore.getState();

    console.log('LOGAOEINFO: [StudioInterface Mount Effect] Initial state check:', {
      activePresetId,
      hasSavedPresets: savedPresets && savedPresets.length > 0,
      currentHostName: hostName
    });

    if (activePresetId && savedPresets && savedPresets.length > 0) {
      const presetToLoad = savedPresets.find(p => p.id === activePresetId);

      if (presetToLoad) {
        console.log('LOGAOEINFO: [StudioInterface Mount Effect] Found active preset to load:', presetToLoad);

        const isAlreadyLoaded = hostName === presetToLoad.hostName &&
                              JSON.stringify(scores) === JSON.stringify(presetToLoad.scores) &&
                              civDraftId === presetToLoad.civDraftId &&
                              mapDraftId === presetToLoad.mapDraftId;

        if (!isAlreadyLoaded) {
          console.log('LOGAOEINFO: [StudioInterface Mount Effect] Active preset data not yet fully applied. Calling loadPreset(activePresetId).');
          loadPreset(activePresetId);
        } else {
          console.log('LOGAOEINFO: [StudioInterface Mount Effect] Active preset data seems to be already applied. Skipping loadPreset.');
        }
      } else {
        console.log('LOGAOEINFO: [StudioInterface Mount Effect] Active preset ID found, but corresponding preset not in savedPresets. ID:', activePresetId);
        // Optional: Clear the invalid activePresetId if it's confirmed this state is erroneous
        // useDraftStore.setState({ activePresetId: null });
      }
    } else {
      console.log('LOGAOEINFO: [StudioInterface Mount Effect] No activePresetId found or no savedPresets. Skipping auto-load.');
    }
  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <div style={{ backgroundColor: 'black', color: 'white', minHeight: 'calc(100vh - 60px)', display: 'flex', overflow: 'hidden', position: 'relative' }}>
      <aside style={{ width: '250px', borderRight: '1px solid #333', padding: '1rem', backgroundColor: '#1a1a1a', overflowY: 'auto', display: 'flex', flexDirection: 'column', zIndex: 1 }}>
        <h2 style={{ marginBottom: '1rem', color: '#a0a0a0', fontSize: '1.1em', textAlign: 'center', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>Toolbox</h2>

        <div style={toolboxSectionStyle}>
         <h3
           style={{...toolboxHeaderStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between'}}
           onClick={() => setIsElementsOpen(!isElementsOpen)}
         >
           Elements
           <span>{isElementsOpen ? '▼' : '▶'}</span>
         </h3>
         {isElementsOpen && (
           <>
              <button onClick={handleAddScoreOnly} style={buttonStyle}>Add Score</button>
              <button onClick={handleAddNicknamesOnly} style={buttonStyle}>Add Nicknames</button>
              <button onClick={handleAddBoXSeriesOverview} style={buttonStyle}>Add BoX Series Overview</button>
           </>
         )}
        </div>

        <div style={toolboxSectionStyle}>
         <h3
           style={{...toolboxHeaderStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between'}}
           onClick={() => setIsSaveLayoutOpen(!isSaveLayoutOpen)}
         >
           Save Current Layout
           <span>{isSaveLayoutOpen ? '▼' : '▶'}</span>
         </h3>
         {isSaveLayoutOpen && (
           <>
              <input type="text" placeholder="Layout Name" value={newLayoutName} onChange={(e) => setNewLayoutName(e.target.value)} style={inputStyle}/>
              <button onClick={handleSaveLayout} style={buttonStyle}>Save Layout</button>
           </>
         )}
        </div>

        <div style={{flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}> {/* Outer container for flex behavior */}
         <h3
           style={{...toolboxHeaderStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', flexShrink: 0}}
           onClick={() => setIsLayoutsListOpen(!isLayoutsListOpen)}
         >
           Saved Layouts
           <span>{isLayoutsListOpen ? '▼' : '▶'}</span>
         </h3>
         {isLayoutsListOpen && (
           <div style={{flexGrow: 1, overflowY: 'auto'}}> {/* This inner div is now the scrollable part */}
             {savedStudioLayouts.length === 0 && <p style={{fontSize: '0.8em', color: '#777'}}>No saved layouts yet.</p>}
             <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{savedStudioLayouts.map((layout: SavedStudioLayout) => (
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
              ))}</ul>
           </div>
         )} {/* Corrected closing for isLayoutsListOpen */}
        </div> {/* Corrected closing for the Saved Layouts main div */}

        {/* New section for Settings Panel */}
        <div style={toolboxSectionStyle}>
          {/* The SettingsPanel will only render its content if selectedElement is not null */}
          <SettingsPanel selectedElement={selectedElement} onClose={handleCloseSettingsPanel} />
        </div>
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
               {editingCanvasId === canvas.id ? (
                 <input
                   type="text"
                   value={editingCanvasName}
                   onChange={(e) => setEditingCanvasName(e.target.value)}
                   onBlur={() => {
                     if (editingCanvasName.trim() !== "") {
                       updateCanvasName(canvas.id, editingCanvasName);
                     }
                     setEditingCanvasId(null);
                   }}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter') {
                       if (editingCanvasName.trim() !== "") {
                         updateCanvasName(canvas.id, editingCanvasName);
                       }
                       setEditingCanvasId(null);
                       e.currentTarget.blur(); // Optional: remove focus
                     } else if (e.key === 'Escape') {
                       setEditingCanvasId(null);
                       setEditingCanvasName(""); // Reset temp name
                     }
                   }}
                   autoFocus
                   onClick={(e) => e.stopPropagation()} // Prevent tab button click when clicking input
                   style={{
                     padding: '2px 4px',
                     border: '1px solid #777',
                     backgroundColor: '#1a1a1a',
                     color: 'white',
                     maxWidth: '100px' // Prevent very long input
                   }}
                 />
               ) : (
                 <span
                   onDoubleClick={() => {
                     setEditingCanvasId(canvas.id);
                     setEditingCanvasName(canvas.name);
                   }}
                   style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px', display: 'inline-block'}}
                   title={`${canvas.name} (Double-click to rename)`}
                 >
                   {canvas.name.length > 15 ? canvas.name.substring(0, 12) + '...' : canvas.name}
                 </span>
               )}
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
            if (element.type === "ScoreOnly") { content = <ScoreOnlyElement element={element} />; }
            else if (element.type === "NicknamesOnly") { content = <NicknamesOnlyElement element={element} />; }
            else if (element.type === "BoXSeriesOverview") { content = <BoXSeriesOverviewElement element={element} />; }
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
      {/* The SettingsPanel line is removed from here */}
    </div>
  );
};
export default StudioInterface;
