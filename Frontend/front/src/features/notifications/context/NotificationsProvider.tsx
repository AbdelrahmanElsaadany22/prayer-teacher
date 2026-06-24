import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import {
  acceptFriendRequest,
  getIncomingRequests,
  getUserProfile,
  rejectFriendRequest,
} from '../../friends/api/friends.api';
import type { FriendRequest } from '../../friends/types/friends.types';
import { createNotificationSocket } from '../socket/notificationSocket';
import type { ActivityItem, NotificationPayload } from '../types/notification.types';
import { NotificationsContext } from './NotificationsContext';

/**
 * Owns the single app-wide notification socket and the shared notification state.
 *
 * Pending friend requests come from the API (the source of truth — they carry the
 * request id + populated sender). Accepted/declined events arrive only over the
 * socket and are kept as transient in-memory `activity` items.
 */
export function NotificationsProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const currentUserId = user?.id;

  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [eventTick, setEventTick] = useState(0);

  const load = useCallback(async () => {
    try {
      setRequests(await getIncomingRequests());
    } catch {
      // ignore — keep last known state
    }
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      setRequests([]);
      setActivity([]);
      return;
    }

    void load();

    const socket = createNotificationSocket();

    async function onNotification(payload: NotificationPayload) {
      if (!payload?.type) return;

      if (payload.type === 'FRIEND_REQUEST') {
        await load();
      } else if (
        payload.type === 'FRIEND_REQUEST_ACCEPTED' ||
        payload.type === 'FRIEND_REQUEST_REJECTED'
      ) {
        const name = await getUserProfile(payload.sender)
          .then((p) => p.name)
          .catch(() => 'Someone');
        const accepted = payload.type === 'FRIEND_REQUEST_ACCEPTED';
        setActivity((prev) => [
          {
            id: `${payload.type}_${payload.sender}_${Date.now()}`,
            type: accepted ? 'FRIEND_REQUEST_ACCEPTED' : 'FRIEND_REQUEST_REJECTED',
            text: `${name} ${accepted ? 'accepted' : 'declined'} your friend request`,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }

      setEventTick((t) => t + 1);
    }

    function onFocus() {
      void load();
    }

    socket.on('newNotification', onNotification);
    socket.connect();
    window.addEventListener('focus', onFocus);

    return () => {
      socket.off('newNotification', onNotification);
      socket.disconnect();
      window.removeEventListener('focus', onFocus);
    };
  }, [currentUserId, load]);

  const accept = useCallback(async (requestId: string) => {
    await acceptFriendRequest(requestId);
    setRequests((prev) => prev.filter((r) => r._id !== requestId));
    setEventTick((t) => t + 1);
  }, []);

  const reject = useCallback(async (requestId: string) => {
    await rejectFriendRequest(requestId);
    setRequests((prev) => prev.filter((r) => r._id !== requestId));
    setEventTick((t) => t + 1);
  }, []);

  const dismiss = useCallback((id: string) => {
    setActivity((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      requests,
      activity,
      count: requests.length + activity.length,
      accept,
      reject,
      dismiss,
      eventTick,
    }),
    [requests, activity, accept, reject, dismiss, eventTick],
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}
