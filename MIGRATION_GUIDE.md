# 📦 JUST1PLAY FIREBASE DATA & ASSET MIGRATION GUIDE

This production migration guide details the complete process for synchronizing Firestore databases, Firebase Authentication accounts, and Firebase Cloud Storage assets from an older/temporary Firebase project to the production-ready project (`just1play26`).

---

## 🔍 Verified Production Environment Configuration

The current environment and application runtime are bound to the upgraded, production-ready Firebase project credentials:

| Parameter | Current Value | Notes |
| :--- | :--- | :--- |
| **Project ID** | `just1play26` | Production GCP / Firebase Project |
| **App ID** | `1:256996216773:web:33ff47765011e8414385ac` | Web Client SDK Registration |
| **API Key** | `AIzaSyAt_x3Lzd-i3pL4ThJ1BBD_j4YMPH4K-8U` | Production Google Web API Key |
| **Auth Domain** | `just1play26.firebaseapp.com` | OAuth Redirect & Google Sign-In |
| **Storage Bucket** | `just1play26.firebasestorage.app` | Production Cloud Storage Bucket |
| **Firestore Database ID** | `(default)` | Primary Firestore Database |
| **Sender ID** | `256996216773` | Cloud Messaging Project Number |
| **Measurement ID** | `G-96RJKBTP7V` | Google Analytics 4 Stream |

---

## 🛠️ Migration Options

Choose the migration method that fits your workflow:

1. **Option A: Automated In-App / Node.js Migration Suite (Recommended & Fastest)**
2. **Option B: Google Cloud Native Firestore Export & Import (Cloud Storage)**
3. **Option C: Firebase CLI Auth & Storage Asset Replication**

---

### 🚀 Option A: Automated Node.js Migration Suite

The project includes an automated migration engine (`scripts/migrate-firebase-data.js`).

#### Step 1: Export Data from the Source (Old) Project
Obtain the web configuration JSON from your old Firebase project (from the Firebase Console -> Project Settings -> General -> Your Apps) and save it as `old-firebase-config.json` in the root folder. Then run:

```bash
# Export all collections and subcollections into a structured JSON backup
node scripts/migrate-firebase-data.js --mode=export --source-config=./old-firebase-config.json --output=./firestore-backup.json
```

#### Step 2: Test / Dry-Run into the Target Project
Simulate the migration to verify document parsing and subcollection mappings without committing writes:

```bash
# Dry-run validation against target project (just1play)
node scripts/migrate-firebase-data.js --mode=import --input=./firestore-backup.json --dry-run
```

#### Step 3: Execute Production Import
Write the data to the production Firestore database in transactional batches (up to 400 docs/batch):

```bash
# Live import
node scripts/migrate-firebase-data.js --mode=import --input=./firestore-backup.json --target-config=./firebase-applet-config.json
```

#### Step 4: (Optional) Migrate Specific Collections Only
To import specific collections (e.g. only `athletes`, `users`, and `tournaments`):

```bash
node scripts/migrate-firebase-data.js --mode=import --input=./firestore-backup.json --collections=users,athletes,tournaments,games
```

---

### ☁️ Option B: Google Cloud Native Managed Export & Import

For high-volume production datasets (millions of documents), use Google Cloud CLI (`gcloud`):

#### 1. Export Firestore from Old Project to Cloud Storage:
```bash
# Set active project to old project
gcloud config set project [OLD_PROJECT_ID]

# Export all collections to an interim bucket
gcloud firestore export gs://[TEMP_TRANSFER_BUCKET]/firestore-export-$(date +%Y%m%d)
```

#### 2. Grant Permissions to the New Project's Service Agent:
Grant the Cloud Firestore Service Agent in `just1play` the `Storage Object Viewer` role on `gs://[TEMP_TRANSFER_BUCKET]`:

```bash
# Get project number for just1play (256996216773)
gsutil iam ch serviceAccount:service-256996216773@gcp-sa-firestore.iam.gserviceaccount.com:objectViewer gs://[TEMP_TRANSFER_BUCKET]
```

#### 3. Import Firestore into the `just1play` Project:
```bash
# Switch to production project
gcloud config set project just1play

# Execute import
gcloud firestore import gs://[TEMP_TRANSFER_BUCKET]/firestore-export-$(date +%Y%m%d)/
```

---

### 🔐 Option C: Firebase Auth Users & Storage Assets Migration

#### 1. Export & Import Firebase Authentication Users:
To preserve user passwords, UIDs, and Google provider linkages:

```bash
# Step 1: Export users from old project (requires Firebase CLI)
firebase login
firebase use [OLD_PROJECT_ID]
firebase auth:export users.json --format=json

# Step 2: Import users into production project (just1play26)
firebase use just1play26
firebase auth:import users.json --hash-algo=SCRYPT --rounds=8 --mem-cost=14
```

#### 2. Synchronize Cloud Storage Media (Photos, Highlight Reels, Albums):
Use `gcloud storage rsync` or `gsutil rsync` to mirror user assets from the old bucket to `just1play26.firebasestorage.app`:

```bash
# High-speed parallel recursive sync of all storage buckets
gsutil -m rsync -r -d gs://[OLD_STORAGE_BUCKET_NAME] gs://just1play26.firebasestorage.app
```

---

## 🛡️ Production Security Rules Verification

After data migration, ensure that security rules are actively deployed to the production database:

1. **Verify Security Rules**:
   - `firestore.rules` (Adheres to the strict Just1Play Access Control Contract)
   - `storage.rules` (Adheres to the image upload permissions and admin-only raw video policy)

2. **Deploy to Production via Firebase CLI**:
   ```bash
   firebase use just1play26
   firebase deploy --only firestore:rules,storage,firestore:indexes
   ```

---

## ✅ Post-Migration Checklist

- [x] `firebase-applet-config.json` points to `just1play26`
- [x] `src/lib/firebase.ts` connects to `just1play26` with IndexedDB multi-tab persistence
- [x] `src/services/firebaseStorage.ts` references `just1play26.firebasestorage.app`
- [x] Run `npm run test` or `npm run lint` to verify build stability
- [x] Test Google Sign-In on the live web preview
- [x] Verify Social Wall posts, media gallery images, tournaments, and bracket live updates
