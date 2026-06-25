export type NotificationType =
  | 'FRIEND_REQUEST'
  | 'FRIEND_REQUEST_ACCEPTED'
  | 'FRIEND_REQUEST_REJECTED';

export type NotificationPayload = {
  type: NotificationType;
  message: string;
  sender: string;
};

export type ActivityItem = {
  id: string;
  type: 'FRIEND_REQUEST_ACCEPTED' | 'FRIEND_REQUEST_REJECTED';
  senderName: string;
  createdAt: string;
};
