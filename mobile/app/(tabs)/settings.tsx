import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Bell, Camera, LogOut, Palette, Shield, User2 } from 'lucide-react-native';
import { ScreenShell } from '../../src/components/ScreenShell';
import { SectionHeader } from '../../src/components/SectionHeader';
import { GlassCard } from '../../src/components/GlassCard';
import { BrandLogo } from '../../src/components/BrandLogo';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useRealtimeSync } from '../../src/hooks/useRealtimeSync';
import { signOut, getCurrentUser } from '../../src/services/authService';
import { getProfile, updateProfile, uploadAvatar } from '../../src/services/profileService';
import { PROFILE_COLORS } from '../../src/constants/profileColors';
import { Profile } from '../../src/types/models';

export default function SettingsScreen() {
  const { colors, layout, typography } = useAppTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [themeColor, setThemeColor] = useState(PROFILE_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useRealtimeSync(() => {
    loadProfile();
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const user = await getCurrentUser();
    if (!user) {
      return;
    }

    try {
      const nextProfile = await getProfile(user.id);
      setProfile(nextProfile);
      setName(nextProfile.full_name || '');
      setThemeColor(nextProfile.theme_color || PROFILE_COLORS[0]);
    } catch {
      setProfile({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        avatar_url: null,
        theme_color: PROFILE_COLORS[0],
      });
      setName(user.user_metadata?.full_name || '');
      setThemeColor(PROFILE_COLORS[0]);
    }
  }

  async function handleAvatarPick() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Libere acesso à galeria para trocar a foto de perfil.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0] || !profile?.id) {
      return;
    }

    setUploading(true);
    try {
      const avatarUrl = await uploadAvatar(profile.id, result.assets[0].uri);
      setProfile((current) => (current ? { ...current, avatar_url: avatarUrl } : current));
    } catch (error: any) {
      Alert.alert('Falha ao enviar foto', error?.message || 'Não foi possível atualizar a imagem.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!profile?.id) {
      return;
    }

    setSaving(true);
    try {
      const nextProfile = await updateProfile(profile.id, {
        full_name: name.trim(),
        theme_color: themeColor,
      });
      setProfile(nextProfile);
      Alert.alert('Perfil atualizado', 'Suas preferências foram salvas com sucesso.');
    } catch (error: any) {
      Alert.alert('Erro ao salvar', error?.message || 'Não foi possível salvar o perfil.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenShell scroll>
      <View style={[styles.container, { maxWidth: layout.contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        <GlassCard style={{ gap: 14 }}>
          <BrandLogo size={78} />
          <Text style={[styles.heroTitle, { color: colors.text, fontSize: typography.hero }]}>Perfil com a sua cara.</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
            Edite nome, foto e cor principal dos cards para deixar o app alinhado com sua identidade, como na versão web.
          </Text>
        </GlassCard>

        <SectionHeader eyebrow="Perfil" title="Personalização" subtitle="As mudanças entram em vigor no mobile em tempo real." />

        <GlassCard style={{ gap: 18 }}>
          <View style={styles.profileRow}>
            <Pressable onPress={handleAvatarPick} style={[styles.avatarButton, { backgroundColor: colors.backgroundTertiary, borderColor: colors.borderStrong }]}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarFallback, { color: colors.text }]}>{name?.trim()?.charAt(0)?.toUpperCase() || 'T'}</Text>
              )}
              <View style={[styles.cameraBadge, { backgroundColor: colors.tint }]}>
                {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Camera size={14} color="#fff" />}
              </View>
            </Pressable>

            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[styles.profileName, { color: colors.text }]}>{name || 'Seu nome'}</Text>
              <Text style={[styles.profileHint, { color: colors.textMuted }]}>{profile?.email || 'Conta conectada'}</Text>
              <Text style={[styles.profileHint, { color: colors.textMuted }]}>Toque na foto para trocar o avatar</Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Nome</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderStrong }]}>
              <User2 size={18} color={colors.textMuted} />
              <TextInput value={name} onChangeText={setName} placeholder="Seu nome" placeholderTextColor={colors.textSoft} style={[styles.input, { color: colors.text }]} />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Cor dos cards</Text>
            <View style={styles.colorGrid}>
              {PROFILE_COLORS.map((color) => {
                const active = color === themeColor;
                return (
                  <Pressable
                    key={color}
                    onPress={() => setThemeColor(color)}
                    style={[
                      styles.colorSwatch,
                      {
                        backgroundColor: color,
                        borderColor: active ? colors.text : 'transparent',
                        transform: [{ scale: active ? 1.08 : 1 }],
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>

          <Pressable onPress={handleSave} disabled={saving} style={[styles.saveButton, { backgroundColor: themeColor }]}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Salvar perfil</Text>}
          </Pressable>
        </GlassCard>

        <GlassCard style={{ paddingVertical: 10 }}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.backgroundTertiary }]}>
              <Bell size={18} color={colors.tintSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>Sincronização em tempo real</Text>
              <Text style={[styles.infoHint, { color: colors.textMuted }]}>Mudanças em tarefas, projetos e perfil são recarregadas automaticamente.</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.backgroundTertiary }]}>
              <Palette size={18} color={colors.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>Cards com tema pessoal</Text>
              <Text style={[styles.infoHint, { color: colors.textMuted }]}>A cor principal escolhida aqui é usada como destaque visual dos seus cards.</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.backgroundTertiary }]}>
              <Shield size={18} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>Conta protegida</Text>
              <Text style={[styles.infoHint, { color: colors.textMuted }]}>Seu perfil continua conectado ao Supabase com sessão persistente.</Text>
            </View>
          </View>
        </GlassCard>

        <Pressable onPress={() => signOut()} style={[styles.logoutButton, { backgroundColor: colors.danger }]}>
          <LogOut size={18} color="#fff" />
          <Text style={styles.logoutText}>Encerrar sessão</Text>
        </Pressable>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    paddingBottom: 150,
  },
  heroTitle: {
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 40,
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  profileRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  avatarButton: {
    width: 96,
    height: 96,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    fontSize: 34,
    fontWeight: '900',
  },
  cameraBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '900',
  },
  profileHint: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  fieldGroup: {
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
  },
  inputWrap: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorSwatch: {
    width: 42,
    height: 42,
    borderRadius: 16,
    borderWidth: 3,
  },
  saveButton: {
    minHeight: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  infoRow: {
    minHeight: 74,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  infoHint: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginVertical: 6,
  },
  logoutButton: {
    marginTop: 18,
    minHeight: 56,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  logoutText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
});
