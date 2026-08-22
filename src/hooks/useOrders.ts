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

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Printing'
  | 'Quality Check'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  customNotes?: string;
  variantId?: string;
  variantLabel?: string;
};

export type Order = {
  id: string;
  date: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  notes?: string;
};

// Admin: Get all orders
export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const q = query(collection(db, 'orders'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
    }
  });
}

// Customer: Get only my orders
export function useMyOrders() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-orders', user?.uid],
    queryFn: async () => {
      if (!user) return [];

      const q = query(
        collection(db, 'orders'),
        where('customerId', '==', user.uid),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
    },
    enabled: !!user
  });
}

// Create new order
export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (orderData: Omit<Order, 'id' | 'date' | 'status'>) => {
      const newOrder = {
        ...orderData,
        customerId: user?.uid || null,
        date: new Date().toISOString(),
        status: 'Pending' as OrderStatus
      };
      const docRef = await addDoc(collection(db, 'orders'), newOrder);
      return { id: docRef.id, ...newOrder };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    }
  });
}

// Update order status (Admin)
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      await updateDoc(doc(db, 'orders', id), { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    }
  });
}