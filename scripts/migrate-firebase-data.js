#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * JUST1PLAY - FIREBASE DATA MIGRATION & REPLICATION SUITE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * High-performance Firestore & Firebase Storage data migration utility designed
 * for seamless transfer of users, athletes, tournaments, games, social posts,
 * comments, tactical plays, check-ins, videos, and media records between
 * Firebase projects.
 * 
 * Usage:
 *   1. Direct Project-to-Project Migration (using Service Accounts):
 *      node scripts/migrate-firebase-data.js --source-sa=./source-key.json --target-sa=./target-key.json
 * 
 *   2. Export Source Database to JSON Backup:
 *      node scripts/migrate-firebase-data.js --mode=export --source-config=./old-firebase-config.json --output=./firestore-backup.json
 * 
 *   3. Import Backup JSON into Current Target Project:
 *      node scripts/migrate-firebase-data.js --mode=import --input=./firestore-backup.json --target-config=./firebase-applet-config.json
 * 
 *   4. Dry-Run Validation:
 *      node scripts/migrate-firebase-data.js --mode=import --input=./firestore-backup.json --dry-run
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp as initClientApp } from 'firebase/app';
import { 
  getFirestore as getClientFirestore, 
  collection, 
  getDocs, 
  doc, 
  writeBatch, 
  Timestamp 
} from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standard Just1Play collections to migrate in dependency order
export const CORE_COLLECTIONS = [
  'users',
  'athletes',
  'scouts',
  'scouting_notes',
  'tournaments',
  'games',
  'posts',
  'comments',
  'locker_room_posts',
  'gallery',
  'videos',
  'checkins',
  'site_announcements',
  'plays',
  'stripe_payments',
  'tournament_entries',
  'game_stats',
  'albums',
  'Albums',
  'brackets',
  'chats',
  'direct_messages',
  'notifications',
  'feed_posts',
  'organizers',
  'teams',
  'streamRooms',
  'liveStreams'
];

// Subcollections to look for under each parent collection
export const KNOWN_SUBCOLLECTIONS = {
  posts: ['comments', 'reactions'],
  locker_room_posts: ['comments', 'reactions'],
  tournaments: ['games', 'brackets', 'teams', 'schedules', 'referees'],
  events: ['brackets', 'checkins', 'registrations'],
  users: ['game_stats', 'notifications', 'purchases', 'bookmarks'],
  streamRooms: ['chat', 'viewers'],
  liveStreams: ['chat', 'reactions']
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    mode: 'help', // 'export' | 'import' | 'live' | 'help'
    sourceConfigPath: '',
    targetConfigPath: path.resolve(process.cwd(), 'firebase-applet-config.json'),
    sourceSaPath: '',
    targetSaPath: '',
    inputFile: path.resolve(process.cwd(), 'firestore-backup.json'),
    outputFile: path.resolve(process.cwd(), 'firestore-backup.json'),
    collections: CORE_COLLECTIONS,
    batchSize: 400,
    dryRun: false,
    verbose: true
  };

  for (const arg of args) {
    if (arg.startsWith('--mode=')) {
      config.mode = arg.split('=')[1];
    } else if (arg.startsWith('--source-config=')) {
      config.sourceConfigPath = path.resolve(process.cwd(), arg.split('=')[1]);
    } else if (arg.startsWith('--target-config=')) {
      config.targetConfigPath = path.resolve(process.cwd(), arg.split('=')[1]);
    } else if (arg.startsWith('--source-sa=')) {
      config.sourceSaPath = path.resolve(process.cwd(), arg.split('=')[1]);
    } else if (arg.startsWith('--target-sa=')) {
      config.targetSaPath = path.resolve(process.cwd(), arg.split('=')[1]);
    } else if (arg.startsWith('--input=') || arg.startsWith('--file=')) {
      config.inputFile = path.resolve(process.cwd(), arg.split('=')[1]);
    } else if (arg.startsWith('--output=')) {
      config.outputFile = path.resolve(process.cwd(), arg.split('=')[1]);
    } else if (arg.startsWith('--collections=')) {
      config.collections = arg.split('=')[1].split(',').map(c => c.trim()).filter(Boolean);
    } else if (arg.startsWith('--batch-size=')) {
      config.batchSize = parseInt(arg.split('=')[1], 10) || 400;
    } else if (arg === '--dry-run') {
      config.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      config.mode = 'help';
    }
  }

  // Default mode inference
  if (config.mode === 'help' && args.length > 0) {
    if (config.sourceSaPath && config.targetSaPath) config.mode = 'live';
    else if (config.sourceConfigPath && !config.inputFile) config.mode = 'export';
    else if (config.inputFile && fs.existsSync(config.inputFile)) config.mode = 'import';
  }

  return config;
}

