import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export type QuoteStatus = 'Pending' | 'Quoted' | 'Accepted' | 'Rejected' | 'Completed';

export type Quote = {
  id: string;
  date: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fileName: string;
  fileUrl?: string;
  material: string;
  color: string;
  infill: number;
  layerHeight: number;
  quantity: number;
  estimatedWeight: number;
  estimatedPrice: number;
  notes?: string;
  status: QuoteStatus;
  adminPrice?: number;
  adminNotes?: string;
};

// Admin: Get all quotes
export function useQuotes() {
  return useQuery({
    queryKey: ['quotes'],
    queryFn: async () => {
      const q = query(collection(db, 'quotes'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Quote[];
    }
  });
}

// Customer: Get only my quotes
export function useMyQuotes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-quotes', user?.uid],
    queryFn: async () => {
      if (!user) return [];

      const q = query(
        collection(db, 'quotes'),
        where('customerId', '==', user.uid),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Quote[];
    },
    enabled: !!user
  });
}

// Submit new quote
export function useSubmitQuote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (quoteData: Omit<Quote, 'id' | 'date' | 'status'>) => {
      const newQuote = {
        ...quoteData,
        customerId: user?.uid || null,
        date: new Date().toISOString(),
        status: 'Pending' as QuoteStatus
      };
      const docRef = await addDoc(collection(db, 'quotes'), newQuote);
      return { id: docRef.id, ...newQuote };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['my-quotes'] });
    }
  });
}

// Update quote (Admin)
export function useUpdateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<Quote> & { id: string }) => {
      await updateDoc(doc(db, 'quotes', id), data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['my-quotes'] });
    }
  });
}