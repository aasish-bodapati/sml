import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native'; // force rebuild
import { Ionicons } from '@expo/vector-icons';
import { C, rs } from '../design-tokens';
import { s } from '../styles/appStyles';

export default function BottomTabBar({ active, onSelect }: { active: string, onSelect: (t: string) => void }) {
  const tabs = [
    { key: 'home', label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid' },
    { key: 'fitness', label: 'Fitness', icon: 'fitness-outline', iconActive: 'fitness' },
    { key: 'history', label: 'Nutrition', icon: 'bar-chart-outline', iconActive: 'bar-chart' },
    { key: 'profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
  ];
  return (
    <View style={s.tabBar}>
      {tabs.map(t => {
        const isActive = active === t.key;
        return (
          <TouchableOpacity key={t.key} onPress={() => onSelect(t.key)} style={s.tabItem}>
            <Ionicons
              name={(isActive ? t.iconActive : t.icon) as any}
              size={24}
              color={isActive ? C.accent : C.textMuted}
            />
            <Text style={[s.tabLabel, isActive && { color: C.accent }]}>{t.label}</Text>
            {isActive && <View style={s.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
