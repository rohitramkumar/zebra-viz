import { useState, useMemo, useRef, useEffect } from 'react';
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
  maxHeight: number;
}

export default function MapVisualization({ referee }: MapVisualizationProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
  const [timelineProgress, setTimelineProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipHideTimeoutRef = useRef<number | null>(null);

  const sortedGames: Game[] = useMemo(
    () => [...referee.games].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [referee.games]
  );

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

  const timelineStops = useMemo(
    () => sortedGames
      .map((game, gameIndex) => {
        const point = projection([game.coordinates[1], game.coordinates[0]]);
        if (!point) return null;
        return { gameIndex, point };
      })
      .filter((stop): stop is { gameIndex: number; point: [number, number] } => stop !== null),
    [sortedGames]
  );

  const routePoints = useMemo(
    () => timelineStops.map((stop) => stop.point),
    [timelineStops]
  );

  useEffect(() => {
    setIsTimelinePlaying(false);
    setTimelineProgress(0);
    setTooltip(null);
  }, [referee.id]);

  useEffect(() => {
    return () => {
      if (tooltipHideTimeoutRef.current !== null) {
        window.clearTimeout(tooltipHideTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isTimelinePlaying || routePoints.length < 2) return;

    const segmentDurationMs = 900;
    const totalSegments = routePoints.length - 1;
    let frameId = 0;
    let startTime = 0;

    const tick = (timestamp: number) => {
      if (startTime === 0) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const nextProgress = Math.min(totalSegments, elapsed / segmentDurationMs);
      setTimelineProgress(nextProgress);

      if (nextProgress < totalSegments) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        setIsTimelinePlaying(false);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [isTimelinePlaying, routePoints]);

  const timelinePolylinePoints = useMemo(() => {
    if (!isTimelinePlaying || routePoints.length < 2) return '';

    const totalSegments = routePoints.length - 1;
    const clampedProgress = Math.max(0, Math.min(timelineProgress, totalSegments));
    const completedSegments = Math.floor(clampedProgress);
    const partial = clampedProgress - completedSegments;
    const points: [number, number][] = routePoints.slice(0, completedSegments + 1);

    if (completedSegments < totalSegments) {
      const [x1, y1] = routePoints[completedSegments];
      const [x2, y2] = routePoints[completedSegments + 1];
      const interp: [number, number] = [x1 + (x2 - x1) * partial, y1 + (y2 - y1) * partial];
      points.push(interp);
    }

    if (points.length < 2) return '';
    return points.map((p) => p.join(',')).join(' ');
  }, [isTimelinePlaying, routePoints, timelineProgress]);

  const visibleGameIndex = useMemo(() => {
    if (!isTimelinePlaying) return Number.POSITIVE_INFINITY;
    if (timelineStops.length === 0) return -1;

    const visibleStops = Math.min(timelineStops.length, Math.floor(timelineProgress) + 1);
    if (visibleStops <= 0) return -1;

    return timelineStops[visibleStops - 1].gameIndex;
  }, [isTimelinePlaying, timelineProgress, timelineStops]);

  const handlePlayTimeline = () => {
    if (routePoints.length < 2) return;
    setTooltip(null);
    setTimelineProgress(0);
    setIsTimelinePlaying(true);
  };

  const handleStopTimeline = () => {
    setIsTimelinePlaying(false);
    setTimelineProgress(0);
    setTooltip(null);
  };

  const cancelTooltipHide = () => {
    if (tooltipHideTimeoutRef.current !== null) {
      window.clearTimeout(tooltipHideTimeoutRef.current);
      tooltipHideTimeoutRef.current = null;
    }
  };

  const scheduleTooltipHide = () => {
    cancelTooltipHide();
    tooltipHideTimeoutRef.current = window.setTimeout(() => {
      setTooltip(null);
      tooltipHideTimeoutRef.current = null;
    }, 120);
  };

  return (
    <div ref={containerRef} style={{ borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', minHeight: '360px', height: '680px', background: '#d4e9f7', position: 'relative' }}>
      <button
        type="button"
        onClick={handlePlayTimeline}
        disabled={isTimelinePlaying || routePoints.length < 2}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 10,
          border: '1px solid #d1d5db',
          background: 'white',
          color: '#1f2937',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '0.85rem',
          fontWeight: 600,
          cursor: isTimelinePlaying || routePoints.length < 2 ? 'not-allowed' : 'pointer',
          opacity: isTimelinePlaying || routePoints.length < 2 ? 0.65 : 1,
        }}
      >
        {isTimelinePlaying ? 'Playing Timeline…' : 'Show Travel Timeline'}
      </button>
      {isTimelinePlaying && (
        <button
          type="button"
          onClick={handleStopTimeline}
          style={{
            position: 'absolute',
            top: 12,
            right: 172,
            zIndex: 10,
            border: '1px solid #d1d5db',
            background: 'white',
            color: '#1f2937',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Stop & Reset
        </button>
      )}
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

        {/* Animated travel timeline */}
        {timelinePolylinePoints && (
          <polyline
            points={timelinePolylinePoints}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="8,5"
            opacity={0.8}
            aria-hidden="true"
          />
        )}

        {/* Game markers — one bubble per city, collapsed if multiple games */}
        {cityGroups.map((group) => {
          if (isTimelinePlaying && !group.indices.some((idx) => idx <= visibleGameIndex)) {
            return null;
          }
          const pt = projection([group.coordinates[1], group.coordinates[0]]);
          if (!pt) return null;
          const [x, y] = pt;
          const count = group.games.length;
          const markerRadius = count === 1 ? 6 : 6 + Math.sqrt(count - 1) * 3;
          const label = count === 1
            ? `Game ${group.indices[0] + 1}: ${group.games[0].homeTeam.name} vs ${group.games[0].awayTeam.name}, ${formatDate(group.games[0].date)}, ${group.location}`
            : `${count} games in ${group.location}: ${group.games.map((_g, i) => `Game ${group.indices[i] + 1}`).join(', ')}`;
          const showTooltip = (e: React.SyntheticEvent) => {
            cancelTooltipHide();
            const svgEl = (e.currentTarget as SVGGElement).ownerSVGElement!;
            const svgRect = svgEl.getBoundingClientRect();
            const containerRect = containerRef.current!.getBoundingClientRect();
            const scaleX = svgRect.width / W;
            const scaleY = svgRect.height / H;
            const anchorX = x * scaleX + (svgRect.left - containerRect.left);
            const anchorY = y * scaleY + (svgRect.top - containerRect.top);
            const estimatedTooltipWidth = Math.min(320, containerRect.width - 20);
            const maxHeight = Math.min(360, Math.max(140, containerRect.height - 24));

            let tooltipX = anchorX + 12;
            if (tooltipX + estimatedTooltipWidth > containerRect.width - 8) {
              tooltipX = Math.max(8, anchorX - estimatedTooltipWidth - 12);
            }

            let tooltipY = anchorY - 10;
            if (tooltipY + maxHeight > containerRect.height - 8) {
              tooltipY = containerRect.height - maxHeight - 8;
            }
            if (tooltipY < 8) {
              tooltipY = 8;
            }

            setTooltip({
              x: tooltipX,
              y: tooltipY,
              games: group.games,
              indices: group.indices,
              location: group.location,
              maxHeight,
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
              onMouseLeave={scheduleTooltipHide}
              onBlur={scheduleTooltipHide}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') showTooltip(e); }}
            >
              <title>{label}</title>
              <circle r={markerRadius} fill="#3b82f6" stroke="white" strokeWidth={2} filter="url(#shadow)" />
            </g>
          );
        })}
      </svg>

      {/* Tooltip overlay — positioned absolutely within the container */}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '10px 14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            pointerEvents: 'auto',
            minWidth: '180px',
            maxWidth: '320px',
            maxHeight: `${tooltip.maxHeight}px`,
            overflowY: 'auto',
            fontSize: '0.85rem',
          }}
          onMouseEnter={cancelTooltipHide}
          onMouseLeave={scheduleTooltipHide}
          onFocus={cancelTooltipHide}
          onBlur={scheduleTooltipHide}
          role="tooltip"
        >
          <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>📍 {tooltip.location}</p>
          {tooltip.games.map((game, i) => (
            <div key={i} style={{ marginBottom: i < tooltip.games.length - 1 ? '8px' : 0, borderTop: i > 0 ? '1px solid #e5e7eb' : undefined, paddingTop: i > 0 ? '8px' : undefined }}>
              <strong>Game {tooltip.indices[i] + 1}</strong>
              <p style={{ margin: '4px 0', color: '#6b7280', fontSize: '0.8rem' }}>{formatDate(game.date)}</p>
              <p style={{ margin: '4px 0' }}><strong>{game.homeTeam.name}</strong></p>
              <p style={{ margin: '2px 0', color: '#6b7280', fontSize: '0.8rem' }}>vs</p>
              <p style={{ margin: '4px 0' }}><strong>{game.awayTeam.name}</strong></p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
