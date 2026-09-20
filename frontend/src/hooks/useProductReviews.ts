
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  getAggregateFromServer,
  average,
  count,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export type ProductReview = {
  id: string;
  productId: string;
  orderId: string;
  userId: string;
  userName: string;
  rating: number;
  reviewText: string;
  status: ReviewStatus;
  verifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
};

// Fetch approved reviews for a product
export function useProductReviews(productId: string) {
  return useQuery({
    queryKey: ['productReviews', productId],
    queryFn: async () => {
      const ref = collection(db, 'products', productId, 'reviews');
      const q = query(
        ref,
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      const reviews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate().toISOString() || new Date().toISOString(),
      })) as ProductReview[];
      
      let avg = 0;
      if (reviews.length > 0) {
        avg = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
      }
      
      return {
        reviews,
        reviewCount: reviews.length,
        averageRating: avg,
      };
    },
    enabled: !!productId,
  });
}

// Fetch all reviews for a product (admin or specific user)
export function useUserProductReview(productId: string, userId?: string) {
  return useQuery({
    queryKey: ['userProductReview', productId, userId],
    queryFn: async () => {
      if (!userId) return null;
      const ref = collection(db, 'products', productId, 'reviews');
      const q = query(ref, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate().toISOString() || new Date().toISOString(),
      } as ProductReview;
    },
    enabled: !!productId && !!userId,
  });
}

// Add a review
export function useAddProductReview(productId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (reviewData: { rating: number; reviewText: string; orderId: string; userName: string }) => {
      if (!user) throw new Error('Must be logged in');
      
      const reviewId = `${user.uid}_${reviewData.orderId}_${productId}`;
      const docRef = doc(db, 'products', productId, 'reviews', reviewId);
      
      const newReview = {
        productId,
        userId: user.uid,
        userName: reviewData.userName,
        rating: reviewData.rating,
        reviewText: reviewData.reviewText,
        orderId: reviewData.orderId,
        status: 'pending',
        verifiedPurchase: true, // enforced by rule/flow
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      await setDoc(docRef, newReview);
      return { id: reviewId, ...newReview };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productReviews', productId] });
      queryClient.invalidateQueries({ queryKey: ['userProductReview', productId] });
    }
  });
}

// Update a review (for user editing their own)
export function useUpdateProductReview(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, data }: { reviewId: string; data: Partial<ProductReview> }) => {
      const ref = doc(db, 'products', productId, 'reviews', reviewId);
      await updateDoc(ref, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productReviews', productId] });
      queryClient.invalidateQueries({ queryKey: ['userProductReview', productId] });
    }
  });
}

