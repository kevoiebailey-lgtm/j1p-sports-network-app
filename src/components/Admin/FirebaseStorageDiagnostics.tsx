import React, { useState } from 'react';
import { ref, uploadBytesResumable, deleteObject, getDownloadURL } from 'firebase/storage';
import { 
  Database, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  RefreshCw, 
  HardDrive, 
  Copy, 
  Check, 
  Terminal,
  ExternalLink,
  ShieldAlert,
  Server,
  Zap
} from 'lucide-react';
import { storage } from '../../services/firebaseStorage';
import firebaseConfig from '../../../firebase-applet-config.json';
import { useAuth } from '../../context/AuthContext';

export const FirebaseStorageDiagnostics: React.FC = () => {
  const { user, profile, role } = useAuth();

  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message: string;
    code?: string;
    details?: string;
    latencyMs?: number;
  }>({ status: 'idle', message: '' });

  const [copiedCors, setCopiedCors] = useState<boolean>(false);
  const [copiedRules, setCopiedRules] = useState<boolean>(false);

  const bucketName = firebaseConfig.storageBucket || 'just1play26.firebasestorage.app';
  const projectId = firebaseConfig.projectId || 'just1play26';

  const runStorageDiagnostic = async () => {
    setTesting(true);
    setTestResult({ status: 'idle', message: 'Initiating Firebase Storage test...' });
    const startTime = Date.now();

    try {
      // 1. Create a tiny test blob
      const testBlob = new Blob(['JUST1PLAY_STORAGE_DIAGNOSTIC_PING_' + Date.now()], { type: 'text/plain' });
      const testPath = `AdminVideos/_diagnostic_test_${Date.now()}.txt`;
      const testRef = ref(storage, testPath);

      // 2. Test Resumable Upload
      const uploadTask = uploadBytesResumable(testRef, testBlob, {
        contentType: 'text/plain'
      });

      uploadTask.on(
        'state_changed',
        () => {},
        (err: any) => {
          const latency = Date.now() - startTime;
          console.error('Storage Diagnostic Test Error:', err);

          let errorDetails = '';
          if (err.code === 'storage/unauthorized') {
            errorDetails = 'Security Rules Permission Denied: The Storage rules on bucket ' + bucketName + ' are blocking writes to the AdminVideos path for UID: ' + (user?.uid || 'anonymous');
          } else if (err.code === 'storage/retry-limit-exceeded' || err.message?.includes('CORS') || err.message?.includes('Failed to fetch')) {
            errorDetails = 'CORS / Network Error: Browser request was blocked or timed out. Browser resumable uploads for 1GB+ files require CORS headers configured on bucket gs://' + bucketName;
          } else {
            errorDetails = `Firebase Error (${err.code || 'unknown'}): ${err.message || 'Failed to complete storage test write.'}`;
          }

          setTestResult({
            status: 'error',
            message: 'Write Test Failed',
            code: err.code || 'storage/write_failed',
            details: errorDetails,
            latencyMs: latency
          });
          setTesting(false);
        },
        async () => {
          const latency = Date.now() - startTime;
          try {
            // Verify URL generation
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

            // Clean up test file
            await deleteObject(testRef).catch(() => {});

            setTestResult({
              status: 'success',
              message: 'Storage Write Permission & Upload Verified!',
              details: `Successfully wrote and verified test reference on bucket ${bucketName} in ${latency}ms. Security rules accept writes to AdminVideos/ path.`,
              latencyMs: latency
            });
          } catch (cleanErr: any) {
            setTestResult({
              status: 'success',
              message: 'Storage Write Verified (Cleanup warning)',
              details: `Test upload succeeded in ${latency}ms, but cleanup ping returned: ${cleanErr.message}`,
              latencyMs: latency
            });
          }
          setTesting(false);
        }
      );
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: 'Failed to initialize Storage Test',
        code: err.code || 'init_error',
        details: err.message || 'An unexpected error occurred while starting test.'
      });
      setTesting(false);
    }
  };

  const corsJsonSnippet = JSON.stringify([
    {
      "origin": ["*"],
      "method": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
      "responseHeader": ["Content-Type", "x-goog-resumable"],
      "maxAgeSeconds": 3600
    }
  ], null, 2);

  const rulesSnippet = `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /AdminVideos/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}`;

  const copyToClipboard = (text: string, type: 'cors' | 'rules') => {
    navigator.clipboard.writeText(text);
    if (type === 'cors') {
      setCopiedCors(true);
      setTimeout(() => setCopiedCors(false), 2500);
    } else {
      setCopiedRules(true);
      setTimeout(() => setCopiedRules(false), 2500);
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-[#212A31]/90 border border-white/10 backdrop-blur-2xl space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5B868]/10 border border-[#E5B868]/30 text-[#E5B868] text-xs font-mono font-bold uppercase tracking-wider mb-2">
            <Server className="w-3.5 h-3.5" />
            <span>FIREBASE STORAGE DIAGNOSTICS</span>
          </div>
          <h2 className="text-xl font-black italic uppercase text-white font-sans tracking-wide">
            STORAGE BUCKET <span className="text-[#E5B868]">& PERMISSIONS</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time permission audit & configuration test for 1GB+ admin video uploads.
          </p>
        </div>

        <button
          onClick={runStorageDiagnostic}
          disabled={testing}
          className="px-5 py-2.5 rounded-2xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(214,28,36,0.4)] transition-all cursor-pointer disabled:opacity-50"
        >
          {testing ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Zap className="w-4 h-4 fill-black" />}
          <span>{testing ? 'Testing Storage Write...' : 'Run Write Test'}</span>
        </button>
      </div>

      {/* Grid Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Bucket Name */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="text-[10px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-[#E5B868]" />
            <span>Active Storage Bucket</span>
          </div>
          <div className="text-xs font-mono font-bold text-white truncate" title={bucketName}>
            {bucketName}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            gs://{bucketName}
          </div>
        </div>

        {/* Firebase Project */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="text-[10px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-slate-300" />
            <span>Project ID</span>
          </div>
          <div className="text-xs font-mono font-bold text-white truncate" title={projectId}>
            {projectId}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Auth Domain: {firebaseConfig.authDomain}
          </div>
        </div>

        {/* Authenticated Admin Account */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="text-[10px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Admin Auth Context</span>
          </div>
          <div className="text-xs font-mono font-bold text-white truncate">
            {profile?.displayName || user?.displayName || 'Admin User'}
          </div>
          <div className="text-[10px] text-red-500 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            <span>UID: {user?.uid ? `${user.uid.slice(0, 10)}...` : 'Active'} ({role})</span>
          </div>
        </div>

      </div>

      {/* Diagnostic Result Output */}
      {testResult.status !== 'idle' && (
        <div className={`p-4 rounded-2xl border backdrop-blur-xl animate-fadeIn ${
          testResult.status === 'success' 
            ? 'bg-red-600/10 border-red-600/40 text-emerald-200' 
            : 'bg-rose-500/10 border-rose-500/40 text-rose-200'
        }`}>
          <div className="flex items-start gap-3">
            {testResult.status === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold font-mono uppercase tracking-wide">
                  {testResult.message}
                </span>
                {testResult.latencyMs && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 border border-white/15">
                    {testResult.latencyMs}ms
                  </span>
                )}
              </div>
              <p className="text-xs font-sans opacity-90 leading-relaxed">
                {testResult.details}
              </p>
              {testResult.code && (
                <div className="text-[10px] font-mono opacity-75 pt-1">
                  Error Code: <span className="font-bold underline">{testResult.code}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Troubleshooting Guide for 1GB+ Video Uploads */}
      <div className="space-y-4 border-t border-white/10 pt-4">
        <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#E5B868]" />
          <span>1GB+ VIDEO UPLOADS TROUBLESHOOTING CHECKLIST</span>
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs font-sans">
          
          {/* Step 1: Storage Rules */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white uppercase text-[11px] font-mono">
                1. Firebase Storage Security Rules
              </span>
              <button
                onClick={() => copyToClipboard(rulesSnippet, 'rules')}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer"
              >
                {copiedRules ? <Check className="w-3 h-3 text-[#E5B868]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedRules ? 'Copied' : 'Copy Rules'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Ensure write access is enabled for authenticated administrators under <code className="text-[#E5B868] font-mono">AdminVideos</code> path in Firebase Console &gt; Storage &gt; Rules.
            </p>
            <pre className="p-3 rounded-xl bg-black/80 border border-white/10 text-[10px] font-mono text-red-500 overflow-x-auto">
              {rulesSnippet}
            </pre>
          </div>

          {/* Step 2: Bucket CORS Configuration */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white uppercase text-[11px] font-mono">
                2. Browser CORS Headers (Required for 1GB+)
              </span>
              <button
                onClick={() => copyToClipboard(corsJsonSnippet, 'cors')}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer"
              >
                {copiedCors ? <Check className="w-3 h-3 text-[#E5B868]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCors ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Browsers perform multipart chunked uploads for large videos. Apply CORS to <code className="text-slate-300 font-mono">gs://{bucketName}</code> using Google Cloud Shell or Console:
            </p>
            <div className="p-3 rounded-xl bg-black/80 border border-white/10 text-[10px] font-mono text-cyan-300 overflow-x-auto space-y-2">
              <div># Run in Google Cloud Shell or terminal:</div>
              <div className="text-white font-bold select-all">
                gsutil cors set cors.json gs://{bucketName}
              </div>
            </div>
          </div>

        </div>

        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-slate-400 flex items-center justify-between gap-2">
          <span>Google Cloud Storage Console Link:</span>
          <a
            href={`https://console.cloud.google.com/storage/browser/${bucketName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#E5B868] hover:underline font-mono text-[10px] flex items-center gap-1 shrink-0"
          >
            <span>Open Storage Console</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

    </div>
  );
};