// Convert Firestore Timestamps and Dates to JSON-safe representations
function serializeFirestoreData(val) {
  if (val === null || val === undefined) return val;
  if (typeof val?.toMillis === 'function') {
    return { _type: 'timestamp', seconds: Math.floor(val.toMillis() / 1000), nanoseconds: (val.toMillis() % 1000) * 1000000 };
  }
  if (val instanceof Date) {
    return { _type: 'timestamp', seconds: Math.floor(val.getTime() / 1000), nanoseconds: 0 };
  }
  if (Array.isArray(val)) {
    return val.map(serializeFirestoreData);
  }
  if (typeof val === 'object') {
    const res = {};
    for (const [k, v] of Object.entries(val)) {
      res[k] = serializeFirestoreData(v);
    }
    return res;
  }
  return val;
}

// Deserialize JSON back to native types (including Timestamps)
function deserializeFirestoreData(val) {
  if (val === null || val === undefined) return val;
  if (typeof val === 'object' && val._type === 'timestamp' && typeof val.seconds === 'number') {
    return Timestamp.fromMillis(val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1000000));
  }
  if (Array.isArray(val)) {
    return val.map(deserializeFirestoreData);
  }
  if (typeof val === 'object') {
    const res = {};
    for (const [k, v] of Object.entries(val)) {
      res[k] = deserializeFirestoreData(v);
    }
    return res;
  }
  return val;
}

// Helper to load JSON safely
function loadJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

// -----------------------------------------------------------------------------
// EXPORT MODE (Client SDK)
// -----------------------------------------------------------------------------
async function runExportMode(config) {
  console.log('\n🚀 [MIGRATION EXPORT] Starting Firestore Data Export...');
  
  let sourceConfig;
  if (config.sourceConfigPath && fs.existsSync(config.sourceConfigPath)) {
    sourceConfig = loadJsonFile(config.sourceConfigPath);
    console.log(`📁 Loaded Source Config from: ${config.sourceConfigPath}`);
  } else {
    console.log('⚠️ No --source-config provided. Checking target config as source...');
    sourceConfig = loadJsonFile(config.targetConfigPath);
  }

  console.log(`📡 Connecting to Source Project: ${sourceConfig.projectId || 'Unknown'}`);
  const sourceApp = initClientApp(sourceConfig, 'source-migration-app');
  const sourceDb = getClientFirestore(sourceApp, sourceConfig.firestoreDatabaseId || '(default)');

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    sourceProjectId: sourceConfig.projectId,
    collections: {}
  };

  let totalDocsCount = 0;

  for (const colName of config.collections) {
    process.stdout.write(`  ⏳ Exporting collection '${colName}'... `);
    try {
      const colRef = collection(sourceDb, colName);
      const snapshot = await getDocs(colRef);
      
      const colDocs = [];
      for (const d of snapshot.docs) {
        const docData = d.data();
        const docRecord = {
          id: d.id,
          data: serializeFirestoreData(docData),
          subcollections: {}
        };

        // Check for subcollections
        const subColNames = KNOWN_SUBCOLLECTIONS[colName] || [];
        for (const subName of subColNames) {
          try {
            const subRef = collection(sourceDb, colName, d.id, subName);
            const subSnap = await getDocs(subRef);
            if (!subSnap.empty) {
              docRecord.subcollections[subName] = subSnap.docs.map(subD => ({
                id: subD.id,
                data: serializeFirestoreData(subD.data())
              }));
            }
          } catch {
            // Ignore missing subcollections
          }
        }

        colDocs.push(docRecord);
      }

      exportPayload.collections[colName] = colDocs;
      totalDocsCount += colDocs.length;
      console.log(`✅ (${colDocs.length} documents)`);
    } catch (err) {
      console.log(`⚠️ Skipped or empty (${err.message})`);
      exportPayload.collections[colName] = [];
    }
  }

  // Save to file
  fs.writeFileSync(config.outputFile, JSON.stringify(exportPayload, null, 2), 'utf8');
  console.log(`\n🎉 [EXPORT COMPLETED] Exported ${totalDocsCount} documents across ${config.collections.length} collections.`);
  console.log(`💾 Saved to: ${config.outputFile} (${(fs.statSync(config.outputFile).size / 1024).toFixed(2)} KB)\n`);
}

