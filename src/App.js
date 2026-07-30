import React, { useState } from 'react';
import LoginPage from './components/LoginPage';
import Tracker from './components/Tracker';
import './App.css';

function App() {
  // Check localStorage for existing session
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('Authorization'));
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('userEmail') || '');
  const [isAdmin,   setIsAdmin]   = useState(() => localStorage.getItem('isAdmin') === 'true');

  const handleLoginSuccess = (data) => {
    const email = typeof data === 'string' ? data : data?.user?.email || data?.email || '';
    const role  = data?.user?.role || 'user';
    localStorage.setItem('userEmail', email);
    localStorage.setItem('isAdmin', role === 'admin' ? 'true' : 'false');
    setUserEmail(email);
    setIsAdmin(role === 'admin');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('Authorization');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('isAdmin');
    setIsLoggedIn(false);
    setUserEmail('');
    setIsAdmin(false);
  };

  return (
    <div className="app">
      {isLoggedIn ? (
        <Tracker userEmail={userEmail} isAdmin={isAdmin} onLogout={handleLogout} />
      ) : (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;
