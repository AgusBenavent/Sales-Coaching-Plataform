import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCall, submitFeedback, reevaluateCall } from '../api';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowLeft, RefreshCw } from 'lucide-react';

const TABS = [
  ['overview', '📊 Overview'],
  ['categories', '📋 Categories'],
  ['signals', '🎯 Signals'],
  ['coaching', '🏆 Coaching'],
  ['transcript', '📄 Transcript'],
];

export default function CallDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [comments, setComments] = useState('');
  const [reeval, setReeval] = useState(false);

  const load = useCallback(() => {
    getCall(id).then(r => { setData(r.data); setLoading(false); });
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      setData(prev => {
        if (prev?.evaluation?.status === 'running' || prev?.evaluation?.status === 'pending') load();
        return prev;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [load]);

  const handleFeedback = async (approved) => {
    await submitFeedback({ evaluation_id: data.evaluation.id, manager_name: 'Manager', approved, comments });
    setFeedbackSent(true);
  };

  const handleReeval = async () => {
    setReeval(true);
    await reevaluateCall(id);
    setData(prev => prev ? { ...prev, evaluation: { ...prev.evaluation, status: 'pending' } } : prev);
    setReeval(false);
    load();
  };

  if (loading) return <div style={s.center}>Loading call...</div>;
  if (!data) return <div style={s.center}>Call not found.</div>;

  const { call, evaluation } = data;
  const isRunning = evaluation?.status === 'running' || evaluation?.status === 'pending';
  const full = evaluation?.scores || {};
  const categories = evaluation?.agents_output || full.categories || [];
  const coaching = evaluation?.coaching || {};
  const overallScore = evaluation?.overall_score ?? 0;
  const hasCategories = Array.isArray(categories) && categories.length > 0;

  // 3 buckets
  const good = categories.filter(c => (c.score ?? 0) >= 7);
  const improve = categories.filter(c => (c.score ?? 0) >= 4 && (c.score ?? 0) < 7);
  const bad = categories.filter(c => (c.score ?? 0) < 4);

  const radarData = categories.slice(0, 9).map(c => ({
    subject: c.name.split(' ').slice(0, 2).join(' '),
    score: (c.score ?? 0) * 10,
    fullMark: 100,
  }));

  return (
    <div className="detail-container">
      <button onClick={() => navigate('/')} style={s.backBtn}>
        <ArrowLeft size={15} /> Volver al Dashboard
      </button>

      {/* Header */}
      <div className="detail-header">
        <div>
          <h1 style={s.title}>
            {call.salesperson_name} — {call.contact_name || (call.contact_type === 'student' ? 'Student' : 'Contact')}
          </h1>
          <p style={s.meta}>
            {call.contact_type === 'student' ? 'B2C · Student' : 'B2U · University'}
            {call.institution_name ? ` · ${call.institution_name}` : ''}
            {call.stage ? ` · ${call.stage}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!isRunning && (
            <button onClick={handleReeval} disabled={reeval} style={s.reevalBtn} title="Re-evaluate with the new system">
              <RefreshCw size={13} style={reeval ? { animation: 'spin 1s linear infinite' } : {}} />
              {reeval ? ' Re-evaluating...' : ' Re-evaluate'}
            </button>
          )}
          {isRunning && (
            <div style={s.runningBadge}>
              <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Evaluating...
            </div>
          )}
          {!isRunning && evaluation?.overall_score != null && (
            <div style={s.scoreBig}>
              <div style={{ fontSize: 48, fontWeight: 800, color: scoreColor(overallScore), lineHeight: 1 }}>
                {overallScore}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {full.label || ''} · Grade {full.grade || '—'}
              </div>
              <div style={{ marginTop: 4 }}>
                <QualityBadge quality={full.call_quality} />
              </div>
            </div>
          )}
        </div>
      </div>

      {isRunning && (
        <div style={s.infoBox}>AI agents are evaluating this call with the 20-category framework. Updates automatically.</div>
      )}

      {/* No categories warning */}
      {!isRunning && !hasCategories && (
        <div style={s.warnBox}>
          ⚠️ This call was evaluated with the previous system. Click <strong>Re-evaluate</strong> to get the full 20-category analysis.
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-row">
        {TABS.map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ ...s.tab, ...(activeTab === tab ? s.tabActive : {}) }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid-4" style={{ gap: 12 }}>
            <MiniCard label="Overall Score" value={overallScore} unit="/100" color={scoreColor(overallScore)} />
            <MiniCard label="Quality" value={full.call_quality || '—'} color="#6366f1" />
            <MiniCard label="Advance Stage" value={full.advance_stage ? 'YES' : 'NO'} color={full.advance_stage ? '#22c55e' : '#ef4444'} />
            <MiniCard label="Grade" value={full.grade || '—'} color="#0ea5e9" />
          </div>

          {/* 3 BUCKETS — the main new section */}
          {hasCategories && (
            <div className="grid-3">
              <BucketCard
                title="✅ What's working well"
                items={good}
                color="#16a34a"
                bg="#f0fdf4"
                border="#86efac"
                emptyMsg="No standout categories yet."
              />
              <BucketCard
                title="⚠️ Needs improvement"
                items={improve}
                color="#d97706"
                bg="#fffbeb"
                border="#fcd34d"
                emptyMsg="No medium improvement areas."
              />
              <BucketCard
                title="❌ Critical issues"
                items={bad}
                color="#dc2626"
                bg="#fef2f2"
                border="#fca5a5"
                emptyMsg="No critical categories."
              />
            </div>
          )}

          {hasCategories && (
            <div className="grid-2">
              <div style={s.card}>
                <h3 style={s.cardTitle}>Performance Radar</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                    <Radar dataKey="score" fill="#6366f1" fillOpacity={0.25} stroke="#6366f1" strokeWidth={2} />
                    <Tooltip formatter={(v) => [`${v}/100`]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div style={s.card}>
                <h3 style={s.cardTitle}>Score by Category</h3>
                <div style={{ maxHeight: 270, overflowY: 'auto' }}>
                  {categories.map((c, i) => (
                    <ScoreBar key={i} label={c.name} score={(c.score ?? 0) * 10} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Talk ratio & sentiment */}
          {(full.talk_ratio || full.sentiment) && (
            <div className="grid-2">
              {full.talk_ratio && (
                <div style={s.card}>
                  <h3 style={s.cardTitle}>Talk Ratio</h3>
                  <TalkRatioBar interviewer={full.talk_ratio.interviewer} student={full.talk_ratio.student} />
                  <p style={{ fontSize: 13, color: '#64748b', marginTop: 10 }}>{full.talk_ratio.assessment}</p>
                </div>
              )}
              {full.sentiment && (
                <div style={s.card}>
                  <h3 style={s.cardTitle}>Call Sentiment</h3>
                  <SentimentRow label="Beginning" value={full.sentiment.beginning} />
                  <SentimentRow label="Middle" value={full.sentiment.middle} />
                  <SentimentRow label="End" value={full.sentiment.end} />
                  <SentimentRow label="Trend" value={full.sentiment.trend} />
                  <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>{full.sentiment.summary}</p>
                </div>
              )}
            </div>
          )}

          {full.advance_reason && (
            <div style={{ ...s.card, borderLeft: `4px solid ${full.advance_stage ? '#22c55e' : '#ef4444'}` }}>
              <strong style={{ fontSize: 13 }}>{full.advance_stage ? '✅ Recommendation: Advance stage' : '⛔ Recommendation: Do not advance stage'}</strong>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#374151' }}>{full.advance_reason}</p>
            </div>
          )}
        </div>
      )}

      {/* ── CATEGORIES ── */}
      {activeTab === 'categories' && (
        <div>
          {!hasCategories
            ? <EmptyState onReeval={handleReeval} reeval={reeval} />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {categories.map((cat, i) => <CategoryCard key={i} num={i + 1} cat={cat} />)}
              </div>
          }
        </div>
      )}

      {/* ── SIGNALS ── */}
      {activeTab === 'signals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {full.buying_signals?.length > 0 && (
            <div style={s.card}>
              <h3 style={{ ...s.cardTitle, color: '#16a34a' }}>🟢 Buying Signals  ({full.buying_signals.length})</h3>
              {full.buying_signals.map((b, i) => (
                <div key={i} style={{ marginBottom: 12, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, borderLeft: '3px solid #22c55e' }}>
                  <div style={{ fontStyle: 'italic', color: '#374151', fontSize: 13 }}>"{b.quote}"</div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <StrengthBadge strength={b.strength} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>{b.meaning}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {full.risk_signals?.length > 0 && (
            <div style={s.card}>
              <h3 style={{ ...s.cardTitle, color: '#dc2626' }}>🔴 Risk Signals ({full.risk_signals.length})</h3>
              {full.risk_signals.map((r, i) => (
                <div key={i} style={{ marginBottom: 12, padding: '10px 14px', background: '#fef2f2', borderRadius: 8, borderLeft: '3px solid #ef4444' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <StrengthBadge strength={r.severity} danger />
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>{r.signal}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>→ {r.recommendation}</div>
                </div>
              ))}
            </div>
          )}

          {full.objections?.length > 0 && (
            <div style={s.card}>
              <h3 style={{ ...s.cardTitle, color: '#d97706' }}>⚠️ Objections ({full.objections.length})</h3>
              {full.objections.map((o, i) => (
                <div key={i} style={{ marginBottom: 12, padding: '10px 14px', background: '#fffbeb', borderRadius: 8, borderLeft: '3px solid #fbbf24' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 6 }}>{o.objection}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                    <StatusChip label="Identified" ok={o.identified} />
                    <StatusChip label="Acknowledged" ok={o.acknowledged} />
                    <StatusChip label="Answered" ok={o.answered} />
                    <StatusChip label="Resolved" ok={o.resolved} />
                  </div>
                  {o.ideal_response && (
                    <div style={{ fontSize: 12, color: '#0369a1', background: '#e0f2fe', borderRadius: 6, padding: '6px 10px' }}>
                      <strong>Ideal response:</strong> {o.ideal_response}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!full.buying_signals?.length && !full.risk_signals?.length && !full.objections?.length && (
            !hasCategories
              ? <EmptyState onReeval={handleReeval} reeval={reeval} />
              : <div style={s.center}>No signals detected in this call.</div>
          )}
        </div>
      )}

      {/* ── COACHING ── */}
      {activeTab === 'coaching' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!hasCategories && <EmptyState onReeval={handleReeval} reeval={reeval} />}

          {(coaching.coach_summary || coaching.rolePlaySuggestion) && (
            <div style={{ ...s.card, borderLeft: '4px solid #6366f1' }}>
              <h3 style={s.cardTitle}>💬 Coach Summary</h3>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0 }}>
                {coaching.coach_summary || coaching.rolePlaySuggestion}
              </p>
            </div>
          )}

          {coaching.next_best_actions?.length > 0 && (
            <div style={s.card}>
              <h3 style={s.cardTitle}>🚀 Top Recommended Actions</h3>
              {coaching.next_best_actions.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 24, height: 24, borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                  <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{a}</p>
                </div>
              ))}
            </div>
          )}

          {coaching.missed_opportunities?.length > 0 && (
            <div style={s.card}>
              <h3 style={{ ...s.cardTitle, color: '#dc2626' }}>❌ Missed Opportunities</h3>
              <ul style={{ margin: 0, paddingLeft: 18, color: '#374151', fontSize: 13, lineHeight: 1.9 }}>
                {coaching.missed_opportunities.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}

          {evaluation && !feedbackSent && (
            <div style={s.card}>
              <h3 style={s.cardTitle}>📝 Manager Review</h3>
              <textarea placeholder="Add coaching comments..." value={comments} onChange={e => setComments(e.target.value)}
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: 10, fontSize: 13, minHeight: 80, boxSizing: 'border-box', marginBottom: 12 }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => handleFeedback(true)} style={s.btnGreen}>Approve Evaluation</button>
                <button onClick={() => handleFeedback(false)} style={s.btnRed}>Request Correction</button>
              </div>
            </div>
          )}
          {feedbackSent && <div style={s.infoBox}>Feedback submitted successfully.</div>}
        </div>
      )}

      {/* ── TRANSCRIPT ── */}
      {activeTab === 'transcript' && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>Full Transcript</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12, color: '#374151', lineHeight: 1.7, margin: 0 }}>{call.transcript}</pre>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function BucketCard({ title, items, color, bg, border, emptyMsg }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 16 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color, margin: '0 0 12px' }}>{title}</h3>
      {items.length === 0
        ? <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{emptyMsg}</p>
        : items.map((c, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '6px 10px', background: 'rgba(255,255,255,0.7)', borderRadius: 8 }}>
            <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{c.name}</span>
            <span style={{ fontWeight: 800, fontSize: 14, color }}>{c.score}/10</span>
          </div>
        ))
      }
    </div>
  );
}

function EmptyState({ onReeval, reeval }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔄</div>
      <p style={{ fontSize: 14, marginBottom: 16 }}>This call was evaluated with the previous system.<br />Re-evaluate to get the full 20-category analysis.</p>
      <button onClick={onReeval} disabled={reeval} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontWeight: 600 }}>
        {reeval ? 'Re-evaluating...' : '✨ Re-evaluate now'}
      </button>
    </div>
  );
}

function CategoryCard({ num, cat }) {
  const [open, setOpen] = useState(false);
  const pct = (cat.score ?? 0) * 10;
  const color = scoreColor(pct);
  return (
    <div style={{ ...s.card, borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', minWidth: 20 }}>{num}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{cat.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 80, background: '#e2e8f0', borderRadius: 4, height: 6 }}>
            <div style={{ background: color, width: `${pct}%`, height: 6, borderRadius: 4 }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 15, color, minWidth: 32, textAlign: 'right' }}>{cat.score ?? '—'}<span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400 }}>/10</span></span>
          <span style={{ color: '#94a3b8', fontSize: 11 }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
          {cat.reason && <p style={{ fontSize: 13, color: '#374151', margin: '0 0 12px', lineHeight: 1.6 }}>{cat.reason}</p>}
          {cat.evidence?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={s.sectionLabel}>Evidence from transcript</div>
              {cat.evidence.map((e, i) => (
                <div key={i} style={{ fontStyle: 'italic', fontSize: 12, color: '#374151', background: '#f8fafc', borderRadius: 6, padding: '7px 12px', marginBottom: 5, borderLeft: '2px solid #6366f1' }}>"{e}"</div>
              ))}
            </div>
          )}
          {cat.improvements?.length > 0 && (
            <div>
              <div style={s.sectionLabel}>How to improve</div>
              <ul style={{ margin: 0, paddingLeft: 16, color: '#374151', fontSize: 13, lineHeight: 1.9 }}>
                {cat.improvements.map((imp, i) => <li key={i}>{imp}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreBar({ label, score }) {
  const color = scoreColor(score);
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
        <span style={{ color: '#374151' }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{score}</span>
      </div>
      <div style={{ background: '#e2e8f0', borderRadius: 4, height: 5 }}>
        <div style={{ background: color, width: `${score}%`, height: 5, borderRadius: 4, transition: 'width 0.6s' }} />
      </div>
    </div>
  );
}

function MiniCard({ label, value, unit = '', color }) {
  return (
    <div style={{ ...s.card, textAlign: 'center', padding: '16px 12px' }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}<span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>{unit}</span></div>
    </div>
  );
}

function TalkRatioBar({ interviewer = 0, student = 0 }) {
  return (
    <div>
      <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 24, marginBottom: 8 }}>
        <div style={{ width: `${interviewer}%`, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 600 }}>
          {interviewer > 8 ? `${interviewer}%` : ''}
        </div>
        <div style={{ width: `${student}%`, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 600 }}>
          {student > 8 ? `${student}%` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
        <span><span style={{ color: '#6366f1', fontWeight: 700 }}>●</span> Advisor {interviewer}%</span>
        <span><span style={{ color: '#22c55e', fontWeight: 700 }}>●</span> Contact {student}%</span>
      </div>
    </div>
  );
}

function SentimentRow({ label, value }) {
  const colorMap = { Positive: '#16a34a', Neutral: '#64748b', Negative: '#dc2626', Improving: '#16a34a', Stable: '#64748b', Declining: '#dc2626' };
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{ fontWeight: 600, color: colorMap[value] || '#64748b' }}>{value || '—'}</span>
    </div>
  );
}

function QualityBadge({ quality }) {
  const map = { Excellent: '#16a34a', Good: '#0ea5e9', Average: '#eab308', Poor: '#f97316', Critical: '#dc2626' };
  return <span style={{ background: map[quality] || '#94a3b8', color: '#fff', borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{quality || '—'}</span>;
}

function StrengthBadge({ strength, danger }) {
  const colors = danger
    ? { High: '#dc2626', Medium: '#d97706', Low: '#64748b' }
    : { High: '#16a34a', Medium: '#d97706', Low: '#64748b' };
  const bgs = danger
    ? { High: '#fef2f2', Medium: '#fffbeb', Low: '#f8fafc' }
    : { High: '#f0fdf4', Medium: '#fffbeb', Low: '#f8fafc' };
  return <span style={{ fontSize: 11, fontWeight: 700, color: colors[strength] || '#64748b', background: bgs[strength] || '#f8fafc', padding: '2px 8px', borderRadius: 5 }}>{strength}</span>;
}

function StatusChip({ label, ok }) {
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, fontWeight: 600, background: ok ? '#f0fdf4' : '#fef2f2', color: ok ? '#16a34a' : '#dc2626' }}>
      {ok ? '✓' : '✗'} {label}
    </span>
  );
}

function scoreColor(s) {
  return s >= 70 ? '#16a34a' : s >= 50 ? '#d97706' : '#dc2626';
}

const s = {
  container: { padding: '24px 32px', maxWidth: 1100, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 700, color: '#1e293b', margin: '8px 0 4px' },
  meta: { color: '#64748b', margin: 0, fontSize: 13 },
  backBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 16, padding: 0 },
  reevalBtn: { display: 'flex', alignItems: 'center', gap: 6, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151' },
  runningBadge: { display: 'flex', alignItems: 'center', gap: 6, background: '#eff6ff', color: '#3b82f6', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 600 },
  scoreBig: { textAlign: 'center' },
  infoBox: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', color: '#1d4ed8', fontSize: 13, marginBottom: 16 },
  warnBox: { background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '12px 16px', color: '#92400e', fontSize: 13, marginBottom: 16 },
  tabs: { display: 'flex', gap: 2, marginBottom: 20, borderBottom: '2px solid #e2e8f0' },
  tab: { background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: '#64748b', fontWeight: 500, borderBottom: '2px solid transparent', marginBottom: -2 },
  tabActive: { color: '#6366f1', borderBottomColor: '#6366f1', fontWeight: 700 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 16 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, marginBottom: 0 },
  cardTitle: { fontSize: 14, fontWeight: 700, color: '#374151', margin: '0 0 12px' },
  sectionLabel: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  btnGreen: { background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  btnRed: { background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: '#64748b', flexDirection: 'column', gap: 12 },
};