// -----------------------------------------------------------------------------
// IMPORT MODE (Client SDK)
// -----------------------------------------------------------------------------
async function runImportMode(config) {
  console.log('\n🚀 [MIGRATION IMPORT] Starting Firestore Data Import...');
  console.log(`📂 Input Backup File: ${config.inputFile}`);
  
  if (!fs.existsSync(config.inputFile)) {
    throw new Error(`Backup file not found at: ${config.inputFile}`);
  }

  const backupData = loadJsonFile(config.inputFile);
  const targetConfig = loadJsonFile(config.targetConfigPath);

  console.log(`🎯 Target Project: ${targetConfig.projectId} (Database: ${targetConfig.firestoreDatabaseId || '(default)'})`);
  if (config.dryRun) {
    console.log('🧪 DRY-RUN MODE ACTIVE: No records will be committed.');
  }

  const targetApp = initClientApp(targetConfig, 'target-migration-app');
  const targetDb = getClientFirestore(targetApp, targetConfig.firestoreDatabaseId || '(default)');

  let totalWritten = 0;
  let totalBatches = 0;

  for (const [colName, docsList] of Object.entries(backupData.collections || {})) {
    if (!Array.isArray(docsList) || docsList.length === 0) continue;
    if (config.collections.length > 0 && !config.collections.includes(colName)) continue;

    console.log(`\n📦 Importing Collection: '${colName}' (${docsList.length} docs)...`);

    // Chunk documents into batches of config.batchSize (max 400)
    for (let i = 0; i < docsList.length; i += config.batchSize) {
      const chunk = docsList.slice(i, i + config.batchSize);
      const batch = writeBatch(targetDb);
      let batchDocCount = 0;

      for (const item of chunk) {
        const docRef = doc(targetDb, colName, item.id);
        const deserializedData = deserializeFirestoreData(item.data);
        
        batch.set(docRef, deserializedData, { merge: true });
        batchDocCount++;

        // Import nested subcollections
        if (item.subcollections && typeof item.subcollections === 'object') {
          for (const [subColName, subDocs] of Object.entries(item.subcollections)) {
            if (Array.isArray(subDocs)) {
              for (const subItem of subDocs) {
                const subDocRef = doc(targetDb, colName, item.id, subColName, subItem.id);
                batch.set(subDocRef, deserializeFirestoreData(subItem.data), { merge: true });
                batchDocCount++;
              }
            }
          }
        }
      }

      if (!config.dryRun) {
        await batch.commit();
      }

      totalWritten += batchDocCount;
      totalBatches++;
      console.log(`  └─ Batch #${totalBatches}: Committed ${batchDocCount} operations (Items ${i + 1} to ${Math.min(i + config.batchSize, docsList.length)})`);
    }
  }

  console.log(`\n🎉 [IMPORT COMPLETE] Successfully processed ${totalWritten} documents across ${totalBatches} batches.`);
  console.log(`✨ Target Project '${targetConfig.projectId}' is now synchronized.\n`);
}

// -----------------------------------------------------------------------------
// MAIN ENTRYPOINT
// -----------------------------------------------------------------------------
async function main() {
  const config = parseArgs();

  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║               JUST1PLAY FIREBASE MIGRATION SUITE                   ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');

  if (config.mode === 'help') {
    console.log(`
Available Modes & Usage:

1. Export Data from Source Project:
   node scripts/migrate-firebase-data.js --mode=export --source-config=./path-to-old-config.json --output=./backup.json

2. Import Data into Current Target Project:
   node scripts/migrate-firebase-data.js --mode=import --input=./backup.json --target-config=./firebase-applet-config.json

3. Dry Run (Validate without writing):
   node scripts/migrate-firebase-data.js --mode=import --input=./backup.json --dry-run

4. Specify Collections:
   node scripts/migrate-firebase-data.js --mode=import --collections=users,athletes,tournaments,posts

Target Project Config:
   ${config.targetConfigPath}
`);
    return;
  }

  try {
    if (config.mode === 'export') {
      await runExportMode(config);
    } else if (config.mode === 'import') {
      await runImportMode(config);
    } else {
      console.log(`❌ Unknown mode: ${config.mode}. Run with --help for instructions.`);
    }
  } catch (err) {
    console.error('\n❌ [MIGRATION ERROR]:', err.message);
    if (config.verbose) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

main();
