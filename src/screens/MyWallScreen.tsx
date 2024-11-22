import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, onSnapshot, addDoc, orderBy, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { RouteProp } from '@react-navigation/native';
import { TextInput } from 'react-native-gesture-handler';

type MyWallScreenProps = {
  route: RouteProp<TabsStackParamList, 'MyWall'>;
  navigation: any;
};

const MyWallScreen: React.FC<MyWallScreenProps> = ({ route, navigation }) => {
  const { userId, username, matchScore } = route.params;
  const [userStats, setUserStats] = useState({
    favoriteGenres: [],
    totalMoviesWatched: 0,
    reviewsWritten: 0,
    averageRating: 0,
    watchlist: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('Profile');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchUserStats();

    if (!auth.currentUser?.uid || !userId) return;

    const messagesRef = collection(db, 'chats');
    const chatId = [auth.currentUser.uid, userId].sort().join('_');
    const chatDocRef = doc(messagesRef, chatId);
    const messagesCollectionRef = collection(chatDocRef, 'messages');
    
    const q = query(
      messagesCollectionRef,
      orderBy('timestamp', 'asc') // Changed to ascending order
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      }));
      setMessages(messageData);
    }, (error) => {
      console.error('Error fetching messages:', error);
      // Handle error state if needed
    });

    return () => unsubscribe();
  }, [userId]);

  const fetchUserStats = async () => {
    try {
      const userRef = collection(db, 'users');
      const userQuery = query(userRef, where('userId', '==', userId));
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        setUserStats({
          favoriteGenres: userData.favoriteGenres || [],
          totalMoviesWatched: userData.moviesWatched?.length || 0,
          reviewsWritten: userData.reviews?.length || 0,
          averageRating: userData.averageRating || 0,
          watchlist: userData.watchlist || [],
          recentActivity: userData.recentActivity || []
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !auth.currentUser) return;

    try {
      const chatId = [auth.currentUser.uid, userId].sort().join('_');
      const messagesRef = collection(db, 'chats');
      const chatDocRef = doc(messagesRef, chatId);
      const messagesCollectionRef = collection(chatDocRef, 'messages');

      // Ensure chat document exists
      await setDoc(chatDocRef, {
        participants: [auth.currentUser.uid, userId],
        lastMessage: newMessage.trim(),
        lastMessageTime: serverTimestamp(),
      }, { merge: true });

      // Add new message
      await addDoc(messagesCollectionRef, {
        text: newMessage.trim(),
        senderId: auth.currentUser.uid,
        timestamp: serverTimestamp(),
        read: false,
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      // Could add error alert here
    }
  };

  const renderProfileContent = () => (
    <View style={styles.profileContent}>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <MaterialIcons name="movie" size={24} color="#BB86FC" />
          <Text style={styles.statNumber}>{userStats.totalMoviesWatched}</Text>
          <Text style={styles.statLabel}>Movies Watched</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="rate-review" size={24} color="#BB86FC" />
          <Text style={styles.statNumber}>{userStats.reviewsWritten}</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="star" size={24} color="#BB86FC" />
          <Text style={styles.statNumber}>{userStats.averageRating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {userStats.recentActivity.map((activity, index) => (
          <View key={index} style={styles.activityItem}>
            <MaterialIcons 
              name={activity.type === 'watch' ? 'visibility' : 'rate-review'} 
              size={20} color="#BB86FC" 
            />
            <Text style={styles.activityText}>{activity.description}</Text>
            <Text style={styles.activityDate}>
              {new Date(activity.timestamp).toLocaleDateString()}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderChat = () => (
    <View style={styles.chatContainer}>
      <ScrollView 
        style={styles.messagesContainer}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message) => (
          <View 
            key={message.id}
            style={[
              styles.messageBox,
              message.senderId === auth.currentUser?.uid ? 
                styles.sentMessage : styles.receivedMessage
            ]}
          >
            <Text style={[
              styles.messageText,
              message.senderId === auth.currentUser?.uid ?
                styles.sentMessageText : styles.receivedMessageText
            ]}>
              {message.text}
            </Text>
            {message.timestamp && (
              <Text style={styles.messageTime}>
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit'
                })}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
      
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
          style={[
            styles.sendButton,
            !newMessage.trim() && styles.sendButtonDisabled
          ]}
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
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#BB86FC" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <MaterialIcons name="person" size={40} color="#BB86FC" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.username}>{username}</Text>
            <View style={styles.matchScoreContainer}>
              <MaterialIcons name="favorite" size={16} color="#BB86FC" />
              <Text style={styles.matchScore}>{Math.round(matchScore)}% Match</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.tabBar}>
        {['Profile', 'Chat'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <MaterialIcons
              name={tab === 'Profile' ? 'person' : 'chat'}
              size={24}
              color={activeTab === tab ? '#BB86FC' : '#666'}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {activeTab === 'Profile' ? renderProfileContent() : renderChat()}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    maxHeight: 80,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  matchScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchScore: {
    color: '#BB86FC',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  statCard: {
    alignItems: 'center',
    padding: 16,
  },
  statNumber: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  statLabel: {
    color: '#888',
    fontSize: 14,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreTag: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  genreText: {
    color: '#fff',
    fontSize: 14,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    marginBottom: 8,
  },
  activityText: {
    color: '#fff',
    flex: 1,
    marginLeft: 12,
  },
  activityDate: {
    color: '#888',
    fontSize: 12,
  },
  movieCard: {
    width: 150,
    height: 200,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    marginRight: 12,
    padding: 12,
    justifyContent: 'flex-end',
  },
  movieTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageBox: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#BB86FC',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E1E1E',
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
  },
  sentMessageText: {
    color: '#000',
  },
  receivedMessageText: {
    color: '#fff',
  },
  messageTime: {
    color: '#rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    color: '#fff',
    maxHeight: 100, // Limit input height
    minHeight: 40,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#BB86FC',
  },
  tabText: {
    color: '#666',
    fontSize: 16,
  },
  activeTabText: {
    color: '#BB86FC',
  },
});

export default MyWallScreen;
