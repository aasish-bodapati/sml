import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { supabase } from '../supabaseClient';
import { C, rs } from '../design-tokens';
import { s } from '../styles/appStyles';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) { setMessage('Please fill in both fields.'); return; }
    setLoading(true); setMessage('');
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Check your email to confirm!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) { setMessage(e.message); }
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
      <View style={s.loginContainer}>
        <Text style={s.loginTitle}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
        {message ? <View style={s.msgBanner}><Text style={s.msgText}>{message}</Text></View> : null}
        <TextInput style={s.input} placeholder="Email" placeholderTextColor={C.textSecondary}
          value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={s.input} placeholder="Password" placeholderTextColor={C.textSecondary}
          value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={s.btn} onPress={handleAuth} disabled={loading}>
          {loading ? <ActivityIndicator color={C.bg} /> : <Text style={s.btnText}>{isSignUp ? 'Sign Up' : 'Sign In'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={{ marginTop: rs(16), alignItems: 'center' }}>
          <Text style={{ color: C.textSecondary }}>
            {isSignUp ? 'Have an account? ' : "No account? "}
            <Text style={{ color: C.accent, fontWeight: 'bold' }}>{isSignUp ? 'Sign In' : 'Sign Up'}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
