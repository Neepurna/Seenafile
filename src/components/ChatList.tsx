// chatlist.tsx

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  useWindowDimensions,
  Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SEEN_MATCHES_KEY = '@seen_matches';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Date;
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
}

interface UserDetails {
  name: string;
  photoURL: string;
  email: string;
}

interface ChatListProps {
  matches: Match[];
  selectedMatch?: Match | null;
  onSelectMatch?: (match: Match | null) => void;
  connectedUsers?: string[];
  onUserConnect?: (userId: string) => void;
}

const ChatList: React.FC<ChatListProps> = ({
  matches,
  selectedMatch: propSelectedMatch,
  onSelectMatch,
  connectedUsers = [],
  onUserConnect,
}) => {
  const currentUserId = auth.currentUser?.uid;

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(
    propSelectedMatch || null
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
  const messagesListRef = useRef<FlatList>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Store unsubscribe functions
  const unsubscribeRefs = useRef<(() => void)[]>([]);

  const fetchUserDetails = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();

        setUserDetails((prev) => ({
          ...prev,
          [userId]: {
            name:
              userData.name || userData.displayName || 'Anonymous User', // Try both fields
            photoURL: userData.photoURL || 'https://via.placeholder.com/50',
            email: userData.email || '',
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
            photoURL: 'https://via.placeholder.com/50',
            email: '',
          },
        }));
      } else {
        console.error('Error fetching user details:', error);
      }
    }
  };

  useEffect(() => {
    const fetchAllUsers = async () => {
      const userPromises = matches.map((match) =>
        fetchUserDetails(match.userId)
      );
      await Promise.all(userPromises);
    };

    fetchAllUsers();
  }, [matches]);

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
      const highMatches = matches.filter(
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
  }, [matches, userDetails, seenMatches]);

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
                  userData.photoURL || 'https://via.placeholder.com/50',
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
      // Remove the unsubscribe function from the array
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

  const handleSelectMatch = async (match: Match) => {
    try {
      // Unsubscribe from previous chat listener
      if (unsubscribeRefs.current.length > 0) {
        unsubscribeRefs.current.forEach((unsubscribe) => unsubscribe());
        unsubscribeRefs.current = [];
      }

      // Reset messages when selecting new match
      setMessages([]);
      setSelectedMatch(match);
      setPermissionError(null);

      if (onSelectMatch) {
        onSelectMatch(match);
      }

      if (onUserConnect && !connectedUsers.includes(match.userId)) {
        onUserConnect(match.userId);
      }

      if (!currentUserId) return;

      // Setup chat listener
      const chatId = [currentUserId, match.userId].sort().join('_');
      const chatRef = doc(db, 'chats', chatId);
      const messagesRef = collection(chatRef, 'messages');

      // Create chat document if it doesn't exist
      await setDoc(
        chatRef,
        {
          participants: [currentUserId, match.userId].sort(),
          createdAt: new Date(),
          lastMessage: null,
          lastMessageTime: null,
        },
        { merge: true }
      );

      // Listen to messages
      const q = query(messagesRef, orderBy('timestamp', 'asc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const newMessages = snapshot.docs.map(
            (doc) =>
              ({
                id: doc.id,
                ...doc.data(),
              } as Message)
          );
          setMessages(newMessages);
        },
        (error) => {
          if (error.code === 'permission-denied') {
            setPermissionError(
              'Unable to access this chat. Please try again later.'
            );
          } else {
            console.error('Error in chat listener:', error);
          }
        }
      );

      // Store unsubscribe function
      unsubscribeRefs.current.push(unsubscribe);
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        setPermissionError('Unable to access this chat. Please try again later.');
      } else {
        console.error('Error setting up chat:', error);
      }
    }
  };

  const sendMessage = async () => {
    if (!selectedMatch || !newMessage.trim() || !currentUserId) return;

    const chatId = [currentUserId, selectedMatch.userId].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);
    const messagesRef = collection(chatRef, 'messages');

    try {
      // Create new message document
      const messageData = {
        text: newMessage.trim(),
        senderId: currentUserId,
        timestamp: new Date(),
        read: false,
      };

      await addDoc(messagesRef, messageData);

      // Update chat document
      await updateDoc(chatRef, {
        lastMessage: newMessage.trim(),
        lastMessageTime: new Date(),
        lastSenderId: currentUserId,
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      // Show error to user
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  // Filter out invalid matches
  const validMatches = matches.filter(
    (match) =>
      match &&
      match.userId &&
      typeof match.score === 'number' &&
      Array.isArray(match.commonMovies) &&
      match.commonMovies.every(
        (movie) =>
          movie && movie.movieId && movie.title && movie.category
      )
  );

  // Update the filtered matches threshold to 20%
  const filteredMatches = validMatches.filter(
    (match) => match.score >= 20
  );

  // Update empty state message
  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        No matches yet! You need at least 20% compatibility to match.
      </Text>
    </View>
  );

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

    return (
      <View style={styles.chatContainer}>
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedMatch(null)}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.chatTitle}>
            {userDetails[selectedMatch?.userId]?.name || 'Chat'}
          </Text>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 150 : 120}
        >
          <View style={styles.chatContentContainer}>
            <FlatList
              ref={messagesListRef}
              data={messages}
              inverted={false}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.messageContainer,
                    item.senderId === currentUserId
                      ? styles.sentMessage
                      : styles.receivedMessage,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      item.senderId === currentUserId
                        ? styles.sentMessageText
                        : styles.receivedMessageText,
                    ]}
                  >
                    {item.text}
                  </Text>
                </View>
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[
                styles.messagesContentContainer,
                {
                  flexGrow: 1,
                  justifyContent: 'flex-end',
                  paddingBottom:
                    Platform.OS === 'ios'
                      ? keyboardHeight + 90
                      : keyboardHeight + 60,
                },
              ]}
              onLayout={() => {
                messagesListRef.current?.scrollToEnd({ animated: false });
              }}
              onContentSizeChange={() => {
                messagesListRef.current?.scrollToEnd({ animated: true });
              }}
            />
          </View>

          <View
            style={[
              styles.inputWrapper,
              Platform.OS === 'android' && {
                position: 'absolute',
                bottom: keyboardHeight > 0 ? keyboardHeight + 30 : 0,
                left: 0,
                right: 0,
                backgroundColor: '#1E1E1E',
              },
            ]}
          >
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                placeholderTextColor="#666"
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={sendMessage}
                disabled={!newMessage.trim()}
              >
                <MaterialIcons
                  name="send"
                  size={24}
                  color={newMessage.trim() ? '#BB86FC' : '#666'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  };

  if (isLoadingPersisted) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size={24} color="#BB86FC" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {selectedMatch ? (
        renderChat()
      ) : (
        <FlatList
          data={sortedMatches}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.matchItem,
                connectedUsers.includes(item.userId) &&
                  styles.connectedMatchItem,
              ]}
              onPress={() => handleSelectMatch(item)}
            >
              <Image
                source={{
                  uri:
                    userDetails[item.userId]?.photoURL ||
                    'https://via.placeholder.com/50',
                }}
                style={styles.avatar}
              />
              <View style={styles.matchInfo}>
                <Text style={styles.username}>
                  {userDetails[item.userId]?.name || 'Loading...'}
                  {connectedUsers.includes(item.userId) && (
                    <Text style={styles.connectedBadge}> • Connected</Text>
                  )}
                </Text>
                <Text style={styles.matchScore}>
                  {item.score.toFixed(0)}% Match •{' '}
                  {item.commonMovies.length} movies in common
                </Text>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={EmptyState}
        />
      )}

      {/* Match Notification Modal */}
      <Modal
        visible={showMatchNotification}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMatchNotification(false)}
      >
        <View style={styles.notificationOverlay}>
          <View style={styles.notificationBox}>
            <Text style={styles.notificationTitle}>
              Congratulations! 🎉
            </Text>
            <Text style={styles.notificationText}>
              You matched with {newMatchUser?.name}!
            </Text>
            <Image
              source={{ uri: newMatchUser?.photoURL }}
              style={styles.notificationAvatar}
            />
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => setShowMatchNotification(false)}
            >
              <Text style={styles.notificationButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flexGrow: 1,
    padding: 16,
  },
  matchItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  connectedMatchItem: {
    backgroundColor: '#3C3C3C',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  matchInfo: {
    flex: 1,
  },
  username: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  matchScore: {
    color: '#BB86FC',
    fontSize: 14,
  },
  connectedBadge: {
    color: '#4CAF50',
    fontSize: 14,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2C2C2C',
  },
  backButton: {
    marginRight: 16,
  },
  chatTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  chatContentContainer: {
    flex: 1,
  },
  messagesContentContainer: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 16,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#BB86FC',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#2C2C2C',
  },
  messageText: {
    fontSize: 16,
  },
  sentMessageText: {
    color: '#000',
  },
  receivedMessageText: {
    color: '#FFF',
  },
  inputWrapper: {
    width: '100%',
    padding: 16,
    backgroundColor: '#1E1E1E',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2C',
    borderRadius: 24,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    paddingVertical: 12,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 8,
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
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
    backgroundColor: '#2C2C2C',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: '80%',
  },
  notificationTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
  notificationText: {
    color: '#FFF',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  notificationAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
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
});

export default ChatList;
