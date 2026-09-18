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
import { useStore, Product } from '../store';

import { db } from '../lib/firebase';
import { useAuth } from './useAuth';
import {
  sendOrderConfirmationNotification,
  sendOrderStatusUpdateNotification,
  sendOrderCancelledNotification,
} from '../services/emailNotifications';

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Ready to ship'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Refunded'
  /* Legacy statuses for backwards compatibility */
  | 'Printing'
  | 'Quality Check';

export type PaymentStatus =
  | 'Pending'
  | 'Paid'
  | 'Failed'
  | 'Refunded'
  | 'Partially refunded';

export type ShippingStatus =
  | 'Not shipped'
  | 'Ready to ship'
  | 'Shipped'
  | 'In transit'
  | 'Delivered'
  | 'Returned';

export type ReturnStatus =
  | 'None'
  | 'Requested'
  | 'Approved'
  | 'Received'
  | 'Rejected'
  | 'Completed';

export type RefundStatus =
  | 'None'
  | 'Requested'
  | 'Processing'
  | 'Approved'
  | 'Refunded'
  | 'Rejected';

export type FulfillmentType =
  | 'Standard Shipping'
  | 'Express Shipping'
  | 'Studio Pickup'
  | 'Custom Delivery';

export type OrderTimelineEvent = {
  id: string;
  status: string;
  note?: string;
  timestamp: string;
  updatedBy?: string;
};

export type OrderNote = {
  id: string;
  text: string;
  createdAt: string;
  author: string;
};

export type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  customNotes?: string;
  variantId?: string;
  variantLabel?: string;
  isCancellable?: boolean;
  quoteId?: string;
  customPrint?: any;
};

export type Order = {
  id: string;
  date: string;

  customerId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;

  address: string;
  shippingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };

  items: OrderItem[];

  total: number;
  subtotal?: number;
  shippingFee?: number;
  shippingCost?: number;
  taxAmount?: number;

  status: OrderStatus;
  paymentId?: string;
  paymentStatus?: PaymentStatus;
  paymentMethod?: string;
  transactionRef?: string;
  paidAt?: string;

  fulfillmentType?: FulfillmentType;
  shippingStatus?: ShippingStatus;
  courierPartner?: string;
  trackingNumber?: string;
  expectedDeliveryDate?: string;
  deliveredDate?: string;

  returnRequest?: boolean;
  returnReason?: string;
  returnStatus?: ReturnStatus;
  returnRequestedAt?: string;
  returnNotes?: string;

  refundAmount?: number;
  refundStatus?: RefundStatus;
  refundReason?: string;
  refundedAt?: string;
  timeline?: OrderTimelineEvent[];
  internalNotes?: OrderNote[];

  quoteId?: string;
  notes?: string;
  isCancellable?: boolean;
  cancelledAt?: string;
  cancellationReason?: string;
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
        orderData.customerId || currentUser.uid;

      console.log(
        'Creating order for Firebase UID:',
        customerId
      );

      /*
       * Create the Firestore document.
       */
      const dateNow = new Date().toISOString();
      const newOrder = {
        ...orderData,

        customerId,

        date: dateNow,

        status: (orderData as any).status || ('Pending' as OrderStatus),

        paymentStatus: (orderData as any).paymentStatus || ('Pending' as PaymentStatus),

        fulfillmentType: (orderData as any).fulfillmentType || ('Standard Shipping' as FulfillmentType),

        timeline: [
          {
            id: `tl_${Date.now()}`,
            status: 'Pending',
            note: 'Order placed by customer',
            timestamp: dateNow,
            updatedBy: 'Customer',
          },
        ],

        internalNotes: [],
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
        // Dispatch order confirmation email to customer
        sendOrderConfirmationNotification(newOrder as Order).catch((err) =>
          console.error('[Notification] Failed to send order confirmation email:', err)
        );

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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      trackingNumber,
      courierPartner,
      note,
      updatedBy = 'Workshop Admin',
    }: {
      id: string;
      status: OrderStatus;
      trackingNumber?: string;
      courierPartner?: string;
      note?: string;
      updatedBy?: string;
    }) => {
      const orderRef = doc(db, 'orders', id);
      const snapshot = await getDoc(orderRef);
      if (!snapshot.exists()) throw new Error('Order not found');

      const existingData = snapshot.data() as Order;
      const timeline = existingData.timeline || [
        {
          id: 'initial',
          status: existingData.status || 'Pending',
          timestamp: existingData.date || new Date().toISOString(),
          note: 'Order placed',
          updatedBy: 'System',
        },
      ];

      const newTimelineEvent: OrderTimelineEvent = {
        id: `tl_${Date.now()}`,
        status,
        timestamp: new Date().toISOString(),
        note: note || `Order status updated to "${status}"`,
        updatedBy,
      };

      const updateData: Record<string, unknown> = {
        status,
        timeline: [...timeline, newTimelineEvent],
      };
      if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
      if (courierPartner !== undefined) updateData.courierPartner = courierPartner;

      await updateDoc(orderRef, updateData);

      if (snapshot.exists()) {
        const orderData = { id: snapshot.id, ...snapshot.data() } as Order;
        sendOrderStatusUpdateNotification({
          order: orderData,
          status,
          trackingNumber,
          courierPartner,
        }).catch((err) => console.error('Failed to dispatch status email:', err));
      }
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['my-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['order'] }),
      ]);
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Update payment status - Admin                                              */
/* -------------------------------------------------------------------------- */

