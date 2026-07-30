import React, { useState } from 'react';
import { authAPI } from '../services/apiService';
import './LoginPage.css';

function LoginPage({ onLoginSuccess }) {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [authStep, setAuthStep] = useState('login'); 
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [otp, setOtp] = useState('');
  const [signupEmail, setSignupEmail] = useState('');


  const isValidEmail = (email) => {
    return email.includes('@') && email.length > 5;
  };


  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {

      const response = await authAPI.login(email, password);

      if (response.success) {


        // Pass full response data so App.js can read user.role
        onLoginSuccess(response.data);

        // Clear form
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


  // ── Signup commented out — users created by admin via bypass-signup API ──
  /* const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !firstName || !lastName) {
      setError('Please fill in all fields');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {

      const response = await authAPI.signup(
        email,
        password,
        firstName,
        lastName,
        'user'
      );

      if (response.success) {


        setSignupEmail(email);


        setAuthStep('verify');
        setOtp('');
      } else {
        setError(response.error || 'Signup failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };


  */

  // ── OTP verification commented out ──
  /* const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (!otp || otp.length < 4) {
      setError('Please enter a valid OTP');
      return;
    }

    setLoading(true);

    try {

      const response = await authAPI.verifyOtp(signupEmail, otp);

      if (response.success) {


        onLoginSuccess(response.data.user || signupEmail);


        setAuthStep('login');
        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');
        setOtp('');
        setSignupEmail('');
      } else {
        setError(response.error || 'OTP verification failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('OTP verification error:', err);
    } finally {
      setLoading(false);
    }
  };
  */

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-logo"><img src="/Swoosh.png" alt="AZOLLA Logo" style={{width: "22px", height: "22px"}} /></div>
          <div>
            <div className="brand-title">AZOLLA ESD PLATFORM</div>
            <div className="brand-sub">Decarbonisation Suite</div>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        {/* LOGIN FORM */}
        {authStep === 'login' && (
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-section-title">Login</div>

            <div className="form-group">
              <label htmlFor="login-email" className="form-label">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? ' Signing in...' : '→ Sign In'}
            </button>


          </form>
        )}







      </div>
    </div>
  );
}

export default LoginPage;
 