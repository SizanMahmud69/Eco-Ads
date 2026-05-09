import * as React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, limit, updateDoc, increment } from 'firebase/firestore';
import { toast } from 'sonner';

import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, username: string, phone: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  updateActivity: () => Promise<void>;
  checkVerificationStatus: () => Promise<void>;
  verifyOTP: (otp: string) => Promise<boolean>;
  resendOTP: () => Promise<void>;
  isAdmin: boolean;
  showReferralPopup: boolean;
  setShowReferralPopup: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReferralPopup, setShowReferralPopup] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'game_points'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      }
    });
    return () => unsubSettings();
  }, []);

  // Background listener for automatic referral reward claiming
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'referral_rewards'),
      where('referrerId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) return;

      for (const rewardDoc of snapshot.docs) {
        const reward = rewardDoc.data();
        try {
          // 1. Mark reward as claimed FIRST to prevent race conditions
          await updateDoc(rewardDoc.ref, { status: 'claimed' });
          
          // 2. Update referrer's points
          await updateDoc(doc(db, 'users', user.uid), {
            points: increment(reward.bonusAmount),
            referral_bonus_earned: increment(reward.bonusAmount)
          });

          // 3. Send Notification
          await addDoc(collection(db, 'notifications'), {
            userId: user.uid,
            title: 'Auto Referral Bonus Received! 🎁',
            message: `You earned ${reward.bonusAmount} points as ${reward.referredUsername} reached 1000 points!`,
            type: 'success',
            link: '/refer',
            read: false,
            created_at: new Date().toISOString()
          });

          toast.success(`You earned ${reward.bonusAmount} referral points!`, { icon: '🎁' });
        } catch (error) {
          console.error("Error auto-claiming referral reward:", error);
        }
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

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
                  watch_ads: 0,
                  eco_scan: 0
                },
                last_play_reset_at: today,
                profile_health: 100
              }, { merge: true });
              return; // The snapshot will trigger again after this update
            }

            // Merge email from Auth into the user state for app-wide compatibility
            setUser({ 
              ...userData, 
              email: firebaseUser.email || '',
              is_verified: userData.is_verified === true || firebaseUser.emailVerified === true
            });

            // Check for referral milestone (1000 points)
            if (userData.points >= 1000 && userData.referred_by && !userData.referral_milestone_rewarded) {
              try {
                // Find the referrer by their referral code
                const referrersQuery = query(collection(db, 'users'), where('referral_code', '==', userData.referred_by), limit(1));
                const referrerSnap = await getDocs(referrersQuery);
                
                if (!referrerSnap.empty) {
                  const referrerDoc = referrerSnap.docs[0];
                  
                  // Create a reward claim
                  // Note: We use 'pending' here, and the referrer's app will automatically claim it
                  await addDoc(collection(db, 'referral_rewards'), {
                    referrerId: referrerDoc.id,
                    referredId: userData.uid,
                    referredUsername: userData.username,
                    bonusAmount: settings?.referral_bonus || 500,
                    status: 'pending',
                    created_at: new Date().toISOString()
                  });

                  // Mark as rewarded so we don't create multiple requests
                  await updateDoc(userRef, { referral_milestone_rewarded: true });
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
              is_verified: true, // Google users are already verified
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
                watch_ads: 0,
                eco_scan: 0
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

  const registerWithEmail = async (email: string, pass: string, username: string, phone: string, referralCode?: string) => {
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, pass);
      const userRef = doc(db, 'users', firebaseUser.uid);
      
      const newUser: any = {
        uid: firebaseUser.uid,
        username: username,
        phone: phone,
        is_verified: false,
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
          watch_ads: 0,
          eco_scan: 0
        },
        last_play_reset_at: new Date().toISOString().split('T')[0],
        profile_health: 100
      };
      
      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Write public data to 'users' and private data to 'users_private'
      try {
        await Promise.all([
          setDoc(userRef, newUser),
          setDoc(doc(db, 'users_private', firebaseUser.uid), { 
            email: email,
            otp: otp,
            otp_created_at: new Date().toISOString()
          })
        ]);
      } catch (dbError) {
        console.error("Database error during registration:", dbError);
        handleFirestoreError(dbError, OperationType.CREATE, `users/${firebaseUser.uid}`);
      }

      // Send OTP via backend
      try {
        const response = await fetch('/api/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp, username })
        });
        
        if (response.ok) {
          toast.success('Verification code sent to your email!');
        } else {
          const errorData = await response.json();
          console.error("OTP send failed:", errorData);
          toast.error(errorData.error || 'Failed to send verification email. You can try resending from the verification page.');
        }
      } catch (e) {
        console.error("Failed to send OTP email:", e);
        toast.error('Account created, but failed to send verification email. Please try resending from the verification page.');
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

  const updateActivity = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        last_active_at: serverTimestamp()
      });
    } catch (error) {
      // Silently fail to avoid disrupting user experience
      console.warn("Activity update failed", error);
    }
  };

  const checkVerificationStatus = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      const updatedUser = auth.currentUser;
      if (user) {
        setUser({ ...user, is_verified: updatedUser.emailVerified });
      }
    }
  };

  const verifyOTP = async (otp: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const privateRef = doc(db, 'users_private', user.uid);
      const privateSnap = await getDoc(privateRef);
      if (privateSnap.exists()) {
        const data = privateSnap.data();
        if (data.otp === otp) {
          // Mark as verified
          await updateDoc(doc(db, 'users', user.uid), {
            is_verified: true
          });
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("OTP verification error:", error);
      return false;
    }
  };

  const resendOTP = async () => {
    if (!user) return;
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await updateDoc(doc(db, 'users_private', user.uid), {
        otp: otp,
        otp_created_at: new Date().toISOString()
      });
      
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, otp, username: user.username })
      });
      
      if (response.ok) {
        toast.success('New code sent!');
      } else {
        const errorData = await response.json();
        console.error("Resend OTP failed:", errorData);
        toast.error(errorData.error || 'Failed to send new code');
      }
    } catch (error) {
      console.error("Resend OTP error:", error);
      handleFirestoreError(error, OperationType.UPDATE, `users_private/${user.uid}`);
    }
  };

  const isAdmin = user?.email === 'pabnamart.contact@gmail.com' || user?.email === 'admin@ecoads.com' || user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      loginWithGoogle, 
      loginWithEmail, 
      registerWithEmail, 
      logout, 
      updateUser, 
      updateActivity,
      checkVerificationStatus,
      verifyOTP,
      resendOTP,
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
