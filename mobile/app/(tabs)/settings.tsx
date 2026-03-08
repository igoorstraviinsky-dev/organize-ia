import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { Settings, LogOut, Shield, Bell } from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';

export default function SettingsScreen() {
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Erro', error.message);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ajustes</Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.item}>
          <Bell size={20} color="#94a3b8" />
          <Text style={styles.itemText}>Notificações</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item}>
          <Shield size={20} color="#94a3b8" />
          <Text style={styles.itemText}>Privacidade</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.item, styles.lastItem]} onPress={handleLogout}>
          <LogOut size={20} color="#f43f5e" />
          <Text style={[styles.itemText, { color: '#f43f5e' }]}>Sair</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>Versão 1.0.0 (Beta)</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  section: {
    margin: 20,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  itemText: {
    color: '#f8fafc',
    fontSize: 16,
    marginLeft: 15,
  },
  version: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    marginTop: 20,
  },
});
