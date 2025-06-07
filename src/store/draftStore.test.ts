import useDraftStore from './draftStore';
import { Aoe2cmRawDraftData } from '../types/draft'; // Adjust path if necessary
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Raw draft data fetched from https://aoe2cm.net/api/draft/kIqET
const mockDraft_kIqET: Aoe2cmRawDraftData = {
  nextAction: 11,
  events: [
    { player: 'HOST', executingPlayer: 'HOST', actionType: 'ban', chosenOptionId: 'Holy Island', isRandomlyChosen: false, offset: 8613 },
    { player: 'GUEST', executingPlayer: 'GUEST', actionType: 'ban', chosenOptionId: 'Relic River', isRandomlyChosen: false, offset: 17324 },
    { player: 'HOST', executingPlayer: 'HOST', actionType: 'pick', chosenOptionId: 'Coastal Cliffs', isRandomlyChosen: false, offset: 23375 },
    { player: 'GUEST', executingPlayer: 'GUEST', actionType: 'pick', chosenOptionId: 'Kawasan', isRandomlyChosen: false, offset: 33237 },
    { player: 'GUEST', executingPlayer: 'GUEST', actionType: 'ban', chosenOptionId: 'Carmel', isRandomlyChosen: false, offset: 36474 },
    { player: 'HOST', executingPlayer: 'HOST', actionType: 'ban', chosenOptionId: 'Kerlaugar', isRandomlyChosen: false, offset: 43502 },
    { player: 'HOST', executingPlayer: 'HOST', actionType: 'pick', chosenOptionId: 'Dry Arabia', isRandomlyChosen: false, offset: 50656 },
    { player: 'GUEST', executingPlayer: 'GUEST', actionType: 'pick', chosenOptionId: 'Four Lakes', isRandomlyChosen: false, offset: 56856 },
    { player: 'GUEST', executingPlayer: 'GUEST', actionType: 'ban', chosenOptionId: 'Baldland', isRandomlyChosen: false, offset: 64317 },
    { player: 'HOST', executingPlayer: 'HOST', actionType: 'ban', chosenOptionId: 'Gorge', isRandomlyChosen: false, offset: 77674 },
    { player: 'NONE', executingPlayer: 'NONE', actionType: 'pick', chosenOptionId: 'Regions', isRandomlyChosen: false, offset: 79676 }
  ],
  fixedNames: false,
  nameHost: 'Numudan',
  nameGuest: '3D!Scatterbrained',
  preset: {
    name: 'M.o.S. Bo5 Map Draft',
    presetId: 'dihCw',
    draftOptions: [
      { id: 'Dry Arabia', name: 'Dry Arabia', imageUrls: { unit: '', emblem: '', animated_left: '', animated_right: '' }, i18nPrefix: 'civs.', category: 'default' },
      { id: 'Baldland', name: 'Baldland', imageUrls: { unit: '', emblem: '', animated_left: '', animated_right: '' }, i18nPrefix: 'civs.', category: 'default' },
      { id: 'Gorge', name: 'Gorge', imageUrls: { unit: '', emblem: '', animated_left: '', animated_right: '' }, i18nPrefix: 'civs.', category: 'default' },
      { id: 'Regions', name: 'Regions', imageUrls: { unit: '', emblem: '', animated_left: '', animated_right: '' }, i18nPrefix: 'civs.', category: 'default' },
      { id: 'Holy Island', name: 'Holy Island', imageUrls: { unit: '', emblem: '', animated_left: '', animated_right: '' }, i18nPrefix: 'civs.', category: 'default' },
      { id: 'Four Lakes', name: 'Four Lakes', imageUrls: { unit: '', emblem: '', animated_left: '', animated_right: '' }, i18nPrefix: 'civs.', category: 'default' },
      { id: 'Kawasan', name: 'Kawasan', imageUrls: { unit: '', emblem: '', animated_left: '', animated_right: '' }, i18nPrefix: 'civs.', category: 'default' },
      { id: 'Coastal Cliffs', name: 'Coastal Cliffs', imageUrls: { unit: '', emblem: '', animated_left: '', animated_right: '' }, i18nPrefix: 'civs.', category: 'default' },
      { id: 'Carmel', name: 'Carmel', imageUrls: { unit: '', emblem: '', animated_left: '', animated_right: '' }, i18nPrefix: 'civs.', category: 'default' },
      { id: 'Relic River', name: 'Relic River', imageUrls: { unit: '', emblem: '', animated_left: '', animated_right: '' }, i18nPrefix: 'civs.', category: 'default' },
      { id: 'Kerlaugar', name: 'Kerlaugar', imageUrls: { unit: '', emblem: '', animated_left: '', animated_right: '' }, i18nPrefix: 'civs.', category: 'default' }
    ],
    turns: [ /* Simplified for brevity, assuming not strictly needed for this specific map pick logic test */ ],
    categoryLimits: { pick: {}, ban: {} }
  },
  hostConnected: false, guestConnected: false, hostReady: true, guestReady: true, startTimestamp: 0
};

// Basic assertion function for the test
function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected "${expected}", but got "${actual}".`);
  }
}

async function runTest() {
  console.log('Starting test: Last remaining map assignment...');

  // Reset store to initial state before each test run
  useDraftStore.setState(useDraftStore.getState()._resetCurrentSessionState());

  // Mock the API call
  mockedAxios.get.mockResolvedValue({ data: mockDraft_kIqET });

  // Manually set BO5 format as it's usually detected from preset name or set by user
  // This ensures boxSeriesGames array is initialized correctly for 5 games.
  useDraftStore.getState().setBoxSeriesFormat('bo5');

  // Connect to the draft
  const connectResult = await useDraftStore.getState().connectToDraft('kIqET', 'map');
  assertEqual(connectResult, true, 'Connection to draft should be successful');

  const state = useDraftStore.getState();

  // Verify mapPicksGlobal includes 'Regions' due to the new logic
  // This check depends on the scenario:
  // Scenario A: API "NONE" pick for "Regions" is NOT processed by original event loop
  // -> New logic adds "Regions" to mapPicksGlobal.
  // Scenario B: API "NONE" pick for "Regions" IS processed (if event loop is fixed)
  // -> New logic sees "Regions" as already picked, doesn't add it again (which is fine).
  // The crucial part is that "Regions" ends up in the combined list for boxSeriesGames.

  const allPickedMaps = Array.from(new Set([
    ...(state.mapPicksHost || []),
    ...(state.mapPicksGuest || []),
    ...(state.mapPicksGlobal || [])
  ]));

  assertEqual(allPickedMaps.includes('Regions'), true, 'Combined map picks should include "Regions"');

  // Verify the 5th game's map (index 4)
  if (!state.boxSeriesGames || state.boxSeriesGames.length < 5) {
    throw new Error(`boxSeriesGames is not defined or has fewer than 5 games. Length: ${state.boxSeriesGames?.length}`);
  }
  assertEqual(state.boxSeriesGames[4]?.map, 'Regions', 'Game 5 map should be "Regions"');

  console.log('Test passed: Last remaining map "Regions" correctly assigned to Game 5.');
}

// Attempt to run the test
// This might require a test runner environment (like Jest/Vitest) to work fully with mocks.
// If running directly with Node, `jest.mock` will not work as expected.
// For now, the goal is to create the file and the test logic.
runTest().catch(e => {
  console.error("Test failed:", e);
  // In a real test runner, this would cause the test suite to fail.
  // For a simple script, we might exit with an error code.
  process.exit(1);
});

// Add a simple export to make it a module, satisfying TypeScript.
export {};
