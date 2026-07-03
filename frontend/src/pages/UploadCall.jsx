import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadCall, analyzeTranscript } from '../api';

const ACCEPTED = '.pdf,.doc,.docx,.xlsx,.xls,.txt';
const STAGES_STUDENT = ['First contact', 'Info sent', 'Application started', 'Documentation', 'Enrollment confirmed', 'Enrollment lost'];
const STAGES_UNI = ['First contact', 'Program presentation', 'Agreement negotiation', 'Agreement signed', 'Agreement lost'];

export default function UploadCall() {
  const navigate = useNavigate();

  const [step, setStep] = useState('upload');
  const [inputMode, setInputMode] = useState('file');
  const [file, setFile] = useState(null);
  const [pastedText, setPastedText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');

  const [transcript, setTranscript] = useState('');
  const [form, setForm] = useState({
    salesperson_name: '',
    contact_type: 'student',
    contact_name: '',
    institution_name: '',
    stage: 'First contact',
    opportunity_value: '',
  });
  const [confidence, setConfidence] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleAnalyze = async () => {
    if (inputMode === 'file' && !file) return setAnalyzeError('Please select a file.');
    if (inputMode === 'text' && !pastedText.trim()) return setAnalyzeError('Please paste the transcript.');
    setAnalyzing(true);
    setAnalyzeError('');

    const fd = new FormData();
    if (inputMode === 'file') fd.append('transcript', file);
    else fd.append('transcript_text', pastedText);

    try {
      const { data } = await analyzeTranscript(fd);
      const f = data.fields || {};
      setTranscript(data.transcript || pastedText);
      setForm({
        salesperson_name: f.salesperson_name || '',
        contact_type: f.contact_type === 'university' ? 'university' : 'student',
        contact_name: f.contact_name || '',
        institution_name: f.institution_name || '',
        stage: f.stage || 'First contact',
        opportunity_value: f.opportunity_value ? String(f.opportunity_value) : '',
      });
      setConfidence(f.confidence ?? null);
      setStep('review');
    } catch (err) {
      setAnalyzeError(err.response?.data?.error || 'Error analyzing the file.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
    fd.append('transcript_text', transcript);
    try {
      const { data } = await uploadCall(fd);
      navigate(`/calls/${data.callId}`);
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Error starting evaluation.');
      setSubmitting(false);
    }
  };

  const stages = form.contact_type === 'student' ? STAGES_STUDENT : STAGES_UNI;

  if (step === 'upload') {
    return (
      <div className="page-container-sm">
        <div className="upload-card">
          <h2 style={s.title}>New Call</h2>
          <p style={s.subtitle}>Upload the transcript and AI will fill in all fields automatically.</p>

          {analyzeError && <div style={s.error}>{analyzeError}</div>}

          <div style={s.modeRow}>
            {[['file', '📎 Upload file'], ['text', '✏️ Paste text']].map(([m, label]) => (
              <button key={m} type="button" onClick={() => { setInputMode(m); setAnalyzeError(''); }}
                style={{ ...s.modeBtn, ...(inputMode === m ? s.modeBtnActive : {}) }}>
                {label}
              </button>
            ))}
          </div>

          {inputMode === 'file' && (
            <label style={{ ...s.dropZone, ...(file ? s.dropZoneFilled : {}) }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); setFile(e.dataTransfer.files[0]); setAnalyzeError(''); }}>
              <input type="file" accept={ACCEPTED}
                onChange={e => { setFile(e.target.files[0]); setAnalyzeError(''); }}
                style={{ display: 'none' }} />
              {file ? (
                <>
                  <div style={{ fontSize: 36 }}>{fileIcon(file.name)}</div>
                  <div style={{ fontWeight: 700, color: '#6366f1', marginTop: 8 }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    {(file.size / 1024).toFixed(0)} KB · click to change
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 48 }}>📁</div>
                  <div style={{ fontWeight: 700, color: '#374151', marginTop: 12, fontSize: 15 }}>
                    Drag & drop or click to select
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                    PDF · Word (.docx) · Excel (.xlsx) · TXT — max 20 MB
                  </div>
                </>
              )}
            </label>
          )}

          {inputMode === 'text' && (
            <textarea
              value={pastedText}
              onChange={e => { setPastedText(e.target.value); setAnalyzeError(''); }}
              placeholder="Paste the transcript here..."
              style={{ ...s.input, height: 260, resize: 'vertical', fontFamily: 'monospace', fontSize: 12, marginTop: 16 }}
            />
          )}

          <button onClick={handleAnalyze} disabled={analyzing} style={{ ...s.btnPrimary, marginTop: 20, width: '100%', fontSize: 15, padding: '12px 0', opacity: analyzing ? 0.7 : 1 }}>
            {analyzing ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <Spinner /> Analyzing with AI...
              </span>
            ) : '✨ Analyze and fill fields'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container-sm">
      <div className="upload-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <button onClick={() => setStep('upload')} style={s.backBtn}>← Back</button>
          <h2 style={{ ...s.title, margin: 0 }}>Review & Confirm</h2>
        </div>

        {confidence !== null && (
          <div style={{ ...s.infoBadge, background: confidence >= 80 ? '#f0fdf4' : '#fffbeb', borderColor: confidence >= 80 ? '#86efac' : '#fcd34d', color: confidence >= 80 ? '#166534' : '#92400e' }}>
            {confidence >= 80 ? '✅' : '⚠️'} AI filled fields with <strong>{confidence}% confidence</strong>. Review before confirming.
          </div>
        )}

        {submitError && <div style={s.error}>{submitError}</div>}

        <form onSubmit={handleSubmit}>
          <div className="grid-2-form">
            <Field label="EIA Advisor Name" name="salesperson_name" value={form.salesperson_name} onChange={handleChange} placeholder="e.g. Aija Vanaga" />

            <div>
              <label style={s.label}>Contact Type</label>
              <select name="contact_type" value={form.contact_type}
                onChange={e => { handleChange(e); setForm(f => ({ ...f, stage: 'First contact' })); }}
                style={s.input}>
                <option value="student">Student (B2C)</option>
                <option value="university">University (B2U)</option>
              </select>
            </div>

            <Field
              label={form.contact_type === 'student' ? 'Student Name' : 'Contact Name'}
              name="contact_name" value={form.contact_name} onChange={handleChange}
              placeholder="e.g. Abidemi Hannah Biodun-Oladoye" />

            <Field
              label={form.contact_type === 'student' ? 'University of Interest' : 'University Name'}
              name="institution_name" value={form.institution_name} onChange={handleChange}
              placeholder="e.g. University of Lagos" />

            <div>
              <label style={s.label}>Stage</label>
              <select name="stage" value={form.stage} onChange={handleChange} style={s.input}>
                {stages.map(st => <option key={st}>{st}</option>)}
              </select>
            </div>

            <Field label="Opportunity Value ($)" name="opportunity_value" value={form.opportunity_value}
              onChange={handleChange} placeholder="e.g. 5000" type="number" />
          </div>

          <details style={{ marginTop: 20 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, color: '#64748b', fontWeight: 500 }}>
              View extracted transcript ({transcript.length.toLocaleString()} characters)
            </summary>
            <pre style={{ marginTop: 10, background: '#f8fafc', borderRadius: 8, padding: 12, fontSize: 11, maxHeight: 200, overflow: 'auto', color: '#374151' }}>
              {transcript.slice(0, 2000)}{transcript.length > 2000 ? '\n...' : ''}
            </pre>
          </details>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button type="submit" disabled={submitting} style={{ ...s.btnPrimary, opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Starting...' : '🚀 Start AI Evaluation'}
            </button>
            <button type="button" onClick={() => navigate('/dashboard')} style={s.btnSecondary}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label style={s.label}>{label}</label>
      <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} style={s.input} />
    </div>
  );
}

function Spinner() {
  return (
    <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
  );
}

function fileIcon(name) {
  if (name.endsWith('.pdf')) return '📄';
  if (name.endsWith('.docx') || name.endsWith('.doc')) return '📝';
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return '📊';
  return '📃';
}

const s = {
  container: { padding: '40px 24px', maxWidth: 780, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 36, boxShadow: '0 4px 20px rgba(0,0,0,0.07)' },
  title: { fontSize: 22, fontWeight: 700, color: '#1e293b', marginTop: 0 },
  subtitle: { color: '#64748b', marginBottom: 24, marginTop: -8, fontSize: 14 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 },
  input: { width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 14, color: '#1e293b', boxSizing: 'border-box', outline: 'none' },
  error: { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#dc2626', marginBottom: 16, fontSize: 14 },
  infoBadge: { border: '1px solid', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13 },
  modeRow: { display: 'flex', gap: 8, marginBottom: 20 },
  modeBtn: { border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13, background: '#f8fafc', color: '#64748b', fontWeight: 500 },
  modeBtnActive: { border: '2px solid #6366f1', background: '#eef2ff', color: '#6366f1', fontWeight: 700 },
  dropZone: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #d1d5db', borderRadius: 14, padding: '44px 16px', cursor: 'pointer', textAlign: 'center', background: '#fafafa', minHeight: 200, transition: 'all 0.2s' },
  dropZoneFilled: { borderColor: '#6366f1', background: '#f5f3ff' },
  btnPrimary: { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  btnSecondary: { background: '#f1f5f9', color: '#374151', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  backBtn: { background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: 600, fontSize: 14, padding: 0 },
};
