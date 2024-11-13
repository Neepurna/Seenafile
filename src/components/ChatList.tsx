import React, { useState, useCallback, useEffect } from 'react';
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
  ToastAndroid,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from '../firebase';
import { collection, doc, getDoc, addDoc, query, orderBy, onSnapshot, setDoc, where, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  name: string;  // Changed from displayName to name
  photoURL: string;
  email: string;
}

interface ChatListProps {
  matches: Match[];
  currentUserId: string;
  selectedMatch?: Match | null;
  onSelectMatch?: (match: Match | null) => void;
  connectedUsers?: string[];
  onUserConnect?: (userId: string) => void;
}

const ChatList: React.FC<ChatListProps> = ({ 
  matches, 
  currentUserId, 
  selectedMatch: propSelectedMatch,
  onSelectMatch,
  connectedUsers = [],
  onUserConnect 
}) => {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(propSelectedMatch || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userDetails, setUserDetails] = useState<{ [key: string]: UserDetails }>({});
  const [showMatchNotification, setShowMatchNotification] = useState(false);
  const [newMatchUser, setNewMatchUser] = useState<UserDetails | null>(null);
  const [isLoadingPersisted, setIsLoadingPersisted] = useState(true);

  const fetchUserDetails = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('Fetched user data:', userData); // Debug log
        
        setUserDetails(prev => ({
          ...prev,
          [userId]: {
            name: userData.name || userData.displayName || 'Anonymous User', // Try both fields
            photoURL: userData.photoURL || 'https://via.placeholder.com/50',
            email: userData.email || ''
          }
        }));
      } else {
        console.log('No user document found for:', userId); // Debug log
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  useEffect(() => {
    const fetchAllUsers = async () => {
      const userPromises = matches.map(match => fetchUserDetails(match.userId));
      await Promise.all(userPromises);
    };
    
    fetchAllUsers();
  }, [matches]);

  // Modify this useEffect
  useEffect(() => {
    const checkNewMatches = async () => {
      const highMatches = matches.filter(match => match.score >= 30);
      if (highMatches.length > 0) {
        const lastMatch = highMatches[0];
        const matchUserDetails = userDetails[lastMatch.userId];
        if (matchUserDetails) {
          setNewMatchUser(matchUserDetails);
          setShowMatchNotification(true);
          // Removed ToastAndroid/Alert notification
        }
      }
    };

    checkNewMatches();
  }, [matches, userDetails]);

  useEffect(() => {
    // Listen for new matches
    if (!currentUserId) return;

    const matchesRef = collection(db, 'matches');
    const q = query(
      matchesRef,
      where('user2Id', '==', currentUserId),
      where('isNew', '==', true)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const matchData = change.doc.data();
          const userDoc = await getDoc(doc(db, 'users', matchData.user1Id));
          const userData = userDoc.data();

          if (userData) {
            setNewMatchUser({
              name: userData.name || userData.displayName || 'Anonymous User',
              photoURL: userData.photoURL || 'https://via.placeholder.com/50',
              email: userData.email || ''
            });
            setShowMatchNotification(true);
          }

          // Mark match as seen
          await updateDoc(change.doc.ref, { isNew: false });
        }
      });
    });

    return () => unsubscribe();
  }, [currentUserId]);

  const openChat = useCallback(async (match: Match) => {
    setSelectedMatch(match);
    await fetchUserDetails(match.userId);

    // Create or get chat document
    const chatId = [currentUserId, match.userId].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);
    
    try {
      // Create chat document if it doesn't exist
      await setDoc(chatRef, {
        participants: [currentUserId, match.userId],
        createdAt: new Date(),
        lastMessage: null
      }, { merge: true });

      // Subscribe to messages
      const messagesRef = collection(chatRef, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Message));
        setMessages(newMessages);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error opening chat:', error);
    }
  }, [currentUserId]);

  const sendMessage = async () => {
    if (!selectedMatch || !newMessage.trim()) return;

    const chatId = [currentUserId, selectedMatch.userId].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);
    const messagesRef = collection(chatRef, 'messages');

    try {
      // Create new message
      await addDoc(messagesRef, {
        text: newMessage.trim(),
        senderId: currentUserId,
        timestamp: new Date(),
      });

      // Update chat's lastMessage
      await setDoc(chatRef, {
        lastMessage: newMessage.trim(),
        lastMessageTime: new Date()
      }, { merge: true });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleSelectMatch = (match: Match) => {
    setSelectedMatch(match);
    if (onSelectMatch) {
      onSelectMatch(match);
    }
    if (onUserConnect && !connectedUsers.includes(match.userId)) {
      onUserConnect(match.userId);
    }
    openChat(match);
  };

  // Filter out invalid matches
  const validMatches = matches.filter(match => 
    match && 
    match.userId && 
    typeof match.score === 'number' && 
    Array.isArray(match.commonMovies) &&
    match.commonMovies.every(movie => 
      movie && 
      movie.movieId && 
      movie.title && 
      movie.category
    )
  );

  // Update the filtered matches threshold to 20%
  const filteredMatches = validMatches.filter(match => match.score >= 20);

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
            openChat(chatData.selectedMatch);
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
        await AsyncStorage.setItem('persistedChats', JSON.stringify(chatData));
      } catch (error) {
        console.error('Error persisting chat data:', error);
      }
    };

    if (!isLoadingPersisted) {
      persistChatData();
    }
  }, [messages, selectedMatch, isLoadingPersisted]);

  if (isLoadingPersisted) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#BB86FC" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.chatContainer}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 25}
      >
        {selectedMatch ? (
          <>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>
                {userDetails[selectedMatch.userId]?.name || 'Chat'}
              </Text>
            </View>

            <FlatList
              data={messages}
              inverted
              renderItem={({ item }) => (
                <View style={[
                  styles.messageContainer,
                  item.senderId === currentUserId ? styles.sentMessage : styles.receivedMessage
                ]}>
                  <Text style={[
                    styles.messageText,
                    item.senderId === currentUserId ? styles.sentMessageText : styles.receivedMessageText
                  ]}>{item.text}</Text>
                </View>
              )}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.messagesContainer}
            />

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                placeholderTextColor="#666"
                multiline={true}
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
                  color={newMessage.trim() ? "#BB86FC" : "#666"} 
                />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <FlatList
            data={sortedMatches}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[
                  styles.matchItem,
                  connectedUsers.includes(item.userId) && styles.connectedMatchItem
                ]}
                onPress={() => handleSelectMatch(item)}
              >
                <Image
                  source={{ uri: userDetails[item.userId]?.photoURL || 'https://via.placeholder.com/50' }}
                  style={styles.avatar}
                />
                <View style={styles.matchInfo}>
                  <Text style={styles.username}>
                    {userDetails[item.userId]?.name || 'Loading...'}
                    {connectedUsers.includes(item.userId) && 
                      <Text style={styles.connectedBadge}> • Connected</Text>
                    }
                  </Text>
                  <Text style={styles.matchScore}>
                    {item.score.toFixed(0)}% Match • {item.commonMovies.length} movies in common
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
              <Text style={styles.notificationTitle}>Congratulations! 🎉</Text>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  listContainer: {
    padding: 16,
  },
  matchItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  matchScore: {
    fontSize: 14,
    color: '#BB86FC',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    height: 60,
  },
  backButton: {
    marginRight: 16,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    margin: 4,
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#BB86FC',
    borderTopRightRadius: 4,
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 4,
  },
  sentMessageText: {
    color: '#000',
  },
  receivedMessageText: {
    color: '#FFF',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1E1E1E',
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    color: '#FFF',
    fontSize: 16,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  notificationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBox: {
    backgroundColor: '#1E1E1E',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: '80%',
  },
  notificationTitle: {
    color: '#BB86FC',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  notificationText: {
    color: '#FFF',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  notificationAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  notificationButton: {
    backgroundColor: '#BB86FC',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  notificationButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  connectedMatchItem: {
    borderColor: '#BB86FC',
    borderWidth: 1,
  },
  connectedBadge: {
    color: '#BB86FC',
    fontSize: 12,
    fontWeight: 'normal',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
});

export default ChatList;