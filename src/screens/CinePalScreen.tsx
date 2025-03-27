import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  Dimensions, 
  ActivityIndicator, 
  Alert,
  StatusBar,
  Platform
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, getDocs, where, doc, getDoc, updateDoc, setDoc, limit } from 'firebase/firestore';
import { calculateMatchScore } from '../utils/matchingUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChatList from '../components/ChatList';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const STORAGE_KEY = '@connected_users';

type CinePalScreenProps = {
  navigation: NavigationProp<TabsStackParamList>;
};

const CinePalScreen: React.FC<CinePalScreenProps> = ({ navigation }) => {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    if (!auth.currentUser) return;
    
    let timeoutId: number;

    const fetchData = async () => {
      setLoading(true);
      
      try {
        timeoutId = window.setTimeout(() => {
          setLoading(false);
          setError('Request timed out. Please try again.');
        }, 15000);

        await loadStoredData();
        await fetchMatches();
        
        if (timeoutId) window.clearTimeout(timeoutId);
      } catch (error) {
        if (timeoutId) window.clearTimeout(timeoutId);
        console.error('Error in CinePal data fetching:', error);
        setError('Failed to load matches. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData().catch(error => {
      console.error('Fetch error:', error);
      setLoading(false);
    });

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  const loadStoredData = async () => {
    try {
      const storedUsers = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedUsers) {
        setConnectedUsers(JSON.parse(storedUsers));
      }
    } catch (error) {
      console.error('Error loading stored data:', error);
    }
  };

  const fetchMatches = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    setDebugInfo('Starting match calculation...');
    
    try {
      // First, get current user's movies and validate their count
      const currentUserMoviesRef = collection(db, 'users', auth.currentUser.uid, 'movies');
      const currentUserMoviesSnap = await getDocs(currentUserMoviesRef);
      
      console.log('Debug - Current user movies:', {
        uid: auth.currentUser.uid,
        movieCount: currentUserMoviesSnap.size,
      });

      // Changed threshold for testing
      const minMoviesTotal = 100; // Reduced from 150 for testing
      const minCollectionSize = 25;
      
      if (currentUserMoviesSnap.size < minMoviesTotal) {
        setDebugInfo(`You need at least ${minMoviesTotal} movies to see matches!`);
        console.log('User does not have enough total movies:', currentUserMoviesSnap.size);
        setMatches([]);
        return;
      }

      // Get current user's collection counts with debug logging
      const currentUserCollections = {
        watched: 0,
        most_watch: 0, // Changed from must_watch to most_watch
        watch_later: 0
      };

      currentUserMoviesSnap.docs.forEach(doc => {
        const data = doc.data();
        const category = data.category;
        if (currentUserCollections.hasOwnProperty(category)) {
          currentUserCollections[category]++;
        }
      });

      console.log('Current user collections:', currentUserCollections);

      // Modified collection requirement check with detailed logging
      const collectionsValid = 
        currentUserCollections.watched >= minCollectionSize &&
        currentUserCollections.most_watch >= minCollectionSize &&
        currentUserCollections.watch_later >= minCollectionSize;

      if (!collectionsValid) {
        setDebugInfo(`Each collection needs ${minCollectionSize}+ movies. Current counts: Watched=${currentUserCollections.watched}, Most Watch=${currentUserCollections.most_watch}, Watch Later=${currentUserCollections.watch_later}`);
        console.log('Collections do not meet minimum requirements:', currentUserCollections);
        setMatches([]);
        return;
      }

      const usersRef = collection(db, 'users');
      const usersQuery = query(
        usersRef,
        where('__name__', '!=', auth.currentUser.uid),
        limit(20)
      );
      
      const usersSnap = await getDocs(usersQuery);
      console.log(`Found ${usersSnap.size} potential matches to process`);
      
      const matchPromises = usersSnap.docs.map(async (userDoc) => {
        try {
          const otherUserMoviesRef = collection(userDoc.ref, 'movies');
          const otherUserMoviesSnap = await getDocs(otherUserMoviesRef);
          
          // Initialize otherUserCollections here
          const otherUserCollections = {
            watched: 0,
            most_watch: 0,
            watch_later: 0
          };

          // Count movies in each category
          otherUserMoviesSnap.docs.forEach(doc => {
            const category = doc.data().category;
            if (otherUserCollections.hasOwnProperty(category)) {
              otherUserCollections[category]++;
            }
          });

          // Check minimum requirements for other user
          const minMoviesTotal = 100;
          const minCollectionSize = 25;

          if (otherUserMoviesSnap.size < minMoviesTotal) {
            return null;
          }

          // Check if other user meets collection requirements
          if (Object.values(otherUserCollections).some(count => count < minCollectionSize)) {
            return null;
          }

          // Continue with existing match calculation code
          const userData = userDoc.data();
          const userProfileDoc = await getDoc(doc(db, 'users', userDoc.id));
          const userProfile = userProfileDoc.data();

          // More specific username extraction
          let username = null;
          if (userProfile) {
            username = userProfile.displayName || userProfile.username || userProfile.name;
          }
          if (!username && userData) {
            username = userData.displayName || userData.username || userData.name;
          }
          if (!username) {
            username = userDoc.id.substring(0, 8); // Use part of user ID as fallback
          }

          const matchScore = await calculateMatchScore(auth.currentUser!.uid, userDoc.id);
          
          if (!matchScore || typeof matchScore.score !== 'number') {
            console.error('Invalid match score structure:', matchScore);
            return null;
          }

          return {
            userId: userDoc.id,
            username,
            email: userProfile?.email || userData?.email,
            photoURL: userProfile?.photoURL || userData?.photoURL,
            score: matchScore.score,
            commonMovies: matchScore.commonMovies,
            moviesCount: otherUserMoviesSnap.size,
            collections: otherUserCollections,
            lastActive: userProfile?.lastActive || userData?.lastActive || Date.now(),
          };
        } catch (error) {
          console.error('User processing error:', error);
          return null;
        }
      });

      const matchResults = await Promise.race([
        Promise.all(matchPromises),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Match calculation timed out')), 10000)
        )
      ]);

      // Filter out null results and sort by match score (highest first)
      const validMatches = matchResults.filter(Boolean);
      validMatches.sort((a, b) => b.score - a.score);
      
      setMatches(validMatches);
      
    } catch (error) {
      const errorMessage = `Error fetching matches: ${error}`;
      console.error('fetchMatches error details:', error);
      setError(errorMessage);
      setDebugInfo(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMatches();
  };

  const handleUserConnect = useCallback(async (userId: string) => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to connect with users');
      return;
    }
    
    try {
      const chatId = [auth.currentUser.uid, userId].sort().join('_');
      const matchedUser = matches.find(match => match.userId === userId);
      
      if (!matchedUser) {
        throw new Error('User details not found');
      }

      // Update navigation to use nested stack
      navigation.navigate('UserProfile', {
        screen: 'UserProfileMain',
        params: {
          userId: matchedUser.userId,
          username: matchedUser.username || 'Movie Enthusiast',
          chatId: chatId,
          photoURL: matchedUser.photoURL,
          email: matchedUser.email
        }
      });

    } catch (error) {
      console.error('Error connecting users:', error);
      Alert.alert('Error', 'Unable to connect with user');
    }
  }, [matches, navigation]);

  // Function to generate active status text
  const getActiveStatus = (lastActive: number) => {
    const now = Date.now();
    const diffInMinutes = Math.floor((now - lastActive) / (1000 * 60));
    
    if (diffInMinutes < 5) return "Active now";
    if (diffInMinutes < 60) return `Active ${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `Active ${Math.floor(diffInMinutes / 60)}h ago`;
    return `Active ${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const renderMatchItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.matchItem}
      onPress={() => handleUserConnect(item.userId)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={['#120E43', '#3A0CA3']}
        style={styles.avatarGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.avatarContainer}>
          {item.photoURL ? (
            <Image source={{ uri: item.photoURL }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{item.username?.charAt(0).toUpperCase() || 'M'}</Text>
          )}
        </View>
      </LinearGradient>
      
      <View style={styles.matchInfoContainer}>
        <Text style={styles.username}>{item.username || 'Movie Enthusiast'}</Text>
        <Text style={styles.statusText}>
          {getActiveStatus(item.lastActive)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchMatches}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Movie Matches</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={loading || refreshing}
        >
          {loading || refreshing ? (
            <ActivityIndicator size="small" color="#BB86FC" />
          ) : (
            <Ionicons name="refresh" size={24} color="#BB86FC" />
          )}
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#BB86FC" />
          <Text style={styles.loadingText}>Finding your movie matches...</Text>
        </View>
      ) : (
        <>
          {matches.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="movie-filter" size={60} color="#555" />
              <Text style={styles.emptyTitle}>No matches found</Text>
              <Text style={styles.emptySubtitle}>
                Add more movies to your profile to find matches with similar taste
              </Text>
              <TouchableOpacity
                style={styles.addMoviesButton}
                onPress={() => navigation.navigate('CineBrowse')}
              >
                <Text style={styles.addMoviesButtonText}>Find Movies</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={matches}
              renderItem={renderMatchItem}
              keyExtractor={(item) => item.userId}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={10}
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          )}
        </>
      )}
      
      {__DEV__ && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugText} numberOfLines={2}>{debugInfo}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    // Add padding to ensure content is above tab bar
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 15,
    borderBottomColor: '#222',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  matchItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  avatarGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#BB86FC',
  },
  matchInfoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#888',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    color: '#999',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  errorText: {
    color: '#FF5252',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#BB86FC',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  addMoviesButton: {
    backgroundColor: '#BB86FC',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addMoviesButtonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugContainer: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#2A2A2A',
    opacity: 0.7,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  debugText: {
    color: '#BB86FC',
    fontSize: 10,
    fontFamily: 'monospace',
  },
});

export default CinePalScreen;