export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      paymentId,
      paymentStatus,
      paymentMethod,
      transactionRef,
      paidAt,
      note,
      updatedBy = 'Workshop Admin',
    }: {
      id: string;
      paymentId?: string;
      paymentStatus: PaymentStatus;
      paymentMethod?: string;
      transactionRef?: string;
      paidAt?: string;
      note?: string;
      updatedBy?: string;
    }) => {
      const orderRef = doc(db, 'orders', id);
      const snapshot = await getDoc(orderRef);
      if (!snapshot.exists()) throw new Error('Order not found');

      const existingData = snapshot.data() as Order;
      const timeline = existingData.timeline || [];

      const newTimelineEvent: OrderTimelineEvent = {
        id: `tl_${Date.now()}`,
        status: `Payment: ${paymentStatus}`,
        timestamp: new Date().toISOString(),
        note:
          note ||
          `Payment status updated to "${paymentStatus}"${
            paymentMethod ? ` via ${paymentMethod}` : ''
          }${transactionRef ? ` (Ref: ${transactionRef})` : ''}`,
        updatedBy,
      };

      const updateData: Record<string, unknown> = {
        paymentStatus,
        timeline: [...timeline, newTimelineEvent],
      };
      if (paymentId !== undefined) updateData.paymentId = paymentId;
      if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
      if (transactionRef !== undefined) updateData.transactionRef = transactionRef;
      if (paymentStatus === 'Paid') {
        updateData.paidAt = paidAt || new Date().toISOString();
      } else if (paidAt !== undefined) {
        updateData.paidAt = paidAt;
      }

      await updateDoc(orderRef, updateData);
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['my-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['order'] }),
      ]);
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Update shipping & fulfillment details - Admin                              */
/* -------------------------------------------------------------------------- */

