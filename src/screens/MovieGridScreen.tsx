import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  Image, 
  ActivityIndicator,
  Text,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { auth, db } from '../firebase';
import { doc, collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
const { width } = Dimensions.get('window');
const GRID_SIZE = width / 4 - 20;
const REVIEW_CARD_WIDTH = width - 30; // Full width cards for reviews
const ITEMS_PER_PAGE = 20;

const MovieGridScreen = ({ route, navigation }) => {
  const { folderId, folderName, folderColor, isCritics } = route.params;
  
  useEffect(() => {
    navigation.setOptions({
      // Remove the headerLeft and gestureEnabled options to allow default behavior
    });
  }, [navigation]);

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    let timeoutId: number;
    let unsubscribe: (() => void) | undefined;

    const fetchData = async () => {
      setLoading(true);
      console.log('Fetching movies for folder:', folderId);
      
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const moviesRef = collection(userRef, 'movies');
        
        // Log the query parameters
        console.log('Query params:', {
          userId: auth.currentUser.uid,
          folderId,
          collection: 'movies'
        });

        const q = query(
          moviesRef,
          where('category', '==', folderId)
          // Remove orderBy temporarily to debug
        );

        unsubscribe = onSnapshot(q, {
          next: (snapshot) => {
            if (timeoutId) window.clearTimeout(timeoutId);
            
            console.log('Snapshot received:', {
              empty: snapshot.empty,
              size: snapshot.size,
              docs: snapshot.docs.map(doc => ({
                id: doc.id,
                category: doc.data().category
              }))
            });

            const movieData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            if (movieData.length === 0) {
              console.log('Debug - Query returned no results:', {
                folderId,
                userId: auth.currentUser?.uid
              });
            } else {
              console.log(`Found ${movieData.length} movies in folder ${folderId}`);
            }
            
            setMovies(movieData);
            setLoading(false);
            
            // Cache the data
            const cacheKey = `movies_${folderId}_${auth.currentUser?.uid}`;
            AsyncStorage.setItem(cacheKey, JSON.stringify(movieData))
              .catch(error => console.error('Caching error:', error));
          },
          error: (error) => {
            console.error('Snapshot error:', error);
            if (timeoutId) window.clearTimeout(timeoutId);
            setLoading(false);
            loadCachedMovies();
          }
        });
      } catch (error) {
        console.error('Query setup error:', error);
        if (timeoutId) window.clearTimeout(timeoutId);
        setLoading(false);
        loadCachedMovies();
      }
    };

    fetchData();

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (unsubscribe) unsubscribe();
    };
  }, [folderId, auth.currentUser]);

  // Add this new function to load cached movies
  const loadCachedMovies = async () => {
    try {
      const cacheKey = `movies_${folderId}_${auth.currentUser?.uid}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (cachedData) {
        setMovies(JSON.parse(cachedData));
      }
    } catch (error) {
      console.error('Error loading cached movies:', error);
    }
  };

  // Update the loadMovies function
  const loadMovies = async (refreshing = false) => {
    if (!auth.currentUser) return;

    try {
      setLoading(true);
      console.log('LoadMovies - Starting fetch for folder:', folderId);

      const userRef = doc(db, 'users', auth.currentUser.uid);
      const moviesRef = collection(userRef, 'movies');
      
      // Verify the folder ID
      console.log('LoadMovies - Query params:', {
        userId: auth.currentUser.uid,
        folderId,
        path: `users/${auth.currentUser.uid}/movies`
      });

      const q = query(
        moviesRef,
        where('category', '==', folderId)
      );

      const snapshot = await getDocs(q);
      
      console.log('LoadMovies - Query results:', {
        empty: snapshot.empty,
        size: snapshot.size,
        folderId
      });

      const movieData = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Movie data:', { id: doc.id, category: data.category });
        return {
          id: doc.id,
          ...data
        };
      });

      if (movieData.length === 0) {
        console.log('LoadMovies - No movies found. Verifying folder:', {
          folderId,
          userId: auth.currentUser.uid
        });
      }

      setMovies(movieData);
      setLoading(false);
      
    } catch (error) {
      console.error('LoadMovies - Error:', error);
      setLoading(false);
      await loadCachedMovies();
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMovies(true);
    setRefreshing(false);
  }, []);

  const handleMoviePress = useCallback((movie) => {
    navigation.navigate('MovieDetails', { movie });
  }, [navigation]);

  const renderReviewCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.reviewCard}
      onPress={() => handleMoviePress(item)}
    >
      <View style={styles.reviewHeader}>
        <Image
          source={{ uri: `https://image.tmdb.org/t/p/w200${item.backdrop}` }}
          style={styles.reviewPoster}
        />
        <View style={styles.reviewInfo}>
          <Text style={styles.movieTitle}>{item.movieTitle}</Text>
          <Text style={styles.reviewDate}>
            {item.createdAt}
          </Text>
        </View>
      </View>
      
      <View style={styles.ratingContainer}>
        <MaterialCommunityIcons name="star" size={20} color="#FFD700" />
        <Text style={styles.ratingText}>{item.rating}/5</Text>
      </View>

      {item.review && (
        <Text style={styles.reviewText} numberOfLines={3}>
          {item.review}
        </Text>
      )}

      <View style={styles.reviewFooter}>
        <TouchableOpacity style={styles.footerButton}>
          <Ionicons name="heart-outline" size={24} color="#FFF" />
          <Text style={styles.footerText}>{item.likes || 0}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderContent = useCallback(({ item }) => {
    if (!item) return null;

    if (isCritics) {
      return renderReviewCard({ item });
    }

    // Use a static placeholder URL instead of local asset
    const posterUrl = item.poster_path 
      ? `https://image.tmdb.org/t/p/w200${item.poster_path}`
      : 'https://via.placeholder.com/200x300/000000/ffffff?text=No+Image';

    return (
      <TouchableOpacity 
        style={styles.movieContainer}
        onPress={() => handleMoviePress(item)}
      >
        <Image
          source={{ uri: posterUrl }}
          style={styles.moviePoster}
          // Remove defaultSource prop
        />
        {!item.poster_path && (
          <Text style={styles.movieTitle}>{item.title || 'Untitled'}</Text>
        )}
      </TouchableOpacity>
    );
  }, [handleMoviePress, isCritics]);

  if (loading && page === 1) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={folderColor} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={movies}
        renderItem={renderContent}
        keyExtractor={item => item.id}
        numColumns={isCritics ? 1 : 4}
        key={isCritics ? 'critics' : 'grid'}
        contentContainerStyle={[
          styles.gridContainer,
          isCritics && styles.reviewContainer
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={folderColor}
          />
        }
        onEndReached={() => !loading && hasMore && loadMovies()}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading && hasMore ? (
          <ActivityIndicator size="small" color={folderColor} />
        ) : null}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No movies in this folder</Text>
              <Text style={styles.emptySubText}>
                Swipe movies in CineBrowse to add them here
              </Text>
            </View>
          )
        }
      />
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
    backgroundColor: '#121212',
  },
  gridContainer: {
    padding: 10,
  },
  movieContainer: {
    width: GRID_SIZE,
    height: GRID_SIZE * 1.5,
    margin: 5,
  },
  moviePoster: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  emptyText: {
    color: '#FFF',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptySubText: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
  reviewCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 15,
    marginBottom: 15,
    padding: 15,
    width: REVIEW_CARD_WIDTH,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewPoster: {
    width: 60,
    height: 90,
    borderRadius: 8,
  },
  reviewInfo: {
    marginLeft: 15,
    flex: 1,
  },
  movieTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  reviewDate: {
    color: '#888',
    fontSize: 14,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 16,
    marginLeft: 5,
    fontWeight: 'bold',
  },
  reviewText: {
    color: '#FFF',
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 15,
  },
  reviewFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
    marginTop: 8,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  footerText: {
    color: '#FFF',
    marginLeft: 5,
    fontSize: 14,
  },
  reviewContainer: {
    paddingHorizontal: 15,
  },
});

export default MovieGridScreen;
