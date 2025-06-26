import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    // isPresetDirty, // This state is implicitly handled by activePresetId === null when changes occur
    connectToDraft,
    setHostName, setGuestName,
    hostColor, setHostColor,
    guestColor, setGuestColor,
    hostFlag, setHostFlag, // Player flag state and setters
    guestFlag, setGuestFlag, // Player flag state and setters
    incrementScore, decrementScore, switchPlayerSides,
    saveCurrentAsPreset, loadPreset, deletePreset,
    _resetCurrentSessionState,
    setBoxSeriesFormat, updateBoxSeriesGame, setGameWinner,
    toggleBoxSeriesGameVisibility, // Added new action
  } = useDraftStore();

  const playerColors = ['#00C4FF', '#FF9500', '#A64DFF', '#1E3A8A', '#FF0000', '#FF69B4', '#FFFF00', '#00FF00'];

  interface PlayerColorPickerProps {
    currentPlayerColor: string | null;
    onSetColor: (color: string | null) => void;
  }

  const PlayerColorPicker = React.memo<PlayerColorPickerProps>(({ currentPlayerColor, onSetColor }) => {
    // console.log(`Rendering PlayerColorPicker for: ${onSetColor === setHostColor ? 'Host' : 'Guest'}`); // Optional: for debugging memoization
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px', marginBottom: '8px' }}>
        {playerColors.map(color => (
          <div
            key={color}
            style={{
              backgroundColor: color,
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              border: '1px solid #ccc',
              cursor: 'pointer',
              margin: '0 3px',
              display: 'inline-block',
              boxShadow: currentPlayerColor === color ? `0 0 5px 1px ${color}` : 'none',
            }}
            onClick={() => {
              const isCurrentlySelected = currentPlayerColor === color;
              const newColorToSet = isCurrentlySelected ? null : color;
              // console.log('[PlayerColorPicker] Clicked color:', color); // Reduced logging as per plan
              // console.log('[PlayerColorPicker] Setting color to:', newColorToSet); // Reduced logging as per plan
              onSetColor(newColorToSet);
            }}
          />
        ))}
      </div>
    );
  });

  const [civDraftIdInput, setCivDraftIdInput] = useState(civDraftId || '');
  const [mapDraftIdInput, setMapDraftIdInput] = useState(mapDraftId || '');

  const [editingMapIndex, setEditingMapIndex] = useState<number | null>(null);
  const [editingMapValue, setEditingMapValue] = useState<string>("");
  const [manuallyAddedMaps, setManuallyAddedMaps] = useState<string[]>([]);

  const [editableHostName, setEditableHostName] = useState(hostName);
  const [editableGuestName, setEditableGuestName] = useState(guestName);

  const [playerCountryMap, setPlayerCountryMap] = useState<Map<string, string>>(new Map());
  const [availableFlags, setAvailableFlags] = useState<string[]>([]);

  const [flagDropdownAnchorEl, setFlagDropdownAnchorEl] = useState<HTMLElement | null>(null);
  const [isFlagDropdownOpen, setIsFlagDropdownOpen] = useState<boolean>(false);
  const [editingPlayerFlagFor, setEditingPlayerFlagFor] = useState<'host' | 'guest' | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

