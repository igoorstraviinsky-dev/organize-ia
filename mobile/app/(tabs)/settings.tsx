import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, ScrollView, Platform } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { Settings, LogOut, User, Bell, Shield, Info, ChevronRight } from 'lucide-react-native';
import { Colors } from '../../src/constants/Colors';
import { useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  const SettingItem = ({ icon: Icon, label, onPress, color = '#6366f1', showArrow = true }: any) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.itemLeft}>
        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)' }]}>
          <Icon size={20} color={color} strokeWidth={2.5} />
        </View>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      {showArrow && <ChevronRight size={20} color="rgba(255,255,255,0.2)" />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Premium */}
      <LinearGradient
        colors={['#020617', '#0f172a', '#020617']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Glow Spheres */}
      <View style={[styles.glowSphere, { top: -50, right: -50, backgroundColor: 'rgba(99, 102, 241, 0.15)' }]} />
      <View style={[styles.glowSphere, { bottom: 100, left: -100, backgroundColor: 'rgba(168, 85, 247, 0.1)' }]} />

      <SafeAreaView style={styles.safeArea}>
        <MotiView 
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.header}
        >
          <View style={styles.titleRow}>
            <LinearGradient
              colors={['#6366f1', '#a855f7']}
              style={styles.headerIconWrapper}
            >
              <Settings size={20} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={styles.title}>Ajustes</Text>
              <Text style={styles.dateText}>Configurações da sua experiência</Text>
            </View>
          </View>
        </MotiView>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <MotiView 
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 200 }}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>Conta</Text>
            <View style={styles.sectionCard}>
              <SettingItem icon={User} label="Perfil" />
              <View style={styles.divider} />
              <SettingItem icon={Bell} label="Notificações" />
              <View style={styles.divider} />
              <SettingItem icon={Shield} label="Privacidade & Segurança" />
            </View>
          </MotiView>

          <MotiView 
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 300 }}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>Aplicativo</Text>
            <View style={styles.sectionCard}>
              <SettingItem icon={Info} label="Sobre o Organizador" />
            </View>
          </MotiView>

          <MotiView 
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 400 }}
            style={styles.section}
          >
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={handleLogout}
              style={styles.logoutButton}
            >
              <LinearGradient
                colors={['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.05)']}
                style={styles.logoutGradient}
              >
                <LogOut size={20} color="#ef4444" strokeWidth={2.5} />
                <Text style={styles.logoutText}>Encerrar Sessão</Text>
              </LinearGradient>
            </TouchableOpacity>
          </MotiView>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  safeArea: {
    flex: 1,
  },
  glowSphere: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  header: {
    padding: 24,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    marginTop: 2,
  },
  scrollContent: {
    padding: 24,
    gap: 32,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  settingItem: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 16,
  },
  logoutButton: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
