import React, { useState } from 'react';
import { authAPI } from '../services/apiService';
import './LoginPage.css';

function LoginPage({ onLoginSuccess }) {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  const [authStep, setAuthStep]   = useState('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [otp, setOtp]             = useState('');
  const [signupEmail, setSignupEmail] = useState('');

  const isValidEmail = (email) => email.includes('@') && email.length > 5;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password)       { setError('Please fill in all fields'); return; }
    if (!isValidEmail(email))      { setError('Please enter a valid email'); return; }
    if (password.length < 6)       { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const response = await authAPI.login(email, password);
      if (response.success) {
        onLoginSuccess(response.data);
        setEmail('');
        setPassword('');
      } else {
        setError(response.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Signup and OTP flows commented out — users are created manually by admin ──

  // const handleSignup = async (e) => {
  //   e.preventDefault();
  //   setError('');
  //   if (!email || !password || !firstName || !lastName) {
  //     setError('Please fill in all fields'); return;
  //   }
  //   if (!isValidEmail(email)) { setError('Please enter a valid email'); return; }
  //   if (password.length < 6)  { setError('Password must be at least 6 characters'); return; }
  //   setLoading(true);
  //   try {
  //     const response = await authAPI.signup(email, password, firstName, lastName, 'user');
  //     if (response.success) {
  //       setSignupEmail(email);
  //       setAuthStep('verify');
  //       setOtp('');
  //     } else {
  //       setError(response.error || 'Signup failed');
  //     }
  //   } catch (err) {
  //     setError('An error occurred. Please try again.');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // const handleVerifyOtp = async (e) => {
  //   e.preventDefault();
  //   setError('');
  //   if (!otp || otp.length < 4) { setError('Please enter a valid OTP'); return; }
  //   setLoading(true);
  //   try {
  //     const response = await authAPI.verifyOtp(signupEmail, otp);
  //     if (response.success) {
  //       onLoginSuccess(response.data.user || signupEmail);
  //       setAuthStep('login');
  //       setEmail(''); setPassword(''); setFirstName('');
  //       setLastName(''); setOtp(''); setSignupEmail('');
  //     } else {
  //       setError(response.error || 'OTP verification failed');
  //     }
  //   } catch (err) {
  //     setError('An error occurred. Please try again.');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-logo">🚢</div>
          <div>
            <div className="brand-title">Azolla ESD Platform</div>
            <div className="brand-sub">Decarbonisation Suite</div>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        {/* LOGIN FORM */}
        {authStep === 'login' && (
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-section-title">Login</div>

            <div className="form-group">
              <label htmlFor="login-email" className="form-label">Email Address</label>
              <input
                id="login-email" type="email" className="form-input"
                placeholder="user@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                disabled={loading} autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label">Password</label>
              <input
                id="login-password" type="password" className="form-input"
                placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                disabled={loading} autoComplete="current-password"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? ' Signing in...' : '→ Sign In'}
            </button>

            {/* Sign up link commented out — account creation is admin-only
            <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              Don't have an account?{' '}
              <button type="button"
                onClick={() => { setAuthStep('signup'); setError(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', textDecoration: 'underline', cursor: 'pointer' }}
              >
                Sign up
              </button>
            </div>
            */}
          </form>
        )}

        {/* SIGNUP FORM — commented out, users created manually by admin
        {authStep === 'signup' && (
          <form onSubmit={handleSignup} className="login-form">
            <div className="form-section-title">Create Account</div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" placeholder="user@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
            </div>
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input type="text" className="form-input" placeholder="John"
                value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={loading} />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input type="text" className="form-input" placeholder="Doe"
                value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={loading} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="form-input" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? ' Creating account...' : '→ Sign Up'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '14px' }}>
              Already have an account?{' '}
              <button type="button" onClick={() => { setAuthStep('login'); setError(''); }}
                style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>
                Sign in
              </button>
            </div>
          </form>
        )}
        */}

        {/* OTP VERIFICATION FORM — commented out, users created manually by admin
        {authStep === 'verify' && (
          <form onSubmit={handleVerifyOtp} className="login-form">
            <div className="form-section-title">Verify OTP</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Enter the 6-digit code sent to {signupEmail}
            </div>
            <div className="form-group">
              <label className="form-label">OTP Code</label>
              <input type="text" className="form-input" placeholder="000000"
                value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={loading} maxLength="6" autoComplete="off" />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '🔄 Verifying...' : '→ Verify'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '14px' }}>
              <button type="button" onClick={() => { setAuthStep('signup'); setError(''); }}
                style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>
                Back to sign up
              </button>
            </div>
          </form>
        )}
        */}

      </div>
    </div>
  );
}

export default LoginPage;
