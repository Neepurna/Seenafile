import React, { useEffect, useState, memo, useRef } from 'react';
import { View, StyleSheet, TextInput, Image, Dimensions, ActivityIndicator, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Movie } from '../services/api';
import { fetchRandomMovies } from '../services/helper';

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

const MovieChatScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Array<{text: string, isBot: boolean}>>([]);
  const [userInput, setUserInput] = useState('');
  const [recommendedMovies, setRecommendedMovies] = useState<Movie[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    initializeChat();
  }, []);

  const initializeChat = async () => {
    try {
      const movies = await fetchRandomMovies('popular', 3);
      setRecommendedMovies(movies);
      
      const welcomeMessages = [
        {
          text: "👋 Welcome to MovieChat! I'm your personal movie companion.",
          isBot: true
        },
        {
          text: "Here are some popular movies you might enjoy:",
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
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg, index) => (
            <View key={index} style={[styles.message, msg.isBot ? styles.botMessage : styles.userMessage]}>
              <Text style={styles.messageText}>{msg.text}</Text>
            </View>
          ))}
          {messages.length === 2 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendationsScroll}>
              {recommendedMovies.map(movie => (
                <MovieBanner key={movie.id} movie={movie} />
              ))}
            </ScrollView>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.chatInput}
            value={userInput}
            onChangeText={setUserInput}
            placeholder="Ask me about movies..."
            placeholderTextColor="#666"
          />
          <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
            <Text style={styles.sendButtonText}>Send</Text>
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
});

export default MovieChatScreen;
