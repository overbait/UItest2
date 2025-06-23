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
    // setCanvasBackgroundImage, // This action was removed from the store
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
  const [isCanvasSettingsOpen, setIsCanvasSettingsOpen] = useState<boolean>(true);
  const [editingCanvasId, setEditingCanvasId] = useState<string | null>(null);
  const [editingCanvasName, setEditingCanvasName] = useState<string>("");
  const [dragStartContext, setDragStartContext] = useState<{ elementId: string, initialMouseX: number, elementCenterX: number } | null>(null);

  // Ref for the responsive wrapper to calculate scale
  const responsiveWrapperRef = React.useRef<HTMLDivElement>(null);
  const [studioCanvasScaleFactor, setStudioCanvasScaleFactor] = React.useState(1);

  useEffect(() => {
    const calculateScale = () => {
      if (responsiveWrapperRef.current) {
        const parentWidth = responsiveWrapperRef.current.offsetWidth;
        const parentHeight = responsiveWrapperRef.current.offsetHeight;

        if (parentWidth > 0 && parentHeight > 0) {
          const scaleBasedOnWidth = parentWidth / 1920;
          const scaleBasedOnHeight = parentHeight / 1080;
          // Use the minimum scale factor to ensure the entire 1920x1080 canvas fits
          setStudioCanvasScaleFactor(Math.min(scaleBasedOnWidth, scaleBasedOnHeight));
        } else {
          // Fallback or default scale if dimensions are zero, though less likely if layout is stable
          setStudioCanvasScaleFactor(1);
        }
      }
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);

    // Also observe changes to the ref itself, in case it's not immediately available
    const resizeObserver = new ResizeObserver(calculateScale);
    if (responsiveWrapperRef.current) {
      resizeObserver.observe(responsiveWrapperRef.current);
    }

    return () => {
      window.removeEventListener('resize', calculateScale);
      if (responsiveWrapperRef.current) {
        resizeObserver.unobserve(responsiveWrapperRef.current);
      }
    };
  }, []); // Empty dependency to run once on mount and clean up on unmount

  const activeCanvas = useMemo(() => currentCanvases.find(c => c.id === activeCanvasId), [currentCanvases, activeCanvasId]);
  const activeLayout = useMemo(() => activeCanvas?.layout || [], [activeCanvas]);
  const selectedElement = useMemo(() => activeLayout.find(el => el.id === selectedElementId) || null, [selectedElementId, activeLayout]);

  const handleAddScoreOnly = () => { addStudioElement("ScoreOnly"); };
  const handleAddNicknamesOnly = () => { addStudioElement("NicknamesOnly"); };
  const handleAddBoXSeriesOverview = () => { addStudioElement("BoXSeriesOverview"); };
  const handleAddCountryFlags = () => { addStudioElement("CountryFlags"); };
  const handleAddColorGlowElement = () => { addStudioElement("ColorGlowElement"); };
  const handleAddMapPoolElement = () => { addStudioElement("MapPoolElement"); };
  const handleAddCivPoolElement = () => { addStudioElement("CivPoolElement"); };

  const handleDrag = (elementId: string, data: DraggableData) => {
    const element = activeLayout.find(el => el.id === elementId);
    if (!element) return;

    if (element.isPivotLocked) {
    let newY_screen = element.position.y + data.deltaY;

    if (element.type === "MapPoolElement" || element.type === "CivPoolElement") {
        let newHorizontalSplitOffset = element.horizontalSplitOffset || 0;
        const currentX_screen = element.position.x;
        const currentScale = element.scale || 1;

        if (data.deltaX !== 0 && dragStartContext && dragStartContext.elementId === elementId) {
            let changeInOffsetFactor = data.deltaX / currentScale;

            if (dragStartContext.initialMouseX < dragStartContext.elementCenterX) {
                newHorizontalSplitOffset = Math.max(0, (element.horizontalSplitOffset || 0) - changeInOffsetFactor);
            } else {
                newHorizontalSplitOffset = Math.max(0, (element.horizontalSplitOffset || 0) + changeInOffsetFactor);
            }
        }
        updateStudioElementSettings(elementId, {
            position: { x: currentX_screen, y: newY_screen },
            horizontalSplitOffset: newHorizontalSplitOffset
        });
        return;
    }

    const currentX_screen = element.position.x;
    const currentUnscaledWidth = element.size.width;
    const currentUnscaledHeight = element.size.height;
    const currentScale = element.scale || 1;
    const currentPivotOffset_unscaled = element.pivotInternalOffset || 0;

    let finalX_screen = currentX_screen;
    let finalUnscaledWidth = currentUnscaledWidth;
    let finalPivotOffset_unscaled = currentPivotOffset_unscaled;

    if (data.deltaX !== 0) {
        const pivotScreenX_fixed = currentX_screen + (currentUnscaledWidth / 2) * currentScale;
        const effectiveUnscaledDrag = data.deltaX / currentScale;
        let actualEffectiveUnscaledDrag = effectiveUnscaledDrag;

        if (dragStartContext && dragStartContext.elementId === elementId) {
          if (dragStartContext.initialMouseX < dragStartContext.elementCenterX) {
            actualEffectiveUnscaledDrag = -effectiveUnscaledDrag;
          }
        }
        finalUnscaledWidth = Math.max(MIN_ELEMENT_WIDTH, currentUnscaledWidth + (2 * actualEffectiveUnscaledDrag));
        const actualUnscaledDragAppliedToEdge = (currentUnscaledWidth - finalUnscaledWidth) / 2;
        finalX_screen = pivotScreenX_fixed - (finalUnscaledWidth / 2) * currentScale;

        if (element.type === "ScoreOnly") {
          finalPivotOffset_unscaled = Math.max(0, currentPivotOffset_unscaled - (2 * actualUnscaledDragAppliedToEdge));
        } else if (element.type === "BoXSeriesOverview") {
          finalPivotOffset_unscaled = Math.max(0, currentPivotOffset_unscaled - actualUnscaledDragAppliedToEdge);
        }
    }
    updateStudioElementSettings(elementId, {
        position: { x: finalX_screen, y: newY_screen },
        size: { width: finalUnscaledWidth, height: currentUnscaledHeight },
        pivotInternalOffset: finalPivotOffset_unscaled
    });

    } else {
      updateStudioElementPosition(elementId, { x: data.x, y: data.y });
    }
  };

  const handleResizeStop = (elementId: string, data: ResizeCallbackData) => {
    const currentElement = activeLayout.find(el => el.id === elementId);
    const currentElementScale = currentElement?.scale || 1;
    // data.size is the new size in pixels, relative to the ResizableBox's parent (the scaled 1920x1080 div)
    // We need to divide by the element's own scale to get its new base unscaled size.
    updateStudioElementSize(elementId, { width: data.size.width / currentElementScale, height: data.size.height / currentElementScale });
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
    const { activePresetId, savedPresets, loadPreset, hostName, scores, civDraftId, mapDraftId } = useDraftStore.getState();
    console.log('LOGAOEINFO: [StudioInterface Mount Effect] Initial state check:', { activePresetId, hasSavedPresets: savedPresets && savedPresets.length > 0, currentHostName: hostName });
    if (activePresetId && savedPresets && savedPresets.length > 0) {
      const presetToLoad = savedPresets.find(p => p.id === activePresetId);
      if (presetToLoad) {
        console.log('LOGAOEINFO: [StudioInterface Mount Effect] Found active preset to load:', presetToLoad);
        const isAlreadyLoaded = hostName === presetToLoad.hostName && JSON.stringify(scores) === JSON.stringify(presetToLoad.scores) && civDraftId === presetToLoad.civDraftId && mapDraftId === presetToLoad.mapDraftId;
        if (!isAlreadyLoaded) {
          console.log('LOGAOEINFO: [StudioInterface Mount Effect] Active preset data not yet fully applied. Calling loadPreset(activePresetId).');
          loadPreset(activePresetId);
        } else {
          console.log('LOGAOEINFO: [StudioInterface Mount Effect] Active preset data seems to be already applied. Skipping loadPreset.');
        }
      } else {
        console.log('LOGAOEINFO: [StudioInterface Mount Effect] Active preset ID found, but corresponding preset not in savedPresets. ID:', activePresetId);
      }
    } else {
      console.log('LOGAOEINFO: [StudioInterface Mount Effect] No activePresetId found or no savedPresets. Skipping auto-load.');
    }
  }, []);

  useEffect(() => {
    const { activeStudioLayoutId, savedStudioLayouts, loadStudioLayout, currentCanvases, activeCanvasId } = useDraftStore.getState();
    console.log('LOGAOEINFO: [StudioInterface Mount Layout Effect] activeStudioLayoutId:', activeStudioLayoutId);
    if (activeStudioLayoutId) {
      const layoutToLoad = savedStudioLayouts.find(l => l.id === activeStudioLayoutId);
      if (layoutToLoad) {
        const activeCanvasInLayoutToLoad = layoutToLoad.canvases.find(c => c.id === layoutToLoad.activeCanvasId);
        const currentActiveCanvasInState = currentCanvases.find(c => c.id === activeCanvasId);
        const isLayoutPotentiallyAlreadyLoaded = activeCanvasId === layoutToLoad.activeCanvasId && activeCanvasInLayoutToLoad?.layout.length === currentActiveCanvasInState?.layout.length && JSON.stringify(activeCanvasInLayoutToLoad?.layout) === JSON.stringify(currentActiveCanvasInState?.layout);
        if (!isLayoutPotentiallyAlreadyLoaded) {
          console.log('LOGAOEINFO: [StudioInterface Mount Layout Effect] Attempting to load layout:', activeStudioLayoutId);
          loadStudioLayout(activeStudioLayoutId);
        } else {
          console.log('LOGAOEINFO: [StudioInterface Mount Layout Effect] Layout already seems to be loaded or matches state. Skipping redundant load of layout:', activeStudioLayoutId);
        }
      } else {
        console.warn('LOGAOEINFO: [StudioInterface Mount Layout Effect] activeStudioLayoutId found, but corresponding layout not in savedStudioLayouts. ID:', activeStudioLayoutId);
      }
    } else {
      console.log('LOGAOEINFO: [StudioInterface Mount Layout Effect] No activeStudioLayoutId found. Skipping auto-load.');
    }
  }, []);

  return (
    <div style={{ backgroundColor: 'black', color: 'white', minHeight: 'calc(100vh - 60px)', display: 'flex', overflow: 'hidden', position: 'relative' }}>
      <aside style={{ width: '250px', borderRight: '1px solid #333', padding: '1rem', backgroundColor: '#1a1a1a', overflowY: 'auto', display: 'flex', flexDirection: 'column', zIndex: 1 }}>
        <h2 style={{ marginBottom: '1rem', color: '#a0a0a0', fontSize: '1.1em', textAlign: 'center', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>Toolbox</h2>
        <div style={toolboxSectionStyle}>
         <h3 style={{...toolboxHeaderStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between'}} onClick={() => setIsElementsOpen(!isElementsOpen)}>
           Elements <span>{isElementsOpen ? '▼' : '▶'}</span>
         </h3>
         {isElementsOpen && (
           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
             <button onClick={handleAddScoreOnly} style={{ ...buttonStyle, width: 'calc(50% - 5px)' }}>Add Score</button>
             <button onClick={handleAddNicknamesOnly} style={{ ...buttonStyle, width: 'calc(50% - 5px)' }}>Add Nicknames</button>
             <button onClick={handleAddBoXSeriesOverview} style={{ ...buttonStyle, width: 'calc(50% - 5px)' }}>Add BoX Series Overview</button>
             <button onClick={handleAddCountryFlags} style={{ ...buttonStyle, width: 'calc(50% - 5px)' }}>Add Country Flags</button>
             <button onClick={handleAddColorGlowElement} style={{ ...buttonStyle, width: 'calc(50% - 5px)' }}>Add Color Glow</button>
             <button onClick={handleAddMapPoolElement} style={{ ...buttonStyle, width: 'calc(50% - 5px)' }}>Add Map Pool</button>
             <button onClick={handleAddCivPoolElement} style={{ ...buttonStyle, width: 'calc(50% - 5px)' }}>Add Civ Pool</button>
             <button onClick={() => addStudioElement("BackgroundImage")} style={{ ...buttonStyle, width: 'calc(50% - 5px)' }}>Add Background Element</button>
           </div>
         )}
        </div>
        <div style={toolboxSectionStyle}>
         <h3 style={{...toolboxHeaderStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between'}} onClick={() => setIsSaveLayoutOpen(!isSaveLayoutOpen)}>
           Save Current Layout <span>{isSaveLayoutOpen ? '▼' : '▶'}</span>
         </h3>
         {isSaveLayoutOpen && (
           <>
              <input type="text" placeholder="Layout Name" value={newLayoutName} onChange={(e) => setNewLayoutName(e.target.value)} style={inputStyle}/>
              <button onClick={handleSaveLayout} style={buttonStyle}>Save Layout</button>
           </>
         )}
        </div>
        <div style={{flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
         <h3 style={{...toolboxHeaderStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', flexShrink: 0}} onClick={() => setIsLayoutsListOpen(!isLayoutsListOpen)}>
           Saved Layouts <span>{isLayoutsListOpen ? '▼' : '▶'}</span>
         </h3>
         {isLayoutsListOpen && (
           <div style={{flexGrow: 1, overflowY: 'auto'}}>
             {savedStudioLayouts.length === 0 && <p style={{fontSize: '0.8em', color: '#777'}}>No saved layouts yet.</p>}
             <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{savedStudioLayouts.map((layout: SavedStudioLayout) => (
                <li key={layout.id} style={{ ...listItemStyle, backgroundColor: layout.id === activeStudioLayoutId ? '#2a2a4a' : (listItemStyle.backgroundColor || 'transparent'), borderLeft: layout.id === activeStudioLayoutId ? '3px solid #00dd00' : (listItemStyle.borderLeft || 'none'), paddingLeft: layout.id === activeStudioLayoutId ? '12px' : (listItemStyle.paddingLeft || '5px'), }}>
                  <span style={{ ...layoutNameStyle, fontWeight: layout.id === activeStudioLayoutId ? 'bold' : (layoutNameStyle.fontWeight || 'normal') }} title={layout.name}>
                    {layout.name} {layout.id === activeStudioLayoutId && <em style={{fontSize: '0.9em', color: '#00dd00'}}> (auto-saving)</em>}
                  </span>
                  <div>
                    <button onClick={() => loadStudioLayout(layout.id)} style={{...actionButtonStyle, backgroundColor: '#28a745', color: 'white'}} title="Load">Load</button>
                    {layout.name !== "(auto)" && ( <button onClick={() => { const currentName = layout.name; const newName = prompt("Enter new name for layout:", currentName); if (newName && newName.trim() !== "" && newName.trim() !== currentName) { updateStudioLayoutName(layout.id, newName.trim()); } }} style={{ ...actionButtonStyle, backgroundColor: '#6c757d', }} title="Rename layout" > Rename </button> )}
                    <button onClick={() => { if(confirm('Delete?')) deleteStudioLayout(layout.id)}} style={{...actionButtonStyle, backgroundColor: '#dc3545', color: 'white'}} title="Delete">Del</button>
                    {layout.id === activeStudioLayoutId && layout.name !== "(auto)" && ( <button onClick={() => setActiveStudioLayoutId(null)} style={{ ...actionButtonStyle, backgroundColor: '#ffc107', color: 'black', }} title="Stop auto-saving to this layout (will use/create '(auto)' next)" > Detach </button> )}
                  </div>
                </li>
              ))}</ul>
           </div>
         )}
        </div>
        <div style={toolboxSectionStyle}>
          <SettingsPanel selectedElement={selectedElement} onClose={handleCloseSettingsPanel} />
        </div>
        {activeCanvas && (
          <div style={toolboxSectionStyle}>
            <h3 style={{...toolboxHeaderStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between'}} onClick={() => setIsCanvasSettingsOpen(!isCanvasSettingsOpen)}>
              <span>Canvas: {activeCanvas.name}</span> <span>{isCanvasSettingsOpen ? '▼' : '▶'}</span>
            </h3>
            {isCanvasSettingsOpen && (
              <>
                <div>
                  <label htmlFor="canvasBgColorPicker" style={{display: 'block', marginBottom: '5px', fontSize: '0.9em', color: '#b0b0b0'}}>Background Color:</label>
                  <div style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
                    <input type="color" id="canvasBgColorPicker" value={activeCanvas.backgroundColor || '#000000'} onChange={(e) => activeCanvasId && setCanvasBackgroundColor(activeCanvasId, e.target.value)} style={{marginRight: '10px', height: '30px', width: '50px', padding: '2px', border: '1px solid #555', backgroundColor: '#2c2c2c'}} />
                    <button onClick={() => activeCanvasId && setCanvasBackgroundColor(activeCanvasId, null)} style={{...buttonStyle, width: 'auto', padding: '5px 10px', fontSize: '0.8em', backgroundColor: '#555'}} title="Clear background color" > Clear Color </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </aside>
      <main style={{ flexGrow: 1, padding: '1rem', position: 'relative', overflow: 'hidden' }} onClick={(e) => { if (e.target === e.currentTarget) { setSelectedElementId(null); } }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0px', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1, overflowX: 'auto', paddingBottom: '5px' }}>
            {currentCanvases.map(canvas => (
              <button key={canvas.id} onClick={() => setActiveCanvas(canvas.id)} style={{ backgroundColor: canvas.id === activeCanvasId ? '#007bff' : '#3c3c3c', color: canvas.id === activeCanvasId ? 'white' : '#ccc', border: `1px solid ${canvas.id === activeCanvasId ? '#007bff' : '#555'}`, padding: '6px 12px', marginRight: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', flexShrink: 0 }} title={canvas.name} >
               {editingCanvasId === canvas.id ? (
                 <>
                   <input type="text" value={editingCanvasName} onChange={(e) => setEditingCanvasName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { const trimmedName = editingCanvasName.trim(); if (trimmedName !== "" && trimmedName !== canvas.name) { updateCanvasName(canvas.id, trimmedName); } setEditingCanvasId(null); } else if (e.key === 'Escape') { setEditingCanvasId(null); } }} autoFocus onClick={(e) => e.stopPropagation()} style={{ padding: '2px 4px', border: '1px solid #777', backgroundColor: '#1a1a1a', color: 'white', maxWidth: '80px' }} />
                   <button title="Confirm rename" onClick={(e) => { e.stopPropagation(); const trimmedName = editingCanvasName.trim(); if (trimmedName !== "" && trimmedName !== canvas.name) { updateCanvasName(canvas.id, trimmedName); } setEditingCanvasId(null); }} style={{ background: 'transparent', border: 'none', color: '#4CAF50', padding: '0 5px', cursor: 'pointer', fontSize: '1.2em', marginLeft: '4px' }} > ✔️ </button>
                   <button title="Cancel rename" onClick={(e) => { e.stopPropagation(); setEditingCanvasId(null); }} style={{ background: 'transparent', border: 'none', color: '#F44336', padding: '0 5px', marginLeft: '5px', cursor: 'pointer', fontSize: '1.2em' }} > ❌ </button>
                 </>
               ) : (
                 <>
                   <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px', display: 'inline-block'}} title={canvas.name} > {canvas.name.length > 15 ? canvas.name.substring(0, 12) + '...' : canvas.name} </span>
                   <button title="Rename canvas" onClick={(e) => { e.stopPropagation(); setEditingCanvasId(canvas.id); setEditingCanvasName(canvas.name); }} style={{ background: 'transparent', border: 'none', color: '#ccc', padding: '0 5px', marginLeft: '5px', cursor: 'pointer', fontSize: '1em' }} > ✏️ </button>
                   <span title="Open canvas in new window (placeholder)" onClick={(e) => { e.stopPropagation(); const broadcastUrl = `/index.html?view=broadcast&canvasId=${canvas.id}`; window.open(broadcastUrl, '_blank'); console.log('Attempting to open broadcast view in new tab for canvas ID:', canvas.id, 'at URL:', broadcastUrl); }} style={{ width: '10px', height: '10px', backgroundColor: 'white', border: '1px solid #666', marginLeft: '8px', cursor: 'pointer', display: 'inline-block' }} ></span>
                   {currentCanvases.length > 1 && ( <button title="Remove canvas" onClick={(e) => { e.stopPropagation(); if(confirm(`Are you sure you want to delete canvas "${canvas.name}"?`)) removeCanvas(canvas.id); }} style={{ background: 'transparent', border: 'none', color: '#aaa', marginLeft: '5px', cursor: 'pointer', fontSize: '1.2em', padding: '0 3px', lineHeight: '1', fontWeight: 'bold' }} > &times; </button> )}
                 </>
               )}
              </button>
            ))}
          </div>
          <button onClick={() => { if (activeCanvas && activeCanvas.layout.length > 0) { if (confirm(`Are you sure you want to remove all elements from canvas "${activeCanvas.name}"?`)) { resetActiveCanvasLayout(); } } }} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em', marginLeft: '10px', flexShrink: 0 }} title="Remove all elements from current canvas" disabled={!activeCanvas || activeCanvas.layout.length === 0} > Reset 🗑️ </button>
          <button onClick={() => { addCanvas(); }} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em', marginLeft: '10px', flexShrink: 0 }} title="Add new canvas" > + </button>
        </div>
        {/* End Tab Bar */}

        {/* Canvas Rendering Area */}
        <div
          ref={responsiveWrapperRef}
          style={{
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#0d0d0d',
            width: '100%',
            aspectRatio: '16 / 9',
            maxHeight: 'calc(100vh - 60px - 2rem - 30px - 50px)',
            margin: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: '1920px',
              height: '1080px',
              border: `1px dashed #666`,
              boxSizing: 'border-box',
              position: 'relative',
              backgroundColor: activeCanvas?.backgroundColor || 'transparent',
              transform: `scale(${studioCanvasScaleFactor})`,
              transformOrigin: 'top left',
            }}
          >
            {/* Visual Center Guide Line - Vertical */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                top: '0px',
                width: `${Math.max(0.5, 1 / (studioCanvasScaleFactor || 1))}px`,
                height: '100%',
                backgroundColor: '#555',
                pointerEvents: 'none',
                zIndex: 0,
              }}
              aria-hidden="true"
            />
            {/* Visual Center Guide Line - Horizontal */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                left: '0px',
                width: '100%',
                height: `${Math.max(0.5, 1 / (studioCanvasScaleFactor || 1))}px`,
                backgroundColor: '#555',
                pointerEvents: 'none',
                zIndex: 0,
              }}
              aria-hidden="true"
            />

            {activeLayout.map((element: StudioElement, index: number) => {
              const isSelected = element.id === selectedElementId;
              const currentElementScale = element.scale || 1;
              const baseZIndex = index + 1;
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
              else if (element.type === "CivPoolElement") { content = <CivPoolElement element={element} />; }
              else if (element.type === "BackgroundImage") {
                content = <div style={{width: '100%', height: '100%', overflow: 'hidden'}}><img src={element.imageUrl || undefined} alt="BG Preview" style={{width: '100%', height: '100%', objectFit: element.stretch || 'cover', opacity: element.opacity || 1}}/></div>;
                if (!element.imageUrl) {
                  content = <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dotted #777', background: 'rgba(255,255,255,0.05)'}}>BG Image (No file)</div>;
                }
              }
              else { content = <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dotted #555'}}>Unknown: {element.type}</div>; }

              return (
                <Draggable
                    key={element.id}
                    handle=".drag-handle"
                    disabled={element.type === "BackgroundImage" && element.size.width === 1920 && element.size.height === 1080 && element.position.x === 0 && element.position.y === 0 && currentElementScale === 1}
                    position={{ x: element.position.x, y: element.position.y }}
                    onDrag={(e: DraggableEvent, data: DraggableData) => {
                       handleDrag(element.id, data);
                    }}
                    onStart={(e: DraggableEvent, data: DraggableData) => {
                      const currentElement = activeLayout.find(el => el.id === element.id);
                      if (currentElement && currentElement.isPivotLocked) {
                        const eventAsMouseEvent = e as MouseEvent;
                        const currentElScale = currentElement.scale || 1;
                        const unscaledElementCenterX = currentElement.position.x + (currentElement.size.width * currentElScale / 2);

                        let wrapperLeft = 0;
                        if (responsiveWrapperRef.current) {
                            const rect = responsiveWrapperRef.current.getBoundingClientRect();
                            // Calculate the offset of the scaled 1920x1080 div within the responsiveWrapperRef
                            // This depends on how it's centered. If flex-centered:
                            const scaledWidth = 1920 * studioCanvasScaleFactor;
                            wrapperLeft = rect.left + (rect.width - scaledWidth) / 2;
                        }
                        const screenElementCenterX = wrapperLeft + unscaledElementCenterX * studioCanvasScaleFactor;

                        setDragStartContext({
                          elementId: currentElement.id,
                          initialMouseX: eventAsMouseEvent.clientX,
                          elementCenterX: screenElementCenterX
                        });
                      }
                    }}
                    onStop={() => {
                      setDragStartContext(null);
                    }}
                    >
                  <ResizableBox
                      width={element.size.width * currentElementScale}
                      height={element.size.height * currentElementScale}
                      onResizeStop={(e, data) => {
                        handleResizeStop(element.id, data);
                      }}
                      minConstraints={[MIN_ELEMENT_WIDTH, 30]}
                      maxConstraints={[1920, 1080]}
                      style={elementSpecificStyle}
                      className="drag-handle"
                      >
                    <div
                         onClick={(e) => { e.stopPropagation(); handleElementClick(element.id);}}
                         style={{
                             width: element.size.width + 'px',
                             height: element.size.height + 'px',
                             overflow: (element.type === "MapPoolElement" || element.type === "CivPoolElement") ? 'visible' : 'hidden',
                             boxSizing: 'border-box',
                             border: `1px solid ${element.borderColor || 'transparent'}`,
                             background: element.backgroundColor || 'transparent',
                             cursor: 'move',
                             transform: `scale(${currentElementScale})`,
                             transformOrigin: 'top left',
                         }}>
                      {content}
                    </div>
                  </ResizableBox>
                </Draggable>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};
export default StudioInterface;
