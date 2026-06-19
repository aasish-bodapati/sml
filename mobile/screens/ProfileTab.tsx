import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { calculationService } from '../calculation-service';
import { logWeight } from '../api';
import { C, rs, fs } from '../design-tokens';
import { s } from '../styles/appStyles';
import { supabase } from '../supabaseClient';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileTab({ session, rawProfile, targetMacros, onUpdateProfile, weightHistory, fetchData, isLoading, setIsLoading }: any) {
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
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: rs(24), marginTop: rs(12) }}>
        <View style={[s.avatarPlaceholder, { width: rs(64), height: rs(64), borderRadius: rs(32), marginBottom: rs(0), marginRight: rs(16) }]}>
          <Text style={[s.avatarText, { fontSize: fs(28) }]}>👤</Text>
        </View>
        <Text style={{ color: C.textPrimary, fontSize: fs(18), fontWeight: 'bold', flex: 1 }} numberOfLines={1} adjustsFontSizeToFit>{session?.user?.email}</Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(16) }}>
        <Text style={[s.sectionTitle, { marginBottom: rs(0) }]}>Daily Targets</Text>
        
        {!isEditing ? (
          <TouchableOpacity 
            onPress={() => setIsEditing(true)}
            style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', padding: rs(6), borderRadius: rs(8) }}
          >
            <Ionicons name="pencil" size={16} color={C.textSecondary} />
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(12) }}>
            <TouchableOpacity onPress={handleAutoCalculate}>
              <Ionicons name="calculator-outline" size={20} color={C.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCancel}>
              <Ionicons name="close" size={24} color={C.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave}>
              <Ionicons name="checkmark" size={24} color={C.accent} />
            </TouchableOpacity>
          </View>
        )}
      </View>
      <View style={[s.cardContainer, { paddingHorizontal: rs(24), marginBottom: rs(24) }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'center', width: rs(72) }}>
            <TextInput 
              editable={isEditing}
              style={[isEditing && s.input, { width: '100%', paddingVertical: rs(4), paddingHorizontal: rs(0), marginBottom: rs(0), textAlign: 'center', color: C.cal, fontSize: fs(18), fontWeight: 'bold', backgroundColor: isEditing ? C.surface : 'transparent', borderRadius: rs(8) }]} 
              value={isEditing ? targetCals : String(targetMacros?.calories || 0)} 
              onChangeText={setTargetCals} 
              keyboardType="numeric" 
            />
            <Text style={{ color: C.textSecondary, fontSize: fs(12), marginTop: rs(4) }}>kcal</Text>
          </View>
          <View style={{ alignItems: 'center', width: rs(60) }}>
            <TextInput 
              editable={isEditing}
              style={[isEditing && s.input, { width: '100%', paddingVertical: rs(4), paddingHorizontal: rs(0), marginBottom: rs(0), textAlign: 'center', color: C.protein, fontSize: fs(18), fontWeight: 'bold', backgroundColor: isEditing ? C.surface : 'transparent', borderRadius: rs(8) }]} 
              value={isEditing ? targetProtein : String(targetMacros?.protein || 0)} 
              onChangeText={setTargetProtein} 
              keyboardType="numeric" 
            />
            <Text style={{ color: C.textSecondary, fontSize: fs(12), marginTop: rs(4) }}>Protein</Text>
          </View>
          <View style={{ alignItems: 'center', width: rs(60) }}>
            <TextInput 
              editable={isEditing}
              style={[isEditing && s.input, { width: '100%', paddingVertical: rs(4), paddingHorizontal: rs(0), marginBottom: rs(0), textAlign: 'center', color: C.carbs, fontSize: fs(18), fontWeight: 'bold', backgroundColor: isEditing ? C.surface : 'transparent', borderRadius: rs(8) }]} 
              value={isEditing ? targetCarbs : String(targetMacros?.carbs || 0)} 
              onChangeText={setTargetCarbs} 
              keyboardType="numeric" 
            />
            <Text style={{ color: C.textSecondary, fontSize: fs(12), marginTop: rs(4) }}>Carbs</Text>
          </View>
          <View style={{ alignItems: 'center', width: rs(60) }}>
            <TextInput 
              editable={isEditing}
              style={[isEditing && s.input, { width: '100%', paddingVertical: rs(4), paddingHorizontal: rs(0), marginBottom: rs(0), textAlign: 'center', color: C.fat, fontSize: fs(18), fontWeight: 'bold', backgroundColor: isEditing ? C.surface : 'transparent', borderRadius: rs(8) }]} 
              value={isEditing ? targetFat : String(targetMacros?.fat || 0)} 
              onChangeText={setTargetFat} 
              keyboardType="numeric" 
            />
            <Text style={{ color: C.textSecondary, fontSize: fs(12), marginTop: rs(4) }}>Fat</Text>
          </View>
        </View>
      </View>

      <Text style={s.sectionTitle}>Personal Details</Text>
      <View style={s.cardContainer}>
        {/* Goal */}
        <View style={[s.detailRow, { minHeight: rs(48), alignItems: 'center' }]}>
          <Text style={s.detailLabel}>Goal</Text>
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
        <View style={[s.detailRow, { minHeight: rs(48), alignItems: 'center' }]}>
          <Text style={[s.detailLabel]}>Activity Level</Text>
          {isEditing ? (
            <View style={{ gap: rs(4), flex: 1, alignItems: 'flex-end', paddingVertical: rs(8) }}>
              <View style={{ flexDirection: 'row', gap: rs(4) }}>
                <OptionBtn label="Sedentary" selected={activity === 'sedentary'} onPress={() => setActivity('sedentary')} />
                <OptionBtn label="Light" selected={activity === 'light'} onPress={() => setActivity('light')} />
              </View>
              <View style={{ flexDirection: 'row', gap: rs(4) }}>
                <OptionBtn label="Moderate" selected={activity === 'moderate'} onPress={() => setActivity('moderate')} />
                <OptionBtn label="Active" selected={activity === 'active'} onPress={() => setActivity('active')} />
              </View>
            </View>
          ) : (
            <Text style={s.detailValue}>{activity}</Text>
          )}
        </View>
        {/* Gender */}
        <View style={[s.detailRow, { minHeight: rs(48), alignItems: 'center' }]}>
          <Text style={s.detailLabel}>Gender</Text>
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
        <View style={[s.detailRow, { minHeight: rs(48), alignItems: 'center' }]}>
          <Text style={s.detailLabel}>Age</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput 
              editable={isEditing}
              style={[isEditing && s.input, { marginBottom: rs(0), paddingVertical: rs(4), paddingHorizontal: rs(8), minWidth: rs(40), textAlign: 'right', color: C.textPrimary, fontSize: fs(16), backgroundColor: isEditing ? C.surface : 'transparent', borderRadius: rs(8) }]} 
              keyboardType="numeric" 
              value={isEditing ? age : String(rawProfile?.age || '')} 
              onChangeText={setAge} 
            />
            <Text style={{ color: C.textSecondary, fontSize: fs(16), marginLeft: rs(4) }}>years</Text>
          </View>
        </View>
        {/* Height */}
        <View style={[s.detailRow, { minHeight: rs(48), alignItems: 'center' }]}>
          <Text style={s.detailLabel}>Height</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput 
              editable={isEditing}
              style={[isEditing && s.input, { marginBottom: rs(0), paddingVertical: rs(4), paddingHorizontal: rs(8), minWidth: rs(40), textAlign: 'right', color: C.textPrimary, fontSize: fs(16), backgroundColor: isEditing ? C.surface : 'transparent', borderRadius: rs(8) }]} 
              keyboardType="numeric" 
              value={isEditing ? height : String(rawProfile?.height_cm || '')} 
              onChangeText={setHeight} 
            />
            <Text style={{ color: C.textSecondary, fontSize: fs(16), marginLeft: rs(4) }}>cm</Text>
          </View>
        </View>
        {/* Weight */}
        <View style={[s.detailRow, { minHeight: rs(48), alignItems: 'center', borderBottomWidth: rs(0) }]}>
          <Text style={s.detailLabel}>Weight</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput 
              editable={isEditing}
              style={[isEditing && s.input, { marginBottom: rs(0), paddingVertical: rs(4), paddingHorizontal: rs(8), minWidth: rs(40), textAlign: 'right', color: C.textPrimary, fontSize: fs(16), backgroundColor: isEditing ? C.surface : 'transparent', borderRadius: rs(8) }]} 
              keyboardType="numeric" 
              value={isEditing ? weight : String(rawProfile?.weight_kg || '')} 
              onChangeText={setWeight} 
            />
            <Text style={{ color: C.textSecondary, fontSize: fs(16), marginLeft: rs(4) }}>kg</Text>
          </View>
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

