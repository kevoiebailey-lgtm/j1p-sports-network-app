import { getStorage, FirebaseStorage } from 'firebase/storage';
import { app } from '../lib/firebase';

// Explicitly configure storage bucket URL to just1play26.firebasestorage.app
export const storageBucketName = 'just1play26.firebasestorage.app';

// Explicitly initialize Firebase Storage with the custom bucket URL
export const storage: FirebaseStorage = getStorage(app, "gs://just1play26.firebasestorage.app");

// Configure retry times for resilience during large (1GB+) file uploads
// Allow operations (e.g. metadata queries) up to 10 minutes retry window
storage.maxOperationRetryTime = 10 * 60 * 1000;

// Allow large resumable uploads up to 2 hours of upload retry time for slow or intermittent connections
storage.maxUploadRetryTime = 120 * 60 * 1000;

export default storage;

