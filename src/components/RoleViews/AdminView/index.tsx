import { lazyWithRetry } from '../../../lib/lazyWithRetry';

/**
 * Standard relative dynamic import for AdminMasterCommandTab.
 * Prevents raw path fetching (/src/...) and ensures Vite resolves to production chunk.
 */
export const AdminMasterCommandTab = lazyWithRetry(
  () => import('./AdminMasterCommandTab').then(m => ({ default: m.default || m.AdminMasterCommandTab }))
);

export default AdminMasterCommandTab;

export * from './AdminFinancialsTab';
export * from './AdminModerationTab';
export * from './AdminOperationsLedgerTab';
export * from './AdminUserHubTab';
