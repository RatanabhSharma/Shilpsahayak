import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updateProfile,
  type User,
} from 'firebase/auth';

import {
  doc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { auth, db } from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<
    Awaited<
      ReturnType<typeof signInWithEmailAndPassword>
    >
  >;

  register: (
    email: string,
    password: string,
    name: string,
    phone: string
  ) => Promise<
    Awaited<
      ReturnType<typeof createUserWithEmailAndPassword>
    >
  >;

  resetPassword: (
    email: string
  ) => Promise<void>;

  logout: () => Promise<void>;

  updateAccount: (data: {
    name: string;
    email: string;
  }) => Promise<void>;

  isLoggedIn: boolean;
}

const AuthContext =
  createContext<AuthContextValue | undefined>(
    undefined
  );

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] =
    useState<User | null>(() => auth.currentUser);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        if (!mounted) return;

        setUser(currentUser);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,

      // --------------------------------------------------
      // LOGIN
      // --------------------------------------------------
      login: (email, password) =>
        signInWithEmailAndPassword(
          auth,
          email.trim().toLowerCase(),
          password
        ),

      // --------------------------------------------------
      // REGISTER
      // --------------------------------------------------
      register: async (
        email,
        password,
        name,
        phone
      ) => {
        const cleanEmail = email
          .trim()
          .toLowerCase();

        const cleanName = name.trim();

        const cleanPhone = phone
          .replace(/\D/g, '')
          .slice(0, 10);

        if (cleanName.length < 2) {
          throw new Error(
            'Please enter your full name.'
          );
        }

        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            cleanEmail
          )
        ) {
          throw new Error(
            'Please enter a valid email address.'
          );
        }

        if (
          !/^[6-9]\d{9}$/.test(cleanPhone)
        ) {
          throw new Error(
            'Please enter a valid 10-digit Indian mobile number.'
          );
        }

        const result =
          await createUserWithEmailAndPassword(
            auth,
            cleanEmail,
            password
          );

        // Update Firebase Authentication profile.
        await updateProfile(result.user, {
          displayName: cleanName,
        });

        // Create the customer's Firestore profile.
        await setDoc(
          doc(db, 'users', result.user.uid),
          {
            uid: result.user.uid,
            name: cleanName,
            email:
              result.user.email ||
              cleanEmail,
            phone: cleanPhone,

            address: {
              line1: '',
              line2: '',
              city: '',
              state: '',
              pincode: '',
            },

            role: 'customer',

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          {
            merge: true,
          }
        );

        // Keep React state synchronized.
        setUser(auth.currentUser);

        return result;
      },

      // --------------------------------------------------
      // FORGOT PASSWORD
      // --------------------------------------------------
      resetPassword: async (email) => {
        const cleanEmail = email
          .trim()
          .toLowerCase();

        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            cleanEmail
          )
        ) {
          throw new Error(
            'Please enter a valid email address.'
          );
        }

        await sendPasswordResetEmail(
          auth,
          cleanEmail
        );
      },

      // --------------------------------------------------
      // LOGOUT
      // --------------------------------------------------
      logout: async () => {
        await signOut(auth);
        setUser(null);
      },

      // --------------------------------------------------
      // UPDATE ACCOUNT
      // --------------------------------------------------
      updateAccount: async ({
        name,
        email,
      }) => {
        const currentUser =
          auth.currentUser;

        if (!currentUser) {
          throw new Error(
            'You must be logged in.'
          );
        }

        const cleanName = name.trim();

        const cleanEmail = email
          .trim()
          .toLowerCase();

        if (cleanName.length < 2) {
          throw new Error(
            'Please enter your full name.'
          );
        }

        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            cleanEmail
          )
        ) {
          throw new Error(
            'Please enter a valid email address.'
          );
        }

        // Update Firebase Authentication email.
        if (
          currentUser.email !== cleanEmail
        ) {
          await updateEmail(
            currentUser,
            cleanEmail
          );

          await sendEmailVerification(
            currentUser
          );
        }

        // Update Firebase Authentication name.
        await updateProfile(currentUser, {
          displayName: cleanName,
        });

        // Keep React state synchronized.
        setUser(auth.currentUser);
      },

      isLoggedIn: !!user,
    }),
    [loading, user]
  );

  return createElement(
    AuthContext.Provider,
    { value },
    children
  );
}

export function useAuth(): AuthContextValue {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside an AuthProvider.'
    );
  }

  return context;
}