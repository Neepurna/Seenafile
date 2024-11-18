import { Movie } from './api';
import { vectorStore } from './vectorStore';
import { embeddingService } from './embeddings';
import { Subject } from 'rxjs';
import { RateLimiter } from 'limiter';
import { tensorflowService } from './tensorflowService';

const limiter = new RateLimiter({
  tokensPerInterval: 5,
  interval: "second"
});

export class RAGProcessor {
  private context: Movie[] = [];
  private messageStream = new Subject<string>();
  private lastMovies: Movie[] = [];
  private conversationState: {
    currentMovie?: Movie;
    askedForMore: boolean;
  } = {
    askedForMore: false
  };

  async processQuery(
    query: string,
    context: Movie[],
    onToken: (token: string) => void
  ): Promise<void> {
    try {
      await limiter.removeTokens(1);
      
      // Use TensorFlow encoding
      const queryVector = await tensorflowService.encodeText(query);
      const similarMovies = await vectorStore.findSimilarMovies(Array.from(queryVector));
      
      // Enhanced context building
      const relevantContext = await this.buildContext(query, similarMovies);
      const response = await this.generateEnhancedResponse(query, relevantContext);
      
      // Stream response
      for (const token of response.split(' ')) {
        onToken(token + ' ');
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error('RAG Processing Error:', error);
      throw error;
    }
  }

  private async buildContext(query: string, movies: Movie[]): Promise<string> {
    const movieDescriptions = movies.map(m => `${m.title} (${m.release_date?.slice(0,4)}): ${m.overview}`);
    const embeddings = await tensorflowService.encodeBatch(movieDescriptions);
    
    return movieDescriptions
      .filter((_, i) => embeddings[i].some(v => !isNaN(v)))
      .join('\n');
  }

  private generateResponse(query: string, similarMovies: Movie[]): string {
    const queryLower = query.toLowerCase();
    
    // Handle greetings
    if (/^(hi|hello|hey|greetings)/i.test(queryLower)) {
      return "Hello! I'm your movie companion. Would you like some movie recommendations?";
    }

    // Handle positive responses to previous questions
    if (/^(yes|yeah|sure|okay|tell me more|please)/i.test(queryLower)) {
      if (this.conversationState.currentMovie) {
        const movie = this.conversationState.currentMovie;
        return `${movie.title} (${movie.release_date?.slice(0,4)}) - ${movie.overview || 'No overview available'}. Would you like to know about similar movies?`;
      }
    }

    // Handle recommendation requests
    if (queryLower.includes('recommend') || queryLower.includes('suggest')) {
      this.lastMovies = similarMovies;
      const movie = similarMovies[0];
      this.conversationState.currentMovie = movie;
      return `I recommend checking out "${movie.title}". It's a ${movie.media_type || 'movie'} that many people are enjoying. Would you like to know more about it?`;
    }

    // Reset conversation if no context matches
    this.conversationState.currentMovie = similarMovies[0];
    return `I found "${similarMovies[0].title}". Would you like to know more about it?`;
  }
}

export const ragProcessor = new RAGProcessor();