import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { useSSE } from '../../src/hooks/useSSE';
import { Send, User, ChevronLeft, Search, MessageSquare } from 'lucide-react-native';

const SERVER_URL = 'https://organize.straviinsky.online';

export default function ChatScreen() {
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [integration, setIntegration] = useState<any>(null);
  const { messages: sseMessages } = useSSE(integration?.id);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchIntegration();
  }, []);

  useEffect(() => {
    if (integration) {
      fetchConversations();
    }
  }, [integration, sseMessages]);

  useEffect(() => {
    if (selectedPhone) {
      fetchMessages(selectedPhone);
    }
  }, [selectedPhone, sseMessages]);

  async function fetchIntegration() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data } = await supabase
      .from('integrations')
      .select('*')
      .eq('owner_id', userData.user.id)
      .eq('type', 'uazapi')
      .single();
    
    setIntegration(data);
  }

  async function fetchConversations() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // Busca as últimas mensagens de cada telefone para montar a lista de conversas
    const { data, error } = await supabase.rpc('get_recent_conversations', { 
      p_user_id: userData.user.id 
    });

    if (!error && data) {
      setConversations(data);
    } else {
      // Fallback simples se a RPC não existir
      const { data: msgData } = await supabase
        .from('chat_messages')
        .select('phone, body, created_at, direction')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });
      
      const unique = [];
      const seen = new Set();
      for (const m of msgData || []) {
        if (!seen.has(m.phone)) {
          seen.add(m.phone);
          unique.push(m);
        }
      }
      setConversations(unique);
    }
  }

  async function fetchMessages(phone: string) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('phone', phone)
      .order('created_at', { ascending: true });
    
    setMessages(data || []);
  }

  async function sendMessage() {
    if (!inputText.trim() || !selectedPhone || !integration) return;

    const text = inputText;
    setInputText('');
    setLoading(true);

    try {
      const response = await fetch(`${SERVER_URL}/api/uazapi/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': integration.owner_id,
        },
        body: JSON.stringify({
          to: selectedPhone,
          text: text,
        }),
      });

      if (response.ok) {
        // Atualiza a lista local imediatamente
        fetchMessages(selectedPhone);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setLoading(false);
    }
  }

  const renderConversation = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.convItem} onPress={() => setSelectedPhone(item.phone)}>
      <View style={styles.avatar}>
        <User size={24} color="#94a3b8" />
      </View>
      <View style={styles.convInfo}>
        <Text style={styles.convPhone}>{item.phone}</Text>
        <Text style={styles.convLastMsg} numberOfLines={1}>{item.body}</Text>
      </View>
      <Text style={styles.convTime}>
        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </TouchableOpacity>
  );

  const renderMessage = ({ item }: { item: any }) => (
    <View style={[styles.msgContainer, item.direction === 'out' ? styles.msgOut : styles.msgIn]}>
      <Text style={[styles.msgText, item.direction === 'out' ? styles.msgTextOut : styles.msgTextIn]}>
        {item.body}
      </Text>
      <Text style={styles.msgTime}>
        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  if (selectedPhone) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={styles.container}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSelectedPhone(null)}>
              <ChevronLeft size={28} color="#f8fafc" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{selectedPhone}</Text>
            <View style={{ width: 28 }} />
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id || Math.random().toString()}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          />

          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              placeholder="Digite uma mensagem..."
              placeholderTextColor="#64748b"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <TouchableOpacity 
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
              onPress={sendMessage}
              disabled={!inputText.trim() || loading}
            >
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Send size={20} color="#fff" />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Conversas</Text>
        <TouchableOpacity>
          <Search size={24} color="#f8fafc" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.phone}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MessageSquare size={48} color="#334155" />
            <Text style={styles.emptyText}>Nenhuma conversa encontrada.</Text>
          </View>
        }
      />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  list: {
    padding: 10,
  },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  convInfo: {
    flex: 1,
    marginLeft: 15,
  },
  convPhone: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  convLastMsg: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  convTime: {
    fontSize: 12,
    color: '#64748b',
  },
  messageList: {
    padding: 15,
  },
  msgContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  msgIn: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 4,
  },
  msgOut: {
    alignSelf: 'flex-end',
    backgroundColor: '#6366f1',
    borderBottomRightRadius: 4,
  },
  msgText: {
    fontSize: 16,
  },
  msgTextIn: {
    color: '#f8fafc',
  },
  msgTextOut: {
    color: '#fff',
  },
  msgTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  input: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    color: '#f8fafc',
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#334155',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: '#64748b',
    marginTop: 10,
    fontSize: 16,
  },
});
