import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Alert, StatusBar, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Session } from '@supabase/supabase-js';
import BottomTabBar from '../components/BottomTabBar';
import HomeTab from './HomeTab';
import ChatTab from './ChatTab';
import HistoryTab from './HistoryTab';
import ProfileTab from './ProfileTab';
import FitnessTab from './FitnessTab';
import RecipesScreen from './RecipesScreen';
import LogWorkoutScreen from './LogWorkoutScreen';
import { getLogs, getSummary, getWeeklyAnalytics, getWeightHistory, getRecipes, deleteLog, deleteRecipe, logRecipe, saveRecipe, getWorkouts } from '../api';
import { MacroTargets, UserProfilePayload } from '../OnboardingScreen';
import { s } from '../styles/appStyles';
import { C, rs, fs } from '../design-tokens';

export const DEFAULT_SUMMARY = { calories: 0, protein: 0, carbohydrates: 0, fat: 0 };

export default function DashboardScreen({ session, targetMacros, rawProfile, onUpdateProfile }: { session: Session, targetMacros: MacroTargets | null, rawProfile: UserProfilePayload | null, onUpdateProfile: (t: MacroTargets, p: UserProfilePayload) => void }) {
  const [activeTab, setActiveTab] = useState('home');
  const [userInput, setUserInput] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [showRecipesScreen, setShowRecipesScreen] = useState(false);
  const [showLogMealModal, setShowLogMealModal] = useState(false);
  const [showLogWorkoutScreen, setShowLogWorkoutScreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState<Date>(new Date());

  useEffect(() => {
    setLogs([]); // Clear old logs instantly when date switches
    fetchData();
  }, [viewDate]);

  useEffect(() => {
    if (activeTab === 'history' || activeTab === 'home') {
      const today = new Date();
      if (viewDate.toDateString() !== today.toDateString()) {
        setViewDate(today);
      }
    }
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const dateStr = viewDate.getFullYear() + '-' + String(viewDate.getMonth() + 1).padStart(2, '0') + '-' + String(viewDate.getDate()).padStart(2, '0');
      const [rawLogs, rawSummary, rawWeekly, rawRecipes, rawWeight, rawWorkouts] = await Promise.all([
        getLogs(tz, dateStr), 
        getSummary(tz), 
        getWeeklyAnalytics(tz),
        getRecipes(),
        getWeightHistory(30),
        getWorkouts()
      ]);
      setLogs([...rawLogs].reverse());
      setSummary(rawSummary);
      setWeeklyData(rawWeekly);
      setRecipes(rawRecipes);
      setWeightHistory(rawWeight);
      setWorkouts(rawWorkouts);
      setError(null);
    } catch (e: any) { setError('Could not reach the backend. Make sure it is running.'); }
    finally { setIsLoading(false); }
  };


  const handleDeleteLog = async (id: number) => {
    // Optimistic UI update: instantly remove log from list
    const previousLogs = [...logs];
    setLogs(logs.filter(log => log.id !== id));

    try {
      await deleteLog(id);
      await fetchData();
    } catch (e: any) {
      setLogs(previousLogs); // Rollback on failure
      setError(e.message || 'Failed to delete log.');
    }
  };

  const handleSaveRecipe = async (name: string, item: any) => {
    setIsLoading(true); setError(null);
    try {
      await saveRecipe({
        name,
        calories: item.calories,
        protein: item.protein,
        carbohydrates: item.carbohydrates,
        fat: item.fat
      });
      await fetchData();
    } catch (e: any) { setError(e.message || 'Failed to save recipe.'); }
    finally { setIsLoading(false); }
  };

  const handleLogRecipe = async (id: number) => {
    setIsLoading(true); setError(null);
    try {
      await logRecipe(id);
      await fetchData();
    } catch (e: any) { setError(e.message || 'Failed to log recipe.'); }
    finally { setIsLoading(false); }
  };

  const handleDeleteRecipe = async (id: number) => {
    const previous = [...recipes];
    setRecipes(recipes.filter(r => r.id !== id));
    try {
      await deleteRecipe(id);
    } catch (e: any) {
      setRecipes(previous);
      setError(e.message || 'Failed to delete recipe.');
    }
  };

  const macros = [
    { label: 'Calories', value: summary.calories, target: targetMacros?.calories, unit: 'kcal', color: C.cal },
    { label: 'Protein', value: summary.protein, target: targetMacros?.protein, unit: 'g', color: C.protein },
    { label: 'Carbs', value: summary.carbohydrates, target: targetMacros?.carbs, unit: 'g', color: C.carbs },
    { label: 'Fat', value: summary.fat, target: targetMacros?.fat, unit: 'g', color: C.fat },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />

      {showRecipesScreen ? (
        <RecipesScreen 
          recipes={recipes} 
          handleLogRecipe={handleLogRecipe} 
          handleDeleteRecipe={handleDeleteRecipe} 
          onBack={() => setShowRecipesScreen(false)} 
        />
      ) : showLogWorkoutScreen ? (
        <LogWorkoutScreen 
          workoutHistory={workouts}
          onBack={() => setShowLogWorkoutScreen(false)}
          onSuccess={() => {
            setShowLogWorkoutScreen(false);
            setActiveTab('fitness');
            fetchData();
          }}
        />
      ) : showLogMealModal ? (
        <ChatTab 
          fetchData={fetchData} 
          onClose={() => setShowLogMealModal(false)}
          recipes={recipes}
        />
      ) : (
        <>
          {activeTab === 'home' && (
            <View style={s.header}>
              <View style={{ flex: 1 }}>
                <Text style={s.headerTitle}>LyfSync</Text>
                <Text style={{ color: C.textSecondary, fontSize: fs(13) }}>{session.user?.email}</Text>
              </View>
            </View>
          )}

          {activeTab === 'history' && (
            <View style={[s.header, { justifyContent: 'space-between' }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.headerTitle}>Nutrition</Text>
                <Text style={{ color: C.textSecondary, fontSize: fs(13) }}>History & Logs</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: rs(8), alignItems: 'center' }}>
                <TouchableOpacity 
                  onPress={() => setShowRecipesScreen(true)} 
                  style={{ backgroundColor: 'rgba(56,189,248,0.1)', paddingHorizontal: rs(12), paddingVertical: rs(6), borderRadius: rs(8), borderWidth: rs(1), borderColor: C.border }}
                >
                  <Text style={{ color: C.accent, fontSize: fs(13), fontWeight: 'bold' }}>Recipes</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setShowLogMealModal(true)} 
                  style={{ backgroundColor: C.accent, paddingHorizontal: rs(12), paddingVertical: rs(6), borderRadius: rs(8) }}
                >
                  <Text style={{ color: C.bg, fontSize: fs(13), fontWeight: 'bold' }}>+ Log Meal</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {activeTab === 'fitness' && (
            <View style={[s.header, { justifyContent: 'space-between' }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.headerTitle}>Fitness</Text>
                <Text style={{ color: C.textSecondary, fontSize: fs(13) }}>Workouts & Routines</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: rs(8), alignItems: 'center' }}>
                <TouchableOpacity 
                  onPress={() => setShowLogWorkoutScreen(true)} 
                  style={{ backgroundColor: C.accent, paddingHorizontal: rs(12), paddingVertical: rs(6), borderRadius: rs(8) }}
                >
                  <Text style={{ color: C.bg, fontSize: fs(13), fontWeight: 'bold' }}>+ Log Workout</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {error ? (
            <View style={s.errorBanner}><Text style={{ color: '#fca5a5' }}>⚠️ {error}</Text></View>
          ) : null}

          <View style={{ flex: 1 }}>
            {activeTab === 'home' && (
              <HomeTab
                summary={summary} macros={macros} weeklyData={weeklyData} targetMacros={targetMacros}
                workouts={workouts}
                setViewDate={setViewDate} setActiveTab={setActiveTab}
                onLogWorkout={() => setShowLogWorkoutScreen(true)}
                onLogMeal={() => setShowLogMealModal(true)}
              />
            )}
            {activeTab === 'fitness' && (
              <FitnessTab />
            )}
            {activeTab === 'history' && (
              <HistoryTab
                logs={logs} viewDate={viewDate} setViewDate={setViewDate}
                handleDeleteLog={handleDeleteLog} handleSaveRecipe={handleSaveRecipe}
                setShowRecipesScreen={setShowRecipesScreen} setActiveTab={setActiveTab}
              />
            )}
            {activeTab === 'profile' && (
              <ProfileTab
                session={session}
                targetMacros={targetMacros}
                rawProfile={rawProfile}
                onUpdateProfile={onUpdateProfile}
                weightHistory={weightHistory}
                fetchData={fetchData}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            )}
          </View>

          <BottomTabBar active={activeTab} onSelect={setActiveTab} />
        </>
      )}
    </SafeAreaView>
  );
}

