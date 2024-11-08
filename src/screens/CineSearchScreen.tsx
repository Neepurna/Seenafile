import React, { useEffect, useState, useCallback, memo } from 'react';
import { View, StyleSheet, TextInput, FlatList, Image, Dimensions, ActivityIndicator } from 'react-native';
import { fetchMovies, TMDBMovie } from '../services/tmdb';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const numColumns = 4; // Changed from 2 to 4
const movieWidth = width / numColumns;

const MovieCard = memo(({ item }: { item: TMDBMovie }) => (
  <View style={styles.movieCard}>
    <Image
      source={{
        uri: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
      }}
      style={styles.moviePoster}
    />
  </View>
));

const CineSearchScreen: React.FC = () => {
  const [movies, setMovies] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadMovies();
  }, []);

  const loadMovies = async (nextPage = 1) => {
    try {
      if (nextPage === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await fetchMovies(nextPage);
      if (nextPage === 1) {
        setMovies(response.results);
      } else {
        setMovies(prev => [...prev, ...response.results]);
      }
      
      // Check if we have more pages
      setHasMore(response.page < response.total_pages);
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

  const keyExtractor = useCallback((item: TMDBMovie) => 
    item.id.toString(),
    []
  );

  const renderMovieItem = useCallback(({ item }: { item: TMDBMovie }) => (
    <MovieCard item={item} />
  ), []);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <View style={styles.loadingBar}>
          <View style={styles.loadingBarInner} />
        </View>
      </View>
    );
  }, [loadingMore]);

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
        <FlatList
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
          removeClippedSubviews={false} // Changed to false to prevent disappearing
          windowSize={21} // Increased window size
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={100} // Increased batch period
          initialNumToRender={12}
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
    width: '100%',
  },
  loadingBar: {
    width: '50%',
    height: 3,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingBarInner: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
    animation: 'loading 1s infinite',
  },
  '@keyframes loading': {
    '0%': {
      transform: 'translateX(-100%)',
    },
    '100%': {
      transform: 'translateX(100%)',
    },
  },
});

export default CineSearchScreen;
