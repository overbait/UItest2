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
      if (settingName === 'scale') console.log('SettingsPanel: Updating scale to:', value);
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
              value={selectedElement.scale || 1}
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
              checked={!!selectedElement.isPivotLocked}
              onChange={(e) => handleSettingChange('isPivotLocked', e.target.checked)}
            />
          </div>
          <div style={settingRowStyle}>
            <label htmlFor="gameXFontFamilyInput" style={labelStyle}>Game X Font:</label>
            <input
              type="text"
              id="gameXFontFamilyInput"
              style={inputStyle}
              value={selectedElement.fontFamilyGameTitle || ''}
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
           checked={selectedElement.showCivNames === undefined ? true : selectedElement.showCivNames}
           onChange={(e) => handleSettingChange('showCivNames', e.target.checked)}
         />
       </div>
       <div style={settingRowStyle}>
         <label htmlFor="boxShowMapNamesCheckbox" style={labelStyle}>Show Map Names:</label>
         <input
           type="checkbox"
           id="boxShowMapNamesCheckbox"
           style={checkboxStyle}
           checked={selectedElement.showMapNames === undefined ? true : selectedElement.showMapNames}
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
              value={selectedElement.gameEntrySpacing === undefined ? 10 : selectedElement.gameEntrySpacing}
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
           <input type="text" id="scoreOnlyFontFamilyInput" style={inputStyle} value={selectedElement.fontFamily || ''} onChange={(e) => handleSettingChange('fontFamily', e.target.value)} placeholder="e.g., Arial, sans-serif"/>
         </div>
         <div style={settingRowStyle}>
           <label htmlFor="scoreOnlyScaleSlider" style={labelStyle}>Scale:</label>
           <input type="range" id="scoreOnlyScaleSlider" style={rangeInputStyle} min="0.5" max="10" step="0.05" value={selectedElement.scale || 1} onChange={(e) => handleSettingChange('scale', parseFloat(e.target.value))} />
           <span style={rangeValueStyle}>{(selectedElement.scale || 1).toFixed(2)}</span>
         </div>
         <div style={settingRowStyle}>
           <label htmlFor="scoreOnlyPivotLockCheckbox" style={labelStyle}>Lock Center Pivot:</label>
           <input type="checkbox" id="scoreOnlyPivotLockCheckbox" style={checkboxStyle} checked={!!selectedElement.isPivotLocked} onChange={(e) => handleSettingChange('isPivotLocked', e.target.checked)} />
         </div>
         <div style={settingRowStyle}>
           <label htmlFor="scoreOnlyTextColorInput" style={labelStyle}>Text Color:</label>
           <input type="text" id="scoreOnlyTextColorInput" style={inputStyle} value={selectedElement.textColor || ''} onChange={(e) => handleSettingChange('textColor', e.target.value)} placeholder="e.g., #RRGGBB, white"/>
         </div>
       </>
     )}

     {selectedElement.type === 'NicknamesOnly' && (
       <>
         <h4 style={sectionHeaderStyle}>Nicknames Options</h4>
         <div style={settingRowStyle}>
           <label htmlFor="nicknamesOnlyFontFamilyInput" style={labelStyle}>Font Family:</label>
           <input type="text" id="nicknamesOnlyFontFamilyInput" style={inputStyle} value={selectedElement.fontFamily || ''} onChange={(e) => handleSettingChange('fontFamily', e.target.value)} placeholder="e.g., Arial, sans-serif"/>
         </div>
         <div style={settingRowStyle}>
           <label htmlFor="nicknamesOnlyScaleSlider" style={labelStyle}>Scale:</label>
           <input type="range" id="nicknamesOnlyScaleSlider" style={rangeInputStyle} min="0.5" max="10" step="0.05" value={selectedElement.scale || 1} onChange={(e) => handleSettingChange('scale', parseFloat(e.target.value))} />
           <span style={rangeValueStyle}>{(selectedElement.scale || 1).toFixed(2)}</span>
         </div>
         <div style={settingRowStyle}>
           <label htmlFor="nicknamesOnlyPivotLockCheckbox" style={labelStyle}>Lock Center Pivot:</label>
           <input type="checkbox" id="nicknamesOnlyPivotLockCheckbox" style={checkboxStyle} checked={!!selectedElement.isPivotLocked} onChange={(e) => handleSettingChange('isPivotLocked', e.target.checked)} />
         </div>
         <div style={settingRowStyle}>
           <label htmlFor="nicknamesOnlyTextColorInput" style={labelStyle}>Text Color:</label>
           <input type="text" id="nicknamesOnlyTextColorInput" style={inputStyle} value={selectedElement.textColor || ''} onChange={(e) => handleSettingChange('textColor', e.target.value)} placeholder="e.g., #RRGGBB, white"/>
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
             value={selectedElement.scale || 1}
             onChange={(e) => handleSettingChange('scale', parseFloat(e.target.value))}
           />
           <span style={rangeValueStyle}>{(selectedElement.scale || 1).toFixed(2)}</span>
         </div>
         <div style={settingRowStyle}>
           <label htmlFor="countryFlagsPivotLockCheckbox" style={labelStyle}>Lock Center Pivot:</label>
           <input
             type="checkbox"
             id="countryFlagsPivotLockCheckbox"
             style={checkboxStyle}
             checked={!!selectedElement.isPivotLocked}
             onChange={(e) => handleSettingChange('isPivotLocked', e.target.checked)}
           />
         </div>
         {/* pivotInternalOffset could be added here if needed */}
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
             value={selectedElement.scale || 1}
             onChange={(e) => handleSettingChange('scale', parseFloat(e.target.value))}
           />
           <span style={rangeValueStyle}>{(selectedElement.scale || 1).toFixed(2)}</span>
         </div>
         <div style={settingRowStyle}>
           <label htmlFor="colorGlowPivotLockCheckbox" style={labelStyle}>Lock Center Pivot:</label>
           <input
             type="checkbox"
             id="colorGlowPivotLockCheckbox"
             style={checkboxStyle}
             checked={!!selectedElement.isPivotLocked}
             onChange={(e) => handleSettingChange('isPivotLocked', e.target.checked)}
           />
         </div>
         {/*
         <div style={settingRowStyle}>
           <label htmlFor="colorGlowPivotOffsetSlider" style={labelStyle}>Pivot Offset (px):</label>
           <input
             type="range"
             id="colorGlowPivotOffsetSlider"
             style={rangeInputStyle}
             min="0"
             max="100" // Adjust max as needed
             step="1"
             value={selectedElement.pivotInternalOffset || 0}
             disabled={!selectedElement.isPivotLocked} // Optionally disable if pivot is not locked
             onChange={(e) => handleSettingChange('pivotInternalOffset', parseInt(e.target.value, 10))}
           />
           <span style={rangeValueStyle}>{(selectedElement.pivotInternalOffset || 0)}px</span>
         </div>
         */}
       </>
     )}

      <div style={{ borderTop: '1px solid #444', marginTop: '20px', paddingTop: '15px' }}><button onClick={handleDeleteElement} style={{...inputStyle, width: '100%', backgroundColor: '#dc3545', color: 'white'}}>Delete Element</button></div>
      <button onClick={onClose} style={{...inputStyle, width: '100%', backgroundColor: '#555', color: 'white', marginTop: '10px'}}>Close Panel</button>
    </div>
  );
};
export default SettingsPanel;
