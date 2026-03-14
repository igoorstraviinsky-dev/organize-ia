import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Zap, Trophy } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface XPBarProps {
  data: {
    level: number;
    total_xp: number;
    progress: number;
    xpInCurrentLevel: number;
    nextLevelXp: number;
    user_achievements?: any[];
  } | null;
}

export default function XPBar({ data }: XPBarProps) {
  const stats = data || { 
    level: 1, 
    progress: 0, 
    xpInCurrentLevel: 0, 
    nextLevelXp: 500,
    user_achievements: [] 
  };

  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.levelBadge}>
          <View style={styles.zapIcon}>
            <Zap size={12} color="#f59e0b" fill="#f59e0b" />
          </View>
          <Text style={styles.levelText}>Nível {stats.level}</Text>
        </View>

        <View style={styles.achievementsBadge}>
          <Trophy size={10} color="rgba(255,255,255,0.6)" />
          <Text style={styles.achievementsText}>
            {stats.user_achievements?.length || 0} Conquistas
          </Text>
        </View>
      </View>

      {/* Progress Bar Container */}
      <View style={styles.barContainer}>
        <View style={styles.barBackground}>
          <MotiView
            from={{ width: '0%' }}
            animate={{ width: `${Math.max(2, stats.progress)}%` }} // Mínimo de 2% para visibilidade
            transition={{
              type: 'spring',
              damping: 15,
              stiffness: 100,
            }}
            style={styles.barFill}
          >
            <LinearGradient
              colors={['#f59e0b', '#f97316', '#f59e0b']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </MotiView>
        </View>
      </View>

      {/* XP Values */}
      <View style={styles.footer}>
        <Text style={styles.xpText}>{Math.round(stats.xpInCurrentLevel)} XP</Text>
        <Text style={styles.xpText}>{stats.nextLevelXp} XP</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zapIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  achievementsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  achievementsText: {
    fontSize: 9,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  barContainer: {
    height: 8,
    width: '100%',
  },
  barBackground: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.3)',
  },
});
