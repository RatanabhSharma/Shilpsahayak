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
  address: UserAddress;
  addressHistory?: AddressHistoryItem[];
  role: 'customer' | 'admin';
  createdAt?: unknown;
  updatedAt?: unknown;
};

const emptyAddress: UserAddress = {
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

      return {
        uid: user.uid,
        ...snapshot.data(),
      } as UserProfile;
    },
  });
}

export type EditableCustomerProfile = {
  name: string;
  email: string;
  phone: string;
  address: UserAddress;
  addressHistory?: AddressHistoryItem[];
};

export function useSaveUserProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: EditableCustomerProfile) => {
      if (!user) {
        throw new Error('You must be logged in.');
      }

      const ref = doc(db, 'users', user.uid);
      const existing = await getDoc(ref);
      const existingData = existing.exists() ? existing.data() : null;

      let history: AddressHistoryItem[] =
        profile.addressHistory ||
        (Array.isArray(existingData?.addressHistory)
          ? (existingData?.addressHistory as AddressHistoryItem[])
          : []);

      if (existingData?.address?.line1 && existingData?.address?.city) {
        const oldAddr = existingData.address as UserAddress;
        const newAddr = profile.address;
        const isDifferent =
          oldAddr.line1 !== newAddr.line1 ||
          oldAddr.line2 !== newAddr.line2 ||
          oldAddr.city !== newAddr.city ||
          oldAddr.state !== newAddr.state ||
          oldAddr.pincode !== newAddr.pincode;

        if (isDifferent && !profile.addressHistory) {
          const newHistoryItem: AddressHistoryItem = {
            id: `addr-${Date.now()}`,
            address: { ...oldAddr },
            updatedAt: new Date().toISOString(),
            label: `${oldAddr.city}, ${oldAddr.state}`,
          };
          history = [newHistoryItem, ...history.slice(0, 9)];
        }
      }

      await setDoc(
        ref,
        {
          ...profile,
          addressHistory: history,
          uid: user.uid,
          role: existingData?.role || 'customer',
          updatedAt: serverTimestamp(),
          ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
        },
        { merge: true }
      );

      return {
        uid: user.uid,
        ...profile,
        addressHistory: history,
      };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['userProfile', user?.uid],
      });
    },
  });
}

export { emptyAddress };