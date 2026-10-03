import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description?: string;
  discountType: 'percentage' | 'fixed_amount' | 'free_shipping';
  discountValue: number;
  minimumOrderValue?: number;
  maximumDiscountAmount?: number;
  startDate: string;
  endDate?: string;
  totalUsageLimit?: number;
  currentUsageCount: number;
  perCustomerLimit?: number;
  applicableProducts?: string[];
  applicableCategories?: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const useCoupons = () => {
  return useQuery({
    queryKey: ['coupons'],
    queryFn: async () => {
      const q = query(collection(db, 'coupons'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Coupon));
    },
  });
};

export const useAddCoupon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newCoupon: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt' | 'currentUsageCount'>) => {
      const now = new Date().toISOString();
      const payload = {
        ...newCoupon,
        code: newCoupon.code.toUpperCase().trim(),
        currentUsageCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      const docRef = await addDoc(collection(db, 'coupons'), payload);
      return { id: docRef.id, ...payload };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });
};

export const useUpdateCoupon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; data: Partial<Coupon> }) => {
      const docRef = doc(db, 'coupons', params.id);
      const payload = { ...params.data, updatedAt: new Date().toISOString() };
      if (payload.code) {
        payload.code = payload.code.toUpperCase().trim();
      }
      await updateDoc(docRef, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });
};

export const useDeleteCoupon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'coupons', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });
};
