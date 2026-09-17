// Just1Play Firebase Service Bridge - Standard (default) database
import { getFirestore } from 'firebase/firestore';
import app, {
  db,
  auth,
  storage,
  functions,
  getFirebaseMessaging,
  firebaseConfig,
  activeFirebaseConfig,
} from '../lib/firebase';

export {
  app,
  db,
  auth,
  storage,
  functions,
  getFirebaseMessaging,
  firebaseConfig,
  activeFirebaseConfig,
  getFirestore,
};

export default app;
