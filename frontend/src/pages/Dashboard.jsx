import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Phone, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

function ScoreBadge({ score }) {
  const color = score >= 80 ? '#22c55e' : score >= 65 ? '#eab308' : score >= 50 ? '#f97316' : '#ef4444';
  return (
    <span style={{ background: color, color: '#fff', borderRadius: 6, padding: '2px 10px', fontWeight: 700, fontSize: 13 }}>
      {score ?? '—'}
    </span>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getDashboard().then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={styles.center}>Loading dashboard...</div>;
  if (!data) return <div style={styles.center}>Could not load data. Is the backend running?</div>;

  const { summary, byRep, recentCalls } = data;

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ ...styles.title, marginBottom: 0 }}>Coaching Dashboard</h1>
        <button onClick={() => window.print()} style={styles.pdfBtn} className="no-print">
          ⬇ Download PDF
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid-4">
        <Card icon={<Phone size={20} />} label="Total Calls" value={summary?.total_calls ?? 0} color="#6366f1" />
        <Card icon={<TrendingUp size={20} />} label="Avg Score" value={summary?.avg_score ?? 0} color="#22c55e" />
        <Card icon={<CheckCircle size={20} />} label="Excellent (≥80)" value={summary?.excellent_calls ?? 0} color="#0ea5e9" />
        <Card icon={<AlertCircle size={20} />} label="Critical (<60)" value={summary?.critical_calls ?? 0} color="#ef4444" />
      </div>

      {/* Charts */}
      <div className="grid-2">
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Performance by Advisor</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byRep}>
              <XAxis dataKey="salesperson_name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="avg_score" fill="#6366f1" radius={[4,4,0,0]} name="Avg Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Skills Breakdown by Advisor</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byRep}>
              <XAxis dataKey="salesperson_name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="avg_conversation" fill="#22c55e" name="Conversation" />
              <Bar dataKey="avg_discovery" fill="#0ea5e9" name="Discovery" />
              <Bar dataKey="avg_objections" fill="#f97316" name="Objections" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Calls Table */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={styles.cardTitle}>Recent Calls</h3>
          <button style={styles.btnPrimary} onClick={() => navigate('/upload')}>+ New Call</button>
        </div>
        <div className="table-wrapper">
        <table style={styles.table}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={styles.th}>Advisor</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Contact</th>
              <th style={styles.th}>Institution</th>
              <th style={styles.th}>Stage</th>
              <th style={styles.th}>Score</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {recentCalls.map(call => (
              <tr key={call.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={styles.td}>{call.salesperson_name}</td>
                <td style={styles.td}>{call.contact_type === 'student' ? 'Student' : 'University'}</td>
                <td style={styles.td}>{call.contact_name || '—'}</td>
                <td style={styles.td}>{call.institution_name || '—'}</td>
                <td style={styles.td}>{call.stage || '—'}</td>
                <td style={styles.td}><ScoreBadge score={call.overall_score} /></td>
                <td style={styles.td}><StatusBadge status={call.status} /></td>
                <td style={styles.td}>{new Date(call.created_at).toLocaleDateString()}</td>
                <td style={styles.td}>
                  <button style={styles.btnSmall} onClick={() => navigate(`/calls/${call.id}`)}>View</button>
                </td>
              </tr>
            ))}
            {recentCalls.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>No calls yet. Upload your first one.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function Card({ icon, label, value, color }) {
  return (
    <div style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ background: color, borderRadius: 10, padding: 10, color: '#fff' }}>{icon}</div>
      <div>
        <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>{value}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    completed: ['#22c55e', 'Completed'],
    running:   ['#0ea5e9', 'Running...'],
    pending:   ['#eab308', 'Pending'],
    error:     ['#ef4444', 'Error'],
  };
  const [color, label] = map[status] || ['#94a3b8', status || 'Unknown'];
  return <span style={{ color, fontWeight: 600, fontSize: 12 }}>{label}</span>;
}

const styles = {
  container: { padding: '24px 32px', maxWidth: 1200, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' },
  title: { fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 24 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 12, marginTop: 0 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' },
  td: { padding: '10px 12px', color: '#374151' },
  pdfBtn: { background: '#fff', color: '#6366f1', border: '1px solid #6366f1', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 },
  btnPrimary: { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  btnSmall: { background: '#f1f5f9', color: '#374151', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#64748b', fontSize: 16 },
};
