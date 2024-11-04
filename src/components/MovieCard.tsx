// src/components/MovieCard.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchMovieDetails } from '../services/tmdb';

const { width, height } = Dimensions.get('window');

interface MovieCardProps {
  movie: {
    id: number;
    title: string;
    poster_path: string;
    vote_average: number;
    overview: string;
    release_date: string;
  };
}

const MovieCard: React.FC<MovieCardProps> = ({ movie }) => {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch detailed movie information
    const fetchDetails = async () => {
      try {
        const movieDetails = await fetchMovieDetails(movie.id);
        setDetails(movieDetails);
      } catch (error) {
        console.error('Error fetching movie details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [movie.id]);

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
      <ImageBackground
        source={{ uri: imageUrl }}
        style={styles.image}
        imageStyle={styles.imageStyle}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.9)']}
          style={styles.gradient}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ffffff" />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.contentContainer}>
              {/* Movie Title */}
              <Text style={styles.title} numberOfLines={2}>
                {movie.title}
              </Text>

              {/* Rating */}
              <Text style={styles.rating}>⭐ {movie.vote_average.toFixed(1)} / 10</Text>

              {/* Description */}
              <Text style={styles.overview}>{movie.overview}</Text>

              {/* Genres */}
              {details.genres && details.genres.length > 0 && (
                <View style={styles.genresContainer}>
                  {details.genres.map((genre: any) => (
                    <View key={genre.id} style={styles.genreBadge}>
                      <Text style={styles.genreText}>{genre.name}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Runtime and Release Date */}
              {details.runtime && (
                <Text style={styles.infoText}>
                  <Text style={styles.infoLabel}>Runtime:</Text> {details.runtime} minutes
                </Text>
              )}
              <Text style={styles.infoText}>
                <Text style={styles.infoLabel}>Release Date:</Text> {movie.release_date}
              </Text>
            </ScrollView>
          )}
        </LinearGradient>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center', // Center horizontally
  },
  image: {
    width: '100%',     // Ensure image covers full width
    height: '100%',    // Ensure image covers full height
    justifyContent: 'flex-end',
  },
  imageStyle: {
    resizeMode: 'cover',
  },
  gradient: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 30,
    backgroundColor: 'transparent',
    flex: 1,
    justifyContent: 'flex-end',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  contentContainer: {
    paddingBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  rating: {
    fontSize: 20,
    color: '#FFD700',
    marginBottom: 10,
  },
  overview: {
    fontSize: 16,
    color: '#cccccc',
    marginBottom: 15,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  genreBadge: {
    backgroundColor: '#333333',
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  genreText: {
    color: '#ffffff',
    fontSize: 14,
  },
  infoText: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 5,
  },
  infoLabel: {
    fontWeight: 'bold',
    color: '#FFD700',
  },
  errorText: {
    fontSize: 18,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default MovieCard;
