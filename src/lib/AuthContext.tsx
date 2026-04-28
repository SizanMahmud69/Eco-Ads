import * as React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, limit, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';

interface User {
  uid: string;
  username: string;
  email: string;
  points: number;
  is_premium: boolean;
  premium_expiry?: string | null;
  planId?: string | null;
  planName?: string | null;
  last_spin_at: string | null;
  last_scratch_at: string | null;
  last_daily_at: string | null;
  last_task_at: string | null;
  completed_tasks?: string[];
  created_at: string;
  role?: string;
  referred_by?: string | null;
  referral_code?: string;
  referral_bonus_earned?: number;
  referrals_count?: number;
  referral_milestone_rewarded?: boolean;
  multiplier?: number;
  is_frozen?: boolean;
  is_banned?: boolean;
  profile_health?: number;
  daily_plays?: {
    spin?: number;
    scratch?: number;
    math_quiz?: number;
    word_guess?: number;
    captcha?: number;
    color_match?: number;
    number_memory?: number;
    watch_ads?: number;
  };
  last_play_reset_at?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, username: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  isAdmin: boolean;
  showReferralPopup: boolean;
  setShowReferralPopup: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReferralPopup, setShowReferralPopup] = useState(false);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Cleanup previous listener if it exists
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeDoc = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as any;
            
            // Check for ban status
            if (userData.is_banned) {
              await signOut(auth);
              toast.error('Your account has been permanently banned.');
              setLoading(false);
              return;
            }

            // Check for premium expiry
            if (userData.is_premium && userData.premium_expiry) {
              const now = new Date();
              const expiryDate = new Date(userData.premium_expiry);
              if (now > expiryDate) {
                await updateDoc(userRef, {
                  is_premium: false,
                  premium_expiry: null,
                  planId: null,
                  planName: null,
                  multiplier: 1
                });
                toast.info('Your premium membership has expired and reverted to free user status.');
                return; // Snapshot will trigger again
              }
            }

            // Daily plays reset logic
            const today = new Date().toISOString().split('T')[0];
            if (userData.last_play_reset_at !== today) {
              await setDoc(userRef, {
                daily_plays: {
                  spin: 0,
                  scratch: 0,
                  math_quiz: 0,
                  word_guess: 0,
                  captcha: 0,
                  color_match: 0,
                  number_memory: 0,
                  watch_ads: 0
                },
                last_play_reset_at: today,
                profile_health: 100
              }, { merge: true });
              return; // The snapshot will trigger again after this update
            }

            // Merge email from Auth into the user state for app-wide compatibility
            setUser({ ...userData, email: firebaseUser.email || '' });

            // Check for referral milestone (1000 points)
            if (userData.points >= 1000 && userData.referred_by && !userData.referral_milestone_rewarded) {
              try {
                // Find the referrer by their referral code
                const referrersQuery = query(collection(db, 'users'), where('referral_code', '==', userData.referred_by), limit(1));
                const referrerSnap = await getDocs(referrersQuery);
                
                if (!referrerSnap.empty) {
                  const referrerDoc = referrerSnap.docs[0];
                  
                  // Create a reward claim for admin approval
                  await addDoc(collection(db, 'referral_rewards'), {
                    referrerId: referrerDoc.id,
                    referredId: userData.uid,
                    referredUsername: userData.username,
                    bonusAmount: 500, // Bonus amount
                    status: 'pending',
                    created_at: new Date().toISOString()
                  });

                  // Mark as rewarded so we don't create multiple requests
                  await setDoc(userRef, { referral_milestone_rewarded: true }, { merge: true });
                }
              } catch (error) {
                console.error("Error processing referral milestone:", error);
              }
            }
          } else {
            // New user initialization (Google)
            const newUser: any = {
              uid: firebaseUser.uid,
              username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              points: 0,
              is_premium: false,
              last_spin_at: null,
              last_scratch_at: null,
              last_daily_at: null,
              last_task_at: null,
              completed_tasks: [],
              created_at: new Date().toISOString(),
              referral_code: firebaseUser.uid.substring(0, 8).toUpperCase(),
              referred_by: null,
              referral_bonus_earned: 0,
              referrals_count: 0,
              referral_milestone_rewarded: false,
              daily_plays: {
                spin: 0,
                scratch: 0,
                math_quiz: 0,
                word_guess: 0,
                captcha: 0,
                color_match: 0,
                number_memory: 0,
                watch_ads: 0
              },
              last_play_reset_at: new Date().toISOString().split('T')[0],
              profile_health: 100
            };
            
            // Write public data to 'users' and private data to 'users_private'
            Promise.all([
              setDoc(userRef, newUser),
              setDoc(doc(db, 'users_private', firebaseUser.uid), { email: firebaseUser.email })
            ]).then(() => {
              setShowReferralPopup(true);
            }).catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}`));
          }
          setLoading(false);
        }, (error) => {
          // Only report error if we still have a user (prevents noise on logout)
          if (auth.currentUser) {
            handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      }
      console.error('Email login failed', error);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, pass: string, username: string, referralCode?: string) => {
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, pass);
      const userRef = doc(db, 'users', firebaseUser.uid);
      
      const newUser: any = {
        uid: firebaseUser.uid,
        username: username,
        points: 0,
        is_premium: false,
        last_spin_at: null,
        last_scratch_at: null,
        last_daily_at: null,
        last_task_at: null,
        completed_tasks: [],
        created_at: new Date().toISOString(),
        referral_code: firebaseUser.uid.substring(0, 8).toUpperCase(),
        referred_by: referralCode || null,
        referral_bonus_earned: 0,
        referrals_count: 0,
        referral_milestone_rewarded: false,
        daily_plays: {
          spin: 0,
          scratch: 0,
          math_quiz: 0,
          word_guess: 0,
          captcha: 0,
          color_match: 0,
          number_memory: 0,
          watch_ads: 0
        },
        last_play_reset_at: new Date().toISOString().split('T')[0],
        profile_health: 100
      };
      
      // Write public data to 'users' and private data to 'users_private'
      await Promise.all([
        setDoc(userRef, newUser),
        setDoc(doc(db, 'users_private', firebaseUser.uid), { email: email })
      ]);

      // Increment referrer's referral count
      if (referralCode) {
        try {
          const referrersQuery = query(collection(db, 'users'), where('referral_code', '==', referralCode), limit(1));
          const referrerSnap = await getDocs(referrersQuery);
          if (!referrerSnap.empty) {
            const referrerDoc = referrerSnap.docs[0];
            const currentCount = referrerDoc.data().referrals_count || 0;
            await setDoc(referrerDoc.ref, { referrals_count: currentCount + 1 }, { merge: true });
          }
        } catch (error) {
          console.error("Error incrementing referral count:", error);
        }
      }
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please sign in instead.');
      }
      if (error.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters.');
      }
      console.error('Email registration failed', error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateUser = async (data: Partial<User>) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    try {
      // Filter out undefined values
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );
      await setDoc(userRef, cleanData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const isAdmin = user?.email === 'pabnamart.contact@gmail.com' || user?.email === 'admin@ecoads.com';

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      loginWithGoogle, 
      loginWithEmail, 
      registerWithEmail, 
      logout, 
      updateUser, 
      isAdmin,
      showReferralPopup,
      setShowReferralPopup
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
