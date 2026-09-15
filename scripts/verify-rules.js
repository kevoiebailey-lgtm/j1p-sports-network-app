import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storageRulesPath = path.join(__dirname, '../storage.rules');
const firestoreRulesPath = path.join(__dirname, '../firestore.rules');

if (!fs.existsSync(storageRulesPath) || !fs.existsSync(firestoreRulesPath)) {
  console.error("❌ CRITICAL ERROR: storage.rules or firestore.rules file is missing!");
  process.exit(1);
}

const storageRules = fs.readFileSync(storageRulesPath, 'utf8');
const firestoreRules = fs.readFileSync(firestoreRulesPath, 'utf8');

// Ensure video upload restriction remains intact
if (!storageRules.includes("request.resource.contentType.matches('video/.*')") || !storageRules.includes("isAdmin()")) {
  console.error("❌ CRITICAL ERROR: Storage rules have been modified! Raw video uploads must be admin-only.");
  process.exit(1);
}

// Ensure post creation rule exists
if (!firestoreRules.includes("match /posts/{postId}")) {
  console.error("❌ CRITICAL ERROR: Firestore social wall rules missing!");
  process.exit(1);
}

console.log("✅ Security rules verified. Proceeding with build.");
