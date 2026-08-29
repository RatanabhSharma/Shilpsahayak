import { auth } from '../lib/firebase';

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
];

const MAX_FILE_SIZE =
  100 * 1024 * 1024; // 100 MB

/**
 * Get the currently authenticated Firebase user's ID token.
 */
async function getFirebaseIdToken(): Promise<string> {
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
 * @returns R2 object key
 */
export async function upload3DFile(
  file: File,
  userId?: string,
  onProgress?: (progress: number) => void
): Promise<string> {

  /*
   * Validate file.
   */

  validateFile(file);

  /*
   * Make sure Firebase authentication
   * is available.
   */

  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      'You must be logged in to upload a 3D model.'
    );
  }

  /*
   * Optional consistency check.
   *
   * If a userId was supplied by the caller,
   * make sure it matches the authenticated user.
   */

  if (
    userId &&
    user.uid !== userId
  ) {
    throw new Error(
      'Authenticated user does not match the upload user.'
    );
  }

  /*
   * Get Firebase ID token.
   */

  const idToken =
    await getFirebaseIdToken();

  /*
   * Upload using XMLHttpRequest instead
   * of fetch so CustomService can display
   * real upload progress.
   */

  return new Promise<string>(
    (resolve, reject) => {

      const xhr =
        new XMLHttpRequest();

      const uploadUrl =
        `${CLOUDFLARE_WORKER_URL}/upload`;

      let completed = false;

      /*
       * -----------------------------
       * Error helper
       * -----------------------------
       */

      const fail = (
        error: unknown
      ) => {
        if (completed) {
          return;
        }

        completed = true;

        console.error(
          'Cloudflare R2 upload failed:',
          error
        );

        reject(error);
      };

      /*
       * -----------------------------
       * Upload progress
       * -----------------------------
       */

      xhr.upload.addEventListener(
        'progress',
        (event) => {

          if (!event.lengthComputable) {
            return;
          }

          const progress =
            Math.round(
              (event.loaded /
                event.total) *
                100
            );

          console.log(
            `3D file upload progress: ${progress}%`
          );

          if (onProgress) {
            onProgress(
              Math.min(
                100,
                Math.max(
                  0,
                  progress
                )
              )
            );
          }
        }
      );

      /*
       * -----------------------------
       * Upload completed
       * -----------------------------
       */

      xhr.addEventListener(
        'load',
        () => {

          if (completed) {
            return;
          }

          let response:
            | {
                success?: boolean;
                key?: string;
                fileName?: string;
                size?: number | null;
                error?: string;
              }
            | null = null;

          try {
            response =
              xhr.responseText
                ? JSON.parse(
                    xhr.responseText
                  )
                : null;
          } catch {
            response = null;
          }

          /*
           * HTTP error.
           */

          if (
            xhr.status < 200 ||
            xhr.status >= 300
          ) {
            fail(
              new Error(
                response?.error ||
                  `Upload failed with HTTP ${xhr.status}.`
              )
            );

            return;
          }

          /*
           * Worker returned an error.
           */

          if (
            !response?.success ||
            !response.key
          ) {
            fail(
              new Error(
                response?.error ||
                  'Cloudflare upload failed.'
              )
            );

            return;
          }

          /*
           * Upload succeeded.
           */

          if (onProgress) {
            onProgress(100);
          }

          completed = true;

          console.log(
            '3D file uploaded successfully:',
            response.key
          );

          /*
           * IMPORTANT:
           *
           * We return the R2 object key,
           * not a Firebase Storage URL.
           *
           * Example:
           *
           * quotes/
           *   firebaseUid/
           *     1750000000000_model.3mf
           */

          resolve(
            response.key
          );
        }
      );

      /*
       * -----------------------------
       * Network error
       * -----------------------------
       */

      xhr.addEventListener(
        'error',
        () => {
          fail(
            new Error(
              'Network error while uploading the 3D model.'
            )
          );
        }
      );

      /*
       * -----------------------------
       * Request aborted
       * -----------------------------
       */

      xhr.addEventListener(
        'abort',
        () => {
          fail(
            new Error(
              '3D model upload was cancelled.'
            )
          );
        }
      );

      /*
       * -----------------------------
       * Timeout
       * -----------------------------
       */

      xhr.addEventListener(
        'timeout',
        () => {
          fail(
            new Error(
              '3D model upload timed out.'
            )
          );
        }
      );

      /*
       * 10 minute timeout.
       */

      xhr.timeout =
        10 * 60 * 1000;

      /*
       * -----------------------------
       * Open request
       * -----------------------------
       */

      xhr.open(
        'POST',
        uploadUrl,
        true
      );

      /*
       * Firebase authentication.
       */

      xhr.setRequestHeader(
        'Authorization',
        `Bearer ${idToken}`
      );

      /*
       * File information.
       */

      xhr.setRequestHeader(
        'X-File-Name',
        file.name
      );

      xhr.setRequestHeader(
        'Content-Type',
        file.type ||
          'application/octet-stream'
      );

      /*
       * Start upload.
       */

      if (onProgress) {
        onProgress(0);
      }

      xhr.send(file);
    }
  );
}

