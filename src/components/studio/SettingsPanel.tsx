import React from 'react';
import { StudioElement } from '../../types/draft'; // Assuming types are in this path

interface SettingsPanelProps {
  selectedElement: StudioElement | null;
  onClose: () => void;
  // We might add more props later, like updateElementSettings, removeElement etc.
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ selectedElement, onClose }) => {
  if (!selectedElement) {
    return null; // Don't render anything if no element is selected
  }

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    right: 0,
    top: 0,
    width: '280px', // A bit wider than the left toolbox
    height: '100%',
    backgroundColor: '#1e1e1e', // Slightly different background
    borderLeft: '1px solid #333',
    padding: '1rem',
    boxSizing: 'border-box',
    color: 'white',
    overflowY: 'auto',
    zIndex: 100, // Ensure it's above other elements on the canvas but below modals if any
  };

  const headerStyle: React.CSSProperties = {
    fontSize: '1.1em',
    marginBottom: '15px',
    paddingBottom: '10px',
    borderBottom: '1px solid #444',
    color: '#e0e0e0',
  };

  const infoStyle: React.CSSProperties = {
    marginBottom: '10px',
    fontSize: '0.9em',
    color: '#c0c0c0',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 15px',
    backgroundColor: '#555',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '20px',
    display: 'block',
    width: '100%',
  };

  return (
    <div style={panelStyle}>
      <h3 style={headerStyle}>Element Settings</h3>
      <div style={infoStyle}>
        <strong>ID:</strong> {selectedElement.id}
      </div>
      <div style={infoStyle}>
        <strong>Type:</strong> {selectedElement.type}
      </div>

      {/* Placeholder for actual settings controls */}
      <div style={{marginTop: '20px', borderTop: '1px solid #444', paddingTop: '15px'}}>
        <p style={{color: '#888', fontSize: '0.8em'}}>More settings will appear here based on element type.</p>
      </div>

      <button onClick={onClose} style={buttonStyle}>
        Close Panel
      </button>
    </div>
  );
};

export default SettingsPanel;
