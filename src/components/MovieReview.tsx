// src/components/MovieReview.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Image,
  Dimensions,
  ScrollView,
  Text,
  Platform,
} from 'react-native';
import { fetchMovieImages } from '../services/tmdb'; // Add this import at the top with other imports

const { width, height } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 100; // Match with Tabs.tsx
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : 0;

// Match CARD_HEIGHT exactly with FlipCard
const CARD_PADDING = 16;
const CARD_WIDTH = width - (CARD_PADDING * 2);
const CARD_HEIGHT = (CARD_WIDTH * 1.5);

interface Backdrop {
  file_path: string;
}

interface MovieReviewProps {
  movie: {
    id: number;
    title: string;
    vote_average: number;
    vote_count: number; // Add this line
    genres: { id: number; name: string }[];
    release_date?: string;
    runtime?: number;
    overview?: string;
  };
}

const MovieReview: React.FC<MovieReviewProps> = ({ movie }) => {
  const [backdrops, setBackdrops] = useState<Backdrop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const imagesData = await fetchMovieImages(movie.id);
        setBackdrops(imagesData.backdrops.slice(0, 1)); // Limit to 1 image
      } catch (error) {
        console.error('Error fetching movie images:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [movie.id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Movie Details Section */}
      <View style={styles.detailsContainer}>
        {/* Title and Rating section */}
        <Text numberOfLines={2} style={styles.title}>
          {movie.title}
        </Text>
        <View style={styles.ratingContainer}>
          <Text style={styles.rating}>⭐ {movie.vote_average.toFixed(1)}</Text>
          <Text style={styles.voteCount}>({movie.vote_count.toLocaleString()} votes)</Text>
        </View>

        {/* Genres section */}
        {movie.genres && movie.genres.length > 0 && (
          <View style={styles.genresContainer}>
            {movie.genres.slice(0, 3).map((genre) => (
              <View key={genre.id} style={styles.genreBadge}>
                <Text style={styles.genreText}>{genre.name}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Movie Additional Details */}
        <View style={styles.additionalDetails}>
          {movie.release_date && (
            <Text style={styles.detailText}>
              Released: {new Date(movie.release_date).getFullYear()}
            </Text>
          )}
          {movie.runtime && (
            <Text style={styles.detailText}>
              Runtime: {movie.runtime} min
            </Text>
          )}
        </View>

        {/* Movie Overview */}
        {movie.overview && (
          <View style={styles.overviewContainer}>
            <Text style={styles.overviewTitle}>Overview</Text>
            <Text style={styles.overviewText}>{movie.overview}</Text>
          </View>
        )}
      </View>

      {/* Single Backdrop Image */}
      {backdrops.length > 0 && (
        <View style={styles.backdropContainer}>
          <Image
            source={{ uri: `https://image.tmdb.org/t/p/w780${backdrops[0].file_path}` }}
            style={styles.backdropImage}
          />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rating: {
    fontSize: 20,
    color: '#FFD700',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  voteCount: {
    fontSize: 16,
    color: '#B8B8B8',
    marginLeft: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  genreBadge: {
    backgroundColor: 'rgba(51, 51, 51, 0.8)',
    borderRadius: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  genreText: {
    color: '#ffffff',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  backdropContainer: {
    marginTop: CARD_HEIGHT * 0.02, // Adjust margin for backdrop
    paddingBottom: 20,
    backgroundColor: '#000000', // Changed to black
  },
  backdropImage: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT * 0.35,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  additionalDetails: {
    marginTop: 15,
    marginBottom: 15,
  },
  detailText: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  overviewContainer: {
    marginTop: 10,
  },
  overviewTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  overviewText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});

export default MovieReview;
