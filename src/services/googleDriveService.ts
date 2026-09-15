/**
 * Google Drive Integration Service (Bridge to src/lib/googleDriveService.ts)
 */

import firebaseConfig from '../../firebase-applet-config.json';
export * from '../lib/googleDriveService';
export {
  fetchFileMetadata,
  fetchFolderMediaFiles,
  getHighResThumbnailUrl,
  normalizeDriveFileMetadata,
  getDriveFileDownloadUrl,
  DEFAULT_HIGH_RES_THUMBNAIL_SIZE
} from './googleDrive';
export type {
  GoogleDriveFileMetadata,
  GoogleDriveImageMetadata,
  GoogleDriveVideoMetadata,
  FetchDriveFilesOptions,
  DriveFileListResponse
} from './googleDrive';

export interface DriveFolderMeta {
  id: string;
  name: string;
  filesCount?: number;
}

export type DriveImageFile = import('../lib/googleDriveService').DriveFileItem;

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

let gapiInited = false;
let gisInited = false;

/**
 * Loads GAPI and GIS scripts dynamically for Google Picker if needed.
 */
export async function initializeGoogleDriveApi(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  return new Promise((resolve) => {
    // 1. Load GAPI (for Google Picker)
    const loadGapi = () => {
      if (window.gapi) {
        window.gapi.load('client:picker', async () => {
          gapiInited = true;
          if (gisInited && gapiInited) resolve(true);
        });
      } else {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          window.gapi.load('client:picker', async () => {
            gapiInited = true;
            if (gisInited && gapiInited) resolve(true);
          });
        };
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      }
    };

    // 2. Load GIS (Google Identity Services)
    const loadGis = () => {
      if (window.google?.accounts?.oauth2) {
        gisInited = true;
        if (gisInited && gapiInited) resolve(true);
      } else {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          gisInited = true;
          if (gisInited && gapiInited) resolve(true);
        };
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      }
    };

    loadGapi();
    loadGis();
  });
}

/**
 * Opens Google Picker dialog to allow interactive folder selection.
 */
export async function openGoogleDrivePicker(options: {
  developerKey?: string;
  clientId?: string;
  selectFoldersOnly?: boolean;
  onSelect: (result: {
    folderId?: string;
    folderName?: string;
    docs: any[];
  }) => void;
  onCancel?: () => void;
}): Promise<void> {
  const { getDriveAccessToken, signInWithGoogleDrive, setDriveAccessToken } = await import('../lib/googleDriveService');
  
  let token = getDriveAccessToken();
  if (!token) {
    try {
      const authRes = await signInWithGoogleDrive();
      token = authRes?.accessToken || null;
    } catch (e) {
      console.warn('[Google Picker] Popup auth failed or closed, checking GIS client...', e);
    }
  }

  // GIS OAuth fallback using oAuthClientId from config if popup returned null
  const configClientId = (firebaseConfig as { oAuthClientId?: string }).oAuthClientId;
  if (!token && typeof window !== 'undefined' && configClientId) {
    await initializeGoogleDriveApi();
    if (window.google?.accounts?.oauth2) {
      token = await new Promise<string | null>((resolve) => {
        try {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: options.clientId || configClientId,
            scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.photos.readonly https://www.googleapis.com/auth/drive.file',
            callback: (res: any) => {
              if (res?.access_token) {
                setDriveAccessToken(res.access_token, res.expires_in || 3600);
                resolve(res.access_token);
              } else {
                resolve(null);
              }
            }
          });
          client.requestAccessToken({ prompt: 'consent' });
        } catch (err) {
          console.error('[GIS Token Client Error]:', err);
          resolve(null);
        }
      });
    }
  }

  if (!token) {
    console.warn('[Google Drive Service] Authorization not granted or cancelled. Operation aborted gracefully.');
    throw new Error('Google Drive authorization required to open picker.');
  }

  try {
    await initializeGoogleDriveApi();

    if (!window.google?.picker) {
      throw new Error('Google Picker API failed to initialize.');
    }

    const pickerBuilder = new window.google.picker.PickerBuilder();
    
    if (options.selectFoldersOnly) {
      const folderView = new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
        .setMimeTypes('application/vnd.google-apps.folder')
        .setSelectFolderEnabled(true)
        .setIncludeFolders(true);
      
      pickerBuilder.addView(folderView);
    } else {
      const photosView = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS_IMAGES)
        .setIncludeFolders(true);
      
      pickerBuilder.addView(photosView);
      pickerBuilder.addView(new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS).setSelectFolderEnabled(true));
    }

    pickerBuilder.setOAuthToken(token);
    
    const devKey = options.developerKey || firebaseConfig.apiKey;
    if (devKey) {
      pickerBuilder.setDeveloperKey(devKey);
    }

    const appId = firebaseConfig.messagingSenderId || firebaseConfig.projectId;
    if (appId) {
      pickerBuilder.setAppId(appId);
    }

    pickerBuilder.setCallback((data: any) => {
      try {
        if (data.action === window.google.picker.Action.PICKED) {
          const docs = data.docs || [];
          const primaryDoc = docs[0];
          const isFolder = primaryDoc?.mimeType === 'application/vnd.google-apps.folder';
          
          options.onSelect({
            folderId: isFolder ? primaryDoc.id : undefined,
            folderName: isFolder ? primaryDoc.name : undefined,
            docs: docs
          });
        } else if (data.action === window.google.picker.Action.CANCEL) {
          if (options.onCancel) options.onCancel();
        }
      } catch (callbackErr) {
        console.warn('[Google Picker] Callback processing notice:', callbackErr);
      }
    });

    const picker = pickerBuilder.build();
    picker.setVisible(true);
  } catch (err: any) {
    console.warn('[Google Picker] Initialization error boundary caught:', err);
    if (options.onCancel) options.onCancel();
    throw err;
  }
}
