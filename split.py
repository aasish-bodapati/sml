import os

with open('mobile/App.tsx', 'r') as f:
    lines = f.read().splitlines()

def slice_file(start, end):
    # start and end are 1-indexed
    return "\n".join(lines[start-1:end])

os.makedirs('mobile/screens', exist_ok=True)
os.makedirs('mobile/components', exist_ok=True)
os.makedirs('mobile/constants', exist_ok=True)
os.makedirs('mobile/styles', exist_ok=True)

# 1. Styles
with open('mobile/styles/appStyles.ts', 'w') as f:
    f.write("import { StyleSheet, Platform } from 'react-native';\n")
    f.write("import { C, rs, fs } from '../design-tokens';\n\n")
    f.write("export " + slice_file(2428, 2477) + "\n")

with open('mobile/styles/fitnessStyles.ts', 'w') as f:
    f.write("import { StyleSheet } from 'react-native';\n")
    f.write("import { C, rs, fs } from '../design-tokens';\n\n")
    f.write("export " + slice_file(1539, 2008) + "\n")

# 2. Components
with open('mobile/components/BottomTabBar.tsx', 'w') as f:
    f.write("import React from 'react';\n")
    f.write("import { View, TouchableOpacity, Text } from 'react-native';\n")
    f.write("import { Ionicons } from '@expo/vector-icons';\n")
    f.write("import { C, rs } from '../design-tokens';\n")
    f.write("import { s } from '../styles/appStyles';\n\n")
    f.write("export default " + slice_file(69, 95) + "\n")

with open('mobile/components/AnimatedProgressBar.tsx', 'w') as f:
    f.write("import React, { useEffect } from 'react';\n")
    f.write("import { View } from 'react-native';\n")
    f.write("import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';\n")
    f.write("import { rs } from '../design-tokens';\n\n")
    f.write("export default " + slice_file(97, 118) + "\n")

with open('mobile/components/ConfirmationCard.tsx', 'w') as f:
    f.write("import React, { useState } from 'react';\n")
    f.write("import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';\n")
    f.write("import { C, rs, fs } from '../design-tokens';\n")
    f.write("import { s } from '../styles/appStyles';\n\n")
    f.write("export default " + slice_file(175, 275) + "\n")

# 3. Screens
with open('mobile/screens/LoginScreen.tsx', 'w') as f:
    f.write("import React, { useState } from 'react';\n")
    f.write("import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';\n")
    f.write("import { supabase } from '../supabaseClient';\n")
    f.write("import { C, rs } from '../design-tokens';\n")
    f.write("import { s } from '../styles/appStyles';\n\n")
    f.write("export default " + slice_file(22, 66) + "\n")

with open('mobile/screens/HomeTab.tsx', 'w') as f:
    f.write("import React from 'react';\n")
    f.write("import { ScrollView, View, Text, TouchableOpacity } from 'react-native';\n")
    f.write("import AnimatedProgressBar from '../components/AnimatedProgressBar';\n")
    f.write("import { C, rs, fs } from '../design-tokens';\n")
    f.write("import { s } from '../styles/appStyles';\n\n")
    f.write("export default " + slice_file(121, 172) + "\n")

with open('mobile/screens/ChatTab.tsx', 'w') as f:
    f.write("import React, { useState } from 'react';\n")
    f.write("import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';\n")
    f.write("import { Ionicons } from '@expo/vector-icons';\n")
    f.write("import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync } from 'expo-audio';\n")
    f.write("import ConfirmationCard from '../components/ConfirmationCard';\n")
    f.write("import { parseMeal, confirmLogMeal, transcribeAudio } from '../api';\n")
    f.write("import { C, rs, fs } from '../design-tokens';\n")
    f.write("import { s } from '../styles/appStyles';\n\n")
    f.write("export default " + slice_file(278, 447) + "\n")

with open('mobile/screens/HistoryTab.tsx', 'w') as f:
    f.write("import React, { useState } from 'react';\n")
    f.write("import { View, Text, TouchableOpacity, FlatList, Platform, Alert } from 'react-native';\n")
    f.write("import DateTimePicker from '@react-native-community/datetimepicker';\n")
    f.write("import { C, rs, fs } from '../design-tokens';\n")
    f.write("import { s } from '../styles/appStyles';\n\n")
    f.write("export default " + slice_file(450, 590) + "\n")

