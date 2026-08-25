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

export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  phone: string;
  address: UserAddress;
  role: 'customer' | 'admin';
  createdAt?: unknown;
  updatedAt?: unknown;
};

const emptyAddress: UserAddress = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: ''
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
        ...snapshot.data()
      } as UserProfile;
    }
  });
}

export type EditableCustomerProfile = {
  name: string;
  email: string;
  phone: string;
  address: UserAddress;
};

export function useSaveUserProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      profile: EditableCustomerProfile
    ) => {
      if (!user) {
        throw new Error('You must be logged in.');
      }

      const ref = doc(db, 'users', user.uid);
      const existing = await getDoc(ref);

      await setDoc(
        ref,
        {
          ...profile,
          uid: user.uid,
          role: existing.exists()
            ? existing.data().role || 'customer'
            : 'customer',
          updatedAt: serverTimestamp(),
          ...(existing.exists()
            ? {}
            : { createdAt: serverTimestamp() })
        },
        { merge: true }
      );

      return {
        uid: user.uid,
        ...profile
      };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['userProfile', user?.uid]
      });
    }
  });
}

export { emptyAddress };