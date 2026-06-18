import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { calculationService } from '../calculation-service';
import { logWeight } from '../api';
import { C, rs, fs } from '../design-tokens';
import { s } from '../styles/appStyles';
import { supabase } from '../supabaseClient';

export default function ProfileTab({ session, rawProfile, targetMacros, onUpdateProfile, weightHistory, fetchData, isLoading, setIsLoading, onShowCheatSheet }: any) {
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

