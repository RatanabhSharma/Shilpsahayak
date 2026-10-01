import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDocs, setDoc, deleteDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { deleteUploadedFile } from '../utils/uploadFile';

export type MediaAsset = {
  id: string;
  url: string;
  name: string;
  size: number;
  type: string; // 'image/png', 'image/jpeg', etc.
  uploadedBy: string;
  uploadedAt: string;
};

export const mediaKey = ['media'] as const;

export function useMediaLibrary() {
  return useQuery({
    queryKey: mediaKey,
    queryFn: async (): Promise<MediaAsset[]> => {
      const q = query(collection(db, 'media'), orderBy('uploadedAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MediaAsset[];
    }
  });
}

export function useAddMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (asset: Omit<MediaAsset, 'id' | 'uploadedBy' | 'uploadedAt'>) => {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Must be logged in to add media.');

      const newRef = doc(collection(db, 'media'));
      const payload: MediaAsset = {
        id: newRef.id,
        ...asset,
        uploadedBy: currentUser.uid,
        uploadedAt: new Date().toISOString()
      };

      await setDoc(newRef, payload);
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKey });
    }
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (asset: MediaAsset) => {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Must be logged in to delete media.');

      // Delete from R2 / Storage if possible
      await deleteUploadedFile(asset.url);
      
      // Delete metadata from firestore
      await deleteDoc(doc(db, 'media', asset.id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKey });
    }
  });
}
