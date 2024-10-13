import { TFile, Vault } from 'obsidian';
import axios from 'axios';

interface AtomicNote {
  title: string;
  content: string;
}

export class Atomizer {
  private vault: Vault;
  private ollamaEndpoint: string;

  constructor(vault: Vault, ollamaEndpoint: string) {
    this.vault = vault;
    this.ollamaEndpoint = ollamaEndpoint;
  }

  async atomizeNote(file: TFile): Promise<AtomicNote[]> {
    const content = await this.vault.read(file);
    const concepts = await this.identifyKeyConcepts(content);
    const atomicNotes: AtomicNote[] = [];

    for (const concept of concepts) {
      const atomicNote = await this.generateAtomicNote(concept, content);
      atomicNotes.push(atomicNote);
    }

    return atomicNotes;
  }

  private async identifyKeyConcepts(content: string): Promise<string[]> {
    try {
      const response = await axios.post(`${this.ollamaEndpoint}/api/generate`, {
        model: 'llama2',
        prompt: `Identify key concepts in the following text. Return the concepts as a JSON array of strings:\n\n${content}`,
        format: 'json',
      });

      return JSON.parse(response.data.response);
    } catch (error) {
      console.error('Failed to identify key concepts:', error);
      throw error;
    }
  }

  private async generateAtomicNote(concept: string, sourceContent: string): Promise<AtomicNote> {
    try {
      const response = await axios.post(`${this.ollamaEndpoint}/api/generate`, {
        model: 'llama2',
        prompt: `Generate an atomic note about "${concept}" based on the following source content. Return the result as a JSON object with "title" and "content" fields:\n\n${sourceContent}`,
        format: 'json',
      });

      return JSON.parse(response.data.response);
    } catch (error) {
      console.error('Failed to generate atomic note:', error);
      throw error;
    }
  }

  async createAtomicNotes(sourceFile: TFile, atomicNotes: AtomicNote[]): Promise<void> {
    const sourceFileName = sourceFile.basename;
    const atomicNotesFolder = `${sourceFile.parent.path}/Atomic Notes/${sourceFileName}`;

    for (const note of atomicNotes) {
      const sanitizedTitle = this.sanitizeFileName(note.title);
      const filePath = `${atomicNotesFolder}/${sanitizedTitle}.md`;
      const fileContent = this.formatAtomicNote(note, sourceFile);

      await this.vault.create(filePath, fileContent);
    }

    // Update the source file with backlinks
    const backlinks = this.generateBacklinks(atomicNotes, sourceFileName);
    await this.appendBacklinksToSource(sourceFile, backlinks);
  }

  private sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }

  private formatAtomicNote(note: AtomicNote, sourceFile: TFile): string {
    return `# ${note.title}\n\n${note.content}\n\n---\nSource: [[${sourceFile.basename}]]\n`;
  }

  private generateBacklinks(atomicNotes: AtomicNote[], sourceFileName: string): string {
    const links = atomicNotes.map(note => `- [[Atomic Notes/${sourceFileName}/${this.sanitizeFileName(note.title)}|${note.title}]]`);
    return `\n\n## Atomic Notes\n${links.join('\n')}`;
  }

  private async appendBacklinksToSource(sourceFile: TFile, backlinks: string): Promise<void> {
    const content = await this.vault.read(sourceFile);
    const updatedContent = `${content}\n${backlinks}`;
    await this.vault.modify(sourceFile, updatedContent);
  }
}
</boltArtifact>

Now, let's update our `main.ts` file to integrate the Atomizer:

<boltArtifact id="obsidian-ai-plugin-main-update" title="Obsidian AI Plugin Main Update">
<boltAction type="file" filePath="main.ts">
import { Plugin, PluginSettingTab, App, Setting, TFile, Notice } from 'obsidian';
import axios from 'axios';
import { EmbeddingManager } from './src/embeddings';
import { DatabaseManager } from './src/db';
import { Atomizer } from './src/atomizer';

interface AIPluginSettings {
  ollamaEndpoint: string;
}

const DEFAULT_SETTINGS: AIPluginSettings = {
  ollamaEndpoint: 'http://localhost:11434',
};

export default class AIPlugin extends Plugin {
  settings: AIPluginSettings;
  embeddingManager: EmbeddingManager;
  databaseManager: DatabaseManager;
  atomizer: Atomizer;

  async onload() {
    await this.loadSettings();

    this.embeddingManager = new EmbeddingManager(this.app.vault, this.settings.ollamaEndpoint);
    this.databaseManager = new DatabaseManager();
    await this.databaseManager.init();
    this.atomizer = new Atomizer(this.app.vault, this.settings.ollamaEndpoint);

    this.addSettingTab(new AIPluginSettingTab(this.app, this));

    this.addRibbonIcon('cpu', 'AI Plugin', () => {
      // TODO: Implement main plugin functionality
    });

    this.addCommand({
      id: 'atomize-note',
      name: 'Atomize Current Note',
      callback: () => this.atomizeCurrentNote(),
    });

    this.addCommand({
      id: 'generate-embeddings',
      name: 'Generate Embeddings for Current Note',
      callback: () => this.generateEmbeddingsForCurrentNote(),
    });

    // Listen for file changes to update embeddings
    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (file instanceof TFile) {
          this.updateEmbeddingsForFile(file);
        }
      })
    );
  }

  // ... (previous methods remain the same)

  async atomizeCurrentNote() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice('No active file');
      return;
    }

    try {
      new Notice('Atomizing note...');
      const atomicNotes = await this.atomizer.atomizeNote(activeFile);
      await this.atomizer.createAtomicNotes(activeFile, atomicNotes);
      new Notice(`Created ${atomicNotes.length} atomic notes`);
    } catch (error) {
      console.error('Failed to atomize note:', error);
      new Notice('Failed to atomize note. Check console for details.');
    }
  }

  // ... (other methods remain the same)
}

// ... (AIPluginSettingTab remains the same)