import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  TextInput, 
  Image, 
  ScrollView, 
  ActivityIndicator, 
  Alert, 
  StyleSheet 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { C, rs, fs, screenHeight } from '../design-tokens';
import { scanWardrobe, addWardrobeItem } from '../api';

interface ScannedItem {
  name: string;
  category: string;
  color: string;
  brand: string | null;
  tags: string[];
}

interface ScanSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = ['shirt', 'pants', 'shorts', 'dress', 'skirt', 'shoes', 'jacket', 'outerwear', 'bag', 'accessory', 'other'];

export default function WardrobeScanSheet({ visible, onClose, onSuccess }: ScanSheetProps) {
  const [step, setStep] = useState<'initial' | 'scanning' | 'confirm'>('initial');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return cameraPermission.granted && libraryPermission.granted;
  };

  const handleCapture = async (useCamera: boolean) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'LyfSync needs camera and library permissions to scan clothing.');
      return;
    }

    try {
      let result;
      if (useCamera) {
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          quality: 0.8,
        });
      }

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const originalUri = result.assets[0].uri;
      setImageUri(originalUri);
      setStep('scanning');

      // Compress and resize image before upload
      const manipulated = await ImageManipulator.manipulateAsync(
        originalUri,
        [{ resize: { width: 800 } }],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Call API vision scan
      const response = await scanWardrobe(manipulated.uri);
      
      setPhotoUrl(response.photo_url);
      setItems(response.items || []);
      setStep('confirm');
    } catch (e: any) {
      Alert.alert('Scan Failed', e.message || 'Could not analyze outfit. Please try again.');
      setStep('initial');
    }
  };

  const handleUpdateItem = (index: number, field: keyof ScannedItem, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    if (items.length === 0) {
      Alert.alert('No Items', 'Please add or confirm at least one item.');
      return;
    }

    setIsSaving(true);
    try {
      // Save items sequentially
      for (const item of items) {
        await addWardrobeItem({
          name: item.name,
          category: item.category,
          color: item.color,
          brand: item.brand,
          photo_url: photoUrl,
          tags: item.tags,
          notes: 'Scanned via selfie scan'
        });
      }
      
      Alert.alert('Success', `Saved ${items.length} items to your wardrobe!`);
      // Reset state and call onSuccess
      setStep('initial');
      setImageUri(null);
      setPhotoUrl(null);
      setItems([]);
      onSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save items to wardrobe.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'initial':
        return (
          <View style={styles.initialContainer}>
            <Ionicons name="shirt-outline" size={64} color={C.accent} style={{ marginBottom: rs(16) }} />
            <Text style={styles.title}>Scan Outfit Selfie</Text>
            <Text style={styles.subtitle}>
              Take a full-body mirror selfie or select a photo. AI will identify and catalog all clothing items instantly.
            </Text>

            <TouchableOpacity style={styles.primaryBtn} onPress={() => handleCapture(true)}>
              <Ionicons name="camera" size={20} color={C.bg} style={{ marginRight: rs(8) }} />
              <Text style={styles.primaryBtnText}>Take Mirror Selfie</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={() => handleCapture(false)}>
              <Ionicons name="images-outline" size={20} color={C.accent} style={{ marginRight: rs(8) }} />
              <Text style={styles.secondaryBtnText}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        );

      case 'scanning':
        return (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={C.accent} />
            <Text style={styles.loaderTitle}>Analyzing Outfit...</Text>
            <Text style={styles.loaderSubtitle}>
              GPT-4o-mini is extracting clothing details (name, category, colors, brand) from your selfie.
            </Text>
          </View>
        );

      case 'confirm':
        return (
          <View style={styles.confirmContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.title}>Confirm Clothes ({items.length})</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
                <Ionicons name="close" size={24} color={C.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {imageUri && (
                <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
              )}

              <Text style={styles.sectionHeader}>Detected Clothes</Text>

              {items.map((item, index) => (
                <View key={index} style={styles.itemEditCard}>
                  <View style={styles.itemCardHeader}>
                    <Text style={styles.itemNumber}>Item #{index + 1}</Text>
                    <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                      <Ionicons name="trash-outline" size={18} color={C.error} />
                    </TouchableOpacity>
                  </View>

                  {/* Name Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput 
                      style={styles.textInput} 
                      value={item.name} 
                      onChangeText={(val) => handleUpdateItem(index, 'name', val)} 
                      placeholder="e.g. Blue Oxford Shirt"
                      placeholderTextColor={C.textMuted}
                    />
                  </View>

                  {/* Category Selection */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.pillsContainer}>
                      {CATEGORIES.map(cat => {
                        const isSelected = item.category === cat;
                        return (
                          <TouchableOpacity 
                            key={cat} 
                            style={[styles.pill, isSelected && styles.activePill]} 
                            onPress={() => handleUpdateItem(index, 'category', cat)}
                          >
                            <Text style={[styles.pillText, isSelected && styles.activePillText]}>
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.grid}>
                    {/* Color Input */}
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Color</Text>
                      <TextInput 
                        style={styles.textInput} 
                        value={item.color} 
                        onChangeText={(val) => handleUpdateItem(index, 'color', val)} 
                        placeholder="e.g. Navy"
                        placeholderTextColor={C.textMuted}
                      />
                    </View>

                    {/* Brand Input */}
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Brand (Optional)</Text>
                      <TextInput 
                        style={styles.textInput} 
                        value={item.brand || ''} 
                        onChangeText={(val) => handleUpdateItem(index, 'brand', val)} 
                        placeholder="e.g. Nike"
                        placeholderTextColor={C.textMuted}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.saveBtn} 
                onPress={handleSaveAll}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={C.bg} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={C.bg} style={{ marginRight: rs(6) }} />
                    <Text style={styles.saveBtnText}>Save Scanned Items</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.modalBg}>
        {renderContent()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: rs(40),
  },
  initialContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: rs(24),
  },
  title: {
    fontSize: fs(22),
    fontWeight: 'bold',
    color: C.textPrimary,
    marginBottom: rs(8),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fs(14),
    color: C.textSecondary,
    textAlign: 'center',
    marginBottom: rs(32),
    lineHeight: rs(20),
  },
  primaryBtn: {
    backgroundColor: C.accent,
    width: '100%',
    padding: rs(16),
    borderRadius: rs(8),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rs(12),
  },
  primaryBtnText: {
    color: C.bg,
    fontWeight: 'bold',
    fontSize: fs(16),
  },
  secondaryBtn: {
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderWidth: 1,
    borderColor: C.border,
    width: '100%',
    padding: rs(16),
    borderRadius: rs(8),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rs(24),
  },
  secondaryBtnText: {
    color: C.accent,
    fontWeight: 'bold',
    fontSize: fs(16),
  },
  closeBtn: {
    padding: rs(12),
  },
  closeBtnText: {
    color: C.textSecondary,
    fontSize: fs(14),
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: rs(24),
  },
  loaderTitle: {
    fontSize: fs(18),
    fontWeight: 'bold',
    color: C.textPrimary,
    marginTop: rs(16),
    marginBottom: rs(8),
  },
  loaderSubtitle: {
    fontSize: fs(13),
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: rs(18),
    paddingHorizontal: rs(20),
  },
  confirmContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rs(16),
    paddingBottom: rs(12),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  closeIcon: {
    padding: rs(4),
  },
  scrollContent: {
    padding: rs(16),
  },
  previewImage: {
    width: '100%',
    height: screenHeight * 0.25,
    borderRadius: rs(12),
    backgroundColor: 'rgba(15,23,42,0.4)',
    marginBottom: rs(16),
  },
  sectionHeader: {
    color: C.textSecondary,
    fontSize: fs(12),
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: rs(12),
  },
  itemEditCard: {
    backgroundColor: C.surface,
    borderRadius: rs(12),
    borderWidth: 1,
    borderColor: C.border,
    padding: rs(12),
    marginBottom: rs(16),
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rs(12),
    paddingBottom: rs(6),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  itemNumber: {
    color: C.accent,
    fontWeight: 'bold',
    fontSize: fs(14),
  },
  inputGroup: {
    marginBottom: rs(12),
  },
  label: {
    color: C.textSecondary,
    fontSize: fs(11),
    fontWeight: '600',
    marginBottom: rs(6),
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: rs(6),
    padding: rs(10),
    color: C.textPrimary,
    fontSize: fs(14),
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(6),
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: rs(8),
    paddingVertical: rs(4),
    borderRadius: rs(12),
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activePill: {
    backgroundColor: 'rgba(56,189,248,0.15)',
    borderColor: C.accent,
  },
  pillText: {
    color: C.textSecondary,
    fontSize: fs(11),
    textTransform: 'capitalize',
  },
  activePillText: {
    color: C.accent,
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    gap: rs(8),
  },
  modalFooter: {
    padding: rs(16),
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.bg,
  },
  saveBtn: {
    backgroundColor: C.accent,
    padding: rs(16),
    borderRadius: rs(8),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: C.bg,
    fontWeight: 'bold',
    fontSize: fs(16),
  },
});
