import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getWorkouts } from '../api';
import { ROUTINES } from '../constants/routines';
import { C, rs, fs } from '../design-tokens';
import { fitnessStyles } from '../styles/fitnessStyles';
import LogWorkoutScreen from './LogWorkoutScreen';

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

  const handleStartRoutine = (routine: any) => {
    setActiveRoutine(routine);
  };

  // If a routine is active, we render the LogWorkoutScreen full screen over this tab
  if (activeRoutine) {
    return (
      <Modal visible={true} animationType="slide">
        <LogWorkoutScreen 
          initialRoutine={activeRoutine} 
          onBack={() => setActiveRoutine(null)} 
          onSuccess={() => {
            setActiveRoutine(null);
            setActiveSubTab('history');
          }} 
        />
      </Modal>
    );
  }

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
    </View>
  );
}
