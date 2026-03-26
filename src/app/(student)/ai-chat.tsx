// AI Chat Screen for CampusHub
// Mini ChatGPT-like interface

import axios,{ CancelTokenSource } from 'axios';
import { useLocalSearchParams,useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useRef,useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from '../../components/ui/Icon';
import { aiAPI,resourcesAPI } from '../../services/api';
import { voiceService } from '../../services/voice';
import { colors } from '../../theme/colors';
import { borderRadius,spacing } from '../../theme/spacing';

interface MessageSource {
  id?: string;
  title?: string;
  subtitle?: string;
  url?: string;
  route?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: MessageSource[];
  suggestedActions?: string[];
}

const QUICK_ACTIONS = [
  'How do I upload a resource?',
  'Find notes for Data Structures',
  'How to verify my account?',
  'What is my storage limit?',
  'Create a study group',
  'Summarize this PDF I downloaded',
];

const buildLocalHelpReply = async (
  rawText: string
): Promise<{
  content: string;
  sources?: MessageSource[];
  suggestedActions?: string[];
} | null> => {
  const text = rawText.trim().toLowerCase();
  if (!text) return null;

  if (text.includes('upload')) {
    return {
      content:
        'To upload a resource, open Upload Resource, choose your file, add the course details, then submit it for review.',
      sources: [
        {
          title: 'Upload Resource',
          subtitle: 'Share notes, slides, past papers, and tutorials',
          route: '/(student)/upload-resource',
        },
      ],
      suggestedActions: ['What files can I upload?', 'Open my uploads'],
    };
  }

  if (text.includes('verify') || text.includes('account')) {
    return {
      content:
        'If your account needs verification, open the verify-email screen and resend the email if needed.',
      sources: [
        {
          title: 'Verify Email',
          subtitle: 'Resend verification and finish account setup',
          route: '/(auth)/verify-email',
        },
      ],
      suggestedActions: ['How do I resend the email?', 'Open login'],
    };
  }

  if (text.includes('storage')) {
    return {
      content:
        'Your storage screen shows current usage, available space, cloud connections, and cleanup actions.',
      sources: [
        {
          title: 'Storage',
          subtitle: 'Usage, cleanup, downloads, and cloud connections',
          route: '/(student)/storage',
        },
      ],
      suggestedActions: ['Open storage', 'How do I clear space?'],
    };
  }

  if (text.includes('study group') || text.includes('group')) {
    return {
      content:
        'You can browse existing study groups, join one, or create a new focused group for classmates.',
      sources: [
        {
          title: 'Study Groups',
          subtitle: 'Browse your groups and community spaces',
          route: '/(student)/study-groups',
        },
        {
          title: 'Create Study Group',
          subtitle: 'Start a new group for your class or topic',
          route: '/(student)/create-study-group',
        },
      ],
      suggestedActions: ['Browse study groups', 'Create a study group'],
    };
  }

  if (
    text.includes('find') ||
    text.includes('notes') ||
    text.includes('pdf') ||
    text.includes('resource') ||
    text.includes('slides') ||
    text.includes('past paper')
  ) {
    try {
      const response = await resourcesAPI.list({ search: rawText, limit: 3 });
      const payload = response?.data?.data ?? response?.data ?? {};
      const results = Array.isArray(payload?.results) ? payload.results : [];
      if (results.length > 0) {
        const sources = results.slice(0, 3).map((item: any) => ({
          id: String(item?.id || ''),
          title: String(item?.title || 'Resource'),
          subtitle: String(item?.course?.name || item?.resource_type || 'CampusHub resource'),
        }));
        return {
          content:
            'The full AI service is unavailable right now, but I found a few matching resources you can open immediately.',
          sources,
          suggestedActions: ['Browse more resources', 'Open saved resources'],
        };
      }
    } catch {
      // Fall back to the generic helper below.
    }
  }

  return null;
};

export default function AIChatScreen() {
  const router = useRouter();
  const { prefill } = useLocalSearchParams<{ prefill?: string }>();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your CampusHub AI tutor. Think of me as a mini ChatGPT for your classes. I can find resources, summarize notes, explain topics, and suggest what to study next.",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isNewChat, setIsNewChat] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [cancelSource, setCancelSource] = useState<CancelTokenSource | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const prefillSentRef = useRef(false);

  // Cancel in-flight request on unmount to avoid leaks
  useEffect(() => {
    return () => {
      if (cancelSource) {
        cancelSource.cancel('Component unmounted');
      }
    };
  }, [cancelSource]);

  const handleSourcePress = async (source: MessageSource) => {
    if (source.route) {
      router.push(source.route as any);
      return;
    }

    if (source.id) {
      router.push(`/(student)/resource/${source.id}` as any);
      return;
    }

    if (source.url) {
      await Linking.openURL(source.url);
    }
  };

  const sendMessage = useCallback(async (text: string, { clearContext = false } = {}) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const source = axios.CancelToken.source();
      setCancelSource(source);
      const response = await aiAPI.chat(text, {
        clear_context: clearContext || isNewChat,
        cancelToken: source.token,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data?.message || "I'm sorry, I couldn't process that request.",
        sources: response.data?.sources || [],
        suggestedActions: response.data?.suggested_actions || [],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsNewChat(false);
    } catch (error: any) {
      if (axios.isCancel(error)) {
        return;
      }
      const fallback = await buildLocalHelpReply(text);
      const backendError =
        error?.response?.data?.error?.message ||
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message;
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          fallback?.content ||
          backendError ||
          "I'm having trouble connecting. Please try again.",
        sources: fallback?.sources,
        suggestedActions:
          fallback?.suggestedActions ||
          ['Browse resources', 'Open support'],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setCancelSource(null);
    }
  }, [isNewChat, loading]);

  // Auto-run a prefill prompt once (for deep links like AI notes)
  useEffect(() => {
    if (prefill && !prefillSentRef.current) {
      prefillSentRef.current = true;
      void sendMessage(String(prefill), { clearContext: true });
    }
  }, [prefill, sendMessage]);

  const regenerateLast = async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser || loading) return;

    // Remove the most recent assistant reply so the new one replaces it
    setMessages((prev) => {
      const reversedIndex = [...prev].reverse().findIndex((m) => m.role === 'assistant');
      if (reversedIndex === -1) return prev;
      const removeIndex = prev.length - 1 - reversedIndex;
      return prev.filter((_, idx) => idx !== removeIndex);
    });

    setRegenerating(true);
    await sendMessage(lastUser.content, { clearContext: false });
    setRegenerating(false);
  };

  const handleStop = () => {
    if (cancelSource) {
      cancelSource.cancel('User stopped generation');
    }
  };

  const handleVoiceInput = async () => {
    try {
      if (isRecording) {
        // Stop recording
        const audioUri = await voiceService.stopRecording();
        setIsRecording(false);

        if (audioUri) {
          // For now, we'll use a placeholder for speech-to-text
          // In a real implementation, you'd send the audio to a speech-to-text API
          setInputText('Voice input recorded. Speech-to-text integration needed.');
        }
      } else {
        // Start recording
        const started = await voiceService.startRecording();
        if (started) {
          setIsRecording(true);
        } else {
          Alert.alert(
            'Permission Required',
            'Please grant microphone permission to use voice input.'
          );
        }
      }
    } catch (error) {
      console.error('Voice input error:', error);
      setIsRecording(false);
      Alert.alert('Error', 'Failed to process voice input.');
    }
  };

  const handleSpeakMessage = async (text: string) => {
    try {
      if (isSpeaking) {
        await voiceService.stopSpeaking();
        setIsSpeaking(false);
      } else {
        setIsSpeaking(true);
        await voiceService.speak(text, {
          language: 'en-US',
          pitch: 1.0,
          rate: 0.9,
        });
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.role === 'user' ? styles.userMessage : styles.assistantMessage,
      ]}
    >
      {item.role === 'assistant' && (
        <View style={styles.avatar}>
          <Icon name="chatbubbles" size={16} color={colors.primary[500]} />
        </View>
      )}
      <View
        style={[
          styles.messageBubble,
          item.role === 'user' ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            item.role === 'user' ? styles.userText : styles.assistantText,
          ]}
        >
          {item.content}
        </Text>
        {item.sources && item.sources.length > 0 && (
          <View style={styles.sourcesContainer}>
            <Text style={styles.sourcesLabel}>Sources</Text>
            {item.sources.slice(0, 4).map((source, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.sourceItem}
                onPress={() => {
                  void handleSourcePress(source);
                }}
                disabled={!source.route && !source.id && !source.url}
              >
                <View style={styles.sourceTextWrap}>
                  <Text
                    style={styles.sourceTitle}
                    numberOfLines={1}
                  >
                    {source.title || source.url || 'Reference'}
                  </Text>
                  {!!source.subtitle && (
                    <Text style={styles.sourceSubtitle} numberOfLines={1}>
                      {source.subtitle}
                    </Text>
                  )}
                </View>
                {(source.route || source.id || source.url) && (
                  <Icon name="chevron-forward" size={14} color={colors.primary[500]} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
        {item.suggestedActions && item.suggestedActions.length > 0 && (
          <View style={styles.suggestedContainer}>
            {item.suggestedActions.slice(0, 4).map((action, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.suggestedChip}
                onPress={() => sendMessage(action)}
              >
                <Text style={styles.suggestedText}>{action}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {item.role === 'assistant' && (
          <TouchableOpacity
            style={styles.speakButton}
            onPress={() => handleSpeakMessage(item.content)}
          >
            <Icon
              name={isSpeaking ? 'pause' : 'play'}
              size={16}
              color={colors.primary[500]}
            />
            <Text style={styles.speakButtonText}>
              {isSpeaking ? 'Pause' : 'Listen'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Icon name="chatbubbles" size={24} color={colors.primary[500]} />
          <Text style={styles.headerTitleText}>AI Assistant</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setMessages([{
              id: '1',
              role: 'assistant',
              content: "New chat started. I'm a mini ChatGPT for CampusHub — ask me anything!",
              timestamp: new Date(),
            }]);
            setIsNewChat(true);
          }}
          style={styles.clearButton}
        >
          <Icon name="refresh" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListFooterComponent={loading ? (
          <View style={[styles.messageContainer, styles.assistantMessage]}>
            <View style={styles.avatar}>
              <Icon name="chatbubbles" size={16} color={colors.primary[500]} />
            </View>
            <View style={[styles.messageBubble, styles.assistantBubble, styles.typingBubble]}>
              <ActivityIndicator size="small" color={colors.primary[500]} />
              <Text style={styles.typingText}>Thinking…</Text>
            </View>
          </View>
        ) : null}
      />

      {/* Quick Actions (shown when input is empty) */}
          {!inputText && messages.length < 3 && (
            <View style={styles.quickActions}>
              <Text style={styles.quickActionsTitle}>Quick Questions</Text>
              <View style={styles.quickActionsGrid}>
                {QUICK_ACTIONS.slice(0, 4).map((action, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.quickActionButton}
                    onPress={() => sendMessage(action)}
                    disabled={loading}
                  >
                    <Text style={styles.quickActionText}>{action}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={[
              styles.voiceButton,
              isRecording && styles.voiceButtonActive,
            ]}
            onPress={handleVoiceInput}
            disabled={loading}
          >
            <Icon
              name={isRecording ? 'close' : 'mic'}
              size={20}
              color={isRecording ? colors.error : colors.text.secondary}
            />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Ask me anything..."
            placeholderTextColor={colors.text.tertiary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || loading) && styles.sendButtonDisabled,
            ]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.text.inverse} />
            ) : (
              <Icon name="send" size={20} color={colors.text.inverse} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sendButton,
              styles.regenButton,
              (!messages.some((m) => m.role === 'user') || loading) && styles.sendButtonDisabled,
            ]}
            onPress={regenerateLast}
            disabled={!messages.some((m) => m.role === 'user') || loading}
          >
            {regenerating ? (
              <ActivityIndicator size="small" color={colors.text.inverse} />
            ) : (
              <Icon name="refresh" size={18} color={colors.text.inverse} />
            )}
          </TouchableOpacity>
          {loading && (
            <TouchableOpacity
              style={[styles.sendButton, styles.stopButton]}
              onPress={handleStop}
            >
              <Icon name="close" size={18} color={colors.text.inverse} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    paddingTop: spacing[8],
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing[1],
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  clearButton: {
    padding: spacing[1],
  },
  messagesList: {
    padding: spacing[4],
    paddingBottom: spacing[2],
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: spacing[3],
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[2],
  },
  messageBubble: {
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    maxWidth: '100%',
  },
  userBubble: {
    backgroundColor: colors.primary[500],
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: colors.background.primary,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: colors.text.inverse,
  },
  assistantText: {
    color: colors.text.primary,
  },
  sourcesContainer: {
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  sourcesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  sourceItem: {
    marginTop: spacing[1.5],
    paddingVertical: spacing[1.5],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  sourceTextWrap: {
    flex: 1,
  },
  sourceTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
  sourceSubtitle: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 2,
  },
  suggestedContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  suggestedChip: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  suggestedText: {
    fontSize: 12,
    color: colors.text.primary,
    fontWeight: '600',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  typingText: {
    color: colors.text.secondary,
    fontSize: 13,
  },
  quickActions: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  quickActionsTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  quickActionButton: {
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  quickActionText: {
    fontSize: 12,
    color: colors.text.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing[3],
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: spacing[2],
  },
  input: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: 15,
    color: colors.text.primary,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  regenButton: {
    backgroundColor: colors.text.tertiary,
  },
  sendButtonDisabled: {
    backgroundColor: colors.text.tertiary,
  },
  stopButton: {
    backgroundColor: colors.error,
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[2],
  },
  voiceButtonActive: {
    backgroundColor: colors.error + '20',
    borderWidth: 2,
    borderColor: colors.error,
  },
  speakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  speakButtonText: {
    marginLeft: spacing[1],
    fontSize: 12,
    color: colors.primary[500],
    fontWeight: '600',
  },
});
