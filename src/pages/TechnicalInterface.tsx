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
    civPicksHost, civBansHost, civPicksGuest, civBansGuest,
    mapPicksHost, mapBansHost, mapPicksGuest, mapBansGuest,
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
  
  const renderStatus = (status: ConnectionStatus, error: string | null, isLoading: boolean) => {
    if (isLoading) return <span className="status-text loading">Connecting...</span>;
    if (error) return <span className="status-text error">Error: {error}</span>;
    if (status === 'connected') return <span className="status-text success">Connected</span>;
    return <span className="status-text">{status}</span>;
  };

  return (
    <div className="technical-interface main-dashboard-layout">
      {/* Top section: Player names and scores */}
      <div className="player-info-bar">
        <div className="player-name-input">
          <label htmlFor="hostNameInput">Left Player (Host):</label>
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
        <div className="score-controls">
          <button onClick={() => decrementScore('host')} className="score-button">-</button>
          <span className="score-display">{scores.host}</span>
          <button onClick={() => incrementScore('host')} className="score-button">+</button>
        </div>
        <button onClick={swapScores} className="swap-button button-like">Swap Scores</button>
        <div className="score-controls">
          <button onClick={() => decrementScore('guest')} className="score-button">-</button>
          <span className="score-display">{scores.guest}</span>
          <button onClick={() => incrementScore('guest')} className="score-button">+</button>
        </div>
        <div className="player-name-input">
          <label htmlFor="guestNameInput">Right Player (Guest):</label>
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

      {/* Middle section: Draft ID inputs */}
      <div className="draft-input-section">
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
            {isLoadingCivDraft ? 'Connecting...' : 'Import/Connect Civ'}
          </button>
          <div className="status-message">{renderStatus(civDraftStatus, civDraftError, isLoadingCivDraft)}</div>
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
            {isLoadingMapDraft ? 'Connecting...' : 'Import/Connect Map'}
          </button>
          <div className="status-message">{renderStatus(mapDraftStatus, mapDraftError, isLoadingMapDraft)}</div>
        </div>
      </div>

      {/* Civ Draft Display */}
      <div className="draft-display-section">
        <h2 className="section-title">Civilization Draft</h2>
        <div className="draft-header">
          <span>Name: {hostName}</span>
          <button onClick={swapCivPlayers} className="button-like swap-players-button">Swap Civ Players</button>
          <span>Name: {guestName}</span>
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

      {/* Map Draft Display */}
      <div className="draft-display-section">
        <h2 className="section-title">Map Draft</h2>
        <div className="draft-header">
          <span>Name: {hostName}</span>
          <button onClick={swapMapPlayers} className="button-like swap-players-button">Swap Map Players</button>
          <span>Name: {guestName}</span>
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
            <h4>Global Map Draft:</h4>
            <DraftListDisplay title="Picks" items={mapPicksGlobal} type="pick" />
            <DraftListDisplay title="Bans" items={mapBansGlobal} type="ban" />
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnicalInterface;
