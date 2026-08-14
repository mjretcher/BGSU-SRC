"use client";

import { useState } from "react";

interface U {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

const inputCls =
  "w-full rounded-lg border border-line-strong bg-bg-raised px-3 py-2 text-sm text-ink outline-none transition focus:border-accent";
const btnPrimary =
  "rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50";
const btnGhost =
  "rounded-lg border border-line-strong px-3 py-1.5 text-[13px] text-ink-secondary transition hover:border-accent/50 hover:text-ink";
const btnDanger =
  "rounded-lg border border-down/40 px-3 py-1.5 text-[13px] text-down transition hover:bg-down/10";

export function UserManager({ selfId, initialUsers }: { selfId: string; initialUsers: U[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // one-time credentials to surface after create/reset: { email, password }
  const [reveal, setReveal] = useState<{ email: string; password: string } | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [resetFor, setResetFor] = useState<string | null>(null);
  const [resetValue, setResetValue] = useState("");

  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  async function refresh() {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(((await res.json()) as { users: U[] }).users);
  }

  async function call(url: string, init: RequestInit): Promise<Record<string, unknown> | null> {
    setBusy(true);
    setError(null);
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    setBusy(false);
    if (!res.ok) {
      setError((data?.error as string) ?? "Something went wrong");
      return null;
    }
    await refresh();
    return data;
  }

  async function addUser() {
    const data = await call("/api/users", {
      method: "POST",
      body: JSON.stringify({ email: newEmail, name: newName, password: newPassword || undefined }),
    });
    if (data) {
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      if (data.generatedPassword) {
        setReveal({ email: (data.user as U).email, password: data.generatedPassword as string });
      }
    }
  }

  async function submitReset(u: U, custom: string) {
    const data = await call(`/api/users/${u.id}`, {
      method: "PATCH",
      body: JSON.stringify(custom ? { password: custom } : { resetPassword: true }),
    });
    if (data) {
      setResetFor(null);
      setResetValue("");
      if (data.generatedPassword) {
        setReveal({ email: u.email, password: data.generatedPassword as string });
      } else if (custom) {
        setReveal({ email: u.email, password: custom });
      }
    }
  }

  async function saveEdit(u: U) {
    const data = await call(`/api/users/${u.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: editName, email: editEmail }),
    });
    if (data) setEditing(null);
  }

  async function deleteUser(u: U) {
    if (!confirm(`Delete ${u.name} (${u.email})? They will no longer be able to sign in. Their past actions stay in the audit log.`)) return;
    await call(`/api/users/${u.id}`, { method: "DELETE" });
  }

  return (
    <div>
      {reveal && (
        <div className="mb-4 rounded-xl border border-accent/40 bg-accent-soft p-4">
          <p className="text-[13px] text-ink">
            New password for <span className="font-medium">{reveal.email}</span> — shown once, copy it now:
          </p>
          <p className="mt-2 select-all rounded-lg border border-line-strong bg-bg-raised px-3 py-2 font-mono text-[15px] text-accent">
            {reveal.password}
          </p>
          <button className={btnGhost + " mt-3"} onClick={() => setReveal(null)}>
            I&apos;ve copied it — dismiss
          </button>
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-lg border border-down/30 bg-down/10 px-3.5 py-2.5 text-sm text-down">{error}</p>
      )}

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="rounded-xl border border-line bg-surface px-4 py-3">
            {editing === u.id ? (
              <div className="flex flex-wrap items-center gap-2">
                <input className={inputCls + " max-w-[200px]"} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
                <input className={inputCls + " max-w-[260px]"} value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" />
                <button className={btnPrimary} disabled={busy} onClick={() => saveEdit(u)}>Save</button>
                <button className={btnGhost} onClick={() => setEditing(null)}>Cancel</button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">
                    {u.name}
                    {u.id === selfId && <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-accent">you</span>}
                  </p>
                  <p className="text-[13px] text-ink-secondary">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className={btnGhost}
                    onClick={() => {
                      setEditing(u.id);
                      setEditName(u.name);
                      setEditEmail(u.email);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className={btnGhost}
                    disabled={busy}
                    onClick={() => {
                      setResetFor(resetFor === u.id ? null : u.id);
                      setResetValue("");
                    }}
                  >
                    Reset password
                  </button>
                  {u.id !== selfId && (
                    <button className={btnDanger} disabled={busy} onClick={() => deleteUser(u)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
            {resetFor === u.id && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <input
                  className={inputCls + " max-w-[240px]"}
                  type="text"
                  placeholder="Type a new password…"
                  value={resetValue}
                  onChange={(e) => setResetValue(e.target.value)}
                />
                <button
                  className={btnPrimary}
                  disabled={busy || resetValue.trim().length < 8}
                  onClick={() => submitReset(u, resetValue.trim())}
                >
                  Set this password
                </button>
                <button className={btnGhost} disabled={busy} onClick={() => submitReset(u, "")}>
                  Generate random instead
                </button>
                <button className={btnGhost} onClick={() => setResetFor(null)}>Cancel</button>
                {resetValue.trim().length > 0 && resetValue.trim().length < 8 && (
                  <span className="text-[12px] text-warn">At least 8 characters</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-line bg-surface p-4">
        <h2 className="text-[15px] font-semibold text-ink">Add a user</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input className={inputCls + " max-w-[200px]"} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" />
          <input className={inputCls + " max-w-[260px]"} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@bgsu.edu" type="email" />
          <input
            className={inputCls + " max-w-[220px]"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Password (blank = generate)"
            type="text"
          />
          <button
            className={btnPrimary}
            disabled={busy || !newName.trim() || !newEmail.trim() || (newPassword.trim().length > 0 && newPassword.trim().length < 8)}
            onClick={addUser}
          >
            Create user
          </button>
          {newPassword.trim().length > 0 && newPassword.trim().length < 8 && (
            <span className="text-[12px] text-warn">At least 8 characters</span>
          )}
        </div>
      </div>
    </div>
  );
}
