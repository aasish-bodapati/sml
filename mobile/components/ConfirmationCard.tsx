import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { C, rs, fs } from '../design-tokens';
import { s } from '../styles/appStyles';
import { saveRecipe } from '../api';

export default function ConfirmationCard({ parsedData, onConfirm, onCancel, isLoading }: any) {
  const [editedMeals, setEditedMeals] = useState<any[]>(
    parsedData.items.map((item: any) => ({ ...item, meal_type: item.meal_type || 'snack' }))
  );
  const [isSaving, setIsSaving] = useState(false);

  const totalCalories = editedMeals.reduce((sum, meal) => sum + (parseInt(meal.calories) || 0), 0);
  const totalProtein = editedMeals.reduce((sum, meal) => sum + (parseInt(meal.protein) || 0), 0);
  const totalCarbs = editedMeals.reduce((sum, meal) => sum + (parseInt(meal.carbohydrates) || 0), 0);
  const totalFat = editedMeals.reduce((sum, meal) => sum + (parseInt(meal.fat) || 0), 0);

  const handleSave = () => {
    const defaultName = editedMeals.length === 1 ? editedMeals[0].name : `${editedMeals[0].name} + ${editedMeals.length - 1} more`;
    Alert.prompt(
      'Save as Recipe',
      'Give this meal a name to quickly log it later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (name?: string) => {
            if (!name?.trim()) return;
            setIsSaving(true);
            try {
              await saveRecipe({
                name: name.trim(),
                calories: totalCalories,
                protein: totalProtein,
                carbohydrates: totalCarbs,
                fat: totalFat,
              });
              Alert.alert('Saved!', `"${name.trim()}" added to your recipes.`);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to save recipe.');
            } finally {
              setIsSaving(false);
            }
          }
        }
      ],
      'plain-text',
      defaultName
    );
  };

  return (
    <View style={s.confirmationCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(12) }}>
        <Text style={{ color: C.textPrimary, fontSize: fs(16), fontWeight: 'bold' }}>Confirm Meal Details</Text>
        {editedMeals[0]?.meal_type && (
          <View style={{ backgroundColor: 'rgba(56,189,248,0.15)', paddingHorizontal: rs(10), paddingVertical: rs(4), borderRadius: rs(12), borderWidth: rs(1), borderColor: 'rgba(56,189,248,0.3)' }}>
            <Text style={{ color: C.accent, fontSize: fs(12), fontWeight: 'bold', textTransform: 'capitalize' }}>
              {editedMeals[0].meal_type}
            </Text>
          </View>
        )}
      </View>

      {parsedData.thinking && (
        <Text selectable={true} style={{ color: C.textSecondary, fontSize: fs(13), fontStyle: 'italic', marginBottom: rs(16), padding: rs(12), backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: rs(8) }}>
          💡 <Text style={{fontWeight: 'bold', color: C.accent}}>Reasoning:</Text> {parsedData.thinking}
        </Text>
      )}

      {editedMeals.length > 1 && (
        <View style={{ backgroundColor: 'rgba(15,23,42,0.4)', padding: rs(12), borderRadius: rs(12), marginBottom: rs(16), flexDirection: 'row', justifyContent: 'space-around', borderWidth: rs(1), borderColor: 'rgba(255,255,255,0.05)' }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: C.textSecondary, fontSize: fs(10), textTransform: 'uppercase', fontWeight: 'bold', marginBottom: rs(2) }}>Total Kcal</Text>
            <Text style={{ color: C.cal, fontSize: fs(16), fontWeight: 'bold' }}>{totalCalories}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: C.textSecondary, fontSize: fs(10), textTransform: 'uppercase', fontWeight: 'bold', marginBottom: rs(2) }}>Protein</Text>
            <Text style={{ color: C.protein, fontSize: fs(16), fontWeight: 'bold' }}>{totalProtein}g</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: C.textSecondary, fontSize: fs(10), textTransform: 'uppercase', fontWeight: 'bold', marginBottom: rs(2) }}>Carbs</Text>
            <Text style={{ color: C.carbs, fontSize: fs(16), fontWeight: 'bold' }}>{totalCarbs}g</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: C.textSecondary, fontSize: fs(10), textTransform: 'uppercase', fontWeight: 'bold', marginBottom: rs(2) }}>Fat</Text>
            <Text style={{ color: C.fat, fontSize: fs(16), fontWeight: 'bold' }}>{totalFat}g</Text>
          </View>
        </View>
      )}
      
      {editedMeals.map((meal, index) => (
        <View key={index} style={{ marginBottom: rs(24), paddingBottom: rs(16), borderBottomWidth: index < editedMeals.length - 1 ? 1 : 0, borderBottomColor: C.surface }}>
          {!meal.is_food && (
            <Text style={{ color: C.error, fontSize: fs(13), marginBottom: rs(8) }}>⚠️ This item was not recognized as food.</Text>
          )}
          <View style={s.editRow}>
            <Text style={s.editLabel}>Name</Text>
            <TextInput 
              style={[s.editInput, { flex: 1, minHeight: rs(36) }]} 
              value={meal.name} 
              onChangeText={t => { const newMeals = [...editedMeals]; newMeals[index].name = t; setEditedMeals(newMeals); }} 
            />
          </View>
          
          <View style={{ flexDirection: 'row', gap: rs(8) }}>
            <View style={[s.editRow, { flex: 1 }]}>
              <Text style={s.editLabel}>Kcal</Text>
              <TextInput style={s.editInput} keyboardType="numeric" value={meal.calories.toString()} onChangeText={t => { const newMeals = [...editedMeals]; newMeals[index].calories = parseInt(t) || 0; setEditedMeals(newMeals); }} />
            </View>
            <View style={[s.editRow, { flex: 1 }]}>
              <Text style={s.editLabel}>Protein</Text>
              <TextInput style={s.editInput} keyboardType="numeric" value={meal.protein.toString()} onChangeText={t => { const newMeals = [...editedMeals]; newMeals[index].protein = parseInt(t) || 0; setEditedMeals(newMeals); }} />
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', gap: rs(8) }}>
            <View style={[s.editRow, { flex: 1 }]}>
              <Text style={s.editLabel}>Carbs</Text>
              <TextInput style={s.editInput} keyboardType="numeric" value={meal.carbohydrates.toString()} onChangeText={t => { const newMeals = [...editedMeals]; newMeals[index].carbohydrates = parseInt(t) || 0; setEditedMeals(newMeals); }} />
            </View>
            <View style={[s.editRow, { flex: 1 }]}>
              <Text style={s.editLabel}>Fat</Text>
              <TextInput style={s.editInput} keyboardType="numeric" value={meal.fat.toString()} onChangeText={t => { const newMeals = [...editedMeals]; newMeals[index].fat = parseInt(t) || 0; setEditedMeals(newMeals); }} />
            </View>
          </View>
        </View>
      ))}

      <View style={{ flexDirection: 'row', gap: rs(8), marginTop: rs(8) }}>
        <TouchableOpacity
          style={{ flex: 1, flexBasis: 0, height: rs(40), borderRadius: rs(8), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: rs(1), borderColor: C.border }}
          onPress={onCancel}
        >
          <Text numberOfLines={1} style={{ color: C.textPrimary, fontWeight: 'bold', fontSize: fs(13) }}>✕ Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, flexBasis: 0, height: rs(40), borderRadius: rs(8), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(251,191,36,0.12)', borderWidth: rs(1), borderColor: 'rgba(251,191,36,0.4)' }}
          onPress={handleSave}
          disabled={isLoading || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fbbf24" size="small" />
          ) : (
            <Text numberOfLines={1} style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: fs(13) }}>Save</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, flexBasis: 0, height: rs(40), borderRadius: rs(8), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.accent }}
          onPress={() => onConfirm(editedMeals, parsedData.thinking)}
          disabled={isLoading || editedMeals.length === 0}
        >
          {isLoading ? (
            <ActivityIndicator color={C.bg} size="small" />
          ) : (
            <Text numberOfLines={1} style={{ color: C.bg, fontWeight: 'bold', fontSize: fs(13) }}>✓ Log</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
