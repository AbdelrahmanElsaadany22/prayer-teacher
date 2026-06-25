export type UserSearchResult = {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string | null;
};

export type Relationship =
  | 'self'
  | 'friends'
  | 'outgoing_pending'
  | 'incoming_pending'
  | 'none';

export type UserProfileWithStats = {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string | null;
  totalPrayers: number;
  accuracy: number;
  relationship: Relationship;
  requestId: string | null;
};

export type FriendComparison = {
  userId: string;
  name: string;
  isSelf: boolean;
  totalPrayers: number;
  avgAccuracy: number;
  totalMistakes: number;
  avgMistakes: number;
};
