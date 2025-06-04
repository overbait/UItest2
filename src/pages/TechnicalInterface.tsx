import React, { useState, useEffect, useMemo } from 'react';
import useDraftStore from '../store/draftStore';
import { ConnectionStatus, SavedPreset, CombinedDraftState } from '../types/draft';
import '../styles/TechnicalInterface.css';

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
    boxSeriesFormat, boxSeriesGames,
    activePresetId,
    connectToDraft,
    setHostName, setGuestName,
    incrementScore, decrementScore,
    swapCivPlayers, swapMapPlayers, // Re-added for completeness, will be removed from UI
    saveCurrentAsPreset, loadPreset, deletePreset,
    _resetCurrentSessionState,
    setBoxSeriesFormat, updateBoxSeriesGame, setGameWinner,
  } = useDraftStore();

  const [civDraftIdInput, setCivDraftIdInput] = useState(civDraftId || '');
  const [mapDraftIdInput, setMapDraftIdInput] = useState(mapDraftId || '');

  const [editableHostName, setEditableHostName] = useState(hostName);
  const [editableGuestName, setEditableGuestName] = useState(guestName);

  useEffect(() => { setEditableHostName(hostName); }, [hostName]);
  useEffect(() => { setEditableGuestName(guestName); }, [guestName]);
  useEffect(() => { setCivDraftIdInput(civDraftId || ''); setMapDraftIdInput(mapDraftId || ''); }, [civDraftId, mapDraftId]);

  const handleHostNameChange = (e: React.ChangeEvent<HTMLInputElement>) => setEditableHostName(e.target.value);
  const handleGuestNameChange = (e: React.ChangeEvent<HTMLInputElement>) => setEditableGuestName(e.target.value);
  const updateHostNameInStore = () => setHostName(editableHostName);
  const updateGuestNameInStore = () => setGuestName(editableGuestName);

  const handleCivDraftConnect = async () => { if (civDraftIdInput.trim()) await connectToDraft(civDraftIdInput.trim(), 'civ'); };
  const handleMapDraftConnect = async () => { if (mapDraftIdInput.trim()) await connectToDraft(mapDraftIdInput.trim(), 'map'); };

  const renderStatusIndicator = (status: ConnectionStatus, isLoading: boolean, error: string | null) => {
    let color = 'grey';
    if (isLoading) color = 'orange';
    else if (error) color = 'red';
    else if (status === 'connected') color = 'green';
    return <div className="status-circle" style={{ backgroundColor: color }} title={error || status}></div>;
  };

  const handleAddNewPresetAndSaveCurrent = () => {
    const storeState = useDraftStore.getState();
    // Only prompt to save if there's active data AND it's not already matching the active preset (i.e., it's dirty)
    if ((storeState.civDraftId || storeState.mapDraftId) && storeState.activePresetId === null) {
      const defaultName = `${storeState.hostName || 'P1'} vs ${storeState.guestName || 'P2'} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
      const presetName = prompt("Name for current session (leave empty to discard current changes before starting new):", defaultName);
      if (presetName) { // If user provides a name (or confirms default by not emptying it)
        saveCurrentAsPreset(presetName);
      } else if (presetName === "") { // User explicitly cleared the name, wants to discard
         console.log("Discarding current session changes.");
      } else { // User cancelled the prompt
        return; 
      }
    }
    _resetCurrentSessionState();
  };
  
  const handleDirectReset = () => {
      if (window.confirm("Are you sure you want to reset the current session? Unsaved changes will be lost.")) {
          _resetCurrentSessionState();
      }
  }

  const handleDeletePresetAndReset = (presetIdToDelete: string) => deletePreset(presetIdToDelete);

  const isCurrentStateDirtyForPreset = (preset: SavedPreset): boolean => {
    if (activePresetId !== preset.id) return false; 
    const currentState = useDraftStore.getState();
    let dirty = false;
    if (currentState.hostName !== preset.hostName) dirty = true;
    if (currentState.guestName !== preset.guestName) dirty = true;
    if (currentState.scores.host !== preset.scores.host || currentState.scores.guest !== preset.scores.guest) dirty = true;
    if (currentState.civDraftId !== preset.civDraftId) dirty = true;
    if (currentState.mapDraftId !== preset.mapDraftId) dirty = true;
    if (currentState.boxSeriesFormat !== preset.boxSeriesFormat) dirty = true;
    if (JSON.stringify(currentState.boxSeriesGames) !== JSON.stringify(preset.boxSeriesGames)) dirty = true;
    
    // Log for debugging
    // if (dirty) console.log(`Preset "${preset.name}" is active and dirty.`);
    // else if (activePresetId === preset.id) console.log(`Preset "${preset.name}" is active but not dirty.`);

    return dirty;
  };
  
  const handleUpdatePreset = (presetName: string) => {
    console.log(`Update button clicked for: ${presetName}, attempting to save...`);
    saveCurrentAsPreset(presetName); 
  };

  const availableMapsForBoX = useMemo(() => Array.from(new Set([...mapPicksHost, ...mapPicksGuest, ...mapPicksGlobal])).filter(Boolean), [mapPicksHost, mapPicksGuest, mapPicksGlobal]);
  const availableHostCivsForBoX = useMemo(() => [...new Set(civPicksHost)].filter(Boolean), [civPicksHost]);
  const availableGuestCivsForBoX = useMemo(() => [...new Set(civPicksGuest)].filter(Boolean), [civPicksGuest]);

  return (
    <div className="technical-interface main-dashboard-layout">
      <h1 className="main-title">AoE4 Draft Overlay Control Panel</h1>
      <div className="top-section-grid">
        <div className="card draft-inputs-card">
          <h2 className="section-title" style={{fontSize: '1.2em', marginTop:'0', marginBottom:'10px'}}>Draft Inputs</h2>
          <div className="draft-input-group">
            <label htmlFor="civDraftIdInput">Civ Draft ID:</label>
            <input id="civDraftIdInput" type="text" value={civDraftIdInput} onChange={(e) => setCivDraftIdInput(e.target.value)} placeholder="Civ Draft ID" className="draft-id-input"/>
            <button onClick={handleCivDraftConnect} disabled={isLoadingCivDraft} className="button-like import-button">
              {isLoadingCivDraft ? 'Connecting...' : 'Import Civ'}
            </button>
            {renderStatusIndicator(civDraftStatus, isLoadingCivDraft, civDraftError)}
          </div>
          <div className="draft-input-group">
            <label htmlFor="mapDraftIdInput">Map Draft ID:</label>
            <input id="mapDraftIdInput" type="text" value={mapDraftIdInput} onChange={(e) => setMapDraftIdInput(e.target.value)} placeholder="Map Draft ID" className="draft-id-input"/>
            <button onClick={handleMapDraftConnect} disabled={isLoadingMapDraft} className="button-like import-button">
              {isLoadingMapDraft ? 'Connecting...' : 'Import Map'}
            </button>
            {renderStatusIndicator(mapDraftStatus, isLoadingMapDraft, mapDraftError)}
          </div>
        </div>

        <div className="card saved-presets-card">
          <div className="presets-header">
            <h2 className="section-title" style={{fontSize: '1.2em', marginTop:'0', marginBottom:'0'}}>Saved Presets</h2>
            <div className="preset-actions-buttons">
              <button onClick={handleAddNewPresetAndSaveCurrent} className="button-like add-new-preset-button-plus" title="Save Current & Start New Session">+</button>
              <button onClick={handleDirectReset} className="button-like reset-session-button" title="Reset Current Session">Reset</button>
            </div>
          </div>
          <div className="saved-presets-list">
            {savedPresets.length === 0 && <p className="no-presets-message">No presets. Import drafts then click "+" to save current session and start new.</p>}
            {savedPresets.map((preset: SavedPreset) => {
              const isDirty = isCurrentStateDirtyForPreset(preset);
              return (
                <div key={preset.id} className="preset-item">
                  <button onClick={() => loadPreset(preset.id)} className={`button-like preset-load-button ${preset.id === activePresetId && !isDirty ? 'active-preset' : ''} ${isDirty ? 'dirty-preset' : ''}`}>
                    {preset.name}
                  </button>
                  {isDirty && (
                    <button onClick={() => handleUpdatePreset(preset.name)} className="button-like preset-update-button">
                      Update
                    </button>
                  )}
                  <button onClick={() => handleDeletePresetAndReset(preset.id)} className="preset-delete-button" title="Delete preset">&times;</button>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="card player-scores-card">
          <h2 className="section-title" style={{fontSize: '1.2em', marginTop:'0', marginBottom:'10px', width: '100%', textAlign:'center'}}>Match Control</h2>
           <div className="player-scores-horizontal-layout">
              <div className="player-name-input-group">
                <label htmlFor="hostNameInput">Player 1 (Host)</label>
                <input id="hostNameInput" type="text" value={editableHostName} onChange={handleHostNameChange} onBlur={updateHostNameInStore} onKeyPress={(e) => e.key === 'Enter' && updateHostNameInStore()} className="name-input"/>
              </div>
              <div className="score-controls-group">
                <button onClick={() => decrementScore('host')} className="score-button button-like">-</button>
                <span className="score-display">{scores.host}</span>
                <button onClick={() => incrementScore('host')} className="score-button button-like">+</button>
              </div>
               {/* Swap Scores button removed */}
              <div className="score-controls-group">
                <button onClick={() => decrementScore('guest')} className="score-button button-like">-</button>
                <span className="score-display">{scores.guest}</span>
                <button onClick={() => incrementScore('guest')} className="score-button button-like">+</button>
              </div>
              <div className="player-name-input-group">
                <label htmlFor="guestNameInput">Player 2 (Guest)</label>
                <input id="guestNameInput" type="text" value={editableGuestName} onChange={handleGuestNameChange} onBlur={updateGuestNameInStore} onKeyPress={(e) => e.key === 'Enter' && updateGuestNameInStore()} className="name-input"/>
              </div>
           </div>
        </div>
      </div>

      <div className="drafts-section-grid">
        <div className="card draft-display-card civ-draft-card">
          <h2 className="section-title">Civilization Draft</h2>
          <div className="draft-header">
            <span>{hostName}</span>
             {/* Swap Civ Players button removed */}
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

        <div className="card draft-display-card map-draft-card">
          <h2 className="section-title">Map Draft</h2>
          <div className="draft-header">
            <span>{hostName}</span>
            {/* Swap Map Players button removed */}
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
              <h3 className="section-title-small" style={{ fontFamily: 'var(--font-medieval)', color: 'var(--aoe-gold-accent)', fontSize: '1.1em' }}>Global Map Draft:</h3>
              <DraftListDisplay title="Picks" items={mapPicksGlobal} type="pick" />
              <DraftListDisplay title="Bans" items={mapBansGlobal} type="ban" />
            </div>
          )}
        </div>
        
        <div className="card box-series-card">
          <h2 className="section-title">BoX Series Overview</h2>
          <div className="box-format-selector">
            <label htmlFor="boxFormat">Series Format:</label>
            <select id="boxFormat" value={boxSeriesFormat || ''} onChange={(e) => setBoxSeriesFormat(e.target.value as typeof boxSeriesFormat)} className="button-like">
              <option value="">Select Format</option>
              <option value="bo1">Bo1</option>
              <option value="bo3">Bo3</option>
              <option value="bo5">Bo5</option>
              <option value="bo7">Bo7</option>
            </select>
          </div>

          {boxSeriesFormat && boxSeriesGames.length > 0 && (
            <div className="box-games-list">
              {boxSeriesGames.map((game, index) => (
                <div key={index} className="box-game-slot">
                  <h4 className="game-slot-title">Game {index + 1}</h4>
                  <div className="game-slot-selectors">
                    <div className="selector-group">
                      <label htmlFor={`box-host-civ-${index}`} className={game.winner === 'host' ? 'text-winner' : game.winner === 'guest' ? 'text-loser' : ''}>
                        {hostName} Civ:
                      </label>
                      <div className="civ-selection-group">
                        <select
                          id={`box-host-civ-${index}`}
                          value={game.hostCiv || ''}
                          onChange={(e) => updateBoxSeriesGame(index, 'hostCiv', e.target.value || null)}
                          className={`button-like ${game.winner === 'host' ? 'select-winner' : game.winner === 'guest' ? 'select-loser' : ''}`}
                        >
                          <option value="">- Select Civ -</option>
                          {availableHostCivsForBoX.map(civ => <option key={`h-civ-${index}-${civ}`} value={civ}>{civ}</option>)}
                        </select>
                        <button 
                          className={`win-button ${game.winner === 'host' ? 'active' : ''}`} 
                          onClick={() => setGameWinner(index, game.winner === 'host' ? null : 'host')}
                          title={`Mark ${hostName} as winner for Game ${index + 1}`}
                        >W</button>
                      </div>
                    </div>
                     <div className="selector-group map-selector-group">
                      <label htmlFor={`box-map-${index}`}>Map:</label>
                      <select id={`box-map-${index}`} value={game.map || ''} onChange={(e) => updateBoxSeriesGame(index, 'map', e.target.value || null)} className="button-like">
                        <option value="">- Select Map -</option>
                        {availableMapsForBoX.map(map => <option key={`map-${index}-${map}`} value={map}>{map}</option>)}
                      </select>
                    </div>
                    <div className="selector-group">
                       <label htmlFor={`box-guest-civ-${index}`} className={game.winner === 'guest' ? 'text-winner' : game.winner === 'host' ? 'text-loser' : ''}>
                        {guestName} Civ:
                      </label>
                      <div className="civ-selection-group">
                        <select
                          id={`box-guest-civ-${index}`}
                          value={game.guestCiv || ''}
                          onChange={(e) => updateBoxSeriesGame(index, 'guestCiv', e.target.value || null)}
                          className={`button-like ${game.winner === 'guest' ? 'select-winner' : game.winner === 'host' ? 'select-loser' : ''}`}
                        >
                          <option value="">- Select Civ -</option>
                          {availableGuestCivsForBoX.map(civ => <option key={`g-civ-${index}-${civ}`} value={civ}>{civ}</option>)}
                        </select>
                        <button 
                          className={`win-button ${game.winner === 'guest' ? 'active' : ''}`}
                          onClick={() => setGameWinner(index, game.winner === 'guest' ? null : 'guest')}
                          title={`Mark ${guestName} as winner for Game ${index + 1}`}
                        >W</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TechnicalInterface;
