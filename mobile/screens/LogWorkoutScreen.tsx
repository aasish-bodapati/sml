import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchExercises, logWorkout, updateWorkout } from '../api';
import { C, rs, fs } from '../design-tokens';
import { fitnessStyles } from '../styles/fitnessStyles';
import { s } from '../styles/appStyles';


// Re-use the helper locally to avoid require cycle
const safeParseArray = (val: any) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
};

export default function LogWorkoutScreen({ initialRoutine, initialSession, onBack, onSuccess }: { initialRoutine?: any, initialSession?: any, onBack: () => void, onSuccess: () => void }) {
  // Default name handling
  const [workoutName, setWorkoutName] = useState('Workout Session');
  const [selectedExercises, setSelectedExercises] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Modal Detail state
  const [selectedDetailExercise, setSelectedDetailExercise] = useState<any | null>(null);

  useEffect(() => {
    if (initialRoutine) {
      setSelectedExercises(
        initialRoutine.exercises.map((ex: any) => ({
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
      setWorkoutName(initialRoutine.name.replace(/ ⚡| 🌀| 🦵/, '')); // clean up emojis for database
    } else if (initialSession) {
      setSelectedExercises(
        initialSession.sets.map((ex: any) => ({
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
      setWorkoutName(initialSession.name || 'Workout Session');
    }
  }, [initialRoutine, initialSession]);

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
    setSearchQuery('');
    setSearchResults([]);
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
      const setsPayload = selectedExercises.map(ex => ({
        exercise_id: ex.exercise_id,
        sets: ex.sets ? parseInt(ex.sets, 10) : undefined,
        reps: ex.reps ? parseInt(ex.reps, 10) : undefined,
        weight_kg: ex.weight_kg ? parseFloat(ex.weight_kg) : undefined,
        duration_seconds: ex.duration_seconds ? parseInt(ex.duration_seconds, 10) : undefined,
      }));

      const payload = {
        name: workoutName,
        sets: setsPayload,
      };

      let res;
      if (initialSession && initialSession.id) {
        res = await updateWorkout(initialSession.id, payload);
        Alert.alert(
          'Workout Updated! ✅',
          `Estimated calorie burn: ${res.calories_burned} kcal.`,
          [{ text: 'Awesome' }]
        );
      } else {
        res = await logWorkout(payload);
        Alert.alert(
          'Workout Logged! 🔥',
          `Estimated calorie burn: ${res.calories_burned} kcal.\nGreat job! Keep it up.`,
          [{ text: 'Awesome' }]
        );
      }
      
      onSuccess();
    } catch (err: any) {
      Alert.alert('Error Saving', err.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: rs(16), borderBottomWidth: rs(1), borderBottomColor: 'rgba(255,255,255,0.1)' }}>
        <TouchableOpacity onPress={onBack} style={{ padding: rs(8), marginRight: rs(8) }}>
          <Ionicons name="arrow-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={{ flex: 1, color: C.textPrimary, fontSize: fs(18), fontWeight: 'bold' }}>Log Workout</Text>
      </View>

      <ScrollView contentContainerStyle={fitnessStyles.scrollContent} keyboardShouldPersistTaps="handled">
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
                      value={String(ex.sets || '')}
                      onChangeText={(v) => handleUpdateExerciseField(index, 'sets', v)}
                    />
                  </View>
                  <View style={fitnessStyles.exerciseInputCol}>
                    <Text style={fitnessStyles.exerciseInputLabel}>Reps</Text>
                    <TextInput 
                      style={fitnessStyles.exerciseInput}
                      keyboardType="number-pad"
                      value={String(ex.reps || '')}
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
                      value={String(ex.weight_kg || '')}
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
                      value={String(ex.duration_seconds || '')}
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
