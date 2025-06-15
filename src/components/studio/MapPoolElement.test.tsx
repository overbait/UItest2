// src/components/studio/MapPoolElement.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MapPoolElement from './MapPoolElement';
import useDraftStore from '../../store/draftStore';
import { StudioElement } from '../../types/draft';

// Mock the draft store
jest.mock('../../store/draftStore');

const mockUseDraftStore = useDraftStore as jest.MockedFunction<typeof useDraftStore>;

// Default element props for testing
const getDefaultElementProps = (overrides: Partial<StudioElement> = {}): StudioElement => ({
  id: 'test-map-pool-1',
  type: 'MapPoolElement',
  x: 0,
  y: 0,
  scale: 1,
  width: 600,
  height: 220,
  fontFamily: 'Arial',
  mapNameFontSize: '12px',
  lockPivotPoint: false,
  offset: 0,
  numColumns: 2,
  ...overrides,
});

describe('MapPoolElement', () => {
  beforeEach(() => {
    // Reset store mock before each test
    mockUseDraftStore.mockReturnValue({
      aoe2cmRawDraftOptions: [
        { id: 'map1_id', name: 'Arabia' },
        { id: 'map2_id', name: 'Arena' },
        { id: 'map3_id', name: 'Golden Pit' },
        { id: 'map4_id', name: 'Hideout' },
        // Civ option to test filtering
        { id: 'aoe4.abbasid', name: 'Abbasid Dynasty'},
      ],
      mapPicksHost: [], mapBansHost: [],
      mapPicksGuest: [], mapBansGuest: [],
      mapPicksGlobal: [], mapBansGlobal: [],
      hostName: 'Player 1', guestName: 'Player 2',
    } as any); // Use 'as any' for brevity if full store state is complex and not all parts used
  });

  test('renders basic structure with map names from store', () => {
    render(<MapPoolElement element={getDefaultElementProps()} />);
    // Check for map names appearing, implying grids are rendered.
    expect(screen.getByText('Arabia')).toBeInTheDocument();
    expect(screen.getByText('Arena')).toBeInTheDocument();
    // Check that civs are filtered out
    expect(screen.queryByText('Abbasid Dynasty')).not.toBeInTheDocument();
  });

  test('displays "No maps available" message when aoe2cmRawDraftOptions is empty or only civs', () => {
    mockUseDraftStore.mockReturnValueOnce({
      ...(useDraftStore() as any), // spread previous mock return
      aoe2cmRawDraftOptions: [{ id: 'aoe4.english', name: 'English' }], // Only civs
    });
    render(<MapPoolElement element={getDefaultElementProps()} />);
    expect(screen.getByText('No maps available in the current draft pool.')).toBeInTheDocument();
  });

  test('renders map names and images', () => {
    render(<MapPoolElement element={getDefaultElementProps()} />);
    const arabiaMapName = screen.getByText('Arabia');
    expect(arabiaMapName).toBeInTheDocument();
    // Check for image alt text or src
    const arabiaImage = screen.getByAltText('Arabia') as HTMLImageElement;
    expect(arabiaImage).toBeInTheDocument();
    // Path formatting for Arabia is 'dry-arabia.png' based on typical game map names
    // However, our formatMapNameForImagePath will make it 'arabia.png'
    expect(arabiaImage.src).toContain(encodeURIComponent('arabia.png'));
  });

  test('applies picked_by_self style for P1', () => {
    mockUseDraftStore.mockReturnValueOnce({
      ...(useDraftStore() as any),
      mapPicksHost: ['Arabia'],
    });
    render(<MapPoolElement element={getDefaultElementProps()} />);
    const arabiaMapItem = screen.getByText('Arabia').closest('div[class*="mapItemVisualContent"]');
    expect(arabiaMapItem).toHaveClass('pickedBySelf');
  });

  test('applies banned_by_self style for P1', () => {
    mockUseDraftStore.mockReturnValueOnce({
      ...(useDraftStore() as any),
      mapBansHost: ['Arena'],
    });
    render(<MapPoolElement element={getDefaultElementProps()} />);
    const arenaMapItem = screen.getByText('Arena').closest('div[class*="mapItemVisualContent"]');
    expect(arenaMapItem).toHaveClass('bannedBySelf');
  });

  test('applies picked_by_admin style', () => {
    mockUseDraftStore.mockReturnValueOnce({
      ...(useDraftStore() as any),
      mapPicksGlobal: ['Golden Pit'],
    });
    render(<MapPoolElement element={getDefaultElementProps()} />);
    const goldenPitItem = screen.getByText('Golden Pit').closest('div[class*="mapItemVisualContent"]');
    expect(goldenPitItem).toHaveClass('pickedByAdmin');
  });

  test('applies affected_by_opponent style for P1 when P2 picks', () => {
    mockUseDraftStore.mockReturnValueOnce({
      ...(useDraftStore() as any),
      mapPicksGuest: ['Hideout'],
    });
    render(<MapPoolElement element={getDefaultElementProps()} />);
    // This test will apply to the P1 grid's rendering of Hideout
    const p1GridHideoutItem = screen.getAllByText('Hideout').find(el =>
      el.closest('div[class*="playerGridOuterContainer"]')?.style.transform === 'translateX(-0px)' || // Assuming default offset 0
      el.closest('div[class*="playerGridOuterContainer"]')?.style.transform === '' // Or no transform if offset is 0 and not locked
    )?.closest('div[class*="mapItemVisualContent"]');

    // A more robust way would be to add test-ids to playerGridOuterContainer like data-testid="player1-grid"
    // For now, we assume the first set of maps corresponds to P1 if they are duplicated in DOM for P2.
    // If map names are unique per grid due to different states, then getByText is fine.
    // The current component renders all maps in both grids.

    // Find the "Hideout" map item that belongs to the P1 grid.
    // Since both grids render all maps, we need a way to distinguish.
    // For simplicity, we'll assume the first one found by getAllByText and then filtered for class is P1.
    // This is brittle.
    const allHideoutItems = screen.getAllByText('Hideout');
    let p1HideoutVisualContent;
    for (const item of allHideoutItems) {
        const visualContent = item.closest('div[class*="mapItemVisualContent"]');
        // Check a style that differentiates P1 grid from P2 if offset is applied, or assume order.
        // If no specific way to distinguish, this test is less reliable for P1 vs P2.
        // For this example, let's assume the first one is in P1's grid.
        p1HideoutVisualContent = visualContent;
        break;
    }
    expect(p1HideoutVisualContent).toHaveClass('affectedByOpponent');
  });


  test('renders correct number of columns', () => {
    const { container } = render(<MapPoolElement element={getDefaultElementProps({ numColumns: 3 })} />);
    const grids = container.querySelectorAll('div[class*="playerMapGrid"]'); // from module CSS
    expect(grids.length).toBeGreaterThan(0); // Ensure grids are found
    grids.forEach(grid => {
      expect(grid).toHaveStyle('grid-template-columns: repeat(3, 1fr)');
    });
  });

  test('applies transform when lockPivotPoint is true and offset is non-zero', () => {
    const { container } = render(<MapPoolElement element={getDefaultElementProps({ lockPivotPoint: true, offset: 50 })} />);
    const outerContainers = container.querySelectorAll('div[class*="playerGridOuterContainer"]');
    expect(outerContainers.length).toBe(2);
    expect(outerContainers[0]).toHaveStyle('transform: translateX(-50px)');
    expect(outerContainers[1]).toHaveStyle('transform: translateX(50px)');
  });

  test('does not apply transform when lockPivotPoint is false', () => {
    const { container } = render(<MapPoolElement element={getDefaultElementProps({ lockPivotPoint: false, offset: 50 })} />);
    const outerContainers = container.querySelectorAll('div[class*="playerGridOuterContainer"]');
    expect(outerContainers[0]).toHaveStyle('transform: none');
    expect(outerContainers[1]).toHaveStyle('transform: none');
  });

  test('uses provided font family and map name font size', () => {
    render(<MapPoolElement element={getDefaultElementProps({ fontFamily: 'CustomFont', mapNameFontSize: '16px' })} />);
    const mapNameElement = screen.getByText('Arabia');
    expect(mapNameElement).toHaveStyle('font-family: CustomFont');
    expect(mapNameElement).toHaveStyle('font-size: 16px');

    const rootElement = screen.getByText('Arabia').closest('div[class*="mapPoolElement"]');
    expect(rootElement).toHaveStyle('font-family: CustomFont');
  });

});
