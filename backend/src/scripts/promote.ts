/**
 * Promote a user to superadmin by email.
 * Usage: npm run promote -- user@example.com
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/User.js';

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('MONGO_URI not set'); process.exit(1); }

const email = process.argv[2];
if (!email) { console.error('Usage: npm run promote -- <email>'); process.exit(1); }

async function main() {
  await mongoose.connect(MONGO_URI!);

  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase().trim() },
    { $set: { role: 'superadmin' } },
    { new: true },
  );

  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  console.log(`✓ ${user.email} is now ${user.role}`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
