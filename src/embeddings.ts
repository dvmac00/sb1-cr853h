import { TFile, Vault } from 'obsidian';
import axios from 'axios';

export interface Embedding {
  id: string;
  vector: number[];
}

export class EmbeddingManager {
  private vault: Vault;
  private ollamaEndpoint: string;

  constructor(vault: Vault, ollamaEndpoint: string) {
    this.vault = vault;
    this.ollamaEndpoint = ollamaEndpoint;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await axios.post(`${this.ollamaEndpoint}/api/embeddings`, {
        model: 'llama2', // You may want to make this configurable
        prompt: text,
      });
      return response.data.embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  async chunkNote(file: TFile): Promise<string[]> {
    const content = await this.vault.read(file);
    // Simple chunking strategy: split by paragraphs
    return content.split('\n\n').filter(chunk => chunk.trim().length > 0);
  }

  async processNote(file: TFile): Promise<Embedding[]> {
    const chunks = await this.chunkNote(file);
    const embeddings: Embedding[] = [];

    for (const [index, chunk] of chunks.entries()) {
      const vector = await this.generateEmbedding(chunk);
      embeddings.push({
        id: `${file.path}-${index}`,
        vector,
      });
    }

    return embeddings;
  }

  // TODO: Implement methods to store and retrieve embeddings using IndexedDB
}