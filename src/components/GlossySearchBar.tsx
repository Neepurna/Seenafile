import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ViewStyle,
  Modal,
  Animated,
  FlatList,
  Text,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Movie } from '../services/api';
import { fetchTrendingMovies, searchMoviesAndShows } from '../services/tmdb';

const { width, height } = Dimensions.get('window');

interface GlossySearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  placeholder?: string;
  style?: ViewStyle;
  onMovieSelect?: (movie: Movie) => void;
}

const GlossySearchBar = React.forwardRef<TextInput, GlossySearchBarProps>((props, ref) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [slideAnim] = useState(new Animated.Value(height));
  const inputRef = useRef<TextInput>(null);

  const handlePress = () => {
    setIsModalVisible(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  useEffect(() => {
    if (isModalVisible) {
      loadRecommendations();
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: height,
        useNativeDriver: true,
        friction: 8,
      }).start();
    }
  }, [isModalVisible]);

  const loadRecommendations = async () => {
    try {
      const response = await fetchTrendingMovies();
      if (response?.results) {
        setRecommendations(response.results.slice(0, 9));
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.trim()) {
      try {
        const results = await searchMoviesAndShows(text);
        // Fix: searchMoviesAndShows returns array directly, not an object with results property
        setSearchResults(results || []);
      } catch (error) {
        console.error('Error searching:', error);
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
    }
  };

  const renderMovieItem = ({ item }: { item: Movie }) => (
    <TouchableOpacity 
      style={styles.gridItem} 
      onPress={() => {
        props.onMovieSelect?.(item);
        setIsModalVisible(false);
        setSearchQuery('');
      }}
    >
      <Image
        source={{ 
          uri: `https://image.tmdb.org/t/p/w200${item.poster_path}` 
        }}
        style={styles.gridImage}
      />
      <Text style={styles.gridTitle} numberOfLines={2}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity onPress={handlePress}>
        <View style={[styles.container, props.style]}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.7)" />
            <Text style={styles.placeholder}>{props.placeholder || 'Search movies...'}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="none"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.modalContent,
              {
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.searchInputContainer}>
              <TextInput
                ref={inputRef}
                style={styles.modalSearchInput}
                value={searchQuery}
                onChangeText={handleSearch}
                placeholder="Search movies..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                autoFocus
              />
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={searchQuery ? searchResults : recommendations}
              renderItem={renderMovieItem}
              keyExtractor={(item) => item.id.toString()}
              numColumns={3}
              contentContainerStyle={styles.gridContainer}
              ListHeaderComponent={() => (
                <Text style={styles.sectionTitle}>
                  {searchQuery ? 'Search Results' : 'Trending Movies'}
                </Text>
              )}
            />
          </Animated.View>
        </View>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 0,
    width: '100%',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // More transparent
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 45,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        backdropFilter: 'blur(10px)',
      },
      android: {
        elevation: 5,
        // For Android, we'll add a subtle gradient
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
      },
    }),
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
    paddingVertical: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  clearButton: {
    padding: 6,
    marginLeft: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    padding: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalSearchInput: {
    flex: 1,
    height: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 15,
    color: '#fff',
    fontSize: 16,
    marginRight: 10,
  },
  closeButton: {
    padding: 5,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  gridContainer: {
    paddingBottom: 20,
  },
  gridItem: {
    width: (width - 60) / 3,
    marginBottom: 15,
    marginHorizontal: 5,
  },
  gridImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  gridTitle: {
    color: '#fff',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  placeholder: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    marginLeft: 10,
  },
});

export default GlossySearchBar;
