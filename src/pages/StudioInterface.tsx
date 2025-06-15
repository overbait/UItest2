import React, { useState, useMemo, useEffect } from 'react';
import useDraftStore from '../store/draftStore';
import ScoreOnlyElement from '../components/studio/ScoreOnlyElement';
import NicknamesOnlyElement from '../components/studio/NicknamesOnlyElement';
import BoXSeriesOverviewElement from '../components/studio/BoXSeriesOverviewElement';
import CountryFlagsElement from '../components/studio/CountryFlagsElement';
import ColorGlowElement from '../components/studio/ColorGlowElement';
import MapPoolElement from '../components/studio/MapPoolElement'; // Import MapPoolElement
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
    updateCanvasName,
    resetActiveCanvasLayout
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
  const [dragStartContext, setDragStartContext] = useState<{ elementId: string, initialMouseX: number, elementCenterX: number } | null>(null);

  const activeCanvas = useMemo(() => currentCanvases.find(c => c.id === activeCanvasId), [currentCanvases, activeCanvasId]);
  const activeLayout = useMemo(() => activeCanvas?.layout || [], [activeCanvas]);
  const selectedElement = useMemo(() => activeLayout.find(el => el.id === selectedElementId) || null, [selectedElementId, activeLayout]);

  const handleAddScoreOnly = () => { addStudioElement("ScoreOnly"); };
  const handleAddNicknamesOnly = () => { addStudioElement("NicknamesOnly"); };
  const handleAddBoXSeriesOverview = () => { addStudioElement("BoXSeriesOverview"); };
  const handleAddCountryFlags = () => { addStudioElement("CountryFlags"); };
  const handleAddColorGlowElement = () => { addStudioElement("ColorGlowElement"); };
  const handleAddMapPoolElement = () => { addStudioElement("MapPoolElement"); }; // Handler for MapPoolElement

  const handleDrag = (elementId: string, data: DraggableData) => {
    const element = activeLayout.find(el => el.id === elementId);
    if (!element) return;

    if (element.isPivotLocked || element.lockPivotPoint) { // Check for both isPivotLocked and lockPivotPoint
      let newY_screen = element.position.y + data.deltaY;
      const currentX_screen = element.position.x;
      const currentUnscaledWidth = element.size.width;
      const currentUnscaledHeight = element.size.height;
      const currentScale = element.scale || 1;
      const currentPivotOffset_unscaled = element.pivotInternalOffset || 0; // For BoX
      const currentMapPoolOffset = element.offset || 0; // For MapPoolElement

      let finalX_screen = currentX_screen;
      let finalUnscaledWidth = currentUnscaledWidth;
      let finalPivotOffset_unscaled = currentPivotOffset_unscaled;
      let finalMapPoolOffset = currentMapPoolOffset;


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

        if (element.type === "ScoreOnly" || element.type === "NicknamesOnly" || element.type === "CountryFlags" || element.type === "ColorGlowElement") {
          finalPivotOffset_unscaled = Math.max(0, currentPivotOffset_unscaled - (2 * actualUnscaledDragAppliedToEdge));
        } else if (element.type === "BoXSeriesOverview") {
          finalPivotOffset_unscaled = Math.max(0, currentPivotOffset_unscaled - actualUnscaledDragAppliedToEdge);
        } else if (element.type === "MapPoolElement") {
          // MapPoolElement's 'offset' is different. It's the distance each grid moves.
          // Dragging to resize a pivot-locked MapPoolElement should adjust its internal 'offset'
          // to reflect the new spacing between the two halves.
          // If finalUnscaledWidth increased, the 'offset' effectively decreased, and vice-versa.
          // This logic might need specific review for MapPoolElement's 'offset' interpretation.
          // For now, let's assume pivotInternalOffset is the generic one to adjust for width change.
           finalPivotOffset_unscaled = Math.max(0, currentPivotOffset_unscaled - (2 * actualUnscaledDragAppliedToEdge));
        }
      }
      updateStudioElementSettings(elementId, {
        position: { x: finalX_screen, y: newY_screen },
        size: { width: finalUnscaledWidth, height: currentUnscaledHeight },
        pivotInternalOffset: finalPivotOffset_unscaled, // This handles width change for most
        // offset: finalMapPoolOffset, // If MapPoolElement's offset needs direct update from drag
      });
    } else {
      updateStudioElementPosition(elementId, { x: data.x, y: data.y });
    }
  };

  const handleResizeStop = (elementId: string, data: ResizeCallbackData) => {
    const currentElement = activeLayout.find(el => el.id === elementId);
    if (!currentElement) return;
    const currentScale = currentElement.scale || 1;
    let newWidth = data.size.width / currentScale;
    let newHeight = data.size.height / currentScale;

    updateStudioElementSize(elementId, { width: newWidth, height: newHeight });

    // If the element is MapPoolElement, also update its direct width/height props if they exist
    if (currentElement.type === "MapPoolElement") {
        updateStudioElementSettings(elementId, { width: newWidth, height: newHeight });
    }
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
             <button onClick={handleAddMapPoolElement} style={{ ...buttonStyle, width: 'calc(50% - 5px)' }}>Map Pool</button> {/* Added Map Pool Button */}
           </div>
         )}
        </div>
        {/* ... other toolbox sections (Save Current Layout, Saved Layouts) ... */}
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
        {/* Tab Bar Start */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0px', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {/* ... Tab rendering logic (unchanged) ... */}
        </div>
        {/* Tab Bar End */}
        <div style={{ position: 'relative', border: '1px dashed #444', overflow: 'hidden', backgroundColor: '#0d0d0d', width: '100%', aspectRatio: '16 / 9', maxHeight: 'calc(100vh - 60px - 2rem - 30px - 50px)', margin: 'auto',}}>
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
            else if (element.type === "MapPoolElement") { content = <MapPoolElement element={element} />; } // Added MapPoolElement rendering
            else { content = <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dotted #555'}}>Unknown: {element.type}</div>; }

            return (
              <Draggable key={element.id} handle=".drag-handle" position={{ x: element.position.x, y: element.position.y }} onDrag={(e: DraggableEvent, data: DraggableData) => handleDrag(element.id, data)} onStart={(e: DraggableEvent, data: DraggableData) => { const currentElement = activeLayout.find(el => el.id === element.id); if (currentElement && (currentElement.isPivotLocked || currentElement.lockPivotPoint) ) { const eventAsMouseEvent = e as MouseEvent; const scale = currentElement.scale || 1; const elementCenterX = currentElement.position.x + (currentElement.size.width * scale / 2); setDragStartContext({ elementId: currentElement.id, initialMouseX: eventAsMouseEvent.clientX, elementCenterX: elementCenterX }); } }} onStop={() => { setDragStartContext(null); }}>
                <ResizableBox width={element.size.width * currentScale} height={element.size.height * currentScale} onResizeStop={(e, data) => handleResizeStop(element.id, data)} minConstraints={[MIN_ELEMENT_WIDTH, 30]} maxConstraints={[Infinity, Infinity]} style={elementSpecificStyle} className="drag-handle"> {/* Adjusted constraints for scale */}
                  <div onClick={(e) => { e.stopPropagation(); handleElementClick(element.id);}} style={{ width: element.size.width + 'px', height: element.size.height + 'px', overflow: 'hidden', boxSizing: 'border-box', border: `1px solid ${element.borderColor || 'transparent'}`, background: element.backgroundColor || 'transparent', cursor: 'move', transform: `scale(${currentScale})`, transformOrigin: 'top left', }}>
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
