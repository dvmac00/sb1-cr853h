import { Plugin, PluginSettingTab, App, Setting, TFile, Notice, FuzzySuggestModal } from 'obsidian';
import axios from 'axios';
import { EmbeddingManager } from './src/embeddings';
import { DatabaseManager } from './src/db';
import { Atomizer } from './src/atomizer';
import { TitleSuggester } from './src/titleSuggester';
import { FabricPatterns } from './src/fabricPatterns';
import { AIChat } from './src/aiChat';
import { VaultQuerier } from './src/vaultQuerier';

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
  titleSuggester: TitleSuggester;
  fabricPatterns: FabricPatterns;
  aiChat: AIChat;
  vaultQuerier: VaultQuerier;

  async onload() {
    await this.loadSettings();

    this.embeddingManager = new EmbeddingManager(this.app.vault, this.settings.ollamaEndpoint);
    this.databaseManager = new DatabaseManager();
    await this.databaseManager.init();
    this.atomizer = new Atomizer(this.app.vault, this.settings.ollamaEndpoint);
    this.titleSuggester = new TitleSuggester(this.app.vault, this.settings.ollamaEndpoint);
    this.fabricPatterns = new FabricPatterns(this.app.vault, this.settings.ollamaEndpoint);
    this.aiChat = new AIChat(this.app, this.settings.ollamaEndpoint);
    this.vaultQuerier = new VaultQuerier(this.app.vault, this.embeddingManager, this.databaseManager);

    this.addSettingTab(new AIPluginSettingTab(this.app, this));

    this.addRibbonIcon('message-square', 'AI Chat', () => {
      this.aiChat.openChatWindow();
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

    this.addCommand({
      id: 'suggest-title',
      name: 'Suggest Title for Current Note',
      callback: () => this.suggestTitleForCurrentNote(),
    });

    this.addCommand({
      id: 'apply-fabric-pattern',
      name: 'Apply Fabric Pattern to Current Note',
      callback: () => this.applyFabricPatternToCurrentNote(),
    });

    this.addCommand({
      id: 'open-ai-chat',
      name: 'Open AI Chat',
      callback: () => this.aiChat.openChatWindow(),
    });

    this.addCommand({
      id: 'query-vault',
      name: 'Query Vault',
      callback: () => this.openVaultQueryModal(),
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

  // ... (other methods remain the same)

  async openVaultQueryModal() {
    new VaultQueryModal(this.app, this.vaultQuerier).open();
  }
}

class VaultQueryModal extends FuzzySuggestModal<TFile> {
  private vaultQuerier: VaultQuerier;

  constructor(app: App, vaultQuerier: VaultQuerier) {
    super(app);
    this.vaultQuerier = vaultQuerier;
  }

  getItems(): TFile[] {
    return this.app.vault.getMarkdownFiles();
  }

  getItemText(item: TFile): string {
    return item.path;
  }

  async onChooseItem(item: TFile, evt: MouseEvent | KeyboardEvent): Promise<void> {
    const query = this.inputEl.value;
    const results = await this.vaultQuerier.queryVault(query);
    
    let resultContent = `# Query Results for "${query}"\n\n`;
    for (const result of results) {
      resultContent += `- [[${result.file.path}]] (Similarity: ${result.similarity.toFixed(4)})\n`;
    }

    const resultFile = await this.app.vault.create(`Query Results/${query}.md`, resultContent);
    this.app.workspace.activeLeaf.openFile(resultFile);
  }
}

// ... (AIPluginSettingTab remains the same)