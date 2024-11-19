import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, getDocs, where, doc, getDoc, updateDoc } from 'firebase/firestore';
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
    try {
      const matchResults = await calculateMatchScore(auth.currentUser.uid);
      console.log('Match results:', matchResults); // Debug log
      setMatches(matchResults);
      setError(null);
    } catch (error) {
      console.error('Error fetching matches:', error);
      setError('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const handleUserConnect = useCallback((userId: string) => {
    const selectedUser = matches.find(match => match.userId === userId);
    if (selectedUser) {
      navigation.navigate('MyWall', {
        userId,
        username: selectedUser.username,
        matchScore: selectedUser.score
      });
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
});

export default CinePalScreen;
