import React from 'react';
import { StudioElement } from '../../types/draft';
import useDraftStore from '../../store/draftStore';

interface SettingsPanelProps {
  selectedElement: StudioElement | null;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ selectedElement, onClose }) => {
  const updateStudioElementSettings = useDraftStore(state => state.updateStudioElementSettings);
  const removeStudioElement = useDraftStore(state => state.removeStudioElement);

  if (!selectedElement) { return null; }

  const handleSettingChange = (settingName: keyof StudioElement, value: any) => {
    if (selectedElement) {
      let parsedValue = value;
      // Define numeric properties that need parsing
      const numericProps: (keyof StudioElement)[] = ['scale', 'pivotInternalOffset', 'separationGap', 'playerGridWidth', 'width', 'height', 'numColumns', 'gameEntrySpacing'];

      if (typeof value === 'string' && numericProps.includes(settingName)) {
        if (value.trim() === "") {
          parsedValue = undefined; // Allow clearing field by setting to undefined
        } else {
          parsedValue = parseFloat(value);
          if (isNaN(parsedValue)) {
            console.warn(`Invalid number format for ${settingName}: ${value}`);
            return; // Don't update if not a valid number and not empty
          }
        }
      }
      updateStudioElementSettings(selectedElement.id, { [settingName]: parsedValue });
    }
  };

  const handleDeleteElement = () => {
    if (selectedElement) { removeStudioElement(selectedElement.id); onClose(); }
  };

  const panelStyle: React.CSSProperties = { width: '100%', backgroundColor: '#1e1e1e', padding: '1rem', boxSizing: 'border-box', color: 'white', overflowY: 'auto'};
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
      <h3 style={headerStyle}>Settings: {selectedElement.type}</h3>

      <div style={settingRowStyle}>
        <label htmlFor="commonScaleSlider" style={labelStyle}>Scale:</label>
        <input type="range" id="commonScaleSlider" style={rangeInputStyle} min="0.1" max="5" step="0.05" value={selectedElement.scale || 1} onChange={(e) => handleSettingChange('scale', e.target.value)} />
        <span style={rangeValueStyle}>{(selectedElement.scale || 1).toFixed(2)}</span>
      </div>

      {(selectedElement.type === 'BoXSeriesOverview' || selectedElement.type === 'ScoreOnly' || selectedElement.type === 'NicknamesOnly' || selectedElement.type === 'MapPoolElement') && (
        <div style={settingRowStyle}>
          <label htmlFor="commonFontFamilyInput" style={labelStyle}>Base Font:</label>
          <input type="text" id="commonFontFamilyInput" style={inputStyle} value={selectedElement.fontFamily || ''} onChange={(e) => handleSettingChange('fontFamily', e.target.value)} placeholder="e.g., Arial, sans-serif"/>
        </div>
      )}

      {selectedElement.type === 'BoXSeriesOverview' && (
        <>
          <h4 style={sectionHeaderStyle}>BoX Series Specific</h4>
          <div style={settingRowStyle}><label htmlFor="boxPivotLockCheckbox" style={labelStyle}>Lock Center Pivot:</label><input type="checkbox" id="boxPivotLockCheckbox" style={checkboxStyle} checked={!!selectedElement.isPivotLocked} onChange={(e) => handleSettingChange('isPivotLocked', e.target.checked)}/></div>
          <div style={settingRowStyle}><label htmlFor="gameXFontFamilyInput" style={labelStyle}>Game X Font:</label><input type="text" id="gameXFontFamilyInput" style={inputStyle} value={selectedElement.fontFamilyGameTitle || ''} onChange={(e) => handleSettingChange('fontFamilyGameTitle', e.target.value)} placeholder="e.g., Cinzel, serif"/></div>
          <div style={settingRowStyle}><label htmlFor="boxShowCivNamesCheckbox" style={labelStyle}>Show Civ Names:</label><input type="checkbox" id="boxShowCivNamesCheckbox" style={checkboxStyle} checked={selectedElement.showCivNames === undefined ? true : selectedElement.showCivNames} onChange={(e) => handleSettingChange('showCivNames', e.target.checked)}/></div>
          <div style={settingRowStyle}><label htmlFor="boxShowMapNamesCheckbox" style={labelStyle}>Show Map Names:</label><input type="checkbox" id="boxShowMapNamesCheckbox" style={checkboxStyle} checked={selectedElement.showMapNames === undefined ? true : selectedElement.showMapNames} onChange={(e) => handleSettingChange('showMapNames', e.target.checked)}/></div>
          <div style={{ marginBottom: '12px' }}><label htmlFor="boxGameSpacingSlider" style={{...labelStyle, display: 'block', marginBottom: '5px', width: '100%' }}>Game Spacing (px):</label><div style={{ display: 'flex', alignItems: 'center' }}><input type="range" id="boxGameSpacingSlider" style={{ ...rangeInputStyle, flexGrow: 1, width: 'auto', marginRight: '10px' }} min="0" max="30" step="1" value={selectedElement.gameEntrySpacing === undefined ? 10 : selectedElement.gameEntrySpacing} onChange={(e) => handleSettingChange('gameEntrySpacing', e.target.value)}/><span style={{...rangeValueStyle, minWidth: '35px' }}>{(selectedElement.gameEntrySpacing === undefined ? 10 : selectedElement.gameEntrySpacing)}px</span></div></div>
        </>
      )}

     {(selectedElement.type === 'ScoreOnly' || selectedElement.type === 'NicknamesOnly' || selectedElement.type === 'CountryFlags' || selectedElement.type === 'ColorGlowElement') && (
       <>
         <h4 style={sectionHeaderStyle}>{selectedElement.type} Specific</h4>
         <div style={settingRowStyle}><label htmlFor={`${selectedElement.type}PivotLockCheckbox`} style={labelStyle}>Lock Center Pivot:</label><input type="checkbox" id={`${selectedElement.type}PivotLockCheckbox`} style={checkboxStyle} checked={!!selectedElement.isPivotLocked} onChange={(e) => handleSettingChange('isPivotLocked', e.target.checked)} /></div>
         {(selectedElement.type === 'ScoreOnly' || selectedElement.type === 'NicknamesOnly') && (
            <div style={settingRowStyle}><label htmlFor={`${selectedElement.type}TextColorInput`} style={labelStyle}>Text Color:</label><input type="text" id={`${selectedElement.type}TextColorInput`} style={inputStyle} value={selectedElement.textColor || ''} onChange={(e) => handleSettingChange('textColor', e.target.value)} placeholder="e.g., #RRGGBB, white"/></div>
         )}
          {/* ColorGlowElement color is now derived from store, so no direct color setting needed here.
              If other settings become relevant for ColorGlowElement, they can be added.
              For now, it will only show common settings like pivot lock if applicable. */}
       </>
     )}

      {selectedElement.type === 'MapPoolElement' && (
        <>
          <h4 style={sectionHeaderStyle}>Map Pool Specific</h4>
          <div style={settingRowStyle}>
            <label htmlFor="mapPoolLockPivotCheckbox" style={labelStyle}>Lock Center Pivot:</label>
            <input type="checkbox" id="mapPoolLockPivotCheckbox" style={checkboxStyle} checked={!!selectedElement.lockPivotPoint} onChange={(e) => handleSettingChange('lockPivotPoint', e.target.checked)} />
          </div>

          <div style={settingRowStyle}>
            <label htmlFor="mapPoolPlayerGridWidthInput" style={labelStyle}>Player Grid Width (px):</label>
            <input
              type="number"
              id="mapPoolPlayerGridWidthInput"
              style={{...inputStyle, width: '80px'}}
              min="50"
              step="1"
              value={selectedElement.playerGridWidth === undefined ? '' : selectedElement.playerGridWidth}
              onChange={(e) => {
                const value = e.target.value;
                if (value.trim() === "") {
                  updateStudioElementSettings(selectedElement.id, {
                    playerGridWidth: undefined,
                  });
                } else {
                  const newGridWidth = parseFloat(value);
                  if (!isNaN(newGridWidth) && newGridWidth >= 50) {
                    const currentGap = selectedElement.separationGap || 0;
                    const newTotalWidth = (2 * newGridWidth) + currentGap;
                    updateStudioElementSettings(selectedElement.id, {
                      playerGridWidth: newGridWidth,
                      width: newTotalWidth,
                      size: { ...selectedElement.size, width: newTotalWidth }
                    });
                  }
                }
              }}
            />
          </div>

          <div style={settingRowStyle}>
            <label htmlFor="mapPoolSeparationGapDisplay" style={labelStyle}>Current Separation (px):</label>
            <input
              type="text"
              id="mapPoolSeparationGapDisplay"
              style={{...inputStyle, width: '80px', backgroundColor: '#333', cursor: 'default'}}
              value={(selectedElement.separationGap || 0).toFixed(0)}
              readOnly
            />
          </div>

          <div style={settingRowStyle}>
            <label htmlFor="mapPoolNumColsInput" style={labelStyle}>Columns per Player:</label>
            <input type="number" id="mapPoolNumColsInput" style={{...inputStyle, width: '80px'}} min="1" max="5" step="1" value={selectedElement.numColumns === undefined ? '' : selectedElement.numColumns} onChange={(e) => handleSettingChange('numColumns', e.target.value)} />
          </div>
          <div style={settingRowStyle}>
            <label htmlFor="mapPoolNameFontSizeInput" style={labelStyle}>Map Name Font Size:</label>
            <input type="text" id="mapPoolNameFontSizeInput" style={inputStyle} value={selectedElement.mapNameFontSize || '0.75em'} onChange={(e) => handleSettingChange('mapNameFontSize', e.target.value)} placeholder="e.g., 0.75em, 12px"/>
          </div>
          <div style={settingRowStyle}>
            <label htmlFor="mapPoolTotalWidthDisplay" style={labelStyle}>Total Width (px):</label>
            <input type="text" id="mapPoolTotalWidthDisplay" style={{...inputStyle, width: '80px', backgroundColor: '#333', cursor: 'default'}} value={(selectedElement.width || selectedElement.size?.width || 0).toFixed(0)} readOnly />
          </div>
          <div style={settingRowStyle}>
            <label htmlFor="mapPoolHeightInput" style={labelStyle}>Element Height (px):</label>
            <input type="number" id="mapPoolHeightInput" style={{...inputStyle, width: '80px'}} value={selectedElement.height === undefined ? '' : selectedElement.height} onChange={(e) => handleSettingChange('height', e.target.value)} />
          </div>
        </>
      )}

      <div style={{ borderTop: '1px solid #444', marginTop: '20px', paddingTop: '15px' }}>
        <button onClick={handleDeleteElement} style={{...deleteButtonStyle}}>Delete Element</button>
      </div>
      <button onClick={onClose} style={closeButtonStyle}>Close Panel</button>
    </div>
  );
};
export default SettingsPanel;
