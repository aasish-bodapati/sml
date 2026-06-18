import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { calculationService } from './calculation-service';
import { C, rs, fs } from './design-tokens';

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface UserProfilePayload {
  goal: string;
  gender: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  activity: string;
}

interface OnboardingProps {
  onComplete: (targets: MacroTargets, profile: UserProfilePayload) => void;
}


export default function OnboardingScreen({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);

  // Form State
  const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain' | null>(null);
  const [gender, setGender] = useState<'M' | 'F' | null>(null);
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activity, setActivity] = useState<'sedentary' | 'light' | 'moderate' | 'active' | null>(null);

  // Targets
  const [targets, setTargets] = useState<MacroTargets | null>(null);

  const calculateMacros = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age, 10);

    const finalTargets = calculationService.calculateDailyTargets(w, h, a, gender!, goal!, activity!);

    setTargets(finalTargets);
    setStep(4);
  };

  const OptionBtn = ({ label, selected, onPress }: any) => (
    <TouchableOpacity
      style={[s.optionBtn, selected && s.optionBtnSelected]}
      onPress={onPress}
    >
      <Text style={[s.optionText, selected && s.optionTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView contentContainerStyle={s.container}>
          <Text style={s.title}>Set Your Goals 🎯</Text>
          <Text style={s.subtitle}>Step {step} of 4</Text>

          {/* STEP 1: GOAL */}
          {step === 1 && (
            <View style={s.stepContent}>
              <Text style={s.question}>What is your primary goal?</Text>
              <OptionBtn label="Lose Weight" selected={goal === 'lose'} onPress={() => setGoal('lose')} />
              <OptionBtn label="Maintain Weight" selected={goal === 'maintain'} onPress={() => setGoal('maintain')} />
              <OptionBtn label="Build Muscle" selected={goal === 'gain'} onPress={() => setGoal('gain')} />
              <TouchableOpacity style={[s.nextBtn, !goal && s.disabledBtn]} disabled={!goal} onPress={() => setStep(2)}>
                <Text style={s.nextBtnText}>Next</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: DEMOGRAPHICS */}
          {step === 2 && (
            <View style={s.stepContent}>
              <Text style={s.question}>Tell us about yourself</Text>
              
              <View style={{ flexDirection: 'row', gap: rs(10), marginBottom: rs(16) }}>
                <View style={{ flex: 1 }}>
                  <OptionBtn label="Male" selected={gender === 'M'} onPress={() => setGender('M')} />
                </View>
                <View style={{ flex: 1 }}>
                  <OptionBtn label="Female" selected={gender === 'F'} onPress={() => setGender('F')} />
                </View>
              </View>

              <TextInput style={s.input} placeholder="Age (years)" placeholderTextColor={C.textSecondary} keyboardType="numeric" value={age} onChangeText={setAge} />
              <TextInput style={s.input} placeholder="Height (cm)" placeholderTextColor={C.textSecondary} keyboardType="numeric" value={height} onChangeText={setHeight} />
              <TextInput style={s.input} placeholder="Weight (kg)" placeholderTextColor={C.textSecondary} keyboardType="numeric" value={weight} onChangeText={setWeight} />

              <View style={{ flexDirection: 'row', gap: rs(10) }}>
                <TouchableOpacity style={[s.nextBtn, { flex: 1, backgroundColor: C.surface }]} onPress={() => setStep(1)}>
                  <Text style={s.nextBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[s.nextBtn, { flex: 1 }, (!gender || !age || !height || !weight) && s.disabledBtn]} 
                  disabled={!gender || !age || !height || !weight} 
                  onPress={() => setStep(3)}
                >
                  <Text style={s.nextBtnText}>Next</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 3: ACTIVITY */}
          {step === 3 && (
            <View style={s.stepContent}>
              <Text style={s.question}>How active are you?</Text>
              <OptionBtn label="Sedentary (Desk job, little exercise)" selected={activity === 'sedentary'} onPress={() => setActivity('sedentary')} />
              <OptionBtn label="Light (1-3 days/week)" selected={activity === 'light'} onPress={() => setActivity('light')} />
              <OptionBtn label="Moderate (3-5 days/week)" selected={activity === 'moderate'} onPress={() => setActivity('moderate')} />
              <OptionBtn label="Active (6-7 days/week)" selected={activity === 'active'} onPress={() => setActivity('active')} />

              <View style={{ flexDirection: 'row', gap: rs(10) }}>
                <TouchableOpacity style={[s.nextBtn, { flex: 1, backgroundColor: C.surface }]} onPress={() => setStep(2)}>
                  <Text style={s.nextBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.nextBtn, { flex: 1 }, !activity && s.disabledBtn]} disabled={!activity} onPress={calculateMacros}>
                  <Text style={s.nextBtnText}>Calculate</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 4: RESULTS */}
          {step === 4 && targets && (
            <View style={s.stepContent}>
              <Text style={s.question}>Your Daily Targets</Text>
              
              <View style={s.resultsGrid}>
                <View style={s.resultCard}><Text style={[s.resLabel, { color: C.cal }]}>Calories</Text><Text style={s.resVal}>{targets.calories}</Text></View>
                <View style={s.resultCard}><Text style={[s.resLabel, { color: C.protein }]}>Protein (g)</Text><Text style={s.resVal}>{targets.protein}</Text></View>
                <View style={s.resultCard}><Text style={[s.resLabel, { color: C.carbs }]}>Carbs (g)</Text><Text style={s.resVal}>{targets.carbs}</Text></View>
                <View style={s.resultCard}><Text style={[s.resLabel, { color: C.fat }]}>Fat (g)</Text><Text style={s.resVal}>{targets.fat}</Text></View>
              </View>

              <TouchableOpacity style={[s.nextBtn, { marginTop: rs(20) }]} onPress={() => onComplete(targets, {
                goal: goal!,
                gender: gender!,
                age: parseInt(age, 10),
                height_cm: parseFloat(height),
                weight_kg: parseFloat(weight),
                activity: activity!
              })}>
                <Text style={s.nextBtnText}>Let's Go!</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: rs(24), justifyContent: 'center' },
  title: { fontSize: fs(28), fontWeight: 'bold', color: C.textPrimary, textAlign: 'center', marginBottom: rs(8) },
  subtitle: { fontSize: fs(14), color: C.textSecondary, textAlign: 'center', marginBottom: rs(32) },
  stepContent: { width: '100%' },
  question: { fontSize: fs(18), fontWeight: '600', color: C.textPrimary, marginBottom: rs(20), textAlign: 'center' },
  optionBtn: { backgroundColor: C.surface, borderWidth: rs(1), borderColor: 'transparent', padding: rs(16), borderRadius: rs(12), marginBottom: rs(12), alignItems: 'center' },
  optionBtnSelected: { borderColor: C.accent, backgroundColor: 'rgba(56,189,248,0.1)' },
  optionText: { color: C.textSecondary, fontSize: fs(16), fontWeight: '500' },
  optionTextSelected: { color: C.accent, fontWeight: 'bold' },
  nextBtn: { backgroundColor: C.accent, padding: rs(16), borderRadius: rs(12), alignItems: 'center', marginTop: rs(12) },
  disabledBtn: { opacity: 0.5 },
  nextBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: fs(16) },
  input: { backgroundColor: C.surface, borderRadius: rs(12), padding: rs(16), color: C.textPrimary, fontSize: fs(16), marginBottom: rs(12) },
  resultsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(12) },
  resultCard: { width: '48%', backgroundColor: C.surface, padding: rs(16), borderRadius: rs(12), alignItems: 'center' },
  resLabel: { fontSize: fs(13), fontWeight: 'bold', marginBottom: rs(8) },
  resVal: { fontSize: fs(24), color: C.textPrimary, fontWeight: 'bold' }
});
