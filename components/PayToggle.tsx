import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';

interface Props {
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function PayToggle({ value, onToggle, disabled }: Props) {
  const pos = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(pos, {
      toValue: value ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value, pos]);

  const translateX = pos.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 26],
  });

  const bg = pos.interpolate({
    inputRange: [0, 1],
    outputRange: ['#cbd5e1', '#10b981'],
  });

  return (
    <Pressable onPress={onToggle} disabled={disabled} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <Animated.View style={[styles.track, { backgroundColor: bg }]}>
        <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]}>
          {value ? <Check size={12} color="#fff" strokeWidth={3} /> : <View />}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
