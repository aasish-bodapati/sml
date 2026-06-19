import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import { generateRoutine, createRoutine, transcribeAudio } from '../api';
import { C, rs, fs } from '../design-tokens';
import { s } from '../styles/appStyles';

export default function RoutineChatScreen({ onBack, onSuccess }: any) {
  const [messages, setMessages] = useState<{role: string, content: string, routineData?: any}[]>([
    { role: 'assistant', content: "Hi! What kind of workout routine do you want to build? (e.g. 'A 45 minute upper body dumbbell workout')" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (permission.granted) {
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
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
      // Send the entire chat history as the prompt context, or just the user's input
      const prompt = newMessages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
      const result = await generateRoutine(prompt);
      
      const assistantMsg = { 
        role: 'assistant', 
        content: '',
        routineData: result
      };
      setMessages([...newMessages, assistantMsg]);
    } catch (e: any) { 
      setError(e.message || 'Failed to generate routine.'); 
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error. Could you try again?' }]);
    }
    finally { setIsLoading(false); }
  };

  const handleSaveRoutine = async (routineData: any) => {
    setIsLoading(true); setError(null);
    try {
      await createRoutine(routineData);
      onSuccess();
    } catch (e: any) { setError(e.message || 'Failed to save routine.'); }
    finally { setIsLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === 'ios' ? rs(50) : rs(20) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(16), paddingBottom: rs(16), borderBottomWidth: 1, borderBottomColor: C.border }}>
        <TouchableOpacity onPress={onBack} style={{ padding: rs(8), marginLeft: rs(-8) }}>
          <Ionicons name="close" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: fs(18), fontWeight: 'bold', color: C.textPrimary, marginRight: rs(24) }}>
          AI Routine Builder
        </Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <FlatList
          data={messages}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={{ padding: rs(16), paddingBottom: rs(24) }}
          renderItem={({ item }) => (
            <View style={{ alignItems: item.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: rs(16) }}>
              {item.content !== '' && (
                <View style={{ backgroundColor: item.role === 'user' ? C.accent : C.surface, padding: rs(12), borderRadius: rs(16), maxWidth: '85%', borderBottomRightRadius: item.role === 'user' ? 4 : 16, borderBottomLeftRadius: item.role === 'assistant' ? 4 : 16 }}>
                  <Text selectable={true} style={{ color: item.role === 'user' ? C.bg : C.textPrimary, fontSize: fs(15) }}>{item.content}</Text>
                </View>
              )}
              
              {item.routineData && (
                <View style={{ width: '100%', marginTop: rs(12), backgroundColor: C.surface, borderRadius: rs(12), padding: rs(16), borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ color: C.textPrimary, fontSize: fs(18), fontWeight: 'bold', marginBottom: rs(4) }}>{item.routineData.name}</Text>
                  {item.routineData.description ? <Text style={{ color: C.textSecondary, fontSize: fs(13), marginBottom: rs(12) }}>{item.routineData.description}</Text> : null}
                  
                  {item.routineData.days?.map((day: any) => (
                    <View key={day.day_number} style={{ marginTop: rs(12) }}>
                      <Text style={{ color: C.textPrimary, fontSize: fs(15), fontWeight: '600', marginBottom: rs(4) }}>
                        Day {day.day_number}{day.title ? `: ${day.title}` : ''}
                      </Text>
                      {day.focus ? <Text style={{ color: C.textSecondary, fontSize: fs(12), marginBottom: rs(8) }}>Focus: {day.focus}</Text> : null}
                      
                      {day.exercises.map((ex: any, idx: number) => (
                        <View key={idx} style={{ flexDirection: 'row', paddingVertical: rs(6), borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: C.border }}>
                          <Text style={{ color: C.textPrimary, flex: 1, fontSize: fs(13) }}>{ex.name || ex.exercise_id}</Text>
                          <Text style={{ color: C.textSecondary, fontSize: fs(12) }}>
                            {ex.sets} × {ex.reps}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                  
                  <TouchableOpacity 
                    style={{ marginTop: rs(20), backgroundColor: C.accent, paddingVertical: rs(12), borderRadius: rs(8), alignItems: 'center' }}
                    onPress={() => handleSaveRoutine(item.routineData)}
                    disabled={isLoading}
                  >
                    {isLoading ? <ActivityIndicator color={C.bg} /> : <Text style={{ color: C.bg, fontWeight: 'bold' }}>Save Routine</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          ListFooterComponent={() => (
            isLoading ? (
              <View style={{ alignItems: 'flex-start', marginBottom: rs(16) }}>
                <View style={{ backgroundColor: C.surface, padding: rs(12), borderRadius: rs(16), borderBottomLeftRadius: 4 }}>
                  <ActivityIndicator color={C.textPrimary} size="small" />
                </View>
              </View>
            ) : null
          )}
        />
        {error && <Text style={{ color: C.error, textAlign: 'center', marginBottom: rs(8) }}>{error}</Text>}
        <View style={{ backgroundColor: C.bg, borderTopWidth: rs(1), borderTopColor: C.border }}>
          <View style={{ flexDirection: 'row', padding: rs(16) }}>
            <TextInput
              style={[s.input, { flex: 1, marginBottom: rs(0), borderRadius: rs(24), paddingHorizontal: rs(16) }]}
              placeholder={isRecording ? 'Recording...' : 'e.g. "Add a core finisher"'}
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
    </View>
  );
}
