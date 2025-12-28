import { Plugin, PluginSettingTab, Modal, Notice } from 'obsidian';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsComponent } from './components/Settings.jsx';
import { ModalComponent } from './components/DownloadModal.jsx';

// Plugin settings defaults
class ImageImporterSettings {
  constructor() {
    this.predefinedFolders = [];
    this.defaultExtension = 'jpg';
    this.defaultLocalImportFolder = '';
    this.defaultLocalImportBehavior = 'move';
    this.defaultConflictBehavior = 'replace';
    this.defaultDestinationFolderMode = 'manual';
    this.defaultPredefinedFolder = '';
    this.autoPasteClipboard = false;
  }
}

export default class ImageImporterPlugin extends Plugin {
  // Startup Code
  async onload() {
    this.settings = Object.assign(new ImageImporterSettings(), await this.loadData()); // Load saved plugin settings from data.json

    // Mount settings component as plugin's settings
    this.addSettingTab(new ImageImporterSettingsComponent(this.app, this));

    // Create a command to open the modal component
    this.addCommand({ id: 'open-image-importer', name: 'Open Image Importer', callback: () => new ImageImporterModalComponent(this.app, this).open() });
  }

  async saveSettings() { await this.saveData(this.settings); } // Define a function to save plugin settings into data.json

}

class ImageImporterSettingsComponent extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; } // Storing a reference to the app and plugin instance
  display() {
    const { containerEl } = this; // Obsidian-provided container element for settings
    containerEl.empty();
    const root = createRoot(containerEl); // Making it the root for React rendering
    root.render(React.createElement(SettingsComponent, {
      settings: this.plugin.settings,
      vault: this.app.vault,
      onChange: async (patch) => { Object.assign(this.plugin.settings, patch); await this.plugin.saveSettings(); this.display(); }, // when user modify settings, save and re-render
      onChooseExternalFolder: async (choose) => { // selecting the default local import folder
        let dialog = null;
        try { const electron = window.require?.('electron'); dialog = electron?.remote?.dialog || null; } catch {}
        try { if (!dialog) { const remote = window.require?.('@electron/remote'); dialog = remote?.dialog || null; } } catch {}
        if (!dialog) {
          new Notice("Windows Native dialog box for selecting folder can't be accessed");
          return;
        } 
        const defaultPath = this.plugin.settings.defaultLocalImportFolder || undefined;
        const res = await dialog.showOpenDialog({ title: 'Select default local import folder', defaultPath, properties: ['openDirectory', 'createDirectory'] });
        if (res?.canceled || !res?.filePaths?.length) return;
        const selectedPath = res.filePaths[0]; choose(selectedPath);
      }
    }));
  }
}

