import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type Review = {
  id?: string;
  name: string;
  rating: number;
  experience: string;
  quote: string;
  createdAt?: unknown;
};

export function useReviews() {
  return useQuery({
    queryKey: ['reviews'],
    queryFn: async (): Promise<Review[]> => {
      try {
        const ref = collection(db, 'reviews');
        const q = query(ref, orderBy('createdAt', 'desc'), limit(10));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          return [];
        }

        return snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Review[];
      } catch {
        return [];
      }
    },
  });
}

export function useAddReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (review: Omit<Review, 'id' | 'createdAt'>) => {
      const ref = collection(db, 'reviews');
      const docRef = await addDoc(ref, {
        ...review,
        createdAt: serverTimestamp(),
      });
      return { id: docRef.id, ...review };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}




