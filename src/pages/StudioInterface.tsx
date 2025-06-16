// src/pages/StudioInterface.tsx
import React, { useState, useMemo, useEffect } from 'react';
import useDraftStore from '../store/draftStore';
import ScoreOnlyElement from '../components/studio/ScoreOnlyElement';
import NicknamesOnlyElement from '../components/studio/NicknamesOnlyElement';
import BoXSeriesOverviewElement from '../components/studio/BoXSeriesOverviewElement';
import CountryFlagsElement from '../components/studio/CountryFlagsElement';
import ColorGlowElement from '../components/studio/ColorGlowElement';
import MapPoolElement from '../components/studio/MapPoolElement';
import { StudioElement, SavedStudioLayout, StudioCanvas } from '../types/draft'; // Ensure StudioCanvas is imported
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import 'react-resizable/css/styles.css';
import SettingsPanel from '../components/studio/SettingsPanel';

const MIN_ELEMENT_WIDTH = 50; // Min width for a single sub-element like one player's grid or a score box

const StudioInterface: React.FC = () => {
  const {
    currentCanvases, activeCanvasId, activeStudioLayoutId, setActiveStudioLayoutId, updateStudioLayoutName,
    savedStudioLayouts, selectedElementId, addStudioElement, updateStudioElementPosition, updateStudioElementSize,
    updateStudioElementSettings, saveCurrentStudioLayout, loadStudioLayout, deleteStudioLayout, setSelectedElementId,
    addCanvas, setActiveCanvas, removeCanvas, updateCanvasName, resetActiveCanvasLayout
   } = useDraftStore(state => state);

  useEffect(() => {
    (window as any).IS_BROADCAST_STUDIO = true;
    return () => {
      (window as any).IS_BROADCAST_STUDIO = false;
    };
  }, []);

  const [newLayoutName, setNewLayoutName] = useState<string>("");
  const [isElementsOpen, setIsElementsOpen] = useState<boolean>(true);
  const [isSaveLayoutOpen, setIsSaveLayoutOpen] = useState<boolean>(true);
  const [isLayoutsListOpen, setIsLayoutsListOpen] = useState<boolean>(true);
  const [editingCanvasId, setEditingCanvasId] = useState<string | null>(null);
  const [editingCanvasName, setEditingCanvasName] = useState<string>("");

  const [dragStartContext, setDragStartContext] = useState<{
    elementId: string,
    initialMouseX: number, // Screen X of mouse at drag start
    elementCenterX: number, // Screen X of element center at drag start
    initialWidth: number, // Unscaled total width of element at drag start
    initialElementX: number, // Screen X of element top-left at drag start
    initialSeparationGap?: number, // For MapPoolElement
    initialPlayerGridWidth?: number, // For MapPoolElement
  } | null>(null);

  const activeCanvas = useMemo(() => currentCanvases.find(c => c.id === activeCanvasId), [currentCanvases, activeCanvasId]);
  const activeLayout = useMemo(() => activeCanvas?.layout || [], [activeCanvas]);
  const selectedElement = useMemo(() => activeLayout.find(el => el.id === selectedElementId) || null, [selectedElementId, activeLayout]);

  const handleAddScoreOnly = () => { addStudioElement("ScoreOnly"); };
  const handleAddNicknamesOnly = () => { addStudioElement("NicknamesOnly"); };
  const handleAddBoXSeriesOverview = () => { addStudioElement("BoXSeriesOverview"); };
  const handleAddCountryFlags = () => { addStudioElement("CountryFlags"); };
  const handleAddColorGlowElement = () => { addStudioElement("ColorGlowElement"); };
  const handleAddMapPoolElement = () => { addStudioElement("MapPoolElement"); };

  const handleDrag = (elementId: string, data: DraggableData) => {
    const element = activeLayout.find(el => el.id === elementId);
    if (!element) return;

    const pivotLocked = element.lockPivotPoint || element.isPivotLocked;

    if (pivotLocked) {
      let newY_screen = element.position.y + data.deltaY;

      const currentX_screen = element.position.x; // Current screen X before this drag delta
      const currentScale = element.scale || 1;
      const currentHeight_unscaled = element.height || element.size?.height || 30;

      let finalX_screen = currentX_screen;
      let finalTotalWidth_unscaled: number;
      let finalSeparationGap_unscaled = element.separationGap; // Keep as undefined if not set
      let finalPivotOffset_unscaled = element.pivotInternalOffset; // Keep as undefined if not set


      if (data.deltaX !== 0 && dragStartContext && dragStartContext.elementId === elementId) {
        const initialElementScreenX = dragStartContext.initialElementX;
        const initialUnscaledWidth = dragStartContext.initialWidth;

        if (element.type === "MapPoolElement") {
          const playerGridWidth = dragStartContext.initialPlayerGridWidth || MIN_ELEMENT_WIDTH; // Fallback to MIN_ELEMENT_WIDTH
          const initialGap = dragStartContext.initialSeparationGap || 0;

          const mouseDragDeltaX_scaled = data.deltaX;
          const separationGapChange = (mouseDragDeltaX_scaled * 2) / currentScale;

          finalSeparationGap_unscaled = Math.max(0, initialGap + separationGapChange);
          finalTotalWidth_unscaled = (2 * playerGridWidth) + finalSeparationGap_unscaled;
          // Ensure total width is not less than minimum required for two player grids
          finalTotalWidth_unscaled = Math.max(MIN_ELEMENT_WIDTH * 2, finalTotalWidth_unscaled);

          const originalCenterX = initialElementScreenX + (initialUnscaledWidth * currentScale / 2);
          finalX_screen = originalCenterX - (finalTotalWidth_unscaled * currentScale / 2);

        } else { // Other pivot-locked elements
            const effectiveUnscaledDrag = data.deltaX / currentScale;
            let actualEffectiveUnscaledDrag = effectiveUnscaledDrag;

            if (dragStartContext.initialMouseX < dragStartContext.elementCenterX) {
                actualEffectiveUnscaledDrag = -effectiveUnscaledDrag;
            }

            finalTotalWidth_unscaled = Math.max(MIN_ELEMENT_WIDTH, initialUnscaledWidth + (2 * actualEffectiveUnscaledDrag));

            const originalCenterX = initialElementScreenX + (initialUnscaledWidth * currentScale / 2);
            finalX_screen = originalCenterX - (finalTotalWidth_unscaled * currentScale / 2);

            const currentPivotOffset = element.pivotInternalOffset || 0;
            if (element.type === "BoXSeriesOverview") {
                finalPivotOffset_unscaled = Math.max(0, currentPivotOffset + actualEffectiveUnscaledDrag);
            } else {
                finalPivotOffset_unscaled = Math.max(0, currentPivotOffset + (2 * actualEffectiveUnscaledDrag));
            }
        }
      } else {
        // If no deltaX or no drag context, keep current width values
        finalTotalWidth_unscaled = element.width || element.size?.width || MIN_ELEMENT_WIDTH;
        if (element.type === "MapPoolElement") {
            finalSeparationGap_unscaled = element.separationGap || 0;
        } else {
            finalPivotOffset_unscaled = element.pivotInternalOffset || 0;
        }
      }

      const updatePayload: Partial<StudioElement> = {
        position: { x: finalX_screen, y: newY_screen },
      };

      if (element.type === "MapPoolElement") {
        updatePayload.width = finalTotalWidth_unscaled;
        updatePayload.height = currentHeight_unscaled;
        updatePayload.size = { width: finalTotalWidth_unscaled, height: currentHeight_unscaled };
        updatePayload.separationGap = finalSeparationGap_unscaled;
        // playerGridWidth is considered fixed during drag, set at creation/settings panel
      } else {
        updatePayload.size = { width: finalTotalWidth_unscaled, height: currentHeight_unscaled };
        updatePayload.pivotInternalOffset = finalPivotOffset_unscaled;
      }
      updateStudioElementSettings(elementId, updatePayload);

    } else {
      updateStudioElementPosition(elementId, { x: data.x, y: data.y });
    }
  };

  const handleResizeStop = (elementId: string, data: ResizeCallbackData) => {
    const currentElement = activeLayout.find(el => el.id === elementId);
    if (!currentElement) return;
    const currentScale = currentElement.scale || 1;
    let newUnscaledWidth = data.size.width / currentScale;
    let newUnscaledHeight = data.size.height / currentScale;

    const settingsUpdate: Partial<StudioElement> = {
        size: { width: newUnscaledWidth, height: newUnscaledHeight }
    };

    if (currentElement.type === "MapPoolElement") {
        settingsUpdate.width = newUnscaledWidth; // Update total width
        settingsUpdate.height = newUnscaledHeight;
        // If playerGridWidth should adjust on resize, that logic would be here.
        // For now, assume playerGridWidth is fixed and separationGap might need to adjust,
        // or it's up to the user to resize appropriately for the content.
        // Let's assume resize changes playerGridWidth implicitly if not locked.
        const currentGap = currentElement.separationGap || 0;
        const newPlayerGridWidth = (newUnscaledWidth - currentGap) / 2;
        if (newPlayerGridWidth >= MIN_ELEMENT_WIDTH) {
            settingsUpdate.playerGridWidth = newPlayerGridWidth;
        } else {
            // If new width is too small, adjust gap instead or cap playerGridWidth
            settingsUpdate.playerGridWidth = MIN_ELEMENT_WIDTH;
            settingsUpdate.width = (MIN_ELEMENT_WIDTH * 2) + currentGap; // Recalculate total width
            settingsUpdate.size = { ...settingsUpdate.size, width: settingsUpdate.width };
        }
    }
    updateStudioElementSettings(elementId, settingsUpdate);
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
             <button onClick={handleAddScoreOnly} style={{ ...buttonStyle, width: 'calc(50% - 5px)' }}>Score</button>
             <button onClick={handleAddNicknamesOnly} style={{ ...buttonStyle, width: 'calc(50% - 5px)' }}>Nicknames</button>
             <button onClick={handleAddBoXSeriesOverview} style={{ ...buttonStyle, width: 'calc(50% - 5px)' }}>BoX Overview</button>
             <button onClick={handleAddCountryFlags} style={{ ...buttonStyle, width: 'calc(50% - 5px)' }}>Flags</button>
             <button onClick={handleAddColorGlowElement} style={{ ...buttonStyle, width: 'calc(50% - 5px)' }}>Color Glow</button>
             <button onClick={handleAddMapPoolElement} style={{ ...buttonStyle, width: 'calc(50% - 5px)' }}>Map Pool</button>
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
                <li key={layout.id} style={{ ...listItemStyle, backgroundColor: layout.id === activeStudioLayoutId ? '#2a2a4a' : (listItemStyle.backgroundColor || 'transparent'), borderLeft: layout.id === activeStudioLayoutId ? '3px solid #00dd00' : (listItemStyle.borderLeft || 'none'), paddingLeft: layout.id === activeStudioLayoutId ? '12px' : (listItemStyle.paddingLeft || '5px'),}}>
                  <span style={{ ...layoutNameStyle, fontWeight: layout.id === activeStudioLayoutId ? 'bold' : (layoutNameStyle.fontWeight || 'normal')}} title={layout.name}>
                    {layout.name} {layout.id === activeStudioLayoutId && <em style={{fontSize: '0.9em', color: '#00dd00'}}> (auto-saving)</em>}
                  </span>
                  <div>
                    <button onClick={() => loadStudioLayout(layout.id)} style={{...actionButtonStyle, backgroundColor: '#28a745', color: 'white'}} title="Load">Load</button>
                    {layout.name !== "(auto)" && (<button onClick={() => { const currentName = layout.name; const newName = prompt("Enter new name for layout:", currentName); if (newName && newName.trim() !== "" && newName.trim() !== currentName) { updateStudioLayoutName(layout.id, newName.trim()); }}} style={{ ...actionButtonStyle, backgroundColor: '#6c757d',}} title="Rename layout">Rename</button>)}
                    <button onClick={() => { if(confirm('Delete?')) deleteStudioLayout(layout.id)}} style={{...actionButtonStyle, backgroundColor: '#dc3545', color: 'white'}} title="Delete">Del</button>
                    {layout.id === activeStudioLayoutId && layout.name !== "(auto)" && (<button onClick={() => setActiveStudioLayoutId(null)} style={{ ...actionButtonStyle, backgroundColor: '#ffc107', color: 'black', }} title="Stop auto-saving to this layout (will use/create '(auto)' next)">Detach</button>)}
                  </div>
                </li>))}
             </ul>
           </div>
         )}
        </div>
        <div style={toolboxSectionStyle}>
          <SettingsPanel selectedElement={selectedElement} onClose={handleCloseSettingsPanel} />
        </div>
      </aside>
      <main style={{ flexGrow: 1, padding: '1rem', position: 'relative', overflow: 'hidden' }} onClick={(e) => { if (e.target === e.currentTarget) { setSelectedElementId(null); } }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0px', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1, overflowX: 'auto', paddingBottom: '5px' }}>
            {currentCanvases.map((canvas: StudioCanvas) => (
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
                 <>
                   <input
                     type="text"
                     value={editingCanvasName}
                     onChange={(e) => setEditingCanvasName(e.target.value)}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                         const trimmedName = editingCanvasName.trim();
                         if (trimmedName !== "" && trimmedName !== canvas.name) { updateCanvasName(canvas.id, trimmedName); }
                         setEditingCanvasId(null);
                       } else if (e.key === 'Escape') { setEditingCanvasId(null); }
                     }}
                     autoFocus onClick={(e) => e.stopPropagation()}
                     style={{ padding: '2px 4px', border: '1px solid #777', backgroundColor: '#1a1a1a', color: 'white', maxWidth: '80px' }}
                   />
                   <button title="Confirm rename" onClick={(e) => { e.stopPropagation(); const trimmedName = editingCanvasName.trim(); if (trimmedName !== "" && trimmedName !== canvas.name) { updateCanvasName(canvas.id, trimmedName); } setEditingCanvasId(null);}} style={{ background: 'transparent', border: 'none', color: '#4CAF50', padding: '0 5px', cursor: 'pointer', fontSize: '1.2em', marginLeft: '4px' }}>✔️</button>
                   <button title="Cancel rename" onClick={(e) => { e.stopPropagation(); setEditingCanvasId(null);}} style={{ background: 'transparent', border: 'none', color: '#F44336', padding: '0 5px', marginLeft: '5px', cursor: 'pointer', fontSize: '1.2em' }}>❌</button>
                 </>
               ) : (
                 <>
                   <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px', display: 'inline-block'}} title={canvas.name}>
                     {canvas.name.length > 15 ? canvas.name.substring(0, 12) + '...' : canvas.name}
                   </span>
                   <button title="Rename canvas" onClick={(e) => { e.stopPropagation(); setEditingCanvasId(canvas.id); setEditingCanvasName(canvas.name);}} style={{ background: 'transparent', border: 'none', color: '#ccc', padding: '0 5px', marginLeft: '5px', cursor: 'pointer', fontSize: '1em' }}>✏️</button>
                   <span title="Open canvas in new window" onClick={(e) => { e.stopPropagation(); const broadcastUrl = `/index.html?view=broadcast&canvasId=${canvas.id}`; window.open(broadcastUrl, '_blank');}} style={{ width: '10px', height: '10px', backgroundColor: 'white', border: '1px solid rgb(102, 102, 102)', marginLeft: '8px', cursor: 'pointer', display: 'inline-block'}}></span>
                    {currentCanvases.length > 1 && (
                      <button title="Remove canvas" onClick={(e) => { e.stopPropagation(); if(confirm(`Are you sure you want to delete canvas "${canvas.name}"?`)) removeCanvas(canvas.id);}} style={{ background: 'transparent', border: 'none', color: '#aaa', marginLeft: '5px', cursor: 'pointer', fontSize: '1.2em', padding: '0px 3px', lineHeight: '1', fontWeight: 'bold'}}>&times;</button>
                    )}
                 </>
               )}
              </button>
            ))}
          </div>
          <button onClick={() => { if (activeCanvas && activeCanvas.layout.length > 0) { if (confirm(`Are you sure you want to remove all elements from canvas "${activeCanvas.name}"?`)) { resetActiveCanvasLayout(); }}}} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em', marginLeft: '10px', flexShrink: 0 }} title="Remove all elements from current canvas" disabled={!activeCanvas || activeCanvas.layout.length === 0}>Reset 🗑️</button>
          <button onClick={() => { addCanvas(); }} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em', marginLeft: '10px', flexShrink: 0 }} title="Add new canvas">+</button>
        </div>

        <div style={{ position: 'relative', border: '1px dashed #444', overflow: 'hidden', backgroundColor: '#0d0d0d', width: '100%', aspectRatio: '16 / 9', maxHeight: 'calc(100vh - 60px - 2rem - 30px - 50px - 45px)', margin: 'auto',}}>
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '0px', width: '1px', height: '20px', backgroundColor: '#555', pointerEvents: 'none', zIndex: 0, }} aria-hidden="true" />
          {activeLayout.map((element: StudioElement, index: number) => {
            const isSelected = element.id === selectedElementId;
            const currentScale = element.scale || 1;
            const baseZIndex = index + 1;
            const zIndexValue = isSelected ? 999 : baseZIndex;
            const elementSpecificStyle: React.CSSProperties = { zIndex: zIndexValue, position: 'absolute', };

            let content = null;
            if (element.type === "ScoreOnly") { content = <ScoreOnlyElement element={element} isSelected={isSelected} />; }
            else if (element.type === "NicknamesOnly") { content = <NicknamesOnlyElement element={element} isSelected={isSelected} />; }
            else if (element.type === "BoXSeriesOverview") { content = <BoXSeriesOverviewElement element={element} />; }
            else if (element.type === "CountryFlags") { content = <CountryFlagsElement element={element} isSelected={isSelected} />; }
            else if (element.type === "ColorGlowElement") { content = <ColorGlowElement element={element} isSelected={element.id === selectedElementId} />; }
            else if (element.type === "MapPoolElement") { content = <MapPoolElement element={element} />; }
            else { content = <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dotted #555'}}>Unknown: {element.type}</div>; }

            return (
              <Draggable
                key={element.id}
                handle=".drag-handle"
                position={{ x: element.position.x, y: element.position.y }}
                onDrag={(e: DraggableEvent, data: DraggableData) => handleDrag(element.id, data)}
                onStart={(e: DraggableEvent, data: DraggableData) => {
                  const currentElement = activeLayout.find(el => el.id === element.id);
                  if (currentElement && (currentElement.isPivotLocked || currentElement.lockPivotPoint) ) {
                    const eventAsMouseEvent = e as MouseEvent;
                    const scale = currentElement.scale || 1;
                    const unscaledTotalWidth = currentElement.width || currentElement.size?.width || MIN_ELEMENT_WIDTH;
                    const initialPlayerGridW = currentElement.playerGridWidth || ((unscaledTotalWidth - (currentElement.separationGap || 0)) / 2);

                    setDragStartContext({
                      elementId: currentElement.id,
                      initialMouseX: eventAsMouseEvent.clientX,
                      elementCenterX: currentElement.position.x + (unscaledTotalWidth * scale / 2),
                      initialWidth: unscaledTotalWidth,
                      initialElementX: currentElement.position.x,
                      initialSeparationGap: currentElement.separationGap || 0,
                      initialPlayerGridWidth: initialPlayerGridW,
                    });
                  }
                }}
                onStop={() => { setDragStartContext(null); }}
              >
                <ResizableBox
                  width={(element.width || element.size?.width || MIN_ELEMENT_WIDTH) * currentScale}
                  height={(element.height || element.size?.height || 30) * currentScale}
                  onResizeStop={(e, data) => handleResizeStop(element.id, data)}
                  minConstraints={[MIN_ELEMENT_WIDTH, 30]}
                  maxConstraints={[Infinity, Infinity]}
                  style={elementSpecificStyle}
                  className="drag-handle"
                >
                  <div
                    onClick={(e) => { e.stopPropagation(); handleElementClick(element.id);}}
                    style={{
                      width: `${element.width || element.size?.width || MIN_ELEMENT_WIDTH}px`,
                      height: `${element.height || element.size?.height || 30}px`,
                      overflow: element.type === 'ColorGlowElement' ? 'visible' : 'hidden',
                      boxSizing: 'border-box',
                      border: `1px solid ${element.borderColor || 'transparent'}`,
                      background: element.backgroundColor || 'transparent',
                      cursor: 'move',
                      transform: `scale(${currentScale})`,
                      transformOrigin: 'top left',
                    }}
                  >
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
