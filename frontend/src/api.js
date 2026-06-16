const API_BASE_URL = 'http://localhost:8000';

/**
 * Log a meal using natural language.
 */
export async function logMeal(userId, userInput) {
  const response = await fetch(`${API_BASE_URL}/calculate-macros`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
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
export async function getLogs(userId) {
  const response = await fetch(`${API_BASE_URL}/get-logs`, {
    method: 'GET',
    headers: {
      'X-User-Id': userId,
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
export async function getSummary(userId) {
  const response = await fetch(`${API_BASE_URL}/logs-summary`, {
    method: 'GET',
    headers: {
      'X-User-Id': userId,
    },
  });
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to fetch summary: ${errText}`);
  }
  
  return await response.json();
}
