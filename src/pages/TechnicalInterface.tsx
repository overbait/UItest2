import React, { useState } from 'react';
// import { Link } from 'react-router-dom'; // Link is not used in simplified version
import useDraftStore from '../store/draftStore';
import { ConnectionStatus as ConnectionStatusType, DraftState } from '../types/draft';
import '../styles/TechnicalInterface.css'; 

// Simplified Connection Status Display
const ConnectionStatusDisplay: React.FC<{
  connectionStatus: ConnectionStatusType;
  connectionError: string | null;
  draftId: string | null;
  onReconnect: () => void;
}> = ({ connectionStatus, connectionError, draftId, onReconnect }) => {
  return (
    <div className="connection-status simplified-connection-status">
      <div className="status-indicator">
        <div className={`status-dot ${connectionStatus}`}></div>
        <span>Status: {connectionStatus}</span>
      </div>
      {connectionError && <div className="error-message">Error: {connectionError}</div>}
      {draftId && connectionStatus === 'connected' && (
        <div className="draft-info">
          <span>Connected to draft: {draftId}</span>
        </div>
      )}
      {(connectionStatus === 'disconnected' || connectionStatus === 'error') && draftId && (
         <button 
            onClick={onReconnect} 
            className="reconnect-button button-like"
          >
            Reconnect
          </button>
      )}
    </div>
  );
};

// Simplified Draft Data Display
const CoreDraftDisplay: React.FC<{ draft: DraftState | null }> = ({ draft }) => {
  if (!draft) {
    return null; 
  }

  const renderList = (items: string[], type: 'pick' | 'ban') => (
    <ul className={`list-disc ml-5 ${type === 'pick' ? 'text-green-400' : 'text-red-400'}`}>
      {items.length > 0 ? (
        items.map((item, index) => <li key={`${type}-${item}-${index}`}>{item}</li>)
      ) : (
        <li>(None)</li>
      )}
    </ul>
  );

  return (
    <div className="core-draft-display">
      <h2 className="section-title">Draft Overview (ID: {draft.id})</h2>
      <div className="status-info">
        Status: <span className="font-semibold">{draft.status}</span>
        {draft.currentTurnPlayer && draft.currentTurnPlayer !== 'none' && (
          <span> | Current Turn: <span className="font-semibold">{draft.currentTurnPlayer} ({draft.currentAction})</span></span>
        )}
      </div>

      <div className="players-data-grid">
        {/* Host Player Data */}
        <div className="player-column">
          <h3 className="player-name-title">{draft.hostName || 'Host'}</h3>
          <div className="data-section">
            <h4>Civilization Picks:</h4>
            {renderList(draft.hostCivPicks, 'pick')}
          </div>
          <div className="data-section">
            <h4>Civilization Bans:</h4>
            {renderList(draft.hostCivBans, 'ban')}
          </div>
        </div>

        {/* Guest Player Data */}
        <div className="player-column">
          <h3 className="player-name-title">{draft.guestName || 'Guest'}</h3>
          <div className="data-section">
            <h4>Civilization Picks:</h4>
            {renderList(draft.guestCivPicks, 'pick')}
          </div>
          <div className="data-section">
            <h4>Civilization Bans:</h4>
            {renderList(draft.guestCivBans, 'ban')}
          </div>
        </div>
      </div>

      <div className="maps-data-section">
        <h3 className="section-title-small">Map Draft</h3>
        <div className="maps-columns">
            <div className="data-section">
                <h4>Map Picks:</h4>
                {renderList(draft.mapPicks, 'pick')}
            </div>
            <div className="data-section">
                <h4>Map Bans:</h4>
                {renderList(draft.mapBans, 'ban')}
            </div>
        </div>
      </div>
    </div>
  );
};


// Main Simplified Technical Interface component
const TechnicalInterface = () => {
  const { 
    draft, 
    draftId, 
    connectionStatus, 
    connectionError, 
    connectToDraft,
    disconnectFromDraft,
    isLoading 
  } = useDraftStore();

  const [draftIdInput, setDraftIdInput] = useState('');

  const handleConnectToDraft = async () => {
    if (!draftIdInput.trim()) {
      alert('Please enter a draft ID or URL');
      return;
    }
    await connectToDraft(draftIdInput.trim());
  };

  const handleDisconnect = () => {
    disconnectFromDraft();
    setDraftIdInput(''); 
  };

  const handleReconnect = () => {
    if (draftId) { 
      connectToDraft(draftId);
    } else if (draftIdInput.trim()){ 
        connectToDraft(draftIdInput.trim());
    } else {
        alert("No Draft ID available to reconnect.");
    }
  };

  return (
    <div className="technical-interface simplified-interface">
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
      <div className="header">
        <h1>AoE2 Draft Data Viewer</h1>
        <div className="draft-connection">
          <input
            type="text"
            value={draftIdInput}
            onChange={(e) => setDraftIdInput(e.target.value)}
            placeholder="Enter draft ID (e.g., gSQZO)"
            className="draft-id-input"
          />
          {connectionStatus !== 'connected' ? (
            <button 
              onClick={handleConnectToDraft} 
              disabled={connectionStatus === 'connecting'}
              className="connect-button button-like"
            >
              {connectionStatus === 'connecting' ? 'Connecting...' : 'Load Draft'}
            </button>
          ) : (
            <button onClick={handleDisconnect} className="disconnect-button button-like">
              Disconnect
            </button>
          )}
        </div>
      </div>

      <ConnectionStatusDisplay
        connectionStatus={connectionStatus}
        connectionError={connectionError}
        draftId={draftId}
        onReconnect={handleReconnect}
      />

      {isLoading && <div className="loading-message">Loading draft data...</div>}
      
      {!isLoading && connectionStatus === 'connected' && draft && (
        <CoreDraftDisplay draft={draft} />
      )}
      
      {!isLoading && connectionStatus === 'connected' && !draft && (
         <div className="placeholder-message">
           Draft data loaded but seems empty or incomplete. Check console for details.
         </div>
      )}

      {!isLoading && connectionStatus !== 'connected' && connectionStatus !== 'connecting' && (
         <div className="placeholder-message">
           Please enter a draft ID and click "Load Draft" to view data.
         </div>
      )}
    </div>
  );
};

export default TechnicalInterface;