with open('mobile/screens/ProfileTab.tsx', 'w') as f:
    f.write("import React, { useState, useEffect } from 'react';\n")
    f.write("import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';\n")
    f.write("import { calculationService } from '../calculation-service';\n")
    f.write("import { logWeight } from '../api';\n")
    f.write("import { C, rs, fs } from '../design-tokens';\n")
    f.write("import { s } from '../styles/appStyles';\n\n")
    f.write("export default " + slice_file(593, 872) + "\n")

with open('mobile/screens/RecipesScreen.tsx', 'w') as f:
    f.write("import React from 'react';\n")
    f.write("import { View, Text, TouchableOpacity, FlatList, SafeAreaView } from 'react-native';\n")
    f.write("import { Ionicons } from '@expo/vector-icons';\n")
    f.write("import { C, rs, fs } from '../design-tokens';\n")
    f.write("import { s } from '../styles/appStyles';\n\n")
    f.write("export default " + slice_file(2010, 2048) + "\n")

with open('mobile/screens/CheatSheetScreen.tsx', 'w') as f:
    f.write("import React from 'react';\n")
    f.write("import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';\n")
    f.write("import { C, rs, fs } from '../design-tokens';\n")
    f.write("import { s } from '../styles/appStyles';\n\n")
    f.write("export default " + slice_file(2050, 2104) + "\n")

with open('mobile/constants/routines.ts', 'w') as f:
    f.write("export " + slice_file(903, 933) + "\n")

with open('mobile/screens/FitnessTab.tsx', 'w') as f:
    f.write("import React, { useState, useEffect } from 'react';\n")
    f.write("import { View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Alert, Image } from 'react-native';\n")
    f.write("import { Ionicons } from '@expo/vector-icons';\n")
    f.write("import { searchExercises, logWorkout, getWorkouts } from '../api';\n")
    f.write("import { ROUTINES } from '../constants/routines';\n")
    f.write("import { C, rs, fs } from '../design-tokens';\n")
    f.write("import { fitnessStyles } from '../styles/fitnessStyles';\n")
    f.write("import { s } from '../styles/appStyles';\n\n")
    f.write("export " + slice_file(874, 901) + "\n\n")
    f.write("export default " + slice_file(935, 1537) + "\n")

with open('mobile/screens/DashboardScreen.tsx', 'w') as f:
    f.write("import React, { useState, useEffect } from 'react';\n")
    f.write("import { View, ActivityIndicator, Alert } from 'react-native';\n")
    f.write("import { Session } from '@supabase/supabase-js';\n")
    f.write("import BottomTabBar from '../components/BottomTabBar';\n")
    f.write("import HomeTab from './HomeTab';\n")
    f.write("import ChatTab from './ChatTab';\n")
    f.write("import HistoryTab from './HistoryTab';\n")
    f.write("import ProfileTab from './ProfileTab';\n")
    f.write("import FitnessTab from './FitnessTab';\n")
    f.write("import RecipesScreen from './RecipesScreen';\n")
    f.write("import CheatSheetScreen from './CheatSheetScreen';\n")
    f.write("import { getLogs, getSummary, getWeeklyAnalytics, getWeightHistory, getRecipes, deleteLog, deleteRecipe, logRecipe, saveRecipe } from '../api';\n")
    f.write("import { MacroTargets, UserProfilePayload } from '../OnboardingScreen';\n")
    f.write("import { s } from '../styles/appStyles';\n\n")
    f.write("export const DEFAULT_SUMMARY = { calories: 0, protein: 0, carbohydrates: 0, fat: 0 };\n\n")
    f.write("export default " + slice_file(2108, 2282) + "\n")

with open('mobile/App.tsx', 'w') as f:
    f.write("import 'react-native-url-polyfill/auto';\n")
    f.write("import { useState, useEffect } from 'react';\n")
    f.write("import { View, ActivityIndicator, Platform } from 'react-native';\n")
    f.write("import { SafeAreaProvider } from 'react-native-safe-area-context';\n")
    f.write("import AsyncStorage from '@react-native-async-storage/async-storage';\n")
    f.write("import { Session } from '@supabase/supabase-js';\n")
    f.write("import { supabase } from './supabaseClient';\n")
    f.write("import { getProfile, saveProfile, updateProfile } from './api';\n")
    f.write("import OnboardingScreen, { MacroTargets, UserProfilePayload } from './OnboardingScreen';\n")
    f.write("import LoginScreen from './screens/LoginScreen';\n")
    f.write("import DashboardScreen from './screens/DashboardScreen';\n")
    f.write("import { C } from './design-tokens';\n")
    f.write("import { s } from './styles/appStyles';\n\n")
    f.write("export default " + slice_file(2284, 2425) + "\n")

print("Files generated!")
