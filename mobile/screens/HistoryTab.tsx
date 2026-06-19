import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { C, rs, fs } from '../design-tokens';
import { s } from '../styles/appStyles';

export default function HistoryTab({ logs, viewDate, setViewDate, handleDeleteLog, handleSaveRecipe, setShowRecipesScreen, setActiveTab }: any) {
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

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(8) }}>
            <Text style={[s.sectionTitle, { marginBottom: rs(0) }]}>Meal History</Text>
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
