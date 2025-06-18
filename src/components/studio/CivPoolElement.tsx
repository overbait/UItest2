import React, { useMemo, useCallback } from 'react'; // useEffect removed as it's no longer needed
import useDraftStore from '../../store/draftStore';
import { StudioElement } from '../../types/draft'; // Aoe2cmRawDraftData removed
import styles from './CivPoolElement.module.css';

const DEFAULT_CIV_POOL = [
  { id: 'aoe4.AbbasidDynasty', name: 'AbbasidDynasty' }, { id: 'aoe4.Ayyubids', name: 'Ayyubids' },
  { id: 'aoe4.Byzantines', name: 'Byzantines' }, { id: 'aoe4.Chinese', name: 'Chinese' },
  { id: 'aoe4.DelhiSultanate', name: 'DelhiSultanate' }, { id: 'aoe4.English', name: 'English' },
  { id: 'aoe4.French', name: 'French' }, { id: 'aoe4.HolyRomanEmpire', name: 'HolyRomanEmpire' },
  { id: 'aoe4.HouseOfLancaster', name: 'HouseOfLancaster'}, { id: 'aoe4.Japanese', name: 'Japanese' },
  { id: 'aoe4.JeanneDArc', name: 'JeanneDArc' }, { id: 'aoe4.KnightsTemplar', name: 'KnightsTemplar'},
  { id: 'aoe4.Malians', name: 'Malians' }, { id: 'aoe4.Mongols', name: 'Mongols' },
  { id: 'aoe4.OrderOfTheDragon', name: 'OrderOfTheDragon' }, { id: 'aoe4.Ottomans', name: 'Ottomans' },
  { id: 'aoe4.Rus', name: 'Rus' }, { id: 'aoe4.ZhuXisLegacy', name: 'ZhuXisLegacy' }
];

const NUM_ROWS = 2;
const NUM_COLUMNS = 9; // To fit 18 civs

interface CivItem {
  id: string;
  name: string;
  status: 'picked' | 'banned' | 'affected' | 'adminPicked' | 'default';
  imageUrl: string;
}

const reorderCivsForDisplay = (civs: CivItem[], numRows: number): (CivItem | null)[] => {
  const totalGridSize = NUM_COLUMNS * numRows;
  const fullGridItems: (CivItem | null)[] = new Array(totalGridSize).fill(null);
  const baseItemsPerColumn = Math.floor(civs.length / NUM_COLUMNS);
  let remainderItems = civs.length % NUM_COLUMNS;
  let currentCivIndex = 0;

  for (let col = 0; col < NUM_COLUMNS; col++) {
    const itemsInThisColumn = baseItemsPerColumn + (remainderItems > 0 ? 1 : 0);
    if (remainderItems > 0) remainderItems--;
    const civsForThisColumnSegment = civs.slice(currentCivIndex, currentCivIndex + itemsInThisColumn);
    const reversedCivItemsInSegment = civsForThisColumnSegment.reverse();
    for (let itemIndex = 0; itemIndex < reversedCivItemsInSegment.length; itemIndex++) {
      const gridRow = numRows - 1 - itemIndex;
      const gridIndex = gridRow * NUM_COLUMNS + col;
      if (gridIndex < totalGridSize) {
        fullGridItems[gridIndex] = reversedCivItemsInSegment[itemIndex];
      }
    }
    currentCivIndex += itemsInThisColumn;
  }
  return fullGridItems;
};

const formatCivNameForImagePath = (civName: string): string => {
  if (!civName) return 'random';
  const formattedName = civName.toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_').replace(/'/g, '');
  return `/assets/civflags_normal/${formattedName}.png`;
};

const getStatusClass = (status: CivItem['status']): string => {
  switch (status) {
    case 'picked': return styles.picked;
    case 'banned': return styles.banned;
    case 'affected': return styles.affected;
    // case 'adminPicked': return styles.adminPicked; // Uncomment if adminPicked is a possible status for civs
    default: return '';
  }
};

interface CivPoolElementProps {
  element: StudioElement;
  isBroadcast?: boolean;
}

