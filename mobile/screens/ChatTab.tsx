import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import ConfirmationCard from '../components/ConfirmationCard';
import RecipeMentionDropdown from '../components/RecipeMentionDropdown';
import { parseMeal, confirmLogMeal, transcribeAudio, logRecipe } from '../api';
import { C, rs, fs } from '../design-tokens';
import { s } from '../styles/appStyles';


export default function ChatTab({ fetchData, onClose, recipes = [] }: any) {
  const [messages, setMessages] = useState<{ role: string; content: string; parsedData?: any; recipe?: any; extraText?: string }[]>([
    { role: 'assistant', content: 'What did you eat today? Type @ to reference a saved recipe.' },
  ]);
  const [input, setInput] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mealType, setMealType] = useState(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return 'breakfast';
    if (h >= 11 && h < 16) return 'lunch';
    if (h >= 16 && h < 18) return 'snack';
    if (h >= 18 && h < 22) return 'dinner';
    return 'snack';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleInputChange = (text: string) => {
    setInput(text);
    const atIdx = text.lastIndexOf('@');
    if (atIdx !== -1) {
      const afterAt = text.slice(atIdx + 1);
      if (!afterAt.includes(' ')) { setMentionQuery(afterAt); return; }
    }
    setMentionQuery(null);
  };

  const handleRecipeSelect = (recipe: any) => {
    setSelectedRecipe(recipe);
    const atIdx = input.lastIndexOf('@');
    setInput(atIdx !== -1 ? input.slice(0, atIdx) : '');
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const startRecording = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (perm.granted) {
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
        setIsRecording(true);
      } else {
        Alert.alert('Permission Denied', 'Please grant microphone permissions.');
      }
    } catch { setError('Failed to start recording.'); }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    setIsTranscribing(true); setIsRecording(false);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) {
        const result = await transcribeAudio(uri);
        if (result.text) setInput(prev => prev ? prev + ' ' + result.text : result.text);
      }
    } catch { setError('Failed to transcribe audio.'); }
    finally { setIsTranscribing(false); }
  };

  const handleSend = async () => {
    const extraText = input.trim();
    const canSend = selectedRecipe || extraText;
    if (!canSend) return;

    setMentionQuery(null);

    // ── Fast path: recipe only, no extra text ──
    if (selectedRecipe && !extraText) {
      const recipe = selectedRecipe;
      setMessages(prev => [...prev, { role: 'user', content: recipe.name, recipe }]);
      setSelectedRecipe(null);
      setIsLoading(true); setError(null);
      try {
        await logRecipe(recipe.id);
        setMessages([{ role: 'assistant', content: `✅ ${recipe.name} logged! What else did you eat?` }]);
        await fetchData();
        onClose?.();
      } catch (e: any) { setError(e.message || 'Failed to log recipe.'); }
      finally { setIsLoading(false); }
      return;
    }

    // ── LLM path: recipe + extra text OR plain text ──
    const content = selectedRecipe ? `${selectedRecipe.name} — ${extraText}` : extraText;
    const userMsg = { role: 'user', content, recipe: selectedRecipe || undefined, extraText: selectedRecipe ? extraText : undefined };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput(''); setSelectedRecipe(null);
    setIsLoading(true); setIsParsing(true); setError(null);

    try {
      const payload = newMessages.map(m => ({ role: m.role, content: m.content }));
      payload[payload.length - 1].content = `[Meal Type: ${mealType}] ${payload[payload.length - 1].content}`;
      const result = await parseMeal(payload);
      setMessages([...newMessages, { role: 'assistant', content: '', parsedData: result }]);
    } catch (e: any) {
      setError(e.message || 'Failed to parse meal.');
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false); setIsParsing(false);
    }
  };

  const handleConfirm = async (editedMeals: any[], thinking: string) => {
    setIsLoading(true); setError(null);
    try {
      for (const meal of editedMeals) {
        if (meal.is_food !== false) await confirmLogMeal({ ...meal, reasoning: thinking });
      }
      setMessages([{ role: 'assistant', content: 'Meal logged successfully! What else did you eat?' }]);
      await fetchData(); onClose?.();
    } catch (e: any) { setError(e.message || 'Failed to log meal.'); }
    finally { setIsLoading(false); }
  };

  const canSend = !!(selectedRecipe || input.trim());
  const showMic = !input.trim();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={0}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: rs(16), borderBottomWidth: rs(1), borderBottomColor: 'rgba(255,255,255,0.1)' }}>
        <TouchableOpacity onPress={onClose} style={{ padding: rs(8), marginRight: rs(8) }}>
          <Text style={{ color: C.accent, fontSize: fs(16), fontWeight: 'bold' }}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={{ color: C.textPrimary, fontSize: fs(18), fontWeight: 'bold' }}>Log Meal</Text>
      </View>

      {/* Messages */}
      <FlatList
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={{ padding: rs(16), paddingBottom: rs(24) }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View style={{ alignItems: item.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: rs(16) }}>
            {!item.parsedData && item.content !== '' && (
              <View style={{ backgroundColor: item.role === 'user' ? C.accent : C.surface, padding: rs(12), borderRadius: rs(16), maxWidth: '85%', borderBottomRightRadius: item.role === 'user' ? 4 : 16, borderBottomLeftRadius: item.role === 'assistant' ? 4 : 16, gap: rs(4) }}>
                {item.recipe && (
                  <Text style={{ color: item.role === 'user' ? 'rgba(255,255,255,0.75)' : C.textSecondary, fontSize: fs(12), fontWeight: '600' }}>
                    Recipe: {item.recipe.name}
                  </Text>
                )}
                <Text selectable style={{ color: item.role === 'user' ? C.bg : C.textPrimary, fontSize: fs(15) }}>
                  {item.extraText || (!item.recipe ? item.content : '')}
                </Text>
              </View>
            )}
            {item.parsedData && (
              <View style={{ width: '100%', marginTop: rs(8) }}>
                <ConfirmationCard parsedData={item.parsedData} onConfirm={handleConfirm}
                  onCancel={() => setMessages([...messages, { role: 'user', content: 'Cancel that.' }, { role: 'assistant', content: 'Cancelled. What else did you eat?' }])}
                  isLoading={isLoading} />
              </View>
            )}
          </View>
        )}
        ListFooterComponent={isParsing ? (
          <View style={{ alignItems: 'flex-start', marginBottom: rs(16), marginLeft: rs(4) }}>
            <View style={{ backgroundColor: C.surface, padding: rs(12), borderRadius: rs(16), borderBottomLeftRadius: 4, flexDirection: 'row', alignItems: 'center', gap: rs(8) }}>
              <ActivityIndicator size="small" color={C.textSecondary} />
              <Text style={{ color: C.textSecondary, fontSize: fs(14) }}>Analyzing meal...</Text>
            </View>
          </View>
        ) : null}
      />

      {error && <Text style={{ color: C.error, textAlign: 'center', marginBottom: rs(8), paddingHorizontal: rs(16) }}>{error}</Text>}

      {/* Input area */}
      <View style={{ backgroundColor: C.bg, borderTopWidth: rs(1), borderTopColor: C.border }}>
        {/* Meal type pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: rs(16), paddingTop: rs(12), paddingBottom: rs(4), gap: rs(8) }}>
          {['breakfast', 'lunch', 'dinner', 'snack'].map(type => (
            <TouchableOpacity key={type} onPress={() => setMealType(type)}
              style={[s.mealTypePill, mealType === type && s.mealTypePillActive, { paddingVertical: rs(6), paddingHorizontal: rs(14) }]}>
              <Text style={[s.mealTypeText, mealType === type && s.mealTypeTextActive, { fontSize: fs(13) }]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Text input row */}
        <View style={{ flexDirection: 'row', padding: rs(16), paddingTop: rs(8) }}>
          <View style={{ flex: 1, position: 'relative' }}>
            {mentionQuery !== null && (
              <RecipeMentionDropdown recipes={recipes} query={mentionQuery} onSelect={handleRecipeSelect} />
            )}
            {/* Unified input box: badge chip (if selected) + TextInput inline */}
            <View style={[
              s.input,
              { flexDirection: 'row', alignItems: 'center', marginBottom: 0,
                borderRadius: rs(24), paddingHorizontal: rs(12), paddingVertical: 0,
                minHeight: rs(48) }
            ]}>
              {selectedRecipe && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: rs(5),
                  backgroundColor: 'rgba(56,189,248,0.18)', borderWidth: rs(1),
                  borderColor: 'rgba(56,189,248,0.4)', borderRadius: rs(16),
                  paddingVertical: rs(4), paddingLeft: rs(8), paddingRight: rs(6),
                  marginRight: rs(6), flexShrink: 0,
                }}>
                  <Ionicons name="restaurant-outline" size={fs(12)} color={C.accent} />
                  <Text style={{ color: C.accent, fontSize: fs(13), fontWeight: '600', maxWidth: rs(120) }} numberOfLines={1}>
                    {selectedRecipe.name}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedRecipe(null)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
                    <Ionicons name="close-circle" size={rs(15)} color={C.accent} />
                  </TouchableOpacity>
                </View>
              )}
              <TextInput
                ref={inputRef}
                style={{ flex: 1, color: C.textPrimary, fontSize: fs(15), paddingVertical: rs(12), paddingHorizontal: rs(4) }}
                placeholder={isRecording ? 'Recording...' : selectedRecipe ? 'any changes?' : 'e.g. "2 boiled eggs" or type @'}
                placeholderTextColor={isRecording ? C.error : C.textSecondary}
                value={input}
                onChangeText={handleInputChange}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                editable={!isRecording && !isTranscribing}
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(8), marginLeft: rs(8) }}>
            {showMic && (
              <TouchableOpacity
                style={{ backgroundColor: isRecording ? 'rgba(244,63,94,0.2)' : C.surface, width: rs(48), height: rs(48), borderRadius: rs(24), justifyContent: 'center', alignItems: 'center', borderWidth: isRecording ? 1 : 0, borderColor: C.error }}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={isLoading || isTranscribing}>
                {isTranscribing ? <ActivityIndicator color={C.textPrimary} /> : <Ionicons name={isRecording ? 'stop' : 'mic'} size={20} color={isRecording ? C.error : C.textPrimary} />}
              </TouchableOpacity>
            )}
            {canSend && (
              <TouchableOpacity
                style={{ backgroundColor: C.accent, width: rs(48), height: rs(48), borderRadius: rs(24), justifyContent: 'center', alignItems: 'center' }}
                onPress={handleSend} disabled={isLoading || isTranscribing}>
                {isLoading ? <ActivityIndicator color={C.bg} /> : <Ionicons name="send" size={20} color={C.bg} style={{ marginLeft: rs(4) }} />}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
