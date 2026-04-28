import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export interface GameSettings {
  spin_points_min: number;
  spin_points_max: number;
  scratch_points_min: number;
  scratch_points_max: number;
  math_quiz_points: number;
  word_guess_points: number;
  captcha_points: number;
  color_match_points: number;
  number_memory_points: number;
  referral_bonus: number;
  points_per_bdt: number;
  min_withdrawal: number;
  daily_game_limit: number;
  daily_point_limit: number;
  spin_cooldown: number;
  scratch_cooldown: number;
  maintenance_mode: boolean;
  maintenance_message?: string;
  maintenance_duration?: number;
  maintenance_start_at?: string;
  // Ad Codes
  ad_popunder?: string;
  ad_social_bar?: string;
  ad_banner_728x90?: string;
  ad_banner_468x60?: string;
  ad_banner_320x50?: string;
  ad_banner_160x600?: string;
  ad_square_300x250?: string;
  ad_native_top?: string;
  ad_native_bottom?: string;
  clickadilla_banner?: string;
  clickadilla_popunder?: string;
  clickadilla_native?: string;
  clickadilla_instream?: string;
  watch_ads_points: number;
  watch_ads_cooldown: number;
  registrations_enabled: boolean;
  bkash_number: string;
  nagad_number: string;
  rocket_number: string;
}

const defaultSettings: GameSettings = {
  spin_points_min: 10,
  spin_points_max: 100,
  scratch_points_min: 5,
  scratch_points_max: 50,
  math_quiz_points: 2,
  word_guess_points: 10,
  captcha_points: 5,
  color_match_points: 5,
  number_memory_points: 10,
  referral_bonus: 500,
  points_per_bdt: 1000,
  min_withdrawal: 5000,
  daily_game_limit: 3,
  daily_point_limit: 2000,
  spin_cooldown: 60,
  scratch_cooldown: 30,
  maintenance_mode: false,
  ad_popunder: '',
  ad_social_bar: '',
  ad_banner_728x90: '',
  ad_banner_468x60: '',
  ad_banner_320x50: '',
  ad_banner_160x600: '',
  ad_square_300x250: '',
  ad_native_top: '',
  ad_native_bottom: '',
  clickadilla_banner: '',
  clickadilla_popunder: '',
  clickadilla_native: '',
  clickadilla_instream: '',
  watch_ads_points: 20,
  watch_ads_cooldown: 5,
  registrations_enabled: true,
  bkash_number: '01700000000',
  nagad_number: '01700000000',
  rocket_number: '01700000000'
};

export const useGameSettings = () => {
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'game_points'), (snapshot) => {
      try {
        if (snapshot.exists()) {
          setSettings({ ...defaultSettings, ...snapshot.data() });
        }
      } catch (err) {
        console.error("Error processing settings snapshot:", err);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error("Error listening to settings:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { settings, loading };
};
