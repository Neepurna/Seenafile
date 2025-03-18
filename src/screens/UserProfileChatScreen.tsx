import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  FlatList, 
  Dimensions,
  StatusBar,
  Animated,
  Platform,
  Modal
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { collection, query, getDocs, doc, getDoc, where } from 'firebase/firestore';
import ChatList from '../components/ChatList';
import { UserProfileChatScreenProps } from '../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 250;
const HEADER_MIN_HEIGHT = Platform.OS === 'ios' ? 90 : 70;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

const GRID_SPACING = 16;
const NUM_COLUMNS = 2;
const FOLDER_WIDTH = (width - (GRID_SPACING * 3)) / NUM_COLUMNS;
const THUMBNAILS_PER_FOLDER = 2; // Changed to 2 thumbnails per folder
const THUMBNAIL_SIZE = (FOLDER_WIDTH - 24) / 2; // Adjust size for 2 thumbnails

interface FolderData {
  id: string;
  name: string;
  color: string;
  count: number;
  icon: string;
}

interface MovieThumbnail {
  id: string;
  poster_path: string;
}

interface FolderDataWithThumbs extends FolderData {
  thumbnails: MovieThumbnail[];
}

const folders: FolderData[] = [
  { id: 'watched', name: 'Watched', color: '#4BFF4B', count: 0, icon: 'checkmark-circle' },
  { id: 'most_watch', name: 'Most Watched', color: '#FFD700', count: 0, icon: 'repeat' },
  { id: 'watch_later', name: 'Watch Later', color: '#00BFFF', count: 0, icon: 'time' },
  { id: 'critics', name: 'Critics', color: '#FF4081', count: 0, icon: 'star' },
];

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Date;
  read: boolean;
  promptId?: string | null; // Add this to match ChatList.tsx
  isLike?: boolean; // Add this to match ChatList.tsx
}

// Add ChatPrompt interface
interface ChatPrompt {
  id: string;
  text: string;
}

// Add chat prompts constant
const CHAT_PROMPTS: ChatPrompt[] = [
  { id: '1', text: "What's your favorite movie of all time?" },
  { id: '2', text: "Which director's work inspires you the most?" },
  { id: '3', text: "What's the last movie that made you cry?" },
  { id: '4', text: "Favorite movie snack combo?" },
  { id: '5', text: "What genre do you never get tired of?" }
];