export function useUpdateShippingDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      shippingStatus,
      courierPartner,
      trackingNumber,
      shippingCost,
      expectedDeliveryDate,
      deliveredDate,
      note,
      syncOrderStatus = true,
      updatedBy = 'Workshop Admin',
    }: {
      id: string;
      shippingStatus: ShippingStatus;
      courierPartner?: string;
      trackingNumber?: string;
      shippingCost?: number;
      expectedDeliveryDate?: string;
      deliveredDate?: string;
      note?: string;
      syncOrderStatus?: boolean;
      updatedBy?: string;
    }) => {
      const orderRef = doc(db, 'orders', id);
      const snapshot = await getDoc(orderRef);
      if (!snapshot.exists()) throw new Error('Order not found');

      const existingData = snapshot.data() as Order;
      const timeline = existingData.timeline || [];

      const newTimelineEvent: OrderTimelineEvent = {
        id: `tl_${Date.now()}`,
        status: `Shipping: ${shippingStatus}`,
        timestamp: new Date().toISOString(),
        note:
          note ||
          `Shipping updated to "${shippingStatus}"${
            courierPartner ? ` via ${courierPartner}` : ''
          }${trackingNumber ? ` (AWB: ${trackingNumber})` : ''}`,
        updatedBy,
      };

      const updateData: Record<string, unknown> = {
        shippingStatus,
        timeline: [...timeline, newTimelineEvent],
      };

      if (courierPartner !== undefined) updateData.courierPartner = courierPartner;
      if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
      if (shippingCost !== undefined) {
        updateData.shippingCost = shippingCost;
        updateData.shippingFee = shippingCost;
      }
      if (expectedDeliveryDate !== undefined) {
        updateData.expectedDeliveryDate = expectedDeliveryDate;
      }
      if (deliveredDate !== undefined) {
        updateData.deliveredDate = deliveredDate;
      } else if (shippingStatus === 'Delivered') {
        updateData.deliveredDate = new Date().toISOString();
      }

      // Sync overall order status if enabled
      if (syncOrderStatus) {
        if (shippingStatus === 'Ready to ship' && existingData.status !== 'Shipped' && existingData.status !== 'Delivered') {
          updateData.status = 'Ready to ship';
        } else if ((shippingStatus === 'Shipped' || shippingStatus === 'In transit') && existingData.status !== 'Delivered') {
          updateData.status = 'Shipped';
        } else if (shippingStatus === 'Delivered') {
          updateData.status = 'Delivered';
        }
      }

      await updateDoc(orderRef, updateData);

      // Fire customer email notification on dispatch
      if (shippingStatus === 'Shipped' && existingData.status !== 'Shipped') {
        const orderData = { id: snapshot.id, ...snapshot.data(), ...updateData } as Order;
        sendOrderStatusUpdateNotification({
          order: orderData,
          status: 'Shipped',
          trackingNumber,
          courierPartner,
        }).catch((err) => console.error('Failed to dispatch shipping notification:', err));
      }
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['my-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['order'] }),
      ]);
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Update return and refund workflow - Admin                                  */
/* -------------------------------------------------------------------------- */

export function useUpdateReturnRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      returnStatus,
      returnReason,
      returnNotes,
      refundAmount,
      refundStatus,
      updatedBy = 'Workshop Admin',
    }: {
      id: string;
      returnStatus: ReturnStatus;
      returnReason?: string;
      returnNotes?: string;
      refundAmount?: number;
      refundStatus?: RefundStatus;
      updatedBy?: string;
    }) => {
      const orderRef = doc(db, 'orders', id);
      const snapshot = await getDoc(orderRef);
      if (!snapshot.exists()) throw new Error('Order not found');

      const existingData = snapshot.data() as Order;
      const timeline = existingData.timeline || [];

      const newTimelineEvent: OrderTimelineEvent = {
        id: `tl_${Date.now()}`,
        status: `Return: ${returnStatus}`,
        timestamp: new Date().toISOString(),
        note: `Return status marked as "${returnStatus}"${
          returnReason ? ` · Reason: ${returnReason}` : ''
        }`,
        updatedBy,
      };

      const updateData: Record<string, unknown> = {
        returnStatus,
        returnRequest: returnStatus !== 'None',
        timeline: [...timeline, newTimelineEvent],
      };

      if (returnReason !== undefined) updateData.returnReason = returnReason;
      if (returnNotes !== undefined) updateData.returnNotes = returnNotes;
      if (refundAmount !== undefined) updateData.refundAmount = refundAmount;
      if (refundStatus !== undefined) {
        updateData.refundStatus = refundStatus;
        if (refundStatus === 'Refunded') {
          updateData.paymentStatus = 'Refunded';
          updateData.refundedAt = new Date().toISOString();
        } else if (refundStatus === 'Processing' || refundStatus === 'Approved') {
          if (existingData.paymentStatus !== 'Refunded') {
            updateData.paymentStatus = 'Partially refunded';
          }
        }
      }

      await updateDoc(orderRef, updateData);
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['my-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['order'] }),
      ]);
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Add internal note - Admin                                                  */
/* -------------------------------------------------------------------------- */

