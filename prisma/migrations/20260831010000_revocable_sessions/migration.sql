-- Make stateless sessions revocable.
--
-- verifySessionToken was pure HMAC verification with no database lookup, and
-- nothing downstream re-checked the user, so DELETE /api/users/[id] did not log
-- anyone out: a deleted user's cookie kept working until the fixed midnight
-- expiry, and a password reset left every older session alive.
--
-- Each token now carries its issued-at timestamp, and a token issued before the
-- user's sessionsValidFrom is refused. Existing rows are backfilled to now(),
-- which invalidates every token issued before this migration ran -- everyone
-- signs in again once, which is the intended behaviour for a change of this
-- kind rather than a side effect.
ALTER TABLE "User"
  ADD COLUMN "sessionsValidFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
