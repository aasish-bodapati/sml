import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync } from 'expo-audio';
import ConfirmationCard from '../components/ConfirmationCard';
import { parseMeal, confirmLogMeal, transcribeAudio } from '../api';
import { C, rs, fs } from '../design-tokens';
import { s } from '../styles/appStyles';

export default function ChatTab({ fetchData, setActiveTab }: any) {
  const [messages, setMessages] = useState<{role: string, content: string, parsedData?: any}[]>([
    { role: 'assistant', content: 'What did you eat today?' }
  ]);
  const [input, setInput] = useState('');
  const [mealType, setMealType] = useState(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 16) return 'lunch';
    if (hour >= 16 && hour < 18) return 'snack';
    if (hour >= 18 && hour < 22) return 'dinner';
    return 'snack';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (permission.granted) {
        await recorder.prepareToRecordAsync();
        recorder.record();
        setIsRecording(true);
      } else {
        Alert.alert('Permission Denied', 'Please grant microphone permissions to use voice transcription.');
      }
    } catch (err) {
      console.error('Failed to start recording', err);
      setError('Failed to start recording.');
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    setIsTranscribing(true);
    setIsRecording(false);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) {
        const result = await transcribeAudio(uri);
        if (result.text) {
          setInput(input ? input + ' ' + result.text : result.text);
        }
      }
    } catch (err) {
      console.error('Failed to transcribe', err);
      setError('Failed to transcribe audio.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(null);
    
    try {
      const payload = newMessages.map(m => ({ role: m.role, content: m.content }));
      if (payload.length > 0) {
        payload[payload.length - 1].content = `[Meal Type: ${mealType}] ${payload[payload.length - 1].content}`;
      }
      const result = await parseMeal(payload);
      
      const assistantMsg = { 
        role: 'assistant', 
        content: '',
        parsedData: result
      };
      setMessages([...newMessages, assistantMsg]);
    } catch (e: any) { 
      setError(e.message || 'Failed to parse meal.'); 
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error. Could you try again?' }]);
    }
    finally { setIsLoading(false); }
  };

  const handleConfirm = async (editedMeals: any[], thinking: string) => {
    setIsLoading(true); setError(null);
    try {
      for (const meal of editedMeals) {
        if (meal.is_food !== false) {
          await confirmLogMeal({ ...meal, reasoning: thinking });
        }
      }
      setMessages([{ role: 'assistant', content: 'Meal logged successfully! What else did you eat?' }]);
      await fetchData();
      setActiveTab('home');
    } catch (e: any) { setError(e.message || 'Failed to log meal.'); }
    finally { setIsLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 140 : 0}>
      <FlatList
        data={messages}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={{ padding: rs(16), paddingBottom: rs(24) }}
        renderItem={({ item }) => (
          <View style={{ alignItems: item.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: rs(16) }}>
            {(!item.parsedData && item.content !== '') && (
              <View style={{ backgroundColor: item.role === 'user' ? C.accent : C.surface, padding: rs(12), borderRadius: rs(16), maxWidth: '85%', borderBottomRightRadius: item.role === 'user' ? 4 : 16, borderBottomLeftRadius: item.role === 'assistant' ? 4 : 16 }}>
                <Text selectable={true} style={{ color: item.role === 'user' ? C.bg : C.textPrimary, fontSize: fs(15) }}>{item.content}</Text>
              </View>
            )}
            {item.parsedData && (
              <View style={{ width: '100%', marginTop: rs(8) }}>
                <ConfirmationCard 
                  parsedData={item.parsedData} 
                  onConfirm={handleConfirm} 
                  onCancel={() => setMessages([...messages, { role: 'user', content: 'Cancel that.' }, { role: 'assistant', content: 'Cancelled. What else did you eat?' }])} 
                  isLoading={isLoading} 
                />
              </View>
            )}
          </View>
        )}
      />
      {error && <Text style={{ color: C.error, textAlign: 'center', marginBottom: rs(8) }}>{error}</Text>}
      <View style={{ backgroundColor: C.bg, borderTopWidth: rs(1), borderTopColor: C.border }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: rs(16), paddingTop: rs(12), paddingBottom: rs(4), gap: rs(8) }}>
          {['breakfast', 'lunch', 'dinner', 'snack'].map(type => (
            <TouchableOpacity 
              key={type} 
              onPress={() => setMealType(type)} 
              style={[s.mealTypePill, mealType === type && s.mealTypePillActive, { paddingVertical: rs(6), paddingHorizontal: rs(14) }]}
            >
              <Text style={[s.mealTypeText, mealType === type && s.mealTypeTextActive, { fontSize: fs(13) }]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', padding: rs(16), paddingTop: rs(8) }}>
          <TextInput
            style={[s.input, { flex: 1, marginBottom: rs(0), borderRadius: rs(24), paddingHorizontal: rs(16) }]}
            placeholder={isRecording ? 'Recording...' : 'e.g. "2 boiled eggs"'}
            placeholderTextColor={isRecording ? C.error : C.textSecondary}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            editable={!isRecording && !isTranscribing}
          />
          {!input.trim() ? (
            <TouchableOpacity 
              style={{ marginLeft: rs(12), backgroundColor: isRecording ? 'rgba(244,63,94,0.2)' : C.surface, width: rs(48), height: rs(48), borderRadius: rs(24), justifyContent: 'center', alignItems: 'center', borderWidth: isRecording ? 1 : 0, borderColor: C.error }} 
              onPress={isRecording ? stopRecording : startRecording} 
              disabled={isLoading || isTranscribing}
            >
              {isTranscribing ? <ActivityIndicator color={C.textPrimary} /> : <Ionicons name={isRecording ? "stop" : "mic"} size={20} color={isRecording ? C.error : C.textPrimary} />}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={{ marginLeft: rs(12), backgroundColor: C.accent, width: rs(48), height: rs(48), borderRadius: rs(24), justifyContent: 'center', alignItems: 'center' }} onPress={handleSend} disabled={isLoading || isTranscribing}>
              {isLoading ? <ActivityIndicator color={C.bg} /> : <Ionicons name="send" size={20} color={C.bg} style={{ marginLeft: rs(4) }} />}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
