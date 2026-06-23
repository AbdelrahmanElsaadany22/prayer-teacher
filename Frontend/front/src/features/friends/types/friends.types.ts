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

export type FriendProfile = {
  _id: string;
  name: string;
  email: string;
};

export type UserFull = {
  _id: string;
  name: string;
  email: string;
  friends: string[];
};
