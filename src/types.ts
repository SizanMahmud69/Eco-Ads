export interface User {
  uid: string;
  username: string;
  email: string;
  is_verified: boolean;
  points: number;
  is_premium: boolean;
  premium_expiry?: string | null;
  planId?: string | null;
  planName?: string | null;
  last_spin_at: any;
  last_scratch_at: any;
  last_daily_at: any;
  last_task_at: any;
  last_math_quiz_at?: any;
  last_captcha_at?: any;
  last_word_guess_at?: any;
  last_color_match_at?: any;
  last_number_memory_at?: any;
  last_watch_ads_at?: any;
  last_eco_scan_at?: any;
  completed_tasks?: string[];
  created_at: string;
  role?: string;
  referred_by?: string | null;
  referral_code?: string;
  referral_bonus_earned?: number;
  referrals_count?: number;
  referral_milestone_rewarded?: boolean;
  app_download_rewarded?: boolean;
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
    eco_scan?: number;
  };
  last_play_reset_at?: string | null;
  app_downloaded?: boolean;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amountPoints: number;
  amountBDT: number;
  method: 'bKash' | 'Nagad' | 'Rocket';
  accountNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  pointsReward: number;
  type: 'daily' | 'one-time';
}

export interface UserTask {
  id: string;
  userId: string;
  taskId: string;
  completedAt: string;
}

export interface AppConfig {
  pointsPerBDT: number;
  minWithdrawalPoints: number;
  spinPointsRange: { min: number; max: number };
  scratchPointsRange: { min: number; max: number };
}
