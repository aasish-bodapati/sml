import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, NativeSyntheticEvent, NativeScrollEvent, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedProgressBar from '../components/AnimatedProgressBar';
import { C, rs, fs } from '../design-tokens';
import { s } from '../styles/appStyles';

export default function HomeTab({ summary, macros, weeklyData, targetMacros, workouts, setViewDate, setActiveTab, onLogWorkout, onLogMeal }: any) {
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const SCREEN_WIDTH = Dimensions.get('window').width;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    setActiveCardIndex(index);
  };

  // Calculate today's fitness
  const todayStr = new Date().toLocaleDateString('en-CA');
  const todaysWorkouts = (workouts || []).filter((w: any) => {
    if (!w.logged_at) return false;
    return w.logged_at.startsWith(todayStr);
  });
  
  const todayFitnessCals = todaysWorkouts.reduce((sum: number, w: any) => sum + (w.calories_burned || 0), 0);
  const todayFitnessMins = todaysWorkouts.reduce((sum: number, w: any) => sum + (w.duration_minutes || 0), 0);

  return (
    <View style={{ flex: 1, paddingVertical: rs(16) }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: rs(16) }}>
        <Text style={s.sectionTitle}>Summary</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: rs(12) }}>
          <View style={{ width: rs(6), height: rs(6), borderRadius: rs(3), backgroundColor: activeCardIndex === 0 ? C.accent : C.textMuted, marginRight: rs(4) }} />
          <View style={{ width: rs(6), height: rs(6), borderRadius: rs(3), backgroundColor: activeCardIndex === 1 ? C.accent : C.textMuted }} />
        </View>
      </View>

      <View style={{ height: rs(240) }}>
        <ScrollView 
          horizontal 
          pagingEnabled 
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={{ width: SCREEN_WIDTH }}
          contentContainerStyle={{ alignItems: 'center' }}
        >
          {/* Macros Card */}
          <View style={{ width: SCREEN_WIDTH }}>
            <View style={{ backgroundColor: C.surface, padding: rs(16), borderRadius: rs(14), marginHorizontal: rs(16), height: rs(250) }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(12) }}>
                <Text style={{ color: C.textPrimary, fontSize: fs(18), fontWeight: 'bold' }}>Nutrition Today</Text>
                <TouchableOpacity onPress={onLogMeal} style={{ backgroundColor: 'rgba(56,189,248,0.1)', paddingHorizontal: rs(12), paddingVertical: rs(6), borderRadius: rs(12) }}>
                  <Text style={{ color: C.accent, fontSize: fs(12), fontWeight: 'bold' }}>+ Log Meal</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1, justifyContent: 'space-between' }}>
                {macros.map((m: any, idx: number) => {
                  const target = m.target || 1;
                  const current = m.value || 0;
                  const progress = Math.min(Math.max(current / target, 0), 1);

                  return (
                    <View key={m.label} style={{ marginBottom: idx === macros.length - 1 ? 0 : 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: rs(6) }}>
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
            </View>
          </View>

          {/* Fitness Card */}
          <View style={{ width: SCREEN_WIDTH }}>
            <View style={{ backgroundColor: C.surface, padding: rs(16), borderRadius: rs(14), marginHorizontal: rs(16), height: rs(250) }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(16) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="barbell" size={24} color={C.accent} style={{ marginRight: rs(8) }} />
                  <Text style={{ color: C.textPrimary, fontSize: fs(18), fontWeight: 'bold' }}>Fitness Today</Text>
                </View>
                <TouchableOpacity onPress={onLogWorkout} style={{ backgroundColor: 'rgba(56,189,248,0.1)', paddingHorizontal: rs(12), paddingVertical: rs(6), borderRadius: rs(12) }}>
                  <Text style={{ color: C.accent, fontSize: fs(12), fontWeight: 'bold' }}>+ Log Workout</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', flex: 1 }}>
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="flame" size={32} color={C.cal} style={{ marginBottom: rs(8) }} />
                  <Text style={{ color: C.textPrimary, fontSize: fs(24), fontWeight: 'bold' }}>{todayFitnessCals}</Text>
                  <Text style={{ color: C.textSecondary, fontSize: fs(12) }}>kcal burned</Text>
                </View>

                <View style={{ width: 1, height: '80%', backgroundColor: C.border }} />

                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="time" size={32} color={C.accent} style={{ marginBottom: rs(8) }} />
                  <Text style={{ color: C.textPrimary, fontSize: fs(24), fontWeight: 'bold' }}>{todayFitnessMins}</Text>
                  <Text style={{ color: C.textSecondary, fontSize: fs(12) }}>active mins</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      <Text style={[s.sectionTitle, { marginTop: rs(28), paddingHorizontal: rs(16) }]}>Weekly Progress</Text>
      <View style={{ backgroundColor: C.surface, padding: rs(16), borderRadius: rs(14), marginHorizontal: rs(16), flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', flex: 1, minHeight: rs(140) }}>
        {weeklyData.map((day: any) => {
          const maxCal = Math.max(...weeklyData.map((d: any) => d.calories || 1), targetMacros?.calories || 2000);
          const heightPct = Math.min((day.calories / maxCal) * 100, 100);
          const isToday = new Date().toLocaleDateString('en-CA') === day.date;
          const dayName = new Date(day.date).toLocaleDateString(undefined, { weekday: 'narrow' });
          return (
            <TouchableOpacity 
              key={day.date} 
              style={{ alignItems: 'center', flex: 1, height: '100%' }}
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

    </View>
  );
}
