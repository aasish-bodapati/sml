import 'react-native-url-polyfill/auto';
import { useState, useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { getProfile, saveProfile, updateProfile } from './api';
import OnboardingScreen, { MacroTargets, UserProfilePayload } from './OnboardingScreen';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import { C } from './design-tokens';
import { s } from './styles/appStyles';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [targetMacros, setTargetMacros] = useState<MacroTargets | null>(null);
  const [rawProfile, setRawProfile] = useState<UserProfilePayload | null>(null);

  useEffect(() => {
    // First, load local cache quickly to avoid flashes
    AsyncStorage.getItem('onboarding_targets').then(res => {
      if (res) {
        setTargetMacros(JSON.parse(res));
        setOnboardingCompleted(true);
      }
    }).catch(e => {
      console.log('Failed to load local cache', e);
    }).finally(() => {
      setLoading(false);
    });

    AsyncStorage.getItem('onboarding_profile').then(res => {
      if (res) setRawProfile(JSON.parse(res));
    }).catch(e => { });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      syncProfile(s);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      syncProfile(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncProfile = async (s: Session | null) => {
    if (!s) return;
    try {
      const profile = await getProfile();
      if (profile) {
        const targets = {
          calories: profile.target_calories,
          protein: profile.target_protein,
          carbs: profile.target_carbs,
          fat: profile.target_fat,
        };
        const p: UserProfilePayload = {
          goal: profile.goal, gender: profile.gender, age: profile.age,
          height_cm: profile.height_cm, weight_kg: profile.weight_kg, activity: profile.activity
        };
        setTargetMacros(targets);
        setRawProfile(p);
        setOnboardingCompleted(true);
        await AsyncStorage.setItem('onboarding_targets', JSON.stringify(targets));
        await AsyncStorage.setItem('onboarding_profile', JSON.stringify(p));
      } else {
        // Force existing users to re-onboard to ensure server sync
        setOnboardingCompleted(false);
        setTargetMacros(null);
        setRawProfile(null);
        await AsyncStorage.removeItem('onboarding_targets');
        await AsyncStorage.removeItem('onboarding_profile');
      }
    } catch (e) {
      console.log('Failed to sync profile', e);
    }
  };

  const handleOnboardingComplete = async (targets: MacroTargets, profile: UserProfilePayload) => {
    await AsyncStorage.setItem('onboarding_targets', JSON.stringify(targets));
    await AsyncStorage.setItem('onboarding_profile', JSON.stringify(profile));
    setTargetMacros(targets);
    setRawProfile(profile);
    setOnboardingCompleted(true);

    if (session) {
      try {
        await saveProfile({
          ...profile,
          target_calories: targets.calories,
          target_protein: targets.protein,
          target_carbs: targets.carbs,
          target_fat: targets.fat
        });
      } catch (e) {
        console.log('Failed to save profile to server', e);
      }
    }
  };

  const handleUpdateProfile = async (targets: MacroTargets, profile: UserProfilePayload) => {
    await AsyncStorage.setItem('onboarding_targets', JSON.stringify(targets));
    await AsyncStorage.setItem('onboarding_profile', JSON.stringify(profile));
    setTargetMacros(targets);
    setRawProfile(profile);

    if (session) {
      try {
        await updateProfile({
          ...profile,
          target_calories: targets.calories,
          target_protein: targets.protein,
          target_carbs: targets.carbs,
          target_fat: targets.fat
        });
      } catch (e) {
        console.log('Failed to update profile to server', e);
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={[s.flex, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      </SafeAreaProvider>
    );
  }

  if (session && !onboardingCompleted) {
    return (
      <SafeAreaProvider>
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </SafeAreaProvider>
    );
  }

  return session ? (
    <SafeAreaProvider>
      <DashboardScreen session={session} targetMacros={targetMacros} rawProfile={rawProfile} onUpdateProfile={handleUpdateProfile} />
    </SafeAreaProvider>
  ) : (
    <SafeAreaProvider>
      <LoginScreen />
    </SafeAreaProvider>
  );
}

