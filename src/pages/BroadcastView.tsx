import React, { useEffect, useState, useRef } from 'react';
import useDraftStore from '../store/draftStore';
import { Civilization, GameMap } from '../types/draft';

// Animated element that fades in/slides when content changes
const AnimatedElement: React.FC<{
  children: React.ReactNode;
  type?: 'fade' | 'slide' | 'bounce' | 'none';
  duration?: number;
  enabled?: boolean;
  className?: string;
}> = ({ children, type = 'fade', duration = 500, enabled = true, className = '' }) => {
  const [content, setContent] = useState<React.ReactNode>(children);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const prevChildrenRef = useRef<React.ReactNode>(children);

  useEffect(() => {
    let timerId: number | undefined;

    // Skip animation on initial render or if animations are disabled
    if (prevChildrenRef.current !== children && enabled) {
      setIsAnimating(true);
      timerId = setTimeout(() => {
        setContent(children);
        setIsAnimating(false);
      }, duration / 2);
    } else {
      setContent(children);
    }
    
    prevChildrenRef.current = children;

    // Cleanup function
    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [children, duration, enabled]);

  // Animation classes based on type
  const getAnimationClass = () => {
    if (!enabled || type === 'none') return '';
    
    if (isAnimating) {
      switch (type) {
        case 'fade':
          return 'opacity-0 transition-opacity';
        case 'slide':
          return 'opacity-0 -translate-y-2 transition-all';
        case 'bounce':
          return 'opacity-0 scale-95 transition-all';
        default:
          return '';
      }
    } else {
      switch (type) {
        case 'fade':
          return 'opacity-100 transition-opacity';
        case 'slide':
          return 'opacity-100 translate-y-0 transition-all';
        case 'bounce':
          return 'opacity-100 scale-100 transition-all';
        default:
          return '';
      }
    }
  };

  return (
    <div 
      className={`${className} ${getAnimationClass()}`}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {content}
    </div>
  );
};

// Component for displaying a list of civilizations
const CivilizationList: React.FC<{
  title: string;
  civilizations: Civilization[];
  type: 'pick' | 'ban' | 'snipe';
  titleColor: string;
  actionColor: string;
  fontClass: string;
}> = ({ title, civilizations, type, titleColor, actionColor, fontClass }) => {
  if (civilizations.length === 0) return null;
  
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold mb-1" style={{ color: titleColor }}>
        {title}
      </h3>
      <ul className="space-y-1">
        {civilizations.map((civ, index) => (
          <li 
            key={`${type}-${index}`} 
            className={`${fontClass} text-sm flex items-center`}
          >
            <span 
              className="w-2 h-2 rounded-full mr-2" 
              style={{ backgroundColor: actionColor }}
            ></span>
            {civ.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

// Component for displaying maps
const MapList: React.FC<{
  maps: GameMap[];
  type: 'pick' | 'ban';
  actionColor: string;
  fontClass: string;
}> = ({ maps, type, actionColor, fontClass }) => {
  if (maps.length === 0) return null;
  
  return (
    <ul className="space-y-1">
      {maps.map((map, index) => (
        <li 
          key={`map-${type}-${index}`} 
          className={`${fontClass} text-sm flex items-center`}
        >
          <span 
            className="w-2 h-2 rounded-full mr-2" 
            style={{ backgroundColor: actionColor }}
          ></span>
          {map.name}
        </li>
      ))}
    </ul>
  );
};

// Main Broadcast View component
const BroadcastView: React.FC = () => {
  const { 
    draft, 
    uiConfig, 
    turnTimer, 
    connectionStatus 
  } = useDraftStore();

  // Ensure the background is transparent
  useEffect(() => {
    document.body.classList.add('transparent-bg');
    document.documentElement.classList.add('transparent-bg');
    
    // Cleanup function to remove classes when component unmounts
    return () => {
      document.body.classList.remove('transparent-bg');
      document.documentElement.classList.remove('transparent-bg');
    };
  }, []);

  if (!draft) {
    return (
      <div className="fixed top-4 left-4 bg-ui-background bg-opacity-70 p-3 rounded-md text-aoe-light text-sm">
        No draft data available. Please connect to a draft in the technical interface.
      </div>
    );
  }

  return (
    <div className="broadcast-view fixed inset-0 overflow-hidden transparent-bg">
      {/* Background image if available */}
      {uiConfig.images?.background && (
        <div 
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `url(${uiConfig.images.background})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.3
          }}
        />
      )}

      {/* Host Name */}
      {uiConfig.positions?.hostName?.visible !== false && (
        <div
          className="absolute broadcast-container"
          style={{
            left: uiConfig.positions?.hostName?.x ?? 0,
            top: uiConfig.positions?.hostName?.y ?? 0,
            width: uiConfig.positions?.hostName?.width ?? 200,
            height: uiConfig.positions?.hostName?.height ?? 40,
            zIndex: uiConfig.positions?.hostName?.zIndex ?? 10,
          }}
        >
          <AnimatedElement
            enabled={uiConfig.animations?.enabled ?? true}
            type={uiConfig.animations?.type ?? 'fade'}
            duration={uiConfig.animations?.duration ?? 500}
            className={`${uiConfig.fonts?.playerNames ?? 'font-medieval'} h-full flex items-center`}
          >
            <div 
              className="px-3 py-2 bg-ui-background bg-opacity-70 rounded-md"
              style={{ color: uiConfig.colors?.hostHighlight ?? '#4CAF50' }}
            >
              {draft.host.name}
            </div>
          </AnimatedElement>
        </div>
      )}

      {/* Guest Name */}
      {uiConfig.positions?.guestName?.visible !== false && (
        <div
          className="absolute broadcast-container"
          style={{
            left: uiConfig.positions?.guestName?.x ?? 0,
            top: uiConfig.positions?.guestName?.y ?? 0,
            width: uiConfig.positions?.guestName?.width ?? 200,
            height: uiConfig.positions?.guestName?.height ?? 40,
            zIndex: uiConfig.positions?.guestName?.zIndex ?? 10,
          }}
        >
          <AnimatedElement
            enabled={uiConfig.animations?.enabled ?? true}
            type={uiConfig.animations?.type ?? 'fade'}
            duration={uiConfig.animations?.duration ?? 500}
            className={`${uiConfig.fonts?.playerNames ?? 'font-medieval'} h-full flex items-center`}
          >
            <div 
              className="px-3 py-2 bg-ui-background bg-opacity-70 rounded-md"
              style={{ color: uiConfig.colors?.guestHighlight ?? '#2196F3' }}
            >
              {draft.guest.name}
            </div>
          </AnimatedElement>
        </div>
      )}

      {/* Host Score */}
      {uiConfig.positions?.hostScore?.visible !== false && (
        <div
          className="absolute broadcast-container"
          style={{
            left: uiConfig.positions?.hostScore?.x ?? 0,
            top: uiConfig.positions?.hostScore?.y ?? 0,
            width: uiConfig.positions?.hostScore?.width ?? 40,
            height: uiConfig.positions?.hostScore?.height ?? 40,
            zIndex: uiConfig.positions?.hostScore?.zIndex ?? 10,
          }}
        >
          <AnimatedElement
            enabled={uiConfig.animations?.enabled ?? true}
            type={uiConfig.animations?.type ?? 'fade'}
            duration={uiConfig.animations?.duration ?? 500}
            className={`${uiConfig.fonts?.playerNames ?? 'font-medieval'} h-full flex items-center justify-center`}
          >
            <div 
              className="w-full h-full flex items-center justify-center bg-ui-background bg-opacity-70 rounded-md"
              style={{ color: uiConfig.colors?.hostHighlight ?? '#4CAF50' }}
            >
              {draft.host.score || 0}
            </div>
          </AnimatedElement>
        </div>
      )}

      {/* Guest Score */}
      {uiConfig.positions?.guestScore?.visible !== false && (
        <div
          className="absolute broadcast-container"
          style={{
            left: uiConfig.positions?.guestScore?.x ?? 0,
            top: uiConfig.positions?.guestScore?.y ?? 0,
            width: uiConfig.positions?.guestScore?.width ?? 40,
            height: uiConfig.positions?.guestScore?.height ?? 40,
            zIndex: uiConfig.positions?.guestScore?.zIndex ?? 10,
          }}
        >
          <AnimatedElement
            enabled={uiConfig.animations?.enabled ?? true}
            type={uiConfig.animations?.type ?? 'fade'}
            duration={uiConfig.animations?.duration ?? 500}
            className={`${uiConfig.fonts?.playerNames ?? 'font-medieval'} h-full flex items-center justify-center`}
          >
            <div 
              className="w-full h-full flex items-center justify-center bg-ui-background bg-opacity-70 rounded-md"
              style={{ color: uiConfig.colors?.guestHighlight ?? '#2196F3' }}
            >
              {draft.guest.score || 0}
            </div>
          </AnimatedElement>
        </div>
      )}

      {/* Host Civilizations */}
      {uiConfig.positions?.hostCivs?.visible !== false && (
        <div
          className="absolute broadcast-container"
          style={{
            left: uiConfig.positions?.hostCivs?.x ?? 0,
            top: uiConfig.positions?.hostCivs?.y ?? 0,
            width: uiConfig.positions?.hostCivs?.width ?? 250,
            height: uiConfig.positions?.hostCivs?.height ?? 300,
            zIndex: uiConfig.positions?.hostCivs?.zIndex ?? 10,
          }}
        >
          <AnimatedElement
            enabled={uiConfig.animations?.enabled ?? true}
            type={uiConfig.animations?.type ?? 'fade'}
            duration={uiConfig.animations?.duration ?? 500}
            className="h-full"
          >
            <div className="h-full p-3 overflow-auto bg-ui-background bg-opacity-70 rounded-md"
                 style={{ color: uiConfig.colors?.text ?? '#F5F5DC' }}>
              <h2 
                className={`${uiConfig.fonts?.playerNames ?? 'font-medieval'} text-base font-semibold mb-2`}
                style={{ color: uiConfig.colors?.hostHighlight ?? '#4CAF50' }}
              >
                {draft.host.name}'s Civilizations
              </h2>
              
              <CivilizationList
                title="Picks"
                civilizations={draft.hostCivs.picks}
                type="pick"
                titleColor={uiConfig.colors?.pick ?? '#4CAF50'}
                actionColor={uiConfig.colors?.pick ?? '#4CAF50'}
                fontClass={uiConfig.fonts?.civilizations ?? 'font-game'}
              />
              
              <CivilizationList
                title="Bans"
                civilizations={draft.hostCivs.bans}
                type="ban"
                titleColor={uiConfig.colors?.ban ?? '#F44336'}
                actionColor={uiConfig.colors?.ban ?? '#F44336'}
                fontClass={uiConfig.fonts?.civilizations ?? 'font-game'}
              />
              
              <CivilizationList
                title="Snipes"
                civilizations={draft.hostCivs.snipes}
                type="snipe"
                titleColor={uiConfig.colors?.snipe ?? '#FF9800'}
                actionColor={uiConfig.colors?.snipe ?? '#FF9800'}
                fontClass={uiConfig.fonts?.civilizations ?? 'font-game'}
              />
            </div>
          </AnimatedElement>
        </div>
      )}

      {/* Guest Civilizations */}
      {uiConfig.positions?.guestCivs?.visible !== false && (
        <div
          className="absolute broadcast-container"
          style={{
            left: uiConfig.positions?.guestCivs?.x ?? 0,
            top: uiConfig.positions?.guestCivs?.y ?? 0,
            width: uiConfig.positions?.guestCivs?.width ?? 250,
            height: uiConfig.positions?.guestCivs?.height ?? 300,
            zIndex: uiConfig.positions?.guestCivs?.zIndex ?? 10,
          }}
        >
          <AnimatedElement
            enabled={uiConfig.animations?.enabled ?? true}
            type={uiConfig.animations?.type ?? 'fade'}
            duration={uiConfig.animations?.duration ?? 500}
            className="h-full"
          >
            <div className="h-full p-3 overflow-auto bg-ui-background bg-opacity-70 rounded-md"
                 style={{ color: uiConfig.colors?.text ?? '#F5F5DC' }}>
              <h2 
                className={`${uiConfig.fonts?.playerNames ?? 'font-medieval'} text-base font-semibold mb-2`}
                style={{ color: uiConfig.colors?.guestHighlight ?? '#2196F3' }}
              >
                {draft.guest.name}'s Civilizations
              </h2>
              
              <CivilizationList
                title="Picks"
                civilizations={draft.guestCivs.picks}
                type="pick"
                titleColor={uiConfig.colors?.pick ?? '#4CAF50'}
                actionColor={uiConfig.colors?.pick ?? '#4CAF50'}
                fontClass={uiConfig.fonts?.civilizations ?? 'font-game'}
              />
              
              <CivilizationList
                title="Bans"
                civilizations={draft.guestCivs.bans}
                type="ban"
                titleColor={uiConfig.colors?.ban ?? '#F44336'}
                actionColor={uiConfig.colors?.ban ?? '#F44336'}
                fontClass={uiConfig.fonts?.civilizations ?? 'font-game'}
              />
              
              <CivilizationList
                title="Snipes"
                civilizations={draft.guestCivs.snipes}
                type="snipe"
                titleColor={uiConfig.colors?.snipe ?? '#FF9800'}
                actionColor={uiConfig.colors?.snipe ?? '#FF9800'}
                fontClass={uiConfig.fonts?.civilizations ?? 'font-game'}
              />
            </div>
          </AnimatedElement>
        </div>
      )}

      {/* Maps */}
      {uiConfig.positions?.maps?.visible !== false && (
        <div
          className="absolute broadcast-container"
          style={{
            left: uiConfig.positions?.maps?.x ?? 0,
            top: uiConfig.positions?.maps?.y ?? 0,
            width: uiConfig.positions?.maps?.width ?? 250,
            height: uiConfig.positions?.maps?.height ?? 200,
            zIndex: uiConfig.positions?.maps?.zIndex ?? 10,
          }}
        >
          <AnimatedElement
            enabled={uiConfig.animations?.enabled ?? true}
            type={uiConfig.animations?.type ?? 'fade'}
            duration={uiConfig.animations?.duration ?? 500}
            className="h-full"
          >
            <div className="h-full p-3 overflow-auto bg-ui-background bg-opacity-70 rounded-md"
                 style={{ color: uiConfig.colors?.text ?? '#F5F5DC' }}>
              <h2 
                className={`${uiConfig.fonts?.playerNames ?? 'font-medieval'} text-base font-semibold mb-2 text-aoe-gold`}
              >
                Maps
              </h2>
              
              <div className="mb-3">
                <h3 className="text-sm font-semibold mb-1" style={{ color: uiConfig.colors?.pick ?? '#4CAF50' }}>
                  Picks
                </h3>
                <MapList
                  maps={draft.maps.picks}
                  type="pick"
                  actionColor={uiConfig.colors?.pick ?? '#4CAF50'}
                  fontClass={uiConfig.fonts?.maps ?? 'font-game'}
                />
              </div>
              
              <div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: uiConfig.colors?.ban ?? '#F44336' }}>
                  Bans
                </h3>
                <MapList
                  maps={draft.maps.bans}
                  type="ban"
                  actionColor={uiConfig.colors?.ban ?? '#F44336'}
                  fontClass={uiConfig.fonts?.maps ?? 'font-game'}
                />
              </div>
            </div>
          </AnimatedElement>
        </div>
      )}

      {/* Status */}
      {uiConfig.positions?.status?.visible !== false && (
        <div
          className="absolute broadcast-container"
          style={{
            left: uiConfig.positions?.status?.x ?? 0,
            top: uiConfig.positions?.status?.y ?? 0,
            width: uiConfig.positions?.status?.width ?? 250,
            height: uiConfig.positions?.status?.height ?? 40,
            zIndex: uiConfig.positions?.status?.zIndex ?? 10,
          }}
        >
          <AnimatedElement
            enabled={uiConfig.animations?.enabled ?? true}
            type={uiConfig.animations?.type ?? 'fade'}
            duration={uiConfig.animations?.duration ?? 500}
            className={`${uiConfig.fonts?.status ?? 'font-technical'} h-full flex items-center justify-center`}
          >
            <div 
              className="w-full h-full flex items-center justify-center bg-ui-background bg-opacity-70 rounded-md px-3"
              style={{ color: uiConfig.colors?.text ?? '#F5F5DC' }}
            >
              <span>
                {draft.status === 'inProgress' && 'Draft in Progress'}
                {draft.status === 'waiting' && 'Waiting for Players'}
                {draft.status === 'completed' && 'Draft Completed'}
                {draft.status === 'abandoned' && 'Draft Abandoned'}
              </span>
            </div>
          </AnimatedElement>
        </div>
      )}

      {/* Timer */}
      {uiConfig.positions?.timer?.visible !== false && (
        <div
          className="absolute broadcast-container"
          style={{
            left: uiConfig.positions?.timer?.x ?? 0,
            top: uiConfig.positions?.timer?.y ?? 0,
            width: uiConfig.positions?.timer?.width ?? 250,
            height: uiConfig.positions?.timer?.height ?? 40,
            zIndex: uiConfig.positions?.timer?.zIndex ?? 10,
          }}
        >
          <AnimatedElement
            enabled={uiConfig.animations?.enabled ?? true}
            type={uiConfig.animations?.type ?? 'fade'}
            duration={uiConfig.animations?.duration ?? 500}
            className={`${uiConfig.fonts?.status ?? 'font-technical'} h-full flex items-center justify-center`}
          >
            <div 
              className="w-full h-full flex items-center justify-center bg-ui-background bg-opacity-70 rounded-md px-3"
              style={{ color: uiConfig.colors?.text ?? '#F5F5DC' }}
            >
              {draft.status === 'inProgress' && (
                <>
                  <span className="mr-2">Turn {draft.currentTurn + 1}:</span>
                  <span className={draft.turns[draft.currentTurn]?.player === 'host' 
                    ? `text-${uiConfig.colors?.hostHighlight ?? '#4CAF50'}`
                    : `text-${uiConfig.colors?.guestHighlight ?? '#2196F3'}`
                  }>
                    {draft.turns[draft.currentTurn]?.player === 'host' ? draft.host.name : draft.guest.name}
                  </span>
                  <span className="mx-2">|</span>
                  <span>{turnTimer.remainingTime}s</span>
                </>
              )}
              {draft.status !== 'inProgress' && (
                <span>
                  {draft.status === 'waiting' && 'Waiting to Start'}
                  {draft.status === 'completed' && 'Draft Complete'}
                  {draft.status === 'abandoned' && 'Draft Abandoned'}
                </span>
              )}
            </div>
          </AnimatedElement>
        </div>
      )}

      {/* Custom images */}
      {Object.entries(uiConfig.images?.customImages ?? {}).map(([name, imageUrl]) => (
        <div
          key={name}
          className="absolute broadcast-container"
          style={{
            left: uiConfig.positions?.customElements?.[name]?.x ?? 0,
            top: uiConfig.positions?.customElements?.[name]?.y ?? 0,
            width: uiConfig.positions?.customElements?.[name]?.width ?? 100,
            height: uiConfig.positions?.customElements?.[name]?.height ?? 100,
            zIndex: uiConfig.positions?.customElements?.[name]?.zIndex ?? 5,
            display: uiConfig.positions?.customElements?.[name]?.visible === false ? 'none' : 'block',
          }}
        >
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-contain"
          />
        </div>
      ))}

      {/* Host Logo */}
      {uiConfig.images?.hostLogo && (
        <div
          className="absolute broadcast-container"
          style={{
            left: uiConfig.positions?.hostName?.x ?? 0,
            top: (uiConfig.positions?.hostName?.y ?? 0) - 50,
            width: 40,
            height: 40,
            zIndex: uiConfig.positions?.hostName?.zIndex ?? 10,
          }}
        >
          <img
            src={uiConfig.images.hostLogo}
            alt="Host Logo"
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* Guest Logo */}
      {uiConfig.images?.guestLogo && (
        <div
          className="absolute broadcast-container"
          style={{
            left: uiConfig.positions?.guestName?.x ?? 0,
            top: (uiConfig.positions?.guestName?.y ?? 0) - 50,
            width: 40,
            height: 40,
            zIndex: uiConfig.positions?.guestName?.zIndex ?? 10,
          }}
        >
          <img
            src={uiConfig.images.guestLogo}
            alt="Guest Logo"
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* Connection status indicator (only visible when disconnected) */}
      {connectionStatus !== 'connected' && (
        <div className="fixed bottom-4 right-4 bg-ui-background bg-opacity-70 p-2 rounded-md text-aoe-light text-xs">
          {connectionStatus === 'connecting' && 'Connecting...'}
          {connectionStatus === 'disconnected' && 'Disconnected'}
          {connectionStatus === 'error' && 'Connection Error'}
        </div>
      )}
    </div>
  );
};

export default BroadcastView;
