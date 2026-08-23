import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  where,
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

/* -------------------------------------------------------------------------- */
/* Admin: Get ALL orders                                                       */
/* -------------------------------------------------------------------------- */

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],

    queryFn: async (): Promise<Order[]> => {
      const ordersQuery = query(
        collection(db, 'orders'),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(ordersQuery);

      return snapshot.docs.map((orderDoc) => ({
        id: orderDoc.id,
        ...orderDoc.data(),
      })) as Order[];
    },

    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/* -------------------------------------------------------------------------- */
/* Admin: Get ONE order                                                       */
/* -------------------------------------------------------------------------- */

export function useOrder(orderId?: string) {
  return useQuery({
    queryKey: ['order', orderId],

    queryFn: async (): Promise<Order | null> => {
      if (!orderId) {
        return null;
      }

      const orderRef = doc(db, 'orders', orderId);
      const snapshot = await getDoc(orderRef);

      if (!snapshot.exists()) {
        return null;
      }

      return {
        id: snapshot.id,
        ...snapshot.data(),
      } as Order;
    },

    enabled: !!orderId,

    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/* -------------------------------------------------------------------------- */
/* Customer: Get only current user's orders                                   */
/* -------------------------------------------------------------------------- */

export function useMyOrders(enabled = true) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-orders', user?.uid],

    queryFn: async (): Promise<Order[]> => {
      if (!user) {
        return [];
      }

      const ordersQuery = query(
        collection(db, 'orders'),
        where('customerId', '==', user.uid),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(ordersQuery);

      return snapshot.docs.map((orderDoc) => ({
        id: orderDoc.id,
        ...orderDoc.data(),
      })) as Order[];
    },

    enabled: !!user && enabled,

    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/* -------------------------------------------------------------------------- */
/* Create new order                                                           */
/* -------------------------------------------------------------------------- */

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      orderData: Omit<Order, 'id' | 'date' | 'status'>
    ) => {
      if (!user) {
        throw new Error(
          'You must be logged in to create an order.'
        );
      }

      const newOrder = {
        ...orderData,
        customerId: user.uid,
        date: new Date().toISOString(),
        status: 'Pending' as OrderStatus,
      };

      const docRef = await addDoc(
        collection(db, 'orders'),
        newOrder
      );

      return {
        id: docRef.id,
        ...newOrder,
      };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['orders'],
      });

      queryClient.invalidateQueries({
        queryKey: ['my-orders'],
      });
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Update order status                                                        */
/* -------------------------------------------------------------------------- */

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: OrderStatus;
    }) => {
      if (!id) {
        throw new Error('Order ID is required.');
      }

      await updateDoc(
        doc(db, 'orders', id),
        {
          status,
        }
      );
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['orders'],
      });

      queryClient.invalidateQueries({
        queryKey: ['my-orders'],
      });

      queryClient.invalidateQueries({
        queryKey: ['order', variables.id],
      });
    },
  });
}