const CivPoolElement: React.FC<CivPoolElementProps> = ({ element, isBroadcast }) => {
  const {
    fontFamily = 'Arial, sans-serif', // Default font family
    horizontalSplitOffset = 0,
    // Note: isPivotLocked is available from element but not directly used in MapPoolElement's rendering logic this way
    // scale is also available but MapPoolElement uses it for dynamicFontSize, which we are keeping simple for now
  } = element;

  const {
    civPicksHost,
    civBansHost,
    civPicksGuest,
    civBansGuest,
  } = useDraftStore(state => ({
    civPicksHost: state.civPicksHost,
    civBansHost: state.civBansHost,
    civPicksGuest: state.civPicksGuest,
    civBansGuest: state.civBansGuest,
  }));

  const deriveCivPool = useCallback((playerType: 'host' | 'guest'): CivItem[] => {
    return DEFAULT_CIV_POOL.map(defaultCiv => {
      const civId = defaultCiv.id;
      const displayName = defaultCiv.name;
      let status: CivItem['status'] = 'default';
      const imageUrl = formatCivNameForImagePath(displayName);

      if (playerType === 'host') {
        if (civPicksHost.includes(displayName)) status = 'picked';
        else if (civBansHost.includes(displayName)) status = 'banned';
        else if (civPicksGuest.includes(displayName) || civBansGuest.includes(displayName)) status = 'affected';
      } else { // playerType === 'guest'
        if (civPicksGuest.includes(displayName)) status = 'picked';
        else if (civBansGuest.includes(displayName)) status = 'banned';
        else if (civPicksHost.includes(displayName) || civBansHost.includes(displayName)) status = 'affected';
      }
      return { id: civId, name: displayName, status, imageUrl };
    });
  }, [civPicksHost, civBansHost, civPicksGuest, civBansGuest]);

  const player1CivPool = useMemo(() => {
    const civs = deriveCivPool('host');
    return reorderCivsForDisplay(civs, NUM_ROWS);
  }, [deriveCivPool]);

  const player2CivPool = useMemo(() => {
    const civs = deriveCivPool('guest');
    return reorderCivsForDisplay(civs, NUM_ROWS);
  }, [deriveCivPool]);

  const civItemWidth = 80;
  const civItemHeight = 80;
  const dynamicFontSize = 10; // Similar to MapPoolElement's base

  console.log('[CivPoolElement] Final player1CivPool for render:', player1CivPool);
  console.log('[CivPoolElement] Final player2CivPool for render:', player2CivPool);

  const p1TranslateX = -horizontalSplitOffset;
  const p2TranslateX = horizontalSplitOffset;

  if (isBroadcast && player1CivPool.filter(Boolean).length === 0 && player2CivPool.filter(Boolean).length === 0) {
    return null;
  }

  return (
    <div
      id={element.id}
      className={styles.civPoolElement}
      style={{ fontFamily, fontSize: `${dynamicFontSize}px` }}
    >
      {/* Player 1 Grid */}
      <div
        className={`${styles.playerCivGrid} ${styles.player1Grid}`}
        style={{ transform: `translateX(${p1TranslateX}px)`, gridTemplateColumns: `repeat(${NUM_COLUMNS}, 1fr)` }}
      >
        {player1CivPool.map((civItem, index) => {
          if (civItem) { // Only log if civItem is not null
            const statusClass = getStatusClass(civItem.status);
            console.log(`[CivPoolElement] P1 Rendering Item - Name: ${civItem.name}, ID: ${civItem.id}, Status: ${civItem.status}, AppliedClass: ${statusClass}, ImageURL: ${civItem.imageUrl}`);
          }
          if (!civItem) {
            return <div key={`p1-placeholder-${index}`} className={styles.civItemGridCell} />;
          }
          return (
            <div key={`p1-civ-${index}-${civItem.id}`} className={styles.civItemGridCell}>
              <div
                className={`${styles.civItemVisualContent} ${getStatusClass(civItem.status)}`}
                style={{
                  width: `${civItemWidth}px`,
                  height: `${civItemHeight}px`,
                  backgroundImage: civItem.imageUrl ? `linear-gradient(to bottom, rgba(74,59,42,0.3) 0%, rgba(74,59,42,0.0) 30%), url('${civItem.imageUrl}')` : undefined,
                }}
              >
                <span className={styles.civName}>{civItem.name || 'Unknown Civ'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Player 2 Grid */}
      <div
        className={`${styles.playerCivGrid} ${styles.player2Grid}`}
        style={{ transform: `translateX(${p2TranslateX}px)`, gridTemplateColumns: `repeat(${NUM_COLUMNS}, 1fr)` }}
      >
        {player2CivPool.map((civItem, index) => {
          if (civItem) { // Only log if civItem is not null
            const statusClass = getStatusClass(civItem.status);
            console.log(`[CivPoolElement] P2 Rendering Item - Name: ${civItem.name}, ID: ${civItem.id}, Status: ${civItem.status}, AppliedClass: ${statusClass}, ImageURL: ${civItem.imageUrl}`);
          }
          if (!civItem) {
            return <div key={`p2-placeholder-${index}`} className={styles.civItemGridCell} />;
          }
          return (
            <div key={`p2-civ-${index}-${civItem.id}`} className={styles.civItemGridCell}>
              <div
                className={`${styles.civItemVisualContent} ${getStatusClass(civItem.status)}`}
                style={{
                  width: `${civItemWidth}px`,
                  height: `${civItemHeight}px`,
                  backgroundImage: civItem.imageUrl ? `linear-gradient(to bottom, rgba(74,59,42,0.3) 0%, rgba(74,59,42,0.0) 30%), url('${civItem.imageUrl}')` : undefined,
                }}
              >
                <span className={styles.civName}>{civItem.name || 'Unknown Civ'}</span>
              </div>
            </div>
          );
        })}
      </div>
      {/* Custom CSS from element props is not handled by MapPoolElement, so omitting here for parity */}
    </div>
  );
};

export default CivPoolElement;
