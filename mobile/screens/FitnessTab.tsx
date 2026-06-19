import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getWorkouts, getRoutines, deleteRoutine, deleteWorkout } from '../api';
import { C, rs, fs } from '../design-tokens';
import { fitnessStyles } from '../styles/fitnessStyles';
import LogWorkoutScreen from './LogWorkoutScreen';
import RoutineChatScreen from './RoutineChatScreen';

export const safeParseArray = (val: any) => {
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

export default function FitnessTab() {
  const [activeSubTab, setActiveSubTab] = useState<'routines' | 'history'>('routines');
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [activeRoutine, setActiveRoutine] = useState<any | null>(null);
  const [showRoutineChat, setShowRoutineChat] = useState(false);
  const [viewingRoutine, setViewingRoutine] = useState<any | null>(null);
  const [editingHistorySession, setEditingHistorySession] = useState<any | null>(null);
  const [routines, setRoutines] = useState<any[]>([]);
  const [loadingRoutines, setLoadingRoutines] = useState(false);

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

  const loadRoutines = async () => {
    setLoadingRoutines(true);
    try {
      const userRoutines = await getRoutines();
      setRoutines(userRoutines || []);
    } catch (err) {
      console.log('Failed to load routines', err);
    } finally {
      setLoadingRoutines(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'history') {
      loadHistory();
    } else {
      loadRoutines();
    }
  }, [activeSubTab]);

  const handleStartRoutine = (routine: any) => {
    setActiveRoutine(routine);
  };

  // If a routine is active, we render the LogWorkoutScreen full screen over this tab
  if (activeRoutine) {
    return (
      <Modal visible={true} animationType="slide">
        <LogWorkoutScreen 
          initialRoutine={activeRoutine} 
          workoutHistory={history}
          onBack={() => setActiveRoutine(null)} 
          onSuccess={() => {
            setActiveRoutine(null);
            setActiveSubTab('history');
          }} 
        />
      </Modal>
    );
  }

  if (showRoutineChat) {
    return (
      <Modal visible={true} animationType="slide">
        <RoutineChatScreen 
          onBack={() => setShowRoutineChat(false)}
          onSuccess={() => {
            setShowRoutineChat(false);
            loadRoutines();
          }}
        />
      </Modal>
    );
  }

  if (editingHistorySession) {
    return (
      <Modal visible={true} animationType="slide">
        <LogWorkoutScreen 
          initialSession={editingHistorySession} 
          workoutHistory={history}
          onBack={() => setEditingHistorySession(null)} 
          onSuccess={() => {
            setEditingHistorySession(null);
            loadHistory();
          }} 
        />
      </Modal>
    );
  }

  if (viewingRoutine) {
    return (
      <Modal visible={true} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.surface, borderTopLeftRadius: rs(24), borderTopRightRadius: rs(24), maxHeight: '85%', padding: rs(20) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(16) }}>
              <Text style={{ color: C.textPrimary, fontSize: fs(20), fontWeight: 'bold' }}>{viewingRoutine.name}</Text>
              <TouchableOpacity onPress={() => setViewingRoutine(null)} style={{ padding: rs(4) }}>
                <Ionicons name="close" size={24} color={C.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={fitnessStyles.routineExerciseList}>
                  {viewingRoutine.days?.map((day: any) => (
                    <View key={day.id} style={{ marginBottom: rs(16), backgroundColor: C.bg, borderRadius: rs(8), padding: rs(12), borderWidth: 1, borderColor: C.border }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(8) }}>
                        <Text style={{ color: C.textPrimary, fontWeight: 'bold', fontSize: fs(14) }}>
                          Day {day.day_number}{day.title ? `: ${day.title}` : ''}
                        </Text>
                        <TouchableOpacity 
                          style={{ backgroundColor: C.accent, paddingHorizontal: rs(12), paddingVertical: rs(6), borderRadius: rs(16), flexDirection: 'row', alignItems: 'center' }}
                          onPress={() => {
                            setViewingRoutine(null);
                            handleStartRoutine({ ...viewingRoutine, exercises: day.exercises, name: `${viewingRoutine.name} - Day ${day.day_number}` });
                          }}
                        >
                          <Ionicons name="play" size={12} color={C.bg} style={{ marginRight: rs(4) }} />
                          <Text style={{ color: C.bg, fontWeight: 'bold', fontSize: fs(12) }}>Start</Text>
                        </TouchableOpacity>
                      </View>
                      
                      {day.focus ? <Text style={{ color: C.textSecondary, fontSize: fs(12), marginBottom: rs(8) }}>Focus: {day.focus}</Text> : null}
                      
                      {day.exercises.map((ex: any) => (
                        <View key={ex.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: rs(4) }}>
                          <Ionicons name="ellipse" size={4} color={C.accent} style={{ marginRight: rs(8) }} />
                          <Text style={{ color: C.textPrimary, flex: 1, fontSize: fs(12) }} numberOfLines={1}>
                            {ex.name || ex.exercise_id}
                          </Text>
                          <Text style={{ color: C.textSecondary, fontSize: fs(11) }}>
                            {ex.sets} × {ex.reps} {ex.weight_kg ? `@ ${ex.weight_kg}kg` : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  const handleDeleteRoutine = (id: number) => {
    Alert.alert('Delete Routine', 'Are you sure you want to delete this routine?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteRoutine(id);
          loadRoutines();
        } catch (err) {
          Alert.alert('Error', 'Failed to delete routine');
        }
      }}
    ]);
  };

  const handleDeleteHistorySession = (id: number) => {
    Alert.alert('Delete Workout', 'Are you sure you want to delete this workout session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteWorkout(id);
          loadHistory();
        } catch (err) {
          Alert.alert('Error', 'Failed to delete workout');
        }
      }}
    ]);
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(16) }}>
            <Text style={{ color: C.textSecondary, fontSize: fs(14), flex: 1, marginRight: rs(16) }}>
              Create your own reusable workout routines here.
            </Text>
            <TouchableOpacity onPress={() => setShowRoutineChat(true)} style={{ backgroundColor: C.accent, paddingHorizontal: rs(16), paddingVertical: rs(10), borderRadius: rs(8) }}>
              <Text style={{ color: C.bg, fontWeight: 'bold', fontSize: fs(14) }}>+ Create Routine</Text>
            </TouchableOpacity>
          </View>
          
          {loadingRoutines ? (
            <ActivityIndicator color={C.accent} style={{ marginTop: rs(40) }} />
          ) : routines.length > 0 ? (
            routines.map((routine) => (
              <View key={routine.id} style={fitnessStyles.routineCard}>
                <View style={[fitnessStyles.routineHeader, { flexDirection: 'row', justifyContent: 'space-between' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={fitnessStyles.routineTitle}>{routine.name}</Text>
                    {routine.description ? <Text style={fitnessStyles.routineDesc} numberOfLines={2}>{routine.description}</Text> : null}
                    <Text style={{ color: C.textMuted, fontSize: fs(12), marginTop: rs(4) }}>
                      {routine.days?.length || 0} Days • {(routine.days?.reduce((acc: number, d: any) => acc + d.exercises.length, 0)) || 0} Exercises
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteRoutine(routine.id)} style={{ padding: rs(8) }}>
                    <Ionicons name="trash-outline" size={20} color={C.error} />
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity 
                  style={{ marginTop: rs(12), backgroundColor: 'rgba(56,189,248,0.1)', paddingVertical: rs(10), borderRadius: rs(8), alignItems: 'center' }}
                  onPress={() => setViewingRoutine(routine)}
                >
                  <Text style={{ color: C.accent, fontWeight: 'bold' }}>View & Start Routine</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={{ alignItems: 'center', marginTop: rs(40) }}>
              <Text style={fitnessStyles.emptyText}>No custom routines available yet.</Text>
            </View>
          )}
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
                <View style={{ alignItems: 'flex-end' }}>
                  {item.calories_burned !== null && (
                    <View style={[fitnessStyles.historyCaloriesBadge, { marginBottom: rs(8) }]}>
                      <Text style={fitnessStyles.historyCaloriesText}>🔥 {item.calories_burned} kcal</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', gap: rs(12) }}>
                    <TouchableOpacity onPress={() => setEditingHistorySession(item)}>
                      <Ionicons name="pencil-outline" size={18} color={C.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteHistorySession(item.id)}>
                      <Ionicons name="trash-outline" size={18} color={C.error} />
                    </TouchableOpacity>
                  </View>
                </View>
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
    </View>
  );
}
