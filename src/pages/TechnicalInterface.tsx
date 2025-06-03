import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useDraftStore from '../store/draftStore';
import { DraftUIConfig } from '../types/draft';

// Tab navigation component
const TabNavigation: React.FC<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabs: { id: string; label: string }[];
}> = ({ activeTab, setActiveTab, tabs }) => {
  return (
    <div className="border-b border-ui-secondary mb-4">
      <nav className="flex space-x-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`py-2 px-4 font-medieval transition-colors ${
              activeTab === tab.id
                ? 'text-aoe-gold border-b-2 border-aoe-gold'
                : 'text-aoe-light hover:text-aoe-tan'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

// Connection status component
const ConnectionStatus: React.FC = () => {
  const { connectionStatus, connectionError, draftId, reconnect } = useDraftStore();

  const getStatusClass = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'status-connected';
      case 'disconnected':
        return 'status-disconnected';
      case 'connecting':
        return 'status-connecting';
      case 'error':
        return 'status-disconnected';
      default:
        return '';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return `Connected: ID ${draftId}`;
      case 'disconnected':
        return 'Disconnected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return `Error: ${connectionError || 'Unknown error'}`;
      default:
        return 'Unknown status';
    }
  };

  return (
    <div className="flex items-center justify-between bg-ui-background rounded-md p-3 mb-4">
      <div className="flex items-center">
        <div className={`w-3 h-3 rounded-full mr-2 ${getStatusClass()}`}></div>
        <span className="text-aoe-light">{getStatusText()}</span>
      </div>
      <div className="flex space-x-2">
        <button
          className="button-secondary text-sm py-1"
          onClick={reconnect}
          disabled={connectionStatus === 'connecting'}
        >
          Reconnect
        </button>
        <Link to="/broadcast" target="_blank" className="button-primary text-sm py-1">
          Open Broadcast View
        </Link>
      </div>
    </div>
  );
};

