import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  };

  return (
    <div style={styles.bg}>
      <div style={styles.card}>
        <div style={styles.logo}>SalesCoach AI</div>
        <h2 style={styles.title}>{isRegister ? 'Create your account' : 'Welcome back'}</h2>

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

        <p style={styles.switch}>
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <Link to={isRegister ? '/login' : '/register'} style={{ color: '#6366f1', fontWeight: 600 }}>
            {isRegister ? 'Sign in' : 'Register'}
          </Link>
        </p>
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 8 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

const styles = {
  bg: { minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  logo: { fontWeight: 800, fontSize: 20, color: '#6366f1', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 700, color: '#1e293b', margin: '0 0 24px' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 },
  input: { width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '9px 12px', fontSize: 14, color: '#1e293b', boxSizing: 'border-box', outline: 'none' },
  btn: { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', cursor: 'pointer', fontWeight: 700, fontSize: 15, marginTop: 4 },
  googleBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#374151', marginBottom: 16 },
  divider: { textAlign: 'center', margin: '4px 0 16px', color: '#94a3b8', fontSize: 13, position: 'relative' },
  error: { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#dc2626', marginBottom: 16, fontSize: 13 },
  info: { background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', color: '#16a34a', marginBottom: 16, fontSize: 13 },
  switch: { textAlign: 'center', marginTop: 20, fontSize: 14, color: '#64748b' },
};
