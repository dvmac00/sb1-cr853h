import { TFile, Vault } from 'obsidian';
import axios from 'axios';

export class TitleSuggester {
  private vault: Vault;
  private ollamaEndpoint: string;

  constructor(vault: Vault, ollamaEndpoint: string) {
    this.vault = vault;
    this.ollamaEndpoint = ollamaEndpoint;
  }

  async suggestTitle(file: TFile): Promise<string> {
    const content = await this.vault.read(file);
    const similarNotes = await this.findSimilarNotes(file);
    
    try {
      const response = await axios.post(`${this.ollamaEndpoint}/api/generate`, {
        model: 'llama2',
        prompt: `Suggest a title for the following note content. Consider these similar note titles for context: ${similarNotes.join(', ')}. Return only the suggested title as plain text:\n\n${content}`,
      });

      return response.data.response.trim();
    } catch (error) {
      console.error('Failed to suggest title:', error);
      throw error;
    }
  }

  private async findSimilarNotes(file: TFile): Promise<string[]> {
    const allFiles = this.vault.getMarkdownFiles();
    const currentTags = this.getNoteTags(file);
    
    const similarNotes = allFiles
      .filter(f => f.path !== file.path)
      .map(f => ({
        file: f,
        similarity: this.calculateSimilarity(currentTags, this.getNoteTags(f))
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map(item => item.file.basename);

    return similarNotes;
  }

  private getNoteTags(file: TFile): Set<string> {
    const cache = this.app.metadataCache.getFileCache(file);
    return new Set(cache?.tags?.map(tag => tag.tag.toLowerCase()) || []);
  }

  private calculateSimilarity(tags1: Set<string>, tags2: Set<string>): number {
    const intersection = new Set([...tags1].filter(tag => tags2.has(tag)));
    const union = new Set([...tags1, ...tags2]);
    return intersection.size / union.size;
  }
}