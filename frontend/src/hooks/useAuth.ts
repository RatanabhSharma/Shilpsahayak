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
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  updateEmail,
  updateProfile,
  type User,
  type UserCredential,
} from 'firebase/auth';

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { auth, db } from '../lib/firebase';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isLoggedIn: boolean;
  isEmailVerified: boolean;

  /* Email & Password Methods */
  login: (email: string, password: string) => Promise<UserCredential>;
  register: (
    email: string,
    password: string,
    name: string,
    phone?: string
  ) => Promise<UserCredential>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<User | null>;

  /* Social Auth Methods */
  signInWithGoogle: () => Promise<UserCredential>;
  signInWithMicrosoft: () => Promise<UserCredential>;

  /* Account Management */
  logout: () => Promise<void>;
  updateAccount: (data: { name: string; email: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!mounted) return;
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isLoggedIn: !!user,
      isEmailVerified: !!user?.emailVerified,

      // --------------------------------------------------
      // RELOAD USER (Checks emailVerified in real-time)
      // --------------------------------------------------
      reloadUser: async () => {
        if (auth.currentUser) {
          await auth.currentUser.reload();
          setUser({ ...auth.currentUser });
          return auth.currentUser;
        }
        return null;
      },

      // --------------------------------------------------
      // EMAIL / PASSWORD LOGIN
      // --------------------------------------------------
      login: (email, password) =>
        signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password),

      // --------------------------------------------------
      // REGISTRATION WITH OFFICIAL FIREBASE EMAIL VERIFICATION
      // --------------------------------------------------
      register: async (email, password, name, phone?: string) => {
        const cleanEmail = email.trim().toLowerCase();
        const cleanName = name.trim();
        const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';

        if (cleanName.length < 2) {
          throw new Error('Please enter your full name.');
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          throw new Error('Please enter a valid email address.');
        }

        if (cleanPhone && !/^[6-9]\d{9}$/.test(cleanPhone)) {
          throw new Error('Please enter a valid 10-digit Indian mobile number.');
        }

        const result = await createUserWithEmailAndPassword(auth, cleanEmail, password);

        // Update Firebase Authentication display name
        await updateProfile(result.user, {
          displayName: cleanName,
        });

        // Automatically dispatch Official Firebase Email Verification link
        try {
          await sendEmailVerification(result.user);
        } catch {
          // If sending email link fails, do not block registration
        }

        // Create user document in Firestore with customer profile info
        await setDoc(
          doc(db, 'users', result.user.uid),
          {
            uid: result.user.uid,
            name: cleanName,
            email: result.user.email || cleanEmail,
            phone: cleanPhone,
            emailVerified: false,
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
          { merge: true }
        );

        setUser(auth.currentUser);
        return result;
      },

      // --------------------------------------------------
      // GOOGLE 1-CLICK AUTH
      // --------------------------------------------------
      signInWithGoogle: async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await signInWithPopup(auth, provider);

        const userRef = doc(db, 'users', result.user.uid);
        const snapshot = await getDoc(userRef);

        if (!snapshot.exists()) {
          await setDoc(
            userRef,
            {
              uid: result.user.uid,
              name: result.user.displayName || 'Customer',
              email: result.user.email || '',
              phone: result.user.phoneNumber || '',
              emailVerified: true, // Google accounts have pre-verified emails
              role: 'customer',
              address: { line1: '', line2: '', city: '', state: '', pincode: '' },
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        setUser(result.user);
        return result;
      },

      // --------------------------------------------------
      // MICROSOFT 1-CLICK AUTH
      // --------------------------------------------------
      signInWithMicrosoft: async () => {
        const provider = new OAuthProvider('microsoft.com');
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await signInWithPopup(auth, provider);

        const userRef = doc(db, 'users', result.user.uid);
        const snapshot = await getDoc(userRef);

        if (!snapshot.exists()) {
          await setDoc(
            userRef,
            {
              uid: result.user.uid,
              name: result.user.displayName || 'Customer',
              email: result.user.email || '',
              phone: result.user.phoneNumber || '',
              emailVerified: true, // Microsoft accounts have pre-verified emails
              role: 'customer',
              address: { line1: '', line2: '', city: '', state: '', pincode: '' },
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        setUser(result.user);
        return result;
      },

      // --------------------------------------------------
      // DISPATCH OFFICIAL FIREBASE EMAIL VERIFICATION
      // --------------------------------------------------
      sendVerificationEmail: async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error('You must be signed in to send a verification email.');
        }
        await sendEmailVerification(currentUser);
      },

      // --------------------------------------------------
      // FORGOT PASSWORD
      // --------------------------------------------------
      resetPassword: async (email) => {
        const cleanEmail = email.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          throw new Error('Please enter a valid email address.');
        }

        await sendPasswordResetEmail(auth, cleanEmail);
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
      updateAccount: async ({ name, email }) => {
        const currentUser = auth.currentUser;

        if (!currentUser) {
          throw new Error('You must be logged in.');
        }

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (cleanName.length < 2) {
          throw new Error('Please enter your full name.');
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          throw new Error('Please enter a valid email address.');
        }

        if (currentUser.email !== cleanEmail) {
          await updateEmail(currentUser, cleanEmail);
          await sendEmailVerification(currentUser);
        }

        await updateProfile(currentUser, {
          displayName: cleanName,
        });

        setUser(auth.currentUser);
      },
    }),
    [loading, user]
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }

  return context;
}


