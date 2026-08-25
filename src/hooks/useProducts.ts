import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export type ProductVariant = {
  id: string;
  label: string;
  price: number;
  stock: number;
  image?: string;
  theme?: string;
  color?: string;
  size?: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  images?: string[];
  stock: number;
  material?: string;
  occasion?: string;
  isCustomizable?: boolean;
  featured?: boolean;
  active?: boolean;
  hasVariants?: boolean;
  variants?: ProductVariant[];
};

// Get all products
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'products'));
      const products = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];

      return products.sort((a, b) =>
        (a.name || '').localeCompare(b.name || '')
      );
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// Add new product
export function useAddProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: Omit<Product, 'id'>) => {
      const docRef = await addDoc(collection(db, 'products'), product);
      return { id: docRef.id, ...product };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
}

// Update product
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Product> & { id: string }) => {
      await updateDoc(doc(db, 'products', id), data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
}

// Delete product
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'products', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
}