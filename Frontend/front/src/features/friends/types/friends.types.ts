export type FriendRequest = {
  _id: string;
  sender: {
    _id: string;
    name: string;
    email: string;
  };
  receiver: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
};

/**
 * A request this user sent that has since been answered, with the answer not
 * yet shown to them. The socket push only reaches whoever was connected at the
 * time, so these fill in the outcomes missed while away.
 */
export type FriendRequestOutcome = {
  _id: string;
  status: 'accepted' | 'rejected';
  receiver: { _id: string; name: string };
  updatedAt: string;
};

export type FriendProfile = {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string | null;
};

export type UserFull = {
  _id: string;
  name: string;
  email: string;
  friends: string[];
};
