// Run with: npx tsx lib/generate-hash.ts <password>
import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password) {
  console.log('Usage: npx tsx lib/generate-hash.ts <password>');
  process.exit(1);
}

bcrypt.hash(password, 12).then((hash) => {
  console.log(hash);
});
