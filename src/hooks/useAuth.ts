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
  signInWithPhoneNumber,
  GoogleAuthProvider,
  OAuthProvider,
  RecaptchaVerifier,
  signOut,
  updateEmail,
  updateProfile,
  type User,
  type ConfirmationResult,
  type UserCredential,
} from 'firebase/auth';

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { auth, db } from '../lib/firebase';

/* Extended window interface for Firebase RecaptchaVerifier */
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isLoggedIn: boolean;

  /* Email & Password Methods */
  login: (email: string, password: string) => Promise<UserCredential>;
  register: (
    email: string,
    password: string,
    name: string,
    phone: string,
    isPhonePreVerified?: boolean
  ) => Promise<UserCredential>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;

  /* Social Auth Methods */
  signInWithGoogle: () => Promise<UserCredential>;
  signInWithMicrosoft: () => Promise<UserCredential>;

  /* Phone SMS OTP Auth Methods */
  sendPhoneOtp: (phoneNumber: string, containerId?: string) => Promise<ConfirmationResult>;
  verifyPhoneOtp: (
    confirmationResult: ConfirmationResult,
    otpCode: string,
    userData?: { name?: string; email?: string }
  ) => Promise<UserCredential>;
  verifyAndLinkPhoneForUser: (
    confirmationResult: ConfirmationResult,
    otpCode: string,
    phoneNumber: string
  ) => Promise<void>;

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

      // --------------------------------------------------
      // EMAIL / PASSWORD LOGIN
      // --------------------------------------------------
      login: (email, password) =>
        signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password),

      // --------------------------------------------------
      // REGISTRATION (WITH OPTIONAL DUAL VERIFICATION SYNC)
      // --------------------------------------------------
      register: async (email, password, name, phone, isPhonePreVerified = false) => {
        const cleanEmail = email.trim().toLowerCase();
        const cleanName = name.trim();
        const cleanPhone = phone.replace(/\D/g, '').slice(-10);

        if (cleanName.length < 2) {
          throw new Error('Please enter your full name.');
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          throw new Error('Please enter a valid email address.');
        }

        if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
          throw new Error('Please enter a valid 10-digit Indian mobile number.');
        }

        const result = await createUserWithEmailAndPassword(auth, cleanEmail, password);

        // Update Firebase Authentication display name
        await updateProfile(result.user, {
          displayName: cleanName,
        });

        // Automatically dispatch Email Verification link to customer inbox
        try {
          await sendEmailVerification(result.user);
        } catch {
          // If sending email fails, do not block registration
        }

        // Create user document in Firestore with verification flags
        await setDoc(
          doc(db, 'users', result.user.uid),
          {
            uid: result.user.uid,
            name: cleanName,
            email: result.user.email || cleanEmail,
            phone: cleanPhone,
            phoneVerified: isPhonePreVerified,
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
              phoneVerified: !!result.user.phoneNumber,
              emailVerified: true,
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
              phoneVerified: !!result.user.phoneNumber,
              emailVerified: true,
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
      // SEND PHONE SMS OTP (CLEAN INVISIBLE RECAPTCHA LIFECYCLE)
      // --------------------------------------------------
      sendPhoneOtp: async (phoneNumber: string, containerId: string = 'auth-recaptcha-container') => {
        const cleanDigits = phoneNumber.replace(/\D/g, '');
        const last10 = cleanDigits.slice(-10);

        if (!/^[6-9]\d{9}$/.test(last10)) {
          throw new Error('Please enter a valid 10-digit Indian mobile number.');
        }

        const formattedPhone = `+91${last10}`;

        if (typeof window !== 'undefined') {
          // Clear any existing verifier and DOM container to prevent "already rendered" collision
          if (window.recaptchaVerifier) {
            try {
              window.recaptchaVerifier.clear();
            } catch {
              // Ignore cleanup error
            }
            window.recaptchaVerifier = undefined;
          }

          const container = document.getElementById(containerId);
          if (container) {
            container.innerHTML = '';
          }

          window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
            size: 'invisible',
            callback: () => {
              // reCAPTCHA solved automatically in background
            },
            'expired-callback': () => {
              if (window.recaptchaVerifier) {
                try {
                  window.recaptchaVerifier.clear();
                } catch {
                  // ignore
                }
                window.recaptchaVerifier = undefined;
              }
            },
          });
        }

        const appVerifier = window.recaptchaVerifier;
        if (!appVerifier) {
          throw new Error('Verification service could not be initialized.');
        }

        const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
        window.confirmationResult = confirmationResult;
        return confirmationResult;
      },

      // --------------------------------------------------
      // VERIFY PHONE SMS OTP & LOG IN / REGISTER
      // --------------------------------------------------
      verifyPhoneOtp: async (confirmationResult, otpCode, userData) => {
        const cleanCode = otpCode.trim();
        if (!/^\d{6}$/.test(cleanCode)) {
          throw new Error('Please enter the 6-digit OTP code sent to your phone.');
        }

        const result = await confirmationResult.confirm(cleanCode);
        const signedInUser = result.user;

        const userRef = doc(db, 'users', signedInUser.uid);
        const snap = await getDoc(userRef);
        const existingData = snap.exists() ? snap.data() : {};

        const cleanName = userData?.name?.trim() || existingData.name || signedInUser.displayName || 'Customer';
        const cleanEmail = userData?.email?.trim().toLowerCase() || existingData.email || signedInUser.email || '';

        await setDoc(
          userRef,
          {
            uid: signedInUser.uid,
            name: cleanName,
            email: cleanEmail,
            phone: signedInUser.phoneNumber || existingData.phone || '',
            phoneVerified: true,
            emailVerified: signedInUser.emailVerified || !!existingData.emailVerified,
            role: existingData.role || 'customer',
            address: existingData.address || { line1: '', line2: '', city: '', state: '', pincode: '' },
            updatedAt: serverTimestamp(),
            ...(snap.exists() ? {} : { createdAt: serverTimestamp() }),
          },
          { merge: true }
        );

        if (cleanName && cleanName !== 'Customer' && !signedInUser.displayName) {
          try {
            await updateProfile(signedInUser, { displayName: cleanName });
          } catch {
            // Ignore profile update error
          }
        }

        setUser(auth.currentUser);
        return result;
      },

      // --------------------------------------------------
      // VERIFY & LINK PHONE FOR EXISTING LOGGED-IN USER
      // --------------------------------------------------
      verifyAndLinkPhoneForUser: async (confirmationResult, otpCode, phoneNumber) => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error('You must be signed in to verify your phone number.');
        }

        const cleanCode = otpCode.trim();
        if (!/^\d{6}$/.test(cleanCode)) {
          throw new Error('Please enter the 6-digit OTP code sent to your phone.');
        }

        await confirmationResult.confirm(cleanCode);

        const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
        const userRef = doc(db, 'users', currentUser.uid);

        await setDoc(
          userRef,
          {
            phone: cleanPhone,
            phoneVerified: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        setUser(auth.currentUser);
      },

      // --------------------------------------------------
      // DISPATCH EMAIL VERIFICATION
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