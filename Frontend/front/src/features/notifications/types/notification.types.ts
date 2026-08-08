export type NotificationType =
  | 'FRIEND_REQUEST'
  | 'FRIEND_REQUEST_ACCEPTED'
  | 'FRIEND_REQUEST_REJECTED'
  | 'NEW_MESSAGE'
  | 'IJAZAH_GRANTED'
  | 'IJAZAH_REVOKED';

export type NotificationPayload = {
  type: NotificationType;
  message: string;
  sender: string;
};

export type ActivityItem = {
  id: string;
  type:
    | 'FRIEND_REQUEST_ACCEPTED'
    | 'FRIEND_REQUEST_REJECTED'
    | 'IJAZAH_GRANTED'
    | 'IJAZAH_REVOKED';
  senderName: string;
  createdAt: string;
};

/**
 * Unread-message notification, derived from the server's unread counts so it
 * survives logout/offline — the bell shows one entry per friend who messaged.
 */
export type MessageNotif = {
  senderId: string;
  senderName: string;
  count: number;
};
