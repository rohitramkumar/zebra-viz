import { Referee } from '../types';

interface RefereeStatsCardProps {
  referee: Referee;
}

export default function RefereeStatsCard({ referee }: RefereeStatsCardProps) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.title}>📊 Stats</h2>
      </div>
      <div style={styles.body}>
        <div style={styles.statBlock}>
          <div style={styles.statIcon}>✈️</div>
          <div style={styles.statLabel}>Total Miles Travelled</div>
          <div style={styles.statValue}>{referee.totalMilesTravelled.toLocaleString()} mi</div>
        </div>
        <div style={styles.divider} />
        <div style={styles.statBlock}>
          <div style={styles.statIcon}>🏀</div>
          <div style={styles.statLabel}>Most Common Teams</div>
          <div style={styles.teamList}>
            {referee.mostCommonTeams.map((t) => (
              <div key={t.name} style={styles.teamRow}>
                <span style={styles.teamName}>{t.name}</span>
                <span style={styles.teamCount}>{t.count} {t.count === 1 ? 'game' : 'games'}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={styles.divider} />
        <div style={styles.statBlock}>
          <div style={styles.statIcon}>🔥</div>
          <div style={styles.statLabel}>Longest Working Streak</div>
          <div style={styles.statValue}>{referee.daysWorkedStreak} {referee.daysWorkedStreak === 1 ? 'day' : 'days'}</div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    flexShrink: 0,
    minWidth: '200px',
    width: '240px',
  },
  cardHeader: {
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#111827',
  },
  body: {
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  statBlock: {
    paddingTop: '10px',
    paddingBottom: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statIcon: {
    fontSize: '1.1rem',
  },
  statLabel: {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  statValue: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#111827',
  },
  divider: {
    height: '1px',
    backgroundColor: '#e5e7eb',
  },
  teamList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    marginTop: '2px',
  },
  teamRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  teamName: {
    fontSize: '0.8rem',
    fontWeight: 500,
    color: '#111827',
  },
  teamCount: {
    fontSize: '0.7rem',
    color: '#6b7280',
    whiteSpace: 'nowrap',
  },
};
