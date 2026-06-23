export type NotificationType =
  | 'FRIEND_REQUEST'
  | 'FRIEND_REQUEST_ACCEPTED'
  | 'FRIEND_REQUEST_REJECTED';

/** Shape of the payload the backend emits over the `newNotification` socket event. */
export type NotificationPayload = {
  type: NotificationType;
  message: string;
  sender: string;
};

/**
 * A transient, informational notification (someone accepted/declined your request).
 * Unlike pending requests, these aren't backed by an API list — they live in memory
 * until dismissed or the page reloads.
 */
export type ActivityItem = {
  id: string;
  type: 'FRIEND_REQUEST_ACCEPTED' | 'FRIEND_REQUEST_REJECTED';
  text: string;
  createdAt: string;
};
