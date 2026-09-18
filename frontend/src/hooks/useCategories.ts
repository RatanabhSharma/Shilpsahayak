import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export type Category = {
  id: string;
  name: string;
  slug: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const categoriesQuery = query(
        collection(db, 'categories'),
        orderBy('name', 'asc')
      );

      const snapshot = await getDocs(categoriesQuery);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Category[];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useAddCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const cleanName = name.trim();

      if (!cleanName) {
        throw new Error('Category name is required.');
      }

      // Check existing categories to prevent duplicates.
      const snapshot = await getDocs(collection(db, 'categories'));

      const duplicate = snapshot.docs.some((doc) => {
        const data = doc.data();

        return (
          typeof data.name === 'string' &&
          data.name.trim().toLowerCase() === cleanName.toLowerCase()
        );
      });

      if (duplicate) {
        throw new Error('This category already exists.');
      }

      const docRef = await addDoc(collection(db, 'categories'), {
        name: cleanName,
        slug: slugify(cleanName),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return {
        id: docRef.id,
        name: cleanName,
        slug: slugify(cleanName)
      };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['categories']
      });
    }
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const cleanName = name.trim();
      if (!cleanName) {
        throw new Error('Category name is required.');
      }

      const docRef = doc(db, 'categories', id);
      await updateDoc(docRef, {
        name: cleanName,
        slug: slugify(cleanName),
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['categories'],
      });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const docRef = doc(db, 'categories', id);
      await deleteDoc(docRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['categories'],
      });
    },
  });
}


