
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import * as use from '@tensorflow-models/universal-sentence-encoder';

class TensorflowService {
  private model: use.UniversalSentenceEncoder | null = null;

  async initialize() {
    await tf.ready();
    this.model = await use.load();
    console.log('TensorFlow model loaded');
    return true;
  }

  async encodeText(text: string): Promise<Float32Array> {
    if (!this.model) throw new Error('Model not initialized');
    
    const embeddings = await this.model.embed(text);
    const data = await embeddings.data();
    return data;
  }

  async encodeBatch(texts: string[]): Promise<Float32Array[]> {
    if (!this.model) throw new Error('Model not initialized');
    
    const embeddings = await this.model.embed(texts);
    const data = await embeddings.array();
    return data;
  }
}

export const tensorflowService = new TensorflowService();