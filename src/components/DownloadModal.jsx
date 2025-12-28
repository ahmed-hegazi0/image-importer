import React, { useEffect, useMemo, useState } from 'react';

export function ModalComponent(props) {
  const { settings } = props;
  const [imageUrl, setImageUrl] = useState(props.src || '');
  const [selectedFile, setSelectedFile] = useState(undefined);
  const [externalSelection, setExternalSelection] = useState(undefined);
  const [filename, setFilename] = useState('');
  const [ext, setExt] = useState(settings.defaultExtension || 'jpg');
  const [importAction, setImportAction] = useState(settings.defaultLocalImportBehavior || 'copy');
  const [conflictAction, setConflictAction] = useState(settings.defaultConflictBehavior || 'postfix');
  const [mode, setMode] = useState(settings.defaultDestinationFolderMode || 'manual');
  const [folderInput, setFolderInput] = useState('');
  const [predefinedPath, setPredefinedPath] = useState(settings.defaultPredefinedFolder || '');
  const predefinedMap = useMemo(() => new Map((settings.predefinedFolders || []).map(f => [f.path, f])), [settings.predefinedFolders]);
  const [createNote, setCreateNote] = useState(false);
  const [noteName, setNoteName] = useState('');
  
  // Track the validated/loaded image source separately
  const [validImageSrc, setValidImageSrc] = useState(null);
  const [isInvalidUrl, setIsInvalidUrl] = useState(false);

  useEffect(() => {
    if (settings && settings.autoPasteClipboard && !props.src && navigator && navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then((text) => {
        if (text && /^https?:\/\//i.test(text.trim())) {
          setImageUrl(text.trim());
          // Validate the pasted URL
          const testImg = new Image();
          testImg.onload = () => {
            setValidImageSrc(text.trim());
            setIsInvalidUrl(false);
          };
          testImg.src = text.trim();
        }
      }).catch(() => {});
    }
  }, [settings?.autoPasteClipboard]);

  useEffect(() => {
    if (mode === 'predefined') {
      const entry = predefinedMap.get(predefinedPath || folderInput);
      setCreateNote(!!(entry && entry.createNote));
    } else if (mode === 'manual') {
      const entry = predefinedMap.get(folderInput);
      if (entry) {
        setCreateNote(!!(entry.createNote));
      } else {
        setCreateNote(false);
      }
    } else {
      setCreateNote(false);
    }
  }, [mode, predefinedPath, folderInput, predefinedMap]);

  const destFolder = mode === 'predefined' ? (predefinedPath || '') : (folderInput || '');

  return (
    <div className="image-importer">

      <h1 className="modal-title">Image Importer</h1>

      <div className="modal-item">
        {validImageSrc && (
          <img 
            src={validImageSrc} 
            className="preview-image" 
            alt="" 
          />
        )}
        {!validImageSrc && (
          <div className={`preview-placeholder${isInvalidUrl ? ' invalid' : ''}`}>
            {isInvalidUrl ? 'Invalid Image Link' : 'Preview'}
          </div>
        )}
      </div>

      <div className="image-importer-modal">
        <h2>Remote Import</h2>

        <div className="modal-item">
          <label>Remote Import (Import Image from Internet)</label>
          <input 
            type="text" 
            title={"Image Link (URL)"}
            className="wide-input" 
            value={imageUrl} 
            onChange={e => setImageUrl(e.target.value)}
            onBlur={async e => {
              const url = e.target.value.trim();
              if (!url) { setValidImageSrc(null); setIsInvalidUrl(false); return; }
              if (!/^https?:\/\/.+/i.test(url)) { setValidImageSrc(null); setIsInvalidUrl(true); return; }
              // Show placeholder while validating
              setValidImageSrc(null);
              setIsInvalidUrl(false);
              try {
                const res = await fetch(url, { method: 'HEAD' });
                const ct = (res.headers.get('content-type') || '').toLowerCase();
                if (res.ok && ct.startsWith('image/')) {
                  setValidImageSrc(url);
                  setIsInvalidUrl(false);
                } else {
                  setValidImageSrc(null);
                  setIsInvalidUrl(true);
                }
              } catch {
                setValidImageSrc(null);
                setIsInvalidUrl(true);
              }
            }}
          />
        </div>

        <h2>Local Import</h2>

        <div className="modal-item">
          <div className="modal-item-row">
            <label>Local Import (Import Image from device)</label>
            <button onClick={() => {
              const input = document.createElement('input');
              input.type = 'file'; input.accept = '.jpg,.jpeg,.png';
              input.onchange = (ev) => {
                const f = ev.target.files && ev.target.files[0];
                if (f) {
                  setSelectedFile(f);
                  const reader = new FileReader(); 
                  reader.onload = e => {
                    setValidImageSrc(String((e.target && e.target.result) || ''));
                    setIsInvalidUrl(false);
                  };
                  reader.readAsDataURL(f);
                  setImageUrl(''); // Clear URL field when importing from device
                  const fn = f.name || ''; const dot = fn.lastIndexOf('.');
                  setFilename(dot > 0 ? fn.substring(0, dot) : fn);
                  setExt(/png/i.test(f.type) ? 'png' : (/jpeg|jpg/i.test(f.type) ? 'jpg' : settings.defaultExtension || 'jpg'));
                }
              };
              input.click();
            }}>Select</button>
          </div>
        </div>

        <div className="modal-item">
          <div className="modal-item-row">
            <label>Local Import Behavior</label>
            <select className="dropdown" value={importAction} onChange={e => setImportAction(e.target.value)}>
              <option value="copy">Copy</option>
              <option value="cut">Cut</option>
            </select>
          </div>
        </div>

        <h2>Importation Configurations</h2>

        <div className="modal-item">
          <div className="modal-item-row">
            <label>Name:</label>
            <input title={"Image Name"} type="text" className="wide-input" value={filename} onChange={e => setFilename(e.target.value)} />
          </div>
        </div>

        <div className="modal-item">
          <div className="modal-item-row">
            <label>Extension</label>
            <select className="dropdown" value={ext} onChange={e => setExt(e.target.value)}>
              <option value="jpg">jpg</option>
              <option value="png">png</option>
            </select>
          </div>
        </div>

        <div className="modal-item">
          <div className="modal-item-row">
            <label>Conflict Behavior</label>
            <select className="dropdown" value={conflictAction} onChange={e => setConflictAction(e.target.value)}>
              <option value="replace">Replace</option>
              <option value="postfix">Add</option>
              <option value="cancel">Cancel</option>
            </select>
          </div>
        </div>

        <h2>Destination Folder</h2>

        <div className="modal-item">
          <div className="modal-item-row">
            <label>Mode</label>
            <select className="dropdown" value={mode} onChange={e => setMode(e.target.value)}>
              <option value="manual">Manual</option>
              <option value="predefined">Predefined</option>
            </select>
          </div>
        </div>

        <div className="modal-item">  
          {mode === 'predefined' ? (
            <div className="modal-item-row">
              <label>Predefined Folder</label>
              <select className="dropdown" value={predefinedPath} onChange={e => setPredefinedPath(e.target.value)}>
                {(settings.predefinedFolders || []).map(f => (
                  <option key={f.path} value={f.path} title={f.path}>{f.name}</option>
                ))}
              </select>
            </div>
            ) : (
            <div className="modal-item-row">
              <label>Folder:</label>
              <input 
                title={"Folder Path"}
                type="text" 
                className="wide-input"
                value={folderInput} 
                onChange={e => setFolderInput(e.target.value)}
                list="modal-folder-suggestions"
              />
              <datalist id="modal-folder-suggestions">
                {props.vault && props.vault.getAllLoadedFiles && 
                  props.vault.getAllLoadedFiles()
                    .filter(f => f.children)
                    .map(folder => (
                      <option key={folder.path} value={folder.path} />
                    ))
                }
              </datalist>
            </div>
            )}
        </div>

        <div className="modal-item">
          <div className="modal-item-row">
            <label>Create Note (current image only)</label>
            <div 
              className={`checkbox-container ${createNote ? 'is-enabled' : ''}`}
              onClick={() => setCreateNote(!createNote)}
              tabIndex={0}
              role="checkbox"
              aria-checked={!!createNote}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setCreateNote(!createNote);
                }
              }}
            >
              <input 
                type="checkbox" 
                checked={!!createNote}
                readOnly
                tabIndex={-1}
              />
            </div>
          </div>
        </div>

        {createNote && (() => {
          const currentFolder = mode === 'predefined' ? predefinedPath : folderInput;
          const entry = predefinedMap.get(currentFolder);
          const shouldShowInput = !entry || !entry.createNote;
          return shouldShowInput ? (
            <div className="modal-item">
              <div className="modal-item-row">
                <label>Note Name:</label>
                <input 
                  title={"Note Name"}
                  type="text" 
                  className="wide-input"
                  value={noteName}
                  placeholder="{{imagename}}.md"
                  onChange={e => setNoteName(e.target.value)}
                />
              </div>
            </div>
          ) : null;
        })()}

        <div className="buttons-group">
          <button onClick={props.onCancel}>Cancel</button>
          <button className="primary-button" onClick={() => props.onConfirm({
            filename,
            ext,
            importAction,
            conflictAction,
            destFolder,
            effectiveFile: selectedFile,
            effectiveExternal: externalSelection,
            effectiveSrc: (!selectedFile && !externalSelection) ? validImageSrc : undefined,
            createNote,
            noteName
          })}>Import</button>
        </div>
      </div>
    </div>
  );
}