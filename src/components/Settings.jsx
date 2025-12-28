import React, { useMemo, useState, useEffect, useRef } from 'react';

export function SettingsComponent(props) {
  const { settings, onChange } = props;
  // Persist expand/collapse default via localStorage so it doesn't reset on re-renders/remounts
  const [showPredefined, setShowPredefined] = useState(() => {
    try {
      const saved = localStorage.getItem('imageImporter.showPredefined');
      if (saved === 'true') return true;
      if (saved === 'false') return false;
    } catch {}
    return true; // default expanded
  });
  // Local edit buffer for predefined folders to prevent blur/focus loss on each keystroke
  const [predefinedLocal, setPredefinedLocal] = useState(settings.predefinedFolders || []);
  useEffect(() => {
    setPredefinedLocal(settings.predefinedFolders || []);
  }, [settings.predefinedFolders]);
  // Track editing state to enable cancel-on-blur
  const [editingIndex, setEditingIndex] = useState(null);
  const originalDataRef = useRef({});
  const saveClickedRef = useRef(false);
  const [focusedNoteTemplate, setFocusedNoteTemplate] = useState(null);
  const hasUnsavedPredefinedChanges = useMemo(() => {
    const saved = settings.predefinedFolders || [];
    const local = predefinedLocal || [];
    if (saved.length !== local.length) return true;
    for (let i = 0; i < saved.length; i++) {
      const a = saved[i] || {};
      const b = local[i] || {};
      if (
        a.name !== b.name ||
        a.path !== b.path ||
        !!a.createNote !== !!b.createNote ||
        !!a.createNoteSubfolders !== !!b.createNoteSubfolders ||
        (a.noteTemplate || '') !== (b.noteTemplate || '')
      ) {
        return true;
      }
    }
    return false;
  }, [predefinedLocal, settings.predefinedFolders]);
  const predefinedOptions = useMemo(
    () => (settings.predefinedFolders || []).map(f => ({ value: f.path, label: f.name || f.path })),
    [settings.predefinedFolders]
  );

  return (
    <div className="image-importer">
      <h1>Image Importer Settings</h1>
      {/* Section 1 */}
      <h2>Remote Import</h2>
      {/* Auto-Paste URL From Clipboard */}
      <div className="setting-item">
        <div className="setting-item-header">
          <div className="setting-item-header-text">
            <label className="setting-item-title">Auto-Paste URL From Clipboard</label>
            <div className="setting-item-description">auto-paste the image URL from clipboard if the clipboard contains a valid image URL</div>
          </div>
          <div className="setting-item-control">
            <div 
              className={`checkbox-container ${settings.autoPasteClipboard ? 'is-enabled' : ''}`}
              onClick={() => onChange({ autoPasteClipboard: !settings.autoPasteClipboard })}
              tabIndex={0}
              role="checkbox"
              aria-checked={!!settings.autoPasteClipboard}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChange({ autoPasteClipboard: !settings.autoPasteClipboard });
                }
              }}
            >
              <input 
                type="checkbox" 
                checked={!!settings.autoPasteClipboard}
                readOnly
                tabIndex={-1}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Section 2 */}
      <h2>Local Import</h2> 
      {/* Default Local Import Folder */}
      <div className="setting-item">
        <label className="setting-item-title">Default Local Import Folder</label>
        <div className="setting-item-description">the default source folder to open when importing images locally</div>
        <div className="default-destination-folder-select">
          <input type="text" value={settings.defaultLocalImportFolder || ''} disabled />
          <button onClick={() => props.onChooseExternalFolder(path => onChange({ defaultLocalImportFolder: path }))}>Select</button>
        </div>
      </div>
      {/* Default Local Import Behavior */}
      <div className="setting-item">
        <div className="setting-item-header">
          <div className="setting-item-header-text">
            <label className="setting-item-title">Default Local Import Behavior</label>
            <div className="setting-item-description">the default behavior when importing images locally: cut (remove the image from the source folder) or copy (keep the image in the source folder)</div>
          </div>
          <select className="dropdown" value={settings.defaultLocalImportBehavior || 'copy'} onChange={e => onChange({ defaultLocalImportBehavior: e.target.value })}>
            <option value="copy">Copy</option>
            <option value="cut">Cut</option>
          </select>
        </div>
      </div>
      {/* Section 3 */}
      <h2>Importation Configurations</h2>
      {/* Default Extension */}
      <div className="setting-item">
        <div className="setting-item-header">
          <div className="setting-item-header-text">
            <label className="setting-item-title">Default Extension</label>
            <div className="setting-item-description">the default extension for importing the image</div>
          </div>
          <select className="dropdown" value={settings.defaultExtension || 'jpg'} onChange={e => onChange({ defaultExtension: e.target.value })}>
            <option value="jpg">jpg</option>
            <option value="png">png</option>
          </select>
        </div>
      </div>
      {/* Default Conflict Behavior */}
      <div className="setting-item">
        <div className="setting-item-header">
          <div className="setting-item-header-text">
            <label className="setting-item-title">Default Conflict Behavior</label>
            <div className="setting-item-description">the default behavior when a conflict occurs because the imported images already exists in the destination folder: replace (replacing the existing image with the imported image) or add (adding the imported image with the existing image using a postfix number) or cancel</div>
          </div>
          <select className="dropdown" value={settings.defaultConflictBehavior || 'postfix'} onChange={e => onChange({ defaultConflictBehavior: e.target.value })}>
            <option value="replace">Replace</option>
            <option value="postfix">Add</option>
            <option value="cancel">Cancel</option>
          </select>
        </div>
      </div>
      {/* Section 4 */}
      <h2>Destination Folder</h2>
      {/* Default Destination Folder Mode */}
      <div className="setting-item">
        <div className="setting-item-header">
          <div className="setting-item-header-text">
            <label className="setting-item-title">Default Destination Folder Mode</label>
            <div className="setting-item-description">the default mode for selecting the destination folder: manual (enter the destination folder's path manually) or predefined (select the destination folder from predefined folders configured in the plugin's settings)</div>
          </div>
          <select className="dropdown" value={settings.defaultDestinationFolderMode || 'manual'} onChange={e => onChange({ defaultDestinationFolderMode: e.target.value })}>
            <option value="manual">Manual</option>
            <option value="predefined">Predefined</option>
          </select>
        </div>
      </div>
      {/* Section 5 */}
      <h2>Predefined Folders</h2>
      {/* Predefined Folders Definition */}
      <div className="setting-item">
        <div className="setting-item-header">
          <div className="setting-item-header-text">
            <label className="setting-item-title">Predefined Folders</label>
            <div className="setting-item-description">the predefined destination folders for importing the images</div>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowPredefined(v => {
                const next = !v;
                try { localStorage.setItem('imageImporter.showPredefined', String(next)); } catch {}
                return next;
              });
            }}
            aria-label={showPredefined ? 'Collapse predefined folders' : 'Expand predefined folders'}
            title={showPredefined ? 'Collapse' : 'Expand'}
          >{showPredefined ? "-" : "+"}</button>
        </div>
        {showPredefined ? (<>
        <div className="predefined-folders">
            {(predefinedLocal || []).map((entry, idx) => {
              const saved = (settings.predefinedFolders || [])[idx] || {};
              const isDirty = (
                (saved.name || '') !== (entry.name || '') ||
                (saved.path || '') !== (entry.path || '') ||
                !!saved.createNote !== !!entry.createNote ||
                !!saved.createNoteSubfolders !== !!entry.createNoteSubfolders ||
                (saved.noteTemplate || '') !== (entry.noteTemplate || '')
              );

              return (
            <div 
              key={idx} 
              className="predefined-folder"
              onFocus={() => {
                if (editingIndex !== idx) {
                  // Cancel previous edit if any
                  if (editingIndex !== null && originalDataRef.current[editingIndex]) {
                    const list = [...predefinedLocal];
                    list[editingIndex] = originalDataRef.current[editingIndex];
                    setPredefinedLocal(list);
                  }
                  // Start editing this folder
                  setEditingIndex(idx);
                  originalDataRef.current[idx] = { ...entry };
                }
              }}
              onBlur={(e) => {
                // Check if focus is moving outside this folder container
                if (!e.currentTarget.contains(e.relatedTarget) && !saveClickedRef.current) {
                  // Revert changes instantly
                  if (editingIndex === idx && originalDataRef.current[idx]) {
                    const list = [...predefinedLocal];
                    list[idx] = originalDataRef.current[idx];
                    setPredefinedLocal(list);
                    setEditingIndex(null);
                    delete originalDataRef.current[idx];
                  }
                }
                saveClickedRef.current = false;
              }}
            >
              <div className="predefined-folder-field">
                <div className="predefined-folder-field-title">Folder Name:</div>
                <input
                  className="predefined-folder-field-input"
                  type="text"
                  title={"Folder Name"}
                  value={entry.name || ''}
                  onChange={e => {
                    const list = [...(predefinedLocal || [])];
                    list[idx] = { ...entry, name: e.target.value };
                    setPredefinedLocal(list);
                  }}
                />
              </div>
              <div className="predefined-folder-field">
                <div className="predefined-folder-field-title">Folder Path:</div>
                <input
                  className="predefined-folder-field-input"
                  type="text"
                  title={"Folder Path"}
                  value={entry.path || ''}
                  list={`folder-suggestions-${idx}`}
                  onChange={e => {
                    const list = [...(predefinedLocal || [])];
                    list[idx] = { ...entry, path: e.target.value };
                    setPredefinedLocal(list);
                  }}
                />
                <datalist id={`folder-suggestions-${idx}`}>
                  {props.vault && props.vault.getAllLoadedFiles && 
                    props.vault.getAllLoadedFiles()
                      .filter(f => f.children)
                      .map(folder => (
                        <option key={folder.path} value={folder.path} />
                      ))
                  }
                </datalist>
              </div>
              <div className="predefined-folder-checkboxes">
                <div className="note-creation-checkbox">
                    <input
                      type="checkbox"
                      checked={!!entry.createNote}
                      onChange={e => {
                        const list = [...(predefinedLocal || [])];
                        list[idx] = { ...entry, createNote: e.target.checked };
                        setPredefinedLocal(list);
                      }}
                    />
                    Note Creation
                </div>
                <div className="note-creation-checkbox">
                  <input
                    type="checkbox"
                    checked={!!entry.createNoteSubfolders}
                    onChange={e => {
                      const list = [...(predefinedLocal || [])];
                      list[idx] = { ...entry, createNoteSubfolders: e.target.checked };
                      setPredefinedLocal(list);
                    }}
                  />
                  Include subfolders
                </div>
              </div>
              {entry.createNote ? (
                <div className="predefined-folder-field">
                  <div className="predefined-folder-field-title">Note Name:</div>
                  <input
                    className="predefined-folder-field-input"
                    type="text"
                    title={"Note Name"}
                    value={focusedNoteTemplate === idx ? (entry.noteTemplate || '') : (entry.noteTemplate || '{{imagename}}.md')}
                    onChange={e => {
                      const list = [...(predefinedLocal || [])];
                      list[idx] = { ...entry, noteTemplate: e.target.value };
                      setPredefinedLocal(list);
                    }}
                    onFocus={() => setFocusedNoteTemplate(idx)}
                    onBlur={() => {
                      setFocusedNoteTemplate(null);
                      if (!entry.noteTemplate || !entry.noteTemplate.trim()) {
                        const list = [...(predefinedLocal || [])];
                        list[idx] = { ...entry, noteTemplate: '' };
                        setPredefinedLocal(list);
                      }
                    }}
                  />
                </div>
              ) : null}
              
              {isDirty ? (
                <div className="save-warning">
                  Warning: Click on the save button to save the modifications!
                </div>
              ) : null}

              <div className="buttons-group">
                <button
                  onClick={async () => {
                    const list = [...(predefinedLocal || [])];
                    list.splice(idx, 1);
                    setPredefinedLocal(list);
                    await onChange({ predefinedFolders: list });
                    const paths = list.map(x => x.path).filter(Boolean);
                    if (settings.defaultPredefinedFolder && !paths.includes(settings.defaultPredefinedFolder)) {
                      await onChange({ defaultPredefinedFolder: '' });
                    }
                  }}
                >
                  Remove
                </button>
                <button
                  onMouseDown={() => { saveClickedRef.current = true; }}
                  onClick={async () => {
                    const list = [...(predefinedLocal || [])];
                    const toSave = { ...entry };
                    if (toSave.createNote && (!toSave.noteTemplate || !toSave.noteTemplate.trim())) {
                      toSave.noteTemplate = '{{imagename}}.md';
                    }
                    list[idx] = toSave;
                    await onChange({ predefinedFolders: list });
                    const paths = list.map(x => x.path).filter(Boolean);
                    if (settings.defaultPredefinedFolder && !paths.includes(settings.defaultPredefinedFolder)) {
                      await onChange({ defaultPredefinedFolder: '' });
                    }
                    // Clear editing state after save
                    if (editingIndex === idx) {
                      setEditingIndex(null);
                      delete originalDataRef.current[idx];
                    }
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          );
          })}
        </div>
        <button className="setting-item-buttons" onClick={() => setPredefinedLocal([...(predefinedLocal || []), { name: '', path: '' }])}>Add folder</button>
        </>): null}
      </div>
      {/* Default Predefined Folder Selection*/}
      <div className="setting-item"> 
        <label className="setting-item-title">Default Predefined Folder</label>
        <div className="setting-item-description">the default predefined folder for the predefined mode</div>
        {(() => {
          const hasPredefined = predefinedOptions.length > 0;
          const effectiveValue = hasPredefined
            ? (settings.defaultPredefinedFolder || predefinedOptions[0].value)
            : (settings.defaultPredefinedFolder || '');
          const effectiveLabel = hasPredefined
            ? (predefinedOptions.find(opt => opt.value === effectiveValue)?.label || '')
            : 'None';
          return (
            <select className="dropdown predefined-folder-select"
              value={effectiveValue}
              onChange={e => onChange({ defaultPredefinedFolder: e.target.value })}
            >
              {!hasPredefined ? (<option value="">None</option>) : null}
              {predefinedOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          );
        })()}
      </div>
    </div>
  );
}