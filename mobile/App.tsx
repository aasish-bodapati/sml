import 'react-native-url-polyfill/auto';
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, KeyboardAvoidingView,
  Platform, StatusBar,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { logMeal, getLogs, getSummary, deleteLog } from './api';

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
    { key: 'home',    label: 'Home',    icon: '🏠' },
    { key: 'history', label: 'History', icon: '📋' },
  ];
  return (
    <View style={s.tabBar}>
      {tabs.map(t => (
        <TouchableOpacity key={t.key} onPress={() => onSelect(t.key)} style={s.tabItem}>
          <Text style={[s.tabIcon, active !== t.key && { opacity: 0.5 }]}>{t.icon}</Text>
          <Text style={[s.tabLabel, active === t.key && { color: C.accent }]}>{t.label}</Text>
          {active === t.key && <View style={s.activeDot} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Home Tab ─────────────────────────────────────────────────────────────────
function HomeTab({ summary, macros, userInput, setUserInput, handleLogMeal, isLoading }: any) {
  return (
    <View style={{ padding: 16 }}>
      <Text style={s.sectionTitle}>Summary</Text>
      <View style={s.macroGrid}>
        {macros.map((m: any) => (
          <View key={m.label} style={[s.macroCard, { borderTopColor: m.color }]}>
            <Text style={[s.macroLabel, { color: m.color }]}>{m.label}</Text>
            <Text style={s.macroValue}>{m.value || 0}</Text>
            <Text style={s.macroUnit}>{m.unit}</Text>
          </View>
        ))}
      </View>

      <Text style={[s.sectionTitle, { marginTop: 28 }]}>Log a Meal</Text>
      <View style={s.logForm}>
        <TextInput
          style={[s.input, { flex: 1 }]}
          placeholder='e.g. "2 boiled eggs"'
          placeholderTextColor={C.textSecondary}
          value={userInput}
          onChangeText={setUserInput}
          onSubmitEditing={handleLogMeal}
          returnKeyType="send"
        />
        <TouchableOpacity style={s.logBtn} onPress={handleLogMeal} disabled={isLoading || !userInput.trim()}>
          {isLoading ? <ActivityIndicator color={C.bg} size="small" /> : <Text style={s.btnText}>+ Log</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────
function HistoryTab({ logs, viewDate, setViewDate, handleDeleteLog }: any) {
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
            <Text style={{ color: C.textPrimary, fontSize: 16, fontWeight: '600' }}>
              {viewDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
            <TouchableOpacity onPress={() => { const d = new Date(viewDate); d.setDate(d.getDate() + 1); setViewDate(d); }} style={{ padding: 8 }}>
              <Text style={{ color: C.accent, fontWeight: 'bold', fontSize: 16 }}>Next {'>'}</Text>
            </TouchableOpacity>
          </View>

          {/* History label */}
          <Text style={[s.sectionTitle, { marginBottom: 8 }]}>Meal History</Text>
          {logs.length === 0 && <Text style={{ color: C.textMuted, fontStyle: 'italic', textAlign: 'center', marginTop: 16 }}>Nothing logged.</Text>}
        </>
      }
      renderItem={({ item }) => (
        <View style={s.logItem}>
          <View style={{ flex: 1 }}>
            <Text style={s.logName}>{item.name}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              <Text style={s.chip}>🔥 {item.calories} kcal</Text>
              <Text style={s.chip}>💪 {item.protein}g</Text>
              <Text style={s.chip}>🌾 {item.carbohydrates}g</Text>
              <Text style={s.chip}>🧈 {item.fat}g</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: 2 }}>
            <TouchableOpacity onPress={() => handleDeleteLog(item.id)} style={{ padding: 4 }}>
              <Text style={{ color: C.error, fontSize: 13, fontWeight: 'bold' }}>Delete</Text>
            </TouchableOpacity>
            <Text style={{ color: C.textMuted, fontSize: 12, marginLeft: 12 }}>
              {new Date(item.created_at + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      )}
    />
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────
const DEFAULT_SUMMARY = { calories: 0, protein: 0, carbohydrates: 0, fat: 0 };

function DashboardScreen({ session }: { session: Session }) {
  const [activeTab, setActiveTab] = useState('home');
  const [userInput, setUserInput] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState<Date>(new Date());

  useEffect(() => { fetchData(); }, [viewDate]);

  const fetchData = async () => {
    try {
      const token = session.access_token;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const dateStr = viewDate.getFullYear() + '-' + String(viewDate.getMonth() + 1).padStart(2, '0') + '-' + String(viewDate.getDate()).padStart(2, '0');
      const [rawLogs, rawSummary] = await Promise.all([getLogs(token, tz, dateStr), getSummary(token, tz)]);
      setLogs([...rawLogs].reverse());
      setSummary(rawSummary);
      setError(null);
    } catch (e: any) { setError('Could not reach the backend. Make sure it is running.'); }
  };

  const handleLogMeal = async () => {
    if (!userInput.trim()) return;
    setIsLoading(true); setError(null);
    try {
      await logMeal(session.access_token, userInput);
      setUserInput('');
      await fetchData();
    } catch (e: any) { setError(e.message || 'Failed to log meal.'); }
    finally { setIsLoading(false); }
  };

  const handleDeleteLog = async (id: number) => {
    try {
      await deleteLog(session.access_token, id);
      await fetchData();
    } catch (e: any) { setError(e.message || 'Failed to delete log.'); }
  };

  const macros = [
    { label: 'Calories', value: summary.calories, unit: 'kcal', color: C.cal },
    { label: 'Protein',  value: summary.protein,       unit: 'g', color: C.protein },
    { label: 'Carbs',    value: summary.carbohydrates, unit: 'g', color: C.carbs },
    { label: 'Fat',      value: summary.fat,           unit: 'g', color: C.fat },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>🥗 Macro Tracker</Text>
          <Text style={{ color: C.textSecondary, fontSize: 13 }}>{session.user?.email}</Text>
        </View>
        <TouchableOpacity style={s.signOutBtn} onPress={() => supabase.auth.signOut()}>
          <Text style={{ color: C.textPrimary, fontSize: 12 }}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={s.errorBanner}><Text style={{ color: '#fca5a5' }}>⚠️ {error}</Text></View>
      ) : null}

      <View style={{ flex: 1 }}>
        {activeTab === 'home' && (
          <HomeTab 
            summary={summary} macros={macros} 
            userInput={userInput} setUserInput={setUserInput} 
            handleLogMeal={handleLogMeal} isLoading={isLoading} 
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab 
            logs={logs} viewDate={viewDate} setViewDate={setViewDate} 
            handleDeleteLog={handleDeleteLog} 
          />
        )}
      </View>

      <BottomTabBar active={activeTab} onSelect={setActiveTab} />
    </SafeAreaView>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={[s.flex, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      </SafeAreaProvider>
    );
  }

  return session ? (
    <SafeAreaProvider>
      <DashboardScreen session={session} />
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
});
