import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions, Image } from 'react-native';
import { MotiView, MotiImage } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onFinish, 2500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#020617', '#0f172a']}
        style={StyleSheet.absoluteFill}
      />
      
      <MotiView
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', duration: 1500 }}
        style={styles.logoContainer}
      >
        <LinearGradient
          colors={['#6366f1', '#a855f7']}
          style={styles.glow}
        />
        <View style={styles.iconContainer}>
          <Zap size={64} color="#fff" fill="#fff" />
        </View>
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 1000, delay: 500 }}
        style={styles.textContainer}
      >
        <MotiView style={styles.appNameRow}>
          <View style={styles.textPart}>
            <Image 
              source={{ uri: 'https://img.icons8.com/ios-filled/100/ffffff/task.png' }} // Placeholder para a logo TaskWise
              style={styles.logoImage}
            />
          </View>
        </MotiView>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020617',
  },
  logoContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 70,
    opacity: 0.2,
    transform: [{ scale: 1.2 }],
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  textContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  appNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textPart: {
    alignItems: 'center',
  },
  logoImage: {
    width: 200,
    height: 60,
    resizeMode: 'contain',
  },
});
