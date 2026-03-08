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
                <span style={styles.teamCount}>
                  {t.record.wins}-{t.record.losses} ({t.count} {t.count === 1 ? 'game' : 'games'})
                </span>
              </div>
            ))}
          </div>
        </div>
        <div style={styles.divider} />
        <div style={styles.statBlock}>
          <div style={styles.statIcon}>🔥</div>
          <div style={styles.streakSectionLabel}>Working Streak</div>
          <div style={styles.streakRow}>
            <div style={styles.streakItem}>
              <div style={styles.streakItemLabel}>Longest</div>
              <div style={styles.statValue}>{referee.daysWorkedStreak} {referee.daysWorkedStreak === 1 ? 'day' : 'days'}</div>
            </div>
            <div style={styles.streakItem}>
              <div style={styles.streakItemLabel}>Current</div>
              <div style={styles.statValue}>{referee.currentDaysWorkedStreak} {referee.currentDaysWorkedStreak === 1 ? 'day' : 'days'}</div>
            </div>
          </div>
        </div>
        {referee.favoritePartners.length > 0 && (
          <>
            <div style={styles.divider} />
            <div style={styles.statBlock}>
              <div style={styles.statIcon}>🤝</div>
              <div style={styles.statLabel}>Favorite Partners</div>
              <div style={styles.teamList}>
                {referee.favoritePartners.map((p) => (
                  <div key={p.id} style={styles.teamRow}>
                    <span style={styles.teamName}>{p.name}</span>
                    <span style={styles.teamCount}>
                      {p.count} {p.count === 1 ? 'game' : 'games'} together
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
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
  },
  title: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  body: {
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    overflowY: 'auto',
    flex: 1,
  },
  statBlock: {
    paddingTop: '8px',
    paddingBottom: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statIcon: {
    fontSize: '1rem',
  },
  statLabel: {
    fontSize: '0.65rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  statValue: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  divider: {
    height: '1px',
    backgroundColor: 'var(--border-color)',
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
    fontSize: '0.75rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  teamCount: {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  },
  streakSectionLabel: {
    fontSize: '0.65rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  streakRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: '16px',
    marginTop: '2px',
  },
  streakItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  streakItemLabel: {
    fontSize: '0.6rem',
    fontWeight: 500,
    fontStyle: 'italic',
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    opacity: 0.75,
  },
};
