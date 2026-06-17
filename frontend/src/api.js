const API_BASE_URL = 'http://localhost:8000';

/**
 * Log a meal using natural language.
 */
export async function logMeal(token, userInput) {
  const response = await fetch(`${API_BASE_URL}/calculate-macros`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`, // Send token to backend bouncer
    },
    body: JSON.stringify({ user_input: userInput }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to log meal: ${errText}`);
  }

  return await response.json();
}

/**
 * Get all logged meals for a user.
 */
export async function getLogs(token) {
  const response = await fetch(`${API_BASE_URL}/get-logs`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`, // Send token to backend bouncer
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to fetch logs: ${errText}`);
  }

  return await response.json();
}

/**
 * Get the daily macro summary for a user.
 */
export async function getSummary(token) {
  const response = await fetch(`${API_BASE_URL}/logs-summary`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`, // Send token to backend bouncer
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to fetch summary: ${errText}`);
  }

  return await response.json();
}
