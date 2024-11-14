import React, { useEffect, useState, memo, useCallback } from 'react';
import { View, StyleSheet, TextInput, Image, Dimensions, ActivityIndicator, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Movie } from '../services/api';
import { fetchRandomMovies, fetchTrendingMovies } from '../services/helper';
import { searchMoviesAndShows } from '../services/tmdb';
import debounce from 'lodash/debounce';

const { width } = Dimensions.get('window');

const MovieBanner = memo(({ movie }: { movie: Movie }) => (
  <View style={styles.movieBanner}>
    <Image
      source={{ uri: `https://image.tmdb.org/t/p/w500${movie.poster_path}` }}
      style={styles.bannerImage}
    />
    <Text style={styles.movieTitle}>{movie.title || movie.name}</Text>
    <Text style={styles.mediaType}>{movie.media_type === 'tv' ? 'TV Show' : 'Movie'}</Text>
  </View>
));

const MovieSearchScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeMovies();
  }, []);

  const initializeMovies = async () => {
    try {
      const trendingMovies = await fetchTrendingMovies(10);
      setMovies(trendingMovies);
    } catch (error) {
      console.error('Error fetching trending content:', error);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        initializeMovies();
        setError(null);
        return;
      }

      setIsSearching(true);
      setError(null);
      try {
        const response = await searchMoviesAndShows(query);
        if (response?.results) {
          setMovies(response.results);
        } else {
          setMovies([]);
          setError('No results found');
        }
      } catch (error) {
        console.error('Error searching:', error);
        setMovies([]);
        setError('Failed to search');
      } finally {
        setIsSearching(false);
      }
    }, 500),
    []
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    performSearch(text);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={24} color="#fff" />
        <Text style={styles.loadingText}>Loading movies...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          style={styles.moviesContainer}
          contentContainerStyle={styles.moviesContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionTitle}>
            {searchQuery ? 'Search Results' : 'Trending Today'}
          </Text>
          {isSearching ? (
            <ActivityIndicator size={24} color="#fff" style={styles.searchSpinner} />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <View style={styles.movieGrid}>
              {movies.map(movie => (
                <MovieBanner key={movie.id} movie={movie} />
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search movies..."
            placeholderTextColor="#666"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  keyboardView: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  searchInput: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 16,
    borderRadius: 24,
    fontSize: 16,
  },
  moviesContainer: {
    flex: 1,
    backgroundColor: '#111',
  },
  moviesContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 80 : 24,
  },
  movieGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  movieBanner: {
    width: (width - 48) / 2,
    marginBottom: 20,
    alignItems: 'center',
  },
  bannerImage: {
    width: 140,
    height: 210,
    borderRadius: 8,
  },
  movieTitle: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    width: '100%',
  },
  searchSpinner: {
    marginTop: 20,
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  mediaType: {
    color: '#888',
    fontSize: 10,
    marginTop: 4,
  },
});

export default MovieSearchScreen;