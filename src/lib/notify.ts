import { db } from "./db";

// Email notifications (spec §11) behind a provider-agnostic interface.
// The stub provider records every send in the audit log but delivers
// nothing — swap in a real provider (e.g. Resend) later without touching
// callers: implement EmailProvider and change makeEmailProvider().

export interface EmailMessage {
  to: string[];
  subject: string;
  text: string;
}

export interface EmailProvider {
  readonly name: string;
  send(msg: EmailMessage): Promise<{ delivered: boolean; detail?: string }>;
}

class StubEmailProvider implements EmailProvider {
  readonly name = "stub";
  async send(msg: EmailMessage) {
    await db.auditLog.create({
      data: {
        actorEmail: "system",
        action: "notification.email_stubbed",
        targetType: "Notification",
        after: { to: msg.to, subject: msg.subject, text: msg.text.slice(0, 500) },
      },
    });
    return { delivered: false, detail: "Email provider not configured — recorded only." };
  }
}

export function makeEmailProvider(): EmailProvider {
  return new StubEmailProvider();
}

export async function recipientEmails(): Promise<string[]> {
  const users = await db.user.findMany({ select: { email: true } });
  return users.map((u) => u.email);
}
