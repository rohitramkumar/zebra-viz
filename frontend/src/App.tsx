import { useState, useEffect } from 'react';
import './App.css';
import { Referee, RefereeListItem } from './types';
import RefereeSidebar from './components/RefereeSidebar';
import MapVisualization from './components/MapVisualization';
import RefereeTravelCard from './components/RefereeTravelCard';
import RefereeStatsCard from './components/RefereeStatsCard';

function App() {
  const [referees, setReferees] = useState<RefereeListItem[]>([]);
  const [selectedReferee, setSelectedReferee] = useState<Referee | null>(null);
  const [selectedRefereeId, setSelectedRefereeId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/referees')
      .then(res => res.json())
      .then((data: RefereeListItem[]) => {
        setReferees(data);
        if (data.length > 0) {
          setLastUpdated(data[0].lastUpdated);
        }
        setListLoading(false);
      })
      .catch(() => setListLoading(false));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleSelectReferee = (id: string) => {
    setSelectedRefereeId(id);
    setDetailLoading(true);
    setIsSidebarOpen(false);
    fetch(`/api/referees/${id}`)
      .then(res => res.json())
      .then((data: Referee) => {
        setSelectedReferee(data);
        setDetailLoading(false);
      })
      .catch(() => setDetailLoading(false));
  };

  return (
    <div className="app">
      <header className="app-header">
        <button
          className="hamburger-btn"
          onClick={() => setIsSidebarOpen(o => !o)}
          aria-label="Toggle referee list"
          aria-expanded={isSidebarOpen}
        >
          ☰
        </button>
        <h1>Zebra Viz - NCAA Mens Basketball Referee Tracker</h1>
        <button
          className="theme-toggle-btn"
          onClick={() => setIsDarkMode(d => !d)}
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </header>
      <div className="app-content">
        <RefereeSidebar
          referees={referees}
          selectedRefereeId={selectedRefereeId}
          onSelectReferee={handleSelectReferee}
          loading={listLoading}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <main className="main-area">
          {detailLoading ? (
            <div className="welcome-message">
              <div className="welcome-icon">⏳</div>
              <h2>Loading referee data...</h2>
            </div>
          ) : selectedReferee ? (
            <div className="dashboard-layout">
              <div className="map-column">
                <MapVisualization referee={selectedReferee} />
              </div>
              <div className="details-column">
                <div className="details-card-wrap">
                  <RefereeTravelCard referee={selectedReferee} />
                </div>
                <div className="details-card-wrap">
                  <RefereeStatsCard referee={selectedReferee} />
                </div>
              </div>
            </div>
          ) : (
            <div className="welcome-message">
              <div className="welcome-icon">🦓</div>
              <h2>Select a Referee</h2>
              <p>Choose a referee from the sidebar to view their game assignments and travel map.</p>
            </div>
          )}
        </main>
      </div>
      <footer className="app-footer">
        Built on data from kenpom.com{lastUpdated && ` · Last updated: ${formatLastUpdated(lastUpdated)}`}
      </footer>
    </div>
  );
}

function formatLastUpdated(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default App;
