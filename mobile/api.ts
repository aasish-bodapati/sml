const API_BASE_URL = 'http://192.168.1.3:8000';

export async function logMeal(token: string, userInput: string) {
  const response = await fetch(`${API_BASE_URL}/calculate-macros`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ user_input: userInput }),
  });
  if (!response.ok) {
    let errMsg = `Server error ${response.status}`;
    try { const j = await response.json(); if (j?.detail) errMsg = j.detail; } catch (_) {}
    throw new Error(errMsg);
  }
  return response.json();
}

export async function getLogs(token: string, tz: string, date?: string) {
  const params = new URLSearchParams({ tz });
  if (date) params.set('date', date);
  const response = await fetch(`${API_BASE_URL}/get-logs?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Failed to fetch logs: ${await response.text()}`);
  return response.json();
}

export async function deleteLog(token: string, logId: number) {
  const response = await fetch(`${API_BASE_URL}/logs/${logId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Failed to delete log: ${await response.text()}`);
}

export async function getSummary(token: string, tz: string) {
  const response = await fetch(`${API_BASE_URL}/logs-summary?tz=${encodeURIComponent(tz)}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Failed to fetch summary: ${await response.text()}`);
  return response.json();
}
