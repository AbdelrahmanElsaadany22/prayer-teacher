/** One row in the admin's user list. */
export type AdminUserRow = {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string | null;
  role: 'user' | 'admin';
  isVerified: boolean;
  /** Certified by an admin for their Al-Fatiha recitation. */
  fatihaIjazah: boolean;
  /** Average accuracy across every session; 0 when the user has never prayed. */
  accuracy: number;
  totalPrayers: number;
  createdAt: string;
};

export type AdminUsersPage = {
  data: AdminUserRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type AdminSession = {
  _id: string;
  prayerName: string;
  rakas: number;
  accuracy: number;
  duration: string;
  mistakes: number;
  mistakeDetails: Record<string, { stepLabel: string; count: number }>;
  createdAt: string;
};

export type AdminPrayerBreakdown = {
  prayerName: string;
  count: number;
  avgAccuracy: number;
  totalMistakes: number;
};

/** Everything the admin sees on one user's page. */
export type AdminUserDashboard = {
  user: {
    _id: string;
    name: string;
    email: string;
    profilePicture?: string | null;
    role: 'user' | 'admin';
    isVerified: boolean;
    createdAt: string;
    friendsCount: number;
    fatihaIjazah: boolean;
    fatihaIjazahAt: string | null;
  };
  stats: {
    totalPrayers: number;
    avgAccuracy: number;
    totalMistakes: number;
  };
  perPrayer: AdminPrayerBreakdown[];
  sessions: AdminSession[];
};
