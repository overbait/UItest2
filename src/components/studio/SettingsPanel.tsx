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
      // Ensure numeric inputs are parsed correctly
      const numericProps = ['scale', 'offset', 'numColumns', 'width', 'height', 'pivotInternalOffset', 'gameEntrySpacing'];
      if (numericProps.includes(settingName)) {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          updateStudioElementSettings(selectedElement.id, { [settingName]: numValue });
        } else if (value === "") { // Allow clearing numeric fields
             updateStudioElementSettings(selectedElement.id, { [settingName]: undefined });
        }
      } else {
        updateStudioElementSettings(selectedElement.id, { [settingName]: value });
      }
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

      {/* Common Settings: Scale */}
      <div style={settingRowStyle}>
        <label htmlFor="commonScaleSlider" style={labelStyle}>Scale:</label>
        <input type="range" id="commonScaleSlider" style={rangeInputStyle} min="0.1" max="5" step="0.05" value={selectedElement.scale || 1} onChange={(e) => handleSettingChange('scale', parseFloat(e.target.value))} />
        <span style={rangeValueStyle}>{(selectedElement.scale || 1).toFixed(2)}</span>
      </div>

      {/* Common Settings: Font Family (if applicable) */}
      {(selectedElement.type === 'BoXSeriesOverview' || selectedElement.type === 'ScoreOnly' || selectedElement.type === 'NicknamesOnly' || selectedElement.type === 'MapPoolElement') && (
        <div style={settingRowStyle}>
          <label htmlFor="commonFontFamilyInput" style={labelStyle}>Base Font:</label>
          <input type="text" id="commonFontFamilyInput" style={inputStyle} value={selectedElement.fontFamily || ''} onChange={(e) => handleSettingChange('fontFamily', e.target.value)} placeholder="e.g., Arial, sans-serif"/>
        </div>
      )}

      {/* Element Specific Settings */}
      {selectedElement.type === 'BoXSeriesOverview' && (
        <>
          <h4 style={sectionHeaderStyle}>BoX Series Specific</h4>
          <div style={settingRowStyle}><label htmlFor="boxPivotLockCheckbox" style={labelStyle}>Lock Center Pivot:</label><input type="checkbox" id="boxPivotLockCheckbox" style={checkboxStyle} checked={!!selectedElement.isPivotLocked} onChange={(e) => handleSettingChange('isPivotLocked', e.target.checked)}/></div>
          <div style={settingRowStyle}><label htmlFor="gameXFontFamilyInput" style={labelStyle}>Game X Font:</label><input type="text" id="gameXFontFamilyInput" style={inputStyle} value={selectedElement.fontFamilyGameTitle || ''} onChange={(e) => handleSettingChange('fontFamilyGameTitle', e.target.value)} placeholder="e.g., Cinzel, serif"/></div>
          <div style={settingRowStyle}><label htmlFor="boxShowCivNamesCheckbox" style={labelStyle}>Show Civ Names:</label><input type="checkbox" id="boxShowCivNamesCheckbox" style={checkboxStyle} checked={selectedElement.showCivNames === undefined ? true : selectedElement.showCivNames} onChange={(e) => handleSettingChange('showCivNames', e.target.checked)}/></div>
          <div style={settingRowStyle}><label htmlFor="boxShowMapNamesCheckbox" style={labelStyle}>Show Map Names:</label><input type="checkbox" id="boxShowMapNamesCheckbox" style={checkboxStyle} checked={selectedElement.showMapNames === undefined ? true : selectedElement.showMapNames} onChange={(e) => handleSettingChange('showMapNames', e.target.checked)}/></div>
          <div style={{ marginBottom: '12px' }}><label htmlFor="boxGameSpacingSlider" style={{...labelStyle, display: 'block', marginBottom: '5px', width: '100%' }}>Game Spacing (px):</label><div style={{ display: 'flex', alignItems: 'center' }}><input type="range" id="boxGameSpacingSlider" style={{ ...rangeInputStyle, flexGrow: 1, width: 'auto', marginRight: '10px' }} min="0" max="30" step="1" value={selectedElement.gameEntrySpacing === undefined ? 10 : selectedElement.gameEntrySpacing} onChange={(e) => handleSettingChange('gameEntrySpacing', parseInt(e.target.value, 10))}/><span style={{...rangeValueStyle, minWidth: '35px' }}>{(selectedElement.gameEntrySpacing === undefined ? 10 : selectedElement.gameEntrySpacing)}px</span></div></div>
        </>
      )}

     {(selectedElement.type === 'ScoreOnly' || selectedElement.type === 'NicknamesOnly' || selectedElement.type === 'CountryFlags' || selectedElement.type === 'ColorGlowElement') && (
       <>
         <h4 style={sectionHeaderStyle}>{selectedElement.type} Specific</h4>
         <div style={settingRowStyle}><label htmlFor={`${selectedElement.type}PivotLockCheckbox`} style={labelStyle}>Lock Center Pivot:</label><input type="checkbox" id={`${selectedElement.type}PivotLockCheckbox`} style={checkboxStyle} checked={!!selectedElement.isPivotLocked} onChange={(e) => handleSettingChange('isPivotLocked', e.target.checked)} /></div>
         {(selectedElement.type === 'ScoreOnly' || selectedElement.type === 'NicknamesOnly') && (
            <div style={settingRowStyle}><label htmlFor={`${selectedElement.type}TextColorInput`} style={labelStyle}>Text Color:</label><input type="text" id={`${selectedElement.type}TextColorInput`} style={inputStyle} value={selectedElement.textColor || ''} onChange={(e) => handleSettingChange('textColor', e.target.value)} placeholder="e.g., #RRGGBB, white"/></div>
         )}
          {selectedElement.type === 'ColorGlowElement' && (
            <div style={settingRowStyle}>
              <label htmlFor="glowColorInput" style={labelStyle}>Glow Color:</label>
              <input type="color" id="glowColorInput" style={{...inputStyle, height: '35px'}} value={selectedElement.color || '#00ff00'} onChange={(e) => handleSettingChange('color', e.target.value)} />
            </div>
          )}
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
            <label htmlFor="mapPoolOffsetSlider" style={labelStyle}>Offset (px):</label>
            <input type="range" id="mapPoolOffsetSlider" style={rangeInputStyle} min="0" max="200" step="1" value={selectedElement.offset || 0} disabled={!selectedElement.lockPivotPoint} onChange={(e) => handleSettingChange('offset', parseFloat(e.target.value))} />
            <span style={rangeValueStyle}>{(selectedElement.offset || 0)}px</span>
          </div>
          <div style={settingRowStyle}>
            <label htmlFor="mapPoolNumColsInput" style={labelStyle}>Columns per Player:</label>
            <input type="number" id="mapPoolNumColsInput" style={{...inputStyle, width: '80px'}} min="1" max="5" step="1" value={selectedElement.numColumns || 2} onChange={(e) => handleSettingChange('numColumns', parseInt(e.target.value, 10))} />
          </div>
          <div style={settingRowStyle}>
            <label htmlFor="mapPoolNameFontSizeInput" style={labelStyle}>Map Name Font Size:</label>
            <input type="text" id="mapPoolNameFontSizeInput" style={inputStyle} value={selectedElement.mapNameFontSize || '0.75em'} onChange={(e) => handleSettingChange('mapNameFontSize', e.target.value)} placeholder="e.g., 0.75em, 12px"/>
          </div>
           {/* Width and Height can be controlled by ResizableBox, but direct input might be useful too */}
          <div style={settingRowStyle}>
            <label htmlFor="mapPoolWidthInput" style={labelStyle}>Element Width (px):</label>
            <input type="number" id="mapPoolWidthInput" style={{...inputStyle, width: '80px'}} value={selectedElement.width || selectedElement.size?.width || 600} onChange={(e) => handleSettingChange('width', parseInt(e.target.value, 10))} />
          </div>
          <div style={settingRowStyle}>
            <label htmlFor="mapPoolHeightInput" style={labelStyle}>Element Height (px):</label>
            <input type="number" id="mapPoolHeightInput" style={{...inputStyle, width: '80px'}} value={selectedElement.height || selectedElement.size?.height || 200} onChange={(e) => handleSettingChange('height', parseInt(e.target.value, 10))} />
          </div>
        </>
      )}

      <div style={{ borderTop: '1px solid #444', marginTop: '20px', paddingTop: '15px' }}>
        <button onClick={handleDeleteElement} style={deleteButtonStyle}>Delete Element</button>
      </div>
      <button onClick={onClose} style={closeButtonStyle}>Close Panel</button>
    </div>
  );
};
export default SettingsPanel;
