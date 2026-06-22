import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, rs, fs } from '../design-tokens';
import { s } from '../styles/appStyles';

export default function RecipesScreen({ recipes, handleLogRecipe, handleDeleteRecipe, onBack }: any) {
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
        ListEmptyComponent={<Text style={{ color: C.textMuted, textAlign: 'center', marginTop: rs(32), fontStyle: 'italic' }}>No saved recipes yet. Log a meal and tap 'Save' in the Logs tab to add one!</Text>}
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

