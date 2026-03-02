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
          <div key={index} style={styles.gameItem}>
            <div style={styles.gameNumber}>{index + 1}</div>
            <div style={styles.gameDetails}>
              <div style={styles.gameTeams}>
                <span style={styles.homeTeam}>
                  {game.homeTeam.name}
                </span>
                <span style={styles.vs}>vs</span>
                <span style={styles.awayTeam}>
                  {game.awayTeam.name}
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
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  cardHeader: {
    padding: '10px 12px',
    backgroundColor: 'var(--bg-surface-alt)',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refereeName: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  totalBadge: {
    fontSize: '0.7rem',
    fontWeight: 600,
    backgroundColor: 'var(--accent-badge-bg)',
    color: 'var(--accent-primary-text)',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  gameList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '10px',
    overflowY: 'scroll',
    scrollbarGutter: 'stable',
    maxHeight: 'min(280px, 34vh)',
  },
  gameItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '8px 10px',
    backgroundColor: 'var(--bg-surface-alt)',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
  },
  gameNumber: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-primary)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.7rem',
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
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  vs: {
    fontSize: '0.7rem',
    color: 'var(--text-very-muted)',
    fontStyle: 'italic',
  },
  awayTeam: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  gameMeta: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  gameDate: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
  },
  gameLocation: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
  },
};
