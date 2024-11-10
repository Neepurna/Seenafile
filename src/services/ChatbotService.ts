import { db } from '../firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { searchMovies } from './api';

interface ChatResponse {
  text: string;
  movies?: any[];
  intent?: string;
}

class ChatbotService {
  private patterns = {
    search: /(search|find|looking for|watch)\s+(movie|film|shows?)\s*(about|with|called)?\s*(.+)/i,
    recommend: /(recommend|suggestion|what should|similar to)/i,
    greeting: /^(hi|hello|hey|greetings)/i,
    help: /(help|how|what can)/i
  };

  private detectIntent(input: string): { intent: string; params?: string } {
    if (this.patterns.search.test(input)) {
      const match = input.match(this.patterns.search);
      return { intent: 'movie_search', params: match?.[4] };
    }
    if (this.patterns.recommend.test(input)) {
      return { intent: 'recommendation' };
    }
    if (this.patterns.greeting.test(input)) {
      return { intent: 'greeting' };
    }
    if (this.patterns.help.test(input)) {
      return { intent: 'help' };
    }
    return { intent: 'unknown' };
  }

  private async handleMovieSearch(query: string): Promise<ChatResponse> {
    const movies = await searchMovies(query);
    return {
      text: movies.length > 0 
        ? "Here's what I found:" 
        : "I couldn't find any movies matching your search.",
      movies,
      intent: 'movie_search'
    };
  }

  private async handleMovieRecommendation(): Promise<ChatResponse> {
    try {
      const snapshot = await getDocs(collection(db, 'user_movie_preferences'));
      const genres = new Set<number>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        data.genres?.forEach((genre: number) => genres.add(genre));
      });

      const movies = await searchMovies('', { with_genres: Array.from(genres).join(',') });
      return {
        text: "Based on your preferences, you might enjoy these movies:",
        movies,
        intent: 'recommendation'
      };
    } catch (error) {
      console.error('Recommendation error:', error);
      return {
        text: "I'm having trouble getting recommendations right now.",
        intent: 'error'
      };
    }
  }

  public async processMessage(input: string): Promise<ChatResponse> {
    const { intent, params } = this.detectIntent(input.toLowerCase());

    let response: ChatResponse;
    switch (intent) {
      case 'movie_search':
        response = await this.handleMovieSearch(params || input);
        break;
      case 'recommendation':
        response = await this.handleMovieRecommendation();
        break;
      case 'greeting':
        response = {
          text: "Hello! I can help you find movies or give recommendations. What would you like to know?",
          intent: 'greeting'
        };
        break;
      case 'help':
        response = {
          text: "I can help you:\n• Search for movies\n• Get recommendations\n• Learn about new releases\nJust ask me in natural language!",
          intent: 'help'
        };
        break;
      default:
        response = {
          text: "I'm not sure what you're asking. Try asking about specific movies or ask for recommendations!",
          intent: 'unknown'
        };
    }

    await this.saveInteraction(input, response);
    return response;
  }

  private async saveInteraction(input: string, response: ChatResponse) {
    try {
      await addDoc(collection(db, 'chat_interactions'), {
        input,
        response,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error saving interaction:', error);
    }
  }

  public async initialize() {
    // No initialization needed for pattern-based approach
    return Promise.resolve();
  }
}

export const chatbotService = new ChatbotService();