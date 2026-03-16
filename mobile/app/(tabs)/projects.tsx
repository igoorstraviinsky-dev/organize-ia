import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FolderKanban, Layers3 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '../../src/components/ScreenShell';
import { SectionHeader } from '../../src/components/SectionHeader';
import { GlassCard } from '../../src/components/GlassCard';
import { EmptyState } from '../../src/components/EmptyState';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useRealtimeSync } from '../../src/hooks/useRealtimeSync';
import { getProjects } from '../../src/services/projectService';
import { Project } from '../../src/types/models';

export default function ProjectsScreen() {
  const { colors, layout, typography, width } = useAppTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const router = useRouter();
  const columns = width >= 900 ? 3 : width >= 580 ? 2 : 1;

  useRealtimeSync(() => {
    fetchProjects();
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    setProjects(await getProjects());
  }

  return (
    <ScreenShell scroll>
      <View style={[styles.container, { maxWidth: layout.contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        <GlassCard style={{ gap: 12 }}>
          <Text style={[styles.eyebrow, { color: colors.tint }]}>Organização por contexto</Text>
          <Text style={[styles.heroTitle, { color: colors.text, fontSize: typography.hero }]}>Projetos com leitura rápida.</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
            Veja suas frentes de trabalho em cards mais claros, com contraste melhor e adaptação natural a vários tamanhos de tela.
          </Text>
        </GlassCard>

        <SectionHeader eyebrow="Categorias" title="Seus projetos" subtitle="Cada card abre os detalhes e as tarefas relacionadas." />

        {projects.length ? (
          <View style={[styles.grid, { gap: layout.cardGap }]}>
            {projects.map((project) => (
              <Pressable
                key={project.id}
                onPress={() => router.push(`/project/${project.id}`)}
                style={{ width: columns === 1 ? '100%' : columns === 2 ? '48.5%' : '31.5%' }}
              >
                <GlassCard style={{ minHeight: 170, justifyContent: 'space-between' }}>
                  <View style={[styles.projectIcon, { backgroundColor: project.color ? `${project.color}18` : colors.backgroundTertiary }]}>
                    <Layers3 size={22} color={project.color || colors.tint} />
                  </View>
                  <View style={{ gap: 6 }}>
                    <Text style={[styles.projectName, { color: colors.text }]} numberOfLines={2}>
                      {project.name}
                    </Text>
                    <Text style={[styles.projectMeta, { color: colors.textMuted }]}>Abrir visão detalhada</Text>
                  </View>
                </GlassCard>
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyState
            title="Nenhum projeto criado"
            description="Quando seus projetos aparecerem aqui, a navegação vai ficar muito mais clara e visual."
            icon={<FolderKanban size={24} color={colors.tint} />}
          />
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    paddingBottom: 150,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  projectIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectName: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
  },
  projectMeta: {
    fontSize: 13,
    fontWeight: '700',
  },
});
