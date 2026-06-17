import 'react-native-url-polyfill/auto';
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, KeyboardAvoidingView,
  Platform, StatusBar, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { parseMeal, confirmLogMeal, getLogs, getSummary, getWeeklyAnalytics, logWeight, getWeightHistory, deleteLog, getProfile, saveProfile, getRecipes, saveRecipe, deleteRecipe, logRecipe } from './api';
import OnboardingScreen, { MacroTargets, UserProfilePayload } from './OnboardingScreen';
import { calculationService } from './calculation-service';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

// ─── Colours ─────────────────────────────────────────────────────────────────
const C = {
  bg: '#0f172a',
  surface: 'rgba(30,41,59,0.7)',
  accent: '#38bdf8',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  border: 'rgba(56,189,248,0.2)',
  error: '#ef4444',
  cal: '#f97316',
  protein: '#38bdf8',
  carbs: '#4ade80',
  fat: '#f43f5e',
};

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) { setMessage('Please fill in both fields.'); return; }
    setLoading(true); setMessage('');
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Check your email to confirm!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) { setMessage(e.message); }
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
      <View style={s.loginContainer}>
        <Text style={s.loginTitle}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
        {message ? <View style={s.msgBanner}><Text style={s.msgText}>{message}</Text></View> : null}
        <TextInput style={s.input} placeholder="Email" placeholderTextColor={C.textSecondary}
          value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={s.input} placeholder="Password" placeholderTextColor={C.textSecondary}
          value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={s.btn} onPress={handleAuth} disabled={loading}>
          {loading ? <ActivityIndicator color={C.bg} /> : <Text style={s.btnText}>{isSignUp ? 'Sign Up' : 'Sign In'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={{ marginTop: 16, alignItems: 'center' }}>
          <Text style={{ color: C.textSecondary }}>
            {isSignUp ? 'Have an account? ' : "No account? "}
            <Text style={{ color: C.accent, fontWeight: 'bold' }}>{isSignUp ? 'Sign In' : 'Sign Up'}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Bottom Tab Bar ───────────────────────────────────────────────────────────
function BottomTabBar({ active, onSelect }: { active: string, onSelect: (t: string) => void }) {
  const tabs = [
    { key: 'home', label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid' },
    { key: 'history', label: 'Logs', icon: 'bar-chart-outline', iconActive: 'bar-chart' },
    { key: 'profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
  ];
  return (
    <View style={s.tabBar}>
      {tabs.map(t => {
        const isActive = active === t.key;
        return (
          <TouchableOpacity key={t.key} onPress={() => onSelect(t.key)} style={s.tabItem}>
            <Ionicons
              name={(isActive ? t.iconActive : t.icon) as any}
              size={24}
              color={isActive ? C.accent : C.textMuted}
            />
            <Text style={[s.tabLabel, isActive && { color: C.accent }]}>{t.label}</Text>
            {isActive && <View style={s.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Home Tab ─────────────────────────────────────────────────────────────────
function HomeTab({ summary, macros, weeklyData, targetMacros, userInput, setUserInput, isLoading, setIsLoading, setError, fetchData, setViewDate, setActiveTab }: any) {
  const [pendingMeal, setPendingMeal] = useState<any>(null);
  const [editedMeal, setEditedMeal] = useState<any>(null);

  const handleParse = async () => {
    if (!userInput.trim()) return;
    setIsLoading(true); setError(null);
    try {
      const result = await parseMeal(userInput);
      setPendingMeal(result);
      setEditedMeal({ ...result, meal_type: result.meal_type || 'snack' });
    } catch (e: any) { setError(e.message || 'Failed to parse meal.'); }
    finally { setIsLoading(false); }
  };

  const handleConfirm = async () => {
    setIsLoading(true); setError(null);
    try {
      await confirmLogMeal(editedMeal);
      setPendingMeal(null);
      setEditedMeal(null);
      setUserInput('');
      await fetchData();
    } catch (e: any) { setError(e.message || 'Failed to log meal.'); }
    finally { setIsLoading(false); }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={s.sectionTitle}>Summary</Text>
      <View style={{ backgroundColor: C.surface, padding: 16, borderRadius: 14 }}>
        {macros.map((m: any, idx: number) => {
          const target = m.target || 1;
          const current = m.value || 0;
          const progress = Math.min(Math.max(current / target, 0), 1);

          return (
            <View key={m.label} style={{ marginBottom: idx === macros.length - 1 ? 0 : 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: C.textPrimary, fontWeight: '600' }}>{m.label}</Text>
                <Text style={{ color: C.textSecondary, fontSize: 13 }}>
                  <Text style={{ color: C.textPrimary, fontWeight: '500' }}>{current}</Text>{m.unit} {m.target ? `/ ${m.target}${m.unit}` : ''}
                </Text>
              </View>
              <View style={{ height: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 6, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${progress * 100}%`, backgroundColor: m.color, borderRadius: 6 }} />
              </View>
            </View>
          );
        })}
      </View>

      <Text style={[s.sectionTitle, { marginTop: 28 }]}>Weekly Progress</Text>
      <View style={{ backgroundColor: C.surface, padding: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 160 }}>
        {weeklyData.map((day: any) => {
          const maxCal = Math.max(...weeklyData.map((d: any) => d.calories || 1), targetMacros?.calories || 2000);
          const heightPct = Math.min((day.calories / maxCal) * 100, 100);
          const isToday = new Date().toISOString().split('T')[0] === day.date;
          const dayName = new Date(day.date).toLocaleDateString(undefined, { weekday: 'narrow' });
          return (
            <TouchableOpacity 
              key={day.date} 
              style={{ alignItems: 'center', flex: 1 }}
              onPress={() => {
                setViewDate(new Date(day.date));
                setActiveTab('history');
              }}
            >
              <View style={{ width: '60%', height: '100%', justifyContent: 'flex-end', marginBottom: 8 }}>
                <View style={{ width: '100%', height: `${heightPct}%`, backgroundColor: isToday ? C.accent : C.cal, borderRadius: 4, minHeight: 4 }} />
              </View>
              <Text style={{ color: isToday ? C.accent : C.textSecondary, fontSize: 12, fontWeight: isToday ? 'bold' : 'normal' }}>{dayName}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[s.sectionTitle, { marginTop: 28 }]}>Log a Meal</Text>
      {!pendingMeal ? (
        <View style={s.logForm}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            placeholder='e.g. "2 boiled eggs"'
            placeholderTextColor={C.textSecondary}
            value={userInput}
            onChangeText={setUserInput}
            onSubmitEditing={handleParse}
            returnKeyType="send"
          />
          <TouchableOpacity style={s.logBtn} onPress={handleParse} disabled={isLoading || !userInput.trim()}>
            {isLoading ? <ActivityIndicator color={C.bg} size="small" /> : <Text style={s.btnText}>+ Log</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.confirmationCard}>
          <Text style={{ color: C.textPrimary, fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>Confirm Meal Details</Text>
          
          <View style={s.editRow}>
            <Text style={s.editLabel}>Name</Text>
            <TextInput style={s.editInput} value={editedMeal.name} onChangeText={t => setEditedMeal({...editedMeal, name: t})} />
          </View>
          
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={[s.editRow, { flex: 1 }]}>
              <Text style={s.editLabel}>Kcal</Text>
              <TextInput style={s.editInput} keyboardType="numeric" value={editedMeal.calories.toString()} onChangeText={t => setEditedMeal({...editedMeal, calories: parseInt(t) || 0})} />
            </View>
            <View style={[s.editRow, { flex: 1 }]}>
              <Text style={s.editLabel}>Protein</Text>
              <TextInput style={s.editInput} keyboardType="numeric" value={editedMeal.protein.toString()} onChangeText={t => setEditedMeal({...editedMeal, protein: parseInt(t) || 0})} />
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={[s.editRow, { flex: 1 }]}>
              <Text style={s.editLabel}>Carbs</Text>
              <TextInput style={s.editInput} keyboardType="numeric" value={editedMeal.carbohydrates.toString()} onChangeText={t => setEditedMeal({...editedMeal, carbohydrates: parseInt(t) || 0})} />
            </View>
            <View style={[s.editRow, { flex: 1 }]}>
              <Text style={s.editLabel}>Fat</Text>
              <TextInput style={s.editInput} keyboardType="numeric" value={editedMeal.fat.toString()} onChangeText={t => setEditedMeal({...editedMeal, fat: parseInt(t) || 0})} />
            </View>
          </View>
          
          <Text style={[s.editLabel, { marginTop: 8 }]}>Meal Type</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {['breakfast', 'lunch', 'dinner', 'snack'].map(type => (
              <TouchableOpacity key={type} onPress={() => setEditedMeal({...editedMeal, meal_type: type})} style={[s.mealTypePill, editedMeal.meal_type === type && s.mealTypePillActive]}>
                <Text style={[s.mealTypeText, editedMeal.meal_type === type && s.mealTypeTextActive]}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={[s.btn, { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: C.border }]} onPress={() => { setPendingMeal(null); setEditedMeal(null); }}>
              <Text style={[s.btnText, { color: C.textPrimary }]}>✕ Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, { flex: 1, marginBottom: 0 }]} onPress={handleConfirm} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color={C.bg} /> : <Text style={s.btnText}>✓ Confirm & Log</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────
function HistoryTab({ logs, viewDate, setViewDate, handleDeleteLog, handleSaveRecipe, setShowRecipesScreen }: any) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <FlatList
      data={logs}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={{ padding: 16 }}
      ListHeaderComponent={
        <>
          {/* Date Navigator */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <TouchableOpacity onPress={() => { const d = new Date(viewDate); d.setDate(d.getDate() - 1); setViewDate(d); }} style={{ padding: 8 }}>
              <Text style={{ color: C.accent, fontWeight: 'bold', fontSize: 16 }}>{'<'} Prev</Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={viewDate}
                mode="date"
                display="compact"
                themeVariant="dark"
                onChange={(event, selectedDate) => {
                  if (selectedDate) setViewDate(selectedDate);
                }}
              />
            ) : (
              <TouchableOpacity onPress={() => setShowPicker(true)}>
                <Text style={{ color: C.textPrimary, fontSize: 16, fontWeight: '600' }}>
                  {viewDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => { const d = new Date(viewDate); d.setDate(d.getDate() + 1); setViewDate(d); }} style={{ padding: 8 }}>
              <Text style={{ color: C.accent, fontWeight: 'bold', fontSize: 16 }}>Next {'>'}</Text>
            </TouchableOpacity>
          </View>
          {Platform.OS !== 'ios' && showPicker && (
            <DateTimePicker
              value={viewDate}
              mode="date"
              display="default"
              themeVariant="dark"
              onChange={(event, selectedDate) => {
                setShowPicker(false);
                if (selectedDate) {
                  setViewDate(selectedDate);
                }
              }}
            />
          )}

          {/* History label */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={[s.sectionTitle, { marginBottom: 0 }]}>Meal History</Text>
            <TouchableOpacity onPress={() => setShowRecipesScreen(true)} style={{ backgroundColor: 'rgba(56,189,248,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ color: C.accent, fontSize: 13, fontWeight: 'bold' }}>⭐ Saved Recipes</Text>
            </TouchableOpacity>
          </View>
          {logs.length === 0 && <Text style={{ color: C.textMuted, fontStyle: 'italic', textAlign: 'center', marginTop: 16 }}>Nothing logged.</Text>}
        </>
      }
      renderItem={({ item }) => {
        let typeBadgeColor = 'transparent';
        let typeBadgeIcon = '';
        if (item.meal_type === 'breakfast') { typeBadgeColor = '#f97316'; typeBadgeIcon = '🌅'; }
        else if (item.meal_type === 'lunch') { typeBadgeColor = '#38bdf8'; typeBadgeIcon = '☀️'; }
        else if (item.meal_type === 'dinner') { typeBadgeColor = '#6366f1'; typeBadgeIcon = '🌙'; }
        else if (item.meal_type === 'snack') { typeBadgeColor = '#10b981'; typeBadgeIcon = '🍎'; }

        return (
          <View style={s.logItem}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={s.logName}>{item.name}</Text>
                {item.meal_type && (
                  <View style={{ backgroundColor: `${typeBadgeColor}20`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: `${typeBadgeColor}40` }}>
                    <Text style={{ color: typeBadgeColor, fontSize: 10, fontWeight: 'bold', textTransform: 'capitalize' }}>{typeBadgeIcon} {item.meal_type}</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              <Text style={s.chip}>🔥 {item.calories} kcal</Text>
              <Text style={s.chip}>💪 {item.protein}g</Text>
              <Text style={s.chip}>🌾 {item.carbohydrates}g</Text>
              <Text style={s.chip}>🧈 {item.fat}g</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: 2 }}>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <TouchableOpacity
                onPress={() => {
                  Alert.prompt(
                    "Save as Recipe",
                    "Enter a name for this recipe to quickly log it later.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Save", onPress: (name) => { if(name?.trim()) handleSaveRecipe(name.trim(), item); } }
                    ],
                    "plain-text",
                    item.name
                  );
                }}
                style={{ padding: 12, paddingRight: 0 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={{ color: C.accent, fontSize: 13, fontWeight: 'bold' }}>⭐ Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    "Delete Meal",
                    "Are you sure you want to delete this meal log?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => handleDeleteLog(item.id) }
                    ]
                  );
                }}
                style={{ padding: 12, paddingRight: 0 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={{ color: C.error, fontSize: 13, fontWeight: 'bold' }}>Delete</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: C.textMuted, fontSize: 12, marginLeft: 12 }}>
              {new Date(item.created_at + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
        );
      }}
    />
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab({ session, rawProfile, targetMacros, onUpdateProfile, weightHistory, fetchData, isLoading, setIsLoading }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain' | null>(rawProfile?.goal || null);
  const [gender, setGender] = useState<'M' | 'F' | null>(rawProfile?.gender || null);
  const [age, setAge] = useState(rawProfile?.age?.toString() || '');
  const [height, setHeight] = useState(rawProfile?.height_cm?.toString() || '');
  const [weight, setWeight] = useState(rawProfile?.weight_kg?.toString() || '');
  const [activity, setActivity] = useState<'sedentary' | 'light' | 'moderate' | 'active' | null>(rawProfile?.activity || null);

  const [newWeight, setNewWeight] = useState('');

  const handleLogWeight = async () => {
    if (!newWeight) return;
    setIsLoading(true);
    try {
      await logWeight(parseFloat(newWeight));
      setNewWeight('');
      await fetchData();
    } catch (e) {
      console.log('Failed to log weight', e);
    } finally {
      setIsLoading(false);
    }
  };

  const [targetCals, setTargetCals] = useState(targetMacros?.calories?.toString() || '');
  const [targetProtein, setTargetProtein] = useState(targetMacros?.protein?.toString() || '');
  const [targetCarbs, setTargetCarbs] = useState(targetMacros?.carbs?.toString() || '');
  const [targetFat, setTargetFat] = useState(targetMacros?.fat?.toString() || '');

  useEffect(() => {
    if (!isEditing) {
      setTargetCals(targetMacros?.calories?.toString() || '');
      setTargetProtein(targetMacros?.protein?.toString() || '');
      setTargetCarbs(targetMacros?.carbs?.toString() || '');
      setTargetFat(targetMacros?.fat?.toString() || '');
    }
  }, [targetMacros, isEditing]);

  const handleAutoCalculate = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age, 10);
    if (!w || !h || !a || !gender || !goal || !activity) {
      Alert.alert("Missing Details", "Please fill out all personal details first.");
      return;
    }
    const newTargets = calculationService.calculateDailyTargets(w, h, a, gender, goal, activity);
    setTargetCals(newTargets.calories.toString());
    setTargetProtein(newTargets.protein.toString());
    setTargetCarbs(newTargets.carbs.toString());
    setTargetFat(newTargets.fat.toString());
  };

  const handleSave = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age, 10);

    const targets = {
      calories: parseInt(targetCals, 10) || 0,
      protein: parseInt(targetProtein, 10) || 0,
      carbs: parseInt(targetCarbs, 10) || 0,
      fat: parseInt(targetFat, 10) || 0,
    };

    const profile = { goal: goal!, gender: gender!, age: a, height_cm: h, weight_kg: w, activity: activity! };
    onUpdateProfile(targets, profile);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setGoal(rawProfile?.goal || null);
    setGender(rawProfile?.gender || null);
    setAge(rawProfile?.age?.toString() || '');
    setHeight(rawProfile?.height_cm?.toString() || '');
    setWeight(rawProfile?.weight_kg?.toString() || '');
    setActivity(rawProfile?.activity || null);

    setTargetCals(targetMacros?.calories?.toString() || '');
    setTargetProtein(targetMacros?.protein?.toString() || '');
    setTargetCarbs(targetMacros?.carbs?.toString() || '');
    setTargetFat(targetMacros?.fat?.toString() || '');

    setIsEditing(false);
  };

  const OptionBtn = ({ label, selected, onPress }: any) => (
    <TouchableOpacity style={[s.optionBtn, selected && s.optionBtnSelected, { paddingVertical: 6, paddingHorizontal: 10, marginBottom: 0 }]} onPress={onPress}>
      <Text style={[s.optionText, selected && s.optionTextSelected, { fontSize: 13 }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, marginTop: 12 }}>
        <View style={{ alignItems: 'flex-start' }}>
          <View style={s.avatarPlaceholder}>
            <Text style={s.avatarText}>👤</Text>
          </View>
          <Text style={{ color: C.textPrimary, fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>{session?.user?.email}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {isEditing ? (
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <TouchableOpacity onPress={handleCancel} style={{ paddingVertical: 8 }}>
                <Text style={{ color: C.textSecondary, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={{ backgroundColor: C.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
                <Text style={{ color: C.bg, fontWeight: 'bold' }}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)} style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 }}>
              <Text style={{ color: C.textPrimary, fontWeight: '600' }}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={[s.sectionTitle, { marginBottom: 0 }]}>Daily Targets</Text>
        {isEditing && (
          <TouchableOpacity onPress={handleAutoCalculate} style={{ backgroundColor: 'rgba(56,189,248,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
            <Text style={{ color: C.accent, fontSize: 12, fontWeight: 'bold' }}>Auto-Calculate</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={[s.cardContainer, { paddingHorizontal: 24, marginBottom: 24 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'center' }}>
            {isEditing ? (
              <TextInput style={[s.input, { width: 72, paddingVertical: 2, paddingHorizontal: 2, marginBottom: 0, textAlign: 'center', color: C.cal, fontSize: 18, fontWeight: 'bold' }]} value={targetCals} onChangeText={setTargetCals} keyboardType="numeric" selectTextOnFocus={true} />
            ) : (
              <Text style={{ color: C.cal, fontSize: 20, fontWeight: 'bold' }}>{targetMacros?.calories || 0}</Text>
            )}
            <Text style={{ color: C.textSecondary, fontSize: 12, marginTop: 4 }}>kcal</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            {isEditing ? (
              <TextInput style={[s.input, { width: 60, paddingVertical: 2, paddingHorizontal: 2, marginBottom: 0, textAlign: 'center', color: C.protein, fontSize: 18, fontWeight: 'bold' }]} value={targetProtein} onChangeText={setTargetProtein} keyboardType="numeric" selectTextOnFocus={true} />
            ) : (
              <Text style={{ color: C.protein, fontSize: 20, fontWeight: 'bold' }}>{targetMacros?.protein || 0}g</Text>
            )}
            <Text style={{ color: C.textSecondary, fontSize: 12, marginTop: 4 }}>Protein</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            {isEditing ? (
              <TextInput style={[s.input, { width: 60, paddingVertical: 2, paddingHorizontal: 2, marginBottom: 0, textAlign: 'center', color: C.carbs, fontSize: 18, fontWeight: 'bold' }]} value={targetCarbs} onChangeText={setTargetCarbs} keyboardType="numeric" selectTextOnFocus={true} />
            ) : (
              <Text style={{ color: C.carbs, fontSize: 20, fontWeight: 'bold' }}>{targetMacros?.carbs || 0}g</Text>
            )}
            <Text style={{ color: C.textSecondary, fontSize: 12, marginTop: 4 }}>Carbs</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            {isEditing ? (
              <TextInput style={[s.input, { width: 60, paddingVertical: 2, paddingHorizontal: 2, marginBottom: 0, textAlign: 'center', color: C.fat, fontSize: 18, fontWeight: 'bold' }]} value={targetFat} onChangeText={setTargetFat} keyboardType="numeric" selectTextOnFocus={true} />
            ) : (
              <Text style={{ color: C.fat, fontSize: 20, fontWeight: 'bold' }}>{targetMacros?.fat || 0}g</Text>
            )}
            <Text style={{ color: C.textSecondary, fontSize: 12, marginTop: 4 }}>Fat</Text>
          </View>
        </View>
      </View>

      <Text style={s.sectionTitle}>Personal Details</Text>
      <View style={s.cardContainer}>
        {/* Goal */}
        <View style={s.detailRow}>
          <Text style={[s.detailLabel, isEditing && { alignSelf: 'center' }]}>Goal</Text>
          {isEditing ? (
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <OptionBtn label="Lose" selected={goal === 'lose'} onPress={() => setGoal('lose')} />
              <OptionBtn label="Maintain" selected={goal === 'maintain'} onPress={() => setGoal('maintain')} />
              <OptionBtn label="Gain" selected={goal === 'gain'} onPress={() => setGoal('gain')} />
            </View>
          ) : (
            <Text style={s.detailValue}>{goal}</Text>
          )}
        </View>
        {/* Activity Level */}
        <View style={[s.detailRow, isEditing && { flexDirection: 'column', alignItems: 'flex-start', gap: 8 }]}>
          <Text style={[s.detailLabel]}>Activity Level</Text>
          {isEditing ? (
            <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
              <OptionBtn label="Sedentary" selected={activity === 'sedentary'} onPress={() => setActivity('sedentary')} />
              <OptionBtn label="Light" selected={activity === 'light'} onPress={() => setActivity('light')} />
              <OptionBtn label="Moderate" selected={activity === 'moderate'} onPress={() => setActivity('moderate')} />
              <OptionBtn label="Active" selected={activity === 'active'} onPress={() => setActivity('active')} />
            </View>
          ) : (
            <Text style={s.detailValue}>{activity}</Text>
          )}
        </View>
        {/* Gender */}
        <View style={s.detailRow}>
          <Text style={[s.detailLabel, isEditing && { alignSelf: 'center' }]}>Gender</Text>
          {isEditing ? (
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <OptionBtn label="Male" selected={gender === 'M'} onPress={() => setGender('M')} />
              <OptionBtn label="Female" selected={gender === 'F'} onPress={() => setGender('F')} />
            </View>
          ) : (
            <Text style={s.detailValue}>{gender === 'M' ? 'Male' : 'Female'}</Text>
          )}
        </View>
        {/* Age */}
        <View style={s.detailRow}>
          <Text style={[s.detailLabel, isEditing && { alignSelf: 'center' }]}>Age</Text>
          {isEditing ? (
            <TextInput style={[s.input, { marginBottom: 0, padding: 8, width: 80, textAlign: 'right' }]} keyboardType="numeric" value={age} onChangeText={setAge} />
          ) : (
            <Text style={s.detailValue}>{age} years</Text>
          )}
        </View>
        {/* Height */}
        <View style={s.detailRow}>
          <Text style={[s.detailLabel, isEditing && { alignSelf: 'center' }]}>Height</Text>
          {isEditing ? (
            <TextInput style={[s.input, { marginBottom: 0, padding: 8, width: 80, textAlign: 'right' }]} keyboardType="numeric" value={height} onChangeText={setHeight} />
          ) : (
            <Text style={s.detailValue}>{height} cm</Text>
          )}
        </View>
        {/* Weight */}
        <View style={[s.detailRow, { borderBottomWidth: 0 }]}>
          <Text style={[s.detailLabel, isEditing && { alignSelf: 'center' }]}>Weight</Text>
          {isEditing ? (
            <TextInput style={[s.input, { marginBottom: 0, padding: 8, width: 80, textAlign: 'right' }]} keyboardType="numeric" value={weight} onChangeText={setWeight} />
          ) : (
            <Text style={s.detailValue}>{weight} kg</Text>
          )}
        </View>
      </View>

      <Text style={[s.sectionTitle, { marginTop: 28 }]}>Weight Tracking</Text>
      <View style={s.cardContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            style={[s.input, { flex: 1, marginBottom: 0, marginRight: 8 }]}
            placeholder="Enter weight in kg"
            placeholderTextColor={C.textSecondary}
            keyboardType="numeric"
            value={newWeight}
            onChangeText={setNewWeight}
          />
          <TouchableOpacity style={[s.logBtn, { marginBottom: 0, paddingHorizontal: 24, paddingVertical: 12 }]} onPress={handleLogWeight} disabled={isLoading || !newWeight}>
            {isLoading ? <ActivityIndicator color={C.bg} /> : <Text style={s.btnText}>Log</Text>}
          </TouchableOpacity>
        </View>

        {weightHistory && weightHistory.length > 0 && (
          <View style={{ height: 120, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 24 }}>
            {weightHistory.slice(0, 10).reverse().map((w: any, idx: number, arr: any[]) => {
              const maxW = Math.max(...arr.map(h => h.weight_kg)) + 5;
              const minW = Math.max(Math.min(...arr.map(h => h.weight_kg)) - 5, 0);
              const range = maxW - minW || 1;
              const heightPct = Math.max(((w.weight_kg - minW) / range) * 100, 10);
              const isLatest = idx === arr.length - 1;
              return (
                <View key={w.id} style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ color: isLatest ? C.accent : C.textSecondary, fontSize: 10, marginBottom: 4 }}>{w.weight_kg}</Text>
                  <View style={{ width: 8, height: `${heightPct}%`, backgroundColor: isLatest ? C.accent : C.cal, borderRadius: 4 }} />
                </View>
              );
            })}
          </View>
        )}
      </View>

      <TouchableOpacity style={[s.logBtn, { backgroundColor: C.surface, marginTop: 24 }]} onPress={() => supabase.auth.signOut()}>
        <Text style={[s.btnText, { color: C.error }]}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Recipes Screen ───────────────────────────────────────────────────────────
function RecipesScreen({ recipes, handleLogRecipe, handleDeleteRecipe, onBack }: any) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
        <TouchableOpacity onPress={onBack} style={{ padding: 8, marginRight: 8 }}>
          <Text style={{ color: C.accent, fontSize: 16, fontWeight: 'bold' }}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={{ color: C.textPrimary, fontSize: 18, fontWeight: 'bold' }}>Saved Recipes</Text>
      </View>

      <FlatList
        data={recipes}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={{ color: C.textMuted, textAlign: 'center', marginTop: 32, fontStyle: 'italic' }}>No saved recipes yet. Log a meal and tap '⭐ Save' in the Logs tab to add one!</Text>}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: C.surface, padding: 16, borderRadius: 12, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: C.textPrimary, fontSize: 16, fontWeight: 'bold' }}>{item.name}</Text>
              <TouchableOpacity onPress={() => handleDeleteRecipe(item.id)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Text style={{ color: C.error, fontSize: 20 }}>×</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              <Text style={s.chip}>🔥 {item.calories} kcal</Text>
              <Text style={s.chip}>💪 {item.protein}g</Text>
              <Text style={s.chip}>🌾 {item.carbohydrates}g</Text>
              <Text style={s.chip}>🧈 {item.fat}g</Text>
            </View>
            <TouchableOpacity onPress={() => { handleLogRecipe(item.id); onBack(); }} style={{ backgroundColor: C.accent, paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>+ Log this Meal</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────
const DEFAULT_SUMMARY = { calories: 0, protein: 0, carbohydrates: 0, fat: 0 };

function DashboardScreen({ session, targetMacros, rawProfile, onUpdateProfile }: { session: Session, targetMacros: MacroTargets | null, rawProfile: UserProfilePayload | null, onUpdateProfile: (t: MacroTargets, p: UserProfilePayload) => void }) {
  const [activeTab, setActiveTab] = useState('home');
  const [userInput, setUserInput] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [showRecipesScreen, setShowRecipesScreen] = useState(false);
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
      const [rawLogs, rawSummary, rawWeekly, rawRecipes, rawWeight] = await Promise.all([
        getLogs(tz, dateStr), 
        getSummary(tz), 
        getWeeklyAnalytics(tz),
        getRecipes(),
        getWeightHistory(30)
      ]);
      setLogs([...rawLogs].reverse());
      setSummary(rawSummary);
      setWeeklyData(rawWeekly);
      setRecipes(rawRecipes);
      setWeightHistory(rawWeight);
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
      ) : (
        <>
          {/* Header */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>🥗 MacTrack</Text>
              <Text style={{ color: C.textSecondary, fontSize: 13 }}>{session.user?.email}</Text>
            </View>
          </View>

          {error ? (
            <View style={s.errorBanner}><Text style={{ color: '#fca5a5' }}>⚠️ {error}</Text></View>
          ) : null}

          <View style={{ flex: 1 }}>
            {activeTab === 'home' && (
              <HomeTab
                summary={summary} macros={macros} weeklyData={weeklyData} targetMacros={targetMacros}
                userInput={userInput} setUserInput={setUserInput}
                isLoading={isLoading} setIsLoading={setIsLoading}
                setError={setError} fetchData={fetchData}
                setViewDate={setViewDate} setActiveTab={setActiveTab}
              />
            )}
            {activeTab === 'history' && (
              <HistoryTab
                logs={logs} viewDate={viewDate} setViewDate={setViewDate}
                handleDeleteLog={handleDeleteLog} handleSaveRecipe={handleSaveRecipe}
                setShowRecipesScreen={setShowRecipesScreen}
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

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [targetMacros, setTargetMacros] = useState<MacroTargets | null>(null);
  const [rawProfile, setRawProfile] = useState<UserProfilePayload | null>(null);

  useEffect(() => {
    // First, load local cache quickly to avoid flashes
    AsyncStorage.getItem('onboarding_targets').then(res => {
      if (res) {
        setTargetMacros(JSON.parse(res));
        setOnboardingCompleted(true);
      }
    }).catch(e => {
      console.log('Failed to load local cache', e);
    }).finally(() => {
      setLoading(false);
    });

    AsyncStorage.getItem('onboarding_profile').then(res => {
      if (res) setRawProfile(JSON.parse(res));
    }).catch(e => { });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      syncProfile(s);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      syncProfile(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncProfile = async (s: Session | null) => {
    if (!s) return;
    try {
      const profile = await getProfile();
      if (profile) {
        const targets = {
          calories: profile.target_calories,
          protein: profile.target_protein,
          carbs: profile.target_carbs,
          fat: profile.target_fat,
        };
        const p: UserProfilePayload = {
          goal: profile.goal, gender: profile.gender, age: profile.age,
          height_cm: profile.height_cm, weight_kg: profile.weight_kg, activity: profile.activity
        };
        setTargetMacros(targets);
        setRawProfile(p);
        setOnboardingCompleted(true);
        await AsyncStorage.setItem('onboarding_targets', JSON.stringify(targets));
        await AsyncStorage.setItem('onboarding_profile', JSON.stringify(p));
      } else {
        // Force existing users to re-onboard to ensure server sync
        setOnboardingCompleted(false);
        setTargetMacros(null);
        setRawProfile(null);
        await AsyncStorage.removeItem('onboarding_targets');
        await AsyncStorage.removeItem('onboarding_profile');
      }
    } catch (e) {
      console.log('Failed to sync profile', e);
    }
  };

  const handleOnboardingComplete = async (targets: MacroTargets, profile: UserProfilePayload) => {
    await AsyncStorage.setItem('onboarding_targets', JSON.stringify(targets));
    await AsyncStorage.setItem('onboarding_profile', JSON.stringify(profile));
    setTargetMacros(targets);
    setRawProfile(profile);
    setOnboardingCompleted(true);

    if (session) {
      try {
        await saveProfile({
          ...profile,
          target_calories: targets.calories,
          target_protein: targets.protein,
          target_carbs: targets.carbs,
          target_fat: targets.fat
        });
      } catch (e) {
        console.log('Failed to save profile to server', e);
      }
    }
  };

  const handleUpdateProfile = async (targets: MacroTargets, profile: UserProfilePayload) => {
    await AsyncStorage.setItem('onboarding_targets', JSON.stringify(targets));
    await AsyncStorage.setItem('onboarding_profile', JSON.stringify(profile));
    setTargetMacros(targets);
    setRawProfile(profile);

    if (session) {
      try {
        await updateProfile({
          ...profile,
          target_calories: targets.calories,
          target_protein: targets.protein,
          target_carbs: targets.carbs,
          target_fat: targets.fat
        });
      } catch (e) {
        console.log('Failed to update profile to server', e);
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={[s.flex, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      </SafeAreaProvider>
    );
  }

  if (session && !onboardingCompleted) {
    return (
      <SafeAreaProvider>
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </SafeAreaProvider>
    );
  }

  return session ? (
    <SafeAreaProvider>
      <DashboardScreen session={session} targetMacros={targetMacros} rawProfile={rawProfile} onUpdateProfile={handleUpdateProfile} />
    </SafeAreaProvider>
  ) : (
    <SafeAreaProvider>
      <LoginScreen />
    </SafeAreaProvider>
  );
}


// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  safe: { flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === 'android' ? 40 : 0 },
  loginContainer: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: C.bg },
  loginTitle: { fontSize: 26, fontWeight: 'bold', color: C.textPrimary, textAlign: 'center', marginBottom: 28 },
  msgBanner: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: C.accent, borderRadius: 8, padding: 12, marginBottom: 16 },
  msgText: { color: '#e0f2fe', textAlign: 'center' },
  input: { backgroundColor: 'rgba(15,23,42,0.6)', borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 14, color: C.textPrimary, fontSize: 16, marginBottom: 12 },
  btn: { backgroundColor: C.accent, padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  btnText: { color: C.bg, fontWeight: 'bold', fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: C.textPrimary },
  signOutBtn: { backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  errorBanner: { backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: C.error, borderRadius: 8, padding: 12, marginHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#e2e8f0', marginBottom: 12 },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  macroCard: { flex: 1, minWidth: '44%', backgroundColor: C.surface, padding: 16, borderRadius: 14, borderTopWidth: 3, borderTopColor: C.accent, alignItems: 'center' },
  macroLabel: { color: C.textSecondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  macroValue: { color: C.textPrimary, fontSize: 22, fontWeight: 'bold' },
  macroUnit: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  logForm: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  logBtn: { backgroundColor: C.accent, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  logItem: { backgroundColor: 'rgba(30,41,59,0.5)', padding: 14, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  logName: { color: C.textPrimary, fontSize: 15, fontWeight: '500' },
  chip: { color: C.textSecondary, fontSize: 12, backgroundColor: 'rgba(15,23,42,0.5)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  tabBar: { flexDirection: 'row', backgroundColor: 'rgba(15,23,42,0.95)', borderTopWidth: 1, borderTopColor: C.border, paddingBottom: Platform.OS === 'ios' ? 24 : 12, paddingTop: 12 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIcon: { fontSize: 24, marginBottom: 4 },
  tabLabel: { fontSize: 12, color: C.textSecondary, fontWeight: '500' },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.accent, marginTop: 4 },
  optionBtn: { backgroundColor: C.surface, borderWidth: 1, borderColor: 'transparent', borderRadius: 8, alignItems: 'center' },
  optionBtnSelected: { borderColor: C.accent, backgroundColor: 'rgba(56,189,248,0.15)' },
  optionText: { color: C.textSecondary, fontSize: 14, fontWeight: '500' },
  optionTextSelected: { color: C.accent, fontWeight: 'bold' },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(56,189,248,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32 },
  cardContainer: { backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  detailLabel: { color: C.textSecondary, fontSize: 15 },
  detailValue: { color: C.textPrimary, fontSize: 15, fontWeight: '500', textTransform: 'capitalize' },
  confirmationCard: { backgroundColor: C.surface, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: C.border },
  editRow: { backgroundColor: 'rgba(15,23,42,0.4)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editLabel: { color: C.textSecondary, fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' },
  editInput: { color: C.textPrimary, fontSize: 16, fontWeight: '600', textAlign: 'right', padding: 0, margin: 0, minWidth: 60 },
  mealTypePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'transparent' },
  mealTypePillActive: { backgroundColor: 'rgba(56,189,248,0.1)', borderColor: C.accent },
  mealTypeText: { color: C.textSecondary, fontSize: 13, fontWeight: '500' },
  mealTypeTextActive: { color: C.accent, fontWeight: 'bold' }
});
