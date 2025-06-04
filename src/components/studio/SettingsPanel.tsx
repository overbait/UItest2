import React from 'react';
import { StudioElement } from '../../types/draft';
import useDraftStore from '../../store/draftStore'; // To call actions directly for now

interface SettingsPanelProps {
  selectedElement: StudioElement | null;
  onClose: () => void;
  // No longer passing update/remove as props, will call store actions directly
  // onUpdateSettings: (elementId: string, settings: Partial<StudioElement>) => void;
  // onRemoveElement: (elementId: string) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ selectedElement, onClose }) => {
  // Get actions directly from the store
  const updateStudioElementSettings = useDraftStore(state => state.updateStudioElementSettings);
  const removeStudioElement = useDraftStore(state => state.removeStudioElement);

  if (!selectedElement) {
    return null;
  }

  const handleSettingChange = (settingName: keyof StudioElement, value: any) => {
    if (selectedElement) {
      updateStudioElementSettings(selectedElement.id, { [settingName]: value });
    }
  };

  const handleDeleteElement = () => {
    if (selectedElement) {
      removeStudioElement(selectedElement.id);
      onClose(); // Close panel after deleting
    }
  };

  // Common styles (can be moved to a separate file or defined outside component later)
  const panelStyle: React.CSSProperties = { position: 'absolute', right: 0, top: 0, width: '280px', height: '100%', backgroundColor: '#1e1e1e', borderLeft: '1px solid #333', padding: '1rem', boxSizing: 'border-box', color: 'white', overflowY: 'auto', zIndex: 100 };
  const headerStyle: React.CSSProperties = { fontSize: '1.1em', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #444', color: '#e0e0e0' };
  const sectionHeaderStyle: React.CSSProperties = { fontSize: '1em', color: '#ccc', marginTop: '20px', marginBottom: '10px', borderBottom: '1px solid #383838', paddingBottom: '5px'};
  const settingRowStyle: React.CSSProperties = { marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const labelStyle: React.CSSProperties = { fontSize: '0.9em', color: '#b0b0b0', marginRight: '10px' };
  const inputStyle: React.CSSProperties = { width: '60%', padding: '6px 8px', backgroundColor: '#2c2c2c', border: '1px solid #555', color: 'white', borderRadius: '4px', fontSize: '0.9em' };
  const checkboxStyle: React.CSSProperties = { transform: 'scale(1.1)', marginRight: '5px' };
  const buttonStyle: React.CSSProperties = { padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'block', width: '100%', fontSize: '0.9em' };
  const deleteButtonStyle: React.CSSProperties = { ...buttonStyle, backgroundColor: '#dc3545', color: 'white', marginTop: '20px' };
  const closeButtonStyle: React.CSSProperties = { ...buttonStyle, backgroundColor: '#555', color: 'white', marginTop: '10px' };


  return (
    <div style={panelStyle}>
      <h3 style={headerStyle}>Element Settings</h3>
      <div style={{ marginBottom: '10px', fontSize: '0.8em', color: '#888' }}>
        ID: {selectedElement.id.substring(0,8)}... <br/>
        Type: {selectedElement.type}
      </div>

      {selectedElement.type === 'ScoreDisplay' && (
        <>
          <h4 style={sectionHeaderStyle}>Score Display Options</h4>
          <div style={settingRowStyle}>
            <label htmlFor="fontFamilyInput" style={labelStyle}>Font Family:</label>
            <input
              type="text"
              id="fontFamilyInput"
              style={inputStyle}
              value={selectedElement.fontFamily || 'Arial'}
              onChange={(e) => handleSettingChange('fontFamily', e.target.value)}
            />
          </div>
          <div style={settingRowStyle}>
            <label htmlFor="showNameCheckbox" style={labelStyle}>Show Names:</label>
            <input
              type="checkbox"
              id="showNameCheckbox"
              style={checkboxStyle}
              checked={typeof selectedElement.showName === 'boolean' ? selectedElement.showName : true}
              onChange={(e) => handleSettingChange('showName', e.target.checked)}
            />
          </div>
          <div style={settingRowStyle}>
            <label htmlFor="showScoreCheckbox" style={labelStyle}>Show Scores:</label>
            <input
              type="checkbox"
              id="showScoreCheckbox"
              style={checkboxStyle}
              checked={typeof selectedElement.showScore === 'boolean' ? selectedElement.showScore : true}
              onChange={(e) => handleSettingChange('showScore', e.target.checked)}
            />
          </div>
          {/* Placeholder for Scale Slider - to be added next */}
          {/*
          <div style={settingRowStyle}>
            <label htmlFor="scaleSlider" style={labelStyle}>Scale:</label>
            <input type="range" id="scaleSlider" style={{width: '60%'}} min="0.5" max="2" step="0.1" />
          </div>
          */}
        </>
      )}

      {/* Generic Controls or other element types here */}
      <div style={{ borderTop: '1px solid #444', marginTop: '20px', paddingTop: '15px' }}>
        <button onClick={handleDeleteElement} style={deleteButtonStyle}>
          Delete Element
        </button>
      </div>

      <button onClick={onClose} style={closeButtonStyle}>
        Close Panel
      </button>
    </div>
  );
};

export default SettingsPanel;
