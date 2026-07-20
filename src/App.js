import React, { useState } from 'react';
import LoginPage from './components/LoginPage';
import Tracker from './components/Tracker';
import './App.css';

function App() {
  // Check localStorage for existing session
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('Authorization'));
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('userEmail') || '');

  const handleLoginSuccess = (email) => {
    localStorage.setItem('userEmail', typeof email === 'string' ? email : email?.email || '');
    setUserEmail(typeof email === 'string' ? email : email?.email || '');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('Authorization');
    localStorage.removeItem('userEmail');
    setIsLoggedIn(false);
    setUserEmail('');
  };

  return (
    <div className="app">
      {isLoggedIn ? (
        <Tracker userEmail={userEmail} onLogout={handleLogout} />
      ) : (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;
