import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Referee, Game } from '../types';

// Fix Leaflet default icon URLs
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createNumberedIcon(number: number): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      background-color: #3b82f6;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">${number}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface MapVisualizationProps {
  referee: Referee;
}

export default function MapVisualization({ referee }: MapVisualizationProps) {
  // Force map to re-render when referee changes by using key
  useEffect(() => {}, [referee.id]);

  const sortedGames: Game[] = [...referee.games].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const polylinePositions: [number, number][] = sortedGames.map(
    game => game.coordinates
  );

  return (
    <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', minHeight: '300px' }}>
      <MapContainer
        key={referee.id}
        center={[39.5, -98.35]}
        zoom={4}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline
          positions={polylinePositions}
          pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '6, 4', opacity: 0.7 }}
        />
        {sortedGames.map((game, index) => (
          <Marker
            key={game.id}
            position={game.coordinates}
            icon={createNumberedIcon(index + 1)}
          >
            <Popup>
              <div style={{ minWidth: '180px' }}>
                <strong style={{ fontSize: '0.9rem' }}>Game {index + 1}</strong>
                <p style={{ margin: '4px 0', fontSize: '0.8rem', color: '#6b7280' }}>
                  {formatDate(game.date)}
                </p>
                <p style={{ margin: '4px 0', fontSize: '0.85rem' }}>
                  <strong>{game.homeTeam.location} {game.homeTeam.name}</strong>
                </p>
                <p style={{ margin: '2px 0', fontSize: '0.8rem', color: '#6b7280' }}>vs</p>
                <p style={{ margin: '4px 0', fontSize: '0.85rem' }}>
                  <strong>{game.awayTeam.location} {game.awayTeam.name}</strong>
                </p>
                <p style={{ margin: '4px 0', fontSize: '0.8rem', color: '#374151' }}>
                  📍 {game.location}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
