import React from 'react';
import useDraftStore from '../../store/draftStore'; // Corrected path

// Define props for the component, though it primarily uses the store for data.
// We might add props later for ID, position, size if needed when rendering from studioLayout.
interface ScoreDisplayElementProps {
  // Example: elementId: string;
}

const ScoreDisplayElement: React.FC<ScoreDisplayElementProps> = () => {
  const hostName = useDraftStore((state) => state.hostName);
  const guestName = useDraftStore((state) => state.guestName);
  const scores = useDraftStore((state) => state.scores);

  return (
    <div style={{
      border: '1px solid #555',
      padding: '10px',
      borderRadius: '5px',
      backgroundColor: '#333',
      color: 'white',
      display: 'inline-block', // So it takes content width by default
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px', // Default font size
      width: '100%', // Ensure it fills the resizable box
      height: '100%', // Ensure it fills the resizable box
      boxSizing: 'border-box', // Include padding and border in the element's total width and height
      display: 'flex', // Use flex to center content or manage layout
      alignItems: 'center', // Center content vertically
      justifyContent: 'center', // Center content horizontally
    }}>
      <span>{hostName}</span>
      <span style={{ fontWeight: 'bold', margin: '0 5px' }}>({scores.host})</span>
      <span style={{ margin: '0 5px' }}>-</span>
      <span style={{ fontWeight: 'bold', margin: '0 5px' }}>({scores.guest})</span>
      <span>{guestName}</span>
    </div>
  );
};

export default ScoreDisplayElement;
