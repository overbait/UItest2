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

const App: React.FC = () => {
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
