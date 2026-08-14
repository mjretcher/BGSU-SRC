// Usage: npx tsx scripts/create-user.ts <email> "<Full Name>" [password]
// If password is omitted, a random one is generated and printed once.
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { hashPassword } from "../src/lib/auth";
import { db } from "../src/lib/db";

async function main() {
  const [email, name, passwordArg] = process.argv.slice(2);
  if (!email || !name) {
    console.error('Usage: npx tsx scripts/create-user.ts <email> "<Full Name>" [password]');
    process.exit(1);
  }
  const password = passwordArg ?? randomBytes(9).toString("base64url");
  const passwordHash = await hashPassword(password);
  const user = await db.user.upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase(), name, passwordHash },
    update: { name, passwordHash },
  });
  await db.auditLog.create({
    data: { actorEmail: "system", action: "user.provisioned", targetType: "User", targetId: user.id },
  });
  console.log(`User ${user.email} ready.`);
  if (!passwordArg) console.log(`Generated password (shown once): ${password}`);
}

main().then(() => process.exit(0));
