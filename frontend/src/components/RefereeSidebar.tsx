import { useState } from 'react';
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
  const [search, setSearch] = useState('');

  const filtered = referees.filter(ref =>
    ref.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside style={styles.sidebar}>
      <div style={styles.sidebarHeader}>
        <h2 style={styles.sidebarTitle}>Referees</h2>
        <input
          type="search"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
          aria-label="Search referees"
        />
      </div>
      {loading ? (
        <div style={styles.loadingContainer}>
          <span style={styles.spinner}>⏳</span>
          <p style={styles.loadingText}>Loading...</p>
        </div>
      ) : (
        <ul style={styles.list}>
          {filtered.length === 0 ? (
            <li style={styles.noResults}>No referees found</li>
          ) : (
            filtered.map(ref => (
              <li
                key={ref.id}
                style={{
                  ...styles.listItem,
                  ...(selectedRefereeId === ref.id ? styles.listItemSelected : {}),
                }}
                onClick={() => onSelectReferee(ref.id)}
              >
                <span style={styles.refName}>{ref.name}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '240px',
    flexShrink: 0,
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  sidebarHeader: {
    padding: '12px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sidebarTitle: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  searchInput: {
    width: '100%',
    padding: '5px 8px',
    fontSize: '0.8rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    boxSizing: 'border-box',
    color: '#111827',
    backgroundColor: '#ffffff',
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
    padding: '10px 12px 10px 13px',
    cursor: 'pointer',
    borderBottom: '1px solid #f3f4f6',
    borderLeft: '3px solid transparent',
    transition: 'background-color 0.15s',
    backgroundColor: 'transparent',
  },
  listItemSelected: {
    backgroundColor: '#eff6ff',
    borderLeftColor: '#3b82f6',
  },
  refName: {
    fontSize: '0.85rem',
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
  noResults: {
    padding: '16px',
    color: '#6b7280',
    fontSize: '0.875rem',
    textAlign: 'center',
    listStyle: 'none',
  },
};
