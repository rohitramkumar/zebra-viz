import { useState, useMemo, useRef } from 'react';
import { geoAlbersUsa, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, Objects } from 'topojson-specification';
import statesData from 'us-atlas/states-10m.json';
import { Referee, Game } from '../types';

// SVG viewport dimensions
const W = 960;
const H = 600;

// Build projection and path generator once at module level
const projection = geoAlbersUsa().scale(1300).translate([W / 2, H / 2]);
const pathGen = geoPath(projection);

// Convert TopoJSON → GeoJSON once at module level
type UsTopology = Topology<Objects<Record<string, unknown>>>;
const statesGeo = feature(statesData as unknown as UsTopology, (statesData as unknown as UsTopology).objects['states']);

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

interface CityGroup {
  location: string;
  coordinates: [number, number];
  games: Game[];
  indices: number[];
}

interface TooltipState {
  x: number;
  y: number;
  games: Game[];
  indices: number[];
  location: string;
}

export default function MapVisualization({ referee }: MapVisualizationProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sortedGames: Game[] = useMemo(
    () => [...referee.games].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [referee.games]
  );

  // Project [lat, lng] → [svgX, svgY]
  const projected: ([number, number] | null)[] = useMemo(
    () => sortedGames.map(g => projection([g.coordinates[1], g.coordinates[0]])),
    [sortedGames]
  );

  const polylinePoints = projected
    .filter((p): p is [number, number] => p !== null)
    .map(p => p.join(','))
    .join(' ');

  // Group games by city coordinates so multiple games in same city share one bubble
  const cityGroups: CityGroup[] = useMemo(() => {
    const map = new Map<string, CityGroup>();
    sortedGames.forEach((game, index) => {
      const key = `${game.coordinates[0]},${game.coordinates[1]}`;
      if (map.has(key)) {
        const group = map.get(key)!;
        group.games.push(game);
        group.indices.push(index);
      } else {
        map.set(key, {
          location: game.location,
          coordinates: game.coordinates,
          games: [game],
          indices: [index],
        });
      }
    });
    return Array.from(map.values());
  }, [sortedGames]);

  return (
    <div ref={containerRef} style={{ borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', minHeight: '300px', height: '600px', resize: 'vertical', background: '#d4e9f7', position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', display: 'block' }}
        aria-label={`Travel map for ${referee.name}`}
        role="img"
      >
        <defs>
          <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx={0} dy={2} stdDeviation={2} floodOpacity={0.3} />
          </filter>
        </defs>

        {/* US states */}
        {'features' in statesGeo && statesGeo.features.map((feat, i) => (
          <path
            key={i}
            d={pathGen(feat) ?? ''}
            fill="#e8f0e0"
            stroke="#9ab07a"
            strokeWidth={0.5}
          />
        ))}

        {/* Travel route */}
        {polylinePoints && (
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="8,5"
            opacity={0.75}
            aria-hidden="true"
          />
        )}

        {/* Game markers — one bubble per city, collapsed if multiple games */}
        {cityGroups.map((group) => {
          const pt = projection([group.coordinates[1], group.coordinates[0]]);
          if (!pt) return null;
          const [x, y] = pt;
          const count = group.games.length;
          const label = count === 1
            ? `Game ${group.indices[0] + 1}: ${group.games[0].homeTeam.location} ${group.games[0].homeTeam.name} vs ${group.games[0].awayTeam.location} ${group.games[0].awayTeam.name}, ${formatDate(group.games[0].date)}, ${group.location}`
            : `${count} games in ${group.location}: ${group.games.map((_g, i) => `Game ${group.indices[i] + 1}`).join(', ')}`;
          const showTooltip = (e: React.SyntheticEvent) => {
            const svgEl = (e.currentTarget as SVGGElement).ownerSVGElement!;
            const svgRect = svgEl.getBoundingClientRect();
            const containerRect = containerRef.current!.getBoundingClientRect();
            const scaleX = svgRect.width / W;
            const scaleY = svgRect.height / H;
            setTooltip({
              x: x * scaleX + (svgRect.left - containerRect.left),
              y: y * scaleY + (svgRect.top - containerRect.top),
              games: group.games,
              indices: group.indices,
              location: group.location,
            });
          };
          return (
            <g
              key={`${group.coordinates[0]},${group.coordinates[1]}`}
              transform={`translate(${x},${y})`}
              style={{ cursor: 'pointer' }}
              role="button"
              tabIndex={0}
              aria-label={label}
              onMouseEnter={showTooltip}
              onFocus={showTooltip}
              onMouseLeave={() => setTooltip(null)}
              onBlur={() => setTooltip(null)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') showTooltip(e); }}
            >
              <title>{label}</title>
              <circle r={14} fill="#3b82f6" stroke="white" strokeWidth={2} filter="url(#shadow)" />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize={11}
                fontWeight={700}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
                aria-hidden="true"
              >
                {count > 1 ? count : group.indices[0] + 1}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip overlay — positioned absolutely within the container */}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x + 12,
            top: tooltip.y - 10,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '10px 14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            pointerEvents: 'none',
            minWidth: '180px',
            fontSize: '0.85rem',
          }}
          role="tooltip"
        >
          <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>📍 {tooltip.location}</p>
          {tooltip.games.map((game, i) => (
            <div key={game.id} style={{ marginBottom: i < tooltip.games.length - 1 ? '8px' : 0, borderTop: i > 0 ? '1px solid #e5e7eb' : undefined, paddingTop: i > 0 ? '8px' : undefined }}>
              <strong>Game {tooltip.indices[i] + 1}</strong>
              <p style={{ margin: '4px 0', color: '#6b7280', fontSize: '0.8rem' }}>{formatDate(game.date)}</p>
              <p style={{ margin: '4px 0' }}><strong>{game.homeTeam.location} {game.homeTeam.name}</strong></p>
              <p style={{ margin: '2px 0', color: '#6b7280', fontSize: '0.8rem' }}>vs</p>
              <p style={{ margin: '4px 0' }}><strong>{game.awayTeam.location} {game.awayTeam.name}</strong></p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
