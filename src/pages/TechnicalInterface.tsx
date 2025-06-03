import React, { useState, useEffect } from 'react';
import useDraftStore from '../store/draftStore';
import { ConnectionStatus } from '../types/draft';
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
    civPicksHost = [], civBansHost = [], civPicksGuest = [], civBansGuest = [], // Default to empty arrays
    mapPicksHost = [], mapBansHost = [], mapPicksGuest = [], mapBansGuest = [], // Default to empty arrays
    mapPicksGlobal = [], mapBansGlobal = [], // Default to empty arrays
    civDraftStatus, civDraftError, isLoadingCivDraft,
    mapDraftStatus, mapDraftError, isLoadingMapDraft,
    connectToDraft,
    setHostName, setGuestName,
    incrementScore, decrementScore, swapScores,
    swapCivPlayers, swapMapPlayers,
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
    let color = 'grey'; // Default for disconnected
    if (isLoading) color = 'orange'; // Connecting
    else if (error) color = 'red'; // Error
    else if (status === 'connected') color = 'green'; // Connected
    
    return <div className="status-circle" style={{ backgroundColor: color }} title={error || status}></div>;
  };

  return (
    <div className="technical-interface main-dashboard-layout">
      <div style={{ 
          position: 'absolute', 
          top: '10px', 
          left: '10px', 
          fontSize: '1.2em', 
          color: '#ddd', 
          fontWeight: 'bold',
          zIndex: 1000 
        }}>
        v0.1.1 - Simplified Fetch Test
      </div>
      
      <h1 className="main-title">AoE Draft Overlay Control Panel</h1>

      {/* Card 1: Player Info & Scores */}
      <div className="card player-scores-card">
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

      {/* Card 2: Draft ID Inputs */}
      <div className="card draft-inputs-card">
        <div className="draft-input-group">
          <label htmlFor="civDraftIdInput">Civ Draft ID:</label>
          <input
            id="civDraftIdInput"
            type="text"
            value={civDraftIdInput}
            onChange={(e) => setCivDraftIdInput(e.target.value)}
            placeholder="Enter Civ Draft ID"
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
            placeholder="Enter Map Draft ID"
            className="draft-id-input"
          />
          <button onClick={handleMapDraftConnect} disabled={isLoadingMapDraft} className="button-like import-button">
            {isLoadingMapDraft ? 'Connecting...' : 'Import Map'}
          </button>
          {renderStatusIndicator(mapDraftStatus, isLoadingMapDraft, mapDraftError)}
        </div>
      </div>

      {/* Card 3: Civilization Draft Display */}
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

      {/* Card 4: Map Draft Display */}
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
         {/* Display Global Map Picks/Bans if they exist and per-player ones are empty */}
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
  );
};

export default TechnicalInterface;
