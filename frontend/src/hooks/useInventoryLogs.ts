import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export type InventoryAdjustmentReason =
  | 'Finished Batch Print Run'
  | 'Manual Restock'
  | 'Damaged / QC Scrap'
  | 'Inventory Audit Recount'
  | 'Customer Return / Exchange'
  | 'Loss / Expired Scrap'
  | 'Other Adjustment';

export interface InventoryLog {
  id: string;
  productId: string;
  productName: string;
  sku?: string;
  previousStock: number;
  newStock: number;
  delta: number;
  reason: InventoryAdjustmentReason | string;
  notes?: string;
  adminEmail: string;
  adminUid?: string;
  timestamp: string;
}

export interface AdjustStockParams {
  productId: string;
  productName: string;
  sku?: string;
  previousStock: number;
  newStock: number;
  reason: InventoryAdjustmentReason | string;
  notes?: string;
}

/**
 * Fetch inventory adjustment logs. Optionally filter by productId.
 */
export function useInventoryLogs(productId?: string) {
  return useQuery({
    queryKey: ['inventory_logs', productId || 'ALL'],
    queryFn: async (): Promise<InventoryLog[]> => {
      try {
        let q;
        if (productId) {
          q = query(
            collection(db, 'inventory_logs'),
            where('productId', '==', productId),
            orderBy('timestamp', 'desc'),
            limit(50)
          );
        } else {
          q = query(
            collection(db, 'inventory_logs'),
            orderBy('timestamp', 'desc'),
            limit(100)
          );
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as InventoryLog[];
      } catch (err) {
        // In case composite index is still building or missing, fallback to client sort
        console.warn('Fallback inventory log fetch:', err);
        const snapshot = await getDocs(collection(db, 'inventory_logs'));
        const all = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as InventoryLog[];

        const filtered = productId
          ? all.filter((l) => l.productId === productId)
          : all;

        return filtered.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      }
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Adjusts product stock and writes an immutable audit ledger entry.
 */
export function useAdjustStock() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      productId,
      productName,
      sku,
      previousStock,
      newStock,
      reason,
      notes,
    }: AdjustStockParams) => {
      const delta = newStock - previousStock;
      const timestamp = new Date().toISOString();
      const adminEmail = user?.email || 'admin@shilpsahayak.in';
      const adminUid = user?.uid || 'admin';

      // 1. Update Product Stock in Firestore
      await updateDoc(doc(db, 'products', productId), {
        stock: newStock,
        updatedAt: timestamp,
      });

      // 2. Write Audit Ledger Entry
      const logPayload: Omit<InventoryLog, 'id'> = {
        productId,
        productName,
        sku: sku || undefined,
        previousStock,
        newStock,
        delta,
        reason,
        notes: notes?.trim() || undefined,
        adminEmail,
        adminUid,
        timestamp,
      };

      const docRef = await addDoc(collection(db, 'inventory_logs'), logPayload);

      return {
        id: docRef.id,
        ...logPayload,
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_logs'] });
      queryClient.invalidateQueries({
        queryKey: ['inventory_logs', variables.productId],
      });
    },
  });
}

