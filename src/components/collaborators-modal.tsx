"use client";

import { Check, Loader2, UserMinus, UserPlus, Users, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/modal";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { UserAvatar } from "@/components/user-avatar";
import { notifyNotificationsUpdated } from "@/hooks/use-notifications";

type Artist = {
  id: string;
  username: string | null;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
};

type Collaborator = {
  id: string;
  userId: string;
  status?: string;
  createdAt: string;
  artist: Artist;
};

type CollaboratorsModalProps = {
  open: boolean;
  onClose: () => void;
  songId: string;
  isOwner: boolean;
  onChanged?: () => void;
  /** Open focused on pending requests (from notifications). */
  initialTab?: "active" | "requests";
};

export function CollaboratorsModal({
  open,
  onClose,
  songId,
  isOwner,
  onChanged,
  initialTab = "active",
}: CollaboratorsModalProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [pending, setPending] = useState<Collaborator[]>([]);
  const [candidates, setCandidates] = useState<Artist[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/songs/${songId}/collaborators`);
    if (res.ok) {
      const data = await res.json();
      setCollaborators(data.collaborators || []);
      setPending(data.pending || []);
      setCandidates(data.candidates || []);
      setViewerId(data.viewerId || null);
    }
    setLoading(false);
  }, [songId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function addCollaborator(userId: string) {
    setBusyId(userId);
    try {
      const res = await fetch(`/api/songs/${songId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        await load();
        onChanged?.();
        notifyNotificationsUpdated();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function respondRequest(userId: string, action: "accept" | "decline") {
    setBusyId(userId);
    try {
      const res = await fetch(`/api/songs/${songId}/collaborators`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      if (res.ok) {
        await load();
        onChanged?.();
        notifyNotificationsUpdated();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function removeCollaborator(userId: string) {
    setBusyId(userId);
    try {
      const res = await fetch(
        `/api/songs/${songId}/collaborators?userId=${encodeURIComponent(userId)}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        await load();
        onChanged?.();
        notifyNotificationsUpdated();
      }
    } finally {
      setBusyId(null);
    }
  }

  const showRequestsFirst = isOwner && initialTab === "requests" && pending.length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Collaborators"
      description={
        isOwner
          ? "Invite artists from your network, or accept collab requests on this song."
          : "Artists working on this song with you."
      }
    >
      {loading ? (
        <RapVaultLoading compact label="Loading..." className="min-h-[8rem]" />
      ) : (
        <div className="space-y-6">
          {isOwner && pending.length > 0 && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Pending requests
              </p>
              <ul className="space-y-2">
                {pending.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5"
                  >
                    <UserAvatar
                      src={c.artist.avatarUrl}
                      name={c.artist.displayName}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {c.artist.displayName}
                      </p>
                      <p className="truncate text-xs text-muted">
                        @{c.artist.username} · wants to collab
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => respondRequest(c.userId, "accept")}
                        disabled={busyId === c.userId}
                        className="inline-flex h-9 items-center gap-1 rounded-xl bg-accent px-2.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                      >
                        {busyId === c.userId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => respondRequest(c.userId, "decline")}
                        disabled={busyId === c.userId}
                        className="inline-flex h-9 items-center gap-1 rounded-xl border border-border px-2.5 text-xs font-medium text-muted transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              On this song
            </p>
            {collaborators.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
                <Users className="mx-auto mb-2 h-5 w-5" />
                {showRequestsFirst
                  ? "Accept a request above to add them"
                  : "No collaborators yet"}
              </div>
            ) : (
              <ul className="space-y-2">
                {collaborators.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-background px-3 py-2.5"
                  >
                    <UserAvatar
                      src={c.artist.avatarUrl}
                      name={c.artist.displayName}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {c.artist.displayName}
                      </p>
                      <p className="truncate text-xs text-muted">
                        @{c.artist.username}
                      </p>
                    </div>
                    {(isOwner || c.userId === viewerId) && (
                      <button
                        type="button"
                        onClick={() => removeCollaborator(c.userId)}
                        disabled={busyId === c.userId}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-2.5 text-xs font-medium text-muted transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
                      >
                        {busyId === c.userId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserMinus className="h-3.5 w-3.5" />
                        )}
                        {isOwner && c.userId !== viewerId ? "Remove" : "Leave"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {isOwner && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Invite from network
              </p>
              {candidates.length === 0 ? (
                <p className="rounded-2xl border border-border bg-background px-4 py-5 text-center text-sm text-muted">
                  Connect with artists in Network to invite them here.
                </p>
              ) : (
                <ul className="max-h-56 space-y-2 overflow-y-auto">
                  {candidates.map((artist) => (
                    <li
                      key={artist.id}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-background px-3 py-2.5"
                    >
                      <UserAvatar
                        src={artist.avatarUrl}
                        name={artist.displayName}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {artist.displayName}
                        </p>
                        <p className="truncate text-xs text-muted">
                          @{artist.username}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addCollaborator(artist.id)}
                        disabled={busyId === artist.id}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-2.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                      >
                        {busyId === artist.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="h-3.5 w-3.5" />
                        )}
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}
