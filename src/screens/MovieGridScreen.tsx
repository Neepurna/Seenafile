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

const { width } = Dimensions.get('window');
const GRID_SIZE = width / 4 - 20;
const ITEMS_PER_PAGE = 20;

const MovieGridScreen = ({ route, navigation }) => {
  const { folderId, folderName, folderColor } = route.params;
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const moviesRef = collection(userRef, 'movies');
    
    const q = query(
      moviesRef,
      where('category', '==', folderId),
      orderBy('timestamp', 'desc')
    );

    // Set up real-time listener
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
        orderBy('timestamp', 'desc'),
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

  const renderMovie = useCallback(({ item }) => (
    <TouchableOpacity 
      style={styles.movieContainer}
      onPress={() => handleMoviePress(item)}
    >
      <Image
        source={{ uri: `https://image.tmdb.org/t/p/w200${item.poster_path}` }}
        style={styles.moviePoster}
      />
    </TouchableOpacity>
  ), [handleMoviePress]);

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
        renderItem={renderMovie}
        keyExtractor={item => item.id}
        numColumns={4}
        contentContainerStyle={styles.gridContainer}
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
});

export default MovieGridScreen;