export function useAddOrderNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      text,
      author = 'Workshop Admin',
    }: {
      id: string;
      text: string;
      author?: string;
    }) => {
      const orderRef = doc(db, 'orders', id);
      const snapshot = await getDoc(orderRef);
      if (!snapshot.exists()) throw new Error('Order not found');

      const existingData = snapshot.data() as Order;
      const internalNotes = existingData.internalNotes || [];

      const newNote: OrderNote = {
        id: `note_${Date.now()}`,
        text: text.trim(),
        createdAt: new Date().toISOString(),
        author,
      };

      await updateDoc(orderRef, {
        internalNotes: [...internalNotes, newNote],
      });
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['order'] }),
      ]);
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Refund order - Admin                                                       */
/* -------------------------------------------------------------------------- */

export function useRefundOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      refundAmount,
      reason,
      updatedBy = 'Workshop Admin',
    }: {
      id: string;
      refundAmount: number;
      reason?: string;
      updatedBy?: string;
    }) => {
      const orderRef = doc(db, 'orders', id);
      const snapshot = await getDoc(orderRef);
      if (!snapshot.exists()) throw new Error('Order not found');

      const existingData = snapshot.data() as Order;
      const orderTotal = Number(existingData.total) || 0;
      const isFullRefund = refundAmount >= orderTotal;
      const newPaymentStatus: PaymentStatus = isFullRefund ? 'Refunded' : 'Partially refunded';
      const timeline = existingData.timeline || [];

      const newTimelineEvent: OrderTimelineEvent = {
        id: `tl_${Date.now()}`,
        status: `Refund: ${newPaymentStatus}`,
        timestamp: new Date().toISOString(),
        note: `Processed refund of ₹${refundAmount.toLocaleString('en-IN')}${
          reason ? ` · Reason: ${reason}` : ''
        }`,
        updatedBy,
      };

      const updateData: Record<string, unknown> = {
        paymentStatus: newPaymentStatus,
        refundAmount,
        refundReason: reason,
        refundedAt: new Date().toISOString(),
        timeline: [...timeline, newTimelineEvent],
      };

      if (isFullRefund) {
        updateData.status = 'Refunded';
      }

      await updateDoc(orderRef, updateData);
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['my-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['order'] }),
      ]);
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
}/* -------------------------------------------------------------------------- */
/* Re-order                                                                    */
/* -------------------------------------------------------------------------- */

