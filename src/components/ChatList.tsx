import React, { useState, useCallback, useEffect, useRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Keyboard,
  StatusBar,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebase';
import {
  collection,
  doc,
  getDoc,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  setDoc,
  where,
  updateDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { 
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS
} from 'react-native-reanimated';
import { ChatEncryption } from '../utils/encryption';

const SEEN_MATCHES_KEY = '@seen_matches';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Date;
  read: boolean;
  isLike?: boolean; // Add this
  promptId?: string; // Add this
}

interface MovieMatch {
  movieId: string;
  title: string;
  category: string;
  poster_path: string;
  status: string;
  timestamp: Date;
}

interface Match {
  userId: string;
  score: number;
  commonMovies: MovieMatch[];
  displayName?: string;
  photoURL?: string;
  username?: string;
}

interface UserDetails {
  name: string;
  photoURL: string;
  email: string;
  lastActive?: number;
}

interface ChatListProps {
  matches: Match[];
  selectedMatch?: Match | null;
  onClose?: () => void;
  preserveNavigation?: boolean;
  hideBackButton?: boolean; // Add this prop
  selectedPrompt?: ChatPrompt | null;
  onPromptSelect?: (prompt: ChatPrompt | null) => void;
  showPrompts?: boolean;
  setShowPrompts?: (show: boolean) => void;
}

interface ChatPrompt {
  id: string;
  text: string;
}

// Add these after existing interfaces
const CHAT_PROMPTS: ChatPrompt[] = [
  { id: '1', text: "What's your favorite movie of all time?" },
  { id: '2', text: "Which director's work inspires you the most?" },
  { id: '3', text: "What's the last movie that made you cry?" },
  { id: '4', text: "Favorite movie snack combo?" },
  { id: '5', text: "What genre do you never get tired of?" }
];

// Add MessageItem component before ChatList component
const MessageItem = React.memo(({ 
  message, 
  currentUserId, 
  chatKey, 
  formatMessageTime 
}: { 
  message: Message;
  currentUserId: string;
  chatKey: string | null;
  formatMessageTime: (timestamp: any) => string;
}) => {
  const [decryptedText, setDecryptedText] = React.useState<string>(message.text || '🔄 Loading...');

  React.useEffect(() => {
    const decryptMessage = () => {
      try {
        if (!chatKey) {
          setDecryptedText(message.text || '');
          return;
        }

        if (!message.encryptedText || !message.iv) {
          // Handle legacy or unencrypted messages
          setDecryptedText(message.text || '');
          return;
        }

        const text = ChatEncryption.decryptMessage(
          message.encryptedText,
          message.iv,
          chatKey
        );
        setDecryptedText(text);
      } catch (error) {
        console.error('Error decrypting message:', error);
        setDecryptedText('🔒 Encrypted message');
      }
    };

    decryptMessage();
  }, [message, chatKey]);

  return (
    <View style={[
      styles.messageContainer,
      message.senderId === currentUserId ? styles.sentMessage : styles.receivedMessage,
    ]}>
      <Text style={[
        styles.messageText,
        message.senderId === currentUserId ? styles.sentMessageText : styles.receivedMessageText,
      ]}>
        {decryptedText}
      </Text>
      <Text style={styles.messageTimestamp}>
        {formatMessageTime(message.timestamp)}
        {message.senderId === currentUserId && (
          <Text> • {message.read ? 'Read' : 'Sent'}</Text>
        )}
      </Text>
    </View>
  );
}, (prevProps, nextProps) => {
  return prevProps.message.id === nextProps.message.id &&
         prevProps.message.read === nextProps.message.read;
});

const ChatList = React.forwardRef<any, ChatListProps>((props, ref) => {
  const currentUserId = auth.currentUser?.uid;

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(
    props.selectedMatch || null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userDetails, setUserDetails] = useState<{ [key: string]: UserDetails }>(
    {}
  );
  const [showMatchNotification, setShowMatchNotification] = useState(false);
  const [newMatchUser, setNewMatchUser] = useState<UserDetails | null>(null);
  const [isLoadingPersisted, setIsLoadingPersisted] = useState(true);
  const [seenMatches, setSeenMatches] = useState<string[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<ChatPrompt | null>(null);
  const [chatKey, setChatKey] = useState<string | null>(null);
  
  const messagesListRef = useRef<FlatList>(null);
  const unsubscribeRefs = useRef<(() => void)[]>([]);

  const translateX = useSharedValue(0);
  const context = useSharedValue({ x: 0 });

  // Add gesture handler for swipe
  const panGesture = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.x = translateX.value;
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.x + event.translationX;
    },
    onEnd: (event) => {
      if (event.translationX > 100) {
        translateX.value = withSpring(400);
        if (props.onClose) {
          runOnJS(props.onClose)();
        }
      } else {
        translateX.value = withSpring(0);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const fetchUserDetails = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();

        setUserDetails((prev) => ({
          ...prev,
          [userId]: {
            name:
              userData.name || userData.displayName || 'Anonymous User',
            photoURL: userData.photoURL || null,
            email: userData.email || '',
            lastActive: userData.lastActive || Date.now(),
          },
        }));
      } else {
        console.log('No user document found for:', userId);
      }
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        console.warn('Permission denied for user:', userId);
        // Set a placeholder for users we can't access
        setUserDetails((prev) => ({
          ...prev,
          [userId]: {
            name: 'User',
            photoURL: null,
            email: '',
            lastActive: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
          },
        }));
      } else {
        console.error('Error fetching user details:', error);
      }
    }
  };

  useEffect(() => {
    const fetchAllUsers = async () => {
      const userPromises = props.matches.map((match) =>
        fetchUserDetails(match.userId)
      );
      await Promise.all(userPromises);
    };

    fetchAllUsers();
  }, [props.matches]);

  useEffect(() => {
    const loadSeenMatches = async () => {
      try {
        const stored = await AsyncStorage.getItem(SEEN_MATCHES_KEY);
        if (stored) {
          setSeenMatches(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error loading seen matches:', error);
      }
    };
    loadSeenMatches();
  }, []);

  useEffect(() => {
    const checkNewMatches = async () => {
      const highMatches = props.matches.filter(
        (match) => match.score >= 30 && !seenMatches.includes(match.userId)
      );

      if (highMatches.length > 0) {
        const lastMatch = highMatches[0];
        const matchUserDetails = userDetails[lastMatch.userId];
        if (matchUserDetails) {
          setNewMatchUser(matchUserDetails);
          setShowMatchNotification(true);

          // Add to seen matches
          const updatedSeenMatches = [...seenMatches, lastMatch.userId];
          setSeenMatches(updatedSeenMatches);
          await AsyncStorage.setItem(
            SEEN_MATCHES_KEY,
            JSON.stringify(updatedSeenMatches)
          );
        }
      }
    };

    checkNewMatches();
  }, [props.matches, userDetails, seenMatches]);

  useEffect(() => {
    // Listen for new matches
    if (!currentUserId) return;

    const matchesRef = collection(db, 'matches');
    const q = query(
      matchesRef,
      where('user2Id', '==', currentUserId),
      where('isNew', '==', true)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const matchData = change.doc.data();
            const userDoc = await getDoc(doc(db, 'users', matchData.user1Id));
            const userData = userDoc.data();

            if (userData) {
              setNewMatchUser({
                name:
                  userData.name ||
                  userData.displayName ||
                  'Anonymous User',
                photoURL:
                  userData.photoURL || null,
                email: userData.email || '',
              });
              setShowMatchNotification(true);
            }

            // Mark match as seen
            await updateDoc(change.doc.ref, { isNew: false });
          }
        });
      },
      (error) => {
        if (error.code === 'permission-denied') {
          console.warn('Permission denied in match listener:', error);
        } else {
          console.error('Error in match listener:', error);
        }
      }
    );

    // Store unsubscribe function
    unsubscribeRefs.current.push(unsubscribe);

    return () => {
      unsubscribe();
      unsubscribeRefs.current = unsubscribeRefs.current.filter(
        (fn) => fn !== unsubscribe
      );
    };
  }, [currentUserId]);

  useEffect(() => {
    const keyboardWillShow = (e: any) => {
      setKeyboardHeight(e.endCoordinates.height);
    };

    const keyboardWillHide = () => {
      setKeyboardHeight(0);
    };

    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      keyboardWillShow
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      keyboardWillHide
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Add resetChat method
  const resetChat = useCallback(() => {
    setSelectedMatch(null);
    setMessages([]);
    setNewMessage('');
    setPermissionError(null);
    // Clean up listeners
    unsubscribeRefs.current.forEach((unsubscribe) => unsubscribe());
    unsubscribeRefs.current = [];
  }, []);

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    selectMatch: handleSelectMatch,
    resetChat
  }));

  // Modify handleSelectMatch to initialize chat key immediately
  const handleSelectMatch = async (match: Match) => {
    try {
      if (!currentUserId || !match.userId) return;
      
      setIsLoading(true);
      setMessages([]); // Clear previous messages

      // Clean up previous listeners
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
      unsubscribeRefs.current = [];

      // Create unique chat ID
      const chatId = [currentUserId, match.userId].sort().join('_');
      const chatRef = doc(db, 'chats', chatId);
      
      // Initialize chat and get/create encryption key
      const chatDoc = await getDoc(chatRef);
      let encryptionKey = chatDoc.exists() ? chatDoc.data()?.encryptionKey : null;
      
      if (!encryptionKey) {
        encryptionKey = await ChatEncryption.generateChatKey();
      }

      // Set chat data with encryption key
      await setDoc(chatRef, {
        participants: [currentUserId, match.userId].sort(),
        createdAt: new Date(),
        lastMessage: null,
        lastMessageTime: null,
        encryptionKey,
      }, { merge: true });

      // Set the chat key immediately
      setChatKey(encryptionKey);
      
      // Set up real-time listener for messages
      const messagesRef = collection(chatRef, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }) as Message);
        setMessages(newMessages);
        
        // Mark received messages as read
        snapshot.docs.forEach(async (doc) => {
          const messageData = doc.data();
          if (messageData.senderId !== currentUserId && !messageData.read) {
            await updateDoc(doc.ref, { read: true });
          }
        });
        
        if (messagesListRef.current) {
          messagesListRef.current.scrollToEnd({ animated: false });
        }
      });

      // Store unsubscribe function
      unsubscribeRefs.current.push(unsubscribe);
      
      setSelectedMatch(match);
      setPermissionError(null);
      
    } catch (error: any) {
      console.error('Error setting up chat:', error);
      setPermissionError('Failed to initialize chat. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Modify sendMessage to add retry logic
  const sendMessage = useCallback(async () => {
    if (!selectedMatch?.userId || !currentUserId) {
      console.error('Missing user IDs');
      return;
    }
  
    if (!chatKey) {
      console.log('Chat key missing, reinitializing...');
      await handleSelectMatch(selectedMatch);
      return;
    }
  
    const text = selectedPrompt?.text || newMessage.trim();
    if (!text) return;
  
    try {
      setIsLoading(true);
      const chatId = [currentUserId, selectedMatch.userId].sort().join('_');
      const chatRef = doc(db, 'chats', chatId);
  
      // Double-check chat key
      const chatDoc = await getDoc(chatRef);
      const existingKey = chatDoc.data()?.encryptionKey;
      
      // Use existing key or current key
      const finalChatKey = existingKey || chatKey;
  
      // Encrypt the message - Make sure to await the result
      const { encryptedText, iv } = await ChatEncryption.encryptMessage(text, finalChatKey);
      
      if (!encryptedText || !iv) {
        throw new Error('Encryption failed');
      }

      const messagesRef = collection(chatRef, 'messages');
      const messageData = {
        encryptedText,
        iv,
        senderId: currentUserId,
        timestamp: new Date(),
        read: false,
        promptId: selectedPrompt?.id || null,
      };
  
      // Add message and update chat metadata
      await Promise.all([
        addDoc(messagesRef, messageData),
        updateDoc(chatRef, {
          lastMessage: text,
          lastMessageTime: messageData.timestamp,
          lastSenderId: currentUserId,
        })
      ]);
  
      // Clear input
      setNewMessage('');
      setSelectedPrompt(null);
      setShowPrompts(false);
  
      // Scroll to bottom
      setTimeout(() => {
        messagesListRef.current?.scrollToEnd({ animated: true });
      }, 100);
  
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMatch, currentUserId, chatKey, newMessage, selectedPrompt]);
  

  const handlePromptSelect = useCallback((prompt: ChatPrompt) => {
    setSelectedPrompt(prompt);
    setShowPrompts(false);
    // Use setTimeout to ensure state is updated
    setTimeout(() => {
      sendMessage();
    }, 100);
  }, [sendMessage]);

  // Function to generate active status text
  const getActiveStatus = (lastActive?: number) => {
    if (!lastActive) return "";
    
    const now = Date.now();
    const diffInMinutes = Math.floor((now - lastActive) / (1000 * 60));
    
    if (diffInMinutes < 5) return "Active now";
    if (diffInMinutes < 60) return `Active ${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `Active ${Math.floor(diffInMinutes / 60)}h ago`;
    return `Active ${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Filter out invalid matches
  const validMatches = props.matches.filter(
    (match) =>
      match &&
      match.userId &&
      typeof match.score === 'number'
  );

  // Update the filtered matches threshold to 20%
  const filteredMatches = validMatches.filter(
    (match) => match.score >= 20
  );

  // Format timestamp
  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Filter matches to show connected users first
  const sortedMatches = [...filteredMatches].sort((a, b) => {
    const aConnected = connectedUsers.includes(a.userId);
    const bConnected = connectedUsers.includes(b.userId);
    if (aConnected && !bConnected) return -1;
    if (!aConnected && bConnected) return 1;
    return b.score - a.score;
  });

  useEffect(() => {
    const loadPersistedChats = async () => {
      try {
        const persistedChats = await AsyncStorage.getItem('persistedChats');
        if (persistedChats) {
          const chatData = JSON.parse(persistedChats);
          // Update local state with persisted data
          setMessages(chatData.messages || []);
          if (chatData.selectedMatch) {
            setSelectedMatch(chatData.selectedMatch);
            handleSelectMatch(chatData.selectedMatch);
          }
        }
      } catch (error) {
        console.error('Error loading persisted chats:', error);
      } finally {
        setIsLoadingPersisted(false);
      }
    };

    loadPersistedChats();
  }, []);

  useEffect(() => {
    const persistChatData = async () => {
      try {
        const chatData = {
          messages,
          selectedMatch,
        };
        await AsyncStorage.setItem(
          'persistedChats',
          JSON.stringify(chatData)
        );
      } catch (error) {
        console.error('Error persisting chat data:', error);
      }
    };

    if (!isLoadingPersisted) {
      persistChatData();
    }
  }, [messages, selectedMatch, isLoadingPersisted]);

  // Clean up listeners on unmount or when currentUserId changes
  useEffect(() => {
    return () => {
      unsubscribeRefs.current.forEach((unsubscribe) => unsubscribe());
      unsubscribeRefs.current = [];
    };
  }, [currentUserId]);

  // Clean up when user logs out
  useEffect(() => {
    if (!currentUserId) {
      // User has logged out
      // Clean up listeners
      unsubscribeRefs.current.forEach((unsubscribe) => unsubscribe());
      unsubscribeRefs.current = [];
      // Reset state
      setSelectedMatch(null);
      setMessages([]);
      setUserDetails({});
      setNewMessage('');
      setPermissionError(null);
    }
  }, [currentUserId]);

  const handleBack = () => {
    if (props.onClose && props.preserveNavigation) {
      props.onClose();
    } else {
      navigation.goBack();
    }
  };

  const handleUnmatch = async (matchUserId: string) => {
    if (!currentUserId) return;
    
    try {
      const chatId = [currentUserId, matchUserId].sort().join('_');
      const chatRef = doc(db, 'chats', chatId);
      
      // Delete chat messages
      const messagesRef = collection(chatRef, 'messages');
      const messagesSnapshot = await getDocs(messagesRef);
      const batch = writeBatch(db);
      
      messagesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete chat document
      batch.delete(chatRef);
      
      // Remove match from both users
      const matchRef = doc(db, 'matches', `${currentUserId}_${matchUserId}`);
      batch.delete(matchRef);
      
      await batch.commit();
      setSelectedMatch(null);
    } catch (error) {
      console.error('Error unmatching:', error);
      Alert.alert('Error', 'Failed to unmatch. Please try again.');
    }
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubble-ellipses-outline" size={60} color="#555" />
      <Text style={styles.emptyTitle}>No matches yet</Text>
      <Text style={styles.emptyText}>
        You need at least 20% compatibility to match with other cinema enthusiasts.
      </Text>
    </View>
  );

  const renderMessage = useCallback(({ item }: { item: Message }) => (
    <MessageItem
      message={item}
      currentUserId={currentUserId || ''}
      chatKey={chatKey}
      formatMessageTime={formatMessageTime}
    />
  ), [currentUserId, chatKey, formatMessageTime]);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 80, // Approximate height of message item
    offset: 80 * index,
    index,
  }), []);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const renderChat = () => {
    if (permissionError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{permissionError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setPermissionError(null);
              if (selectedMatch) {
                handleSelectMatch(selectedMatch);
              }
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const matchUserDetails = selectedMatch ? userDetails[selectedMatch.userId] : null;

    return (
      <View style={styles.chatContainer}>
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity 
            style={styles.userInfoContainer}
            onPress={() => {
              // You could add a profile view here
              if (selectedMatch && onUserConnect) {
                onUserConnect(selectedMatch.userId);
              }
            }}
          >
            <View style={styles.chatAvatarContainer}>
              {matchUserDetails?.photoURL ? (
                <Image
                  source={{ uri: matchUserDetails.photoURL }}
                  style={styles.chatAvatar}
                />
              ) : (
                <View style={styles.chatAvatarPlaceholder}>
                  <Text style={styles.chatAvatarText}>
                    {(matchUserDetails?.name?.charAt(0) || '').toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.chatTitleContainer}>
              <Text style={styles.chatTitle} numberOfLines={1}>
                {matchUserDetails?.name || selectedMatch?.username || 'Chat'}
              </Text>
              <Text style={styles.chatSubtitle} numberOfLines={1}>
                {getActiveStatus(matchUserDetails?.lastActive)}
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.chatOptionsButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Main Chat Area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            ref={messagesListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            contentContainerStyle={styles.messagesContentContainer}
            showsVerticalScrollIndicator={false}
            onLayout={() => {
              messagesListRef.current?.scrollToEnd({ animated: false });
            }}
            onContentSizeChange={() => {
              messagesListRef.current?.scrollToEnd({ animated: true });
            }}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 10,
            }}
          />

          {/* Message Input */}
          {renderInputSection()}
        </KeyboardAvoidingView>
      </View>
    );
  };

  const renderInputSection = () => (
    <View style={styles.inputWrapper}>
      <View style={styles.inputContainer}>
        <TouchableOpacity 
          style={styles.inputActionButton}
          onPress={() => setShowPrompts(true)}
        >
          <Ionicons name="help-circle-outline" size={24} color="#777" />
        </TouchableOpacity>
        
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor="#777"
          multiline
          maxLength={1000}
        />
        
        {(newMessage.trim() || selectedPrompt) && (
          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendMessage}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderPrompts = () => (
    <Modal
      visible={showPrompts}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPrompts(false)}
    >
      <View style={styles.promptsOverlay}>
        <View style={styles.promptsContainer}>
          <View style={styles.promptsHeader}>
            <Text style={styles.promptsTitle}>Start the conversation</Text>
            <TouchableOpacity onPress={() => setShowPrompts(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={CHAT_PROMPTS}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.promptItem}
                onPress={() => handlePromptSelect(item)}
              >
                <Text style={styles.promptText}>{item.text}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={item => item.id}
          />
        </View>
      </View>
    </Modal>
  );

  const renderMatchItem = ({ item }: { item: Match }) => {
    const details = userDetails[item.userId] || {};
    const hasUnreadMessages = false; // This would need logic to check for unread messages
    
    return (
      <TouchableOpacity
        style={styles.matchItem}
        onPress={() => handleSelectMatch(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrapper}>
          {details.photoURL ? (
            <Image
              source={{ uri: details.photoURL }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {(details.name?.charAt(0) || item.username?.charAt(0) || '').toUpperCase()}
              </Text>
            </View>
          )}
          
          {/* Online indicator */}
          {getActiveStatus(details.lastActive) === "Active now" && (
            <View style={styles.onlineIndicator} />
          )}
        </View>
        
        <View style={styles.matchInfo}>
          <View style={styles.nameContainer}>
            <Text style={styles.username} numberOfLines={1}>
              {details.name || item.username || 'User'}
            </Text>
            <Text style={styles.matchTime}>
              {Math.round(item.score)}% match
            </Text>
          </View>
          
          <View style={styles.previewContainer}>
            <Text 
              style={[
                styles.messagePreview,
                hasUnreadMessages && styles.unreadPreview
              ]}
              numberOfLines={1}
            >
              {hasUnreadMessages ? 'New message' : 'Tap to start chatting'}
            </Text>
            
            {hasUnreadMessages && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>1</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoadingPersisted) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PanGestureHandler onGestureEvent={panGesture}>
        <Animated.View style={[{ flex: 1 }, animatedStyle]}>
          <SafeAreaView style={styles.container}>
            {/* Remove the back button from header */}
            {selectedMatch ? (
              renderChat()
            ) : (
              <>
                <View style={styles.header}>
                  <Text style={styles.headerTitle}>Chats</Text>
                </View>
                {/* Rest of the chat list code */}
                <FlatList
                  data={sortedMatches}
                  renderItem={renderMatchItem}
                  keyExtractor={(item) => item.userId}
                  contentContainerStyle={styles.listContainer}
                  ListEmptyComponent={EmptyState}
                />
              </>
            )}
            {/* Rest of the components */}
            {/* Match Notification Modal */}
            <Modal
              visible={showMatchNotification}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowMatchNotification(false)}
            >
              <View style={styles.notificationOverlay}>
                <View style={styles.notificationBox}>
                  <Ionicons name="checkmark-circle" size={40} color="#fff" />
                  <Text style={styles.notificationTitle}>
                    New Match!
                  </Text>
                  <Text style={styles.notificationText}>
                    You matched with {newMatchUser?.name || "a new user"}
                  </Text>
                  
                  <View style={styles.notificationAvatarContainer}>
                    {newMatchUser?.photoURL ? (
                      <Image
                        source={{ uri: newMatchUser.photoURL }}
                        style={styles.notificationAvatar}
                      />
                    ) : (
                      <View style={styles.notificationAvatarPlaceholder}>
                        <Text style={styles.notificationAvatarText}>
                          {(newMatchUser?.name?.charAt(0) || '').toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  <TouchableOpacity
                    style={styles.notificationButton}
                    onPress={() => setShowMatchNotification(false)}
                  >
                    <Text style={styles.notificationButtonText}>Start Chatting</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
            
            {/* Loading overlay */}
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}

            {renderPrompts()}
          </SafeAreaView>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    // Add padding at the bottom to account for tab bar
    paddingBottom: Platform.OS === 'ios' ? 85 : 60,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  listContainer: {
    flexGrow: 1,
    padding: 0,
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#121212',
  },
  matchInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  matchTime: {
    color: '#777',
    fontSize: 12,
  },
  previewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messagePreview: {
    color: '#777',
    fontSize: 14,
    flex: 1,
  },
  unreadPreview: {
    color: '#ddd',
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: '#fff',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#121212',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    padding: 5,
  },
  userInfoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 5,
  },
  chatAvatarContainer: {
    marginRight: 12,
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  chatAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatTitleContainer: {
    flex: 1,
  },
  chatTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  chatSubtitle: {
    color: '#777',
    fontSize: 12,
  },
  chatOptionsButton: {
    padding: 5,
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  messagesContentContainer: {
    flexGrow: 1,
    paddingHorizontal: 10,
    // Add padding at the bottom to ensure last message is visible
    paddingBottom: Platform.OS === 'ios' ? 80 : 60,
  },
  messageContainer: {
    maxWidth: '75%',
    marginVertical: 2,
    padding: 10,
    borderRadius: 18,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#333',
    borderBottomRightRadius: 4,
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#222',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
  },
  sentMessageText: {
    color: '#fff',
  },
  receivedMessageText: {
    color: '#fff',
  },
  messageTimestamp: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
  inputWrapper: {
    width: '100%',
    padding: 10,
    backgroundColor: '#121212',
    // Adjust padding to account for tab bar
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 24,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12,
    maxHeight: 100,
  },
  inputActionButton: {
    padding: 5,
  },
  sendButton: {
    padding: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
  },
  emptyText: {
    color: '#777',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF5252',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#BB86FC',
    padding: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  notificationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBox: {
    backgroundColor: '#222',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: '80%',
  },
  notificationTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
  notificationText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  notificationAvatarContainer: {
    marginBottom: 16,
  },
  notificationAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  notificationAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationAvatarText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  notificationButton: {
    backgroundColor: '#BB86FC',
    padding: 12,
    borderRadius: 8,
    width: '100%',
  },
  notificationButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  promptsContainer: {
    backgroundColor: '#222',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  promptsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  promptsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  promptItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  promptText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default ChatList;
