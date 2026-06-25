# Chat API

REST endpoints for the chat feature. Real-time messaging itself runs over the
WebSocket gateway (`ChatGateway`); these REST endpoints cover data the friends
list / UI needs to fetch on load.

All endpoints require authentication via the JWT passport guard. Send the token
in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

---

## GET /chat/unread-counts

Returns the number of **unread** messages the current user has received,
grouped by the sender (friend) who sent them. Use it to show an unread badge
(e.g. a `1`) next to each friend in the friends list.

A message is counted as unread when:
- `receiver` is the current user, **and**
- `seen` is `false` (i.e. the user has not opened that chat yet).

Unread counts are cleared per-friend when the user opens the chat — the client
emits `markSeen` over the socket, which flips those messages to `seen: true`.

### Request

| | |
|---|---|
| Method | `GET` |
| Path | `/chat/unread-counts` |
| Auth | Required (`Bearer <token>`) |
| Body | None |
| Params | None |

### Response `200 OK`

An object mapping each friend's user id to the count of unread messages they
sent. Friends with no unread messages are **omitted** (not returned with `0`).

```json
{
  "6a39bd94652d57c5f92e5d6a": 1,
  "6a39295f59d1d720ab1d4f71": 3
}
```

If the user has no unread messages at all, an empty object is returned:

```json
{}
```

### Errors

| Status | When |
|---|---|
| `401 Unauthorized` | Missing or invalid JWT token |

### Example

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/chat/unread-counts
```

### Frontend usage (suggested)

The friends list can call this on load and look up each friend by id:

```ts
const counts = await fetch('/chat/unread-counts', {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());

// later, per friend:
const unread = counts[friend._id] ?? 0;
```
