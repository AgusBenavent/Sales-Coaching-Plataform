import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login({ mode = 'login' }) {
  const navigate = useNavigate();
  const isRegister = mode === 'register';
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.name } },
        });
        if (error) throw error;
        setInfo('Account created! Check your email to confirm, then sign in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.bg}>
      <div style={styles.card}>
        <div style={styles.logo}>SalesCoach AI</div>

        <div style={styles.tabs}>
          <button onClick={() => navigate('/login')} style={{ ...styles.tab, ...((!isRegister) ? styles.tabActive : {}) }}>
            Sign in
          </button>
          <button onClick={() => navigate('/register')} style={{ ...styles.tab, ...(isRegister ? styles.tabActive : {}) }}>
            Register
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {info && <div style={styles.info}>{info}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isRegister && (
            <Field label="Full name" name="name" value={form.name} onChange={handleChange} placeholder="John Smith" />
          )}
          <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@company.com" />
          <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="••••••••" />

          <button type="submit" disabled={loading} style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}>
            {loading ? '...' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

      </div>
    </div>
  );
}

function Field({ label, name, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} style={styles.input} required />
    </div>
  );
}


const styles = {
  bg: { minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  logo: { fontWeight: 800, fontSize: 20, color: '#6366f1', marginBottom: 16 },
  tabs: { display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 4, marginBottom: 24, gap: 4 },
  tab: { flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, background: 'none', color: '#64748b' },
  tabActive: { background: '#fff', color: '#6366f1', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 },
  input: { width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '9px 12px', fontSize: 14, color: '#1e293b', boxSizing: 'border-box', outline: 'none' },
  btn: { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', cursor: 'pointer', fontWeight: 700, fontSize: 15, marginTop: 4 },
  error: { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#dc2626', marginBottom: 16, fontSize: 13 },
  info: { background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', color: '#16a34a', marginBottom: 16, fontSize: 13 },
};
