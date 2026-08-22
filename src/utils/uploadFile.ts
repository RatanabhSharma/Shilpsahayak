import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../lib/firebase';

export async function upload3DFile(
  file: File,
  userId: string | undefined,
  onProgress?: (progress: number) => void
): Promise<string> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `quotes/${userId || 'guest'}/${timestamp}_${safeName}`;

  const storageRef = ref(storage, path);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(Math.round(progress));
      },
      (error) => {
        reject(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
}

// Delete a previously-uploaded 3D file from Storage, given its download URL.
// Safe to call even if the file was already removed (ignores "not found" errors).
export async function deleteUploadedFile(fileUrl: string): Promise<void> {
  try {
    const fileRef = ref(storage, fileUrl);
    await deleteObject(fileRef);
  } catch (error: any) {
    if (error?.code !== 'storage/object-not-found') {
      throw error;
    }
  }
}