/**
 * Upload a product image to Cloudflare R2 through the Cloudflare Worker.
 *
 * @param file Selected image file (PNG, JPG, JPEG, WEBP)
 * @param onProgress Optional upload progress callback (0-100)
 * @returns Deployed R2 image public download URL
 */
export async function uploadProductImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (!file) {
    throw new Error('No file selected.');
  }

  const fileName = file.name.toLowerCase();
  const isAllowed = ['.png', '.jpg', '.jpeg', '.webp'].some(
    (extension) => fileName.endsWith(extension)
  );

  if (!isAllowed) {
    throw new Error(
      'Unsupported image type. Please upload a PNG, JPG, JPEG, or WEBP file.'
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error(
      'Image file is too large. Maximum allowed size is 10 MB.'
    );
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be logged in to upload product images.');
  }

  const idToken = await user.getIdToken();

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      let response: any = null;
      try {
        response = JSON.parse(xhr.responseText);
      } catch {
        response = null;
      }

      if (xhr.status !== 200 || !response?.success || !response.key) {
        reject(
          new Error(
            response?.error ||
              `Upload failed with status code ${xhr.status}`
          )
        );
        return;
      }

      if (onProgress) {
        onProgress(100);
      }

      const fullUrl = `${CLOUDFLARE_WORKER_URL}/file?key=${encodeURIComponent(
        response.key
      )}`;
      resolve(fullUrl);
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network upload failed.'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted by user.'));
    });

    xhr.open('POST', `${CLOUDFLARE_WORKER_URL}/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${idToken}`);
    xhr.setRequestHeader('X-File-Name', file.name);
    xhr.setRequestHeader(
      'Content-Type',
      file.type || 'application/octet-stream'
    );

    if (onProgress) {
      onProgress(0);
    }

    xhr.send(file);
  });
}

/**
 * Delete a previously uploaded 3D model
 * from Cloudflare R2.
 *
 * The Worker verifies that the authenticated
 * Firebase user owns the requested object.
 *
 * @param fileKey R2 object key returned by upload3DFile()
 */
export async function deleteUploadedFile(
  fileKey: string
): Promise<void> {

  if (!fileKey) {
    return;
  }

  const user =
    auth.currentUser;

  if (!user) {
    throw new Error(
      'You must be logged in to delete this file.'
    );
  }

  try {

    /*
     * Get a fresh Firebase ID token.
     */

    const idToken =
      await user.getIdToken();

    /*
     * Build delete URL.
     */

    const deleteUrl =
      `${CLOUDFLARE_WORKER_URL}/file?key=${encodeURIComponent(
        fileKey
      )}`;

    const response =
      await fetch(
        deleteUrl,
        {
          method: 'DELETE',

          headers: {
            Authorization:
              `Bearer ${idToken}`,
          },
        }
      );

    let data:
      | {
          success?: boolean;
          error?: string;
        }
      | null = null;

    try {
      data =
        await response.json();
    } catch {
      data = null;
    }

    if (
      !response.ok ||
      !data?.success
    ) {
      throw new Error(
        data?.error ||
          `Failed to delete file. HTTP ${response.status}.`
      );
    }

    console.log(
      '3D file deleted successfully.'
    );

  } catch (error) {

    console.error(
      'Failed to delete uploaded 3D file:',
      error
    );

    throw error;
  }
}


