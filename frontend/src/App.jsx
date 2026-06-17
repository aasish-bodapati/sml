import { useState, useEffect } from 'react';
import { logMeal, getLogs, getSummary } from './api';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import './App.css';

const DEFAULT_SUMMARY = {
  total_calories: 0,
  total_protein: 0,
  total_carbohydrates: 0,
  total_fat: 0,
};

function App() {
  const [session, setSession] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Monitor Supabase auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch logs and summary when session changes (e.g. login)
  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    if (!session) return;
    try {
      const token = session.access_token;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const [fetchedLogs, fetchedSummary] = await Promise.all([
        getLogs(token),
        getSummary(token, tz),
      ]);
      setLogs(fetchedLogs);
      setSummary(fetchedSummary);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Could not reach the backend. Is it running on port 8000?');
    }
  };

  const handleLogMeal = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || !session) return;
    setIsLoading(true);
    setError(null);
    try {
      const token = session.access_token;
      await logMeal(token, userInput);
      setUserInput('');
      await fetchData();
    } catch (err) {
      console.error('Error logging meal:', err);
      setError('Failed to log meal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // If not logged in, redirect to login screen
  if (!session) {
    return <Auth />;
  }

  const macros = [
    { key: 'cal',  label: 'Calories', value: summary.calories,      unit: 'kcal' },
    { key: 'pro',  label: 'Protein',  value: summary.protein,       unit: 'g'    },
    { key: 'carb', label: 'Carbs',    value: summary.carbohydrates, unit: 'g'    },
    { key: 'fat',  label: 'Fat',      value: summary.fat,           unit: 'g'    },
  ];

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-logo">
          <span className="header-icon">🥗</span>
          <h1>Macro Tracker</h1>
        </div>
        <p className="header-sub">Log meals in plain English. See your numbers.</p>
        <div className="user-pill" style={{ gap: '12px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {session.user.email}
          </span>
          <button 
            onClick={handleSignOut} 
            className="log-btn" 
            style={{ 
              padding: '6px 12px', 
              fontSize: '0.75rem', 
              boxShadow: 'none',
              background: 'rgba(255, 255, 255, 0.08)'
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <main>
        {/* ── Today's Summary ── */}
        <div className="section">
          <p className="section-title">Today's Summary</p>
          <div className="macro-grid">
            {macros.map(({ key, label, value, unit }) => (
              <div key={key} className={`macro-card ${key}`}>
                <span className="macro-label">{label}</span>
                <span className="macro-value">{value || 0}</span>
                <span className="macro-unit">{unit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Log a Meal ── */}
        <div className="section">
          <p className="section-title">Log a Meal</p>
          <form onSubmit={handleLogMeal} className="log-form">
            <div className="meal-input-wrapper">
              <input
                type="text"
                className="meal-input"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder='e.g. "2 boiled eggs and a cup of oats"'
                disabled={isLoading}
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="log-btn"
              disabled={isLoading || !userInput.trim()}
            >
              {isLoading ? (
                <><span className="spinner" /> Logging…</>
              ) : (
                <>+ Log</>
              )}
            </button>
          </form>
        </div>

        {/* ── Meal History ── */}
        <div className="section">
          <p className="section-title">Meal History</p>
          {logs.length === 0 ? (
            <p className="no-logs">Nothing logged yet. Add your first meal above ↑</p>
          ) : (
            <ul className="log-list">
              {[...logs].reverse().map((log) => (
                <li key={log.id} className="log-item">
                  <div className="log-info">
                    <span className="log-name">{log.name}</span>
                    <div className="log-macros">
                      <span className="macro-chip">🔥 {log.calories} kcal</span>
                      <span className="macro-chip">💪 {log.protein}g P</span>
                      <span className="macro-chip">🌾 {log.carbohydrates}g C</span>
                      <span className="macro-chip">🧈 {log.fat}g F</span>
                    </div>
                  </div>
                  <span className="log-time">
                    {new Date(log.created_at + 'Z').toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
