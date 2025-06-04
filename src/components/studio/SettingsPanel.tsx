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
      updateStudioElementSettings(selectedElement.id, { [settingName]: value });
    }
  };

  const handleDeleteElement = () => {
    if (selectedElement) { removeStudioElement(selectedElement.id); onClose(); }
  };

  const panelStyle: React.CSSProperties = { position: 'absolute', right: 0, top: 0, width: '280px', height: '100%', backgroundColor: '#1e1e1e', borderLeft: '1px solid #333', padding: '1rem', boxSizing: 'border-box', color: 'white', overflowY: 'auto', zIndex: 100 };
  const headerStyle: React.CSSProperties = { fontSize: '1.1em', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #444', color: '#e0e0e0' };
  const sectionHeaderStyle: React.CSSProperties = { fontSize: '1em', color: '#ccc', marginTop: '20px', marginBottom: '10px', borderBottom: '1px solid #383838', paddingBottom: '5px'};
  const settingRowStyle: React.CSSProperties = { marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const labelStyle: React.CSSProperties = { fontSize: '0.9em', color: '#b0b0b0', marginRight: '10px', flexShrink: 0 };
  const inputStyle: React.CSSProperties = { width: '60%', padding: '6px 8px', backgroundColor: '#2c2c2c', border: '1px solid #555', color: 'white', borderRadius: '4px', fontSize: '0.9em' };
  const checkboxStyle: React.CSSProperties = { transform: 'scale(1.1)', marginRight: '5px' }; // Keep for consistency if used elsewhere
  const rangeInputStyle: React.CSSProperties = { width: '55%', flexGrow: 1 }; // For slider
  const rangeValueStyle: React.CSSProperties = { fontSize: '0.8em', color: '#b0b0b0', marginLeft: '10px', minWidth: '30px', textAlign: 'right' };


  return (
    <div style={panelStyle}>
      <h3 style={headerStyle}>Element Settings</h3>
      <div style={{ marginBottom: '10px', fontSize: '0.8em', color: '#888' }}>ID: {selectedElement.id.substring(0,8)}... <br/>Type: {selectedElement.type}</div>

      {selectedElement.type === 'ScoreDisplay' && (
        <>
          <h4 style={sectionHeaderStyle}>Score Display Options</h4>
          <div style={settingRowStyle}><label htmlFor="fontFamilyInput" style={labelStyle}>Font Family:</label><input type="text" id="fontFamilyInput" style={inputStyle} value={selectedElement.fontFamily || ''} onChange={(e) => handleSettingChange('fontFamily', e.target.value)} placeholder="e.g., Arial"/></div>
          <div style={settingRowStyle}><label htmlFor="showNameCheckbox" style={labelStyle}>Show Names:</label><input type="checkbox" id="showNameCheckbox" style={checkboxStyle} checked={selectedElement.showName === undefined ? true : selectedElement.showName} onChange={(e) => handleSettingChange('showName', e.target.checked)}/></div>
          <div style={settingRowStyle}><label htmlFor="showScoreCheckbox" style={labelStyle}>Show Scores:</label><input type="checkbox" id="showScoreCheckbox" style={checkboxStyle} checked={selectedElement.showScore === undefined ? true : selectedElement.showScore} onChange={(e) => handleSettingChange('showScore', e.target.checked)}/></div>
          <div style={settingRowStyle}>
            <label htmlFor="scaleSlider" style={labelStyle}>Scale:</label>
            <input
              type="range"
              id="scaleSlider"
              style={rangeInputStyle}
              min="0.5" max="3" step="0.05"
              value={selectedElement.scale || 1}
              onChange={(e) => handleSettingChange('scale', parseFloat(e.target.value))}
            />
            <span style={rangeValueStyle}>{(selectedElement.scale || 1).toFixed(2)}</span>
          </div>
        </>
      )}
      <div style={{ borderTop: '1px solid #444', marginTop: '20px', paddingTop: '15px' }}><button onClick={handleDeleteElement} style={{...inputStyle, width: '100%', backgroundColor: '#dc3545', color: 'white'}}>Delete Element</button></div>
      <button onClick={onClose} style={{...inputStyle, width: '100%', backgroundColor: '#555', color: 'white', marginTop: '10px'}}>Close Panel</button>
    </div>
  );
};
export default SettingsPanel;
