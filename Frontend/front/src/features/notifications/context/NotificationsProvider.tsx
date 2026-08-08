import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import {
  acceptFriendRequest,
  getIncomingRequests,
  getUnseenOutcomes,
  getUserProfile,
  markOutcomesSeen,
  rejectFriendRequest,
} from '../../friends/api/friends.api';
import type { FriendRequest } from '../../friends/types/friends.types';
import { getUnreadCounts } from '../../chat/api/chat.api';
import { createNotificationSocket } from '../socket/notificationSocket';
import type {
  ActivityItem,
  MessageNotif,
  NotificationPayload,
} from '../types/notification.types';
import { NotificationsContext } from './NotificationsContext';

export function NotificationsProvider({ children }: PropsWithChildren) {
  const { user, refreshUser } = useAuth();
  const currentUserId = user?.id;

  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [messages, setMessages] = useState<MessageNotif[]>([]);
  const [eventTick, setEventTick] = useState(0);

  const load = useCallback(async () => {
    try {
      setRequests(await getIncomingRequests());
    } catch {
      // ignore — keep last known state
    }
    try {
      // Outcomes of our own requests, kept server-side until read, so an accept
      // or reject that landed while we were away still shows up in the bell.
      const outcomes = await getUnseenOutcomes();
      setActivity((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        const fromServer = outcomes
          .filter((o) => !seen.has(o._id))
          .map((o) => ({
            id: o._id,
            type:
              o.status === 'accepted'
                ? ('FRIEND_REQUEST_ACCEPTED' as const)
                : ('FRIEND_REQUEST_REJECTED' as const),
            senderName: o.receiver?.name ?? 'Someone',
            createdAt: o.updatedAt,
          }));
        return [...fromServer, ...prev];
      });
    } catch {
      // ignore — keep last known state
    }
    try {
      // Unread messages come from the server, so messages left while we were
      // offline/logged-out still show up in the bell after we come back.
      const counts = await getUnreadCounts();
      const notifs = await Promise.all(
        Object.entries(counts).map(async ([senderId, count]) => ({
          senderId,
          count,
          senderName: await getUserProfile(senderId)
            .then((p) => p.name)
            .catch(() => 'Someone'),
        })),
      );
      setMessages(notifs);
    } catch {
      // ignore — keep last known state
    }
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      setRequests([]);
      setActivity([]);
      setMessages([]);
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
            senderName: name,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      } else if (
        payload.type === 'IJAZAH_GRANTED' ||
        payload.type === 'IJAZAH_REVOKED'
      ) {
        // Captured before the await: TypeScript drops the narrowing on
        // payload.type across it, and this branch is the only place that knows
        // the value is one of the two ijazah kinds.
        const kind = payload.type;
        // The prayer session is gated on the ijazah flag carried by the signed-in
        // user, so pull a fresh copy — otherwise the lock would only lift on the
        // next reload.
        await refreshUser().catch(() => {});
        setActivity((prev) => [
          {
            id: `${kind}_${Date.now()}`,
            type: kind,
            senderName: '',
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      } else if (payload.type === 'NEW_MESSAGE') {
        // Don't badge a chat the user is currently reading (it's marked seen).
        if (window.location.pathname !== `/chat/${payload.sender}`) {
          await load();
        }
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
  }, [currentUserId, load, refreshUser]);

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
    // Dismissing means the bell was read, so clear the server-side backlog too;
    // otherwise every outcome would come straight back on the next load.
    void markOutcomesSeen().catch(() => {
      /* best-effort: it stays unseen and reappears next time */
    });
  }, []);

  const dismissMessage = useCallback((senderId: string) => {
    setMessages((prev) => prev.filter((m) => m.senderId !== senderId));
  }, []);

  const value = useMemo(
    () => ({
      requests,
      activity,
      messages,
      count:
        requests.length +
        activity.length +
        messages.reduce((sum, m) => sum + m.count, 0),
      accept,
      reject,
      dismiss,
      dismissMessage,
      eventTick,
    }),
    [requests, activity, messages, accept, reject, dismiss, dismissMessage, eventTick],
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}
