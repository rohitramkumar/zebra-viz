import { RefereeListItem } from '../types';

interface RefereeSidebarProps {
  referees: RefereeListItem[];
  selectedRefereeId: string | null;
  onSelectReferee: (id: string) => void;
  loading: boolean;
}

export default function RefereeSidebar({
  referees,
  selectedRefereeId,
  onSelectReferee,
  loading,
}: RefereeSidebarProps) {
  return (
    <aside style={styles.sidebar}>
      <div style={styles.sidebarHeader}>
        <h2 style={styles.sidebarTitle}>Referees</h2>
      </div>
      {loading ? (
        <div style={styles.loadingContainer}>
          <span style={styles.spinner}>⏳</span>
          <p style={styles.loadingText}>Loading...</p>
        </div>
      ) : (
        <ul style={styles.list}>
          {referees.map(ref => (
            <li
              key={ref.id}
              style={{
                ...styles.listItem,
                ...(selectedRefereeId === ref.id ? styles.listItemSelected : {}),
              }}
              onClick={() => onSelectReferee(ref.id)}
            >
              <span style={styles.refName}>{ref.name}</span>
              <span
                style={{
                  ...styles.badge,
                  ...(selectedRefereeId === ref.id ? styles.badgeSelected : {}),
                }}
              >
                {ref.gameCount} games
              </span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '280px',
    flexShrink: 0,
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  sidebarHeader: {
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  sidebarTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px',
    gap: '8px',
  },
  spinner: {
    fontSize: '2rem',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: '0.9rem',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.15s',
    backgroundColor: 'transparent',
  },
  listItemSelected: {
    backgroundColor: '#eff6ff',
    borderLeft: '3px solid #3b82f6',
    paddingLeft: '13px',
  },
  refName: {
    fontSize: '0.95rem',
    fontWeight: 500,
    color: '#111827',
  },
  badge: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  badgeSelected: {
    backgroundColor: '#bfdbfe',
    color: '#1d4ed8',
  },
};
