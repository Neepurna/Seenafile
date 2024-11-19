import React, { useEffect, useState, memo, useRef } from 'react';
import { View, StyleSheet, TextInput, Image, Dimensions, ActivityIndicator, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Movie } from '../services/api';
import { fetchRandomMovies } from '../services/helper';
import { searchMovies, fetchTrendingMovies } from '../services/tmdb'; // Update this import

const { width } = Dimensions.get('window');

const MovieBanner = memo(({ movie }: { movie: Movie }) => (
  <View style={styles.movieBanner}>
    <Image
      source={{ uri: `https://image.tmdb.org/t/p/w500${movie.poster_path}` }}
      style={styles.bannerImage}
    />
    <Text style={styles.movieTitle}>{movie.title}</Text>
  </View>
));

// Modify SearchResult component for grid layout
const SearchResult = memo(({ movie }: { movie: Movie }) => (
  <View style={styles.gridItem}>
    <Image
      source={{ uri: `https://image.tmdb.org/t/p/w500${movie.poster_path}` }}
      style={styles.gridImage}
    />
    <Text style={styles.gridMovieTitle} numberOfLines={1}>
      {movie.title}
    </Text>
    <Text style={styles.gridRating}>⭐ {movie.vote_average.toFixed(1)}</Text>
  </View>
));

const MovieChatScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Array<{text: string, isBot: boolean}>>([]);
  const [userInput, setUserInput] = useState('');
  const [recommendedMovies, setRecommendedMovies] = useState<Movie[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    initializeChat();
  }, []);

  const initializeChat = async () => {
    try {
      // Replace fetchRandomMovies with fetchTrendingMovies
      const trendingResponse = await fetchTrendingMovies();
      const movies = trendingResponse.results.slice(0, 3);
      setRecommendedMovies(movies);
      
      const welcomeMessages = [
        {
          text: "👋 Welcome to MovieChat! I'm your personal movie companion.",
          isBot: true
        },
        {
          text: "Here are some trending movies you might enjoy:",
          isBot: true
        }
      ];
      setMessages(welcomeMessages);
    } catch (error) {
      console.error('Error initializing chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const processMessage = (input: string) => {
    const text = input.toLowerCase();
    
    // Simple keyword matching instead of TensorFlow processing
    if (text.includes('recommend') || text.includes('suggestion')) {
      return "Based on the latest releases, I'd recommend checking out the movies shown above!";
    }
    if (text.includes('latest') || text.includes('new')) {
      return "You can see the latest releases in the recommendations section at the top.";
    }
    if (text.includes('hello') || text.includes('hi')) {
      return "Hi! I'm your movie chat assistant. Feel free to ask about movies!";
    }
    return "I understand you're interested in movies. Could you please rephrase your question?";
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) return;
    
    const newMessages = [
      ...messages,
      { text: userInput, isBot: false },
      { text: processMessage(userInput), isBot: true }
    ];
    
    setMessages(newMessages);
    setUserInput('');
    
    // Scroll to bottom after message is sent
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Modify handleInputChange to limit results to 6
  const handleInputChange = async (text: string) => {
    setUserInput(text);
    
    if (text.startsWith('@')) {
      setIsSearching(true);
      const searchQuery = text.slice(1);
      if (searchQuery.length > 2) {
        try {
          const searchResponse = await searchMovies(searchQuery);
          // Limit results to 6 items and sort by popularity
          const limitedResults = searchResponse.results
            .sort((a, b) => b.vote_average - a.vote_average)
            .slice(0, 6);
          setSearchResults(limitedResults);
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults([]);
        }
      }
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  // Add renderGridItem function
  const renderGridItem = ({ item }: { item: Movie }) => (
    <SearchResult movie={item} />
  );

  // Replace ScrollView with FlatList for chat messages
  const renderChatItem = ({ item, index }: { item: {text: string, isBot: boolean}, index: number }) => (
    <View style={[styles.message, item.isBot ? styles.botMessage : styles.userMessage]}>
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

  // Render recommendations header
  const renderHeader = () => (
    messages.length === 2 ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendationsScroll}>
        {recommendedMovies.map(movie => (
          <MovieBanner key={movie.id} movie={movie} />
        ))}
      </ScrollView>
    ) : null
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={24} color="#fff" />
        <Text style={styles.loadingText}>Preparing your movie experience...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {!isSearching ? (
          <FlatList
            key="chat"
            data={messages}
            renderItem={renderChatItem}
            keyExtractor={(_, index) => index.toString()}
            contentContainerStyle={styles.messagesContent}
            ListHeaderComponent={renderHeader}
            ref={scrollViewRef}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          />
        ) : (
          <FlatList
            key="search"
            data={searchResults}
            renderItem={renderGridItem}
            keyExtractor={(item) => item.id.toString()}
            numColumns={3}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContainer}
          />
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.chatInput}
            value={userInput}
            onChangeText={handleInputChange}
            placeholder="Type '@' to search movies or chat normally"
            placeholderTextColor="#666"
          />
          <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
            <Text style={styles.sendButtonText}>
              {isSearching ? 'Clear' : 'Send'}
            </Text>
          </TouchableOpacity>
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
  chatContainer: {
    flex: 1,
    backgroundColor: '#111',
    justifyContent: 'space-between', // Add this
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 80 : 16, // Add this
  },
  message: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 16,
    maxWidth: '85%',
  },
  botMessage: {
    backgroundColor: '#333',
    alignSelf: 'flex-start',
  },
  userMessage: {
    backgroundColor: '#0066cc',
    alignSelf: 'flex-end',
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#222',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingBottom: Platform.OS === 'ios' ? 30 : 16, // Add this
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#333',
    color: '#fff',
    padding: 16,
    borderRadius: 24,
    marginRight: 8,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#0066cc',
    padding: 16,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  recommendationsScroll: {
    marginVertical: 16,
  },
  movieBanner: {
    marginRight: 12,
    width: 140,
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
  messagesContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  searchResultsContainer: {
    padding: 10,
  },
  searchResult: {
    flexDirection: 'row',
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  searchResultImage: {
    width: 100,
    height: 150,
    borderRadius: 8,
  },
  movieInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'space-between',
  },
  movieDate: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  movieRating: {
    color: '#ffb700',
    fontSize: 14,
    marginTop: 4,
  },
  movieOverview: {
    color: '#ccc',
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  gridContainer: {
    padding: 8,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridItem: {
    width: (width - 48) / 3, // 48 = padding * 2 + space between items
    alignItems: 'center',
  },
  gridImage: {
    width: (width - 48) / 3 - 8,
    height: ((width - 48) / 3 - 8) * 1.5,
    borderRadius: 8,
  },
  gridMovieTitle: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    width: '100%',
    paddingHorizontal: 4,
  },
  gridRating: {
    color: '#ffb700',
    fontSize: 12,
    marginTop: 2,
  },
});

export default MovieChatScreen;
