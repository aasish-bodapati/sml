import React from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import AnimatedProgressBar from '../components/AnimatedProgressBar';
import { C, rs, fs } from '../design-tokens';
import { s } from '../styles/appStyles';

export default function HomeTab({ summary, macros, weeklyData, targetMacros, setViewDate, setActiveTab }: any) {
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
