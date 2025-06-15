import React, { useState, useMemo, useEffect } from 'react';
import useDraftStore from '../store/draftStore';
import ScoreOnlyElement from '../components/studio/ScoreOnlyElement'; // New
import NicknamesOnlyElement from '../components/studio/NicknamesOnlyElement'; // New
import BoXSeriesOverviewElement from '../components/studio/BoXSeriesOverviewElement';
import CountryFlagsElement from '../components/studio/CountryFlagsElement';
import ColorGlowElement from '../components/studio/ColorGlowElement';
import { StudioElement, SavedStudioLayout } from '../types/draft';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import 'react-resizable/css/styles.css';
import SettingsPanel from '../components/studio/SettingsPanel';
import MapPoolElement from '../components/studio/MapPoolElement'; // Import MapPoolElement

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
    removeCanvas,
    updateCanvasName, // Added updateCanvasName
    resetActiveCanvasLayout
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
  // dragStartContext is fully removed now.

  interface ResizeStartInfo {
    activeElement: { id: string; position: { x: number; y: number }; size: { width: number; height: number } };
    siblingElement?: { id: string; position: { x: number; y: number }; size: { width: number; height: number } };
    masterElementProps?: { isPivotLocked?: boolean }; // Store master's relevant props
    activeHandle?: string; // To store which handle is being dragged ('n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw')
  }
  const [resizeStartInfo, setResizeStartInfo] = useState<ResizeStartInfo | null>(null);
  const [dragStartIndividualY, setDragStartIndividualY] = useState<number | null>(null);


  const activeCanvas = useMemo(() => currentCanvases.find(c => c.id === activeCanvasId), [currentCanvases, activeCanvasId]);
  const activeLayout = useMemo(() => activeCanvas?.layout || [], [activeCanvas]);
  const selectedElement = useMemo(() => activeLayout.find(el => el.id === selectedElementId) || null, [selectedElementId, activeLayout]);

  const handleAddScoreOnly = () => { addStudioElement("ScoreOnly"); };
  const handleAddNicknamesOnly = () => { addStudioElement("NicknamesOnly"); };
  const handleAddBoXSeriesOverview = () => { addStudioElement("BoXSeriesOverview"); };
  const handleAddCountryFlags = () => { addStudioElement("CountryFlags"); };
  const handleAddColorGlowElement = () => { addStudioElement("ColorGlowElement"); };
  const handleAddMapPool = () => { addStudioElement("MapPool"); }; // Handler for MapPool

  const handleDrag = (elementId: string, data: DraggableData) => {
    const draggedElement = activeLayout.find(el => el.id === elementId);
    if (!draggedElement) return;

    let newX = data.x;
    let newY = data.y;

    if (draggedElement.type === "MapPool" && draggedElement.pairId) {
      const masterElement = draggedElement.isPairMaster
        ? draggedElement
        : activeLayout.find(el => el.pairId === draggedElement.pairId && el.isPairMaster);

      const isLocked = masterElement?.isPivotLocked === true;

      if (isLocked) {
        // Horizontal drag only for locked MapPool pairs
        if (dragStartIndividualY !== null) {
          newY = dragStartIndividualY;
        } else {
          // Fallback if dragStartIndividualY wasn't set (should not happen if onStart is correct)
          newY = draggedElement.position.y;
        }
        updateStudioElementPosition(draggedElement.id, { x: newX, y: newY });
        // Sibling is not moved when dragging an individual part of a locked pair
      } else {
        // Unlocked MapPool pair: Drag together
        updateStudioElementPosition(draggedElement.id, { x: newX, y: newY }); // Update active first
        const siblingElement = activeLayout.find(el => el.pairId === draggedElement.pairId && el.id !== elementId);
        if (siblingElement) {
          // Calculate delta based on the just-updated draggedElement's intended new position vs its *old* position
          // This requires knowing the draggedElement's position *before* this current 'data' event.
          // The `draggedElement` variable here IS the element from before this specific data event.
          const deltaX = newX - draggedElement.position.x;
          const deltaY = newY - draggedElement.position.y;

          updateStudioElementPosition(siblingElement.id, {
            x: siblingElement.position.x + deltaX,
            y: siblingElement.position.y + deltaY,
          });
        }
      }
    } else {
      // Standard drag for non-MapPool elements or unpaired elements
      // TODO: Re-integrate old pivot lock logic for other element types if necessary
      updateStudioElementPosition(elementId, { x: newX, y: newY });
    }
  };

  const handleResizeStart = (elementId: string, e: React.SyntheticEvent, rData: object & { handle?: string }) => {
    const element = activeLayout.find(el => el.id === elementId);
    if (!element) return;

    let info: ResizeStartInfo = {
      activeElement: { id: element.id, position: { ...element.position }, size: { ...element.size } },
      activeHandle: rData.handle
    };

    if (element.type === "MapPool" && element.pairId) {
      const master = element.isPairMaster ? element : activeLayout.find(el => el.pairId === element.pairId && el.isPairMaster);
      const sibling = activeLayout.find(el => el.pairId === element.pairId && el.id !== element.id);
      if (master) {
        info.masterElementProps = { isPivotLocked: master.isPivotLocked };
      }
      if (sibling) {
        info.siblingElement = { id: sibling.id, position: { ...sibling.position }, size: { ...sibling.size } };
      }
    }
    setResizeStartInfo(info);
  };

  const handleResizeStop = (elementId: string, e: React.SyntheticEvent, data: ResizeCallbackData) => {
    const resizedElementFromStore = activeLayout.find(el => el.id === elementId);

    if (!resizedElementFromStore || !resizeStartInfo || resizeStartInfo.activeElement.id !== elementId) {
      if (resizedElementFromStore) {
        const scale = resizedElementFromStore.scale || 1;
        updateStudioElementSize(elementId, { width: data.size.width / scale, height: data.size.height / scale });
      }
      setResizeStartInfo(null);
      return;
    }

    const currentScale = resizedElementFromStore.scale || 1;
    const newUnscaledSize = {
      width: data.size.width / currentScale,
      height: data.size.height / currentScale,
    };

    updateStudioElementSize(elementId, newUnscaledSize);

    const activeElCurrentState = {
        ...resizedElementFromStore,
        size: newUnscaledSize,
        position: useDraftStore.getState().currentCanvases.find(c => c.id === activeCanvasId)?.layout.find(el => el.id === elementId)?.position || resizedElementFromStore.position,
    };

    const { activeElement: activeElPrev, siblingElement: siblingElPrev, masterElementProps, activeHandle } = resizeStartInfo;
    const isLocked = masterElementProps?.isPivotLocked === true;

    if (activeElCurrentState.type === "MapPool" && activeElCurrentState.pairId && siblingElPrev) {
      const siblingCurrentInStore = activeLayout.find(el => el.id === siblingElPrev.id);
      if (!siblingCurrentInStore) {
        setResizeStartInfo(null);
        return;
      }

      if (activeElCurrentState.isPairMaster) {
        updateStudioElementSize(siblingElPrev.id, { ...newUnscaledSize });
      } else {
        const master = activeLayout.find(el => el.pairId === activeElCurrentState.pairId && el.isPairMaster);
        if (master) {
          updateStudioElementSize(master.id, { ...newUnscaledSize });
          if (siblingElPrev.id !== master.id) {
             updateStudioElementSize(siblingElPrev.id, { ...newUnscaledSize });
          }
        }
      }

      if (isLocked) {
        const activeElOldPos = activeElPrev.position;
        const activeElOldSize = activeElPrev.size;

        const activeElNewPos = activeElCurrentState.position;
        const activeElNewSizeFull = activeElCurrentState.size;

        const activeElOldCenterX = activeElOldPos.x + activeElOldSize.width / 2;
        const activeElNewCenterX = activeElNewPos.x + activeElNewSizeFull.width / 2;
        const deltaCenter = activeElNewCenterX - activeElOldCenterX;

        const siblingElOldPos = siblingElPrev.position.x;
        const siblingElOldSize = siblingElPrev.size.width;
        const siblingElNewWidth = newUnscaledSize.width;

        const siblingElOldCenterX = siblingElOldPos.x + siblingElOldSize / 2;
        const siblingElNewCenterX = siblingElOldCenterX - deltaCenter;

        let siblingElNewX = siblingElNewCenterX - (siblingElNewWidth / 2);

        const newYForBoth = activeElNewPos.y;

        updateStudioElementPosition(siblingElPrev.id, { x: siblingElNewX, y: newYForBoth });
        if (activeElCurrentState.position.y !== newYForBoth) {
            // This case should ideally not be hit if activeElNewPos.y is the source of truth for newYForBoth.
            // However, if handleDrag updates the store, and then this runs, this ensures alignment.
            updateStudioElementPosition(activeElCurrentState.id, {x: activeElNewPos.x, y: newYForBoth});
        }
      }
    }
    setResizeStartInfo(null);
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
           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}> {/* New wrapper div */}
             <button onClick={handleAddScoreOnly} style={{ ...buttonStyle, width: 'calc(50% - 5px)' }}>Add Score</button>
             <button onClick={handleAddNicknamesOnly} style={{ ...buttonStyle, width: 'calc(50% - 5px)' }}>Add Nicknames</button>
             <button onClick={handleAddBoXSeriesOverview} style={{ ...buttonStyle, width: 'calc(50% - 5px)' }}>Add BoX Series Overview</button>
             <button onClick={handleAddCountryFlags} style={{ ...buttonStyle, width: 'calc(50% - 5px)' }}>Add Country Flags</button>
             <button onClick={handleAddColorGlowElement} style={{ ...buttonStyle, width: 'calc(50% - 5px)' }}>Add Color Glow</button>
             <button onClick={handleAddMapPool} style={{ ...buttonStyle, width: 'calc(50% - 5px)' }}>Add Map Pool</button> {/* New Button */}
           </div>
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
                 <> {/* Fragment for editing mode */}
                   <input
                     type="text"
                     value={editingCanvasName}
                     onChange={(e) => setEditingCanvasName(e.target.value)}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                         const trimmedName = editingCanvasName.trim();
                         if (trimmedName !== "" && trimmedName !== canvas.name) {
                           updateCanvasName(canvas.id, trimmedName);
                         }
                         setEditingCanvasId(null);
                       } else if (e.key === 'Escape') {
                         setEditingCanvasId(null);
                       }
                     }}
                     autoFocus
                     onClick={(e) => e.stopPropagation()}
                     style={{ padding: '2px 4px', border: '1px solid #777', backgroundColor: '#1a1a1a', color: 'white', maxWidth: '80px' }}
                   />
                   <button
                     title="Confirm rename"
                     onClick={(e) => {
                       e.stopPropagation();
                       const trimmedName = editingCanvasName.trim();
                       if (trimmedName !== "" && trimmedName !== canvas.name) {
                         updateCanvasName(canvas.id, trimmedName);
                       }
                       setEditingCanvasId(null);
                     }}
                     style={{ background: 'transparent', border: 'none', color: '#4CAF50', padding: '0 5px', cursor: 'pointer', fontSize: '1.2em', marginLeft: '4px' }}
                   >
                     ✔️
                   </button>
                   <button
                     title="Cancel rename"
                     onClick={(e) => {
                       e.stopPropagation();
                       setEditingCanvasId(null);
                     }}
                     style={{ background: 'transparent', border: 'none', color: '#F44336', padding: '0 5px', marginLeft: '5px', cursor: 'pointer', fontSize: '1.2em' }}
                   >
                     ❌
                   </button>
                 </>
               ) : (
                 <> {/* Fragment for display mode */}
                   <span
                     style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px', display: 'inline-block'}}
                     title={canvas.name}
                   >
                     {canvas.name.length > 15 ? canvas.name.substring(0, 12) + '...' : canvas.name}
                   </span>
                   <button
                     title="Rename canvas"
                     onClick={(e) => {
                       e.stopPropagation();
                       setEditingCanvasId(canvas.id);
                       setEditingCanvasName(canvas.name);
                     }}
                     style={{ background: 'transparent', border: 'none', color: '#ccc', padding: '0 5px', marginLeft: '5px', cursor: 'pointer', fontSize: '1em' }}
                   >
                     ✏️
                   </button>
                   {/* Open in new window button */}
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
                </>
              )}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              if (activeCanvas && activeCanvas.layout.length > 0) {
                if (confirm(`Are you sure you want to remove all elements from canvas "${activeCanvas.name}"?`)) {
                  resetActiveCanvasLayout();
                }
              }
            }}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '6px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9em',
              marginLeft: '10px', // Spacing from the tab list
              flexShrink: 0
            }}
            title="Remove all elements from current canvas"
            disabled={!activeCanvas || activeCanvas.layout.length === 0}
          >
            Reset 🗑️
          </button>
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
          {/* Visual Center Guide Line */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              top: '0px', // Starts from the top edge of the canvas container
              width: '1px',
              height: '20px', // A short line
              backgroundColor: '#555', // A visible gray color
              pointerEvents: 'none', // Non-interactive
              zIndex: 0, // Ensure it's behind elements if they get higher z-index
            }}
            aria-hidden="true" // Decorative element
          />
          {activeLayout.map((element: StudioElement, index: number) => { // Added index here
            const isSelected = element.id === selectedElementId;
            const currentScale = element.scale || 1;

            // Determine a base z-index based on render order.
            // Later elements in the array get a higher base z-index.
            // Adding 1 to ensure zIndex starts from 1, not 0.
            const baseZIndex = index + 1;

            // Set a significantly higher z-index for the selected element.
            const zIndexValue = isSelected ? 999 : baseZIndex;

            const elementSpecificStyle: React.CSSProperties = {
              zIndex: zIndexValue,
              position: 'absolute',
            };

            let content = null;
            if (element.type === "ScoreOnly") { content = <ScoreOnlyElement element={element} isSelected={isSelected} />; }
            else if (element.type === "NicknamesOnly") { content = <NicknamesOnlyElement element={element} isSelected={isSelected} />; }
            else if (element.type === "BoXSeriesOverview") { content = <BoXSeriesOverviewElement element={element} />; }
            else if (element.type === "CountryFlags") { content = <CountryFlagsElement element={element} isSelected={isSelected} />; }
            else if (element.type === "ColorGlowElement") { content = <ColorGlowElement element={element} isSelected={element.id === selectedElementId} />; }
            else if (element.type === "MapPool") { content = <MapPoolElement element={element} />; } // Added MapPoolElement
            else { content = <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dotted #555'}}>Unknown: {element.type}</div>; }

            return (
              <Draggable
                  key={element.id}
                  handle=".drag-handle"
                  position={{ x: element.position.x, y: element.position.y }}
                  onStart={(e: DraggableEvent, data: DraggableData) => {
                    const el = activeLayout.find(el => el.id === element.id);
                    if (el && el.type === "MapPool" && el.pairId) {
                      const master = el.isPairMaster ? el : activeLayout.find(m => m.pairId === el.pairId && m.isPairMaster);
                      if (master?.isPivotLocked) {
                        setDragStartIndividualY(el.position.y);
                      } else {
                        setDragStartIndividualY(null);
                      }
                    } else {
                      setDragStartIndividualY(null);
                    }
                  }}
                  onDrag={(e: DraggableEvent, data: DraggableData) => handleDrag(element.id, data)}
                  onStop={() => {
                    setDragStartIndividualY(null);
                    // Potentially other onStop logic if needed in future
                  }}
                  >
                <ResizableBox
                    width={element.size.width * currentScale}
                    height={element.size.height * currentScale}
                    onResizeStart={(e, data: object & { handle?: string }) => handleResizeStart(element.id, e, data)}
                    onResizeStop={(e, data) => handleResizeStop(element.id, e, data)}
                    minConstraints={[MIN_ELEMENT_WIDTH / currentScale, 30 / currentScale]}
                    maxConstraints={[800 / currentScale, 600 / currentScale]}
                    style={elementSpecificStyle} // Apply new style here
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
