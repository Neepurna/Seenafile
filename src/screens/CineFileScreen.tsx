import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { useMovieLists } from '../context/MovieListContext';

const { width } = Dimensions.get('window');
const COLUMN_NUMBER = 3;
const POSTER_WIDTH = width / COLUMN_NUMBER - 10;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;

const MovieGrid = ({ movies, title }) => {
  const renderMovieItem = ({ item }) => (
    <TouchableOpacity style={styles.movieItem}>
      <Image
        source={{ uri: `https://image.tmdb.org/t/p/w500${item.poster_path}` }}
        style={styles.poster}
      />
      <Text numberOfLines={1} style={styles.movieTitle}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <FlatList
        data={movies}
        renderItem={renderMovieItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={COLUMN_NUMBER}
        contentContainerStyle={styles.gridContainer}
        scrollEnabled={false} // Disable scroll for nested FlatList
      />
    </View>
  );
};

const CineFileScreen: React.FC = () => {
  const { movieLists } = useMovieLists();

  return (
    <ScrollView style={styles.container}>
      <MovieGrid movies={movieLists.mostWatch} title="Most Watch" />
      <MovieGrid movies={movieLists.seen} title="Watched Movies" />
      <MovieGrid movies={movieLists.watchLater} title="Watch Later" />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  section: {
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    marginLeft: 15,
  },
  gridContainer: {
    paddingHorizontal: 5,
    paddingBottom: 20,
  },
  movieItem: {
    width: POSTER_WIDTH,
    marginHorizontal: 5,
    marginBottom: 15,
  },
  poster: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 10,
  },
  movieTitle: {
    color: '#fff',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
});

export default CineFileScreen;
