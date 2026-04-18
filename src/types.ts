export interface User {
  uid: string;
  email: string;
  displayName: string;
  points: number;
  isPremium: boolean;
  createdAt: string;
  lastSpinAt?: string;
  lastScratchAt?: string;
  lastDailyCheckIn?: string;
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
