import { createContext, useContext } from 'react';
import type { FriendRequest } from '../../friends/types/friends.types';
import type { ActivityItem } from '../types/notification.types';

export type NotificationsValue = {
  /** Pending incoming friend requests (actionable). */
  requests: FriendRequest[];
  /** Transient accepted/declined notifications. */
  activity: ActivityItem[];
  /** Badge count = pending requests + activity items. */
  count: number;
  accept: (requestId: string) => Promise<void>;
  reject: (requestId: string) => Promise<void>;
  dismiss: (id: string) => void;
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
