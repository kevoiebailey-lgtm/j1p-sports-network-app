import React, { useState } from 'react';
import { UploadCloud, Loader2, ShieldCheck, CheckCircle2, AlertCircle, Calendar, Trophy, Zap, Tag } from 'lucide-react';
import { createAlbumWithBulkUpload } from '../../services/galleryService';
import { useAuth } from '../../context/AuthContext';
import { SportSelector } from '../Common/SportSelector';

const EVENT_TYPES = [
  { id: 'High School Game', label: 'High School Game', icon: '🏈' },
  { id: 'Regular Matchup', label: 'Regular Matchup', icon: '⚡' },
  { id: 'Tournament', label: 'Tournament', icon: '🏆' },
  { id: 'Combine / Showcase', label: 'Combine / Showcase', icon: '🎯' },
  { id: 'Team Portraits', label: 'Team Portraits', icon: '📸' },
  { id: 'Practice / Camp', label: 'Practice / Camp', icon: '📋' }
];

export const AdminBulkUploadForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const { user, profile } = useAuth();

  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('High School Game');
  const [eventName, setEventName] = useState('');
  const [category, setCategory] = useState("Football");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [watermarkStyle, setWatermarkStyle] = useState<'full_protection' | 'badge' | 'none'>('badge');
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<{
    completed: number;
    total: number;
    percentage: number;
    currentFileName?: string;
  }>({ completed: 0, total: 0, percentage: 0 });
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
      setUploadError(null);
    }
  };

  const handleStartBulkUpload = async () => {
    if (!title.trim() || selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    setProgress({ completed: 0, total: selectedFiles.length, percentage: 0 });

    try {
      const fullDescription = description.trim() 
        ? description.trim() 
        : `${eventType} photo coverage${eventName ? ` - ${eventName}` : ''}.`;

      const result = await createAlbumWithBulkUpload(
        { 
          title: title.trim(), 
          category, 
          eventDate, 
          description: fullDescription,
          createdBy: user?.uid || profile?.uid || 'admin'
        },
        selectedFiles,
        (completed, total, percentage, currentFileName) => {
          setProgress({ completed, total, percentage, currentFileName });
        },
        {
          watermark: watermarkStyle !== 'none',
          style: watermarkStyle === 'none' ? 'full_protection' : watermarkStyle
        }
      );

      setIsUploading(false);
      if (result.totalUploaded > 0) {
        onSuccess();
      } else {
        setUploadError("Could not save photos. Please check your network connection and try again.");
      }
    } catch (error: any) {
      console.error('Bulk Upload Error:', error);
      setUploadError(error.message || 'An error occurred during bulk photo upload.');
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs text-white">
      {uploadError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span className="text-[11px] leading-relaxed">{uploadError}</span>
        </div>
      )}

      {/* Event Type Quick Selector */}
      <div>
        <label className="text-[10px] text-slate-400 uppercase block mb-1.5 font-bold">
          Event / Game Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {EVENT_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              disabled={isUploading}
              onClick={() => {
                setEventType(type.id);
                if (!title) {
                  if (type.id === 'High School Game') setTitle('Varsity Football: Friday Night Lights');
                  else if (type.id === 'Regular Matchup') setTitle('High School Basketball Game');
                }
              }}
              className={`p-2 rounded-xl text-[11px] font-bold text-left transition-all border flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                eventType === type.id
                  ? 'bg-[#E5B868]/20 text-[#E5B868] border-[#E5B868] shadow-[0_0_10px_rgba(229,184,104,0.3)]'
                  : 'bg-[#212A31] text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              <span>{type.icon}</span>
              <span className="truncate">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] text-slate-400 uppercase block mb-1">
          Album / Event Name *
        </label>
        <input
          type="text"
          placeholder="e.g., Lincoln High vs Oak Ridge Football or Friday Night Basketball"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isUploading}
          className="w-full bg-[#212A31] border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-[#E5B868] disabled:opacity-60"
        />
        <span className="text-[10px] text-slate-500 block mt-1">
          Albums can be for any event — regular season games, high school matchups, showcases, or tournaments.
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <SportSelector
            label="Sport / Category"
            value={category}
            onChange={(newSport) => setCategory(newSport)}
            allowCustom={true}
          />
        </div>

        <div>
          <label className="text-[10px] text-slate-400 uppercase block mb-1">Event Date</label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            disabled={isUploading}
            className="w-full bg-[#212A31] border border-slate-800 rounded-xl p-3 text-white outline-none disabled:opacity-60"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-slate-400 uppercase block mb-1">
          Event Details / Description (Optional)
        </label>
        <textarea
          rows={2}
          placeholder="e.g., Varsity 4th quarter highlights, senior night ceremony, team showcase..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isUploading}
          className="w-full bg-[#212A31] border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-[#E5B868] disabled:opacity-60"
        />
      </div>

      {/* AUTOMATIC WATERMARK PROTECTION SELECTOR */}
      <div className="p-3.5 rounded-2xl bg-[#212A31] border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-[#E5B868] uppercase flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Just1Play Content Protection Watermark</span>
          </label>
          <span className="text-[9px] text-slate-400 font-mono">Auto-applied in bulk</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => setWatermarkStyle('full_protection')}
            className={`p-2 rounded-xl text-[10px] font-bold uppercase transition-all border text-center cursor-pointer disabled:opacity-50 ${
              watermarkStyle === 'full_protection'
                ? 'bg-[#E5B868]/20 text-[#E5B868] border-[#E5B868] shadow-[0_0_10px_rgba(229,184,104,0.3)]'
                : 'bg-[#212A31] text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            Full (Badge + Grid)
          </button>

          <button
            type="button"
            disabled={isUploading}
            onClick={() => setWatermarkStyle('badge')}
            className={`p-2 rounded-xl text-[10px] font-bold uppercase transition-all border text-center cursor-pointer disabled:opacity-50 ${
              watermarkStyle === 'badge'
                ? 'bg-[#E5B868]/20 text-[#E5B868] border-[#E5B868] shadow-[0_0_10px_rgba(229,184,104,0.3)]'
                : 'bg-[#212A31] text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            Corner Badge
          </button>

          <button
            type="button"
            disabled={isUploading}
            onClick={() => setWatermarkStyle('none')}
            className={`p-2 rounded-xl text-[10px] font-bold uppercase transition-all border text-center cursor-pointer disabled:opacity-50 ${
              watermarkStyle === 'none'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                : 'bg-[#212A31] text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            No Watermark
          </button>
        </div>
      </div>

      {/* DRAG AND DROP FILE INPUT */}
      <div className={`border-2 border-dashed border-slate-800 hover:border-[#E5B868] rounded-2xl p-6 text-center bg-[#212A31] transition-colors relative cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
        <input
          type="file"
          multiple
          accept="image/*"
          disabled={isUploading}
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <UploadCloud className="w-8 h-8 text-[#E5B868] mx-auto mb-2" />
        <span className="text-white font-bold block text-sm">Tap or Drag Game Photos Here</span>
        <span className="text-[10px] text-slate-500 block mt-1">
          Select all photos at once (supports 50+ photos). Concurrency-controlled with verified Firebase sync.
        </span>
        {selectedFiles.length > 0 && (
          <span className="inline-block mt-3 bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/40 px-3 py-1 rounded-full font-bold">
            {selectedFiles.length} Photos Selected
          </span>
        )}
      </div>

      {/* PROGRESS BAR */}
      {isUploading && (
        <div className="bg-[#212A31] p-4 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-[#E5B868] font-bold flex items-center gap-1.5 truncate max-w-[70%]">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span className="truncate">
                {progress.currentFileName ? `Uploading ${progress.currentFileName}...` : 'Processing & Syncing Photos...'}
              </span>
            </span>
            <span className="text-white font-bold">{progress.percentage}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#E5B868] transition-all duration-200"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono">
            <span>Concurrency Queue: Active</span>
            <span>Saved {progress.completed} of {progress.total} photos to Firebase</span>
          </div>
        </div>
      )}

      {/* SUBMIT BUTTON */}
      <button
        type="button"
        disabled={isUploading || selectedFiles.length === 0 || !title.trim()}
        onClick={handleStartBulkUpload}
        className="w-full bg-[#E5B868] disabled:bg-slate-800 disabled:text-slate-600 hover:bg-[#B8141B] text-black font-extrabold py-3.5 rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(229,184,104,0.3)] flex items-center justify-center gap-2"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-black" />
            <span>Syncing Photos to Firebase ({progress.completed}/{progress.total})...</span>
          </>
        ) : (
          <span>Create Album with Bulk Upload ({selectedFiles.length} Photos)</span>
        )}
      </button>
    </div>
  );
};

