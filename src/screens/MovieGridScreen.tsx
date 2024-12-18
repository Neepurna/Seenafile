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
} from 'react-native';
import { auth, db } from '../firebase';
import { doc, collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const GRID_SIZE = width / 4 - 20;
const REVIEW_CARD_WIDTH = width - 30; // Full width cards for reviews
const ITEMS_PER_PAGE = 20;

const MovieGridScreen = ({ route, navigation }) => {
  const { folderId, folderName, folderColor, isCritics } = route.params;
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const moviesRef = collection(userRef, 'movies');
    
    try {
      const q = query(
        moviesRef,
        where('category', '==', folderId),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const movieData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMovies(movieData);
        setLoading(false);
      }, (error) => {
        console.error('Error loading movies:', error);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Query error:', error);
      setLoading(false);
    }
  }, [folderId]);

  const loadMovies = async (refreshing = false) => {
    if (!auth.currentUser || (!hasMore && !refreshing)) return;

    try {
      setLoading(true);
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const moviesRef = collection(userRef, 'movies');
      
      const q = query(
        moviesRef,
        where('category', '==', folderId),
        orderBy('createdAt', 'desc'),
        limit(ITEMS_PER_PAGE * (refreshing ? 1 : page))
      );

      const snapshot = await getDocs(q);
      const movieData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setMovies(movieData);
      setHasMore(movieData.length === ITEMS_PER_PAGE * page);
      setPage(prev => refreshing ? 1 : prev + 1);
    } catch (error) {
      console.error('Error loading movies:', error);
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
    if (isCritics) {
      return renderReviewCard({ item });
    }
    return (
      <TouchableOpacity 
        style={styles.movieContainer}
        onPress={() => handleMoviePress(item)}
      >
        <Image
          source={{ uri: `https://image.tmdb.org/t/p/w200${item.poster_path}` }}
          style={styles.moviePoster}
        />
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
