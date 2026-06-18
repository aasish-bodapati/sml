import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, rs, fs } from '../design-tokens';
import { s } from '../styles/appStyles';

export default function CheatSheetScreen({ onBack }: any) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: rs(16), borderBottomWidth: rs(1), borderBottomColor: 'rgba(255,255,255,0.1)' }}>
        <TouchableOpacity onPress={onBack} style={{ padding: rs(8), marginRight: rs(8) }}>
          <Text style={{ color: C.accent, fontSize: fs(16), fontWeight: 'bold' }}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={{ color: C.textPrimary, fontSize: fs(18), fontWeight: 'bold' }}>Nutrition Cheat Sheet</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: rs(16), paddingBottom: rs(40) }}>
        <Text style={[s.sectionTitle, { color: C.protein, marginTop: rs(8) }]}>High Protein</Text>
        <Text style={{ color: C.textSecondary, marginBottom: rs(16), lineHeight: rs(22) }}>
          • <Text style={{ color: C.textPrimary }}>Chicken Breast</Text> (Lean, high protein){'\n'}
          • <Text style={{ color: C.textPrimary }}>Greek Yogurt</Text> (High protein, probiotics){'\n'}
          • <Text style={{ color: C.textPrimary }}>Salmon</Text> (Protein + Omega-3s){'\n'}
          • <Text style={{ color: C.textPrimary }}>Tofu</Text> (Plant-based protein){'\n'}
          • <Text style={{ color: C.textPrimary }}>Eggs</Text> (Complete protein source)
        </Text>

        <Text style={[s.sectionTitle, { color: C.carbs, marginTop: rs(16) }]}>Quality Carbohydrates</Text>
        <Text style={{ color: C.textSecondary, marginBottom: rs(16), lineHeight: rs(22) }}>
          • <Text style={{ color: C.textPrimary }}>Rolled Oats</Text> (Slow-digesting, great for breakfast){'\n'}
          • <Text style={{ color: C.textPrimary }}>Sweet Potatoes</Text> (Rich in vitamins and complex carbs){'\n'}
          • <Text style={{ color: C.textPrimary }}>Quinoa</Text> (Contains all 9 essential amino acids){'\n'}
          • <Text style={{ color: C.textPrimary }}>Brown Rice</Text> (Whole grain staple)
        </Text>

        <Text style={[s.sectionTitle, { color: '#22c55e', marginTop: rs(16) }]}>High Fiber</Text>
        <Text style={{ color: C.textSecondary, marginBottom: rs(16), lineHeight: rs(22) }}>
          • <Text style={{ color: C.textPrimary }}>Chia Seeds</Text> (Incredibly high fiber & healthy fats){'\n'}
          • <Text style={{ color: C.textPrimary }}>Black Beans</Text> (Fiber + plant protein){'\n'}
          • <Text style={{ color: C.textPrimary }}>Broccoli</Text> (Cruciferous vegetable, low calorie){'\n'}
          • <Text style={{ color: C.textPrimary }}>Berries</Text> (Antioxidants + fiber)
        </Text>

        <Text style={[s.sectionTitle, { color: C.fat, marginTop: rs(16) }]}>Healthy Fats</Text>
        <Text style={{ color: C.textSecondary, marginBottom: rs(16), lineHeight: rs(22) }}>
          • <Text style={{ color: C.textPrimary }}>Avocado</Text> (Monounsaturated fats){'\n'}
          • <Text style={{ color: C.textPrimary }}>Almonds / Walnuts</Text> (Nuts for snacking){'\n'}
          • <Text style={{ color: C.textPrimary }}>Extra Virgin Olive Oil</Text> (For cooking/dressing){'\n'}
          • <Text style={{ color: C.textPrimary }}>Peanut Butter</Text> (Natural, no added sugar)
        </Text>

        <Text style={[s.sectionTitle, { color: C.cal, marginTop: rs(16) }]}>Popular Whole Meals</Text>
        <Text style={{ color: C.textSecondary, marginBottom: rs(16), lineHeight: rs(22) }}>
          • <Text style={{ color: C.textPrimary, fontWeight: 'bold' }}>Chicken & Rice Bowl:</Text> Grilled chicken breast, brown rice, and roasted broccoli.{'\n\n'}
          • <Text style={{ color: C.textPrimary, fontWeight: 'bold' }}>Power Oatmeal:</Text> Rolled oats cooked with milk, mixed berries, and a scoop of protein powder.{'\n\n'}
          • <Text style={{ color: C.textPrimary, fontWeight: 'bold' }}>Salmon Dinner:</Text> Baked salmon, quinoa, and asparagus.
        </Text>
      </ScrollView>
    </View>
  );
}

