import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export type UserAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
};

export type AddressHistoryItem = {
  id: string;
  address: UserAddress;
  updatedAt: string;
  label?: string;
};

export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  phone: string;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  address: UserAddress;
  addressHistory?: AddressHistoryItem[];
  role: 'customer' | 'admin';
  companyName?: string;
  gstin?: string;
  adminNotes?: string;
  customerType?: 'Retail' | 'Corporate' | 'Custom Printing' | string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export const emptyAddress: UserAddress = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
};

export function useUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['userProfile', user?.uid],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;

      const ref = doc(db, 'users', user.uid);
      const snapshot = await getDoc(ref);

      if (!snapshot.exists()) {
        return null;
      }

      const data = snapshot.data();
      const profile: UserProfile = {
        uid: user.uid,
        name: data.name || user.displayName || '',
        email: data.email || user.email || '',
        phone: data.phone || user.phoneNumber || '',
        phoneVerified: !!data.phoneVerified || !!user.phoneNumber,
        emailVerified: !!data.emailVerified || !!user.emailVerified,
        address: data.address || emptyAddress,
        addressHistory: data.addressHistory || [],
        role: data.role === 'admin' ? 'admin' : 'customer',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };

      return profile;
    },
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      payload: Partial<
        Pick<UserProfile, 'name' | 'email' | 'phone' | 'address' | 'phoneVerified' | 'emailVerified'>
      >
    ) => {
      if (!user) {
        throw new Error('You must be signed in to update your profile.');
      }

      const ref = doc(db, 'users', user.uid);
      const updateData: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };

      if (payload.name !== undefined) updateData.name = payload.name;
      if (payload.email !== undefined) updateData.email = payload.email;
      if (payload.phone !== undefined) updateData.phone = payload.phone;
      if (payload.phoneVerified !== undefined) updateData.phoneVerified = payload.phoneVerified;
      if (payload.emailVerified !== undefined) updateData.emailVerified = payload.emailVerified;
      if (payload.address !== undefined) {
        updateData.address = payload.address;
      }

      await setDoc(ref, updateData, { merge: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['userRole', user?.uid] });
    },
  });
}

export const useSaveUserProfile = useUpdateUserProfile;

export function useAllUsers() {
  return useQuery({
    queryKey: ['allUsers'],
    queryFn: async (): Promise<UserProfile[]> => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        return snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            uid: docSnap.id,
            name: d.name || '',
            email: d.email || '',
            phone: d.phone || '',
            phoneVerified: !!d.phoneVerified,
            emailVerified: !!d.emailVerified,
            address: d.address || emptyAddress,
            addressHistory: d.addressHistory || [],
            role: d.role === 'admin' ? 'admin' : 'customer',
            companyName: d.companyName,
            gstin: d.gstin,
            adminNotes: d.adminNotes,
            customerType: d.customerType,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          };
        });
      } catch (err) {
        console.error('Failed to load all users from Firestore:', err);
        return [];
      }
    },
    staleTime: 60 * 1000,
  });
}

export function useUpdateCustomerAdminNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      uid,
      adminNotes,
      customerType,
      companyName,
      gstin,
    }: {
      uid: string;
      adminNotes?: string;
      customerType?: string;
      companyName?: string;
      gstin?: string;
    }) => {
      const ref = doc(db, 'users', uid);
      const updateData: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };
      if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
      if (customerType !== undefined) updateData.customerType = customerType;
      if (companyName !== undefined) updateData.companyName = companyName;
      if (gstin !== undefined) updateData.gstin = gstin;

      await setDoc(ref, updateData, { merge: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
  });
}



