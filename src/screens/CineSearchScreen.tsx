import React, { useEffect, useState, useCallback, memo } from 'react';
import { View, StyleSheet, TextInput, FlatList, Image, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Movie } from '../services/api';
import { fetchMoviesByQuery, fetchRandomMovies } from '../services/helper';

const { width } = Dimensions.get('window');
const numColumns = 4; // Changed from 2 to 4
const movieWidth = width / numColumns;

const ITEMS_PER_PAGE = 20;
const VISIBLE_PAGES = 2;

const MovieCard = memo(({ item }: { item: Movie }) => (
  <View style={styles.movieCard}>
    <Image
      source={{
        uri: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
      }}
      style={styles.moviePoster}
    />
  </View>
));

// Update type definition
type ExtendedMovie = Movie & { uniqueKey?: string };

const CineSearchScreen: React.FC = () => {
  const [movies, setMovies] = useState<ExtendedMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [visibleMovies, setVisibleMovies] = useState<ExtendedMovie[]>([]);

  useEffect(() => {
    loadMovies();
  }, []);

  const loadMovies = async (nextPage = 1) => {
    try {
      if (loadingMore) return;

      if (nextPage === 1) {
        setLoading(true);
        setMovies([]); // Clear existing movies on refresh
      } else {
        setLoadingMore(true);
      }

      let newMovies: Movie[];
      if (searchQuery.trim()) {
        const response = await fetchMoviesByQuery(searchQuery);
        newMovies = response;
      } else {
        // If no search query, fetch random popular movies
        newMovies = await fetchRandomMovies('popular', ITEMS_PER_PAGE);
      }

      // Add uniqueKey to movies for FlatList optimization
      const moviesWithKeys = newMovies.map((movie, index) => ({
        ...movie,
        uniqueKey: `${nextPage}-${movie.id}-${Date.now()}-${index}`,
      }));

      if (nextPage === 1) {
        setMovies(moviesWithKeys);
      } else {
        setMovies(prev => [...prev, ...moviesWithKeys]);
      }
      
      setHasMore(newMovies.length === ITEMS_PER_PAGE);
      setPage(nextPage);
    } catch (error) {
      console.error('Error loading movies:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadMovies(page + 1);
    }
  };

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: movieWidth * (3/2), // Using the aspect ratio 2/3
      offset: movieWidth * (3/2) * Math.floor(index / numColumns),
      index,
    }),
    []
  );

  const keyExtractor = useCallback((item: Movie & { uniqueKey?: string }) => 
    item.uniqueKey || `${item.id}-${Math.random()}`,
    []
  );

  const renderMovieItem = useCallback(({ item }: { item: Movie }) => (
    <MovieCard item={item} />
  ), []);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#fff" />
      </View>
    );
  }, [loadingMore]);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const visibleIds = viewableItems.map((item: any) => item.item.id);
      setVisibleMovies(prev => 
        prev.filter(movie => visibleIds.includes(movie.id))
      );
    }
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 300,
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search movies..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={styles.loader} />
      ) : (
        <FlatList<ExtendedMovie>
          key={`grid-${numColumns}`} // Add this line to fix the numColumns error
          data={movies}
          renderItem={renderMovieItem}
          keyExtractor={keyExtractor}
          numColumns={numColumns}
          contentContainerStyle={styles.gridContainer}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          getItemLayout={getItemLayout}
          removeClippedSubviews={true}
          windowSize={3}
          maxToRenderPerBatch={16}
          updateCellsBatchingPeriod={100}
          initialNumToRender={16}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#000',
  },
  searchInput: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  gridContainer: {
    paddingTop: 8, // Add some space after search bar
    paddingHorizontal: 2, // Add horizontal padding for grid
  },
  movieCard: {
    width: movieWidth,
    padding: 2, // Reduced padding for smaller cards
  },
  moviePoster: {
    width: '100%',
    aspectRatio: 2/3,
    borderRadius: 4, // Smaller border radius for smaller cards
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default CineSearchScreen;
