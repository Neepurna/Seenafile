import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, FlatList, Image, Dimensions, ActivityIndicator } from 'react-native';
import { fetchMovies, TMDBMovie } from '../services/tmdb';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const numColumns = 2;
const movieWidth = width / numColumns;

const CineSearchScreen: React.FC = () => {
  const [movies, setMovies] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMovies();
  }, []);

  const loadMovies = async () => {
    try {
      const response = await fetchMovies();
      setMovies(response.results);
    } catch (error) {
      console.error('Error loading movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMovieItem = ({ item }: { item: TMDBMovie }) => (
    <View style={styles.movieCard}>
      <Image
        source={{
          uri: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
        }}
        style={styles.moviePoster}
      />
    </View>
  );

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
          data={movies}
          renderItem={renderMovieItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={numColumns}
          contentContainerStyle={styles.gridContainer}
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
  },
  movieCard: {
    width: movieWidth,
    padding: 5,
  },
  moviePoster: {
    width: '100%',
    aspectRatio: 2/3,
    borderRadius: 8,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CineSearchScreen;
