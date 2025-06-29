import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';

// Lazy load page components for code splitting
const TechnicalInterface = lazy(() => import('./pages/TechnicalInterface'));
const StudioInterface = lazy(() => import('./pages/StudioInterface')); // Added import

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-aoe-dark text-aoe-light p-4">
          <h1 className="text-2xl font-medieval text-aoe-gold mb-4">Something went wrong</h1>
          <p className="mb-4">{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button
            className="button-primary"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

import BroadcastView from './pages/BroadcastView';   // Import the new view

// Loading component
const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-aoe-dark">
    <div className="text-center">
      <div className="animate-pulse-slow">
        <h2 className="text-2xl font-medieval text-aoe-gold mb-4">Loading...</h2>
      </div>
      <p className="text-aoe-light">Preparing the battlefield</p>
    </div>
  </div>
);

// Navigation component - Updated
const Navigation = () => {
  const location = useLocation();

  return (
    <nav className="bg-ui-background shadow-md py-3 px-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/technical" className={`text-xl font-medieval ${location.pathname.startsWith('/technical') ? 'text-aoe-gold' : 'text-aoe-light hover:text-aoe-tan'}`}>
          AoE4 Draft Overlay
        </Link>
        <div className="space-x-4">
          <Link to="/technical" className={`font-medieval ${location.pathname.startsWith('/technical') ? 'text-aoe-gold' : 'text-aoe-light hover:text-aoe-tan'}`}>
            Data Management
          </Link>
          <Link to="/studio" className={`font-medieval ${location.pathname.startsWith('/studio') ? 'text-aoe-gold' : 'text-aoe-light hover:text-aoe-tan'}`}>
            Broadcast Studio
          </Link>
        </div>
      </div>
    </nav>
  );
};

import useDraftStore from './store/draftStore'; // Import the store
import { StudioCanvas } from './types/draft'; // Import StudioCanvas type

const App: React.FC = () => {
  const queryParams = new URLSearchParams(window.location.search);
  const viewType = queryParams.get('view');
  const canvasIdParam = queryParams.get('canvasId');
  const layoutDataParam = queryParams.get('layoutData');

  // This function now runs in the render path to determine canvasToPass
  const getCanvasForBroadcast = (): StudioCanvas | null => {
    if (viewType === 'broadcast' && canvasIdParam) {
      if (layoutDataParam) {
        try {
          const decodedJson = atob(layoutDataParam);
          const canvasDataObject = JSON.parse(decodedJson) as StudioCanvas;
          if (canvasDataObject.id === canvasIdParam) {
            // Call the hydration action.
            // Note: The store update from this might not be reflected immediately in a subsequent getState()
            // in the same synchronous render block, but it will schedule an update.
            useDraftStore.getState().hydrateCanvasFromData(canvasDataObject);
            // For this render pass, we can directly use canvasDataObject if hydration is successful.
            // This ensures BroadcastView gets the data even if store update is slightly deferred.
            console.log('[App.tsx] Hydration called. Passing parsed canvasDataObject directly to BroadcastView for this render.');
            return canvasDataObject;
          } else {
            console.warn('[App.tsx] Mismatch between canvasId in URL and id in layoutData. URL canvasId:', canvasIdParam, 'Data ID:', canvasDataObject.id);
            // Fall through to try and get from store, which will likely be default.
          }
        } catch (e) {
          console.error('[App.tsx] Error processing layoutData from URL:', e);
          // Fall through to try and get from store.
        }
      }
      // If no layoutData, or if it failed, or if ID mismatched, try to get from store.
      // This will pick up the hydrated one on a re-render if hydration worked,
      // or the default one if store is empty/not yet hydrated by URL data.
      const storeState = useDraftStore.getState();
      const canvasFromStore = storeState.currentCanvases.find(c => c.id === canvasIdParam);
      if (canvasFromStore) {
        console.log('[App.tsx] Found canvas in store for ID:', canvasIdParam);
        return canvasFromStore;
      } else {
        // If the store was hydrated by URL data but we didn't find it above (e.g. ID mismatch was ignored),
        // it might be the default canvas.
        console.log('[App.tsx] Canvas not found in store for ID:', canvasIdParam, '. May use default if available.');
        return storeState.currentCanvases.length > 0 ? storeState.currentCanvases[0] : null; // Fallback logic if needed
      }
    }
    return null;
  };

  if (viewType === 'broadcast' && canvasIdParam) {
    const canvasObjectToPass = getCanvasForBroadcast(); // Determine the canvas object
    // console.log("[App.tsx] Canvas object being passed to BroadcastView:", canvasObjectToPass ? canvasObjectToPass.id : "null");

    if (canvasObjectToPass) {
      return (
        <Suspense fallback={<LoadingScreen />}>
          <BroadcastView canvasToRenderFromApp={canvasObjectToPass} />
        </Suspense>
      );
    } else {
      return (
        <div style={{color: 'white', backgroundColor:'red', padding: '20px', fontSize: '18px', position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:100000}}>
          Broadcast View Error: Canvas with ID '{canvasIdParam}' could not be loaded or found.
          URL layoutData processing might have failed or no such canvas exists in the initial state.
          Check console for errors if `layoutData` was provided.
        </div>
      );
    }
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col min-h-screen">
        <Navigation />
        <main className="flex-grow">
          <Suspense fallback={<LoadingScreen />}>
            {/* Updated Routes */}
            <Routes>
              <Route path="/technical" element={<TechnicalInterface />} />
              <Route path="/studio" element={<StudioInterface />} />
              <Route path="/" element={<Navigate to="/technical" replace />} /> {/* Default to technical */}
              <Route path="*" element={<Navigate to="/technical" replace />} /> {/* Catch all to technical */}
            </Routes>
          </Suspense>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default App;