// Player controls component
const PlayerControls: React.FC = () => {
  const { draft, updatePlayerName, updatePlayerScore } = useDraftStore();

  if (!draft) return null;

  return (
    <div className="technical-container mb-4">
      <h3 className="text-lg font-medieval text-aoe-gold mb-3">Player Information</h3>
      <div className="grid grid-cols-2 gap-4">
        {/* Host controls */}
        <div className="space-y-3">
          <h4 className="font-medieval text-aoe-tan">Host Player</h4>
          <div>
            <label htmlFor="hostName" className="block text-sm text-aoe-light mb-1">
              Name
            </label>
            <input
              id="hostName"
              type="text"
              className="input-field w-full"
              value={draft.host.name}
              onChange={(e) => updatePlayerName('host', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="hostScore" className="block text-sm text-aoe-light mb-1">
              Score
            </label>
            <input
              id="hostScore"
              type="number"
              className="input-field w-full"
              value={draft.host.score || 0}
              onChange={(e) => updatePlayerScore('host', parseInt(e.target.value) || 0)}
              min={0}
            />
          </div>
        </div>

        {/* Guest controls */}
        <div className="space-y-3">
          <h4 className="font-medieval text-aoe-tan">Guest Player</h4>
          <div>
            <label htmlFor="guestName" className="block text-sm text-aoe-light mb-1">
              Name
            </label>
            <input
              id="guestName"
              type="text"
              className="input-field w-full"
              value={draft.guest.name}
              onChange={(e) => updatePlayerName('guest', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="guestScore" className="block text-sm text-aoe-light mb-1">
              Score
            </label>
            <input
              id="guestScore"
              type="number"
              className="input-field w-full"
              value={draft.guest.score || 0}
              onChange={(e) => updatePlayerScore('guest', parseInt(e.target.value) || 0)}
              min={0}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Draft data display component
const DraftDataDisplay: React.FC = () => {
  const { draft, turnTimer } = useDraftStore();

  if (!draft) return null;

  const formatAction = (action: string) => {
    return action.charAt(0) + action.slice(1).toLowerCase();
  };

  return (
    <div className="technical-container mb-4">
      <h3 className="text-lg font-medieval text-aoe-gold mb-3">Draft Information</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-aoe-light">
            <span className="text-aoe-tan">Preset:</span> {draft.presetName || 'Custom'}
          </p>
          <p className="text-sm text-aoe-light">
            <span className="text-aoe-tan">Status:</span> {draft.status.charAt(0).toUpperCase() + draft.status.slice(1)}
          </p>
        </div>
        <div>
          <p className="text-sm text-aoe-light">
            <span className="text-aoe-tan">Current Turn:</span> {draft.currentTurn + 1} of {draft.turns.length}
          </p>
          <p className="text-sm text-aoe-light">
            <span className="text-aoe-tan">Timer:</span> {turnTimer.remainingTime}s / {turnTimer.totalTime}s
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Host civilizations */}
        <div>
          <h4 className="font-medieval text-aoe-tan mb-2">Host Civilizations</h4>
          <div className="space-y-2">
            <div>
              <h5 className="text-sm text-pick-light">Picks ({draft.hostCivs.picks.length})</h5>
              <ul className="text-sm text-aoe-light ml-4 list-disc">
                {draft.hostCivs.picks.map((civ, index) => (
                  <li key={`host-pick-${index}`}>{civ.name}</li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-sm text-ban-light">Bans ({draft.hostCivs.bans.length})</h5>
              <ul className="text-sm text-aoe-light ml-4 list-disc">
                {draft.hostCivs.bans.map((civ, index) => (
                  <li key={`host-ban-${index}`}>{civ.name}</li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-sm text-snipe-light">Snipes ({draft.hostCivs.snipes.length})</h5>
              <ul className="text-sm text-aoe-light ml-4 list-disc">
                {draft.hostCivs.snipes.map((civ, index) => (
                  <li key={`host-snipe-${index}`}>{civ.name}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Guest civilizations */}
        <div>
          <h4 className="font-medieval text-aoe-tan mb-2">Guest Civilizations</h4>
          <div className="space-y-2">
            <div>
              <h5 className="text-sm text-pick-light">Picks ({draft.guestCivs.picks.length})</h5>
              <ul className="text-sm text-aoe-light ml-4 list-disc">
                {draft.guestCivs.picks.map((civ, index) => (
                  <li key={`guest-pick-${index}`}>{civ.name}</li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-sm text-ban-light">Bans ({draft.guestCivs.bans.length})</h5>
              <ul className="text-sm text-aoe-light ml-4 list-disc">
                {draft.guestCivs.bans.map((civ, index) => (
                  <li key={`guest-ban-${index}`}>{civ.name}</li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-sm text-snipe-light">Snipes ({draft.guestCivs.snipes.length})</h5>
              <ul className="text-sm text-aoe-light ml-4 list-disc">
                {draft.guestCivs.snipes.map((civ, index) => (
                  <li key={`guest-snipe-${index}`}>{civ.name}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Maps section */}
      <div className="mt-4">
        <h4 className="font-medieval text-aoe-tan mb-2">Maps</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h5 className="text-sm text-pick-light">Picks ({draft.maps.picks.length})</h5>
            <ul className="text-sm text-aoe-light ml-4 list-disc">
              {draft.maps.picks.map((map, index) => (
                <li key={`map-pick-${index}`}>{map.name}</li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="text-sm text-ban-light">Bans ({draft.maps.bans.length})</h5>
            <ul className="text-sm text-aoe-light ml-4 list-disc">
              {draft.maps.bans.map((map, index) => (
                <li key={`map-ban-${index}`}>{map.name}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Turn sequence */}
      <div className="mt-4">
        <h4 className="font-medieval text-aoe-tan mb-2">Turn Sequence</h4>
        <div className="max-h-40 overflow-y-auto pr-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-ui-secondary">
                <th className="pb-1 text-aoe-light">#</th>
                <th className="pb-1 text-aoe-light">Player</th>
                <th className="pb-1 text-aoe-light">Action</th>
              </tr>
            </thead>
            <tbody>
              {draft.turns.map((turn, index) => (
                <tr 
                  key={`turn-${index}`} 
                  className={`border-b border-ui-secondary ${index === draft.currentTurn ? 'bg-ui-primary bg-opacity-20' : ''}`}
                >
                  <td className="py-1 text-aoe-light">{index + 1}</td>
                  <td className="py-1 text-aoe-light capitalize">{turn.player}</td>
                  <td className="py-1 text-aoe-light">{formatAction(turn.action)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Define a type for selectable UI elements, excluding 'customElements'
type SelectableUiElement = Exclude<keyof DraftUIConfig['positions'], 'customElements'>;

// Draggable element configurator component
const DraggableConfigurator: React.FC = () => {
  const { uiConfig, updateElementPosition } = useDraftStore();
  const [selectedElement, setSelectedElement] = useState<SelectableUiElement | null>(null);

  const handlePositionChange = (field: string, value: number) => {
    if (!selectedElement) return;
    
    updateElementPosition(selectedElement, { [field]: value });
  };

  const handleVisibilityChange = (visible: boolean) => {
    if (!selectedElement) return;
    
    updateElementPosition(selectedElement, { visible });
  };

  return (
    <div className="technical-container mb-4">
      <h3 className="text-lg font-medieval text-aoe-gold mb-3">Element Positioning</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="elementSelect" className="block text-sm text-aoe-light mb-1">
            Select Element
          </label>
          <select
            id="elementSelect"
            className="input-field w-full"
            value={selectedElement || ''}
            onChange={(e) => setSelectedElement(e.target.value as SelectableUiElement)}
          >
            <option value="">-- Select an element --</option>
            <option value="hostName">Host Name</option>
            <option value="guestName">Guest Name</option>
            <option value="hostScore">Host Score</option>
            <option value="guestScore">Guest Score</option>
            <option value="hostCivs">Host Civilizations</option>
            <option value="guestCivs">Guest Civilizations</option>
            <option value="maps">Maps</option>
            <option value="status">Status</option>
            <option value="timer">Timer</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm text-aoe-light mb-1">
            Visibility
          </label>
          <div className="flex items-center space-x-4">
            <label className="flex items-center text-aoe-light">
              <input
                type="checkbox"
                className="mr-2"
                checked={selectedElement ? uiConfig.positions[selectedElement]?.visible !== false : false}
                onChange={(e) => handleVisibilityChange(e.target.checked)}
                disabled={!selectedElement}
              />
              Visible
            </label>
          </div>
        </div>
      </div>
      
      {selectedElement && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="posX" className="block text-sm text-aoe-light mb-1">
              X Position
            </label>
            <input
              id="posX"
              type="number"
              className="input-field w-full"
              value={uiConfig.positions[selectedElement]?.x ?? 0}
              onChange={(e) => handlePositionChange('x', parseInt(e.target.value) || 0)}
            />
          </div>
          
          <div>
            <label htmlFor="posY" className="block text-sm text-aoe-light mb-1">
              Y Position
            </label>
            <input
              id="posY"
              type="number"
              className="input-field w-full"
              value={uiConfig.positions[selectedElement]?.y ?? 0}
              onChange={(e) => handlePositionChange('y', parseInt(e.target.value) || 0)}
            />
          </div>
          
          <div>
            <label htmlFor="width" className="block text-sm text-aoe-light mb-1">
              Width
            </label>
            <input
              id="width"
              type="number"
              className="input-field w-full"
              value={uiConfig.positions[selectedElement]?.width ?? 200}
              onChange={(e) => handlePositionChange('width', parseInt(e.target.value) || 200)}
            />
          </div>
          
          <div>
            <label htmlFor="height" className="block text-sm text-aoe-light mb-1">
              Height
            </label>
            <input
              id="height"
              type="number"
              className="input-field w-full"
              value={uiConfig.positions[selectedElement]?.height ?? 40}
              onChange={(e) => handlePositionChange('height', parseInt(e.target.value) || 40)}
            />
          </div>
          
          <div>
            <label htmlFor="zIndex" className="block text-sm text-aoe-light mb-1">
              Z-Index
            </label>
            <input
              id="zIndex"
              type="number"
              className="input-field w-full"
              value={uiConfig.positions[selectedElement]?.zIndex ?? 10}
              onChange={(e) => handlePositionChange('zIndex', parseInt(e.target.value) || 10)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Font selector component
const FontSelector: React.FC = () => {
  const { uiConfig, updateUIConfig } = useDraftStore();
  
  const fontOptions = [
    { value: 'font-medieval', label: 'Medieval (Cinzel)' },
    { value: 'font-game', label: 'Game (Alegreya)' },
    { value: 'font-broadcast', label: 'Broadcast (Roboto)' },
    { value: 'font-technical', label: 'Technical (Inter)' },
    { value: 'font-display', label: 'Display (MedievalSharp)' },
  ];
  
  const handleFontChange = (element: keyof typeof uiConfig.fonts, value: string) => {
    updateUIConfig({
      fonts: {
        ...uiConfig.fonts,
        [element]: value,
      },
    });
  };
  
  return (
    <div className="technical-container mb-4">
      <h3 className="text-lg font-medieval text-aoe-gold mb-3">Font Selection</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="playerNamesFont" className="block text-sm text-aoe-light mb-1">
            Player Names
          </label>
          <select
            id="playerNamesFont"
            className="input-field w-full"
            value={uiConfig.fonts?.playerNames || 'font-medieval'}
            onChange={(e) => handleFontChange('playerNames', e.target.value)}
          >
            {fontOptions.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
          <p className={`mt-2 ${uiConfig.fonts?.playerNames || 'font-medieval'}`}>
            Player Name Preview
          </p>
        </div>
        
        <div>
          <label htmlFor="civilizationsFont" className="block text-sm text-aoe-light mb-1">
            Civilizations
          </label>
          <select
            id="civilizationsFont"
            className="input-field w-full"
            value={uiConfig.fonts?.civilizations || 'font-game'}
            onChange={(e) => handleFontChange('civilizations', e.target.value)}
          >
            {fontOptions.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
          <p className={`mt-2 ${uiConfig.fonts?.civilizations || 'font-game'}`}>
            Civilization Preview
          </p>
        </div>
        
        <div>
          <label htmlFor="mapsFont" className="block text-sm text-aoe-light mb-1">
            Maps
          </label>
          <select
            id="mapsFont"
            className="input-field w-full"
            value={uiConfig.fonts?.maps || 'font-game'}
            onChange={(e) => handleFontChange('maps', e.target.value)}
          >
            {fontOptions.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
          <p className={`mt-2 ${uiConfig.fonts?.maps || 'font-game'}`}>
            Map Name Preview
          </p>
        </div>
        
        <div>
          <label htmlFor="statusFont" className="block text-sm text-aoe-light mb-1">
            Status Text
          </label>
          <select
            id="statusFont"
            className="input-field w-full"
            value={uiConfig.fonts?.status || 'font-technical'}
            onChange={(e) => handleFontChange('status', e.target.value)}
          >
            {fontOptions.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
          <p className={`mt-2 ${uiConfig.fonts?.status || 'font-technical'}`}>
            Status Text Preview
          </p>
        </div>
      </div>
    </div>
  );
};

// Image uploader component
const ImageUploader: React.FC = () => {
  const { uiConfig, updateUIConfig } = useDraftStore();
  const [selectedImage, setSelectedImage] = useState<string>('background');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      
      if (selectedImage === 'background') {
        updateUIConfig({
          images: {
            ...uiConfig.images,
            background: imageUrl,
          },
        });
      } else if (selectedImage === 'hostLogo') {
        updateUIConfig({
          images: {
            ...uiConfig.images,
            hostLogo: imageUrl,
          },
        });
      } else if (selectedImage === 'guestLogo') {
        updateUIConfig({
          images: {
            ...uiConfig.images,
            guestLogo: imageUrl,
          },
        });
      } else {
        // Custom image
        updateUIConfig({
          images: {
            ...uiConfig.images,
            customImages: {
              ...uiConfig.images?.customImages,
              [selectedImage]: imageUrl,
            },
          },
        });
      }
    };
    
    reader.readAsDataURL(file);
  };
  
  const handleAddCustomImage = () => {
    const name = prompt('Enter a name for the custom image:');
    if (name && name.trim()) {
      setSelectedImage(name.trim());
      // Trigger file input click
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };
  
  const handleRemoveImage = () => {
    if (selectedImage === 'background') {
      updateUIConfig({
        images: {
          ...uiConfig.images,
          background: '',
        },
      });
    } else if (selectedImage === 'hostLogo') {
      updateUIConfig({
        images: {
          ...uiConfig.images,
          hostLogo: '',
        },
      });
    } else if (selectedImage === 'guestLogo') {
      updateUIConfig({
        images: {
          ...uiConfig.images,
          guestLogo: '',
        },
      });
    } else {
      // Custom image
      const customImages = { ...uiConfig.images?.customImages };
      if (customImages) {
        delete customImages[selectedImage];
      }
      
      updateUIConfig({
        images: {
          ...uiConfig.images,
          customImages,
        },
      });
      
      setSelectedImage('background');
    }
  };
  
  const getImagePreview = () => {
    if (selectedImage === 'background') {
      return uiConfig.images?.background || '';
    } else if (selectedImage === 'hostLogo') {
      return uiConfig.images?.hostLogo || '';
    } else if (selectedImage === 'guestLogo') {
      return uiConfig.images?.guestLogo || '';
    } else {
      return uiConfig.images?.customImages?.[selectedImage] || '';
    }
  };
  
  return (
    <div className="technical-container mb-4">
      <h3 className="text-lg font-medieval text-aoe-gold mb-3">Image Management</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="imageSelect" className="block text-sm text-aoe-light mb-1">
            Select Image
          </label>
          <div className="flex space-x-2">
            <select
              id="imageSelect"
              className="input-field flex-grow"
              value={selectedImage}
              onChange={(e) => setSelectedImage(e.target.value)}
            >
              <option value="background">Background</option>
              <option value="hostLogo">Host Logo</option>
              <option value="guestLogo">Guest Logo</option>
              {/* Custom images */}
              {Object.keys(uiConfig.images?.customImages || {}).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <button
              className="button-secondary text-sm py-1 px-2"
              onClick={handleAddCustomImage}
            >
              Add New
            </button>
          </div>
        </div>
        
        <div>
          <label className="block text-sm text-aoe-light mb-1">
            Upload Image
          </label>
          <div className="flex space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
            />
            <button
              className="button-primary text-sm py-1 flex-grow"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Image
            </button>
            <button
              className="button-secondary text-sm py-1 px-2"
              onClick={handleRemoveImage}
              disabled={!getImagePreview()}
            >
              Remove
            </button>
          </div>
        </div>
      </div>
      
      {/* Image preview */}
      <div className="mt-4">
        <h4 className="text-sm text-aoe-tan mb-2">Image Preview</h4>
        <div className="border border-ui-secondary rounded-md h-40 flex items-center justify-center overflow-hidden">
          {getImagePreview() ? (
            <img
              src={getImagePreview()}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <p className="text-aoe-light text-opacity-50">No image selected</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Animation settings component
const AnimationSettings: React.FC = () => {
  const { uiConfig, updateUIConfig } = useDraftStore();
  
  const handleAnimationChange = (enabled: boolean) => {
    updateUIConfig({
      animations: {
        ...uiConfig.animations,
        enabled,
      },
    });
  };
  
  const handleAnimationTypeChange = (type: string) => {
    updateUIConfig({
      animations: {
        ...uiConfig.animations,
        type: type as 'fade' | 'slide' | 'bounce' | 'none',
      },
    });
  };
  
  const handleDurationChange = (duration: number) => {
    updateUIConfig({
      animations: {
        ...uiConfig.animations,
        duration,
      },
    });
  };
  
  return (
    <div className="technical-container mb-4">
      <h3 className="text-lg font-medieval text-aoe-gold mb-3">Animation Settings</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-aoe-light mb-1">
            Enable Animations
          </label>
          <div className="flex items-center space-x-4">
            <label className="flex items-center text-aoe-light">
              <input
                type="checkbox"
                className="mr-2"
                checked={uiConfig.animations?.enabled ?? true}
                onChange={(e) => handleAnimationChange(e.target.checked)}
              />
              Enabled
            </label>
          </div>
        </div>
        
        <div>
          <label htmlFor="animationType" className="block text-sm text-aoe-light mb-1">
            Animation Type
          </label>
          <select
            id="animationType"
            className="input-field w-full"
            value={uiConfig.animations?.type || 'fade'}
            onChange={(e) => handleAnimationTypeChange(e.target.value)}
            disabled={!(uiConfig.animations?.enabled ?? true)}
          >
            <option value="fade">Fade</option>
            <option value="slide">Slide</option>
            <option value="bounce">Bounce</option>
            <option value="none">None</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="animationDuration" className="block text-sm text-aoe-light mb-1">
            Duration (ms)
          </label>
          <input
            id="animationDuration"
            type="number"
            className="input-field w-full"
            value={uiConfig.animations?.duration || 500}
            onChange={(e) => handleDurationChange(parseInt(e.target.value) || 500)}
            min={0}
            step={100}
            disabled={!(uiConfig.animations?.enabled ?? true)}
          />
        </div>
      </div>
    </div>
  );
};

// Color settings component
const ColorSettings: React.FC = () => {
  const { uiConfig, updateUIConfig } = useDraftStore();
  
  const handleColorChange = (colorKey: keyof typeof uiConfig.colors, value: string) => {
    updateUIConfig({
      colors: {
        ...uiConfig.colors,
        [colorKey]: value,
      },
    });
  };
  
  return (
    <div className="technical-container mb-4">
      <h3 className="text-lg font-medieval text-aoe-gold mb-3">Color Settings</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="textColor" className="block text-sm text-aoe-light mb-1">
            Text Color
          </label>
          <div className="flex space-x-2">
            <input
              type="color"
              id="textColor"
              className="h-10 w-10 rounded cursor-pointer"
              value={uiConfig.colors?.text || '#F5F5DC'}
              onChange={(e) => handleColorChange('text', e.target.value)}
            />
            <input
              type="text"
              className="input-field flex-grow"
              value={uiConfig.colors?.text || '#F5F5DC'}
              onChange={(e) => handleColorChange('text', e.target.value)}
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="hostHighlightColor" className="block text-sm text-aoe-light mb-1">
            Host Highlight
          </label>
          <div className="flex space-x-2">
            <input
              type="color"
              id="hostHighlightColor"
              className="h-10 w-10 rounded cursor-pointer"
              value={uiConfig.colors?.hostHighlight || '#4CAF50'}
              onChange={(e) => handleColorChange('hostHighlight', e.target.value)}
            />
            <input
              type="text"
              className="input-field flex-grow"
              value={uiConfig.colors?.hostHighlight || '#4CAF50'}
              onChange={(e) => handleColorChange('hostHighlight', e.target.value)}
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="guestHighlightColor" className="block text-sm text-aoe-light mb-1">
            Guest Highlight
          </label>
          <div className="flex space-x-2">
            <input
              type="color"
              id="guestHighlightColor"
              className="h-10 w-10 rounded cursor-pointer"
              value={uiConfig.colors?.guestHighlight || '#2196F3'}
              onChange={(e) => handleColorChange('guestHighlight', e.target.value)}
            />
            <input
              type="text"
              className="input-field flex-grow"
              value={uiConfig.colors?.guestHighlight || '#2196F3'}
              onChange={(e) => handleColorChange('guestHighlight', e.target.value)}
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="pickColor" className="block text-sm text-aoe-light mb-1">
            Pick Color
          </label>
          <div className="flex space-x-2">
            <input
              type="color"
              id="pickColor"
              className="h-10 w-10 rounded cursor-pointer"
              value={uiConfig.colors?.pick || '#4CAF50'}
              onChange={(e) => handleColorChange('pick', e.target.value)}
            />
            <input
              type="text"
              className="input-field flex-grow"
              value={uiConfig.colors?.pick || '#4CAF50'}
              onChange={(e) => handleColorChange('pick', e.target.value)}
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="banColor" className="block text-sm text-aoe-light mb-1">
            Ban Color
          </label>
          <div className="flex space-x-2">
            <input
              type="color"
              id="banColor"
              className="h-10 w-10 rounded cursor-pointer"
              value={uiConfig.colors?.ban || '#F44336'}
              onChange={(e) => handleColorChange('ban', e.target.value)}
            />
            <input
              type="text"
              className="input-field flex-grow"
              value={uiConfig.colors?.ban || '#F44336'}
              onChange={(e) => handleColorChange('ban', e.target.value)}
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="snipeColor" className="block text-sm text-aoe-light mb-1">
            Snipe Color
          </label>
          <div className="flex space-x-2">
            <input
              type="color"
              id="snipeColor"
              className="h-10 w-10 rounded cursor-pointer"
              value={uiConfig.colors?.snipe || '#FF9800'}
              onChange={(e) => handleColorChange('snipe', e.target.value)}
            />
            <input
              type="text"
              className="input-field flex-grow"
              value={uiConfig.colors?.snipe || '#FF9800'}
              onChange={(e) => handleColorChange('snipe', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Live preview component
const LivePreview: React.FC = () => {
  const { draft, uiConfig } = useDraftStore();
  
  if (!draft) return null;
  
  // Create a simplified preview of the broadcast view
  return (
    <div className="technical-container mb-4">
      <h3 className="text-lg font-medieval text-aoe-gold mb-3">Live Preview</h3>
      
      <div className="relative border border-ui-secondary rounded-md h-80 overflow-hidden bg-gray-900 bg-opacity-50">
        {/* Background image if available */}
        {uiConfig.images?.background && (
          <img
            src={uiConfig.images.background}
            alt="Background"
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}
        
        {/* Host name */}
        {uiConfig.positions?.hostName?.visible !== false && (
          <div
            className={`absolute bg-ui-background bg-opacity-70 p-2 rounded-md border border-ui-primary ${uiConfig.fonts?.playerNames || 'font-medieval'}`}
            style={{
              left: uiConfig.positions?.hostName?.x ?? 0,
              top: uiConfig.positions?.hostName?.y ?? 0,
              width: uiConfig.positions?.hostName?.width ?? 200,
              height: uiConfig.positions?.hostName?.height ?? 40,
              zIndex: uiConfig.positions?.hostName?.zIndex ?? 10,
              color: uiConfig.colors?.text ?? '#F5F5DC',
            }}
          >
            {draft.host.name}
          </div>
        )}
        
        {/* Guest name */}
        {uiConfig.positions?.guestName?.visible !== false && (
          <div
            className={`absolute bg-ui-background bg-opacity-70 p-2 rounded-md border border-ui-primary ${uiConfig.fonts?.playerNames || 'font-medieval'}`}
            style={{
              left: uiConfig.positions?.guestName?.x ?? 0,
              top: uiConfig.positions?.guestName?.y ?? 0,
              width: uiConfig.positions?.guestName?.width ?? 200,
              height: uiConfig.positions?.guestName?.height ?? 40,
              zIndex: uiConfig.positions?.guestName?.zIndex ?? 10,
              color: uiConfig.colors?.text ?? '#F5F5DC',
            }}
          >
            {draft.guest.name}
          </div>
        )}
        
        {/* Host score */}
        {uiConfig.positions?.hostScore?.visible !== false && (
          <div
            className={`absolute bg-ui-background bg-opacity-70 p-2 rounded-md border border-ui-primary ${uiConfig.fonts?.playerNames || 'font-medieval'} flex items-center justify-center`}
            style={{
              left: uiConfig.positions?.hostScore?.x ?? 0,
              top: uiConfig.positions?.hostScore?.y ?? 0,
              width: uiConfig.positions?.hostScore?.width ?? 40,
              height: uiConfig.positions?.hostScore?.height ?? 40,
              zIndex: uiConfig.positions?.hostScore?.zIndex ?? 10,
              color: uiConfig.colors?.text ?? '#F5F5DC',
            }}
          >
            {draft.host.score || 0}
          </div>
        )}
        
        {/* Guest score */}
        {uiConfig.positions?.guestScore?.visible !== false && (
          <div
            className={`absolute bg-ui-background bg-opacity-70 p-2 rounded-md border border-ui-primary ${uiConfig.fonts?.playerNames || 'font-medieval'} flex items-center justify-center`}
            style={{
              left: uiConfig.positions?.guestScore?.x ?? 0,
              top: uiConfig.positions?.guestScore?.y ?? 0,
              width: uiConfig.positions?.guestScore?.width ?? 40,
              height: uiConfig.positions?.guestScore?.height ?? 40,
              zIndex: uiConfig.positions?.guestScore?.zIndex ?? 10,
              color: uiConfig.colors?.text ?? '#F5F5DC',
            }}
          >
            {draft.guest.score || 0}
          </div>
        )}
        
        {/* Host civilizations */}
        {uiConfig.positions?.hostCivs?.visible !== false && (
          <div
            className={`absolute bg-ui-background bg-opacity-70 p-2 rounded-md border border-ui-primary ${uiConfig.fonts?.civilizations || 'font-game'} overflow-auto`}
            style={{
              left: uiConfig.positions?.hostCivs?.x ?? 0,
              top: uiConfig.positions?.hostCivs?.y ?? 0,
              width: uiConfig.positions?.hostCivs?.width ?? 250,
              height: uiConfig.positions?.hostCivs?.height ?? 300,
              zIndex: uiConfig.positions?.hostCivs?.zIndex ?? 10,
              color: uiConfig.colors?.text ?? '#F5F5DC',
            }}
          >
            <div className="text-xs font-semibold" style={{ color: uiConfig.colors?.hostHighlight ?? '#4CAF50' }}>
              {draft.host.name} Civilizations
            </div>
            {draft.hostCivs.picks.length > 0 && (
              <div className="mt-1">
                <div className="text-xs" style={{ color: uiConfig.colors?.pick ?? '#4CAF50' }}>Picks:</div>
                <ul className="text-xs ml-2">
                  {draft.hostCivs.picks.map((civ, index) => (
                    <li key={`preview-host-pick-${index}`}>{civ.name}</li>
                  ))}
                </ul>
              </div>
            )}
            {draft.hostCivs.bans.length > 0 && (
              <div className="mt-1">
                <div className="text-xs" style={{ color: uiConfig.colors?.ban ?? '#F44336' }}>Bans:</div>
                <ul className="text-xs ml-2">
                  {draft.hostCivs.bans.map((civ, index) => (
                    <li key={`preview-host-ban-${index}`}>{civ.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        {/* Guest civilizations */}
        {uiConfig.positions?.guestCivs?.visible !== false && (
          <div
            className={`absolute bg-ui-background bg-opacity-70 p-2 rounded-md border border-ui-primary ${uiConfig.fonts?.civilizations || 'font-game'} overflow-auto`}
            style={{
              left: uiConfig.positions?.guestCivs?.x ?? 0,
              top: uiConfig.positions?.guestCivs?.y ?? 0,
              width: uiConfig.positions?.guestCivs?.width ?? 250,
              height: uiConfig.positions?.guestCivs?.height ?? 300,
              zIndex: uiConfig.positions?.guestCivs?.zIndex ?? 10,
              color: uiConfig.colors?.text ?? '#F5F5DC',
            }}
          >
            <div className="text-xs font-semibold" style={{ color: uiConfig.colors?.guestHighlight ?? '#2196F3' }}>
              {draft.guest.name} Civilizations
            </div>
            {draft.guestCivs.picks.length > 0 && (
              <div className="mt-1">
                <div className="text-xs" style={{ color: uiConfig.colors?.pick ?? '#4CAF50' }}>Picks:</div>
                <ul className="text-xs ml-2">
                  {draft.guestCivs.picks.map((civ, index) => (
                    <li key={`preview-guest-pick-${index}`}>{civ.name}</li>
                  ))}
                </ul>
              </div>
            )}
            {draft.guestCivs.bans.length > 0 && (
              <div className="mt-1">
                <div className="text-xs" style={{ color: uiConfig.colors?.ban ?? '#F44336' }}>Bans:</div>
                <ul className="text-xs ml-2">
                  {draft.guestCivs.bans.map((civ, index) => (
                    <li key={`preview-guest-ban-${index}`}>{civ.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        {/* Maps */}
        {uiConfig.positions?.maps?.visible !== false && (
          <div
            className={`absolute bg-ui-background bg-opacity-70 p-2 rounded-md border border-ui-primary ${uiConfig.fonts?.maps || 'font-game'} overflow-auto`}
            style={{
              left: uiConfig.positions?.maps?.x ?? 0,
              top: uiConfig.positions?.maps?.y ?? 0,
              width: uiConfig.positions?.maps?.width ?? 250,
              height: uiConfig.positions?.maps?.height ?? 200,
              zIndex: uiConfig.positions?.maps?.zIndex ?? 10,
              color: uiConfig.colors?.text ?? '#F5F5DC',
            }}
          >
            <div className="text-xs font-semibold text-aoe-gold">Maps</div>
            {draft.maps.picks.length > 0 && (
              <div className="mt-1">
                <div className="text-xs" style={{ color: uiConfig.colors?.pick ?? '#4CAF50' }}>Picks:</div>
                <ul className="text-xs ml-2">
                  {draft.maps.picks.map((map, index) => (
                    <li key={`preview-map-pick-${index}`}>{map.name}</li>
                  ))}
                </ul>
              </div>
            )}
            {draft.maps.bans.length > 0 && (
              <div className="mt-1">
                <div className="text-xs" style={{ color: uiConfig.colors?.ban ?? '#F44336' }}>Bans:</div>
                <ul className="text-xs ml-2">
                  {draft.maps.bans.map((map, index) => (
                    <li key={`preview-map-ban-${index}`}>{map.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        {/* Status */}
        {uiConfig.positions?.status?.visible !== false && (
          <div
            className={`absolute bg-ui-background bg-opacity-70 p-2 rounded-md border border-ui-primary ${uiConfig.fonts?.status || 'font-technical'} flex items-center justify-center`}
            style={{
              left: uiConfig.positions?.status?.x ?? 0,
              top: uiConfig.positions?.status?.y ?? 0,
              width: uiConfig.positions?.status?.width ?? 250,
              height: uiConfig.positions?.status?.height ?? 40,
              zIndex: uiConfig.positions?.status?.zIndex ?? 10,
              color: uiConfig.colors?.text ?? '#F5F5DC',
            }}
          >
            <span className="text-xs">
              {draft.status.charAt(0).toUpperCase() + draft.status.slice(1)}
            </span>
          </div>
        )}
        
        {/* Timer */}
        {uiConfig.positions?.timer?.visible !== false && (
          <div
            className={`absolute bg-ui-background bg-opacity-70 p-2 rounded-md border border-ui-primary ${uiConfig.fonts?.status || 'font-technical'} flex items-center justify-center`}
            style={{
              left: uiConfig.positions?.timer?.x ?? 0,
              top: uiConfig.positions?.timer?.y ?? 0,
              width: uiConfig.positions?.timer?.width ?? 250,
              height: uiConfig.positions?.timer?.height ?? 40,
              zIndex: uiConfig.positions?.timer?.zIndex ?? 10,
              color: uiConfig.colors?.text ?? '#F5F5DC',
            }}
          >
            <span className="text-xs">
              Turn {draft.currentTurn + 1} | {draft.turns[draft.currentTurn]?.player}
            </span>
          </div>
        )}
      </div>
      
      <div className="mt-2 text-center">
        <p className="text-sm text-aoe-light">
          This is a simplified preview. Open the Broadcast View for the full display.
        </p>
        <Link to="/broadcast" target="_blank" className="button-primary text-sm py-1 px-4 mt-2 inline-block">
          Open Broadcast View
        </Link>
      </div>
    </div>
  );
};

// Reset settings component
const ResetSettings: React.FC = () => {
  const { resetUIConfig } = useDraftStore();
  
  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all UI settings to defaults?')) {
      resetUIConfig();
    }
  };
  
  return (
    <div className="technical-container mb-4">
      <h3 className="text-lg font-medieval text-aoe-gold mb-3">Reset Settings</h3>
      
      <p className="text-sm text-aoe-light mb-4">
        Reset all UI settings to their default values. This will affect element positions, fonts, colors, and animations.
        This action cannot be undone.
      </p>
      
      <button className="button-secondary text-ban-light" onClick={handleReset}>
        Reset All Settings
      </button>
    </div>
  );
};

// AI Integration component
const AIIntegration: React.FC = () => {
  const { getDraftDataForAI } = useDraftStore();
  const [jsonData, setJsonData] = useState<string>('');
  
  useEffect(() => {
    // Update JSON data when draft changes
    const data = getDraftDataForAI();
    setJsonData(JSON.stringify(data, null, 2));
  }, [getDraftDataForAI, useDraftStore(state => state.draft)]); // Re-run when draft state changes
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonData);
    alert('JSON data copied to clipboard!');
  };
  
  return (
    <div className="technical-container mb-4">
      <h3 className="text-lg font-medieval text-aoe-gold mb-3">AI Integration</h3>
      
      <p className="text-sm text-aoe-light mb-4">
        This structured JSON data can be used for AI processing. Copy this data to integrate with external AI systems.
      </p>
      
      <div className="relative">
        <pre className="bg-aoe-dark p-3 rounded-md text-xs text-aoe-light overflow-auto max-h-60">
          {jsonData}
        </pre>
        <button
          className="absolute top-2 right-2 button-secondary text-xs py-1 px-2"
          onClick={copyToClipboard}
        >
          Copy
        </button>
      </div>
    </div>
  );
};

// Main component
const TechnicalInterface: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('draft');
  const { draft } = useDraftStore();
  
  const tabs = [
    { id: 'draft', label: 'Draft Data' },
    { id: 'customize', label: 'Customize' },
    { id: 'ai', label: 'AI Integration' },
  ];
  
  if (!draft) {
    return (
      <div className="container mx-auto py-6 px-4">
        <h2 className="text-2xl font-medieval text-aoe-gold mb-4">Technical Interface</h2>
        <p className="text-aoe-light">No draft data available. Please connect to a draft first.</p>
        <Link to="/" className="button-primary mt-4 inline-block">
          Go to Home
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 px-4">
      <h2 className="text-2xl font-medieval text-aoe-gold mb-4">Technical Interface</h2>
      
      <ConnectionStatus />
      
      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />
      
      {activeTab === 'draft' && (
        <div>
          <PlayerControls />
          <DraftDataDisplay />
        </div>
      )}
      
      {activeTab === 'customize' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <DraggableConfigurator />
              <FontSelector />
              <ColorSettings />
            </div>
            <div>
              <LivePreview />
              <ImageUploader />
              <AnimationSettings />
              <ResetSettings />
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'ai' && (
        <div>
          <AIIntegration />
        </div>
      )}
    </div>
  );
};

export default TechnicalInterface;
