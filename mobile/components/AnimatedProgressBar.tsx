import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { rs } from '../design-tokens';

export default function AnimatedProgressBar({ progress, color }: { progress: number, color: string }) {
  const widthAnim = useSharedValue(progress * 100);

  useEffect(() => {
    widthAnim.value = withTiming(progress * 100, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${widthAnim.value}%`,
    };
  });

  return (
    <View style={{ height: rs(12), backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: rs(6), overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', backgroundColor: color, borderRadius: rs(6) }, animatedStyle]} />
    </View>
  );
}
