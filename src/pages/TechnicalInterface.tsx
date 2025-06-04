import React, { useState, useEffect } from 'react';
// import { Link } from 'react-router-dom'; // Link is not used
import useDraftStore from '../store/draftStore';
import { ConnectionStatus, SavedPreset } from '../types/draft';
import '../styles/TechnicalInterface.css';

// Helper component to display a list of picks or bans
const DraftListDisplay: React.FC<{ title: string; items: string[]; type: 'pick' | 'ban' }> = ({ title, items, type }) => (
  <div className="data-section">
    <h4>{title}:</h4>
    <ul className={`list-disc ml-5 ${type === 'pick' ? 'text-green-400' : 'text-red-400'}`}>
      {items.length > 0 ? (
        items.map((item, index) => <li key={`${type}-${item}-${index}`}>{item}</li>)
      ) : (
        <li>(None)</li>
      )}
    </ul>
  </div>
);

// Main Technical Interface component
const TechnicalInterface = () => {
  const {
    civDraftId, mapDraftId,
    hostName, guestName, scores,
    civPicksHost = [], civBansHost = [], civPicksGuest = [], civBansGuest = [],
    mapPicksHost = [], mapBansHost = [], mapPicksGuest = [], mapBansGuest = [],
    mapPicksGlobal = [], mapBansGlobal = [],
    civDraftStatus, civDraftError, isLoadingCivDraft,
    mapDraftStatus, mapDraftError, isLoadingMapDraft,
    savedPresets,
    connectToDraft,
    setHostName, setGuestName,
    incrementScore, decrementScore, swapScores,
    swapCivPlayers, swapMapPlayers,
    saveCurrentAsPreset, loadPreset, deletePreset,
    // A new action will be needed for the "+ New Preset" logic, let's call it archiveAndResetSession
    // For now, we'll use saveCurrentAsPreset and then manually clear inputs as a placeholder.
    // This should be ideally a single atomic action in the store.
    disconnectDraft, // To reset parts of the state
  } = useDraftStore();

  const [civDraftIdInput, setCivDraftIdInput] = useState(civDraftId || '');
  const [mapDraftIdInput, setMapDraftIdInput] = useState(mapDraftId || '');

  const [editableHostName, setEditableHostName] = useState(hostName);
  const [editableGuestName, setEditableGuestName] = useState(guestName);

  useEffect(() => {
    setEditableHostName(hostName);
  }, [hostName]);

  useEffect(() => {
    setEditableGuestName(guestName);
  }, [guestName]);
  
  useEffect(() => { 
    setCivDraftIdInput(civDraftId || '');
    setMapDraftIdInput(mapDraftId || '');
  }, [civDraftId, mapDraftId]);


  const handleHostNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditableHostName(e.target.value);
  };
  const handleGuestNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditableGuestName(e.target.value);
  };

  const updateHostNameInStore = () => {
    setHostName(editableHostName);
  };
  const updateGuestNameInStore = () => {
    setGuestName(editableGuestName);
  };

  const handleCivDraftConnect = async () => {
    if (civDraftIdInput.trim()) {
      await connectToDraft(civDraftIdInput.trim(), 'civ');
    }
  };

  const handleMapDraftConnect = async () => {
    if (mapDraftIdInput.trim()) {
      await connectToDraft(mapDraftIdInput.trim(), 'map');
    }
  };
  
  const renderStatusIndicator = (status: ConnectionStatus, isLoading: boolean, error: string | null) => {
    let color = 'grey'; 
    if (isLoading) color = 'orange'; 
    else if (error) color = 'red'; 
    else if (status === 'connected') color = 'green'; 
    
    return <div className="status-circle" style={{ backgroundColor: color }} title={error || status}></div>;
  };

  const handleAddNewPreset = () => {
    // If there's an active draft (IDs are present), save it first
    if (civDraftId || mapDraftId) {
      const defaultName = `${hostName || 'P1'} vs ${guestName || 'P2'} (${new Date().toLocaleTimeString()})`;
      const presetName = prompt("Enter a name for the current session before starting a new one:", defaultName);
      if (presetName) {
        saveCurrentAsPreset(presetName);
      } else {
        // User cancelled, so don't proceed to reset
        return;
      }
    }
    // Reset current session in store (this needs a dedicated action ideally)
    disconnectDraft('civ'); // Resets civ part and potentially names if map part is also empty
    disconnectDraft('map'); // Resets map part
    setHostName('Player 1'); // Reset names in UI store
    setGuestName('Player 2'); // Reset names in UI store
    useDraftStore.setState({ scores: { host: 0, guest: 0 } }); // Reset scores

    setCivDraftIdInput(''); // Clear input fields
    setMapDraftIdInput('');
  };

  return (
    <div className="technical-interface main-dashboard-layout">
      
      <h1 className="main-title">AoE4 Draft Overlay Control Panel</h1>

      {/* Top Section Grid: Draft Inputs, Saved Presets, Player Info & Scores */}
      <div className="top-section-grid">
        {/* Column 1: Draft Inputs */}
        <div className="card draft-inputs-card">
          <h2 className="section-title" style={{fontSize: '1.2em', marginTop:'0', marginBottom:'10px'}}>Draft Inputs</h2>
          <div className="draft-input-group">
            <label htmlFor="civDraftIdInput">Civ Draft ID:</label>
            <input
              id="civDraftIdInput"
              type="text"
              value={civDraftIdInput}
              onChange={(e) => setCivDraftIdInput(e.target.value)}
              placeholder="Civ Draft ID"
              className="draft-id-input"
            />
            <button onClick={handleCivDraftConnect} disabled={isLoadingCivDraft} className="button-like import-button">
              {isLoadingCivDraft ? 'Connecting...' : 'Import Civ'}
            </button>
            {renderStatusIndicator(civDraftStatus, isLoadingCivDraft, civDraftError)}
          </div>
          <div className="draft-input-group">
            <label htmlFor="mapDraftIdInput">Map Draft ID:</label>
            <input
              id="mapDraftIdInput"
              type="text"
              value={mapDraftIdInput}
              onChange={(e) => setMapDraftIdInput(e.target.value)}
              placeholder="Map Draft ID"
              className="draft-id-input"
            />
            <button onClick={handleMapDraftConnect} disabled={isLoadingMapDraft} className="button-like import-button">
              {isLoadingMapDraft ? 'Connecting...' : 'Import Map'}
            </button>
            {renderStatusIndicator(mapDraftStatus, isLoadingMapDraft, mapDraftError)}
          </div>
        </div>

        {/* Column 2: Saved Presets */}
        <div className="card saved-presets-card">
          <h2 className="section-title" style={{fontSize: '1.2em', marginTop:'0', marginBottom:'10px'}}>Saved Presets</h2>
          <button onClick={handleAddNewPreset} className="button-like save-preset-button add-new-preset-button">
            + New Preset Session
          </button>
          <div className="saved-presets-list">
            {savedPresets.length === 0 && (!civDraftId && !mapDraftId) && 
              <p className="no-presets-message">No presets. Import a draft to save it or start a new session.</p>
            }
            {savedPresets.map((preset: SavedPreset) => (
              <div key={preset.id} className="preset-item">
                <button onClick={() => loadPreset(preset.id)} className="button-like preset-load-button">
                  {preset.name}
                </button>
                <button onClick={() => deletePreset(preset.id)} className="preset-delete-button" title="Delete preset">
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
        
        {/* Column 3: Player Info & Scores */}
        <div className="card player-scores-card">
           <h2 className="section-title" style={{fontSize: '1.2em', marginTop:'0', marginBottom:'10px', width: '100%', textAlign:'center'}}>Match Control</h2>
          <div className="player-name-input-group">
            <label htmlFor="hostNameInput">Player 1 (Host)</label>
            <input
              id="hostNameInput"
              type="text"
              value={editableHostName}
              onChange={handleHostNameChange}
              onBlur={updateHostNameInStore}
              onKeyPress={(e) => e.key === 'Enter' && updateHostNameInStore()}
              className="name-input"
            />
          </div>
          <div className="score-controls-group">
            <button onClick={() => decrementScore('host')} className="score-button button-like">-</button>
            <span className="score-display">{scores.host}</span>
            <button onClick={() => incrementScore('host')} className="score-button button-like">+</button>
          </div>
          <button onClick={swapScores} className="swap-scores-button button-like">Swap Scores</button>
          <div className="score-controls-group">
            <button onClick={() => decrementScore('guest')} className="score-button button-like">-</button>
            <span className="score-display">{scores.guest}</span>
            <button onClick={() => incrementScore('guest')} className="score-button button-like">+</button>
          </div>
          <div className="player-name-input-group">
            <label htmlFor="guestNameInput">Player 2 (Guest)</label>
            <input
              id="guestNameInput"
              type="text"
              value={editableGuestName}
              onChange={handleGuestNameChange}
              onBlur={updateGuestNameInStore}
              onKeyPress={(e) => e.key === 'Enter' && updateGuestNameInStore()}
              className="name-input"
            />
          </div>
        </div>
      </div>

      <div className="drafts-section-grid">
        <div className="card draft-display-card">
          <h2 className="section-title">Civilization Draft</h2>
          <div className="draft-header">
            <span>{hostName}</span>
            <button onClick={swapCivPlayers} className="button-like swap-players-button">Swap Civs</button>
            <span>{guestName}</span>
          </div>
          <div className="draft-columns">
            <div className="player-column">
              <DraftListDisplay title="Picks" items={civPicksHost} type="pick" />
              <DraftListDisplay title="Bans" items={civBansHost} type="ban" />
            </div>
            <div className="player-column">
              <DraftListDisplay title="Picks" items={civPicksGuest} type="pick" />
              <DraftListDisplay title="Bans" items={civBansGuest} type="ban" />
            </div>
          </div>
        </div>

        <div className="card draft-display-card">
          <h2 className="section-title">Map Draft</h2>
          <div className="draft-header">
            <span>{hostName}</span>
            <button onClick={swapMapPlayers} className="button-like swap-players-button">Swap Maps</button>
            <span>{guestName}</span>
          </div>
          <div className="draft-columns">
            <div className="player-column">
              <DraftListDisplay title="Picks" items={mapPicksHost} type="pick" />
              <DraftListDisplay title="Bans" items={mapBansHost} type="ban" />
            </div>
            <div className="player-column">
              <DraftListDisplay title="Picks" items={mapPicksGuest} type="pick" />
              <DraftListDisplay title="Bans" items={mapBansGuest} type="ban" />
            </div>
          </div>
          {(mapPicksGlobal.length > 0 || mapBansGlobal.length > 0) &&
            !mapPicksHost.length && !mapPicksGuest.length && !mapBansHost.length && !mapBansGuest.length && (
            <div className="global-maps-section">
              <h3 className="section-title-small">Global Map Draft:</h3>
              <DraftListDisplay title="Picks" items={mapPicksGlobal} type="pick" />
              <DraftListDisplay title="Bans" items={mapBansGlobal} type="ban" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TechnicalInterface;
