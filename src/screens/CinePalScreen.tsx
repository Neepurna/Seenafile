import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, getDocs, where, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { calculateMatchScore } from '../utils/matchingUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChatList from '../components/ChatList';
import { useNavigation, NavigationProp } from '@react-navigation/native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const STORAGE_KEY = '@connected_users';

type CinePalScreenProps = {
  navigation: NavigationProp<TabsStackParamList>;
};

const CinePalScreen: React.FC<CinePalScreenProps> = ({ navigation }) => {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    if (!auth.currentUser) return;
    
    loadStoredData();
    fetchMatches();
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
      // First, get current user's movies
      const currentUserMoviesRef = collection(db, 'users', auth.currentUser.uid, 'movies');
      const currentUserMoviesSnap = await getDocs(currentUserMoviesRef);
      
      console.log('Debug - Current user movies:', {
        uid: auth.currentUser.uid,
        movieCount: currentUserMoviesSnap.size,
        movies: currentUserMoviesSnap.docs.map(doc => doc.id)
      });
      
      setDebugInfo(`Current user has ${currentUserMoviesSnap.size} movies`);
      
      if (currentUserMoviesSnap.empty) {
        setDebugInfo('You need to add some movies first!');
        setMatches([]);
        return;
      }

      const usersRef = collection(db, 'users');
      const usersQuery = query(
        usersRef,
        where('__name__', '!=', auth.currentUser.uid)
      );
      
      const usersSnap = await getDocs(usersQuery);
      console.log(`Found ${usersSnap.size} potential matches`);
      
      const matchPromises = usersSnap.docs.map(async (userDoc) => {
        try {
          // Get complete user data including profile fields
          const userData = userDoc.data();
          const userProfileDoc = await getDoc(doc(db, 'users', userDoc.id));
          const userProfile = userProfileDoc.data();
          
          console.log('Debug - User data:', {
            userId: userDoc.id,
            userData,
            userProfile
          });
          
          const moviesRef = collection(userDoc.ref, 'movies');
          const moviesSnap = await getDocs(moviesRef);
          
          if (!moviesSnap.empty) {
            let matchScore;
            try {
              matchScore = await calculateMatchScore(auth.currentUser!.uid, userDoc.id);
              
              if (!matchScore || typeof matchScore.score !== 'number') {
                console.error('Invalid match score structure:', matchScore);
                return null;
              }

              // Use proper user data fields
              const username = 
                userProfile?.username || // First try username from profile
                userProfile?.displayName || // Then displayName from profile
                userData?.username || // Then username from user data
                userData?.displayName || // Then displayName from user data
                'Movie Enthusiast'; // Fallback

              const debugDetails = `
                User: ${username}
                Movies: ${moviesSnap.size}
                Common Movies: ${matchScore.commonMovies?.length || 0}
                Score: ${matchScore.score}%
              `;
              console.log(debugDetails);

              return {
                userId: userDoc.id,
                username,
                email: userProfile?.email || userData?.email,
                photoURL: userProfile?.photoURL || userData?.photoURL,
                score: matchScore.score,
                commonMovies: matchScore.commonMovies,
                moviesCount: moviesSnap.size,
                debugDetails
              };
            } catch (error) {
              console.error('Match calculation error:', error);
              return null;
            }
          }
          return null;
        } catch (error) {
          console.error('User processing error:', error);
          return null;
        }
      });

      const matchResults = (await Promise.all(matchPromises))
        .filter(match => match !== null && match.score > 0)  // Only show matches with scores
        .sort((a, b) => (b?.score || 0) - (a?.score || 0));

      console.log('Final filtered matches:', matchResults);
      setDebugInfo(prev => `${prev}\nProcessed matches: ${matchResults.length}`);
      setMatches(matchResults);
      setError(null);
    } catch (error) {
      const errorMessage = `Error fetching matches: ${error}`;
      console.error('fetchMatches error details:', error);
      setError(errorMessage);
      setDebugInfo(errorMessage);
    } finally {
      setLoading(false);
    }
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

      // Navigate to UserProfileChat instead of MovieChat
      navigation.navigate('UserProfileChat', {
        userId,
        username: matchedUser.username || 'Movie Enthusiast',
        chatId,
      });

    } catch (error) {
      console.error('Error connecting users:', error);
      Alert.alert('Error', 'Unable to connect with user');
    }
  }, [matches, navigation]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#BB86FC" />
      </View>
    );
  }

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
      <ScrollView style={styles.scrollView}>
        {__DEV__ && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>{debugInfo}</Text>
            <TouchableOpacity 
              style={styles.debugButton} 
              onPress={() => fetchMatches()}
            >
              <Text style={styles.debugButtonText}>Refresh Matches</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Your Movie Matches</Text>
          <Text style={styles.headerSubtitle}>Connect with cinema enthusiasts who share your taste</Text>
        </View>
        
        <View style={styles.matchesContainer}>
          {matches.map((match) => (
            <TouchableOpacity 
              key={match.userId} 
              style={styles.matchCard}
              onPress={() => handleUserConnect(match.userId)}
            >
              <View style={styles.matchHeader}>
                <View style={styles.userInfo}>
                  <View style={styles.avatarContainer}>
                    <MaterialIcons name="person" size={30} color="#BB86FC" />
                  </View>
                  <View style={styles.nameSection}>
                    <Text style={styles.username}>{match.username || 'Movie Enthusiast'}</Text>
                    <Text style={styles.matchScore}>
                      {Math.round(match.score)}% Match
                    </Text>
                  </View>
                </View>
                <MaterialIcons 
                  name={connectedUsers.includes(match.userId) ? "chat" : "add-circle"} 
                  size={24} 
                  color="#BB86FC" 
                />
              </View>

              <View style={styles.commonMoviesSection}>
                <Text style={styles.sectionTitle}>Common Interests</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.commonMoviesScroll}
                >
                  {match.commonMovies.slice(0, 5).map((movie, idx) => (
                    <View key={idx} style={styles.movieTag}>
                      <Text style={styles.movieTagText}>{movie.category}</Text>
                    </View>
                  ))}
                  {match.commonMovies.length > 5 && (
                    <View style={[styles.movieTag, styles.moreTag]}>
                      <Text style={styles.movieTagText}>+{match.commonMovies.length - 5} more</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  headerSection: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#888',
  },
  matchesContainer: {
    gap: 16,
  },
  matchCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nameSection: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  matchScore: {
    fontSize: 14,
    color: '#BB86FC',
    fontWeight: '600',
  },
  commonMoviesSection: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  commonMoviesScroll: {
    flexDirection: 'row',
  },
  movieTag: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  movieTagText: {
    color: '#fff',
    fontSize: 12,
  },
  moreTag: {
    backgroundColor: '#333',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF5252',
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#BB86FC',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  debugContainer: {
    padding: 10,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    marginBottom: 16,  },  debugText: {    color: '#BB86FC',    fontSize: 12,    fontFamily: 'monospace',  },  debugButton: {    backgroundColor: '#BB86FC',    padding: 8,    borderRadius: 4,    marginTop: 8,
  },
  debugButtonText: {
    color: '#000',
    textAlign: 'center',
  },
});

export default CinePalScreen;
