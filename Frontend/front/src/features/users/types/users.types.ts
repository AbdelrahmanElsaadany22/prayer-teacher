export type UserSearchResult = {
  _id: string;
  name: string;
  email: string;
};

/** How the signed-in viewer relates to the profile they're looking at. */
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
  /** How many prayer sessions this user has logged. */
  totalPrayers: number;
  /** Average accuracy across every session, as a percentage. */
  accuracy: number;
  /** Viewer ↔ profile relationship, so the button survives a reload. */
  relationship: Relationship;
  /** Set only when `relationship === 'incoming_pending'`. */
  requestId: string | null;
};
