import * as Crypto from 'expo-crypto';
import base64 from 'base-64';

export class ChatEncryption {
  static async generateChatKey(): Promise<string> {
    try {
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      return base64.encode(String.fromCharCode(...new Uint8Array(randomBytes)));
    } catch (error) {
      console.error('Error generating chat key:', error);
      throw new Error('Failed to generate encryption key');
    }
  }

  static async encryptMessage(text: string, keyBase64: string): Promise<{ 
    encryptedText: string; 
    iv: string; 
  }> {
    try {
      // Generate IV
      const iv = await Crypto.getRandomBytesAsync(16);
      const ivString = base64.encode(String.fromCharCode(...new Uint8Array(iv)));

      // Create encrypted data using expo-crypto
      const data = new TextEncoder().encode(text);
      const key = base64.decode(keyBase64);
      
      // Use simple XOR encryption for demo (replace with proper encryption in production)
      const encrypted = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i++) {
        encrypted[i] = data[i] ^ key.charCodeAt(i % key.length);
      }

      return {
        encryptedText: base64.encode(String.fromCharCode(...encrypted)),
        iv: ivString
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  static decryptMessage(
    encryptedText: string,
    iv: string,
    keyBase64: string
  ): string {
    try {
      // Decode the base64 strings
      const encrypted = new Uint8Array(
        base64.decode(encryptedText).split('').map(c => c.charCodeAt(0))
      );
      const key = base64.decode(keyBase64);

      // Decrypt using XOR
      const decrypted = new Uint8Array(encrypted.length);
      for (let i = 0; i < encrypted.length; i++) {
        decrypted[i] = encrypted[i] ^ key.charCodeAt(i % key.length);
      }

      // Convert back to string
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      return '🔒 Encrypted message';
    }
  }
}
