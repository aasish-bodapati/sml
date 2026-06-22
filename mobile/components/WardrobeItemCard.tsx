import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, rs, fs } from '../design-tokens';

interface WardrobeItem {
  id: number;
  name: string;
  category: string;
  color: string;
  brand: string | null;
  notes: string | null;
  photo_url: string | null;
  times_worn: number;
  last_worn: string | null;
}

interface CardProps {
  item: WardrobeItem;
  onWear: (id: number) => void;
  onDelete: (id: number) => void;
  isActionLoading: boolean;
}

export default function WardrobeItemCard({ item, onWear, onDelete, isActionLoading }: CardProps) {
  // Helper to format category labels nicely
  const formatCategory = (cat: string) => {
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  // Helper to get color values for rendering color indicator
  const getColorValue = (colorName: string): string => {
    const name = colorName.toLowerCase().trim();
    const map: Record<string, string> = {
      white: '#ffffff',
      black: '#1e293b',
      navy: '#1e3a8a',
      blue: '#3b82f6',
      red: '#ef4444',
      green: '#10b981',
      grey: '#6b7280',
      gray: '#6b7280',
      yellow: '#f59e0b',
      orange: '#f97316',
      pink: '#ec4899',
      purple: '#8b5cf6',
      brown: '#78350f',
      beige: '#f5f5dc',
    };
    return map[name] || '#64748b'; // Fallback to muted slate
  };

  return (
    <View style={styles.card}>
      {/* Photo Thumbnail */}
      <View style={styles.thumbnailContainer}>
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={styles.thumbnail} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderThumbnail}>
            <Ionicons name="shirt-outline" size={32} color={C.textMuted} />
          </View>
        )}
      </View>

      {/* Info Details */}
      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        
        <View style={styles.row}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{formatCategory(item.category)}</Text>
          </View>
          {item.brand ? (
            <Text style={styles.brand} numberOfLines={1}>{item.brand}</Text>
          ) : null}
        </View>

        <View style={[styles.row, { marginTop: rs(6) }]}>
          {/* Color Indicator */}
          <View style={styles.colorRow}>
            <View style={[styles.colorDot, { backgroundColor: getColorValue(item.color) }]} />
            <Text style={styles.colorName}>{item.color}</Text>
          </View>
          
          <Text style={styles.wornCount}>
            Worn {item.times_worn} {item.times_worn === 1 ? 'time' : 'times'}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity 
          onPress={() => onWear(item.id)} 
          style={styles.wearBtn}
          disabled={isActionLoading}
        >
          <Ionicons name="shirt" size={18} color={C.bg} />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => onDelete(item.id)} 
          style={styles.deleteBtn}
          disabled={isActionLoading}
        >
          <Ionicons name="trash-outline" size={18} color={C.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: rs(12),
    overflow: 'hidden',
    marginBottom: rs(12),
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: rs(80),
    height: rs(80),
    backgroundColor: 'rgba(15,23,42,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: C.border,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    flex: 1,
    paddingHorizontal: rs(12),
    paddingVertical: rs(10),
    justifyContent: 'center',
  },
  name: {
    fontSize: fs(15),
    fontWeight: 'bold',
    color: C.textPrimary,
    marginBottom: rs(4),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  categoryBadge: {
    backgroundColor: 'rgba(56,189,248,0.1)',
    paddingHorizontal: rs(6),
    paddingVertical: rs(2),
    borderRadius: rs(6),
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.2)',
  },
  categoryText: {
    color: C.accent,
    fontSize: fs(11),
    fontWeight: 'bold',
  },
  brand: {
    color: C.textSecondary,
    fontSize: fs(12),
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
  },
  colorDot: {
    width: rs(10),
    height: rs(10),
    borderRadius: rs(5),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  colorName: {
    color: C.textSecondary,
    fontSize: fs(12),
    textTransform: 'capitalize',
  },
  wornCount: {
    color: C.textMuted,
    fontSize: fs(11),
    marginLeft: 'auto',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: rs(12),
    gap: rs(8),
  },
  wearBtn: {
    backgroundColor: C.accent,
    width: rs(32),
    height: rs(32),
    borderRadius: rs(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    width: rs(32),
    height: rs(32),
    borderRadius: rs(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
});
