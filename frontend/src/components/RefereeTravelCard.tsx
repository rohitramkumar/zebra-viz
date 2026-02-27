import { Referee } from '../types';

interface RefereeTravelCardProps {
  referee: Referee;
}

export default function RefereeTravelCard({ referee }: RefereeTravelCardProps) {
  const sortedGames = [...referee.games].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.refereeName}>📋 {referee.name}'s Game Assignments</h2>
        <span style={styles.totalBadge}>{referee.games.length} total games</span>
      </div>
      <div style={styles.gameList}>
        {sortedGames.map((game, index) => (
          <div key={game.id} style={styles.gameItem}>
            <div style={styles.gameNumber}>{index + 1}</div>
            <div style={styles.gameDetails}>
              <div style={styles.gameTeams}>
                <span style={styles.homeTeam}>
                  {game.homeTeam.location} {game.homeTeam.name}
                </span>
                <span style={styles.vs}>vs</span>
                <span style={styles.awayTeam}>
                  {game.awayTeam.location} {game.awayTeam.name}
                </span>
              </div>
              <div style={styles.gameMeta}>
                <span style={styles.gameDate}>📅 {formatDate(game.date)}</span>
                <span style={styles.gameLocation}>📍 {game.location}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refereeName: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#111827',
  },
  totalBadge: {
    fontSize: '0.75rem',
    fontWeight: 600,
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    padding: '2px 10px',
    borderRadius: '12px',
  },
  gameList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    overflowY: 'auto',
    flex: 1,
  },
  gameItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px 12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  gameNumber: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  gameDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  gameTeams: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  homeTeam: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#111827',
  },
  vs: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  awayTeam: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#374151',
  },
  gameMeta: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  gameDate: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  gameLocation: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
};