export function useReorderOrder() {
  const addToCart = useStore(
    (state) => state.addToCart
  );

  return useMutation({
    mutationFn: async (
      order: Order
    ) => {
      if (!order.items?.length) {
        throw new Error(
          'This order has no items to reorder.'
        );
      }

      /*
       * Resolve every product before adding anything
       * to the cart. This prevents a partially restored
       * order if one product is unavailable.
       */

      const resolvedItems = await Promise.all(
        order.items.map(
          async (item) => {
            const productRef = doc(
              db,
              'products',
              item.productId
            );

            const snapshot =
              await getDoc(productRef);

            if (!snapshot.exists()) {
              throw new Error(
                `${item.productName} is no longer available.`
              );
            }

            const product = {
              id: snapshot.id,
              ...snapshot.data()
            } as Product;

            /*
             * Product may have been disabled
             * since the original order.
             */

            if (
              product.active === false
            ) {
              throw new Error(
                `${item.productName} is currently unavailable.`
              );
            }

            /*
             * Restore the original variant.
             */

            let variant =
              undefined;

            if (item.variantId) {
              variant =
                product.variants?.find(
                  (currentVariant) =>
                    currentVariant.id ===
                    item.variantId
                );

              if (!variant) {
                throw new Error(
                  `${item.productName} — ${item.variantLabel || 'selected variant'} is no longer available.`
                );
              }

              /*
               * Check variant stock.
               */

              if (
                variant.stock <
                item.quantity
              ) {
                throw new Error(
                  `${item.productName} — ${variant.label} does not have enough stock.`
                );
              }
            } else {
              /*
               * Check normal product stock.
               */

              if (
                product.stock <
                item.quantity
              ) {
                throw new Error(
                  `${item.productName} does not have enough stock.`
                );
              }
            }

            return {
              product,
              quantity:
                item.quantity,
              customNotes:
                item.customNotes,
              variantId:
                item.variantId,
              variantLabel:
                item.variantLabel
            };
          }
        )
      );

      /*
       * Only add items after every item has
       * successfully passed validation.
       */

      resolvedItems.forEach(
        (item) => {
          addToCart(
            item.product,
            item.quantity,
            item.customNotes,
            item.variantLabel,
            item.variantId
          );
        }
      );

      return resolvedItems;
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Customer / Admin: Cancel Order & Restore Inventory Stock                   */
/* -------------------------------------------------------------------------- */

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      reason,
    }: {
      orderId: string;
      reason?: string;
    }) => {
      console.log('Processing cancellation for order:', orderId);
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);

      if (!orderSnap.exists()) {
        throw new Error('Order not found.');
      }

      const orderData = orderSnap.data() as Order;

      // Only allow cancellation if status is Pending or Confirmed
      if (orderData.status !== 'Pending' && orderData.status !== 'Confirmed') {
        throw new Error(
          `Cannot cancel order. The current status is "${orderData.status}". 3D print fabrication or dispatch has already commenced.`
        );
      }

      // 1. Update order status to Cancelled in Firestore
      const cancellationTime = new Date().toISOString();
      await updateDoc(orderRef, {
        status: 'Cancelled',
        cancelledAt: cancellationTime,
        cancellationReason: reason || 'Customer requested cancellation before production',
      });

      // 2. Automatically restore inventory stock for all catalogue items
      if (Array.isArray(orderData.items)) {
        for (const item of orderData.items) {
          if (!item.productId) continue;
          try {
            const productRef = doc(db, 'products', item.productId);
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
              const productData = productSnap.data() as Product;
              const currentStock = Number(productData.stock) || 0;
              const qtyToRestore = Number(item.quantity) || 1;

              // If item was a variant, also restore variant stock
              if (item.variantId && Array.isArray(productData.variants)) {
                const updatedVariants = productData.variants.map((v) => {
                  if (v.id === item.variantId) {
                    return { ...v, stock: (Number(v.stock) || 0) + qtyToRestore };
                  }
                  return v;
                });
                await updateDoc(productRef, {
                  stock: currentStock + qtyToRestore,
                  variants: updatedVariants,
                });
              } else {
                await updateDoc(productRef, {
                  stock: currentStock + qtyToRestore,
                });
              }
            }
          } catch (stockErr) {
            console.error('Error restoring stock for product:', item.productId, stockErr);
          }
        }
      }

      // 3. Dispatch order cancellation email
      sendOrderCancelledNotification({
        order: orderData,
        reason,
      }).catch((err) =>
        console.error('[Notification] Failed to send order cancelled email:', err)
      );

      return { orderId, status: 'Cancelled' };
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['my-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ]);
    },
  });
}


