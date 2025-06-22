import React, { useState, useMemo, useEffect } from 'react';
import useDraftStore from '../store/draftStore';
import ScoreOnlyElement from '../components/studio/ScoreOnlyElement'; // New
import NicknamesOnlyElement from '../components/studio/NicknamesOnlyElement'; // New
import BoXSeriesOverviewElement from '../components/studio/BoXSeriesOverviewElement';
import CountryFlagsElement from '../components/studio/CountryFlagsElement';
import ColorGlowElement from '../components/studio/ColorGlowElement';
import MapPoolElement from '../components/studio/MapPoolElement';
import CivPoolElement from '../components/studio/CivPoolElement'; // Added CivPoolElement import
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
    removeCanvas,
    updateCanvasName, // Added updateCanvasName
    resetActiveCanvasLayout,
    setCanvasBackgroundColor,
    setCanvasBackgroundImage,
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
  const [isCanvasSettingsOpen, setIsCanvasSettingsOpen] = useState<boolean>(true); // This was the original state, let's keep it.
  // const [availableBackgroundImages, setAvailableBackgroundImages] = useState<string[]>([]); // Old: To be removed
  // const [selectedImageForPreview, setSelectedImageForPreview] = useState<string | null>(null); // Old: To be removed
  const [editingCanvasId, setEditingCanvasId] = useState<string | null>(null);
  const [editingCanvasName, setEditingCanvasName] = useState<string>("");
  const [dragStartContext, setDragStartContext] = useState<{ elementId: string, initialMouseX: number, elementCenterX: number } | null>(null);

  const activeCanvas = useMemo(() => currentCanvases.find(c => c.id === activeCanvasId), [currentCanvases, activeCanvasId]);
  const activeLayout = useMemo(() => activeCanvas?.layout || [], [activeCanvas]);
  const selectedElement = useMemo(() => activeLayout.find(el => el.id === selectedElementId) || null, [selectedElementId, activeLayout]);

  // const fetchBackgroundImages = async () => { // Old: To be removed
  //   console.log('[DEBUG] fetchBackgroundImages called');
  //   try {
  //     const imageFiles = [
  //       "simulated_image1.png",
  //       "dynamic_scene_of_glowing_sparks_from_a_campfire_scattered_in_various_directions_against_a_black_bac_dkeqyamwxba0be003lv5_2.png",
  //       "simulated_image2.jpg"
  //     ];
  //     console.log('[DEBUG] Simulated imageFiles (ensured as array):', imageFiles);
  //     const filteredImages = imageFiles.filter(file => typeof file === 'string' && !file.endsWith('/'));
  //     console.log('[DEBUG] Setting availableBackgroundImages to:', filteredImages);
  //     // setAvailableBackgroundImages(filteredImages); // State variable removed
  //   } catch (error) {
  //     console.error("Error fetching background images:", error);
  //     // setAvailableBackgroundImages([]); // State variable removed
  //   }
  // };

  // useEffect(() => { // Old: To be removed
  //   // fetchBackgroundImages();
  // }, []);

  // useEffect(() => { // Old: To be removed
  //   // console.log('[DEBUG] availableBackgroundImages state updated:', availableBackgroundImages);
  // }, [availableBackgroundImages]);

  const handleAddScoreOnly = () => { addStudioElement("ScoreOnly"); };
  const handleAddNicknamesOnly = () => { addStudioElement("NicknamesOnly"); };
  const handleAddBoXSeriesOverview = () => { addStudioElement("BoXSeriesOverview"); };
  const handleAddCountryFlags = () => { addStudioElement("CountryFlags"); };
  const handleAddColorGlowElement = () => { addStudioElement("ColorGlowElement"); };
  const handleAddMapPoolElement = () => { addStudioElement("MapPoolElement"); };
  const handleAddCivPoolElement = () => { addStudioElement("CivPoolElement"); }; // Added CivPoolElement handler

  const handleDrag = (elementId: string, data: DraggableData) => {
    const element = activeLayout.find(el => el.id === elementId);
    if (!element) return;

    if (element.isPivotLocked) {
    // Vertical drag part (screen coordinates)
    let newY_screen = element.position.y + data.deltaY;

    // element, data, newY_screen, currentX_screen, currentScale, dragStartContext are available from the outer scope or calculated just before this
    if (element.type === "MapPoolElement" || element.type === "CivPoolElement") { // Extended condition
        let newHorizontalSplitOffset = element.horizontalSplitOffset || 0;
        const currentX_screen = element.position.x; // Added for clarity, though already available
        const currentScale = element.scale || 1; // Added for clarity

        if (data.deltaX !== 0 && dragStartContext && dragStartContext.elementId === elementId) {
            let changeInOffsetFactor = data.deltaX / currentScale; // currentScale is element.scale || 1

            if (dragStartContext.initialMouseX < dragStartContext.elementCenterX) { // Drag started on left half
                newHorizontalSplitOffset = Math.max(0, (element.horizontalSplitOffset || 0) - changeInOffsetFactor);
            } else { // Drag started on right half
                newHorizontalSplitOffset = Math.max(0, (element.horizontalSplitOffset || 0) + changeInOffsetFactor);
            }
        }

        updateStudioElementSettings(elementId, {
            position: { x: currentX_screen, y: newY_screen }, // Use currentX_screen for x, newY_screen for y
            horizontalSplitOffset: newHorizontalSplitOffset
            // Note: Size is intentionally not included here as it doesn't change for MapPoolElement during pivot drag
        });
        return; // Crucial: Exit to prevent MapPoolElement from being processed by subsequent generic pivot logic
    }

    // Current state values
    // const currentX_screen = element.position.x; // This is now defined above if MapPoolElement block is not hit
    const currentX_screen = element.position.x; // Re-declare here if needed due to block scoping, or rely on outer.
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
        let actualEffectiveUnscaledDrag = effectiveUnscaledDrag;

        if (dragStartContext && dragStartContext.elementId === elementId) {
          if (dragStartContext.initialMouseX < dragStartContext.elementCenterX) { // Drag started on left half
            actualEffectiveUnscaledDrag = -effectiveUnscaledDrag;
          }
          // If drag started on right half, actualEffectiveUnscaledDrag remains effectiveUnscaledDrag
        }

        // Determine the new unscaled width, constrained by MIN_ELEMENT_WIDTH
        finalUnscaledWidth = Math.max(MIN_ELEMENT_WIDTH, currentUnscaledWidth + (2 * actualEffectiveUnscaledDrag));

        // Calculate the actual change applied to one edge in unscaled units
        // This is based on the difference between current width and the (potentially clamped) final width.
        const actualUnscaledDragAppliedToEdge = (currentUnscaledWidth - finalUnscaledWidth) / 2;

        // Calculate the new top-left X screen coordinate to keep the pivotScreenX_fixed stationary
        finalX_screen = pivotScreenX_fixed - (finalUnscaledWidth / 2) * currentScale;

        // Calculate the new unscaled pivot offset
        // MODIFIED: Changed "ScoreDisplay" to "ScoreOnly"
        if (element.type === "ScoreOnly") {
          // For ScoreOnly, pivotInternalOffset is the width of the central score column.
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

  useEffect(() => {
    const {
      activeStudioLayoutId,
      savedStudioLayouts,
      loadStudioLayout,
      currentCanvases, // Get currentCanvases to potentially check if layout is already loaded
      activeCanvasId // Get activeCanvasId for the same reason
    } = useDraftStore.getState();

    console.log('LOGAOEINFO: [StudioInterface Mount Layout Effect] activeStudioLayoutId:', activeStudioLayoutId);

    if (activeStudioLayoutId) {
      const layoutToLoad = savedStudioLayouts.find(l => l.id === activeStudioLayoutId);
      if (layoutToLoad) {
        // Basic check: Only load if the activeCanvasId doesn't match the one in the layout to load,
        // or if the number of elements is different. This is a heuristic to prevent redundant loads
        // if the rehydration already set things up.
        // A more robust check might involve comparing a snapshot or version of the loaded layout.
        const activeCanvasInLayoutToLoad = layoutToLoad.canvases.find(c => c.id === layoutToLoad.activeCanvasId);
        const currentActiveCanvasInState = currentCanvases.find(c => c.id === activeCanvasId);

        const isLayoutPotentiallyAlreadyLoaded =
          activeCanvasId === layoutToLoad.activeCanvasId &&
          activeCanvasInLayoutToLoad?.layout.length === currentActiveCanvasInState?.layout.length &&
          JSON.stringify(activeCanvasInLayoutToLoad?.layout) === JSON.stringify(currentActiveCanvasInState?.layout);


        if (!isLayoutPotentiallyAlreadyLoaded) {
          console.log('LOGAOEINFO: [StudioInterface Mount Layout Effect] Attempting to load layout:', activeStudioLayoutId);
          loadStudioLayout(activeStudioLayoutId);
        } else {
          console.log('LOGAOEINFO: [StudioInterface Mount Layout Effect] Layout already seems to be loaded or matches state. Skipping redundant load of layout:', activeStudioLayoutId);
        }
      } else {
        console.warn('LOGAOEINFO: [StudioInterface Mount Layout Effect] activeStudioLayoutId found, but corresponding layout not in savedStudioLayouts. ID:', activeStudioLayoutId);
        // Optionally, clear the invalid activeStudioLayoutId here if this state is problematic
        // useDraftStore.setState({ activeStudioLayoutId: null });
      }
    } else {
      console.log('LOGAOEINFO: [StudioInterface Mount Layout Effect] No activeStudioLayoutId found. Skipping auto-load.');
    }
  }, []); // Empty dependency array ensures this runs only once on mount

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
             <button onClick={handleAddMapPoolElement} style={{ ...buttonStyle, width: 'calc(50% - 5px)' }}>Add Map Pool</button>
             <button onClick={handleAddCivPoolElement} style={{ ...buttonStyle, width: 'calc(50% - 5px)' }}>Add Civ Pool</button> {/* Added Civ Pool button */}
             <button onClick={() => addStudioElement("BackgroundImage")} style={{ ...buttonStyle, width: 'calc(50% - 5px)' }}>Add Background Element</button>
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

        {/* Canvas Settings Section */}
        {activeCanvas && (
          <div style={toolboxSectionStyle}>
            <h3
              style={{...toolboxHeaderStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between'}}
              onClick={() => setIsCanvasSettingsOpen(!isCanvasSettingsOpen)}
            >
              <span>Canvas: {activeCanvas.name}</span>
              <span>{isCanvasSettingsOpen ? '▼' : '▶'}</span>
            </h3>
            {isCanvasSettingsOpen && (
              <>
                <div>
                  <label htmlFor="canvasBgColorPicker" style={{display: 'block', marginBottom: '5px', fontSize: '0.9em', color: '#b0b0b0'}}>Background Color:</label>
                  <div style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
                    <input
                      type="color"
                      id="canvasBgColorPicker"
                      value={activeCanvas.backgroundColor || '#000000'}
                      onChange={(e) => activeCanvasId && setCanvasBackgroundColor(activeCanvasId, e.target.value)}
                      style={{marginRight: '10px', height: '30px', width: '50px', padding: '2px', border: '1px solid #555', backgroundColor: '#2c2c2c'}}
                    />
                    <button
                      onClick={() => activeCanvasId && setCanvasBackgroundColor(activeCanvasId, null)}
                      style={{...buttonStyle, width: 'auto', padding: '5px 10px', fontSize: '0.8em', backgroundColor: '#555'}}
                      title="Clear background color"
                    >
                      Clear Color
                    </button>
                  </div>
                </div>
                {/* Old background image selection UI removed. Canvas background color picker remains. */}
              </>
            )}
          </div>
        )}
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
            else if (element.type === "MapPoolElement") { content = <MapPoolElement element={element} />; }
            else if (element.type === "CivPoolElement") { content = <CivPoolElement element={element} />; } // Added CivPoolElement rendering
            else { content = <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dotted #555'}}>Unknown: {element.type}</div>; }

            return (
              <Draggable
                  key={element.id}
                  handle=".drag-handle"
                  position={{ x: element.position.x, y: element.position.y }}
                  onDrag={(e: DraggableEvent, data: DraggableData) => handleDrag(element.id, data)}
                  onStart={(e: DraggableEvent, data: DraggableData) => {
                    const currentElement = activeLayout.find(el => el.id === element.id);
                    if (currentElement && currentElement.isPivotLocked) {
                      const eventAsMouseEvent = e as MouseEvent;
                      const scale = currentElement.scale || 1;
                      const elementCenterX = currentElement.position.x + (currentElement.size.width * scale / 2);
                      setDragStartContext({
                        elementId: currentElement.id,
                        initialMouseX: eventAsMouseEvent.clientX,
                        elementCenterX: elementCenterX
                      });
                    }
                  }}
                  onStop={() => {
                    setDragStartContext(null);
                  }}
                  >
                <ResizableBox
                    width={element.size.width * currentScale}
                    height={element.size.height * currentScale}
                    onResizeStop={(e, data) => handleResizeStop(element.id, data)}
                    minConstraints={[MIN_ELEMENT_WIDTH / currentScale, 30 / currentScale]}
                    maxConstraints={[800 / currentScale, 600 / currentScale]}
                    style={elementSpecificStyle} // Apply new style here
                    className="drag-handle">
                  <div
                       onClick={(e) => { e.stopPropagation(); handleElementClick(element.id);}}
                       style={{
                           width: element.size.width + 'px', height: element.size.height + 'px', overflow: 'visible',
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
