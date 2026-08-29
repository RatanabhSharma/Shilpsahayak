import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  doc,
  getDoc,
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


