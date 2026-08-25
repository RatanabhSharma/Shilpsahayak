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
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<Awaited<ReturnType<typeof signInWithEmailAndPassword>>>;
  register: (
    email: string,
    password: string,
    name: string,
    phone: string
  ) => Promise<Awaited<ReturnType<typeof createUserWithEmailAndPassword>>>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoggedIn: boolean;
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

      login: (email, password) =>
        signInWithEmailAndPassword(auth, email.trim(), password),

      register: async (email, password, name, phone) => {
        const result = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

        const cleanName = name.trim();
        const cleanPhone = phone.trim();

        await updateProfile(result.user, {
          displayName: cleanName,
        });

        await setDoc(
          doc(db, 'users', result.user.uid),
          {
            uid: result.user.uid,
            name: cleanName,
            email: result.user.email || email.trim(),
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
          { merge: true }
        );

        setUser(auth.currentUser);
        return result;
      },

      resetPassword: async (email) => {
        await sendPasswordResetEmail(auth, email.trim());
      },

      logout: async () => {
        await signOut(auth);
        setUser(null);
      },

      isLoggedIn: !!user,
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
