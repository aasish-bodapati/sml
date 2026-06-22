import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl, 
  StyleSheet, 
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, rs, fs } from '../design-tokens';
import { getWardrobe, wearWardrobeItem, deleteWardrobeItem } from '../api';
import WardrobeItemCard from '../components/WardrobeItemCard';
import WardrobeScanSheet from './WardrobeScanSheet';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'shirt', label: 'Shirts' },
  { key: 'pants', label: 'Pants' },
  { key: 'shorts', label: 'Shorts' },
  { key: 'dress', label: 'Dresses' },
  { key: 'skirt', label: 'Skirts' },
  { key: 'shoes', label: 'Shoes' },
  { key: 'jacket', label: 'Jackets' },
  { key: 'outerwear', label: 'Outerwear' },
  { key: 'bag', label: 'Bags' },
  { key: 'accessory', label: 'Accessories' },
  { key: 'other', label: 'Other' },
];

export default function WardrobeTab() {
  const [items, setItems] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [selectedCategory]);

  const fetchItems = async () => {
    try {
      const data = await getWardrobe(selectedCategory);
      setItems(data);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to fetch wardrobe.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchItems();
  };

  const handleWear = async (id: number) => {
    setIsActionLoading(true);
    try {
      const updatedItem = await wearWardrobeItem(id);
      // Update local state without full refetch
      setItems(items.map(item => item.id === id ? updatedItem : item));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to log wear event.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to remove this item from your wardrobe? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setIsActionLoading(true);
            const prevItems = [...items];
            setItems(items.filter(item => item.id !== id));
            try {
              await deleteWardrobeItem(id);
            } catch (e: any) {
              setItems(prevItems);
              Alert.alert('Error', e.message || 'Failed to delete item.');
            } finally {
              setIsActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderEmptyState = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="shirt-outline" size={64} color={C.textMuted} style={{ marginBottom: rs(16) }} />
        <Text style={styles.emptyTitle}>Your Wardrobe is Empty</Text>
        <Text style={styles.emptySubtitle}>
          Start cataloging your clothes by taking a full-size mirror selfie of your outfit!
        </Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowScanModal(true)}>
          <Ionicons name="camera" size={18} color={C.bg} style={{ marginRight: rs(6) }} />
          <Text style={styles.emptyBtnText}>Scan Selfie Now</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Category Selection Row */}
      <View style={styles.categoryBar}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item.key;
            return (
              <TouchableOpacity
                style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                onPress={() => {
                  setIsLoading(true);
                  setSelectedCategory(item.key);
                }}
              >
                <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Main Content Area */}
      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <WardrobeItemCard 
              item={item} 
              onWear={handleWear} 
              onDelete={handleDelete}
              isActionLoading={isActionLoading}
            />
          )}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={handleRefresh}
              tintColor={C.accent}
              colors={[C.accent]}
            />
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowScanModal(true)}>
        <Ionicons name="camera" size={24} color={C.bg} />
      </TouchableOpacity>

      {/* Camera Scan Sheet Modal */}
      <WardrobeScanSheet 
        visible={showScanModal} 
        onClose={() => setShowScanModal(false)}
        onSuccess={fetchItems}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  categoryBar: {
    paddingVertical: rs(10),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  categoryList: {
    paddingHorizontal: rs(16),
    gap: rs(8),
  },
  categoryPill: {
    paddingHorizontal: rs(16),
    paddingVertical: rs(8),
    borderRadius: rs(20),
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryPillActive: {
    backgroundColor: 'rgba(56,189,248,0.15)',
    borderColor: C.accent,
  },
  categoryText: {
    color: C.textSecondary,
    fontSize: fs(13),
    fontWeight: '500',
  },
  categoryTextActive: {
    color: C.accent,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: rs(16),
    paddingBottom: rs(100), // Padding to avoid overlap with FAB
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: rs(80),
    paddingHorizontal: rs(24),
  },
  emptyTitle: {
    fontSize: fs(18),
    fontWeight: 'bold',
    color: C.textPrimary,
    marginBottom: rs(8),
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: fs(14),
    color: C.textSecondary,
    textAlign: 'center',
    marginBottom: rs(24),
    lineHeight: rs(20),
  },
  emptyBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: rs(20),
    paddingVertical: rs(12),
    borderRadius: rs(8),
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyBtnText: {
    color: C.bg,
    fontWeight: 'bold',
    fontSize: fs(14),
  },
  fab: {
    position: 'absolute',
    bottom: rs(24),
    right: rs(24),
    backgroundColor: C.accent,
    width: rs(56),
    height: rs(56),
    borderRadius: rs(28),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
