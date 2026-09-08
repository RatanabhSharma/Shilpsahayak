import { auth, storage } from '../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

/**
 * Cloudflare R2 Worker URL.
 *
 * Local development:
 * http://127.0.0.1:8788
 *
 * Production:
 * Replace VITE_CLOUDFLARE_WORKER_URL in .env
 * with your deployed Cloudflare Worker URL.
 */
const CLOUDFLARE_WORKER_URL =
  import.meta.env.VITE_CLOUDFLARE_WORKER_URL ||
  'http://127.0.0.1:8787';

const ALLOWED_EXTENSIONS = [
  '.stl',
  '.obj',
  '.3mf',
  '.zip',
];

const MAX_FILE_SIZE =
  100 * 1024 * 1024; // 100 MB

/* -------------------------------------------------------------------------- */
/* IndexedDB Local Persistence Fallback                                      */
/* -------------------------------------------------------------------------- */

const DB_NAME = 'ShilpSahayakModelStore';
const DB_VERSION = 1;
const STORE_NAME = 'models';

function openModelDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported.'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveModelLocally(key: string, file: File | Blob): Promise<string> {
  try {
    const db = await openModelDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(file, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[Storage] Could not persist model in IndexedDB:', err);
  }
  return URL.createObjectURL(file);
}

export async function getModelLocally(key: string): Promise<Blob | null> {
  try {
    const db = await openModelDatabase();
    return new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function deleteModelLocally(key: string): Promise<void> {
  try {
    const db = await openModelDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[Storage] Could not delete model from IndexedDB:', err);
  }
}

/**
 * Get the currently authenticated Firebase user's ID token.
 */
export async function getFirebaseIdToken(): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      'You must be logged in to upload a 3D model.'
    );
  }

  return user.getIdToken();
}

/**
 * Validate the selected 3D model.
 */
function validateFile(file: File): void {
  if (!file) {
    throw new Error('No file selected.');
  }

  const fileName = file.name.toLowerCase();

  const isAllowed = ALLOWED_EXTENSIONS.some(
    (extension) =>
      fileName.endsWith(extension)
  );

  if (!isAllowed) {
    throw new Error(
      'Unsupported file type. Please upload an STL, OBJ, or 3MF file.'
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      'File is too large. Maximum allowed size is 100 MB.'
    );
  }
}

/**
 * Upload a 3D model to Cloudflare R2 through
 * the Cloudflare Worker.
 *
 * Flow:
 *
 * React
 *   ↓
 * Firebase ID Token
 *   ↓
 * Cloudflare Worker
 *   ↓
 * Firebase token verification
 *   ↓
 * R2
 *
 * @param file Selected 3D model
 * @param userId Firebase authenticated user ID
 * @param onProgress Optional upload progress callback (0-100)
 *
 * @returns Accessible file URL (R2 worker GET URL or local Object URL)
 */
export async function upload3DFile(
  file: File,
  userId?: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  validateFile(file);

  const user = auth.currentUser;
  const effectiveUserId = userId || user?.uid || 'guest';

  // Resilient fallback helper if worker is unreachable, offline, or user is guest
  const fallbackToLocal = async (reason: string): Promise<string> => {
    console.warn(`[Storage Fallback] ${reason}. Saving 3D model locally to ensure uninterrupted order/quote completion.`);
    const localKey = `local:quotes/${effectiveUserId}/${Date.now()}_${file.name}`;
    onProgress?.(50);
    const localUrl = await saveModelLocally(localKey, file);
    onProgress?.(100);
    return localUrl;
  };

  // If user is not logged in or worker URL is not configured, fall back to local storage
  if (!user || !CLOUDFLARE_WORKER_URL) {
    return fallbackToLocal('No active Firebase user session or worker URL not configured');
  }

  let idToken = '';
  try {
    idToken = await user.getIdToken();
  } catch {
    return fallbackToLocal('Could not retrieve Firebase authentication token');
  }

  return new Promise<string>((resolve) => {
    const xhr = new XMLHttpRequest();
    const uploadUrl = `${CLOUDFLARE_WORKER_URL}/upload`;
    let completed = false;

    const handleFailure = async (reason: string) => {
      if (completed) return;
      completed = true;
      const fallbackUrl = await fallbackToLocal(reason);
      resolve(fallbackUrl);
    };

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return;
      const progress = Math.round((event.loaded / event.total) * 100);
      if (onProgress) {
        onProgress(Math.min(99, Math.max(0, progress)));
      }
    });

    xhr.addEventListener('load', () => {
      if (completed) return;

      let response: {
        success?: boolean;
        key?: string;
        fileName?: string;
        size?: number | null;
        error?: string;
      } | null = null;

      try {
        response = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        response = null;
      }

      if (xhr.status < 200 || xhr.status >= 300 || !response?.success || !response.key) {
        handleFailure(response?.error || `Upload returned HTTP ${xhr.status}`);
        return;
      }

      completed = true;
      if (onProgress) onProgress(100);

      const fullUrl = `${CLOUDFLARE_WORKER_URL}/file?key=${encodeURIComponent(response.key)}`;
      console.log('3D file uploaded successfully to R2:', fullUrl);
      resolve(fullUrl);
    });

    xhr.addEventListener('error', () => {
      handleFailure('Network connection refused or upload worker offline');
    });

    xhr.addEventListener('abort', () => {
      handleFailure('Upload aborted by user');
    });

    xhr.addEventListener('timeout', () => {
      handleFailure('Upload request timed out');
    });

    // 15-second timeout to quickly recover if worker is offline
    xhr.timeout = 15000;

    try {
      xhr.open('POST', uploadUrl, true);
      xhr.setRequestHeader('Authorization', `Bearer ${idToken}`);
      xhr.setRequestHeader('X-File-Name', file.name);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      if (onProgress) onProgress(5);
      xhr.send(file);
    } catch (err: any) {
      handleFailure(err?.message || 'Failed to initialize upload request');
    }
  });
}

