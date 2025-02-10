import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  Text,
  Dimensions,
  Platform,
  PanResponder,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchMoviesAndShows, fetchTrendingMovies } from '../services/tmdb';

const { height, width } = Dimensions.get('window');
const DRAWER_HEIGHT = height * 0.8;
const DRAG_THRESHOLD = 50;

interface SearchDrawerProps {
  isVisible: boolean;
  onClose: () => void;
  onMovieSelect: (movie: any) => void;
}

const SearchDrawer: React.FC<SearchDrawerProps> = ({
  isVisible,
  onClose,
  onMovieSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const panY = useRef(new Animated.Value(DRAWER_HEIGHT)).current;
  const searchInputRef = useRef<TextInput>(null);

  const resetPositions = () => {
    panY.setValue(DRAWER_HEIGHT);
  };

  useEffect(() => {
    if (isVisible) {
      // Start opening animation
      Animated.spring(panY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      // Focus input immediately when drawer opens
      searchInputRef.current?.focus();
      loadTrendingMovies();
    } else {
      // Dismiss keyboard when drawer closes
      Keyboard.dismiss();
      // Reset search state
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isVisible]);

  const loadTrendingMovies = async () => {
    try {
      const data = await fetchTrendingMovies();
      setTrendingMovies(data.results || []);
    } catch (error) {
      console.error('Error loading trending movies:', error);
    }
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.trim().length > 0) {
      setIsLoading(true);
      try {
        const results = await searchMoviesAndShows(text);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleMovieSelect = (movie: any) => {
    // Normalize movie data to match the expected format
    const normalizedMovie = {
      id: movie.id,
      title: movie.title || movie.name,
      name: movie.name || movie.title,
      poster_path: movie.poster_path,
      backdrop_path: movie.backdrop_path,
      vote_average: movie.vote_average || 0,
      overview: movie.overview || '',
      release_date: movie.release_date || movie.first_air_date,
      first_air_date: movie.first_air_date || movie.release_date,
      media_type: movie.media_type || 'movie',
      vote_count: movie.vote_count || 0,
      genres: movie.genres || [],
      popularity: movie.popularity || 0
    };

    // Dismiss keyboard before closing drawer
    Keyboard.dismiss();
    onMovieSelect(normalizedMovie);
    onClose();
    setSearchQuery('');
    setSearchResults([]);
    resetPositions();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) { // Only allow downward drag
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DRAG_THRESHOLD) {
          // Dismiss keyboard first
          Keyboard.dismiss();
          // Then animate drawer closing
          Animated.spring(panY, {
            toValue: DRAWER_HEIGHT,
            useNativeDriver: true,
          }).start(() => {
            onClose();
            resetPositions();
          });
        } else {
          // Snap back to open position
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleClose = () => {
    Keyboard.dismiss();
    setTimeout(() => onClose(), 50);
  };

  const renderSearchResult = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleMovieSelect(item)}
    >
      <Image
        source={{
          uri: `https://image.tmdb.org/t/p/w200${item.poster_path}`,
        }}
        style={styles.resultImage}
      />
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.title || item.name}
        </Text>
        <Text style={styles.resultYear}>
          {new Date(item.release_date || item.first_air_date).getFullYear() || 'N/A'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (searchQuery.trim().length === 0) {
      return (
        <>
          <Text style={styles.sectionTitle}>Trending Now</Text>
          <FlatList
            data={trendingMovies}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.resultsList}
            keyboardShouldPersistTaps="handled"
          />
        </>
      );
    }

    return (
      <FlatList
        data={searchResults}
        renderItem={renderSearchResult}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.resultsList}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color="#fff" size="large" style={styles.loader} />
          ) : (
            <Text style={styles.noResults}>No results found</Text>
          )
        }
      />
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: panY }],
          elevation: 999, // for Android
        },
      ]}
    >
      <View style={styles.overlay} />
      <View style={styles.content} {...panResponder.panHandlers}>
        <View style={styles.handle} />
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={24} color="#fff" style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search movies & TV shows..."
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              <Ionicons name="close-circle" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {renderContent()}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: DRAWER_HEIGHT,
    overflow: 'hidden',
    zIndex: 999, // Ensure it's above everything
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 10,
    backgroundColor: 'rgba(32, 32, 32, 0.95)',
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    padding: Platform.OS === 'ios' ? 8 : 6,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  resultsList: {
    paddingBottom: 20,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  resultImage: {
    width: 50,
    height: 75,
    borderRadius: 4,
  },
  resultInfo: {
    marginLeft: 15,
    flex: 1,
  },
  resultTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultYear: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  loader: {
    marginTop: 20,
  },
  noResults: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    backdropFilter: 'blur(10px)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
});

export default SearchDrawer;
