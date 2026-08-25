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
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updateProfile,
  sendEmailVerification,
  type User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Awaited<ReturnType<typeof signInWithEmailAndPassword>>>;
  register: (
    email: string,
    password: string,
    name: string
  ) => Promise<Awaited<ReturnType<typeof createUserWithEmailAndPassword>>>;
  logout: () => Promise<void>;
  updateAccount: (data: {
    name: string;
    email: string;
  }) => Promise<void>;
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
        signInWithEmailAndPassword(auth, email, password),
      register: async (email, password, name) => {
        const result = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        await updateProfile(result.user, {
          displayName: name.trim(),
        });

        setUser(auth.currentUser);
        return result;
      },
      logout: async () => {
        await signOut(auth);
        setUser(null);
      },

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
