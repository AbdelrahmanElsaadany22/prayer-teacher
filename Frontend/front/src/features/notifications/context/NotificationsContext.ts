import { createContext, useContext } from 'react';
import type { FriendRequest } from '../../friends/types/friends.types';
import type { ActivityItem, MessageNotif } from '../types/notification.types';

export type NotificationsValue = {
  /** Pending incoming friend requests (actionable). */
  requests: FriendRequest[];
  /** Transient accepted/declined notifications. */
  activity: ActivityItem[];
  /** Unread-message notifications, one per friend (survives logout). */
  messages: MessageNotif[];
  /** Badge count = pending requests + activity + unread messages. */
  count: number;
  accept: (requestId: string) => Promise<void>;
  reject: (requestId: string) => Promise<void>;
  dismiss: (id: string) => void;
  /** Locally clears a friend's unread-message notification (on opening the chat). */
  dismissMessage: (senderId: string) => void;
  /** Increments on every notification event — consumers watch it to re-sync. */
  eventTick: number;
};

export const NotificationsContext = createContext<NotificationsValue | null>(null);

export function useNotifications(): NotificationsValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used inside NotificationsProvider');
  }
  return ctx;
}
