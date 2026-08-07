/** Consider a user online if they heartbeated within this window. */
export const PRESENCE_ONLINE_MS = 90_000;

export function isUserOnline(
  lastSeenAt: Date | string | null | undefined,
): boolean {
  if (!lastSeenAt) return false;
  const time =
    typeof lastSeenAt === "string"
      ? new Date(lastSeenAt).getTime()
      : lastSeenAt.getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time < PRESENCE_ONLINE_MS;
}
