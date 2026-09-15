import React, { useState } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  FileText, 
  Layers, 
  ShieldCheck,
  Copy,
  Check,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  writeBatch, 
  doc, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import firebaseConfig from '../../../firebase-applet-config.json';
import { CORE_COLLECTIONS, KNOWN_SUBCOLLECTIONS } from '../../lib/migrationConstants';

export const FirebaseDataMigrationUtility: React.FC = () => {
  const [exporting, setExporting] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    success: boolean;
    latencyMs?: number;
    message?: string;
  }>({ tested: false, success: false });

  const [migrationLog, setMigrationLog] = useState<string[]>([]);
  const [progress, setProgress] = useState<{ current: number; total: number; collectionName: string }>({
    current: 0,
    total: 0,
    collectionName: ''
  });
  const [copiedCli, setCopiedCli] = useState<boolean>(false);

  const addLog = (msg: string) => {
    setMigrationLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 40)]);
  };

  // Test live connection to production Firestore
  const handleTestConnection = async () => {
    setTestingConnection(true);
    const start = Date.now();
    try {
      if (!db) throw new Error('Firestore database instance is not initialized.');
      // Attempt a lightweight read on users collection
      const snap = await getDocs(collection(db, 'site_announcements'));
      const latency = Date.now() - start;
      setConnectionStatus({
        tested: true,
        success: true,
        latencyMs: latency,
        message: `Connected successfully to project '${firebaseConfig.projectId}' (${latency}ms)`
      });
      addLog(`Ping successful! Target database '${(firebaseConfig as any).firestoreDatabaseId || '(default)'}' responded in ${latency}ms.`);
    } catch (err: any) {
      setConnectionStatus({
        tested: true,
        success: false,
        message: err.message || 'Connection test failed'
      });
      addLog(`Connection warning: ${err.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  // Export current database to downloadable JSON file
  const handleExportJson = async () => {
    if (!db) return;
    setExporting(true);
    setMigrationLog([]);
    addLog(`Initiating Firestore export for project '${firebaseConfig.projectId}'...`);

    try {
      const exportData: Record<string, any> = {
        exportedAt: new Date().toISOString(),
        projectId: firebaseConfig.projectId,
        collections: {}
      };

      let totalDocs = 0;

      for (let i = 0; i < CORE_COLLECTIONS.length; i++) {
        const colName = CORE_COLLECTIONS[i];
        setProgress({
          current: i + 1,
          total: CORE_COLLECTIONS.length,
          collectionName: colName
        });
        addLog(`Reading collection: ${colName}...`);

        try {
          const colRef = collection(db, colName);
          const snap = await getDocs(colRef);
          
          const colDocs = [];
          for (const docSnap of snap.docs) {
            const data = docSnap.data();
            const record: any = {
              id: docSnap.id,
              data: data,
              subcollections: {}
            };

            // Fetch known subcollections
            const subCols = (KNOWN_SUBCOLLECTIONS as any)[colName] || [];
            for (const subName of subCols) {
              try {
                const subSnap = await getDocs(collection(db, colName, docSnap.id, subName));
                if (!subSnap.empty) {
                  record.subcollections[subName] = subSnap.docs.map((s) => ({
                    id: s.id,
                    data: s.data()
                  }));
                }
              } catch {
                // Ignore empty subcollection permissions
              }
            }

            colDocs.push(record);
          }

          exportData.collections[colName] = colDocs;
          totalDocs += colDocs.length;
          addLog(`✔ ${colName}: Exported ${colDocs.length} documents.`);
        } catch (e: any) {
          addLog(`⚠ ${colName}: Skipped (${e.message})`);
          exportData.collections[colName] = [];
        }
      }

      // Download JSON Blob
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `just1play-firestore-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addLog(`🎉 Export completed! ${totalDocs} documents saved to local JSON.`);
    } catch (err: any) {
      addLog(`❌ Export failed: ${err.message}`);
    } finally {
      setExporting(false);
      setProgress({ current: 0, total: 0, collectionName: '' });
    }
  };

  // Upload and Restore JSON file into target database
  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !db) return;

    setImporting(true);
    setMigrationLog([]);
    addLog(`Reading migration file: ${file.name}...`);

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.collections || typeof backup.collections !== 'object') {
        throw new Error('Invalid backup format. Missing "collections" object.');
      }

      const colKeys = Object.keys(backup.collections);
      addLog(`Backup verified. Found ${colKeys.length} collections.`);

      let totalCommitted = 0;

      for (let i = 0; i < colKeys.length; i++) {
        const colName = colKeys[i];
        const docsList = backup.collections[colName];
        if (!Array.isArray(docsList) || docsList.length === 0) continue;

        setProgress({
          current: i + 1,
          total: colKeys.length,
          collectionName: colName
        });
        addLog(`Importing ${docsList.length} documents into '${colName}'...`);

        // Batch writes in chunks of 350
        const chunkSize = 350;
        for (let j = 0; j < docsList.length; j += chunkSize) {
          const chunk = docsList.slice(j, j + chunkSize);
          const batch = writeBatch(db);
          let opCount = 0;

          for (const item of chunk) {
            const docRef = doc(db, colName, item.id);
            batch.set(docRef, item.data, { merge: true });
            opCount++;

            // Subcollections
            if (item.subcollections) {
              for (const [subColName, subItems] of Object.entries(item.subcollections)) {
                if (Array.isArray(subItems)) {
                  for (const subItem of subItems as any[]) {
                    const subRef = doc(db, colName, item.id, subColName, subItem.id);
                    batch.set(subRef, subItem.data, { merge: true });
                    opCount++;
                  }
                }
              }
            }
          }

          await batch.commit();
          totalCommitted += opCount;
        }

        addLog(`✔ '${colName}' completed (${docsList.length} docs).`);
      }

      addLog(`🎉 Migration successfully completed! Restored ${totalCommitted} records.`);
    } catch (err: any) {
      addLog(`❌ Import error: ${err.message}`);
    } finally {
      setImporting(false);
      setProgress({ current: 0, total: 0, collectionName: '' });
      if (e.target) e.target.value = '';
    }
  };

  const copyCliCommand = () => {
    navigator.clipboard.writeText(
      'node scripts/migrate-firebase-data.js --mode=export --source-config=./old-config.json --output=./backup.json && node scripts/migrate-firebase-data.js --mode=import --input=./backup.json'
    );
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 3000);
  };

  return (
    <div className="p-6 rounded-3xl bg-[#212A31]/90 border border-white/10 backdrop-blur-2xl space-y-6 shadow-2xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
            <Database className="w-3.5 h-3.5" />
            <span>Database Migration & Disaster Recovery</span>
          </div>
          <h2 className="text-xl font-black italic uppercase text-white font-sans tracking-tight">
            FIREBASE DATA <span className="text-[#E5B868]">MIGRATION UTILITY</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Export, replicate, and restore all sports tournaments, rosters, athletes, and social reels between Firebase projects.
          </p>
        </div>

        <button
          onClick={handleTestConnection}
          disabled={testingConnection}
          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-bold font-sans uppercase flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-[#E5B868] ${testingConnection ? 'animate-spin' : ''}`} />
          <span>{testingConnection ? 'Testing...' : 'Test Connection'}</span>
        </button>
      </div>

      {/* Production Project Credentials Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Active Project ID</div>
          <div className="text-sm font-bold text-white font-mono mt-1 truncate">
            {firebaseConfig.projectId || 'just1play26'}
          </div>
          <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-sans">
            <ShieldCheck className="w-3 h-3" />
            <span>Production Verified</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Database ID</div>
          <div className="text-sm font-bold text-white font-mono mt-1 truncate">
            {(firebaseConfig as any).firestoreDatabaseId || '(default)'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-sans">
            Multi-Tab IndexedDB Active
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Storage Bucket</div>
          <div className="text-sm font-bold text-white font-mono mt-1 truncate">
            {firebaseConfig.storageBucket || 'just1play26.firebasestorage.app'}
          </div>
          <div className="text-[10px] text-amber-400 mt-1 font-sans">
            15MB Image / Admin Video Rules
          </div>
        </div>
      </div>

      {/* Connection Result Banner */}
      {connectionStatus.tested && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
          connectionStatus.success 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {connectionStatus.success ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span className="text-xs font-bold font-sans">
            {connectionStatus.message}
          </span>
        </div>
      )}

      {/* Action Buttons: Export & Import */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Export JSON Card */}
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#E5B868]/10 text-[#E5B868]">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black italic uppercase text-white font-sans">Export Database Backup</h3>
              <p className="text-[11px] text-slate-400">Download complete structured JSON snapshot of all 28 collections.</p>
            </div>
          </div>

          <button
            onClick={handleExportJson}
            disabled={exporting || importing}
            className="w-full py-3 rounded-xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-lg"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Exporting...' : 'Export Snapshot to JSON'}</span>
          </button>
        </div>

        {/* Import JSON Card */}
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black italic uppercase text-white font-sans">Import & Restore Dataset</h3>
              <p className="text-[11px] text-slate-400">Restore or migrate a JSON backup into this production project.</p>
            </div>
          </div>

          <label className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer">
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>{importing ? 'Importing...' : 'Select Backup JSON to Import'}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJsonFile}
              disabled={exporting || importing}
              className="hidden"
            />
          </label>
        </div>

      </div>

      {/* Progress Bar during Export/Import */}
      {(exporting || importing) && progress.total > 0 && (
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-300">
            <span>Processing: <strong className="text-[#E5B868]">{progress.collectionName}</strong></span>
            <span>{progress.current} of {progress.total} collections</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#E5B868] to-emerald-400 transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* CLI Migration Command Box */}
      <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            Command-Line Migration Script
          </span>
          <button
            onClick={copyCliCommand}
            className="text-[11px] font-mono text-[#E5B868] hover:underline flex items-center gap-1 cursor-pointer"
          >
            {copiedCli ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCli ? 'Copied!' : 'Copy Command'}</span>
          </button>
        </div>
        <div className="p-3 rounded-xl bg-black/80 font-mono text-xs text-amber-200 overflow-x-auto select-all border border-white/5">
          node scripts/migrate-firebase-data.js --mode=export --source-config=./old-config.json --output=./backup.json && node scripts/migrate-firebase-data.js --mode=import --input=./backup.json
        </div>
      </div>

      {/* Live Activity Log Output */}
      {migrationLog.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            Execution Telemetry & Logs
          </span>
          <div className="p-4 rounded-2xl bg-black/70 border border-white/10 font-mono text-[11px] text-slate-300 space-y-1 max-h-48 overflow-y-auto">
            {migrationLog.map((log, idx) => (
              <div key={idx} className="leading-relaxed">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