class ImageImporterModalComponent extends Modal {
  constructor(app, plugin, src) { super(app); this.plugin = plugin; this.src = src; } // Storing a reference to the app and plugin instance
  onOpen() {
    const { contentEl } = this; contentEl.empty(); // Obsidian-provided container element for modal
    const root = createRoot(contentEl); // Making it the root for React rendering
    root.render(React.createElement(ModalComponent, {
      src: this.src,
      settings: this.plugin.settings,
      vault: this.app.vault,
      onCancel: () => this.close(),
      onConfirm: async (payload) => {
        const filename = payload.filename + (payload.ext ? ('.' + payload.ext) : '');
        let destFolder = payload.destFolder || '';
        if (destFolder.startsWith('/')) { destFolder = destFolder.substring(1); }
        if (!destFolder) {
          new Notice("Image Import Failed: Destination folder to into which the image will be imported isn't specified");
          return;
        }
        const destPath = `${destFolder}/${filename}`;

        if (payload.conflictAction === 'replace') {
          const existingFile = this.app.vault.getAbstractFileByPath(destPath);
          if (existingFile) {
            await this.app.vault.delete(existingFile);
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        const finalPath = this.resolveConflict(destPath, payload.conflictAction);
        if (finalPath === null) {
          return;
        }

        if (payload.effectiveFile) {
          const ab = await payload.effectiveFile.arrayBuffer();
          await this.app.vault.createBinary(finalPath, new Uint8Array(ab));
          if (payload.importAction === 'cut' && payload.effectiveFile.path) {
            const fs = window.require?.('fs');
            if (fs) { fs.unlinkSync(payload.effectiveFile.path); }
          }
        } else if (payload.effectiveExternal) {
          await this.app.vault.createBinary(finalPath, payload.effectiveExternal.data);
          if (payload.importAction === 'cut') {
            const fs = window.require?.('fs');
            if (fs) { fs.unlinkSync(payload.effectiveExternal.path); }
          }
        } else if (payload.effectiveSrc) {
          await this.downloadAndSave(payload.effectiveSrc, finalPath);
        } else {
          new Notice("Image Import Failed: Image to be imported isn't specified");
          return;
        }

        if (payload.createNote) { await this.createNoteForImage(destFolder, payload.filename, payload.noteName); }
        new Notice(`Image Import Succeded: ${filename}`);
        this.close();
      }
    }));
  }

  resolveConflict(destPath, conflictAction) { 
    const existing = this.app.vault.getAbstractFileByPath(destPath);
    if (!existing) return destPath;
    if (conflictAction === 'replace') return destPath;
    if (conflictAction === 'cancel') return null;
    const dot = destPath.lastIndexOf('.');
    const base = dot > 0 ? destPath.substring(0, dot) : destPath;
    const ext = dot > 0 ? destPath.substring(dot) : '';
    let i = 1;
    while (i < 10000) {
      const candidate = `${base} (${i})${ext}`;
      if (!this.app.vault.getAbstractFileByPath(candidate)) return candidate;
      i++;
    }
    return destPath;
  }

  async createNoteForImage(destFolder, imageName, customNoteName) {
    const entries = this.plugin.settings.predefinedFolders || [];
    let match = entries.find(e => e.path === destFolder);
    if (!match) match = entries.find(e => e.createNoteSubfolders && e.path && destFolder.startsWith(e.path + '/'));
    const tpl = customNoteName || match?.noteTemplate || '{{imagename}}.md';
    const raw = tpl.replace(/\{\{imagename\}\}/g, imageName);
    let noteName = raw;
    if (!noteName.toLowerCase().endsWith('.md')) noteName = noteName + '.md';
    const notePath = destFolder ? `${destFolder}/${noteName}` : noteName;
    const exists = this.app.vault.getAbstractFileByPath(notePath);
    if (exists) return;
    await this.app.vault.create(notePath, '');
  }

  async downloadAndSave(src, destPath) { 
    if (src.startsWith('data:')) {
      const binary = this.dataUriToUint8Array(src);
      await this.app.vault.createBinary(destPath, binary); return;
    }
    if (/^https?:\/\//i.test(src)) {
      const res = await fetch(src); if (!res.ok) throw new Error('Network response was not ok');
      const ab = await res.arrayBuffer(); await this.app.vault.createBinary(destPath, new Uint8Array(ab)); return;
    }
    let normalPath = src; if (normalPath.startsWith('/')) normalPath = normalPath.substring(1);
    const file = this.app.vault.getAbstractFileByPath(normalPath);
    if (file && file instanceof this.app.vault.constructor.prototype.TFile) {
      const adapter = this.app.vault.adapter;
      if (adapter && adapter.readBinary) { const data = await adapter.readBinary(file.path); await this.app.vault.createBinary(destPath, data); }
      else { const resource = this.app.vault.getResourcePath(file); const res = await fetch(resource); const ab = await res.arrayBuffer(); await this.app.vault.createBinary(destPath, new Uint8Array(ab)); }
      return;
    }
    const res = await fetch(src); if (!res.ok) throw new Error('Network error while fetching resource');
    const ab = await res.arrayBuffer(); await this.app.vault.createBinary(destPath, new Uint8Array(ab));
  }

  dataUriToUint8Array(dataUri) {
    const idx = dataUri.indexOf(','); const meta = dataUri.substring(5, idx);
    const isBase64 = meta.endsWith(';base64'); const data = dataUri.substring(idx + 1);
    if (isBase64) { const binStr = atob(data); const len = binStr.length; const arr = new Uint8Array(len); for (let i=0;i<len;i++) arr[i] = binStr.charCodeAt(i); return arr; }
    const decoded = decodeURIComponent(data); const arr = new Uint8Array(decoded.length); for (let i=0;i<decoded.length;i++) arr[i] = decoded.charCodeAt(i); return arr;
  }
}