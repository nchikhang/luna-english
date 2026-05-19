import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';

/**
 * XpToast — hiển thị "+N XP" floating animation khi user earn XP.
 *
 * Usage:
 *   const [xpToast, setXpToast] = useState<{points: number, key: number} | null>(null);
 *   {xpToast && <XpToast points={xpToast.points} key={xpToast.key} onDone={() => setXpToast(null)} />}
 *
 *   Khi muốn show:
 *   setXpToast({ points: 10, key: Date.now() });
 *
 * `key` thay đổi để force re-mount component → restart animation.
 */
interface Props {
  points: number;
  onDone?: () => void;
  color?: string;
}

export function XpToast({ points, onDone, color = '#10b981' }: Props) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -40,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(400),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDone?.();
    });
  }, [opacity, translateY, onDone]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 100,
        left: 0,
        right: 0,
        alignItems: 'center',
        opacity,
        transform: [{ translateY }],
        zIndex: 1000,
      }}
    >
      <View
        style={{
          backgroundColor: color,
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 999,
          shadowColor: color,
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>
          +{points} XP
        </Text>
      </View>
    </Animated.View>
  );
}

/**
 * Component báo Level Up — fancier version.
 * Show fullscreen overlay với confetti vibe.
 */
interface LevelUpProps {
  newLevel: number;
  onDone?: () => void;
}

export function LevelUpToast({ newLevel, onDone }: LevelUpProps) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(2000),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => onDone?.());
  }, [opacity, scale, onDone]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        opacity,
        zIndex: 2000,
      }}
    >
      <Animated.View
        style={{
          backgroundColor: 'white',
          padding: 32,
          borderRadius: 24,
          alignItems: 'center',
          transform: [{ scale }],
          shadowOpacity: 0.3,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
          elevation: 16,
        }}
      >
        <Text style={{ fontSize: 64 }}>🎉</Text>
        <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>
          LEVEL UP!
        </Text>
        <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#6366f1' }}>
          Lv. {newLevel}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}
