const API_BASE_URL = 'http://192.168.1.3:8000';
import { supabase } from './supabaseClient';

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}
export async function parseMeal(messages: any[]) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/parse-macros`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ messages }),
  });
  if (!response.ok) {
    let errMsg = `Server error ${response.status}`;
    try { const j = await response.json(); if (j?.detail) errMsg = j.detail; } catch (_) {}
    throw new Error(errMsg);
  }
  return response.json();
}

export async function transcribeAudio(audioUri: string) {
  const token = await getToken();
  
  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    name: 'audio.m4a',
    type: 'audio/m4a',
  } as any);

  const response = await fetch(`${API_BASE_URL}/transcribe`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errMsg = `Server error ${response.status}`;
    try { const j = await response.json(); if (j?.detail) errMsg = j.detail; } catch (_) {}
    throw new Error(errMsg);
  }
  
  return response.json();
}

export async function confirmLogMeal(data: any) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/log-meal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    let errMsg = `Server error ${response.status}`;
    try { const j = await response.json(); if (j?.detail) errMsg = j.detail; } catch (_) {}
    throw new Error(errMsg);
  }
  return response.json();
}

export async function getLogs(tz: string, date?: string) {
  const token = await getToken();
  const params = new URLSearchParams({ tz });
  if (date) params.set('date', date);
  const response = await fetch(`${API_BASE_URL}/get-logs?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Failed to fetch logs: ${await response.text()}`);
  return response.json();
}

export async function deleteLog(logId: number) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/logs/${logId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Failed to delete log: ${await response.text()}`);
}

export async function getSummary(tz: string) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/logs-summary?tz=${encodeURIComponent(tz)}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Failed to fetch summary: ${await response.text()}`);
  return response.json();
}

export async function getWeeklyAnalytics(tz: string) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/analytics/weekly?tz=${encodeURIComponent(tz)}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Failed to fetch weekly analytics: ${await response.text()}`);
  return response.json();
}

export async function getProfile() {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/profile`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch profile: ${await response.text()}`);
  }
  return response.json();
}

export async function saveProfile(profileData: any) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(profileData),
  });
  if (!response.ok) throw new Error(`Failed to save profile: ${await response.text()}`);
  return response.json();
}

export async function updateProfile(profileData: any) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(profileData),
  });
  if (!response.ok) throw new Error(`Failed to update profile: ${await response.text()}`);
  return response.json();
}

export async function getRecipes() {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/recipes`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Failed to fetch recipes: ${await response.text()}`);
  return response.json();
}

export async function saveRecipe(recipeData: any) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(recipeData),
  });
  if (!response.ok) throw new Error(`Failed to save recipe: ${await response.text()}`);
  return response.json();
}

export async function deleteRecipe(recipeId: number) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/recipes/${recipeId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Failed to delete recipe: ${await response.text()}`);
}

export async function logRecipe(recipeId: number) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/recipes/${recipeId}/log`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Failed to log recipe: ${await response.text()}`);
  return response.json();
}

export async function logWeight(weight: number) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/weight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ weight_kg: weight }),
  });
  if (!response.ok) throw new Error(`Failed to log weight: ${await response.text()}`);
  return response.json();
}

export async function getWeightHistory(days: number = 30) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/weight?days=${days}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Failed to fetch weight history: ${await response.text()}`);
  return response.json();
}

export async function searchExercises(q: string) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/exercises/search?q=${encodeURIComponent(q)}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Failed to search exercises: ${await response.text()}`);
  return response.json();
}

export async function logWorkout(workoutData: any) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/workouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(workoutData),
  });
  if (!response.ok) {
    let errMsg = `Server error ${response.status}`;
    try { const j = await response.json(); if (j?.detail) errMsg = j.detail; } catch (_) {}
    throw new Error(errMsg);
  }
  return response.json();
}

export async function getWorkouts() {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/workouts`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Failed to fetch workouts: ${await response.text()}`);
  return response.json();
}
