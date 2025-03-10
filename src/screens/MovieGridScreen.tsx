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
import { doc, collection, query, where, getDocs, orderBy, limit, onSnapshot, getDoc } from 'firebase/firestore';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
const { width } = Dimensions.get('window');
const GRID_SIZE = width / 4 - 20;
const REVIEW_CARD_WIDTH = width - 30; // Full width cards for reviews
const ITEMS_PER_PAGE = 20;

const MovieGridScreen = ({ route, navigation }) => {
  const { folderId, folderName, folderColor, isCritics, userId } = route.params;
  
  useEffect(() => {
    navigation.setOptions({
      // Remove the headerLeft and gestureEnabled options to allow default behavior
    });
  }, [navigation]);

  useEffect(() => {
    // Set up navigation options based on source screen
    if (route.params?.fromScreen === 'UserProfileChat') {
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={{ marginLeft: 16 }}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
        )
      });
    }
  }, [navigation, route.params]);

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMovieDetails = async (reviewData) => {
    try {
      // Check if we have a valid movieId
      if (!reviewData.movieId) {
        console.log('No movieId found in review:', reviewData);
        return null;
      }

      // First try to get from the user's movies collection
      const userMovieRef = doc(db, 'users', auth.currentUser.uid, 'movies', reviewData.movieId);
      const userMovieSnap = await getDoc(userMovieRef);

      if (userMovieSnap.exists()) {
        const movieData = userMovieSnap.data();
        return {
          id: reviewData.id,
          ...movieData,
          ...reviewData,
          title: movieData.title || reviewData.movieTitle || 'Untitled',
          poster_path: movieData.poster_path || reviewData.poster_path,
          backdrop_path: movieData.backdrop_path || reviewData.backdrop_path,
        };
      }

      // If not found in user's movies, try the shared movies collection
      const sharedMovieRef = doc(collection(db, 'movies'), reviewData.movieId);
      const sharedMovieSnap = await getDoc(sharedMovieRef);

      if (sharedMovieSnap.exists()) {
        const movieData = sharedMovieSnap.data();
        return {
          id: reviewData.id,
          ...movieData,
          ...reviewData,
          title: movieData.title || reviewData.movieTitle || 'Untitled',
          poster_path: movieData.poster_path || reviewData.poster_path,
          backdrop_path: movieData.backdrop_path || reviewData.backdrop_path,
        };
      }

      // If no movie data found, return review data with defaults
      return {
        id: reviewData.id,
        ...reviewData,
        title: reviewData.movieTitle || 'Untitled',
        poster_path: reviewData.poster_path || null,
        backdrop_path: reviewData.backdrop_path || null,
      };
    } catch (error) {
      console.error('Error fetching movie details:', error);
      return null;
    }
  };

  useEffect(() => {
    if (!auth.currentUser) return;
    let isSubscribed = true;
    let timeoutId: number;

    const fetchCritics = async () => {
      if (!isSubscribed) return;
      setLoading(true);

      try {
        const targetUserId = userId || auth.currentUser.uid;
        
        // Fetch reviews in a simpler way first
        const fetchReviews = async () => {
          try {
            // Only query user's movies collection
            const userMoviesRef = collection(db, 'users', targetUserId, 'movies');
            const criticsQuery = query(
              userMoviesRef,
              where('category', '==', 'critics')
            );
            
            const snapshot = await getDocs(criticsQuery);
            return snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              source: 'user'
            }));
          } catch (error) {
            console.error('Error fetching reviews:', error);
            return [];
          }
        };

        const reviews = await fetchReviews();
        
        // Sort reviews client-side
        const sortedReviews = reviews.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return dateB - dateA;
        });

        if (isSubscribed) {
          console.log(`Found ${sortedReviews.length} reviews`);
          setMovies(sortedReviews);
          setLoading(false);
        }

      } catch (error) {
        console.error('Critics fetch error:', error);
        setLoading(false);
        loadCachedMovies();
      }
    };

    const fetchRegularMovies = async () => {
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
    };

    // Choose which fetch function to use
    if (isCritics) {
      fetchCritics();
    } else {
      fetchRegularMovies();
    }

    return () => {
      isSubscribed = false;
    };
  }, [folderId, auth.currentUser, userId, isCritics]);

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
    if (!auth.currentUser || loading) return;

    try {
      setLoading(true);
      const targetUserId = userId || auth.currentUser.uid;
      const userRef = doc(db, 'users', targetUserId);
      const moviesRef = collection(userRef, 'movies');

      const q = isCritics
        ? query(
            moviesRef,
            where('category', '==', 'critics'),
            orderBy('createdAt', 'desc'),
            limit(50)
          )
        : query(
            moviesRef,
            where('category', '==', folderId),
            orderBy('createdAt', 'desc'),
            limit(50)
          );

      const snapshot = await getDocs(q);
      const movieData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));

      setMovies(movieData);
      setHasMore(false);
    } catch (error) {
      console.error('Load error:', error);
      await loadCachedMovies();
    } finally {
      setLoading(false);
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

  const formatDate = (date: Date | string | null): string => {
    if (!date) return '';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return '';
    }
  };

  const renderReviewCard = ({ item }) => {
    const backdropPath = item.backdrop || '';
    const posterPath = item.poster_path || '';
    
    const imageUrl = backdropPath || posterPath;
    const posterUrl = imageUrl 
      ? `https://image.tmdb.org/t/p/w200${imageUrl}`
      : 'https://via.placeholder.com/90x135/1A1A1A/FFFFFF?text=No+Image';

    return (
      <TouchableOpacity 
        style={styles.reviewCard}
        onPress={() => handleMoviePress(item)}
      >
        {/* Background Image for card */}
        <Image
          source={{ uri: posterUrl }}
          style={styles.reviewCardBackground}
          blurRadius={15}
        />
        
        <View style={styles.reviewContent}>
          <View style={styles.reviewHeader}>
            <Image
              source={{ uri: posterUrl }}
              style={styles.reviewPoster}
            />
            <View style={styles.reviewInfo}>
              <Text style={styles.movieTitle}>{item.movieTitle || 'Untitled'}</Text>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <MaterialCommunityIcons 
                    key={star}
                    name={star <= (item.rating || 0) ? "star" : "star-outline"}
                    size={16}
                    color="#FFD700"
                  />
                ))}
                <Text style={styles.ratingText}>{item.rating || 0}/5</Text>
              </View>
              <Text style={styles.reviewDate}>
                {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>

          {item.review && (
            <View style={styles.reviewTextContainer}>
              <Text style={styles.reviewText} numberOfLines={3}>
                "{item.review}"
              </Text>
            </View>
          )}

          <View style={styles.reviewFooter}>
            <TouchableOpacity style={styles.footerButton}>
              <Ionicons name="heart-outline" size={20} color="#FFF" />
              <Text style={styles.footerText}>{item.likes || 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerButton}>
              <Ionicons name="chatbubble-outline" size={20} color="#FFF" />
              <Text style={styles.footerText}>Comment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
    position: 'relative',
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    backgroundColor: '#1A1A1A',
  },
  reviewCardBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.2,
  },
  reviewContent: {
    padding: 15,
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewPoster: {
    width: 80,
    height: 120,
    borderRadius: 8,
    marginRight: 15,
  },
  reviewInfo: {
    flex: 1,
    justifyContent: 'space-between',
    height: 120,
  },
  movieTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  reviewDate: {
    color: '#888',
    fontSize: 12,
  },
  reviewTextContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
  },
  reviewText: {
    color: '#FFF',
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  footerText: {
    color: '#FFF',
    marginLeft: 5,
    fontSize: 12,
  },
  reviewContainer: {
    paddingHorizontal: 15,
  },
});

export default MovieGridScreen;
