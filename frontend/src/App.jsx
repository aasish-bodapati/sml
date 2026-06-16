import { useState, useEffect } from 'react';
import { logMeal, getLogs, getSummary } from './api';
import './App.css';

const DEFAULT_SUMMARY = {
  total_calories: 0,
  total_protein: 0,
  total_carbohydrates: 0,
  total_fat: 0,
};

function App() {
  const [userId, setUserId] = useState('demo_user');
  const [userInput, setUserInput] = useState('');
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    if (!userId.trim()) return;
    try {
      const [fetchedLogs, fetchedSummary] = await Promise.all([
        getLogs(userId),
        getSummary(userId),
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
    if (!userInput.trim() || !userId.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      await logMeal(userId, userInput);
      setUserInput('');
      await fetchData();
    } catch (err) {
      console.error('Error logging meal:', err);
      setError('Failed to log meal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const macros = [
    { key: 'cal',  label: 'Calories', value: summary.total_calories,      unit: 'kcal' },
    { key: 'pro',  label: 'Protein',  value: summary.total_protein,        unit: 'g'    },
    { key: 'carb', label: 'Carbs',    value: summary.total_carbohydrates,  unit: 'g'    },
    { key: 'fat',  label: 'Fat',      value: summary.total_fat,            unit: 'g'    },
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
        <div className="user-pill">
          <label htmlFor="userId">User</label>
          <input
            id="userId"
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="user_id"
          />
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
                <span className="macro-value">{value}</span>
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
