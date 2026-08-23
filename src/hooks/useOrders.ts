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

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

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

  customerId?: string | null;
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
/* Admin: Get all orders                                                      */
/* -------------------------------------------------------------------------- */

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],

    queryFn: async (): Promise<Order[]> => {
      console.log('Loading ALL orders for admin...');

      const ordersQuery = query(
        collection(db, 'orders'),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(
        ordersQuery
      );

      console.log(
        'Admin orders loaded:',
        snapshot.size
      );

      return snapshot.docs.map((orderDoc) => ({
        id: orderDoc.id,
        ...orderDoc.data(),
      })) as Order[];
    },

    staleTime: 30 * 1000,

    refetchOnMount: true,

    refetchOnWindowFocus: false,

    retry: 1,
  });
}

/* -------------------------------------------------------------------------- */
/* Customer: Get current user's orders                                        */
/* -------------------------------------------------------------------------- */

export function useMyOrders(
  enabled = true
) {
  const { user } = useAuth();

  const uid = user?.uid ?? null;

  return useQuery({
    queryKey: ['my-orders', uid],

    queryFn: async (): Promise<Order[]> => {
      if (!uid) {
        console.warn(
          'useMyOrders: Firebase user is not available.'
        );

        return [];
      }

      console.log(
        'Loading customer orders for Firebase UID:',
        uid
      );

      try {
        /*
         * IMPORTANT:
         *
         * We intentionally do NOT use orderBy()
         * here.
         *
         * This avoids requiring a Firestore
         * composite index.
         */

        const ordersQuery = query(
          collection(db, 'orders'),
          where(
            'customerId',
            '==',
            uid
          )
        );

        console.log(
          'Running customer orders query...'
        );

        const snapshot = await getDocs(
          ordersQuery
        );

        console.log(
          'Customer orders returned:',
          snapshot.size
        );

        const orders: Order[] =
          snapshot.docs.map(
            (orderDoc) => {
              const data =
                orderDoc.data();

              console.log(
                'Order found:',
                {
                  id: orderDoc.id,
                  customerId:
                    data.customerId,
                  date:
                    data.date,
                  status:
                    data.status,
                }
              );

              return {
                id: orderDoc.id,
                ...data,
              } as Order;
            }
          );

        /*
         * Sort locally.
         *
         * Newest orders first.
         */

        orders.sort(
          (a, b) => {
            const dateA =
              new Date(
                a.date
              ).getTime();

            const dateB =
              new Date(
                b.date
              ).getTime();

            return dateB - dateA;
          }
        );

        console.log(
          'Final customer orders:',
          orders
        );

        return orders;

      } catch (error: any) {
        console.error(
          'Failed to load customer orders.'
        );

        console.error(
          'Firebase error:',
          error
        );

        console.error(
          'Firebase error code:',
          error?.code
        );

        console.error(
          'Firebase error message:',
          error?.message
        );

        throw error;
      }
    },

    /*
     * Don't run until:
     *
     * 1. Firebase user exists
     * 2. Orders tab is enabled
     */

    enabled:
      enabled &&
      !!uid,

    /*
     * Always consider customer orders
     * immediately stale.
     */

    staleTime: 0,

    /*
     * Fetch whenever Orders tab mounts.
     */

    refetchOnMount: true,

    /*
     * Don't create unnecessary requests
     * when switching browser tabs.
     */

    refetchOnWindowFocus: false,

    /*
     * One automatic retry.
     */

    retry: 1,
  });
}

/* -------------------------------------------------------------------------- */
/* Create new order                                                           */
/* -------------------------------------------------------------------------- */

export function useCreateOrder() {
  const queryClient =
    useQueryClient();

  const { user } =
    useAuth();

  return useMutation({
    mutationFn: async (
      orderData: Omit<
        Order,
        'id' |
        'date' |
        'status'
      >
    ) => {

      /*
       * Always use the current
       * Firebase authenticated user.
       */

      const currentUser =
        user;

      if (!currentUser) {
        throw new Error(
          'You must be logged in to place an order.'
        );
      }

      const customerId =
        currentUser.uid;

      console.log(
        'Creating order for Firebase UID:',
        customerId
      );

      /*
       * Create the Firestore document.
       */

      const newOrder = {
        ...orderData,

        customerId,

        date:
          new Date().toISOString(),

        status:
          'Pending' as OrderStatus,
      };

      /*
       * Safety validation.
       */

      if (
        !newOrder.customerId
      ) {
        throw new Error(
          'Unable to determine customer ID.'
        );
      }

      console.log(
        'Order being written:',
        newOrder
      );

      /*
       * Save order.
       */

      const docRef =
        await addDoc(
          collection(
            db,
            'orders'
          ),
          newOrder
        );

      console.log(
        'Order created successfully:',
        docRef.id
      );

      return {
        id: docRef.id,
        ...newOrder,
      };
    },

    onSuccess:
      async (newOrder) => {

        /*
         * Invalidate admin orders.
         */

        await queryClient.invalidateQueries({
          queryKey: ['orders'],
        });

        /*
         * Immediately update the
         * customer's order cache.
         */

        const uid =
          newOrder.customerId;

        if (uid) {

          queryClient.setQueryData<Order[]>(
            ['my-orders', uid],

            (oldOrders = []) => {

              const alreadyExists =
                oldOrders.some(
                  (order) =>
                    order.id ===
                    newOrder.id
                );

              if (
                alreadyExists
              ) {
                return oldOrders;
              }

              return [
                newOrder as Order,
                ...oldOrders,
              ];
            }
          );
        }

        /*
         * Mark customer orders stale.
         *
         * The cache already contains the
         * newly created order, so the UI
         * doesn't have to wait for Firestore.
         */

        queryClient.invalidateQueries({
          queryKey: ['my-orders'],
          refetchType: 'none',
        });
      },
  });
}

/* -------------------------------------------------------------------------- */
/* Update order status - Admin                                                */
/* -------------------------------------------------------------------------- */

export function useUpdateOrderStatus() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: OrderStatus;
    }) => {

      await updateDoc(
        doc(
          db,
          'orders',
          id
        ),
        {
          status,
        }
      );
    },

    onSuccess:
      async () => {

        await queryClient.invalidateQueries({
          queryKey: ['orders'],
        });

        await queryClient.invalidateQueries({
          queryKey: ['my-orders'],
        });

        await queryClient.invalidateQueries({
          queryKey: ['order'],
        });
      },
  });
}

/* -------------------------------------------------------------------------- */
/* Get single order                                                           */
/* -------------------------------------------------------------------------- */

export function useOrder(
  orderId?: string
) {
  return useQuery({
    queryKey: [
      'order',
      orderId,
    ],

    queryFn:
      async (): Promise<Order | null> => {

        if (!orderId) {
          return null;
        }

        const orderRef =
          doc(
            db,
            'orders',
            orderId
          );

        const snapshot =
          await getDoc(
            orderRef
          );

        if (
          !snapshot.exists()
        ) {
          return null;
        }

        return {
          id: snapshot.id,
          ...snapshot.data(),
        } as Order;
      },

    enabled:
      !!orderId,

    staleTime: 0,

    refetchOnMount: true,

    refetchOnWindowFocus: false,

    retry: 1,
  });
}