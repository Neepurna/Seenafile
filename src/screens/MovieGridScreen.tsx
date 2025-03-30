import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Animated,
  PanResponder,
  Modal,
} from 'react-native';
import { auth, db } from '../firebase';
import { doc, collection, query, where, getDocs, orderBy, limit, onSnapshot, getDoc } from 'firebase/firestore';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
const { width } = Dimensions.get('window');
const GRID_SIZE = width / 5 - 10; // Changed from 4 to 5 movies per row
const REVIEW_CARD_WIDTH = width - 30; // Full width cards for reviews
const ITEMS_PER_PAGE = 20;

const MovieGridScreen = ({ route, navigation }) => {
  const { folderId, folderName, folderColor, isCritics, userId, fromScreen } = route.params;
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const moviesRef = useRef<any[]>([]);  // Add this to keep track of all movies
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) {
          closeModal();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;
  
  useEffect(() => {
    loadMovies(true);
  }, []);

  useEffect(() => {
    navigation.setOptions({
      // Remove the headerLeft and gestureEnabled options to allow default behavior
    });
  }, [navigation]);

  useEffect(() => {
    // Use the correct back navigation based on source screen
    const handleBack = () => {
      if (fromScreen === 'UserProfile') {
        navigation.navigate('UserProfileMain');
      } else if (fromScreen === 'Profile') {
        navigation.navigate('ProfileMain');
      } else {
        navigation.goBack();
      }
    };

    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity 
          onPress={handleBack}
          style={{ marginLeft: 16 }}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
      )
    });
  }, [navigation, fromScreen]);

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
          // Use the passed userId instead of current user's ID
          const targetUserId = userId || auth.currentUser.uid;
          const userRef = doc(db, 'users', targetUserId);
          const moviesRef = collection(userRef, 'movies');
          
          // Log the query parameters
          console.log('Query params:', {
            userId: targetUserId,
            folderId,
            collection: 'movies'
          });

          const q = query(
            moviesRef,
            where('category', '==', folderId)
          );

          unsubscribe = onSnapshot(q, {
            next: (snapshot) => {
              if (timeoutId) window.clearTimeout(timeoutId);
              
              let movieData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));

              // Sort alphabetically for specific folders
              if (['watched', 'most_watch', 'watch_later'].includes(folderId)) {
                movieData = movieData.sort((a, b) => {
                  const titleA = (a.title || a.movieTitle || '').toLowerCase();
                  const titleB = (b.title || b.movieTitle || '').toLowerCase();
                  return titleA.localeCompare(titleB);
                });
              }
              
              setMovies(movieData);
              setLoading(false);
              
              // Cache the data with correct userId
              const cacheKey = `movies_${folderId}_${targetUserId}`;
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
      const targetUserId = userId || auth.currentUser?.uid;
      const cacheKey = `movies_${folderId}_${targetUserId}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (cachedData) {
        setMovies(JSON.parse(cachedData));
      }
    } catch (error) {
      console.error('Error loading cached movies:', error);
    }
  };

  // Update the loadMovies function
  const loadMovies = async (isInitial = false) => {
    if (loading && !isInitial) return;
    
    try {
      setLoading(true);
      // Always use the passed userId instead of current user's ID
      const targetUserId = userId || auth.currentUser?.uid;
      const userRef = doc(db, 'users', targetUserId);
      
      console.log('Loading movies for user:', targetUserId);
      const moviesCollection = collection(userRef, isCritics ? 'reviews' : 'movies');
      
      const q = query(
        moviesCollection,
        where('category', '==', folderId)
      );

      const snapshot = await getDocs(q);
      let movieData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate?.() || new Date()
          };
        })
      );

      // Sort based on folder type
      if (['watched', 'most_watch', 'watch_later'].includes(folderId)) {
        // Sort alphabetically
        movieData = movieData.sort((a, b) => {
          const titleA = (a.title || a.movieTitle || '').toLowerCase();
          const titleB = (b.title || b.movieTitle || '').toLowerCase();
          return titleA.localeCompare(titleB);
        });
      } else {
        // Sort by timestamp for other folders
        movieData = movieData.sort((a, b) => {
          const timeA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
          const timeB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
          return timeB.getTime() - timeA.getTime();
        });
      }

      // Store all movies in ref and state
      moviesRef.current = movieData;
      setMovies(movieData);
      setHasMore(movieData.length === 20 * page);
      
      // Cache the movies
      const cacheKey = `${folderId}_${userId}_movies`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(movieData));
      
    } catch (error) {
      console.error('Error loading movies:', error);
      // Try to load from cache
      const cacheKey = `${folderId}_${userId}_movies`;
      const cachedMovies = await AsyncStorage.getItem(cacheKey);
      if (cachedMovies) {
        const movieData = JSON.parse(cachedMovies);
        moviesRef.current = movieData;
        setMovies(movieData);
      }
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      setSelectedMovie(null);
      slideAnim.setValue(0);
      scaleAnim.setValue(1);
    });
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
      loadMovies();
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMovies(true);
    setRefreshing(false);
  }, []);

  const handleMoviePress = useCallback((movie) => {
    setSelectedMovie(movie);
    setModalVisible(true);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

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

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={folderColor} />
      </View>
    );
  };

  const renderMovieModal = () => (
    <Modal
      visible={modalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={closeModal}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [
                { translateX: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
          {...panResponder.panHandlers}
        >
          {selectedMovie && (
            <View style={styles.selectedMovieContainer}>
              <Image
                source={{
                  uri: selectedMovie.poster_path
                    ? `https://image.tmdb.org/t/p/w500${selectedMovie.poster_path}`
                    : 'https://via.placeholder.com/500x750'
                }}
                style={styles.selectedMoviePoster}
              />
              <Text style={styles.selectedMovieTitle}>
                {selectedMovie.title || 'Untitled'}
              </Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );

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
        numColumns={5}
        key={isCritics ? 'critics' : 'grid'}
        contentContainerStyle={[
          styles.gridContainer,
          isCritics && styles.reviewContainer
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setPage(1);
              loadMovies(true);
            }}
            tintColor={folderColor}
          />
        }
        onEndReached={null} // Remove infinite scroll
        onEndReachedThreshold={null}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No {isCritics ? 'reviews' : 'movies'} in this folder yet
              </Text>
            </View>
          )
        }
      />
      {renderMovieModal()}
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
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.8,
    backgroundColor: '#1A1A1A',
    borderRadius: 15,
    overflow: 'hidden',
  },
  selectedMovieContainer: {
    alignItems: 'center',
    padding: 20,
  },
  selectedMoviePoster: {
    width: width * 0.6,
    height: (width * 0.6) * 1.5,
    borderRadius: 10,
  },
  selectedMovieTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 15,
    textAlign: 'center',
  },
});

export default MovieGridScreen;
