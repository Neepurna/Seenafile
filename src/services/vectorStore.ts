import AsyncStorage from '@react-native-async-storage/async-storage';
import { Movie } from './api';
import { tensorflowService } from './tensorflowService';

const VECTOR_STORE_KEY = 'vector_store_data';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface MovieEmbedding {
  id: number;
  embedding: number[];
  movie: Movie;
}

export class VectorStore {
  private movies: MovieEmbedding[] = [];
  private cache: Map<string, { data: Movie[]; timestamp: number }> = new Map();

  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(VECTOR_STORE_KEY);
      if (stored) {
        this.movies = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading vector store:', error);
    }
  }

  async addMovie(movie: Movie, embedding: number[]) {
    this.movies.push({
      id: movie.id,
      embedding,
      movie,
    });
    await this.persistStore();
  }

  async findSimilarMovies(queryEmbedding: number[], limit: number = 3): Promise<Movie[]> {
    const cacheKey = this.getCacheKey(queryEmbedding);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const results = await this.enhancedSearch(queryEmbedding, limit);
    this.setInCache(cacheKey, results);
    return results;
  }

  private async enhancedSearch(queryEmbedding: number[], limit: number): Promise<Movie[]> {
    // Convert query embedding to tensor
    const queryTensor = tf.tensor2d([queryEmbedding]);
    
    // Batch process similarities using TensorFlow
    const movieEmbeddings = tf.tensor2d(
      this.movies.map(m => m.embedding)
    );

    const similarities = tf.matMul(queryTensor, movieEmbeddings.transpose());
    const topIndices = await this.getTopK(similarities, limit);
    
    // Cleanup tensors
    queryTensor.dispose();
    movieEmbeddings.dispose();
    similarities.dispose();

    return topIndices.map(i => this.movies[i].movie);
  }

  private async getTopK(similarities: tf.Tensor, k: number): Promise<number[]> {
    const values = await similarities.data();
    return Array.from(values.keys())
      .sort((a, b) => values[b] - values[a])
      .slice(0, k);
  }

  private async persistStore(): Promise<void> {
    try {
      await AsyncStorage.setItem(VECTOR_STORE_KEY, JSON.stringify(this.movies));
    } catch (error) {
      console.error('Error persisting vector store:', error);
    }
  }

  private getCacheKey(embedding: number[]): string {
    return embedding.slice(0, 5).join('-');
  }

  private getFromCache(key: string): Movie[] | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > CACHE_EXPIRY) {
      this.cache.delete(key);
      return null;
    }
    return cached.data;
  }

  private setInCache(key: string, data: Movie[]): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

export const vectorStore = new VectorStore();