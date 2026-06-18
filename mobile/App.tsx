import 'react-native-url-polyfill/auto';
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, KeyboardAvoidingView,
  Platform, StatusBar, ScrollView, Alert, Image, Modal,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { parseMeal, confirmLogMeal, getLogs, getSummary, getWeeklyAnalytics, logWeight, getWeightHistory, deleteLog, getProfile, saveProfile, getRecipes, saveRecipe, deleteRecipe, logRecipe, transcribeAudio, searchExercises, logWorkout, getWorkouts, updateProfile } from './api';
import OnboardingScreen, { MacroTargets, UserProfilePayload } from './OnboardingScreen';
import { calculationService } from './calculation-service';
import { Audio } from 'expo-av';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { C, rs, fs } from './design-tokens';

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
        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={{ marginTop: rs(16), alignItems: 'center' }}>
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
    { key: 'chat', label: 'Log Meal', icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
    { key: 'fitness', label: 'Fitness', icon: 'fitness-outline', iconActive: 'fitness' },
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

function AnimatedProgressBar({ progress, color }: { progress: number, color: string }) {
  const widthAnim = useSharedValue(progress * 100);

  useEffect(() => {
    widthAnim.value = withTiming(progress * 100, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${widthAnim.value}%`,
    };
  });

  return (
    <View style={{ height: rs(12), backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: rs(6), overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', backgroundColor: color, borderRadius: rs(6) }, animatedStyle]} />
    </View>
  );
}

// ─── Home Tab ─────────────────────────────────────────────────────────────────
function HomeTab({ summary, macros, weeklyData, targetMacros, setViewDate, setActiveTab }: any) {
  return (
    <ScrollView contentContainerStyle={{ padding: rs(16) }} keyboardShouldPersistTaps="handled">
      <Text style={s.sectionTitle}>Summary</Text>
      <View style={{ backgroundColor: C.surface, padding: rs(16), borderRadius: rs(14) }}>
        {macros.map((m: any, idx: number) => {
          const target = m.target || 1;
          const current = m.value || 0;
          const progress = Math.min(Math.max(current / target, 0), 1);

          return (
            <View key={m.label} style={{ marginBottom: idx === macros.length - 1 ? 0 : 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: rs(8) }}>
                <Text style={{ color: C.textPrimary, fontWeight: '600' }}>{m.label}</Text>
                <Text style={{ color: C.textSecondary, fontSize: fs(13) }}>
                  <Text style={{ color: C.textPrimary, fontWeight: '500' }}>{current}</Text>{m.unit} {m.target ? `/ ${m.target}${m.unit}` : ''}
                </Text>
              </View>
              <AnimatedProgressBar progress={progress} color={m.color} />
            </View>
          );
        })}
      </View>

      <Text style={[s.sectionTitle, { marginTop: rs(28) }]}>Weekly Progress</Text>
      <View style={{ backgroundColor: C.surface, padding: rs(16), borderRadius: rs(14), flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: rs(160) }}>
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
              <View style={{ width: '60%', height: '100%', justifyContent: 'flex-end', marginBottom: rs(8) }}>
                <View style={{ width: '100%', height: `${heightPct}%`, backgroundColor: isToday ? C.accent : C.cal, borderRadius: rs(4), minHeight: rs(4) }} />
              </View>
              <Text style={{ color: isToday ? C.accent : C.textSecondary, fontSize: fs(12), fontWeight: isToday ? 'bold' : 'normal' }}>{dayName}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

    </ScrollView>
  );
}

// ─── Confirmation Card Component ──────────────────────────────────────────────
function ConfirmationCard({ parsedData, onConfirm, onCancel, isLoading }: any) {
  const [editedMeals, setEditedMeals] = useState<any[]>(
    parsedData.items.map((item: any) => ({ ...item, meal_type: item.meal_type || 'snack' }))
  );

  const totalCalories = editedMeals.reduce((sum, meal) => sum + (parseInt(meal.calories) || 0), 0);
  const totalProtein = editedMeals.reduce((sum, meal) => sum + (parseInt(meal.protein) || 0), 0);
  const totalCarbs = editedMeals.reduce((sum, meal) => sum + (parseInt(meal.carbohydrates) || 0), 0);
  const totalFat = editedMeals.reduce((sum, meal) => sum + (parseInt(meal.fat) || 0), 0);

  return (
    <View style={s.confirmationCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(12) }}>
        <Text style={{ color: C.textPrimary, fontSize: fs(16), fontWeight: 'bold' }}>Confirm Meal Details</Text>
        {editedMeals[0]?.meal_type && (
          <View style={{ backgroundColor: 'rgba(56,189,248,0.15)', paddingHorizontal: rs(10), paddingVertical: rs(4), borderRadius: rs(12), borderWidth: rs(1), borderColor: 'rgba(56,189,248,0.3)' }}>
            <Text style={{ color: C.accent, fontSize: fs(12), fontWeight: 'bold', textTransform: 'capitalize' }}>
              {editedMeals[0].meal_type}
            </Text>
          </View>
        )}
      </View>

      {parsedData.thinking && (
        <Text selectable={true} style={{ color: C.textSecondary, fontSize: fs(13), fontStyle: 'italic', marginBottom: rs(16), padding: rs(12), backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: rs(8) }}>
          💡 <Text style={{fontWeight: 'bold', color: C.accent}}>Reasoning:</Text> {parsedData.thinking}
        </Text>
      )}

      {editedMeals.length > 1 && (
        <View style={{ backgroundColor: 'rgba(15,23,42,0.4)', padding: rs(12), borderRadius: rs(12), marginBottom: rs(16), flexDirection: 'row', justifyContent: 'space-around', borderWidth: rs(1), borderColor: 'rgba(255,255,255,0.05)' }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: C.textSecondary, fontSize: fs(10), textTransform: 'uppercase', fontWeight: 'bold', marginBottom: rs(2) }}>Total Kcal</Text>
            <Text style={{ color: C.cal, fontSize: fs(16), fontWeight: 'bold' }}>{totalCalories}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: C.textSecondary, fontSize: fs(10), textTransform: 'uppercase', fontWeight: 'bold', marginBottom: rs(2) }}>Protein</Text>
            <Text style={{ color: C.protein, fontSize: fs(16), fontWeight: 'bold' }}>{totalProtein}g</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: C.textSecondary, fontSize: fs(10), textTransform: 'uppercase', fontWeight: 'bold', marginBottom: rs(2) }}>Carbs</Text>
            <Text style={{ color: C.carbs, fontSize: fs(16), fontWeight: 'bold' }}>{totalCarbs}g</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: C.textSecondary, fontSize: fs(10), textTransform: 'uppercase', fontWeight: 'bold', marginBottom: rs(2) }}>Fat</Text>
            <Text style={{ color: C.fat, fontSize: fs(16), fontWeight: 'bold' }}>{totalFat}g</Text>
          </View>
        </View>
      )}
      
      {editedMeals.map((meal, index) => (
        <View key={index} style={{ marginBottom: rs(24), paddingBottom: rs(16), borderBottomWidth: index < editedMeals.length - 1 ? 1 : 0, borderBottomColor: C.surface }}>
          {!meal.is_food && (
            <Text style={{ color: C.error, fontSize: fs(13), marginBottom: rs(8) }}>⚠️ This item was not recognized as food.</Text>
          )}
          <View style={s.editRow}>
            <Text style={s.editLabel}>Name</Text>
            <TextInput 
              style={[s.editInput, { flex: 1, minHeight: rs(36) }]} 
              value={meal.name} 
              onChangeText={t => { const newMeals = [...editedMeals]; newMeals[index].name = t; setEditedMeals(newMeals); }} 
            />
          </View>
          
          <View style={{ flexDirection: 'row', gap: rs(8) }}>
            <View style={[s.editRow, { flex: 1 }]}>
              <Text style={s.editLabel}>Kcal</Text>
              <TextInput style={s.editInput} keyboardType="numeric" value={meal.calories.toString()} onChangeText={t => { const newMeals = [...editedMeals]; newMeals[index].calories = parseInt(t) || 0; setEditedMeals(newMeals); }} />
            </View>
            <View style={[s.editRow, { flex: 1 }]}>
              <Text style={s.editLabel}>Protein</Text>
              <TextInput style={s.editInput} keyboardType="numeric" value={meal.protein.toString()} onChangeText={t => { const newMeals = [...editedMeals]; newMeals[index].protein = parseInt(t) || 0; setEditedMeals(newMeals); }} />
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', gap: rs(8) }}>
            <View style={[s.editRow, { flex: 1 }]}>
              <Text style={s.editLabel}>Carbs</Text>
              <TextInput style={s.editInput} keyboardType="numeric" value={meal.carbohydrates.toString()} onChangeText={t => { const newMeals = [...editedMeals]; newMeals[index].carbohydrates = parseInt(t) || 0; setEditedMeals(newMeals); }} />
            </View>
            <View style={[s.editRow, { flex: 1 }]}>
              <Text style={s.editLabel}>Fat</Text>
              <TextInput style={s.editInput} keyboardType="numeric" value={meal.fat.toString()} onChangeText={t => { const newMeals = [...editedMeals]; newMeals[index].fat = parseInt(t) || 0; setEditedMeals(newMeals); }} />
            </View>
          </View>
          

        </View>
      ))}

      <View style={{ flexDirection: 'row', gap: rs(12), marginTop: rs(8) }}>
        <TouchableOpacity style={[s.btn, { flex: 1, paddingVertical: rs(12), marginBottom: rs(0), backgroundColor: 'transparent', borderWidth: rs(1), borderColor: C.border }]} onPress={onCancel}>
          <Text style={[s.btnText, { color: C.textPrimary, fontSize: fs(15) }]}>✕ Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, { flex: 1, paddingVertical: rs(12), marginBottom: rs(0) }]} onPress={() => onConfirm(editedMeals, parsedData.thinking)} disabled={isLoading || editedMeals.length === 0}>
          {isLoading ? <ActivityIndicator color={C.bg} /> : <Text style={[s.btnText, { fontSize: fs(15) }]}>✓ Confirm</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────
function ChatTab({ fetchData, setActiveTab }: any) {
  const [messages, setMessages] = useState<{role: string, content: string, parsedData?: any}[]>([
    { role: 'assistant', content: 'What did you eat today?' }
  ]);
  const [input, setInput] = useState('');
  const [mealType, setMealType] = useState(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 16) return 'lunch';
    if (hour >= 16 && hour < 18) return 'snack';
    if (hour >= 18 && hour < 22) return 'dinner';
    return 'snack';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        setRecording(recording);
      } else {
        Alert.alert('Permission Denied', 'Please grant microphone permissions to use voice transcription.');
      }
    } catch (err) {
      console.error('Failed to start recording', err);
      setError('Failed to start recording.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsTranscribing(true);
    setRecording(null);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        const result = await transcribeAudio(uri);
        if (result.text) {
          setInput(input ? input + ' ' + result.text : result.text);
        }
      }
    } catch (err) {
      console.error('Failed to transcribe', err);
      setError('Failed to transcribe audio.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(null);
    
    try {
      const payload = newMessages.map(m => ({ role: m.role, content: m.content }));
      if (payload.length > 0) {
        payload[payload.length - 1].content = `[Meal Type: ${mealType}] ${payload[payload.length - 1].content}`;
      }
      const result = await parseMeal(payload);
      
      const assistantMsg = { 
        role: 'assistant', 
        content: '',
        parsedData: result
      };
      setMessages([...newMessages, assistantMsg]);
    } catch (e: any) { 
      setError(e.message || 'Failed to parse meal.'); 
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error. Could you try again?' }]);
    }
    finally { setIsLoading(false); }
  };

  const handleConfirm = async (editedMeals: any[], thinking: string) => {
    setIsLoading(true); setError(null);
    try {
      for (const meal of editedMeals) {
        if (meal.is_food !== false) {
          await confirmLogMeal({ ...meal, reasoning: thinking });
        }
      }
      setMessages([{ role: 'assistant', content: 'Meal logged successfully! What else did you eat?' }]);
      await fetchData();
      setActiveTab('home');
    } catch (e: any) { setError(e.message || 'Failed to log meal.'); }
    finally { setIsLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 140 : 0}>
      <FlatList
        data={messages}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={{ padding: rs(16), paddingBottom: rs(24) }}
        renderItem={({ item }) => (
          <View style={{ alignItems: item.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: rs(16) }}>
            {(!item.parsedData && item.content !== '') && (
              <View style={{ backgroundColor: item.role === 'user' ? C.accent : C.surface, padding: rs(12), borderRadius: rs(16), maxWidth: '85%', borderBottomRightRadius: item.role === 'user' ? 4 : 16, borderBottomLeftRadius: item.role === 'assistant' ? 4 : 16 }}>
                <Text selectable={true} style={{ color: item.role === 'user' ? C.bg : C.textPrimary, fontSize: fs(15) }}>{item.content}</Text>
              </View>
            )}
            {item.parsedData && (
              <View style={{ width: '100%', marginTop: rs(8) }}>
                <ConfirmationCard 
                  parsedData={item.parsedData} 
                  onConfirm={handleConfirm} 
                  onCancel={() => setMessages([...messages, { role: 'user', content: 'Cancel that.' }, { role: 'assistant', content: 'Cancelled. What else did you eat?' }])} 
                  isLoading={isLoading} 
                />
              </View>
            )}
          </View>
        )}
      />
      {error && <Text style={{ color: C.error, textAlign: 'center', marginBottom: rs(8) }}>{error}</Text>}
      <View style={{ backgroundColor: C.bg, borderTopWidth: rs(1), borderTopColor: C.border }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: rs(16), paddingTop: rs(12), paddingBottom: rs(4), gap: rs(8) }}>
          {['breakfast', 'lunch', 'dinner', 'snack'].map(type => (
            <TouchableOpacity 
              key={type} 
              onPress={() => setMealType(type)} 
              style={[s.mealTypePill, mealType === type && s.mealTypePillActive, { paddingVertical: rs(6), paddingHorizontal: rs(14) }]}
            >
              <Text style={[s.mealTypeText, mealType === type && s.mealTypeTextActive, { fontSize: fs(13) }]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', padding: rs(16), paddingTop: rs(8) }}>
          <TextInput
            style={[s.input, { flex: 1, marginBottom: rs(0), borderRadius: rs(24), paddingHorizontal: rs(16) }]}
            placeholder={recording ? 'Recording...' : 'e.g. "2 boiled eggs"'}
            placeholderTextColor={recording ? C.error : C.textSecondary}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            editable={!recording && !isTranscribing}
          />
          {!input.trim() ? (
            <TouchableOpacity 
              style={{ marginLeft: rs(12), backgroundColor: recording ? 'rgba(244,63,94,0.2)' : C.surface, width: rs(48), height: rs(48), borderRadius: rs(24), justifyContent: 'center', alignItems: 'center', borderWidth: recording ? 1 : 0, borderColor: C.error }} 
              onPress={recording ? stopRecording : startRecording} 
              disabled={isLoading || isTranscribing}
            >
              {isTranscribing ? <ActivityIndicator color={C.textPrimary} /> : <Ionicons name={recording ? "stop" : "mic"} size={20} color={recording ? C.error : C.textPrimary} />}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={{ marginLeft: rs(12), backgroundColor: C.accent, width: rs(48), height: rs(48), borderRadius: rs(24), justifyContent: 'center', alignItems: 'center' }} onPress={handleSend} disabled={isLoading || isTranscribing}>
              {isLoading ? <ActivityIndicator color={C.bg} /> : <Ionicons name="send" size={20} color={C.bg} style={{ marginLeft: rs(4) }} />}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────
function HistoryTab({ logs, viewDate, setViewDate, handleDeleteLog, handleSaveRecipe, setShowRecipesScreen }: any) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <FlatList
      data={logs}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={{ padding: rs(16) }}
      ListHeaderComponent={
        <>
          {/* Date Navigator */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(16) }}>
            <TouchableOpacity onPress={() => { const d = new Date(viewDate); d.setDate(d.getDate() - 1); setViewDate(d); }} style={{ padding: rs(8) }}>
              <Text style={{ color: C.accent, fontWeight: 'bold', fontSize: fs(16) }}>{'<'} Prev</Text>
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
                <Text style={{ color: C.textPrimary, fontSize: fs(16), fontWeight: '600' }}>
                  {viewDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => { const d = new Date(viewDate); d.setDate(d.getDate() + 1); setViewDate(d); }} style={{ padding: rs(8) }}>
              <Text style={{ color: C.accent, fontWeight: 'bold', fontSize: fs(16) }}>Next {'>'}</Text>
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(8) }}>
            <Text style={[s.sectionTitle, { marginBottom: rs(0) }]}>Meal History</Text>
            <TouchableOpacity onPress={() => setShowRecipesScreen(true)} style={{ backgroundColor: 'rgba(56,189,248,0.1)', paddingHorizontal: rs(12), paddingVertical: rs(6), borderRadius: rs(8), borderWidth: rs(1), borderColor: C.border }}>
              <Text style={{ color: C.accent, fontSize: fs(13), fontWeight: 'bold' }}>⭐ Saved Recipes</Text>
            </TouchableOpacity>
          </View>
          {logs.length === 0 && <Text style={{ color: C.textMuted, fontStyle: 'italic', textAlign: 'center', marginTop: rs(16) }}>Nothing logged.</Text>}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(8) }}>
                <Text style={s.logName}>{item.name}</Text>
                {item.meal_type && (
                  <View style={{ backgroundColor: `${typeBadgeColor}20`, paddingHorizontal: rs(6), paddingVertical: rs(2), borderRadius: rs(4), borderWidth: rs(1), borderColor: `${typeBadgeColor}40` }}>
                    <Text style={{ color: typeBadgeColor, fontSize: fs(10), fontWeight: 'bold', textTransform: 'capitalize' }}>{typeBadgeIcon} {item.meal_type}</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: rs(6), marginTop: rs(6) }}>
              <Text style={s.chip}>🔥 {item.calories} kcal</Text>
              <Text style={s.chip}>💪 {item.protein}g</Text>
              <Text style={s.chip}>🌾 {item.carbohydrates}g</Text>
              <Text style={s.chip}>🧈 {item.fat}g</Text>
            </View>
            {item.reasoning && (
              <Text style={{ color: C.textMuted, fontSize: fs(11), fontStyle: 'italic', marginTop: rs(8) }}>
                💡 {item.reasoning}
              </Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: rs(2) }}>
            <View style={{ flexDirection: 'row', gap: rs(16) }}>
              <TouchableOpacity
                onPress={() => {
                  Alert.prompt(
                    "Save as Recipe",
                    "Enter a name for this recipe to quickly log it later.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Save", onPress: (name?: string) => { if(name?.trim()) handleSaveRecipe(name.trim(), item); } }
                    ],
                    "plain-text",
                    item.name
                  );
                }}
                style={{ padding: rs(12), paddingRight: rs(0) }}
                hitSlop={{ top: rs(10), bottom: rs(10), left: rs(10), right: rs(10) }}
              >
                <Text style={{ color: C.accent, fontSize: fs(13), fontWeight: 'bold' }}>⭐ Save</Text>
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
                style={{ padding: rs(12), paddingRight: rs(0) }}
                hitSlop={{ top: rs(10), bottom: rs(10), left: rs(10), right: rs(10) }}
              >
                <Text style={{ color: C.error, fontSize: fs(13), fontWeight: 'bold' }}>Delete</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: C.textMuted, fontSize: fs(12), marginLeft: rs(12) }}>
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
function ProfileTab({ session, rawProfile, targetMacros, onUpdateProfile, weightHistory, fetchData, isLoading, setIsLoading, onShowCheatSheet }: any) {
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
    <TouchableOpacity style={[s.optionBtn, selected && s.optionBtnSelected, { paddingVertical: rs(6), paddingHorizontal: rs(10), marginBottom: rs(0) }]} onPress={onPress}>
      <Text style={[s.optionText, selected && s.optionTextSelected, { fontSize: fs(13) }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: rs(16) }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(24), marginTop: rs(12) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: rs(12) }}>
          <View style={[s.avatarPlaceholder, { width: rs(56), height: rs(56), borderRadius: rs(28), marginBottom: rs(0), marginRight: rs(12) }]}>
            <Text style={[s.avatarText, { fontSize: fs(24) }]}>👤</Text>
          </View>
          <Text style={{ color: C.textPrimary, fontSize: fs(15), fontWeight: 'bold', flex: 1 }} numberOfLines={1} adjustsFontSizeToFit>{session?.user?.email}</Text>
        </View>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: rs(8) }}>
          <TouchableOpacity onPress={onShowCheatSheet} style={{ backgroundColor: 'rgba(56,189,248,0.15)', paddingHorizontal: rs(12), paddingVertical: rs(8), borderRadius: rs(20) }}>
            <Text style={{ color: C.accent, fontWeight: '600' }}>📚 Cheat Sheet</Text>
          </TouchableOpacity>
          {isEditing ? (
            <View style={{ flexDirection: 'row', gap: rs(12), alignItems: 'center' }}>
              <TouchableOpacity onPress={handleCancel} style={{ paddingVertical: rs(8) }}>
                <Text style={{ color: C.textSecondary, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={{ backgroundColor: C.accent, paddingHorizontal: rs(16), paddingVertical: rs(8), borderRadius: rs(8) }}>
                <Text style={{ color: C.bg, fontWeight: 'bold' }}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)} style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: rs(20), paddingVertical: rs(8), borderRadius: rs(20) }}>
              <Text style={{ color: C.textPrimary, fontWeight: '600' }}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(16) }}>
        <Text style={[s.sectionTitle, { marginBottom: rs(0) }]}>Daily Targets</Text>
        {isEditing && (
          <TouchableOpacity onPress={handleAutoCalculate} style={{ backgroundColor: 'rgba(56,189,248,0.15)', paddingHorizontal: rs(12), paddingVertical: rs(6), borderRadius: rs(12) }}>
            <Text style={{ color: C.accent, fontSize: fs(12), fontWeight: 'bold' }}>Auto-Calculate</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={[s.cardContainer, { paddingHorizontal: rs(24), marginBottom: rs(24) }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'center' }}>
            {isEditing ? (
              <TextInput style={[s.input, { width: rs(72), paddingVertical: rs(2), paddingHorizontal: rs(2), marginBottom: rs(0), textAlign: 'center', color: C.cal, fontSize: fs(18), fontWeight: 'bold' }]} value={targetCals} onChangeText={setTargetCals} keyboardType="numeric" selectTextOnFocus={true} />
            ) : (
              <Text style={{ color: C.cal, fontSize: fs(20), fontWeight: 'bold' }}>{targetMacros?.calories || 0}</Text>
            )}
            <Text style={{ color: C.textSecondary, fontSize: fs(12), marginTop: rs(4) }}>kcal</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            {isEditing ? (
              <TextInput style={[s.input, { width: rs(60), paddingVertical: rs(2), paddingHorizontal: rs(2), marginBottom: rs(0), textAlign: 'center', color: C.protein, fontSize: fs(18), fontWeight: 'bold' }]} value={targetProtein} onChangeText={setTargetProtein} keyboardType="numeric" selectTextOnFocus={true} />
            ) : (
              <Text style={{ color: C.protein, fontSize: fs(20), fontWeight: 'bold' }}>{targetMacros?.protein || 0}g</Text>
            )}
            <Text style={{ color: C.textSecondary, fontSize: fs(12), marginTop: rs(4) }}>Protein</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            {isEditing ? (
              <TextInput style={[s.input, { width: rs(60), paddingVertical: rs(2), paddingHorizontal: rs(2), marginBottom: rs(0), textAlign: 'center', color: C.carbs, fontSize: fs(18), fontWeight: 'bold' }]} value={targetCarbs} onChangeText={setTargetCarbs} keyboardType="numeric" selectTextOnFocus={true} />
            ) : (
              <Text style={{ color: C.carbs, fontSize: fs(20), fontWeight: 'bold' }}>{targetMacros?.carbs || 0}g</Text>
            )}
            <Text style={{ color: C.textSecondary, fontSize: fs(12), marginTop: rs(4) }}>Carbs</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            {isEditing ? (
              <TextInput style={[s.input, { width: rs(60), paddingVertical: rs(2), paddingHorizontal: rs(2), marginBottom: rs(0), textAlign: 'center', color: C.fat, fontSize: fs(18), fontWeight: 'bold' }]} value={targetFat} onChangeText={setTargetFat} keyboardType="numeric" selectTextOnFocus={true} />
            ) : (
              <Text style={{ color: C.fat, fontSize: fs(20), fontWeight: 'bold' }}>{targetMacros?.fat || 0}g</Text>
            )}
            <Text style={{ color: C.textSecondary, fontSize: fs(12), marginTop: rs(4) }}>Fat</Text>
          </View>
        </View>
      </View>

      <Text style={s.sectionTitle}>Personal Details</Text>
      <View style={s.cardContainer}>
        {/* Goal */}
        <View style={s.detailRow}>
          <Text style={[s.detailLabel, isEditing && { alignSelf: 'center' }]}>Goal</Text>
          {isEditing ? (
            <View style={{ flexDirection: 'row', gap: rs(4) }}>
              <OptionBtn label="Lose" selected={goal === 'lose'} onPress={() => setGoal('lose')} />
              <OptionBtn label="Maintain" selected={goal === 'maintain'} onPress={() => setGoal('maintain')} />
              <OptionBtn label="Gain" selected={goal === 'gain'} onPress={() => setGoal('gain')} />
            </View>
          ) : (
            <Text style={s.detailValue}>{goal}</Text>
          )}
        </View>
        {/* Activity Level */}
        <View style={[s.detailRow, isEditing && { flexDirection: 'column', alignItems: 'flex-start', gap: rs(8) }]}>
          <Text style={[s.detailLabel]}>Activity Level</Text>
          {isEditing ? (
            <View style={{ flexDirection: 'row', gap: rs(4), flexWrap: 'wrap' }}>
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
            <View style={{ flexDirection: 'row', gap: rs(4) }}>
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
            <TextInput style={[s.input, { marginBottom: rs(0), padding: rs(8), width: rs(80), textAlign: 'right' }]} keyboardType="numeric" value={age} onChangeText={setAge} />
          ) : (
            <Text style={s.detailValue}>{age} years</Text>
          )}
        </View>
        {/* Height */}
        <View style={s.detailRow}>
          <Text style={[s.detailLabel, isEditing && { alignSelf: 'center' }]}>Height</Text>
          {isEditing ? (
            <TextInput style={[s.input, { marginBottom: rs(0), padding: rs(8), width: rs(80), textAlign: 'right' }]} keyboardType="numeric" value={height} onChangeText={setHeight} />
          ) : (
            <Text style={s.detailValue}>{height} cm</Text>
          )}
        </View>
        {/* Weight */}
        <View style={[s.detailRow, { borderBottomWidth: rs(0) }]}>
          <Text style={[s.detailLabel, isEditing && { alignSelf: 'center' }]}>Weight</Text>
          {isEditing ? (
            <TextInput style={[s.input, { marginBottom: rs(0), padding: rs(8), width: rs(80), textAlign: 'right' }]} keyboardType="numeric" value={weight} onChangeText={setWeight} />
          ) : (
            <Text style={s.detailValue}>{weight} kg</Text>
          )}
        </View>
      </View>

      <Text style={[s.sectionTitle, { marginTop: rs(28) }]}>Weight Tracking</Text>
      <View style={s.cardContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            style={[s.input, { flex: 1, marginBottom: rs(0), marginRight: rs(8) }]}
            placeholder="Enter weight in kg"
            placeholderTextColor={C.textSecondary}
            keyboardType="numeric"
            value={newWeight}
            onChangeText={setNewWeight}
          />
          <TouchableOpacity style={[s.logBtn, { marginBottom: rs(0), paddingHorizontal: rs(24), paddingVertical: rs(12) }]} onPress={handleLogWeight} disabled={isLoading || !newWeight}>
            {isLoading ? <ActivityIndicator color={C.bg} /> : <Text style={s.btnText}>Log</Text>}
          </TouchableOpacity>
        </View>

        {weightHistory && weightHistory.length > 0 && (
          <View style={{ height: rs(120), flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: rs(24) }}>
            {weightHistory.slice(0, 10).reverse().map((w: any, idx: number, arr: any[]) => {
              const maxW = Math.max(...arr.map(h => h.weight_kg)) + 5;
              const minW = Math.max(Math.min(...arr.map(h => h.weight_kg)) - 5, 0);
              const range = maxW - minW || 1;
              const heightPct = Math.max(((w.weight_kg - minW) / range) * 100, 10);
              const isLatest = idx === arr.length - 1;
              return (
                <View key={w.id} style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ color: isLatest ? C.accent : C.textSecondary, fontSize: fs(10), marginBottom: rs(4) }}>{w.weight_kg}</Text>
                  <View style={{ width: rs(8), height: `${heightPct}%`, backgroundColor: isLatest ? C.accent : C.cal, borderRadius: rs(4) }} />
                </View>
              );
            })}
          </View>
        )}
      </View>

      <TouchableOpacity style={[s.logBtn, { backgroundColor: C.surface, marginTop: rs(24) }]} onPress={() => supabase.auth.signOut()}>
        <Text style={[s.btnText, { color: C.error }]}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Fitness Tab ──────────────────────────────────────────────────────────────
const safeParseArray = (val: any) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    if (typeof val === 'string') {
      return val.replace(/[\[\]"]/g, '').split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  }
};

const formatWorkoutDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch (e) {
    return dateStr;
  }
};

const ROUTINES = [
  {
    id: 'push',
    name: 'Push Routine ⚡',
    description: 'Target chest, shoulders, and triceps.',
    exercises: [
      { exercise_id: 'EIeI8Vf', name: 'barbell bench press', target_muscles: '["pectorals"]', body_parts: '["chest"]', equipments: '["barbell"]', gif_url: 'https://static.exercisedb.dev/media/EIeI8Vf.gif', sets: '4', reps: '10', weight_kg: '60', duration_seconds: '' },
      { exercise_id: 'DsgkuIt', name: 'dumbbell lateral raise', target_muscles: '["delts"]', body_parts: '["shoulders"]', equipments: '["dumbbell"]', gif_url: 'https://static.exercisedb.dev/media/DsgkuIt.gif', sets: '3', reps: '12', weight_kg: '10', duration_seconds: '' },
      { exercise_id: '9tvVVM9', name: 'flexible cable triceps pushdown (v-bar)', target_muscles: '["triceps"]', body_parts: '["upper arms"]', equipments: '["cable"]', gif_url: 'https://static.exercisedb.dev/media/9tvVVM9.gif', sets: '3', reps: '12', weight_kg: '20', duration_seconds: '' }
    ]
  },
  {
    id: 'pull',
    name: 'Pull Routine 🌀',
    description: 'Target back, biceps, and pulling muscles.',
    exercises: [
      { exercise_id: 'eZyBC3j', name: 'barbell bent over row', target_muscles: '["lats"]', body_parts: '["back"]', equipments: '["barbell"]', gif_url: 'https://static.exercisedb.dev/media/eZyBC3j.gif', sets: '4', reps: '8', weight_kg: '50', duration_seconds: '' },
      { exercise_id: 'RVwzP10', name: 'cable pulldown', target_muscles: '["lats"]', body_parts: '["back"]', equipments: '["cable"]', gif_url: 'https://static.exercisedb.dev/media/RVwzP10.gif', sets: '3', reps: '10', weight_kg: '45', duration_seconds: '' },
      { exercise_id: '3s4NnTh', name: 'dumbbell standing biceps curl', target_muscles: '["biceps"]', body_parts: '["upper arms"]', equipments: '["dumbbell"]', gif_url: 'https://static.exercisedb.dev/media/3s4NnTh.gif', sets: '3', reps: '12', weight_kg: '12', duration_seconds: '' }
    ]
  },
  {
    id: 'legs',
    name: 'Leg Routine 🦵',
    description: 'Target quads, glutes, and lower body.',
    exercises: [
      { exercise_id: 'qXTaZnJ', name: 'barbell full squat', target_muscles: '["quads"]', body_parts: '["upper legs"]', equipments: '["barbell"]', gif_url: 'https://static.exercisedb.dev/media/qXTaZnJ.gif', sets: '4', reps: '8', weight_kg: '80', duration_seconds: '' },
      { exercise_id: 'ila4NZS', name: 'barbell deadlift', target_muscles: '["glutes"]', body_parts: '["upper legs"]', equipments: '["barbell"]', gif_url: 'https://static.exercisedb.dev/media/ila4NZS.gif', sets: '3', reps: '5', weight_kg: '100', duration_seconds: '' }
    ]
  }
];

function FitnessTab() {
  const [activeSubTab, setActiveSubTab] = useState<'routines' | 'log' | 'history'>('routines');
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Form state
  const [workoutName, setWorkoutName] = useState('');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Modal Detail state
  const [selectedDetailExercise, setSelectedDetailExercise] = useState<any | null>(null);

  const loadHistory = async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const workouts = await getWorkouts();
      setHistory(workouts || []);
    } catch (err: any) {
      setHistoryError(err.message || 'Failed to load workout history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'history') {
      loadHistory();
    }
  }, [activeSubTab]);

  // Debounced exercise search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const res = await searchExercises(searchQuery);
        setSearchResults(res || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSearch(false);
      }
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleAddExercise = (item: any) => {
    const exists = selectedExercises.some(ex => ex.exercise_id === item.exercise_id);
    if (exists) {
      Alert.alert('Already Added', 'This exercise is already in your session list.');
      return;
    }

    setSelectedExercises(prev => [
      ...prev,
      {
        exercise_id: item.exercise_id,
        name: item.name,
        gif_url: item.gif_url,
        body_parts: item.body_parts,
        equipments: item.equipments,
        target_muscles: item.target_muscles,
        sets: '3',
        reps: '10',
        weight_kg: '',
        duration_seconds: '',
      }
    ]);
    // Clear search query after adding to clean up the screen
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleStartRoutine = (routine: any) => {
    setSelectedExercises(
      routine.exercises.map((ex: any) => ({
        exercise_id: ex.exercise_id,
        name: ex.name,
        gif_url: ex.gif_url,
        body_parts: ex.body_parts,
        equipments: ex.equipments,
        target_muscles: ex.target_muscles,
        sets: ex.sets,
        reps: ex.reps,
        weight_kg: ex.weight_kg,
        duration_seconds: ex.duration_seconds,
      }))
    );
    setWorkoutName(routine.name.replace(/ ⚡| 🌀| 🦵/, '')); // clean up emojis for database
    setWorkoutNotes(`Started from ${routine.name}`);
    setDurationMinutes('45'); // default estimate

    // Switch to log sub-tab
    setActiveSubTab('log');

    Alert.alert(
      'Routine Loaded! ⚡',
      `Loaded ${routine.name}. Adjust your sets, reps, and weights below, then tap Save Workout.`,
      [{ text: 'Let\'s Go' }]
    );
  };

  const handleUpdateExerciseField = (index: number, field: string, value: string) => {
    setSelectedExercises(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveExercise = (index: number) => {
    setSelectedExercises(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveWorkout = async () => {
    if (selectedExercises.length === 0) {
      Alert.alert('Empty Workout', 'Please add at least one exercise to save.');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedDuration = durationMinutes ? parseInt(durationMinutes, 10) : undefined;
      const setsPayload = selectedExercises.map(ex => ({
        exercise_id: ex.exercise_id,
        sets: ex.sets ? parseInt(ex.sets, 10) : undefined,
        reps: ex.reps ? parseInt(ex.reps, 10) : undefined,
        weight_kg: ex.weight_kg ? parseFloat(ex.weight_kg) : undefined,
        duration_seconds: ex.duration_seconds ? parseInt(ex.duration_seconds, 10) : undefined,
      }));

      const res = await logWorkout({
        name: workoutName.trim() || 'Workout Session',
        notes: workoutNotes.trim() || undefined,
        duration_minutes: parsedDuration,
        sets: setsPayload,
      });

      Alert.alert(
        'Workout Logged! 🔥',
        `Estimated calorie burn: ${res.calories_burned} kcal.\nGreat job! Keep it up.`,
        [{ text: 'Awesome' }]
      );

      // Reset form
      setWorkoutName('');
      setWorkoutNotes('');
      setDurationMinutes('');
      setSelectedExercises([]);
      setSearchQuery('');
      setSearchResults([]);

      // Redirect to history
      setActiveSubTab('history');
    } catch (err: any) {
      Alert.alert('Error Saving', err.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={fitnessStyles.container}>
      {/* Sub tabs switcher */}
      <View style={fitnessStyles.subTabContainer}>
        <TouchableOpacity 
          style={[fitnessStyles.subTabButton, activeSubTab === 'routines' && fitnessStyles.subTabButtonActive]}
          onPress={() => setActiveSubTab('routines')}
        >
          <Ionicons name="list-outline" size={18} color={activeSubTab === 'routines' ? C.bg : C.accent} />
          <Text style={[fitnessStyles.subTabButtonText, activeSubTab === 'routines' && fitnessStyles.subTabButtonTextActive]}>Routines</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[fitnessStyles.subTabButton, activeSubTab === 'log' && fitnessStyles.subTabButtonActive]}
          onPress={() => setActiveSubTab('log')}
        >
          <Ionicons name="add-circle-outline" size={18} color={activeSubTab === 'log' ? C.bg : C.accent} />
          <Text style={[fitnessStyles.subTabButtonText, activeSubTab === 'log' && fitnessStyles.subTabButtonTextActive]}>Log Workout</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[fitnessStyles.subTabButton, activeSubTab === 'history' && fitnessStyles.subTabButtonActive]}
          onPress={() => setActiveSubTab('history')}
        >
          <Ionicons name="time-outline" size={18} color={activeSubTab === 'history' ? C.bg : C.accent} />
          <Text style={[fitnessStyles.subTabButtonText, activeSubTab === 'history' && fitnessStyles.subTabButtonTextActive]}>History</Text>
        </TouchableOpacity>
      </View>

      {activeSubTab === 'routines' ? (
        /* Routines View */
        <ScrollView contentContainerStyle={fitnessStyles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={fitnessStyles.sectionTitle}>Fitness Routines</Text>
          <Text style={{ color: C.textSecondary, fontSize: fs(14), marginBottom: rs(16) }}>
            Select a routine to automatically load it and start your fitness logging session.
          </Text>
          {ROUTINES.map((routine) => (
            <View key={routine.id} style={fitnessStyles.routineCard}>
              <View style={fitnessStyles.routineHeader}>
                <Text style={fitnessStyles.routineTitle}>{routine.name}</Text>
                <Text style={fitnessStyles.routineDesc}>{routine.description}</Text>
              </View>
              
              <View style={fitnessStyles.routineExerciseList}>
                {routine.exercises.map((ex) => (
                  <View key={ex.exercise_id} style={fitnessStyles.routineExerciseRow}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={C.accent} />
                    <Text style={fitnessStyles.routineExerciseText} numberOfLines={1}>
                      {ex.name}
                    </Text>
                    <Text style={fitnessStyles.routineExerciseDetails}>
                      {ex.sets} sets × {ex.reps} reps {ex.weight_kg ? `@ ${ex.weight_kg}kg` : ''}
                    </Text>
                  </View>
                ))}
              </View>
              
              <TouchableOpacity 
                style={fitnessStyles.routineStartBtn}
                onPress={() => handleStartRoutine(routine)}
              >
                <Ionicons name="play" size={16} color={C.bg} />
                <Text style={fitnessStyles.routineStartBtnText}>Start Routine</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : activeSubTab === 'log' ? (
        /* Log session view */
        <ScrollView contentContainerStyle={fitnessStyles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={fitnessStyles.sectionTitle}>Session Details</Text>
          
          <View style={fitnessStyles.formCard}>
            <View style={fitnessStyles.inputGroup}>
              <Text style={fitnessStyles.inputLabel}>Session Name</Text>
              <TextInput 
                style={fitnessStyles.formInput} 
                placeholder="e.g. Push Day, Morning Cardio" 
                placeholderTextColor={C.textMuted}
                value={workoutName}
                onChangeText={setWorkoutName}
              />
            </View>

            <View style={fitnessStyles.formRow}>
              <View style={[fitnessStyles.inputGroup, { flex: 1 }]}>
                <Text style={fitnessStyles.inputLabel}>Duration (mins)</Text>
                <TextInput 
                  style={fitnessStyles.formInput} 
                  placeholder="e.g. 45" 
                  placeholderTextColor={C.textMuted}
                  keyboardType="number-pad"
                  value={durationMinutes}
                  onChangeText={setDurationMinutes}
                />
              </View>
              <View style={[fitnessStyles.inputGroup, { flex: 2 }]}>
                <Text style={fitnessStyles.inputLabel}>Notes</Text>
                <TextInput 
                  style={fitnessStyles.formInput} 
                  placeholder="felt strong, short rest" 
                  placeholderTextColor={C.textMuted}
                  value={workoutNotes}
                  onChangeText={setWorkoutNotes}
                />
              </View>
            </View>
          </View>

          {/* Selected exercises list */}
          <Text style={fitnessStyles.sectionTitle}>Exercises ({selectedExercises.length})</Text>
          {selectedExercises.length === 0 ? (
            <View style={[fitnessStyles.formCard, { alignItems: 'center', paddingVertical: rs(24) }]}>
              <Ionicons name="barbell-outline" size={32} color={C.textMuted} style={{ marginBottom: rs(8) }} />
              <Text style={{ color: C.textSecondary, fontSize: fs(14), textAlign: 'center' }}>
                No exercises added yet. Use the search bar below to add exercises to your session!
              </Text>
            </View>
          ) : (
            selectedExercises.map((ex, index) => {
              const muscles = safeParseArray(ex.target_muscles);
              return (
                <View key={ex.exercise_id} style={fitnessStyles.exerciseCard}>
                  <View style={fitnessStyles.exerciseHeader}>
                    {ex.gif_url ? (
                      <TouchableOpacity onPress={() => setSelectedDetailExercise(ex)}>
                        <Image source={{ uri: ex.gif_url }} style={fitnessStyles.exerciseThumb} />
                      </TouchableOpacity>
                    ) : (
                      <View style={[fitnessStyles.exerciseThumb, { justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="barbell-outline" size={20} color={C.textMuted} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <TouchableOpacity onPress={() => setSelectedDetailExercise(ex)}>
                        <Text style={fitnessStyles.exerciseTitle} numberOfLines={1}>{ex.name}</Text>
                      </TouchableOpacity>
                      {muscles.length > 0 && (
                        <View style={fitnessStyles.muscleBadge}>
                          <Text style={fitnessStyles.muscleText}>{muscles[0]}</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveExercise(index)} style={fitnessStyles.removeBtn}>
                      <Ionicons name="trash-outline" size={20} color={C.error} />
                    </TouchableOpacity>
                  </View>

                  {/* Sets and Reps inputs */}
                  <View style={fitnessStyles.inputsRow}>
                    <View style={fitnessStyles.exerciseInputCol}>
                      <Text style={fitnessStyles.exerciseInputLabel}>Sets</Text>
                      <TextInput 
                        style={fitnessStyles.exerciseInput}
                        keyboardType="number-pad"
                        value={ex.sets}
                        onChangeText={(v) => handleUpdateExerciseField(index, 'sets', v)}
                      />
                    </View>
                    <View style={fitnessStyles.exerciseInputCol}>
                      <Text style={fitnessStyles.exerciseInputLabel}>Reps</Text>
                      <TextInput 
                        style={fitnessStyles.exerciseInput}
                        keyboardType="number-pad"
                        value={ex.reps}
                        onChangeText={(v) => handleUpdateExerciseField(index, 'reps', v)}
                      />
                    </View>
                    <View style={fitnessStyles.exerciseInputCol}>
                      <Text style={fitnessStyles.exerciseInputLabel}>Weight (kg)</Text>
                      <TextInput 
                        style={fitnessStyles.exerciseInput}
                        keyboardType="decimal-pad"
                        placeholder="Body"
                        placeholderTextColor={C.textMuted}
                        value={ex.weight_kg}
                        onChangeText={(v) => handleUpdateExerciseField(index, 'weight_kg', v)}
                      />
                    </View>
                    <View style={fitnessStyles.exerciseInputCol}>
                      <Text style={fitnessStyles.exerciseInputLabel}>Time (s)</Text>
                      <TextInput 
                        style={fitnessStyles.exerciseInput}
                        keyboardType="number-pad"
                        placeholder="—"
                        placeholderTextColor={C.textMuted}
                        value={ex.duration_seconds}
                        onChangeText={(v) => handleUpdateExerciseField(index, 'duration_seconds', v)}
                      />
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {/* Add exercise search */}
          <Text style={[fitnessStyles.sectionTitle, { marginTop: rs(16) }]}>Search Exercises</Text>
          <View style={fitnessStyles.searchBoxContainer}>
            <Ionicons name="search-outline" size={20} color={C.textMuted} style={fitnessStyles.searchIcon} />
            <TextInput 
              style={fitnessStyles.searchInput}
              placeholder="e.g. bench press, bicep curl..."
              placeholderTextColor={C.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={fitnessStyles.clearSearchBtn}>
                <Ionicons name="close-circle" size={18} color={C.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {loadingSearch && <ActivityIndicator color={C.accent} style={{ marginVertical: rs(12) }} />}

          {searchResults.map((item) => {
            const muscles = safeParseArray(item.target_muscles);
            const equip = safeParseArray(item.equipments);
            return (
              <View key={item.exercise_id} style={fitnessStyles.searchResultCard}>
                {item.gif_url ? (
                  <TouchableOpacity onPress={() => setSelectedDetailExercise(item)}>
                    <Image source={{ uri: item.gif_url }} style={fitnessStyles.exerciseThumb} />
                  </TouchableOpacity>
                ) : (
                  <View style={[fitnessStyles.exerciseThumb, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="barbell-outline" size={20} color={C.textMuted} />
                  </View>
                )}
                <View style={fitnessStyles.searchResultTextContainer}>
                  <TouchableOpacity onPress={() => setSelectedDetailExercise(item)}>
                    <Text style={fitnessStyles.searchResultTitle} numberOfLines={1}>{item.name}</Text>
                  </TouchableOpacity>
                  <View style={fitnessStyles.searchResultMeta}>
                    {muscles.length > 0 && (
                      <View style={fitnessStyles.muscleBadge}>
                        <Text style={fitnessStyles.muscleText}>{muscles[0]}</Text>
                      </View>
                    )}
                    {equip.length > 0 && (
                      <View style={[fitnessStyles.muscleBadge, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
                        <Text style={[fitnessStyles.muscleText, { color: C.textSecondary }]}>{equip[0]}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleAddExercise(item)} style={fitnessStyles.addResultBtn}>
                  <Ionicons name="add" size={20} color={C.bg} />
                </TouchableOpacity>
              </View>
            );
          })}

          {searchQuery.trim().length > 0 && !loadingSearch && searchResults.length === 0 && (
            <Text style={{ color: C.textMuted, fontStyle: 'italic', textAlign: 'center', marginVertical: rs(12) }}>
              No exercise matches found. Try spelling differently or another term.
            </Text>
          )}

          {/* Submit button */}
          <TouchableOpacity 
            style={[fitnessStyles.submitBtn, selectedExercises.length === 0 && fitnessStyles.submitBtnDisabled]}
            onPress={handleSaveWorkout}
            disabled={isSubmitting || selectedExercises.length === 0}
          >
            {isSubmitting ? (
              <ActivityIndicator color={C.bg} />
            ) : (
              <Text style={fitnessStyles.submitBtnText}>Save Workout Session</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        /* History view */
        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={fitnessStyles.scrollContent}
          refreshing={loadingHistory}
          onRefresh={loadHistory}
          ListEmptyComponent={
            loadingHistory ? (
              <ActivityIndicator color={C.accent} style={{ marginTop: rs(40) }} />
            ) : historyError ? (
              <View style={{ alignItems: 'center', marginTop: rs(40) }}>
                <Text style={{ color: C.error, textAlign: 'center', marginBottom: rs(12) }}>{historyError}</Text>
                <TouchableOpacity onPress={loadHistory} style={{ backgroundColor: 'rgba(56,189,248,0.1)', paddingHorizontal: rs(16), paddingVertical: rs(8), borderRadius: rs(8) }}>
                  <Text style={{ color: C.accent, fontWeight: 'bold' }}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ alignItems: 'center', marginTop: rs(40) }}>
                <Text style={fitnessStyles.emptyText}>No workout history recorded yet.</Text>
                <TouchableOpacity 
                  onPress={() => setActiveSubTab('log')}
                  style={{ marginTop: rs(16), backgroundColor: 'rgba(56,189,248,0.1)', paddingHorizontal: rs(16), paddingVertical: rs(10), borderRadius: rs(8), borderWidth: rs(1), borderColor: C.border }}
                >
                  <Text style={{ color: C.accent, fontWeight: 'bold' }}>Log Your First Workout 🏋️</Text>
                </TouchableOpacity>
              </View>
            )
          }
          renderItem={({ item }) => (
            <View style={fitnessStyles.historyCard}>
              <View style={fitnessStyles.historyCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={fitnessStyles.historyWorkoutName}>{item.name || 'Workout Session'}</Text>
                  <Text style={{ color: C.textMuted, fontSize: fs(11), marginTop: rs(2) }}>
                    📅 {formatWorkoutDate(item.logged_at)}
                  </Text>
                </View>
                {item.calories_burned !== null && (
                  <View style={fitnessStyles.historyCaloriesBadge}>
                    <Text style={fitnessStyles.historyCaloriesText}>🔥 {item.calories_burned} kcal</Text>
                  </View>
                )}
              </View>

              <View style={fitnessStyles.historyMetaRow}>
                {item.duration_minutes !== null && (
                  <Text style={fitnessStyles.historyMetaItem}>⏱️ {item.duration_minutes} mins</Text>
                )}
                <Text style={fitnessStyles.historyMetaItem}>💪 {item.sets?.length || 0} exercises</Text>
              </View>

              {item.notes ? (
                <Text style={fitnessStyles.historyNotes}>💡 {item.notes}</Text>
              ) : null}

              {/* Individual exercise logs */}
              {item.sets && item.sets.map((set: any, idx: number) => (
                <View key={set.id || idx} style={fitnessStyles.historySetItem}>
                  <Ionicons name="checkmark-circle-outline" size={14} color={C.accent} />
                  <Text style={fitnessStyles.historySetName} numberOfLines={1}>{set.name}</Text>
                  <Text style={fitnessStyles.historySetDetails}>
                    {set.sets ? `${set.sets} sets` : ''}
                    {set.reps ? ` × ${set.reps} reps` : ''}
                    {set.weight_kg ? ` @ ${set.weight_kg}kg` : ''}
                    {set.duration_seconds ? ` (${set.duration_seconds}s)` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}
        />
      )}

      {/* Exercise Detail Modal */}
      <Modal
        visible={selectedDetailExercise !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedDetailExercise(null)}
      >
        <View style={fitnessStyles.modalOverlay}>
          <View style={fitnessStyles.modalContent}>
            {selectedDetailExercise && (
              <>
                <View style={{ paddingHorizontal: rs(20), paddingTop: rs(16), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: C.textPrimary, fontSize: fs(18), fontWeight: 'bold' }}>Exercise Details</Text>
                  <TouchableOpacity onPress={() => setSelectedDetailExercise(null)} style={fitnessStyles.modalCloseBtn}>
                    <Ionicons name="close" size={24} color={C.textPrimary} />
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={fitnessStyles.modalScroll}>
                  {selectedDetailExercise.gif_url ? (
                    <Image source={{ uri: selectedDetailExercise.gif_url }} style={fitnessStyles.modalGif} resizeMode="contain" />
                  ) : (
                    <View style={[fitnessStyles.modalGif, { justifyContent: 'center', alignItems: 'center' }]}>
                      <Ionicons name="barbell-outline" size={64} color={C.textMuted} />
                    </View>
                  )}
                  
                  <Text style={fitnessStyles.modalTitle}>{selectedDetailExercise.name}</Text>
                  
                  <View style={fitnessStyles.modalBadgesRow}>
                    {safeParseArray(selectedDetailExercise.target_muscles).map((m: string) => (
                      <View key={m} style={fitnessStyles.modalBadge}>
                        <Text style={fitnessStyles.modalBadgeText}>🎯 {m}</Text>
                      </View>
                    ))}
                    {safeParseArray(selectedDetailExercise.body_parts).map((b: string) => (
                      <View key={b} style={[fitnessStyles.modalBadge, { borderColor: 'rgba(56,189,248,0.3)' }]}>
                        <Text style={[fitnessStyles.modalBadgeText, { color: C.accent }]}>💪 {b}</Text>
                      </View>
                    ))}
                    {safeParseArray(selectedDetailExercise.equipments).map((e: string) => (
                      <View key={e} style={fitnessStyles.modalBadge}>
                        <Text style={fitnessStyles.modalBadgeText}>⚙️ {e}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={fitnessStyles.modalInstructionSection}>
                    <Text style={fitnessStyles.modalSectionTitle}>Instructions</Text>
                    {safeParseArray(selectedDetailExercise.instructions).length > 0 ? (
                      safeParseArray(selectedDetailExercise.instructions).map((step: string, idx: number) => (
                        <View key={idx} style={fitnessStyles.instructionStep}>
                          <View style={fitnessStyles.stepNumberContainer}>
                            <Text style={fitnessStyles.stepNumber}>{idx + 1}</Text>
                          </View>
                          <Text style={fitnessStyles.stepText}>{step}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={{ color: C.textMuted, fontStyle: 'italic' }}>No instructions available for this exercise.</Text>
                    )}
                  </View>

                  <TouchableOpacity 
                    style={fitnessStyles.modalAddBtn}
                    onPress={() => {
                      handleAddExercise(selectedDetailExercise);
                      setSelectedDetailExercise(null);
                    }}
                  >
                    <Text style={fitnessStyles.modalAddBtnText}>Add to Current Session</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const fitnessStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  subTabContainer: {
    flexDirection: 'row',
    paddingHorizontal: rs(16),
    paddingVertical: rs(12),
    gap: rs(8),
    backgroundColor: 'rgba(15,23,42,0.4)',
    borderBottomWidth: rs(1),
    borderBottomColor: C.border,
  },
  subTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30,41,59,0.3)',
    borderWidth: rs(1),
    borderColor: C.border,
    borderRadius: rs(10),
    paddingVertical: rs(10),
    gap: rs(6),
  },
  subTabButtonActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  subTabButtonText: {
    color: C.textSecondary,
    fontWeight: '600',
    fontSize: fs(12),
  },
  subTabButtonTextActive: {
    color: C.bg,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: rs(16),
    paddingBottom: rs(40),
  },
  sectionTitle: {
    fontSize: fs(17),
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: rs(12),
    marginTop: rs(8),
  },
  formCard: {
    backgroundColor: C.surface,
    padding: rs(16),
    borderRadius: rs(14),
    marginBottom: rs(20),
    borderWidth: rs(1),
    borderColor: C.border,
  },
  formRow: {
    flexDirection: 'row',
    gap: rs(12),
  },
  inputGroup: {
    marginBottom: rs(12),
  },
  inputLabel: {
    color: C.textSecondary,
    fontSize: fs(12),
    fontWeight: '500',
    marginBottom: rs(6),
  },
  formInput: {
    backgroundColor: 'rgba(15,23,42,0.5)',
    borderWidth: rs(1),
    borderColor: C.border,
    borderRadius: rs(8),
    paddingHorizontal: rs(12),
    paddingVertical: rs(10),
    color: C.textPrimary,
    fontSize: fs(15),
  },
  exerciseCard: {
    backgroundColor: C.surface,
    borderRadius: rs(14),
    padding: rs(12),
    marginBottom: rs(12),
    borderWidth: rs(1),
    borderColor: C.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    marginBottom: rs(12),
  },
  exerciseThumb: {
    width: rs(48),
    height: rs(48),
    borderRadius: rs(8),
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  exerciseTitle: {
    color: C.textPrimary,
    fontSize: fs(15),
    fontWeight: '600',
    textTransform: 'capitalize',
    marginBottom: rs(4),
  },
  muscleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56,189,248,0.1)',
    paddingHorizontal: rs(6),
    paddingVertical: rs(2),
    borderRadius: rs(4),
    borderWidth: rs(1),
    borderColor: 'rgba(56,189,248,0.2)',
  },
  muscleText: {
    color: C.accent,
    fontSize: fs(10),
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  removeBtn: {
    padding: rs(6),
  },
  inputsRow: {
    flexDirection: 'row',
    gap: rs(8),
  },
  exerciseInputCol: {
    flex: 1,
    alignItems: 'center',
  },
  exerciseInputLabel: {
    color: C.textMuted,
    fontSize: fs(10),
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: rs(4),
  },
  exerciseInput: {
    backgroundColor: 'rgba(15,23,42,0.4)',
    borderWidth: rs(1),
    borderColor: C.border,
    borderRadius: rs(6),
    width: '100%',
    paddingVertical: rs(6),
    color: C.textPrimary,
    fontSize: fs(14),
    fontWeight: '600',
    textAlign: 'center',
  },
  searchBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.5)',
    borderWidth: rs(1),
    borderColor: C.border,
    borderRadius: rs(10),
    paddingHorizontal: rs(12),
    marginBottom: rs(16),
  },
  searchIcon: {
    marginRight: rs(8),
  },
  searchInput: {
    flex: 1,
    paddingVertical: rs(10),
    color: C.textPrimary,
    fontSize: fs(15),
  },
  clearSearchBtn: {
    padding: rs(6),
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    padding: rs(10),
    borderRadius: rs(10),
    marginBottom: rs(8),
    borderWidth: rs(1),
    borderColor: C.border,
  },
  searchResultTextContainer: {
    flex: 1,
    marginLeft: rs(12),
    justifyContent: 'center',
  },
  searchResultTitle: {
    color: C.textPrimary,
    fontSize: fs(14),
    fontWeight: '600',
    textTransform: 'capitalize',
    marginBottom: rs(4),
  },
  searchResultMeta: {
    flexDirection: 'row',
    gap: rs(6),
  },
  addResultBtn: {
    backgroundColor: C.accent,
    width: rs(32),
    height: rs(32),
    borderRadius: rs(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtn: {
    backgroundColor: C.accent,
    paddingVertical: rs(14),
    borderRadius: rs(10),
    alignItems: 'center',
    marginTop: rs(16),
    marginBottom: rs(24),
  },
  submitBtnDisabled: {
    backgroundColor: C.textMuted,
    opacity: 0.6,
  },
  submitBtnText: {
    color: C.bg,
    fontSize: fs(16),
    fontWeight: 'bold',
  },
  historyCard: {
    backgroundColor: C.surface,
    borderRadius: rs(14),
    padding: rs(16),
    marginBottom: rs(12),
    borderWidth: rs(1),
    borderColor: C.border,
    borderLeftWidth: rs(4),
    borderLeftColor: C.accent,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: rs(8),
  },
  historyWorkoutName: {
    color: C.textPrimary,
    fontSize: fs(16),
    fontWeight: '600',
    flex: 1,
  },
  historyCaloriesBadge: {
    backgroundColor: 'rgba(249,115,22,0.15)',
    borderWidth: rs(1),
    borderColor: 'rgba(249,115,22,0.3)',
    borderRadius: rs(6),
    paddingHorizontal: rs(8),
    paddingVertical: rs(4),
    marginLeft: rs(8),
  },
  historyCaloriesText: {
    color: C.cal,
    fontSize: fs(12),
    fontWeight: 'bold',
  },
  historyMetaRow: {
    flexDirection: 'row',
    gap: rs(12),
    marginBottom: rs(12),
  },
  historyMetaItem: {
    color: C.textSecondary,
    fontSize: fs(12),
  },
  historyNotes: {
    color: C.textMuted,
    fontSize: fs(12),
    fontStyle: 'italic',
    backgroundColor: 'rgba(15,23,42,0.3)',
    padding: rs(8),
    borderRadius: rs(6),
    marginBottom: rs(12),
  },
  historySetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    marginTop: rs(4),
  },
  historySetName: {
    color: C.textSecondary,
    fontSize: fs(13),
    fontWeight: '500',
    textTransform: 'capitalize',
    flex: 1,
  },
  historySetDetails: {
    color: C.textMuted,
    fontSize: fs(12),
  },
  emptyText: {
    color: C.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: rs(24),
    fontSize: fs(14),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: rs(20),
  },
  modalContent: {
    backgroundColor: C.surface,
    borderRadius: rs(20),
    borderWidth: rs(1),
    borderColor: C.border,
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalScroll: {
    padding: rs(20),
  },
  modalCloseBtn: {
    alignSelf: 'flex-end',
    padding: rs(8),
  },
  modalGif: {
    width: rs(220),
    height: rs(220),
    borderRadius: rs(16),
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: rs(20),
  },
  modalTitle: {
    color: C.textPrimary,
    fontSize: fs(22),
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'capitalize',
    marginBottom: rs(12),
  },
  modalBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: rs(8),
    marginBottom: rs(20),
  },
  modalBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: rs(10),
    paddingVertical: rs(4),
    borderRadius: rs(6),
    borderWidth: rs(1),
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalBadgeText: {
    color: C.textSecondary,
    fontSize: fs(11),
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  modalInstructionSection: {
    marginBottom: rs(24),
  },
  modalSectionTitle: {
    color: C.textPrimary,
    fontSize: fs(16),
    fontWeight: '600',
    marginBottom: rs(12),
  },
  instructionStep: {
    flexDirection: 'row',
    gap: rs(12),
    marginBottom: rs(10),
  },
  stepNumberContainer: {
    backgroundColor: C.accent,
    width: rs(20),
    height: rs(20),
    borderRadius: rs(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: rs(2),
  },
  stepNumber: {
    color: C.bg,
    fontSize: fs(11),
    fontWeight: 'bold',
  },
  stepText: {
    color: C.textSecondary,
    fontSize: fs(14),
    lineHeight: rs(20),
    flex: 1,
  },
  modalAddBtn: {
    backgroundColor: C.accent,
    paddingVertical: rs(14),
    borderRadius: rs(10),
    alignItems: 'center',
    marginBottom: rs(12),
  },
  modalAddBtnText: {
    color: C.bg,
    fontSize: fs(16),
    fontWeight: 'bold',
  },
  routineCard: {
    backgroundColor: C.surface,
    borderRadius: rs(14),
    padding: rs(16),
    marginBottom: rs(16),
    borderWidth: rs(1),
    borderColor: C.border,
  },
  routineHeader: {
    marginBottom: rs(12),
  },
  routineTitle: {
    color: C.textPrimary,
    fontSize: fs(17),
    fontWeight: 'bold',
    marginBottom: rs(4),
  },
  routineDesc: {
    color: C.textSecondary,
    fontSize: fs(13),
  },
  routineExerciseList: {
    marginBottom: rs(16),
    backgroundColor: 'rgba(15,23,42,0.3)',
    padding: rs(12),
    borderRadius: rs(10),
  },
  routineExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    marginVertical: rs(4),
  },
  routineExerciseText: {
    color: C.textPrimary,
    fontSize: fs(14),
    textTransform: 'capitalize',
    flex: 1,
  },
  routineExerciseDetails: {
    color: C.textMuted,
    fontSize: fs(12),
  },
  routineStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.accent,
    paddingVertical: rs(12),
    borderRadius: rs(10),
    gap: rs(8),
  },
  routineStartBtnText: {
    color: C.bg,
    fontSize: fs(14),
    fontWeight: 'bold',
  },
});


// ─── Recipes Screen ───────────────────────────────────────────────────────────
function RecipesScreen({ recipes, handleLogRecipe, handleDeleteRecipe, onBack }: any) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: rs(16), borderBottomWidth: rs(1), borderBottomColor: 'rgba(255,255,255,0.1)' }}>
        <TouchableOpacity onPress={onBack} style={{ padding: rs(8), marginRight: rs(8) }}>
          <Text style={{ color: C.accent, fontSize: fs(16), fontWeight: 'bold' }}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={{ color: C.textPrimary, fontSize: fs(18), fontWeight: 'bold' }}>Saved Recipes</Text>
      </View>

      <FlatList
        data={recipes}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: rs(16) }}
        ListEmptyComponent={<Text style={{ color: C.textMuted, textAlign: 'center', marginTop: rs(32), fontStyle: 'italic' }}>No saved recipes yet. Log a meal and tap '⭐ Save' in the Logs tab to add one!</Text>}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: C.surface, padding: rs(16), borderRadius: rs(12), marginBottom: rs(12) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(12) }}>
              <Text style={{ color: C.textPrimary, fontSize: fs(16), fontWeight: 'bold' }}>{item.name}</Text>
              <TouchableOpacity onPress={() => handleDeleteRecipe(item.id)} hitSlop={{top: rs(10), bottom: rs(10), left: rs(10), right: rs(10)}}>
                <Text style={{ color: C.error, fontSize: fs(20) }}>×</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: rs(6), marginBottom: rs(16) }}>
              <Text style={s.chip}>🔥 {item.calories} kcal</Text>
              <Text style={s.chip}>💪 {item.protein}g</Text>
              <Text style={s.chip}>🌾 {item.carbohydrates}g</Text>
              <Text style={s.chip}>🧈 {item.fat}g</Text>
            </View>
            <TouchableOpacity onPress={() => { handleLogRecipe(item.id); onBack(); }} style={{ backgroundColor: C.accent, paddingVertical: rs(10), borderRadius: rs(8), alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: fs(14) }}>+ Log this Meal</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

// ─── Cheat Sheet Screen ───────────────────────────────────────────────────────
function CheatSheetScreen({ onBack }: any) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: rs(16), borderBottomWidth: rs(1), borderBottomColor: 'rgba(255,255,255,0.1)' }}>
        <TouchableOpacity onPress={onBack} style={{ padding: rs(8), marginRight: rs(8) }}>
          <Text style={{ color: C.accent, fontSize: fs(16), fontWeight: 'bold' }}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={{ color: C.textPrimary, fontSize: fs(18), fontWeight: 'bold' }}>Nutrition Cheat Sheet</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: rs(16), paddingBottom: rs(40) }}>
        <Text style={[s.sectionTitle, { color: C.protein, marginTop: rs(8) }]}>High Protein</Text>
        <Text style={{ color: C.textSecondary, marginBottom: rs(16), lineHeight: rs(22) }}>
          • <Text style={{ color: C.textPrimary }}>Chicken Breast</Text> (Lean, high protein){'\n'}
          • <Text style={{ color: C.textPrimary }}>Greek Yogurt</Text> (High protein, probiotics){'\n'}
          • <Text style={{ color: C.textPrimary }}>Salmon</Text> (Protein + Omega-3s){'\n'}
          • <Text style={{ color: C.textPrimary }}>Tofu</Text> (Plant-based protein){'\n'}
          • <Text style={{ color: C.textPrimary }}>Eggs</Text> (Complete protein source)
        </Text>

        <Text style={[s.sectionTitle, { color: C.carbs, marginTop: rs(16) }]}>Quality Carbohydrates</Text>
        <Text style={{ color: C.textSecondary, marginBottom: rs(16), lineHeight: rs(22) }}>
          • <Text style={{ color: C.textPrimary }}>Rolled Oats</Text> (Slow-digesting, great for breakfast){'\n'}
          • <Text style={{ color: C.textPrimary }}>Sweet Potatoes</Text> (Rich in vitamins and complex carbs){'\n'}
          • <Text style={{ color: C.textPrimary }}>Quinoa</Text> (Contains all 9 essential amino acids){'\n'}
          • <Text style={{ color: C.textPrimary }}>Brown Rice</Text> (Whole grain staple)
        </Text>

        <Text style={[s.sectionTitle, { color: '#22c55e', marginTop: rs(16) }]}>High Fiber</Text>
        <Text style={{ color: C.textSecondary, marginBottom: rs(16), lineHeight: rs(22) }}>
          • <Text style={{ color: C.textPrimary }}>Chia Seeds</Text> (Incredibly high fiber & healthy fats){'\n'}
          • <Text style={{ color: C.textPrimary }}>Black Beans</Text> (Fiber + plant protein){'\n'}
          • <Text style={{ color: C.textPrimary }}>Broccoli</Text> (Cruciferous vegetable, low calorie){'\n'}
          • <Text style={{ color: C.textPrimary }}>Berries</Text> (Antioxidants + fiber)
        </Text>

        <Text style={[s.sectionTitle, { color: C.fat, marginTop: rs(16) }]}>Healthy Fats</Text>
        <Text style={{ color: C.textSecondary, marginBottom: rs(16), lineHeight: rs(22) }}>
          • <Text style={{ color: C.textPrimary }}>Avocado</Text> (Monounsaturated fats){'\n'}
          • <Text style={{ color: C.textPrimary }}>Almonds / Walnuts</Text> (Nuts for snacking){'\n'}
          • <Text style={{ color: C.textPrimary }}>Extra Virgin Olive Oil</Text> (For cooking/dressing){'\n'}
          • <Text style={{ color: C.textPrimary }}>Peanut Butter</Text> (Natural, no added sugar)
        </Text>

        <Text style={[s.sectionTitle, { color: C.cal, marginTop: rs(16) }]}>Popular Whole Meals</Text>
        <Text style={{ color: C.textSecondary, marginBottom: rs(16), lineHeight: rs(22) }}>
          • <Text style={{ color: C.textPrimary, fontWeight: 'bold' }}>Chicken & Rice Bowl:</Text> Grilled chicken breast, brown rice, and roasted broccoli.{'\n\n'}
          • <Text style={{ color: C.textPrimary, fontWeight: 'bold' }}>Power Oatmeal:</Text> Rolled oats cooked with milk, mixed berries, and a scoop of protein powder.{'\n\n'}
          • <Text style={{ color: C.textPrimary, fontWeight: 'bold' }}>Salmon Dinner:</Text> Baked salmon, quinoa, and asparagus.
        </Text>
      </ScrollView>
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
  const [showCheatSheet, setShowCheatSheet] = useState(false);
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

      {showCheatSheet ? (
        <CheatSheetScreen onBack={() => setShowCheatSheet(false)} />
      ) : showRecipesScreen ? (
        <RecipesScreen 
          recipes={recipes} 
          handleLogRecipe={handleLogRecipe} 
          handleDeleteRecipe={handleDeleteRecipe} 
          onBack={() => setShowRecipesScreen(false)} 
        />
      ) : (
        <>
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>🥗 MacTrack</Text>
              <Text style={{ color: C.textSecondary, fontSize: fs(13) }}>{session.user?.email}</Text>
            </View>
          </View>

          {error ? (
            <View style={s.errorBanner}><Text style={{ color: '#fca5a5' }}>⚠️ {error}</Text></View>
          ) : null}

          <View style={{ flex: 1 }}>
            {activeTab === 'home' && (
              <HomeTab
                summary={summary} macros={macros} weeklyData={weeklyData} targetMacros={targetMacros}
                setViewDate={setViewDate} setActiveTab={setActiveTab}
              />
            )}
            {activeTab === 'chat' && (
              <ChatTab fetchData={fetchData} setActiveTab={setActiveTab} />
            )}
            {activeTab === 'fitness' && (
              <FitnessTab />
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
                onShowCheatSheet={() => setShowCheatSheet(true)}
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
  safe: { flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === 'android' ? rs(40) : 0 },
  loginContainer: { flex: 1, justifyContent: 'center', padding: rs(24), backgroundColor: C.bg },
  loginTitle: { fontSize: fs(26), fontWeight: 'bold', color: C.textPrimary, textAlign: 'center', marginBottom: rs(28) },
  msgBanner: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: rs(1), borderColor: C.accent, borderRadius: rs(8), padding: rs(12), marginBottom: rs(16) },
  msgText: { color: '#e0f2fe', textAlign: 'center' },
  input: { backgroundColor: 'rgba(15,23,42,0.6)', borderWidth: rs(1), borderColor: C.border, borderRadius: rs(8), padding: rs(14), color: C.textPrimary, fontSize: fs(16), marginBottom: rs(12) },
  btn: { backgroundColor: C.accent, padding: rs(16), borderRadius: rs(8), alignItems: 'center', marginBottom: rs(8) },
  btnText: { color: C.bg, fontWeight: 'bold', fontSize: fs(16) },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(16), paddingTop: rs(16), paddingBottom: rs(8) },
  headerTitle: { fontSize: fs(22), fontWeight: 'bold', color: C.textPrimary },
  signOutBtn: { backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: rs(8), paddingHorizontal: rs(12), borderRadius: rs(8) },
  errorBanner: { backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: rs(1), borderColor: C.error, borderRadius: rs(8), padding: rs(12), marginHorizontal: rs(16), marginBottom: rs(8) },
  sectionTitle: { fontSize: fs(17), fontWeight: '600', color: '#e2e8f0', marginBottom: rs(12) },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(10) },
  macroCard: { flex: 1, minWidth: '44%', backgroundColor: C.surface, padding: rs(16), borderRadius: rs(14), borderTopWidth: rs(3), borderTopColor: C.accent, alignItems: 'center' },
  macroLabel: { color: C.textSecondary, fontSize: fs(11), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: rs(6) },
  macroValue: { color: C.textPrimary, fontSize: fs(22), fontWeight: 'bold' },
  macroUnit: { color: C.textMuted, fontSize: fs(11), marginTop: rs(2) },
  logForm: { flexDirection: 'row', gap: rs(8), alignItems: 'center' },
  logBtn: { backgroundColor: C.accent, paddingHorizontal: rs(18), paddingVertical: rs(14), borderRadius: rs(8), justifyContent: 'center', alignItems: 'center' },
  logItem: { backgroundColor: 'rgba(30,41,59,0.5)', padding: rs(14), borderRadius: rs(12), marginBottom: rs(10), flexDirection: 'row', alignItems: 'center' },
  logName: { color: C.textPrimary, fontSize: fs(15), fontWeight: '500' },
  chip: { color: C.textSecondary, fontSize: fs(12), backgroundColor: 'rgba(15,23,42,0.5)', paddingHorizontal: rs(8), paddingVertical: rs(3), borderRadius: rs(4) },
  tabBar: { flexDirection: 'row', backgroundColor: 'rgba(15,23,42,0.95)', borderTopWidth: rs(1), borderTopColor: C.border, paddingBottom: Platform.OS === 'ios' ? rs(24) : rs(12), paddingTop: rs(12) },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIcon: { fontSize: fs(24), marginBottom: rs(4) },
  tabLabel: { fontSize: fs(12), color: C.textSecondary, fontWeight: '500' },
  activeDot: { width: rs(4), height: rs(4), borderRadius: rs(2), backgroundColor: C.accent, marginTop: rs(4) },
  optionBtn: { backgroundColor: C.surface, borderWidth: rs(1), borderColor: 'transparent', borderRadius: rs(8), alignItems: 'center' },
  optionBtnSelected: { borderColor: C.accent, backgroundColor: 'rgba(56,189,248,0.15)' },
  optionText: { color: C.textSecondary, fontSize: fs(14), fontWeight: '500' },
  optionTextSelected: { color: C.accent, fontWeight: 'bold' },
  avatarPlaceholder: { width: rs(80), height: rs(80), borderRadius: rs(40), backgroundColor: 'rgba(56,189,248,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: rs(12) },
  avatarText: { fontSize: fs(32) },
  cardContainer: { backgroundColor: C.surface, borderRadius: rs(14), padding: rs(16), marginBottom: rs(16) },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: rs(12), borderBottomWidth: rs(1), borderBottomColor: 'rgba(255,255,255,0.05)' },
  detailLabel: { color: C.textSecondary, fontSize: fs(15) },
  detailValue: { color: C.textPrimary, fontSize: fs(15), fontWeight: '500', textTransform: 'capitalize' },
  confirmationCard: { backgroundColor: C.surface, padding: rs(16), borderRadius: rs(14), borderWidth: rs(1), borderColor: C.border },
  editRow: { backgroundColor: 'rgba(15,23,42,0.4)', borderRadius: rs(8), paddingHorizontal: rs(12), paddingVertical: rs(8), marginBottom: rs(8), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editLabel: { color: C.textSecondary, fontSize: fs(12), textTransform: 'uppercase', fontWeight: 'bold' },
  editInput: { color: C.textPrimary, fontSize: fs(16), fontWeight: '600', textAlign: 'right', padding: rs(0), margin: rs(0), minWidth: rs(60) },
  mealTypePill: { paddingHorizontal: rs(12), paddingVertical: rs(6), borderRadius: rs(16), backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: rs(1), borderColor: 'transparent' },
  mealTypePillActive: { backgroundColor: 'rgba(56,189,248,0.1)', borderColor: C.accent },
  mealTypeText: { color: C.textSecondary, fontSize: fs(13), fontWeight: '500' },
  mealTypeTextActive: { color: C.accent, fontWeight: 'bold' }
});
