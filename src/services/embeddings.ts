import AsyncStorage from '@react-native-async-storage/async-storage';

const VOCAB_CACHE_KEY = 'embedding_vocab_cache';
const EMBEDDING_CACHE_KEY = 'embedding_cache';
const CACHE_VERSION = '1.0';

class EmbeddingService {
  private readonly embeddingDim = 384;
  private readonly vocabCache = new Map<string, number>();
  private readonly embeddingCache = new Map<string, number[]>();
  private readonly maxCacheSize = 1000;
  private vocabIndex = 0;

  async initialize() {
    try {
      // Load cached vocabulary and embeddings
      const storedVocab = await AsyncStorage.getItem(VOCAB_CACHE_KEY);
      const storedEmbeddings = await AsyncStorage.getItem(EMBEDDING_CACHE_KEY);
      
      if (storedVocab && storedEmbeddings) {
        const { version, vocab, index } = JSON.parse(storedVocab);
        if (version === CACHE_VERSION) {
          this.vocabCache = new Map(vocab);
          this.vocabIndex = index;
          this.embeddingCache = new Map(JSON.parse(storedEmbeddings));
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing embedding service:', error);
      return false;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const cacheKey = this.getCacheKey(text);
    const cached = this.embeddingCache.get(cacheKey);
    if (cached) return cached;

    try {
      const words = this.preprocessText(text);
      const embedding = new Array(this.embeddingDim).fill(0);
      
      words.forEach((word, index) => {
        this.addWordToEmbedding(word, index, embedding);
      });

      const normalizedEmbedding = this.normalizeEmbedding(embedding);
      
      // Cache the result
      this.cacheEmbedding(cacheKey, normalizedEmbedding);
      this.persistCacheIfNeeded();

      return normalizedEmbedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  private preprocessText(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)            // Split on whitespace
      .filter(w => w.length > 2); // Remove short words
  }

  private addWordToEmbedding(word: string, index: number, embedding: number[]) {
    if (!this.vocabCache.has(word)) {
      this.vocabCache.set(word, this.vocabIndex++);
    }
    const wordIndex = this.vocabCache.get(word)!;
    
    // Enhanced embedding algorithm using positional encoding
    for (let i = 0; i < this.embeddingDim; i++) {
      const position = wordIndex % this.embeddingDim;
      const angle = index / Math.pow(10000, (2 * i) / this.embeddingDim);
      embedding[position] += Math.sin(angle) * (1 / (index + 1));
    }
  }

  private normalizeEmbedding(embedding: number[]): number[] {
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / (magnitude || 1));
  }

  private getCacheKey(text: string): string {
    return text.trim().toLowerCase().slice(0, 100);
  }

  private cacheEmbedding(key: string, embedding: number[]) {
    if (this.embeddingCache.size >= this.maxCacheSize) {
      const firstKey = this.embeddingCache.keys().next().value;
      this.embeddingCache.delete(firstKey);
    }
    this.embeddingCache.set(key, embedding);
  }

  private async persistCacheIfNeeded() {
    // Persist cache periodically (every 100 new entries)
    if (this.vocabIndex % 100 === 0) {
      try {
        await AsyncStorage.setItem(VOCAB_CACHE_KEY, JSON.stringify({
          version: CACHE_VERSION,
          vocab: Array.from(this.vocabCache.entries()),
          index: this.vocabIndex
        }));
        await AsyncStorage.setItem(EMBEDDING_CACHE_KEY, 
          JSON.stringify(Array.from(this.embeddingCache.entries()))
        );
      } catch (error) {
        console.error('Error persisting cache:', error);
      }
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.generateEmbedding(text)));
  }
}

export const embeddingService = new EmbeddingService();