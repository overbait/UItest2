import React from 'react';
import { StudioElement } from '../../types/draft';
import useDraftStore from '../../store/draftStore';

interface SettingsPanelProps {
  selectedElement: StudioElement | null;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ selectedElement, onClose }) => {
  const {
    updateStudioElementSettings,
    removeStudioElement,
    // addStudioElement, // Not used directly in this component's rendering logic for settings
    currentCanvases,
    activeCanvasId
  } = useDraftStore(state => ({
    updateStudioElementSettings: state.updateStudioElementSettings,
    removeStudioElement: state.removeStudioElement,
    addStudioElement: state.addStudioElement,
    currentCanvases: state.currentCanvases,
    activeCanvasId: state.activeCanvasId,
  }));

  const activeLayout = React.useMemo(() => {
    return currentCanvases.find(c => c.id === activeCanvasId)?.layout || [];
  }, [currentCanvases, activeCanvasId]);

  if (!selectedElement) { return null; }

  // Generalized master element identification for any paired element
  let masterElementForSharedProps = selectedElement;
  if (selectedElement && selectedElement.pairId && selectedElement.isPairMaster === false) {
    const foundMaster = activeLayout.find(el => el.pairId === selectedElement.pairId && el.isPairMaster === true);
    if (foundMaster) {
      masterElementForSharedProps = foundMaster;
    }
    // If master not found, masterElementForSharedProps remains selectedElement.
  }

  const handleSettingChange = (settingName: keyof StudioElement, value: any) => {
    if (!selectedElement) return;

    const sharedSettingsKeys: (keyof StudioElement)[] = [
      'scale', 'isPivotLocked', 'pivotInternalOffset',
      'fontFamily', 'textColor', 'backgroundColor', 'borderColor'
      // Note: 'playerId' and 'pairId' are structural and not typically changed via this panel.
      // 'isPairMaster' is also structural.
    ];

    if (selectedElement.pairId) { // It's a paired element
      // For paired elements, shared settings always go to the master.
      // Non-shared settings (if any existed that are user-configurable) would go to the selected element.
      const masterIdToUpdate = selectedElement.isPairMaster
        ? selectedElement.id
        : masterElementForSharedProps.id;

      if (sharedSettingsKeys.includes(settingName)) {
        updateStudioElementSettings(masterIdToUpdate, { [settingName]: value });
        // If the selected element is a slave, its own store props for these shared settings
        // do not need to be updated here, as the slave component should derive them from the master at render time.
        // The previous explicit update for 'scale' on slaves is removed for simplification,
        // relying on reactive derivation in the slave components.
      } else {
        // For any property not in sharedSettingsKeys, update the selected element directly.
        // This path would be used for individual properties of a pair member (e.g. MapPool's P1/P2 specific map list).
        // Currently, most common properties are shared.
        updateStudioElementSettings(selectedElement.id, { [settingName]: value });
      }
    } else {
      // For non-paired elements (like BoXSeriesOverview, or future single elements)
      updateStudioElementSettings(selectedElement.id, { [settingName]: value });
    }
  };

  const handleDeleteElement = () => {
    if (selectedElement) { removeStudioElement(selectedElement.id); onClose(); }
  };

  const panelStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: '#1e1e1e', // Keep its background
    padding: '1rem', // Keep its padding
    boxSizing: 'border-box',
    color: 'white',
    overflowY: 'auto' // Keep for scrollable content
    // All positioning, zIndex, fixed height, and left border are removed.
  };
  const headerStyle: React.CSSProperties = { fontSize: '1.1em', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #444', color: '#e0e0e0' };
  const sectionHeaderStyle: React.CSSProperties = { fontSize: '1em', color: '#ccc', marginTop: '20px', marginBottom: '10px', borderBottom: '1px solid #383838', paddingBottom: '5px'};
  const settingRowStyle: React.CSSProperties = { marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const labelStyle: React.CSSProperties = { fontSize: '0.9em', color: '#b0b0b0', marginRight: '10px', flexShrink: 0 };
  const inputStyle: React.CSSProperties = { width: '60%', padding: '6px 8px', backgroundColor: '#2c2c2c', border: '1px solid #555', color: 'white', borderRadius: '4px', fontSize: '0.9em' };
  const checkboxStyle: React.CSSProperties = { transform: 'scale(1.1)' };
  const rangeInputStyle: React.CSSProperties = { width: '55%', flexGrow: 1 };
  const rangeValueStyle: React.CSSProperties = { fontSize: '0.8em', color: '#b0b0b0', marginLeft: '10px', minWidth: '30px', textAlign: 'right' };
  const buttonStyle: React.CSSProperties = { padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'block', width: '100%', fontSize: '0.9em' };
  const deleteButtonStyle: React.CSSProperties = { ...buttonStyle, backgroundColor: '#dc3545', color: 'white', marginTop: '20px' };
  const closeButtonStyle: React.CSSProperties = { ...buttonStyle, backgroundColor: '#555', color: 'white', marginTop: '10px' };

  return (
    <div style={panelStyle}>
      <h3 style={headerStyle}>Element Settings</h3>
      {/* <div style={{ marginBottom: '10px', fontSize: '0.8em', color: '#888' }}>ID: {selectedElement.id.substring(0,8)}... <br/>Type: {selectedElement.type}</div> */}

      {/* Old ScoreDisplay settings removed */}

      {selectedElement.type === 'BoXSeriesOverview' && (
        <>
          <h4 style={sectionHeaderStyle}>BoX Series Overview Options</h4>
          <div style={settingRowStyle}>
            <label htmlFor="boxScaleSlider" style={labelStyle}>Scale:</label>
            <input
              type="range"
              id="boxScaleSlider"
              style={rangeInputStyle}
              min="0.2" // BoX overview might need smaller scales
              max="5"   // And perhaps not as large
              step="0.05"
              value={selectedElement.scale || 1} // BoXSeriesOverview is not paired, uses selectedElement
              onChange={(e) => handleSettingChange('scale', parseFloat(e.target.value))}
            />
            <span style={rangeValueStyle}>{(selectedElement.scale || 1).toFixed(2)}</span>
          </div>
          <div style={settingRowStyle}>
            <label htmlFor="boxPivotLockCheckbox" style={labelStyle}>Lock Center Pivot:</label>
            <input
              type="checkbox"
              id="boxPivotLockCheckbox"
              style={checkboxStyle}
              checked={!!selectedElement.isPivotLocked} // BoXSeriesOverview is not paired
              onChange={(e) => handleSettingChange('isPivotLocked', e.target.checked)}
            />
          </div>
          <div style={settingRowStyle}>
            <label htmlFor="gameXFontFamilyInput" style={labelStyle}>Game X Font:</label>
            <input
              type="text"
              id="gameXFontFamilyInput"
              style={inputStyle}
              value={selectedElement.fontFamilyGameTitle || ''} // BoXSeriesOverview specific prop
              onChange={(e) => handleSettingChange('fontFamilyGameTitle', e.target.value)}
              placeholder="e.g., Cinzel, serif"
            />
          </div>
       <div style={settingRowStyle}>
         <label htmlFor="boxShowCivNamesCheckbox" style={labelStyle}>Show Civ Names:</label>
         <input
           type="checkbox"
           id="boxShowCivNamesCheckbox"
           style={checkboxStyle}
           checked={selectedElement.showCivNames === undefined ? true : selectedElement.showCivNames}  // BoXSeriesOverview specific
           onChange={(e) => handleSettingChange('showCivNames', e.target.checked)}
         />
       </div>
       <div style={settingRowStyle}>
         <label htmlFor="boxShowMapNamesCheckbox" style={labelStyle}>Show Map Names:</label>
         <input
           type="checkbox"
           id="boxShowMapNamesCheckbox"
           style={checkboxStyle}
           checked={selectedElement.showMapNames === undefined ? true : selectedElement.showMapNames} // BoXSeriesOverview specific
           onChange={(e) => handleSettingChange('showMapNames', e.target.checked)}
         />
       </div>
        <div style={{ marginBottom: '12px' }}> {/* Game Spacing Slider from previous step */}
          <label
            htmlFor="boxGameSpacingSlider"
           style={{...labelStyle, display: 'block', marginBottom: '5px', width: '100%' }} // Label takes full width, block display
         >Game Spacing (px):</label>
         <div style={{ display: 'flex', alignItems: 'center' }}> {/* New flex wrapper for slider and value */}
            <input
              type="range"
              id="boxGameSpacingSlider"
             style={{ ...rangeInputStyle, flexGrow: 1, width: 'auto', marginRight: '10px' }} /* Slider takes available space */
              min="0"
              max="30"
              step="1"
              value={selectedElement.gameEntrySpacing === undefined ? 10 : selectedElement.gameEntrySpacing} // BoXSeriesOverview specific
              onChange={(e) => handleSettingChange('gameEntrySpacing', parseInt(e.target.value, 10))}
            />
            <span style={{...rangeValueStyle, minWidth: '35px' }}> {/* Ensure value span has enough width */}
              {(selectedElement.gameEntrySpacing === undefined ? 10 : selectedElement.gameEntrySpacing)}px
            </span>
         </div>
        </div>
          {/* Add other BoXSeriesOverview specific settings here if any in the future */}
        </>
      )}

     {selectedElement.type === 'ScoreOnly' && (
       <>
         <h4 style={sectionHeaderStyle}>Score Options</h4>
         <div style={settingRowStyle}>
           <label htmlFor="scoreOnlyFontFamilyInput" style={labelStyle}>Font Family:</label>
           <input type="text" id="scoreOnlyFontFamilyInput" style={inputStyle} value={masterElementForSharedProps.fontFamily || ''} onChange={(e) => handleSettingChange('fontFamily', e.target.value)} placeholder="e.g., Arial, sans-serif"/>
         </div>
         <div style={settingRowStyle}>
           <label htmlFor="scoreOnlyScaleSlider" style={labelStyle}>Scale:</label>
           <input type="range" id="scoreOnlyScaleSlider" style={rangeInputStyle} min="0.5" max="10" step="0.05" value={masterElementForSharedProps.scale || 1} onChange={(e) => handleSettingChange('scale', parseFloat(e.target.value))} />
           <span style={rangeValueStyle}>{(masterElementForSharedProps.scale || 1).toFixed(2)}</span>
         </div>
         <div style={settingRowStyle}>
           <label htmlFor="scoreOnlyPivotLockCheckbox" style={labelStyle}>Lock Center Pivot:</label>
           <input type="checkbox" id="scoreOnlyPivotLockCheckbox" style={checkboxStyle} checked={!!masterElementForSharedProps.isPivotLocked} onChange={(e) => handleSettingChange('isPivotLocked', e.target.checked)} />
         </div>
         <div style={settingRowStyle}>
           <label htmlFor="scoreOnlyTextColorInput" style={labelStyle}>Text Color:</label>
           <input type="text" id="scoreOnlyTextColorInput" style={inputStyle} value={masterElementForSharedProps.textColor || ''} onChange={(e) => handleSettingChange('textColor', e.target.value)} placeholder="e.g., #RRGGBB, white"/>
         </div>
       </>
     )}

     {selectedElement.type === 'NicknamesOnly' && (
       <>
         <h4 style={sectionHeaderStyle}>Nicknames Options</h4>
         <div style={settingRowStyle}>
           <label htmlFor="nicknamesOnlyFontFamilyInput" style={labelStyle}>Font Family:</label>
           <input type="text" id="nicknamesOnlyFontFamilyInput" style={inputStyle} value={masterElementForSharedProps.fontFamily || ''} onChange={(e) => handleSettingChange('fontFamily', e.target.value)} placeholder="e.g., Arial, sans-serif"/>
         </div>
         <div style={settingRowStyle}>
           <label htmlFor="nicknamesOnlyScaleSlider" style={labelStyle}>Scale:</label>
           <input type="range" id="nicknamesOnlyScaleSlider" style={rangeInputStyle} min="0.5" max="10" step="0.05" value={masterElementForSharedProps.scale || 1} onChange={(e) => handleSettingChange('scale', parseFloat(e.target.value))} />
           <span style={rangeValueStyle}>{(masterElementForSharedProps.scale || 1).toFixed(2)}</span>
         </div>
         <div style={settingRowStyle}>
           <label htmlFor="nicknamesOnlyPivotLockCheckbox" style={labelStyle}>Lock Center Pivot:</label>
           <input type="checkbox" id="nicknamesOnlyPivotLockCheckbox" style={checkboxStyle} checked={!!masterElementForSharedProps.isPivotLocked} onChange={(e) => handleSettingChange('isPivotLocked', e.target.checked)} />
         </div>
         <div style={settingRowStyle}>
           <label htmlFor="nicknamesOnlyTextColorInput" style={labelStyle}>Text Color:</label>
           <input type="text" id="nicknamesOnlyTextColorInput" style={inputStyle} value={masterElementForSharedProps.textColor || ''} onChange={(e) => handleSettingChange('textColor', e.target.value)} placeholder="e.g., #RRGGBB, white"/>
         </div>
         {/* Specific centering options for NicknamesOnly might be added later */}
       </>
     )}

     {selectedElement.type === 'CountryFlags' && (
       <>
         <h4 style={sectionHeaderStyle}>Country Flags Options</h4>
         <div style={settingRowStyle}>
           <label htmlFor="countryFlagsScaleSlider" style={labelStyle}>Scale:</label>
           <input
             type="range"
             id="countryFlagsScaleSlider"
             style={rangeInputStyle}
             min="0.2"
             max="5"
             step="0.05"
             value={masterElementForSharedProps.scale || 1}
             onChange={(e) => handleSettingChange('scale', parseFloat(e.target.value))}
           />
           <span style={rangeValueStyle}>{(masterElementForSharedProps.scale || 1).toFixed(2)}</span>
         </div>
         <div style={settingRowStyle}>
           <label htmlFor="countryFlagsPivotLockCheckbox" style={labelStyle}>Lock Center Pivot:</label>
           <input
             type="checkbox"
             id="countryFlagsPivotLockCheckbox"
             style={checkboxStyle}
             checked={!!masterElementForSharedProps.isPivotLocked}
             onChange={(e) => handleSettingChange('isPivotLocked', e.target.checked)}
           />
         </div>
       </>
     )}

     {selectedElement.type === 'ColorGlowElement' && (
       <>
         <h4 style={sectionHeaderStyle}>Color Glow Options</h4>
         <div style={settingRowStyle}>
           <label htmlFor="colorGlowScaleSlider" style={labelStyle}>Scale:</label>
           <input
             type="range"
             id="colorGlowScaleSlider"
             style={rangeInputStyle}
             min="0.2"
             max="10"
             step="0.05"
             value={masterElementForSharedProps.scale || 1}
             onChange={(e) => handleSettingChange('scale', parseFloat(e.target.value))}
           />
           <span style={rangeValueStyle}>{(masterElementForSharedProps.scale || 1).toFixed(2)}</span>
         </div>
         <div style={settingRowStyle}>
           <label htmlFor="colorGlowPivotLockCheckbox" style={labelStyle}>Lock Center Pivot:</label>
           <input
             type="checkbox"
             id="colorGlowPivotLockCheckbox"
             style={checkboxStyle}
             checked={!!masterElementForSharedProps.isPivotLocked}
             onChange={(e) => handleSettingChange('isPivotLocked', e.target.checked)}
           />
         </div>
       </>
     )}

      {selectedElement.type === 'MapPool' && (
        <>
          <h4 style={sectionHeaderStyle}>Map Pool Options</h4>
          <p style={{ fontSize: '0.8em', color: '#999', marginBottom: '10px' }}>
            Font, Pivot Lock, and Scale are shared by the pair. Colors are individual.
          </p>
          <div style={settingRowStyle}>
            <label htmlFor="mapPoolScaleSlider" style={labelStyle}>Scale:</label>
            <input
              type="range"
              id="mapPoolScaleSlider"
              style={rangeInputStyle}
              min="0.2"
              max="3"
              step="0.05"
              value={masterElementForSharedProps.scale || 1}
              onChange={(e) => handleSettingChange('scale', parseFloat(e.target.value))}
            />
            <span style={rangeValueStyle}>{(masterElementForSharedProps.scale || 1).toFixed(2)}</span>
          </div>
          <div style={settingRowStyle}>
            <label htmlFor="mapPoolPivotLockCheckbox" style={labelStyle}>Lock Pivot Point:</label>
            <input
              type="checkbox"
              id="mapPoolPivotLockCheckbox"
              style={checkboxStyle}
              checked={masterElementForSharedProps.isPivotLocked === undefined ? false : !!masterElementForSharedProps.isPivotLocked}
              onChange={(e) => handleSettingChange('isPivotLocked', e.target.checked)}
            />
          </div>
          <div style={settingRowStyle}>
            <label htmlFor="mapPoolFontFamilyInput" style={labelStyle}>Font Family:</label>
            <input
              type="text"
              id="mapPoolFontFamilyInput"
              style={inputStyle}
              value={masterElementForSharedProps.fontFamily || ''}
              onChange={(e) => handleSettingChange('fontFamily', e.target.value)}
              placeholder="CSS Default (e.g., Arial)"
            />
          </div>
        </>
      )}

      {/* Generic Appearance Settings - Apply to master for paired elements, or selected for single */}
      {selectedElement && (
        <>
          <h4 style={sectionHeaderStyle}>Appearance</h4>
          <div style={settingRowStyle}>
            <label htmlFor="elementBgColorInput" style={labelStyle}>Background Color:</label>
            <input
              type="text"
              id="elementBgColorInput"
              style={inputStyle}
              value={masterElementForSharedProps.backgroundColor || ''}
              onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
              placeholder="e.g., #RRGGBB, transparent"
            />
          </div>
          <div style={settingRowStyle}>
            <label htmlFor="elementBorderColorInput" style={labelStyle}>Border Color:</label>
            <input
              type="text"
              id="elementBorderColorInput"
              style={inputStyle}
              value={masterElementForSharedProps.borderColor || ''}
              onChange={(e) => handleSettingChange('borderColor', e.target.value)}
              placeholder="e.g., #RRGGBB, transparent"
            />
          </div>
          {/* Text Color: Only show if element type typically has text and is not BoXSeriesOverview or CountryFlags */}
          {selectedElement.type !== 'BoXSeriesOverview' &&
           selectedElement.type !== 'CountryFlags' &&
           selectedElement.type !== 'ColorGlowElement' && (
            <div style={settingRowStyle}>
              <label htmlFor="elementTextColorInput" style={labelStyle}>Text Color:</label>
              <input
                type="text"
                id="elementTextColorInput"
                style={inputStyle}
                value={masterElementForSharedProps.textColor || ''} // Use master for paired, selected for single
                onChange={(e) => handleSettingChange('textColor', e.target.value)}
                placeholder="e.g., #FFFFFF, black"
              />
            </div>
          )}
        </>
      )}

      <div style={{ borderTop: '1px solid #444', marginTop: '20px', paddingTop: '15px' }}>
        <button
          onClick={handleDeleteElement}
          style={{...inputStyle, width: '100%', backgroundColor: '#dc3545', color: 'white', marginBottom: '10px'}}
        >
          Delete Element
        </button>
      </div>
      <button
        onClick={onClose}
        style={{...inputStyle, width: '100%', backgroundColor: '#555', color: 'white', marginTop: '0px'}}
      >
        Close Panel
      </button>
    </div>
  );
};
export default SettingsPanel;
