import { Plugin, PluginSettingTab, App, Setting, TFile, Notice } from 'obsidian';
import axios from 'axios';
import { EmbeddingManager } from './src/embeddings';
import { DatabaseManager } from './src/db';
import { Atomizer } from './src/atomizer';
import { TitleSuggester } from './src/titleSuggester';
import { FabricPatterns } from './src/fabricPatterns';
import { AIChat } from './src/aiChat';

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

  async onload() {
    await this.loadSettings();

    this.embeddingManager = new EmbeddingManager(this.app.vault, this.settings.ollamaEndpoint);
    this.databaseManager = new DatabaseManager();
    await this.databaseManager.init();
    this.atomizer = new Atomizer(this.app.vault, this.settings.ollamaEndpoint);
    this.titleSuggester = new TitleSuggester(this.app.vault, this.settings.ollamaEndpoint);
    this.fabricPatterns = new FabricPatterns(this.app.vault, this.settings.ollamaEndpoint);
    this.aiChat = new AIChat(this.app, this.settings.ollamaEndpoint);

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
}

// ... (AIPluginSettingTab remains the same)