const PLAYER_FLAG_MAPPINGS_KEY = 'playerFlagMappings';
const COUNTRY_PLAYERS_FILE_PATH = 'assets/countryflags/countryplayers.txt';

  useEffect(() => {
    (window as any).IS_TECHNICAL_INTERFACE = true;
    return () => {
      (window as any).IS_TECHNICAL_INTERFACE = false;
    };
  }, []);

  useEffect(() => { setEditableHostName(hostName); }, [hostName]);
  useEffect(() => { setEditableGuestName(guestName); }, [guestName]);
  useEffect(() => { setCivDraftIdInput(civDraftId || ''); setMapDraftIdInput(mapDraftId || ''); }, [civDraftId, mapDraftId]);

  // Effect to load mappings and available flags on mount
  useEffect(() => {
    // Load Player-Country Mappings
    let initialMap = new Map<string, string>();
    try {
      const storedMappingsJson = localStorage.getItem(PLAYER_FLAG_MAPPINGS_KEY);
      if (storedMappingsJson) {
        const storedMappingsObj = JSON.parse(storedMappingsJson);
        initialMap = new Map(Object.entries(storedMappingsObj));
        console.log('[FlagPersistence] Loaded playerFlagMappings from localStorage:', initialMap);
        setPlayerCountryMap(initialMap); // Set state if loaded from LS
      } else {
        console.log('[FlagPersistence] No playerFlagMappings found in localStorage. Attempting to seed from file.');
        // Optional: Seed from countryplayers.txt if localStorage is empty (first time use)
        fetch(COUNTRY_PLAYERS_FILE_PATH) // COUNTRY_PLAYERS_FILE_PATH should be defined
          .then(response => {
            if (!response.ok) {
              if (response.status === 404) console.warn(`[FlagPersistence] Seed file ${COUNTRY_PLAYERS_FILE_PATH} not found.`);
              else console.error(`[FlagPersistence] Error fetching seed file ${COUNTRY_PLAYERS_FILE_PATH}: ${response.statusText}`);
              return ""; // Treat as empty if error or not found
            }
            return response.text();
          })
          .then(text => {
            if (text && text.trim() !== "") {
              const lines = text.split('\n').filter(line => line.trim() !== '');
              lines.forEach(line => {
                const parts = line.split('_');
                if (parts.length >= 2) {
                  const cCode = parts.pop()!;
                  const nick = parts.join('_');
                  if (nick.trim() !== '') {
                    initialMap.set(nick, cCode.toLowerCase());
                  }
                }
              });
              if (initialMap.size > 0) {
                console.log('[FlagPersistence] Seeded playerCountryMap from file:', initialMap);
                savePlayerCountryMapToLocalStorage(initialMap); // Save the seeded map
              }
            }
            setPlayerCountryMap(new Map(initialMap)); // Set state after potential seed
          })
          .catch(error => {
            console.error(`[FlagPersistence] Error seeding from ${COUNTRY_PLAYERS_FILE_PATH}.`, error);
            setPlayerCountryMap(new Map(initialMap)); // Still set the map (which would be empty if seeding failed from start)
          });
        // No early return here, setPlayerCountryMap will be called by the fetch promise chain.
      }
    } catch (e) {
      console.warn('[FlagPersistence] Error parsing playerFlagMappings from localStorage. Initializing as empty.', e);
      initialMap = new Map<string, string>();
      setPlayerCountryMap(initialMap); // Set to empty map if LS parsing fails
    }

    // Load available flags (this logic should remain from previous steps, e.g., dynamic or fallback)
     const loadFlags = async () => {
      try {
        // This is a placeholder for how the subtask might get directory listing.
        // The actual mechanism depends on the subtask execution environment.
        // If this mechanism isn't available, the catch block will use the manual list.
        // Assuming listFiles is globally available or polyfilled by the subtask environment
        const files = await (window as any).listFiles('assets/countryflags/');
        const flagCodes = files
          .filter((file: string) => file.endsWith('.png') && file !== '.gitkeep' && file !== 'countryplayers.txt')
          .map((file: string) => file.replace('.png', ''))
          .sort();
        if (flagCodes.length > 0) {
          setAvailableFlags(flagCodes);
          // console.log('Dynamically loaded available flags:', flagCodes);
        } else {
          throw new Error("No flags found via dynamic listing or empty list returned.");
        }
      } catch (error) {
        console.warn("Dynamic flag listing failed or not available, using manual fallback list. Error:", error);
        const manualFlagFiles = [
          "ad.png", "ae.png", "af.png", "ag.png", "ai.png", "al.png", "am.png", "ao.png", "aq.png", "ar.png", "as.png", "at.png", "au.png", "aw.png", "ax.png", "az.png",
          "ba.png", "bb.png", "bd.png", "be.png", "bf.png", "bg.png", "bh.png", "bi.png", "bj.png", "bl.png", "bm.png", "bn.png", "bo.png", "bq.png", "br.png", "bs.png", "bt.png", "bv.png", "bw.png", "by.png", "bz.png",
          "ca.png", "cc.png", "cd.png", "cf.png", "cg.png", "ch.png", "ci.png", "ck.png", "cl.png", "cm.png", "cn.png", "co.png", "cp.png", "cr.png", "cs.png", "cu.png", "cv.png", "cw.png", "cx.png", "cy.png", "cz.png",
          "de.png", "dj.png", "dk.png", "dm.png", "do.png", "dz.png", "ec.png", "ee.png", "eg.png", "eh.png", "er.png", "es.png", "et.png", "eu.png",
          "fi.png", "fj.png", "fk.png", "fl.png", "fm.png", "fo.png", "fr.png",
          "ga.png", "gb.png", "gb-eng.png", "gb-nir.png", "gb-sct.png", "gb-wls.png", "gd.png", "ge.png", "gf.png", "gg.png", "gh.png", "gi.png", "gl.png", "gm.png", "gn.png", "go.png", "gp.png", "gq.png", "gr.png", "gs.png", "gt.png", "gu.png", "gw.png", "gy.png",
          "hk.png", "hm.png", "hn.png", "hr.png", "ht.png", "hu.png",
          "ic.png", "id.png", "ie.png", "il.png", "im.png", "in.png", "io.png", "iq.png", "ir.png", "is.png", "it.png",
          "je.png", "jm.png", "jn.png", "jo.png", "jp.png",
          "ke.png", "kg.png", "kh.png", "ki.png", "km.png", "kn.png", "kp.png", "kr.png", "kw.png", "ky.png", "kz.png",
          "la.png", "lb.png", "lc.png", "li.png", "lk.png", "lr.png", "ls.png", "lt.png", "lu.png", "lv.png", "ly.png",
          "ma.png", "mc.png", "md.png", "me.png", "mf.png", "mg.png", "mh.png", "mi.png", "mk.png", "ml.png", "mm.png", "mn.png", "mo.png", "mp.png", "mq.png", "mr.png", "ms.png", "mt.png", "mu.png", "mv.png", "mw.png", "mx.png", "my.png", "mz.png",
          "na.png", "nc.png", "ne.png", "nf.png", "ng.png", "ni.png", "nl.png", "no.png", "np.png", "nr.png", "nu.png", "nz.png",
          "om.png", "pa.png", "pe.png", "pf.png", "pg.png", "ph.png", "pk.png", "pl.png", "pm.png", "pn.png", "pr.png", "ps.png", "pt.png", "pw.png", "py.png", "qa.png",
          "re.png", "ro.png", "rs.png", "ru.png", "rw.png",
          "sa.png", "sb.png", "sc.png", "sd.png", "se.png", "sf.png", "sg.png", "sh.png", "si.png", "sj.png", "sk.png", "sl.png", "sm.png", "sn.png", "so.png", "sr.png", "ss.png", "st.png", "sv.png", "sx.png", "sy.png", "sz.png",
          "ta.png", "tc.png", "td.png", "tf.png", "tg.png", "th.png", "tj.png", "tk.png", "tl.png", "tm.png", "tn.png", "to.png", "tr.png", "tt.png", "tv.png", "tw.png", "tz.png",
          "ua.png", "ug.png", "um.png", "un.png", "us.png", "uy.png", "uz.png",
          "va.png", "vc.png", "ve.png", "vg.png", "vi.png", "vn.png", "vu.png",
          "wf.png", "ws.png",
          "xk.png",
          "ye.png", "yt.png",
          "za.png", "zm.png", "zw.png"
        ];
        const flagCodes = manualFlagFiles.map(file => file.replace('.png', '')).sort();
        setAvailableFlags(flagCodes);
        // console.log('Manually set available flags due to dynamic listing failure or placeholder.');
      }
    };
    loadFlags();

  }, []); // Empty dependency array ensures this runs once on mount

  // Effect for Host Flag Loading
  useEffect(() => {
    if (hostName && playerCountryMap.has(hostName) && hostFlag === null) {
      const autoFlag = playerCountryMap.get(hostName);
      if (autoFlag) {
        // console.log(`Auto-setting host flag for ${hostName} to ${autoFlag}`);
        setHostFlag(autoFlag);
      }
    }
  }, [hostName, playerCountryMap, hostFlag, setHostFlag]);

  // Effect for Guest Flag Loading
  useEffect(() => {
    if (guestName && playerCountryMap.has(guestName) && guestFlag === null) {
      const autoFlag = playerCountryMap.get(guestName);
      if (autoFlag) {
        // console.log(`Auto-setting guest flag for ${guestName} to ${autoFlag}`);
        setGuestFlag(autoFlag);
      }
    }
  }, [guestName, playerCountryMap, guestFlag, setGuestFlag]); // Ensuring this one is correct, was potentially malformed


  // Logging for savedPresets and activePresetId
  // console.log('LOGAOEINFO: [TechnicalInterface Render] savedPresets from store:', savedPresets, 'Active Preset ID:', activePresetId);

  const savePlayerCountryMapToLocalStorage = (mapToSave: Map<string, string>) => {
    try {
      const objToStore = Object.fromEntries(mapToSave);
      localStorage.setItem(PLAYER_FLAG_MAPPINGS_KEY, JSON.stringify(objToStore));
      console.log('[FlagPersistence] Saved playerFlagMappings to localStorage:', mapToSave);
    } catch (e) {
      console.warn('[FlagPersistence] Failed to save player flag mappings to localStorage', e);
    }
  };

  const handleFlagSelection = (selectedCode: string | null) => { // No longer needs to be async
    console.log('[FlagPersistence] handleFlagSelection. Player:', editingPlayerFlagFor, 'Code:', selectedCode);
    if (!editingPlayerFlagFor) return;
    const currentNickname = editingPlayerFlagFor === 'host' ? hostName : guestName;

    if (!currentNickname || currentNickname.trim() === '') {
      console.log('[FlagPersistence] Nickname is empty. Skipping persistence logic.');
      if (editingPlayerFlagFor === 'host') setHostFlag(selectedCode);
      else if (editingPlayerFlagFor === 'guest') setGuestFlag(selectedCode);
      setIsFlagDropdownOpen(false);
      setEditingPlayerFlagFor(null);
      return;
    }

    const workingMap = new Map(playerCountryMap); // Use current state directly
    const existingCodeInMemory = workingMap.get(currentNickname);
    let mappingChanged = false;

    if (selectedCode === null) { // "None" selected
      if (workingMap.has(currentNickname)) {
        workingMap.delete(currentNickname);
        mappingChanged = true;
        console.log(`[FlagPersistence] '${currentNickname}' removed from working map.`);
      }
    } else { // Specific flag selected
      if (existingCodeInMemory !== selectedCode) {
        workingMap.set(currentNickname, selectedCode);
        mappingChanged = true;
        console.log(`[FlagPersistence] '${currentNickname}' updated to '${selectedCode}' in working map.`);
      }
    }

    if (mappingChanged) {
      setPlayerCountryMap(workingMap); // Update React state first
      savePlayerCountryMapToLocalStorage(workingMap); // Then persist
    }

    // Update Zustand store for immediate UI feedback on the flag button itself
    if (editingPlayerFlagFor === 'host') setHostFlag(selectedCode);
    else if (editingPlayerFlagFor === 'guest') setGuestFlag(selectedCode);

    setIsFlagDropdownOpen(false);
    setEditingPlayerFlagFor(null);
  };

  // Effect for Host Flag Loading (and reacting to nickname changes)
  useEffect(() => {
    if (hostName && hostName.trim() !== '') { // Ensure nickname is not empty
      const flagCode = playerCountryMap.get(hostName); // playerCountryMap is from React state
      setHostFlag(flagCode || null);
      console.log(`[FlagPersistence] Host nickname changed to: ${hostName}, flag set to: ${flagCode || null}`);
    } else {
      setHostFlag(null); // Clear flag if nickname becomes empty
      console.log(`[FlagPersistence] Host nickname is empty, flag cleared.`);
    }
  }, [hostName, playerCountryMap, setHostFlag]);

  // Effect for Guest Flag Loading (and reacting to nickname changes)
  useEffect(() => {
    if (guestName && guestName.trim() !== '') {
      const flagCode = playerCountryMap.get(guestName); // playerCountryMap is from React state
      setGuestFlag(flagCode || null);
      console.log(`[FlagPersistence] Guest nickname changed to: ${guestName}, flag set to: ${flagCode || null}`);
    } else {
      setGuestFlag(null); // Clear flag if nickname becomes empty
      console.log(`[FlagPersistence] Guest nickname is empty, flag cleared.`);
    }
  }, [guestName, playerCountryMap, setGuestFlag]);


  useEffect(() => {
    if (activePresetId && boxSeriesGames && boxSeriesGames.length > 0) {
      const draftMaps = Array.from(new Set([...mapPicksHost, ...mapPicksGuest, ...mapPicksGlobal])).filter(Boolean);

      const customMapsFromPresetGames: string[] = [];
      boxSeriesGames.forEach(game => {
        if (game.map && !draftMaps.includes(game.map)) {
          customMapsFromPresetGames.push(game.map);
        }
      });

      if (customMapsFromPresetGames.length > 0) {
        setManuallyAddedMaps(prevManuallyAddedMaps => {
          const updatedMaps = [...prevManuallyAddedMaps, ...customMapsFromPresetGames];
          return Array.from(new Set(updatedMaps)); // Ensure uniqueness
        });
      }
    }
  }, [activePresetId, boxSeriesGames, mapPicksHost, mapPicksGuest, mapPicksGlobal, setManuallyAddedMaps]);

  interface PresetItemProps {
    preset: SavedPreset;
    isActive: boolean;
    isDirty: boolean;
    onLoadPreset: (id: string) => void;
    onUpdatePreset: (name: string) => void;
    onDeletePreset: (id: string) => void;
  }

  const PresetItem = React.memo<PresetItemProps>(({ preset, isActive, isDirty, onLoadPreset, onUpdatePreset, onDeletePreset }) => {
    // console.log(`Rendering PresetItem: ${preset.name}, Active: ${isActive}, Dirty: ${isDirty}`); // Optional: for debugging memoization
    return (
      <div className="preset-item"> {/* key is on the component instance, not here */}
        <button onClick={() => onLoadPreset(preset.id)} className={`button-like preset-load-button ${isActive && !isDirty ? 'active-preset' : ''} ${isDirty ? 'dirty-preset' : ''}`}>
          {preset.name}
        </button>
        {isDirty && (
          <button onClick={() => onUpdatePreset(preset.name)} className="button-like preset-update-button">
            Update
          </button>
        )}
        <button onClick={() => onDeletePreset(preset.id)} className="preset-delete-button" title="Delete preset">&times;</button>
      </div>
    );
  });

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
    // Prompt to save if there's active data AND (it's a new session OR the active preset is dirty)
    // A "dirty" active preset means activePresetId is NOT null, but data has changed.
    // A "new session" means activePresetId IS null, but there's data.
    const activePresetIsDirty = storeState.activePresetId !== null && isCurrentStateDirtyForPreset(storeState.savedPresets.find(p => p.id === storeState.activePresetId)!);
    const isNewSessionWithData = storeState.activePresetId === null && (storeState.civDraftId || storeState.mapDraftId);

    if (isNewSessionWithData || activePresetIsDirty) {
      const defaultName = `${storeState.hostName || 'P1'} vs ${storeState.guestName || 'P2'} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
      let presetName: string | null = null;
      if (activePresetIsDirty) {
        const activePreset = storeState.savedPresets.find(p => p.id === storeState.activePresetId);
        presetName = prompt(`Current session (based on "${activePreset?.name || 'Loaded Preset'}") has unsaved changes. Save as:`, activePreset?.name || defaultName);
      } else { // isNewSessionWithData
        presetName = prompt("Enter a name for the current session before starting a new one:", defaultName);
      }
      
      if (presetName) { 
        saveCurrentAsPreset(presetName); 
      } else if (presetName === "") { 
         console.log("Discarding current session changes.");
      } else { 
        return; 
      }
    }
    _resetCurrentSessionState();
  };
  
  const handleDirectReset = () => {
    // window.confirm removed as per user request
    _resetCurrentSessionState();
  };

  const handleDeletePresetAndReset = React.useCallback((presetIdToDelete: string) => {
    deletePreset(presetIdToDelete);
  }, [deletePreset]);
  
  const isCurrentStateDirtyForPreset = (preset: SavedPreset | undefined): boolean => {
    if (!preset || activePresetId !== preset.id) {
      return false; 
    }
    const currentState = useDraftStore.getState();
    let dirty = false;

    // console.log(`Dirty check for preset: ${preset.name} (ID: ${preset.id}) | Active Preset ID: ${activePresetId}`);

    if (currentState.hostName !== preset.hostName) dirty = true;
    if (currentState.guestName !== preset.guestName) dirty = true;
    if (currentState.scores.host !== preset.scores.host || currentState.scores.guest !== preset.scores.guest) dirty = true;
    if (currentState.civDraftId !== preset.civDraftId) dirty = true;
    if (currentState.mapDraftId !== preset.mapDraftId) dirty = true;
    if (currentState.boxSeriesFormat !== preset.boxSeriesFormat) dirty = true;
    if (JSON.stringify(currentState.boxSeriesGames) !== JSON.stringify(preset.boxSeriesGames)) dirty = true;
    
    // if (dirty) console.log(`Preset "${preset.name}" is active and dirty.`);
    // else if (activePresetId === preset.id) console.log(`Preset "${preset.name}" is active but not dirty.`);

    return dirty;
  };
  
  const handleUpdatePreset = React.useCallback((presetName: string) => {
    // console.log(`Update button clicked for: ${presetName}, attempting to save...`); // Keep or remove based on desired verbosity
    saveCurrentAsPreset(presetName);
  }, [saveCurrentAsPreset]);

  const availableMapsForBoX = useMemo(() => {
    const draftMaps = Array.from(new Set([...mapPicksHost, ...mapPicksGuest, ...mapPicksGlobal])).filter(Boolean);
    return Array.from(new Set([...draftMaps, ...manuallyAddedMaps]));
  }, [mapPicksHost, mapPicksGuest, mapPicksGlobal, manuallyAddedMaps]);
  const availableHostCivsForBoX = useMemo(() => [...new Set(civPicksHost)].filter(Boolean), [civPicksHost]);
  const availableGuestCivsForBoX = useMemo(() => [...new Set(civPicksGuest)].filter(Boolean), [civPicksGuest]);

  const formatCivNameForImagePath = (civName: string): string => {
    if (!civName) return '';
    return civName
      .toLowerCase() // 1. Lowercase
      .replace(/-/g, '_') // 2. Hyphens to underscores
      .replace(/\s+/g, '_') // 3. Spaces to underscores
      .replace(/'/g, ''); // 4. Remove apostrophes
  };

  const formatMapNameForImagePath = (mapName: string): string => {
    if (!mapName) return '';
    return mapName
      .toLowerCase() // 1. Lowercase
      .replace(/\s+/g, '-') // 2. Spaces to hyphens
      .replace(/'/g, ''); // 3. Remove apostrophes
  };

  const filteredFlags = availableFlags.filter(code => code.toLowerCase().includes(searchTerm.toLowerCase()));

  const dropdownStyle = useMemo(() => {
    if (!flagDropdownAnchorEl) return { display: 'none' };
    const rect = flagDropdownAnchorEl.getBoundingClientRect();
    return {
      position: 'absolute' as 'absolute',
      top: rect.bottom + window.scrollY, // Added comma here
      left: rect.left + window.scrollX, // Assuming comma was missing here
      zIndex: 1000,
    };
  }, [flagDropdownAnchorEl]);

  // Effect to handle clicks outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isFlagDropdownOpen && flagDropdownAnchorEl && !flagDropdownAnchorEl.contains(event.target as Node)) {
        // A bit more robust: check if the click is outside the dropdown itself too, not just the anchor
        // This requires a ref to the dropdown content. For now, this simplified version might mostly work.
        // A more complete solution would involve checking if the event.target is within a dropdown ref.
        const dropdownElement = document.getElementById('flagDropdown'); // Assuming the ID is on the dropdown
        if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
          setIsFlagDropdownOpen(false);
          setEditingPlayerFlagFor(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFlagDropdownOpen, flagDropdownAnchorEl]);


  return (
    <div className="technical-interface main-dashboard-layout" onClick={() => {
      // General click on the interface body can close the dropdown if it's not handled by stopPropagation
      // This is a fallback; the useEffect with mousedown is more reliable for clicks truly "outside".
      // if (isFlagDropdownOpen) {
      //   setIsFlagDropdownOpen(false);
      //   setEditingPlayerFlagFor(null);
      // }
    }}>
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
              <button onClick={handleDirectReset} className="button-like reset-session-button" title="Reset Current Session">Reset Session</button>
            </div>
          </div>
          <div className="saved-presets-list">
            {savedPresets.length === 0 && <p className="no-presets-message">No presets. Import drafts then click "+" to save current session and start new.</p>}
            {savedPresets.map((preset: SavedPreset) => {
              const isActive = preset.id === activePresetId;
              // Pass the specific preset to isCurrentStateDirtyForPreset for potentially better memoization context,
              // though isCurrentStateDirtyForPreset itself uses useDraftStore.getState() which might still cause wider re-evaluations.
              const currentPresetForDirtyCheck = isActive ? preset : undefined; // If not active, dirty state is irrelevant or based on a non-active preset
              const isDirty = isActive && isCurrentStateDirtyForPreset(currentPresetForDirtyCheck!);

              return (
                <PresetItem
                  key={preset.id} // Key for React's list reconciliation
                  preset={preset}
                  isActive={isActive}
                  isDirty={isDirty}
                  onLoadPreset={loadPreset}
                  onUpdatePreset={handleUpdatePreset}
                  onDeletePreset={handleDeletePresetAndReset}
                />
              );
            })}
          </div>
        </div>
        
        <div className="card player-scores-card">
          <h2 className="section-title" style={{fontSize: '1.2em', marginTop:'0', marginBottom:'10px', width: '100%', textAlign:'center'}}>Match Control</h2>
           <div className="player-scores-horizontal-layout">
              <div className="player-name-input-group">
                <div style={{ width: '100%', marginBottom: '8px' }}>
                  <label htmlFor="hostNameInput">Player 1 (Host)</label>
                  <div className="player-input-flag-group">
                    <input
                      id="hostNameInput"
                      type="text"
                      value={editableHostName}
                      onChange={handleHostNameChange}
                      onBlur={updateHostNameInStore}
                      onKeyPress={(e) => e.key === 'Enter' && updateHostNameInStore()}
                      className="name-input name-input-reduced"
                      style={{ boxShadow: hostColor ? `0 0 8px 2px ${hostColor}` : 'none' }}
                    />
                    <button
                      onClick={(event) => {
                        setFlagDropdownAnchorEl(event.currentTarget);
                        setIsFlagDropdownOpen(true);
                        setEditingPlayerFlagFor('host');
                        setSearchTerm('');
                      }}
                      className="button-like flag-button"
                    >
                      {hostFlag ? (
                        <img src={`/assets/countryflags/${hostFlag}.png`} alt={hostFlag.toUpperCase()} /* Style via CSS */ />
                      ) : (
                        '🌍'
                      )}
                    </button>
                    {/* Removed separate selected-flag-image img tag */}
                  </div>
                </div>
                <PlayerColorPicker currentPlayerColor={hostColor} onSetColor={setHostColor} />
              </div>
              <div className="score-controls-group">
                <button onClick={() => decrementScore('host')} className="score-button button-like">-</button>
                <span className="score-display">{scores.host}</span>
                <button onClick={() => incrementScore('host')} className="score-button button-like">+</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 0.5 /* Adjust as needed */ }}>
                <button
                  onClick={switchPlayerSides}
                  className="button-like" // Or your preferred button styling class
                  style={{ padding: '8px 12px', whiteSpace: 'nowrap' }} // Example styling
                >
                  Switch Sides
                </button>
              </div>
              <div className="score-controls-group">
                <button onClick={() => decrementScore('guest')} className="score-button button-like">-</button>
                <span className="score-display">{scores.guest}</span>
                <button onClick={() => incrementScore('guest')} className="score-button button-like">+</button>
              </div>
              <div className="player-name-input-group">
                <div style={{ width: '100%', marginBottom: '8px' }}>
                  <label htmlFor="guestNameInput">Player 2 (Guest)</label>
                  <div className="player-input-flag-group">
                    {/* Removed separate selected-flag-image img tag for guest - it's now inside the button */}
                    <button
                      onClick={(event) => {
                        setFlagDropdownAnchorEl(event.currentTarget);
                        setIsFlagDropdownOpen(true);
                        setEditingPlayerFlagFor('guest');
                        setSearchTerm('');
                      }}
                      className="button-like flag-button"
                    >
                      {guestFlag ? (
                        <img src={`/assets/countryflags/${guestFlag}.png`} alt={guestFlag.toUpperCase()} />
                      ) : (
                        '🌍'
                      )}
                    </button>
                    <input
                      id="guestNameInput"
                      type="text"
                      value={editableGuestName}
                      onChange={handleGuestNameChange}
                      onBlur={updateGuestNameInStore}
                      onKeyPress={(e) => e.key === 'Enter' && updateGuestNameInStore()}
                      className="name-input name-input-reduced"
                      style={{ boxShadow: guestColor ? `0 0 8px 2px ${guestColor}` : 'none' }}
                    />
                  </div>
                </div>
                <PlayerColorPicker currentPlayerColor={guestColor} onSetColor={setGuestColor} />
              </div>
           </div>
        </div>
      </div>

      {/* Flag Dropdown Structure */}
      {isFlagDropdownOpen && (
        <div className="flag-dropdown" style={dropdownStyle} id="flagDropdownContent" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()} // Prevent closing dropdown when clicking input
            className="flag-dropdown-search-input"
            autoFocus
          />
          <div
            className="flag-dropdown-item"
            className="flag-dropdown-item"
            onClick={() => handleFlagSelection(null)}
          >
            None
          </div>
          {filteredFlags.map(code => (
            <div
              key={code}
              className="flag-dropdown-item"
              onClick={() => handleFlagSelection(code)}
            >
              <img src={`/assets/countryflags/${code}.png`} alt={code} /* Style via CSS: .flag-dropdown-item img */ />
              {code.toUpperCase()}
            </div>
          ))}
        </div>
      )}

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
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                    <h4 className="game-slot-title" style={{ marginRight: '10px', marginBottom: '0' }}>Game {index + 1}</h4>
                    <label htmlFor={`game-visible-checkbox-${index}`} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9em' }}>
                      <input
                        type="checkbox"
                        id={`game-visible-checkbox-${index}`}
                        checked={game.isVisible === undefined ? false : game.isVisible}
                        onChange={() => toggleBoxSeriesGameVisibility(index)}
                        style={{ marginRight: '5px' }}
                      />
                      Show Game
                    </label>
                  </div>
                  <div className="game-slot-selectors">
                    <div className="selector-group">
                      <label htmlFor={`box-host-civ-${index}`} className={game.winner === 'host' ? 'text-winner' : game.winner === 'guest' ? 'text-loser' : ''}>
                        {hostName} Civ:
                      </label>
                      <div className="civ-selection-group">
                        <button
                          className={`win-button ${game.winner === 'host' ? 'active' : ''}`}
                          onClick={() => setGameWinner(index, game.winner === 'host' ? null : 'host')}
                          title={`Mark ${hostName} as winner for Game ${index + 1}`}
                          style={{ zIndex: 1, marginRight: '-8px' }}
                        >W</button>
                        <select
                          id={`box-host-civ-${index}`}
                          value={game.hostCiv || ''}
                          onChange={(e) => updateBoxSeriesGame(index, 'hostCiv', e.target.value || null)}
                          className={`button-like ${game.winner === 'host' ? 'select-winner' : game.winner === 'guest' ? 'select-loser' : ''}`}
                          style={
                            game.hostCiv
                              ? {
                                  backgroundImage: `linear-gradient(to bottom, rgba(74,59,42,0.8) 0%, rgba(74,59,42,0) 100%), url('/assets/civflags_normal/${formatCivNameForImagePath(game.hostCiv)}.png')`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                  backgroundRepeat: 'no-repeat',
                                  color: 'white',
                                  textShadow: '0 0 3px black, 0 0 3px black',
                                  position: 'relative', // Added
                                  zIndex: 2,             // Added
                                }
                              : {
                                  color: 'white', // Or a default color for empty selects if preferred
                                  textShadow: '0 0 3px black, 0 0 3px black', // Keep text shadow for consistency
                                  position: 'relative', // Added
                                  zIndex: 2,             // Added
                                }
                          }
                        >
                          <option value="">- Select Civ -</option>
                          {availableHostCivsForBoX.map(civ => <option key={`h-civ-${index}-${civ}`} value={civ}>{civ}</option>)}
                        </select>
                      </div>
                    </div>
                     <div className="selector-group map-selector-group">
                      <label htmlFor={`box-map-${index}`}>Map:</label>
                      {editingMapIndex === index ? (
                        <input
                          type="text"
                          value={editingMapValue}
                          onChange={(e) => setEditingMapValue(e.target.value)}
                          onBlur={() => {
                            const trimmedMapValue = editingMapValue.trim();
                            // availableMapsForBoX correctly represents maps from draft + previously manually added maps
                            if (trimmedMapValue && !availableMapsForBoX.includes(trimmedMapValue)) {
                              setManuallyAddedMaps(prev => [...new Set([...prev, trimmedMapValue])]);
                            }
                            updateBoxSeriesGame(index, 'map', trimmedMapValue || null);
                            setEditingMapIndex(null);
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const trimmedMapValue = editingMapValue.trim();
                              // availableMapsForBoX correctly represents maps from draft + previously manually added maps
                              if (trimmedMapValue && !availableMapsForBoX.includes(trimmedMapValue)) {
                                setManuallyAddedMaps(prev => [...new Set([...prev, trimmedMapValue])]);
                              }
                              updateBoxSeriesGame(index, 'map', trimmedMapValue || null);
                              setEditingMapIndex(null);
                              // Consider e.preventDefault() if inside a form
                            }
                          }}
                          className="button-like" // You might want a specific class for text inputs
                          autoFocus
                        />
                      ) : (
                        <select
                          id={`box-map-${index}`}
                          value={game.map || ''}
                          onChange={(e) => {
                            if (e.target.value === "_ADD_MAP_") {
                              setEditingMapIndex(index);
                              setEditingMapValue(game.map || ""); // Or "" for a new map
                              return;
                            }
                            updateBoxSeriesGame(index, 'map', e.target.value || null);
                          }}
                          className="button-like"
                          style={
                            game.map
                              ? {
                                  backgroundImage: `linear-gradient(to bottom, rgba(74,59,42,0.8) 0%, rgba(74,59,42,0) 100%), url('/assets/maps/${formatMapNameForImagePath(game.map)}.png')`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                  backgroundRepeat: 'no-repeat',
                                  color: 'white',
                                  textShadow: '0 0 3px black, 0 0 3px black',
                                }
                              : {
                                  color: 'white', // Or a default color for empty selects
                                  textShadow: '0 0 3px black, 0 0 3px black', // Keep text shadow for consistency
                                }
                          }
                        >
                          <option value="">- Select Map -</option>
                          <option value="_ADD_MAP_">Add Map</option>
                          {availableMapsForBoX.map(map => <option key={`map-${index}-${map}`} value={map}>{map}</option>)}
                        </select>
                      )}
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
                          style={
                            game.guestCiv
                              ? {
                                  backgroundImage: `linear-gradient(to bottom, rgba(74,59,42,0.8) 0%, rgba(74,59,42,0) 100%), url('/assets/civflags_normal/${formatCivNameForImagePath(game.guestCiv)}.png')`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                  backgroundRepeat: 'no-repeat',
                                  color: 'white',
                                  textShadow: '0 0 3px black, 0 0 3px black',
                                  position: 'relative', // Added
                                  zIndex: 2,             // Added
                                }
                              : {
                                  color: 'white', // Or a default color for empty selects if preferred
                                  textShadow: '0 0 3px black, 0 0 3px black', // Keep text shadow for consistency
                                  position: 'relative', // Added
                                  zIndex: 2,             // Added
                                }
                          }
                        >
                          <option value="">- Select Civ -</option>
                          {availableGuestCivsForBoX.map(civ => <option key={`g-civ-${index}-${civ}`} value={civ}>{civ}</option>)}
                        </select>
                        <button 
                          className={`win-button ${game.winner === 'guest' ? 'active' : ''}`}
                          onClick={() => setGameWinner(index, game.winner === 'guest' ? null : 'guest')}
                          title={`Mark ${guestName} as winner for Game ${index + 1}`}
                          style={{ zIndex: 1, marginLeft: '-8px' }}
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
