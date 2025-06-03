import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import useDraftStore from './store/draftStore';

// Lazy load page components for code splitting
const TechnicalInterface = lazy(() => import('./pages/TechnicalInterface'));
const BroadcastView = lazy(() => import('./pages/BroadcastView'));

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

// Home page component
const HomePage = () => {
  const [draftUrl, setDraftUrl] = useState('');
  const { connectToDraft, connectionStatus, connectionError } = useDraftStore();

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (draftUrl.trim()) {
      await connectToDraft(draftUrl);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-aoe-dark p-4">
      <h1 className="text-4xl font-medieval text-aoe-gold mb-6">AoE4 Draft Overlay</h1>
      <p className="text-aoe-light text-center max-w-md mb-8">
        Real-time draft data visualization for Age of Empires IV broadcasts and streams.
        Connect to an aoe2cm.net draft and customize your view.
      </p>

      <div className="w-full max-w-md bg-ui-background rounded-md shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-medieval text-aoe-gold mb-4">Connect to Draft</h2>
        <form onSubmit={handleConnect} className="mb-4">
          <div className="mb-4">
            <label htmlFor="draftUrl" className="block text-aoe-light mb-2">
              Draft ID or URL
            </label>
            <input
              type="text"
              id="draftUrl"
              className="input-field w-full"
              placeholder="e.g., 12345 or https://aoe2cm.net/draft/12345"
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="button-primary w-full"
            disabled={connectionStatus === 'connecting'}
          >
            {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect'}
          </button>
        </form>

        {connectionError && (
          <div className="bg-ban bg-opacity-10 border border-ban p-3 rounded-md mb-4">
            <p className="text-ban-light">{connectionError}</p>
          </div>
        )}

        {connectionStatus === 'connected' && (
          <div className="bg-pick bg-opacity-10 border border-pick p-3 rounded-md mb-4">
            <p className="text-pick-light">Connected successfully!</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <Link
          to="/technical"
          className="bg-ui-background hover:bg-ui-secondary transition-colors rounded-md shadow-lg p-6 text-center"
        >
          <h2 className="text-2xl font-medieval text-aoe-gold mb-2">Technical Interface</h2>
          <p className="text-aoe-light mb-4">
            Manage draft data and customize the broadcast view with draggable elements
          </p>
          <div className="button-primary">Open Technical Interface</div>
        </Link>

        <Link
          to="/broadcast"
          className="bg-ui-background hover:bg-ui-secondary transition-colors rounded-md shadow-lg p-6 text-center"
        >
          <h2 className="text-2xl font-medieval text-aoe-gold mb-2">Broadcast View</h2>
          <p className="text-aoe-light mb-4">
            Transparent overlay optimized for OBS and streaming software
          </p>
          <div className="button-primary">Open Broadcast View</div>
        </Link>
      </div>
    </div>
  );
};

// Navigation component
const Navigation = () => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);

  // Hide navigation on broadcast view
  useEffect(() => {
    setIsVisible(location.pathname !== '/broadcast');
  }, [location.pathname]);

  if (!isVisible) return null;

  return (
    <nav className="bg-ui-background shadow-md py-3 px-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-medieval text-aoe-gold">
          AoE4 Draft Overlay
        </Link>
        <div className="flex space-x-4">
          <Link
            to="/"
            className={`transition-colors ${
              location.pathname === '/' ? 'text-aoe-gold' : 'text-aoe-light hover:text-aoe-tan'
            }`}
          >
            Home
          </Link>
          <Link
            to="/technical"
            className={`transition-colors ${
              location.pathname === '/technical' ? 'text-aoe-gold' : 'text-aoe-light hover:text-aoe-tan'
            }`}
          >
            Technical
          </Link>
          <Link
            to="/broadcast"
            className={`transition-colors ${
              location.pathname === '/broadcast' ? 'text-aoe-gold' : 'text-aoe-light hover:text-aoe-tan'
            }`}
          >
            Broadcast
          </Link>
        </div>
      </div>
    </nav>
  );
};

const App: React.FC = () => {
  const { connectionStatus } = useDraftStore();

  return (
    <ErrorBoundary>
      <div className="flex flex-col min-h-screen">
        <Navigation />
        <main className="flex-grow">
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route 
                path="/technical" 
                element={
                  connectionStatus === 'connected' 
                    ? <TechnicalInterface /> 
                    : <Navigate to="/" replace />
                } 
              />
              <Route 
                path="/broadcast" 
                element={
                  connectionStatus === 'connected' 
                    ? <BroadcastView /> 
                    : <Navigate to="/" replace />
                } 
              />
               <Route 
                path="/broadcast/:draftId" // Route for direct broadcast view with ID
                element={ <BroadcastView />} 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default App;
