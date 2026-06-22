import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, rs, fs } from '../design-tokens';

interface Recipe {
  id: number;
  name: string;
  calories: number;
  protein: number;
}

interface Props {
  recipes: Recipe[];
  query: string;
  onSelect: (recipe: Recipe) => void;
}

export default function RecipeMentionDropdown({ recipes, query, onSelect }: Props) {
  const filtered = recipes.filter(r =>
    r.name.toLowerCase().includes(query.toLowerCase())
  );

  if (filtered.length === 0) return null;

  return (
    <View style={{
      position: 'absolute',
      bottom: '100%',
      left: rs(16),
      right: rs(16),
      backgroundColor: '#1e293b',
      borderRadius: rs(12),
      borderWidth: rs(1),
      borderColor: 'rgba(255,255,255,0.12)',
      maxHeight: rs(200),
      marginBottom: rs(4),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.3,
      shadowRadius: rs(8),
      elevation: 10,
      overflow: 'hidden',
    }}>
      <View style={{
        paddingHorizontal: rs(12),
        paddingVertical: rs(8),
        borderBottomWidth: rs(1),
        borderBottomColor: 'rgba(255,255,255,0.06)',
      }}>
        <Text style={{ color: C.textMuted, fontSize: fs(11), fontWeight: '600', letterSpacing: 0.5 }}>
          SAVED RECIPES
        </Text>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        keyboardShouldPersistTaps="always"
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onSelect(item)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: rs(14),
              paddingVertical: rs(11),
              borderBottomWidth: rs(1),
              borderBottomColor: 'rgba(255,255,255,0.04)',
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(8), flex: 1 }}>
              <View style={{
                width: rs(28),
                height: rs(28),
                borderRadius: rs(8),
                backgroundColor: 'rgba(56,189,248,0.15)',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Ionicons name="restaurant-outline" size={fs(14)} color={C.accent} />
              </View>
              <Text style={{ color: C.textPrimary, fontSize: fs(14), fontWeight: '500', flex: 1 }} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
            <Text style={{ color: C.textMuted, fontSize: fs(12), marginLeft: rs(8) }}>
              {item.calories} kcal
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