const UserProfileChatScreen: React.FC<UserProfileChatScreenProps> = ({ route, navigation }) => {
  // Add validation at the start
  useEffect(() => {
    if (!route.params?.userId) {
      console.error('No userId provided to UserProfileChatScreen');
      navigation.goBack();
      return;
    }
  }, []);

  // Destructure with default values
  const { 
    userId = '', 
    username = 'User', 
    chatId = '',
    photoURL,
    email 
  } = route?.params || {};

  const [userProfile, setUserProfile] = useState<any>({
    photoURL,
    email,
    username
  });

  const [folderCounts, setFolderCounts] = useState<{ [key: string]: number }>({});
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollY = new Animated.Value(0);
  const [folderThumbnails, setFolderThumbnails] = useState<{ [key: string]: MovieThumbnail[] }>({});
  const [isFullScreenChat, setIsFullScreenChat] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<ChatPrompt | null>(null);
  const [showPrompts, setShowPrompts] = useState(false);

  useEffect(() => {
    fetchUserProfile();
    fetchMovieCounts();
    fetchFolderThumbnails();
  }, []);

  const fetchUserProfile = async () => {
    if (!userId) return;
    
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        setUserProfile(prev => ({
          ...prev,
          ...userDoc.data()
        }));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchMovieCounts = async () => {
    if (!userId) return;
    
    try {
      // Use the profile owner's userId instead of current user
      const userRef = doc(db, 'users', userId);
      const moviesRef = collection(userRef, 'movies');
      const snapshot = await getDocs(moviesRef);
      
      const counts = {
        watched: 0,
        most_watch: 0,
        watch_later: 0,
        critics: 0
      };

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const category = data.category;
        if (category && counts.hasOwnProperty(category)) {
          counts[category]++;
        }
      });

      setFolderCounts(counts);
    } catch (error) {
      console.error('Error fetching movie counts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolderThumbnails = async () => {
    if (!userId) return;

    try {
      // Use the profile owner's userId instead of current user
      const userRef = doc(db, 'users', userId);
      const moviesRef = collection(userRef, 'movies');
      const snapshot = await getDocs(moviesRef);
      
      const thumbsByFolder: { [key: string]: MovieThumbnail[] } = {};
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.category && data.poster_path) {
          if (!thumbsByFolder[data.category]) {
            thumbsByFolder[data.category] = [];
          }
          if (thumbsByFolder[data.category].length < THUMBNAILS_PER_FOLDER) {
            thumbsByFolder[data.category].push({
              id: doc.id,
              poster_path: data.poster_path
            });
          }
        }
      });

      setFolderThumbnails(thumbsByFolder);
    } catch (error) {
      console.error('Error fetching thumbnails:', error);
    }
  };

  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const headerContentOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const handleNavigateToMovieGrid = (params: any) => {
    console.log('Navigating to MovieGridScreen with userId:', userId);
    navigation.navigate('MovieGridScreen', {
      ...params,
      userId: userId, // Ensure userId is passed
      fromScreen: 'UserProfileChat',
      previousScreen: 'UserProfile'
    });
  };

  const handleCloseChat = () => {
    setIsFullScreenChat(false);
    setTimeout(() => {
      setShowChat(false);
    }, 300);
  };

  const handleChatPress = () => {
    if (!showChat) {
      setShowChat(true);
      setSelectedPrompt(null); // Reset prompt when opening chat
      setTimeout(() => setIsFullScreenChat(true), 100);
    } else {
      setIsFullScreenChat(false);
      setTimeout(() => {
        setShowChat(false);
        setSelectedPrompt(null); // Reset prompt when closing chat
      }, 300);
    }
  };

  const handleChatBack = () => {
    setIsFullScreenChat(false);
    setTimeout(() => {
      setShowChat(false);
    }, 300);
  };

  const renderFolder = ({ item }: { item: FolderData }) => {
    const count = folderCounts[item.id] || 0;
    const isDisabled = count === 0;
    const thumbs = folderThumbnails[item.id] || [];
  
    return (
      <TouchableOpacity 
        style={[
          styles.folderItem,
          { opacity: isDisabled ? 0.5 : 1 }
        ]}
        onPress={() => {
          if (!isDisabled) {
            handleNavigateToMovieGrid({ 
              folderId: item.id,
              folderName: item.name,
              folderColor: item.color,
              userId: userId, // Explicitly pass userId
              isCritics: item.id === 'critics'
            });
          }
        }}
        disabled={isDisabled}
      >
        <View style={styles.folderContent}>
          <View style={styles.folderHeader}>
            <View style={styles.folderIconContainer}>
              <Ionicons name={item.icon as any} size={24} color="#fff" />
            </View>
            <View style={styles.folderInfo}>
              <Text style={styles.folderName}>{item.name}</Text>
              <Text style={styles.folderCount}>
                {count} {item.id === 'critics' ? 'reviews' : 'movies'}
              </Text>
            </View>
          </View>
          
          <View style={styles.thumbnailsRow}>
            {thumbs.slice(0, THUMBNAILS_PER_FOLDER).map((thumb, index) => (
              <View key={thumb.id} style={styles.thumbnailWrapper}>
                <Image
                  source={{ uri: `https://image.tmdb.org/t/p/w92${thumb.poster_path}` }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              </View>
            ))}
            {count > THUMBNAILS_PER_FOLDER && (
              <View style={styles.moreIndicator}>
                <Text style={styles.moreIndicatorText}>+{count - THUMBNAILS_PER_FOLDER}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderBackground = () => {
    return (
      <View style={styles.fullScreenBackground}>
        <Image
          source={require('../../assets/background.jpg')}
          style={styles.backgroundImage}
          blurRadius={15}
        />
        <View style={styles.backgroundOverlay} />
      </View>
    );
  };

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
                onPress={() => {
                  setSelectedPrompt(item);
                  setShowPrompts(false);
                }}
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {renderBackground()}

      {/* Static Layout */}
      <View style={styles.content}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {userProfile?.photoURL ? (
              <Image source={{ uri: userProfile.photoURL }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileImageText}>
                  {username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.userName}>{username}</Text>
          <Text style={styles.userEmail}>{userProfile?.email}</Text>
          <Text style={styles.bioText}>
            {userProfile?.bio || "This user hasn't added a bio yet 🎬"}
          </Text>
        </View>

        {/* Collections Grid */}
        <View style={styles.collectionsContainer}>
          <Text style={styles.sectionTitle}>Movie Collections</Text>
          <FlatList
            data={folders}
            renderItem={renderFolder}
            keyExtractor={item => item.id}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.gridRow}
          />
        </View>
      </View>

      {/* Chat Button and Section */}
      {!isFullScreenChat && (
        <TouchableOpacity 
          style={styles.chatButton}
          onPress={handleChatPress}
        >
          <Ionicons 
            name={showChat ? "close" : "chatbubble"} 
            size={24} 
            color="#fff" 
          />
        </TouchableOpacity>
      )}

      {showChat && (
        <Animated.View style={[
          styles.chatSection,
          isFullScreenChat ? styles.chatSectionFullscreen : styles.chatSectionNormal
        ]}>
          <View style={styles.chatHeader}>
            {isFullScreenChat && (
              <TouchableOpacity 
                style={styles.minimizeButton}
                onPress={handleCloseChat}
              >
                <Ionicons name="chevron-down" size={24} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={styles.maximizeButton}
              onPress={() => setIsFullScreenChat(true)}
            >
              {!isFullScreenChat && (
                <Ionicons name="expand" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          
          <ChatList 
            matches={[{ userId, username }]}
            selectedMatch={{ userId, username }}
            onClose={handleChatBack}
            preserveNavigation={true}
            hideBackButton={true} // Add this prop
            selectedPrompt={selectedPrompt}
            onPromptSelect={setSelectedPrompt}
            showPrompts={showPrompts}
            setShowPrompts={setShowPrompts}
          />
          
          {renderPrompts()}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    // Ensure content is above tab bar
    position: 'relative',
    zIndex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: 1,
  },
  headerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: HEADER_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
  },
  backButton: {
    padding: 8,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#888',
  },
  scrollView: {
    flex: 1,
    marginTop: HEADER_MAX_HEIGHT,
  },
  contentContainer: {
    padding: 16,
  },
  bioSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  bioText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 20,
  },
  collectionsContainer: {
    flex: 1,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  folderItem: {
    width: FOLDER_WIDTH,
    aspectRatio: 1, // Make it square
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
  },
  folderContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(51, 51, 51, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  folderCount: {
    fontSize: 14,
    color: '#888',
  },
  thumbnailsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  thumbnailWrapper: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE * 1.5,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  moreIndicator: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moreIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatButton: {
    position: 'absolute',
    right: 16,
    bottom: 76, // Adjusted to be above tab bar
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(51, 51, 51, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1,
  },
  chatSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    zIndex: 2,
    // Add transition properties
    transition: 'all 0.3s ease-in-out',
  },

  chatSectionNormal: {
    bottom: 60,
    height: '65%',
  },

  chatSectionFullscreen: {
    top: 0,
    bottom: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },

  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },

  minimizeButton: {
    padding: 8,
  },

  maximizeButton: {
    padding: 8,
    alignSelf: 'flex-end',
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a1a',
    opacity: 0.98, // Adjust this value for desired transparency
  },
  fullScreenBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    opacity: 0.5,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  contentGradient: {
    flex: 1,
    paddingTop: HEADER_MAX_HEIGHT,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  profileSection: {
    height: '35%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: GRID_SPACING,
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

export default UserProfileChatScreen;
