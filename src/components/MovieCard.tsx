import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface MovieCardProps {
  movie: {
    title: string;
    poster_path: string;
    vote_average: number;
  };
}

const MovieCard: React.FC<MovieCardProps> = ({ movie }) => {
  if (!movie || !movie.poster_path) {
    return (
      <View style={styles.card}>
        <Text style={styles.errorText}>Movie details unavailable</Text>
      </View>
    );
  }

  const imageUrl = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;

  return (
    <View style={styles.card}>
      <Image source={{ uri: imageUrl }} style={styles.image} />
      <View style={styles.detailsContainer}>
        <Text style={styles.title}>{movie.title}</Text>
        <Text style={styles.rating}>Rating: {movie.vote_average}/10</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: width * 0.85,
    height: height * .85,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '80%',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  detailsContainer: {
    width: '100%',
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  rating: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 5,
  },
  errorText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    padding: 20,
  },
});

export default MovieCard;
