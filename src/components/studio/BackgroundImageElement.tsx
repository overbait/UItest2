import React from 'react';
import { StudioElement } from '../../types/draft';

interface BackgroundImageElementProps {
  element: StudioElement; // Specifically, one where type might be "BackgroundImage"
  isBroadcast?: boolean; // To differentiate rendering if needed, though likely not for this element
  isSelected?: boolean; // For StudioInterface selection highlight (optional)
}

const BackgroundImageElement: React.FC<BackgroundImageElementProps> = ({ element, isBroadcast, isSelected }) => {
  console.log(`[COMPONENT DEBUG] BackgroundImageElement rendering. Element ID: ${element.id}, Image URL: ${element.imageUrl}`);

  if (element.type !== 'BackgroundImage') {
    // This component should only render BackgroundImage elements.
    // Or, you could make it more generic if it shares logic with other image-like elements.
    return null;
  }

  const { imageUrl, opacity, stretch } = element;

  if (!imageUrl) {
    // In StudioInterface, show a placeholder if no image URL is set
    if (!isBroadcast) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: isSelected ? '2px dashed #007bff' : '1px dashed #555',
          backgroundColor: 'rgba(255,255,255,0.05)',
          color: '#777',
          fontSize: '1em',
          boxSizing: 'border-box',
        }}>
          Background Image: No URL
        </div>
      );
    }
    return null; // Don't render anything in broadcast if no URL
  }

  const imgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: stretch || 'cover', // Default to 'cover'
    opacity: opacity === undefined ? 1 : opacity, // Default to 1 if undefined
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        border: (!isBroadcast && isSelected) ? '2px dashed #007bff' : 'none', // Highlight in Studio if selected
        boxSizing: 'border-box',
      }}
    >
      <img
        src={imageUrl}
        alt="Background"
        style={imgStyle}
        // draggable="false" might be good if this element is wrapped in react-draggable
        // to prevent native image drag interference.
        draggable="false"
      />
    </div>
  );
};

export default BackgroundImageElement;
