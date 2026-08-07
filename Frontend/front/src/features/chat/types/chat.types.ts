export type Message = {
  _id: string;
  sender: string;
  receiver: string;
  message: string;
  seen: boolean;
  createdAt: string;
  /** Older messages predate this field — absent means a typed message. */
  type?: 'text' | 'audio';
  audioUrl?: string | null;
};

/** The admin a learner sends their Fatiha recitation to. */
export type ChatAdmin = {
  _id: string;
  name: string;
  profilePicture?: string | null;
};

/** One row of the admin's inbox. */
export type Conversation = {
  userId: string;
  name: string;
  profilePicture?: string | null;
  lastMessage: string;
  lastType: 'text' | 'audio';
  lastAt: string;
  unread: number;
};
