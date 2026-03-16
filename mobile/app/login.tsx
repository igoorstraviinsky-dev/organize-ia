import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, Lock, Mail, Sparkles } from 'lucide-react-native';
import { ScreenShell } from '../src/components/ScreenShell';
import { GlassCard } from '../src/components/GlassCard';
import { BrandLogo } from '../src/components/BrandLogo';
import { useAppTheme } from '../src/hooks/useAppTheme';
import { signInWithPassword } from '../src/services/authService';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { colors, layout, typography, isTablet } = useAppTheme();

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Campos obrigatórios', 'Preencha e-mail e senha para continuar.');
      return;
    }

    setLoading(true);
    const { error } = await signInWithPassword(email, password);
    setLoading(false);

    if (error) {
      Alert.alert('Falha no acesso', error.message);
      return;
    }

    router.replace('/(tabs)');
  }

  return (
    <ScreenShell scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[styles.wrap, { maxWidth: layout.contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
          <View style={styles.hero}>
            <BrandLogo size={isTablet ? 126 : 102} showWordmark centered />
            <Text style={[styles.heroTitle, { color: colors.text, fontSize: typography.hero }]}>Produtividade com presença, clareza e ritmo.</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
              Entre para acompanhar tarefas, projetos e prioridades em uma interface pensada para caber bem em qualquer celular.
            </Text>
          </View>

          <GlassCard style={{ padding: 22 }}>
            <View style={styles.formHeader}>
              <View style={[styles.badge, { backgroundColor: colors.backgroundTertiary }]}>
                <Sparkles size={14} color={colors.tint} />
                <Text style={[styles.badgeText, { color: colors.tint }]}>Acesso seguro</Text>
              </View>
              <Text style={[styles.formTitle, { color: colors.text }]}>Entrar na sua central</Text>
            </View>

            <View style={styles.formBody}>
              <View style={[styles.inputShell, { borderColor: colors.borderStrong, backgroundColor: colors.backgroundSecondary }]}>
                <Mail size={18} color={colors.textMuted} />
                <TextInput
                  placeholder="Seu e-mail"
                  placeholderTextColor={colors.textSoft}
                  style={[styles.input, { color: colors.text }]}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={[styles.inputShell, { borderColor: colors.borderStrong, backgroundColor: colors.backgroundSecondary }]}>
                <Lock size={18} color={colors.textMuted} />
                <TextInput
                  placeholder="Sua senha"
                  placeholderTextColor={colors.textSoft}
                  style={[styles.input, { color: colors.text }]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <Pressable onPress={handleLogin} style={[styles.button, { backgroundColor: colors.tint }]}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Entrar</Text>
                    <ArrowRight size={18} color="#fff" />
                  </>
                )}
              </Pressable>
            </View>
          </GlassCard>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingTop: 26,
    gap: 24,
  },
  hero: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 24,
  },
  heroTitle: {
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 40,
    maxWidth: 520,
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 520,
  },
  formHeader: {
    gap: 10,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  formBody: {
    marginTop: 18,
    gap: 14,
  },
  inputShell: {
    borderWidth: 1,
    borderRadius: 18,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  button: {
    marginTop: 6,
    minHeight: 58,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
});