/**
 * Compresses an image client-side to an optimized WebP (or JPEG) Base64 Data URL.
 * Produces a lightweight (~30-60 KB), permanent, portable image string that
 * stores directly in Firestore and never expires or breaks across devices/reloads.
 */
export async function fileToOptimizedDataUrl(
  file: File,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(readerEvent.target?.result as string);
        }

        ctx.drawImage(img, 0, 0, width, height);

        try {
          const webpData = canvas.toDataURL('image/webp', quality);
          if (webpData.startsWith('data:image/webp')) {
            return resolve(webpData);
          }
        } catch {
          // fallback to jpeg
        }
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Failed to decode selected image.'));
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a product image.
 * 1. Attempts Firebase Storage if available.
 * 2. Attempts remote Cloudflare Worker if configured.
 * 3. Falls back to an optimized permanent WebP Base64 Data URL.
 * NEVER returns an ephemeral blob: URL that dies on page reload.
 *
 * @param file Selected image file (PNG, JPG, JPEG, WEBP)
 * @param onProgress Optional upload progress callback (0-100)
 * @returns Permanent HTTPS download URL or permanent Base64 Data URL
 */
export async function uploadProductImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (!file) throw new Error('No file selected.');

  const fileName = file.name.toLowerCase();
  const isAllowed = ['.png', '.jpg', '.jpeg', '.webp'].some((ext) => fileName.endsWith(ext));

  if (!isAllowed) {
    throw new Error('Unsupported image type. Please upload a PNG, JPG, JPEG, or WEBP file.');
  }

  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Image file is too large. Maximum allowed size is 15 MB.');
  }

  // 1. First attempt: Firebase Storage (native, authenticated, reliable)
  try {
    if (storage) {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageRef = ref(storage, `products/${timestamp}_${safeName}`);
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type || 'image/jpeg',
      });

      const downloadUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.totalBytes > 0 && onProgress) {
              const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              onProgress(Math.min(99, Math.max(0, progress)));
            }
          },
          (error) => reject(error),
          async () => {
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            } catch (err) {
              reject(err);
            }
          }
        );
      });

      if (downloadUrl) {
        onProgress?.(100);
        return downloadUrl;
      }
    }
  } catch (firebaseErr) {
    console.warn('[Storage] Firebase Storage upload unviable, checking alternative:', firebaseErr);
  }

  // 2. Second attempt: Remote Cloudflare Worker (if configured on a remote host)
  const user = auth.currentUser;
  const isWorkerRemote =
    Boolean(CLOUDFLARE_WORKER_URL) &&
    !CLOUDFLARE_WORKER_URL.includes('127.0.0.1') &&
    !CLOUDFLARE_WORKER_URL.includes('localhost');

  if (user && isWorkerRemote) {
    try {
      const idToken = await user.getIdToken();
      const r2Url = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(Math.min(99, percent));
          }
        });
        xhr.addEventListener('load', () => {
          try {
            const resp = JSON.parse(xhr.responseText);
            if (xhr.status === 200 && resp?.success && resp?.key) {
              resolve(`${CLOUDFLARE_WORKER_URL}/file?key=${encodeURIComponent(resp.key)}`);
              return;
            }
          } catch {
            // response was not valid JSON
          }
          reject(new Error('Worker upload failed'));
        });
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('timeout', () => reject(new Error('Timeout')));
        xhr.timeout = 8000;
        xhr.open('POST', `${CLOUDFLARE_WORKER_URL}/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${idToken}`);
        xhr.setRequestHeader('X-File-Name', file.name);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.send(file);
      });

      if (r2Url) {
        onProgress?.(100);
        return r2Url;
      }
    } catch (r2Err) {
      console.warn('[Storage] Cloudflare Worker upload unviable:', r2Err);
    }
  }

  // 3. Guaranteed permanent fallback: Optimized Base64 WebP Data URL
  // NEVER use URL.createObjectURL(file) which breaks upon browser reload.
  onProgress?.(50);
  const dataUrl = await fileToOptimizedDataUrl(file);
  onProgress?.(100);
  return dataUrl;
}

/**
 * Delete a previously uploaded 3D model.
 *
 * @param fileKey R2 object key or local URL
 */
export async function deleteUploadedFile(fileKey: string): Promise<void> {
  if (!fileKey) return;

  if (fileKey.startsWith('local:') || fileKey.startsWith('blob:')) {
    await deleteModelLocally(fileKey);
    return;
  }

  const user = auth.currentUser;
  if (!user || !CLOUDFLARE_WORKER_URL) return;

  try {
    const idToken = await user.getIdToken();
    let cleanKey = fileKey;
    if (fileKey.includes('key=')) {
      try {
        const urlObj = new URL(fileKey, 'http://localhost');
        cleanKey = urlObj.searchParams.get('key') || fileKey;
      } catch {
        cleanKey = fileKey;
      }
    }
    const deleteUrl = `${CLOUDFLARE_WORKER_URL}/file?key=${encodeURIComponent(cleanKey)}`;

    await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
  } catch (error) {
    console.warn('[Storage] Could not delete remote file:', error);
  }
}


