import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '../../../shared/api/axios';
import {
  acceptFriendRequest,
  getCurrentUserFull,
  getIncomingRequests,
  getUserProfile,
  rejectFriendRequest,
} from '../api/friends.api';
import type { FriendProfile, FriendRequest } from '../types/friends.types';

export function useFriends() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqs, currentUser] = await Promise.all([
        getIncomingRequests(),
        getCurrentUserFull(),
      ]);
      setRequests(reqs);
      const profiles = await Promise.all(
        (currentUser.friends ?? []).map((id) =>
          getUserProfile(String(id)).catch(() => null),
        ),
      );
      setFriends(profiles.filter((p): p is FriendProfile => p !== null && Boolean(p?.name)));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const accept = useCallback(
    async (requestId: string) => {
      await acceptFriendRequest(requestId);
      await refresh();
    },
    [refresh],
  );

  const reject = useCallback(
    async (requestId: string) => {
      await rejectFriendRequest(requestId);
      await refresh();
    },
    [refresh],
  );

  return { requests, friends, loading, error, accept, reject, refresh };
}
