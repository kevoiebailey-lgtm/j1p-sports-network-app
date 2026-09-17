import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Plus, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  Share2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ShieldCheck, 
  LogOut, 
  Trophy, 
  Users, 
  MessageSquare, 
  ClipboardList,
  Eye,
  BarChart3,
  Copy,
  Sparkles,
  HelpCircle,
  ListPlus,
  Trash2
} from 'lucide-react';
import { BentoCard } from '../BentoCard';
import { 
  signInWithGoogleForms, 
  disconnectGoogleForms, 
  fetchDriveForms, 
  fetchFormDetail, 
  fetchFormResponses, 
  createNewForm, 
  DriveFormFile, 
  GoogleFormDetail, 
  GoogleFormResponse, 
  getFormsAccessToken 
} from '../../lib/googleFormsService';

export const GoogleFormsHub: React.FC = () => {
  const [token, setToken] = useState<string | null>(getFormsAccessToken());
  const [formsList, setFormsList] = useState<DriveFormFile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Form Detail & Responses View
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [selectedFormDetail, setSelectedFormDetail] = useState<GoogleFormDetail | null>(null);
  const [formResponses, setFormResponses] = useState<GoogleFormResponse[]>([]);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'responses' | 'questions'>('preview');

  // Create Form Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [questions, setQuestions] = useState<Array<{
    title: string;
    type: 'SHORT_TEXT' | 'PARAGRAPH' | 'MULTIPLE_CHOICE' | 'CHECKBOXES';
    options: string[];
    required: boolean;
  }>>([
    { title: 'Athlete Full Name', type: 'SHORT_TEXT', options: [], required: true },
    { title: 'Sport / Position', type: 'SHORT_TEXT', options: [], required: true },
    { title: 'Overall Performance Rating', type: 'MULTIPLE_CHOICE', options: ['5 - Exceptional', '4 - Great', '3 - Average', '2 - Needs Improvement'], required: true }
  ]);

  // Load Forms when token is available
  useEffect(() => {
    if (token) {
      loadForms(token);
    }
  }, [token]);

  const loadForms = async (authToken: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const files = await fetchDriveForms(authToken);
      setFormsList(files);
    } catch (err: any) {
      console.error('Forms load error:', err);
      setErrorMsg(err?.message || 'Failed to load Google Forms. Please verify account permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await signInWithGoogleForms();
      if (res?.accessToken) {
        setToken(res.accessToken);
        setSuccessMsg('Successfully connected Google Forms & Drive!');
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      console.error('Forms connect error:', err);
      setErrorMsg(err?.message || 'Failed to authenticate with Google Forms.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectGoogleForms();
    setToken(null);
    setFormsList([]);
    setSelectedFormId(null);
    setSelectedFormDetail(null);
    setFormResponses([]);
    setSuccessMsg('Disconnected Google Forms session.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleViewFormDetail = async (formId: string) => {
    if (!token) return;

    setSelectedFormId(formId);
    setLoadingDetail(true);
    setErrorMsg(null);
    setActiveTab('preview');

    try {
      const [detail, responses] = await Promise.all([
        fetchFormDetail(token, formId),
        fetchFormResponses(token, formId).catch(() => [])
      ]);

      setSelectedFormDetail(detail);
      setFormResponses(responses);
    } catch (err: any) {
      console.error('Form detail load error:', err);
      setErrorMsg(err?.message || 'Failed to load form responses/details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        title: `Question ${questions.length + 1}`,
        type: 'SHORT_TEXT',
        options: ['Option 1', 'Option 2'],
        required: true
      }
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !formTitle.trim()) return;

    setIsCreating(true);
    setErrorMsg(null);

    try {
      const newForm = await createNewForm(token, formTitle, formDescription, questions);
      setSuccessMsg(`Google Form "${formTitle}" created successfully!`);
      setShowCreateModal(false);
      setFormTitle('');
      setFormDescription('');
      setTimeout(() => setSuccessMsg(null), 4000);

      // Refresh list and select new form
      await loadForms(token);
      handleViewFormDetail(newForm.formId);
    } catch (err: any) {
      console.error('Create form error:', err);
      setErrorMsg(err?.message || 'Failed to create Google Form.');
    } finally {
      setIsCreating(false);
    }
  };

  // Preset Preset Creation Helper
  const handleQuickPresetCreate = async (presetType: 'registration' | 'feedback' | 'scout') => {
    if (!token) return;

    setIsCreating(true);
    setErrorMsg(null);

    try {
      let title = '';
      let description = '';
      let presetQuestions: typeof questions = [];

      if (presetType === 'registration') {
        title = 'Just1Play Athlete Official Registration & Waiver';
        description = 'Official player onboarding and liability waiver for Just1Play tournaments.';
        presetQuestions = [
          { title: 'Athlete Full Name', type: 'SHORT_TEXT', options: [], required: true },
          { title: 'Primary Sport & Position', type: 'SHORT_TEXT', options: [], required: true },
          { title: 'Emergency Contact Phone Number', type: 'SHORT_TEXT', options: [], required: true },
          { title: 'Jersey Size', type: 'MULTIPLE_CHOICE', options: ['Youth L', 'Adult S', 'Adult M', 'Adult L', 'Adult XL'], required: true },
          { title: 'Medical / Liability Waiver Acknowledged', type: 'CHECKBOXES', options: ['I agree to all tournament safety regulations and terms.'], required: true }
        ];
      } else if (presetType === 'feedback') {
        title = 'Post-Game Coach & Player Feedback Survey';
        description = 'Provide feedback on venue quality, officiating, live streams, and scheduling.';
        presetQuestions = [
          { title: 'Game / Match ID or Teams', type: 'SHORT_TEXT', options: [], required: true },
          { title: 'How would you rate officiating quality?', type: 'MULTIPLE_CHOICE', options: ['5 - Excellent', '4 - Good', '3 - Average', '2 - Poor', '1 - Unacceptable'], required: true },
          { title: 'How was the venue facility quality?', type: 'MULTIPLE_CHOICE', options: ['5 - Excellent', '4 - Good', '3 - Average', '2 - Poor'], required: true },
          { title: 'Additional Comments or Improvements', type: 'PARAGRAPH', options: [], required: false }
        ];
      } else if (presetType === 'scout') {
        title = 'College Scout & Recruiter Evaluation Form';
        description = 'Evaluate athlete athletic performance, football/basketball IQ, speed, and potential.';
        presetQuestions = [
          { title: 'Scout / Evaluator Name & Organization', type: 'SHORT_TEXT', options: [], required: true },
          { title: 'Evaluated Athlete Name & Graduation Year', type: 'SHORT_TEXT', options: [], required: true },
          { title: 'Athletic Speed & Agility Rating', type: 'MULTIPLE_CHOICE', options: ['Division 1 FBS Prospect', 'Division 1 FCS Prospect', 'Division 2 / NAIA Prospect', 'Developmental Prospect'], required: true },
          { title: 'Detailed Scouting Report & Notes', type: 'PARAGRAPH', options: [], required: true }
        ];
      }

      const created = await createNewForm(token, title, description, presetQuestions);
      setSuccessMsg(`Created preset form "${title}"!`);
      setTimeout(() => setSuccessMsg(null), 4000);

      await loadForms(token);
      handleViewFormDetail(created.formId);
    } catch (err: any) {
      console.error('Preset create error:', err);
      setErrorMsg(err?.message || 'Failed to create preset form.');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccessMsg('Copied form link to clipboard!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Filtered list
  const filteredForms = formsList.filter((f) =>
    (f.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#212A31] via-[#212A31] to-[#212A31] border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E5B868]/10 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E5B868]/10 border border-[#E5B868]/30 text-[#E5B868] text-xs font-mono font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Official Google Workspace Integration</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight flex items-center gap-3">
              <FileText className="w-8 h-8 text-[#E5B868]" />
              <span>Google Forms Hub</span>
            </h1>

            <p className="text-slate-400 text-sm max-w-xl">
              Create, manage, and track real-time responses for athlete registrations, post-game feedback, scout evaluations, and tournament surveys.
            </p>
          </div>

          {/* AUTH STATUS ACTION BUTTONS */}
          <div className="shrink-0 flex items-center gap-3">
            {token ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#E5B868] text-black font-black text-xs uppercase tracking-wider hover:bg-[#B8141B] transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(214,28,36,0.4)] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Form</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="p-2.5 rounded-xl bg-[#212A31] border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all cursor-pointer"
                  title="Disconnect Google Forms"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                disabled={loading}
                className="gsi-material-button hover:scale-105 transition-transform cursor-pointer"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">Sign in with Google</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* NOTIFICATIONS & MESSAGES */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-950/80 border border-red-800/80 text-red-200 text-sm font-medium flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-[#E5B868]/40 text-[#E5B868] text-sm font-medium flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#E5B868] shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-[#E5B868] hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MAIN CONTENT */}
      {!token ? (
        <BentoCard className="p-12 text-center space-y-6 max-w-2xl mx-auto bg-[#212A31]/80 border-slate-800">
          <div className="w-20 h-20 rounded-3xl bg-[#E5B868]/10 text-[#E5B868] border border-[#E5B868]/30 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(214,28,36,0.2)]">
            <FileText className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white uppercase tracking-wide">
              Connect Google Forms & Drive
            </h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Grant Just1Play permissions to create Google Forms, distribute surveys to athletes and parents, and gather live responses seamlessly.
            </p>
          </div>

          <button
            type="button"
            onClick={handleConnect}
            disabled={loading}
            className="gsi-material-button mx-auto hover:scale-105 transition-transform cursor-pointer"
          >
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents">Sign in with Google</span>
            </div>
          </button>
        </BentoCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT SIDEBAR: FORMS LIST & PRESETS */}
          <div className="space-y-6 lg:col-span-1">
            {/* PRESET QUICK-CREATE CARDS */}
            <div className="bg-[#212A31] p-5 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E5B868]" />
                <h3 className="text-xs font-mono font-black text-white uppercase tracking-wider">
                  Sports Form Presets
                </h3>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleQuickPresetCreate('registration')}
                  disabled={isCreating}
                  className="w-full text-left p-3 rounded-2xl bg-[#212A31] hover:bg-slate-800 border border-slate-800 hover:border-[#E5B868] transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white group-hover:text-[#E5B868] transition-colors">
                      Athlete Registration & Waiver
                    </div>
                    <div className="text-[10px] text-slate-400">Player onboarding + liability terms</div>
                  </div>
                  <Plus className="w-4 h-4 text-slate-500 group-hover:text-[#E5B868]" />
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickPresetCreate('feedback')}
                  disabled={isCreating}
                  className="w-full text-left p-3 rounded-2xl bg-[#212A31] hover:bg-slate-800 border border-slate-800 hover:border-[#E5B868] transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white group-hover:text-[#E5B868] transition-colors">
                      Post-Game Feedback Survey
                    </div>
                    <div className="text-[10px] text-slate-400">Officiating & facility evaluations</div>
                  </div>
                  <Plus className="w-4 h-4 text-slate-500 group-hover:text-[#E5B868]" />
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickPresetCreate('scout')}
                  disabled={isCreating}
                  className="w-full text-left p-3 rounded-2xl bg-[#212A31] hover:bg-slate-800 border border-slate-800 hover:border-[#E5B868] transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white group-hover:text-[#E5B868] transition-colors">
                      College Scout Evaluation
                    </div>
                    <div className="text-[10px] text-slate-400">Recruiter notes & rating scale</div>
                  </div>
                  <Plus className="w-4 h-4 text-slate-500 group-hover:text-[#E5B868]" />
                </button>
              </div>
            </div>

            {/* MY GOOGLE FORMS LIST */}
            <div className="bg-[#212A31] p-5 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-[#E5B868]" />
                  <h3 className="text-xs font-mono font-black text-white uppercase tracking-wider">
                    My Google Forms ({filteredForms.length})
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => loadForms(token)}
                  disabled={loading}
                  className="p-1.5 rounded-lg bg-[#212A31] text-slate-400 hover:text-white cursor-pointer"
                  title="Refresh Forms"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#E5B868]' : ''}`} />
                </button>
              </div>

              {/* SEARCH */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search forms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#212A31] border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#E5B868]"
                />
              </div>

              {/* LIST */}
              {loading ? (
                <div className="py-8 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-[#E5B868] animate-spin mx-auto" />
                  <p className="text-[11px] text-slate-400">Loading Google Forms...</p>
                </div>
              ) : filteredForms.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 space-y-2">
                  <p>No Google Forms found in Google Drive.</p>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="text-[#E5B868] hover:underline font-bold"
                  >
                    Create a new form
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredForms.map((file) => {
                    const isSelected = selectedFormId === file.id;
                    return (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => handleViewFormDetail(file.id)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-[#E5B868]/10 border-[#E5B868] text-white'
                            : 'bg-[#212A31]/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="text-xs font-bold truncate">{file.name}</div>
                          {file.modifiedTime && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              Modified: {new Date(file.modifiedTime).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        <div className="shrink-0">
                          <Eye className={`w-4 h-4 ${isSelected ? 'text-[#E5B868]' : 'text-slate-500'}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT VIEW: SELECTED FORM DETAIL / RESPONSES / PREVIEW */}
          <div className="lg:col-span-2">
            {!selectedFormId ? (
              <BentoCard className="p-12 text-center space-y-4 bg-[#212A31]/60 border-slate-800 h-full flex flex-col items-center justify-center">
                <FileText className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-lg font-bold text-slate-300">Select or Create a Google Form</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Choose a form from the left sidebar to view its live responses, embed the form, or share the respondent link with athletes and scouts.
                </p>
              </BentoCard>
            ) : loadingDetail ? (
              <BentoCard className="p-12 text-center space-y-3 bg-[#212A31] border-slate-800 h-full flex flex-col items-center justify-center">
                <RefreshCw className="w-8 h-8 text-[#E5B868] animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-mono">Loading form structure & responses...</p>
              </BentoCard>
            ) : selectedFormDetail ? (
              <div className="bg-[#212A31] rounded-3xl border border-slate-800 p-6 space-y-6">
                {/* DETAIL HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                  <div className="space-y-1">
                    <h2 className="text-xl font-extrabold text-white">
                      {selectedFormDetail.info.title}
                    </h2>
                    {selectedFormDetail.info.description && (
                      <p className="text-xs text-slate-400 max-w-lg">
                        {selectedFormDetail.info.description}
                      </p>
                    )}
                  </div>

                  {/* QUICK ACTIONS */}
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedFormDetail.responderUri && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedFormDetail.responderUri!)}
                        className="px-3 py-1.5 rounded-xl bg-[#212A31] hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                        title="Copy Form Submission Link"
                      >
                        <Copy className="w-3.5 h-3.5 text-[#E5B868]" />
                        <span>Copy Link</span>
                      </button>
                    )}

                    {selectedFormDetail.responderUri && (
                      <a
                        href={selectedFormDetail.responderUri}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-[#E5B868] text-black font-extrabold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-[#B8141B]"
                      >
                        <span>Open Form</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* VIEW TAB SWITCHER */}
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'preview'
                        ? 'bg-[#E5B868] text-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Embedded Form</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('responses')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'responses'
                        ? 'bg-[#E5B868] text-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Responses ({formResponses.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('questions')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'questions'
                        ? 'bg-[#E5B868] text-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Questions ({selectedFormDetail.items?.length || 0})</span>
                  </button>
                </div>

                {/* TAB CONTENT: EMBEDDED PREVIEW */}
                {activeTab === 'preview' && (
                  <div className="space-y-4">
                    {selectedFormDetail.responderUri ? (
                      <div className="w-full h-[650px] rounded-2xl overflow-hidden border border-slate-800 bg-white">
                        <iframe
                          src={selectedFormDetail.responderUri}
                          className="w-full h-full border-none"
                          title="Google Form Embed"
                        />
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-500">
                        Responder URI not available for this form.
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: RESPONSES */}
                {activeTab === 'responses' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-[#212A31] border border-slate-800">
                      <span className="text-xs text-slate-400">Total Form Submissions</span>
                      <span className="text-2xl font-black text-[#E5B868] font-mono">
                        {formResponses.length}
                      </span>
                    </div>

                    {formResponses.length === 0 ? (
                      <div className="p-12 text-center text-xs text-slate-500 bg-[#212A31]/50 rounded-2xl border border-slate-800">
                        No submissions recorded for this form yet. Share the respondent link to collect feedback.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                        {formResponses.map((resp, idx) => (
                          <div
                            key={resp.responseId || idx}
                            className="p-4 rounded-2xl bg-[#212A31] border border-slate-800 space-y-3"
                          >
                            <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-slate-800">
                              <span>Submission #{idx + 1}</span>
                              <span>{new Date(resp.createTime).toLocaleString()}</span>
                            </div>

                            <div className="space-y-2">
                              {resp.answers &&
                                Object.entries(resp.answers).map(([qId, ans]) => {
                                  const questionItem = selectedFormDetail.items?.find(
                                    (it) => it.questionItem?.question?.questionId === qId
                                  );
                                  const qTitle = questionItem?.title || `Question ID: ${qId}`;
                                  const val = ans.textAnswers?.answers?.map((a) => a.value).join(', ') || 'No answer';

                                  return (
                                    <div key={qId} className="space-y-0.5 text-xs">
                                      <div className="font-bold text-slate-300">{qTitle}</div>
                                      <div className="text-slate-400 font-mono bg-[#212A31] p-2 rounded-xl border border-slate-800/80">
                                        {val}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: QUESTIONS */}
                {activeTab === 'questions' && (
                  <div className="space-y-3">
                    {(!selectedFormDetail.items || selectedFormDetail.items.length === 0) ? (
                      <div className="p-8 text-center text-xs text-slate-500 bg-[#212A31]/50 rounded-2xl">
                        No questions defined in this form.
                      </div>
                    ) : (
                      selectedFormDetail.items.map((item, idx) => (
                        <div
                          key={item.itemId || idx}
                          className="p-4 rounded-2xl bg-[#212A31] border border-slate-800 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">
                              {idx + 1}. {item.title}
                            </span>
                            {item.questionItem?.question?.required && (
                              <span className="text-[10px] font-mono text-red-400 uppercase font-bold">
                                Required
                              </span>
                            )}
                          </div>

                          {item.questionItem?.question?.choiceQuestion && (
                            <div className="pl-4 space-y-1 text-slate-400">
                              {item.questionItem.question.choiceQuestion.options.map((opt, oIdx) => (
                                <div key={oIdx} className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-slate-700" />
                                  <span>{opt.value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* CREATE FORM MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#212A31] border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#E5B868]" />
                  <span>Create Custom Google Form</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Build a Google Form with custom questions directly in Just1Play.
                </p>
              </div>

              <form onSubmit={handleCreateForm} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase">Form Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2026 High School Flag Football Tryout Form"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-[#212A31] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5B868]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase">Form Description</label>
                  <textarea
                    rows={2}
                    placeholder="Brief instructions for respondents..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full bg-[#212A31] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5B868]"
                  />
                </div>

                {/* QUESTIONS BUILDER */}
                <div className="space-y-3 pt-2 border-t border-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#E5B868] uppercase">
                      Questions ({questions.length})
                    </span>

                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="text-xs text-[#E5B868] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ListPlus className="w-3.5 h-3.5" />
                      <span>Add Question</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {questions.map((q, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-[#212A31] border border-slate-800 space-y-3 relative">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-400">Question #{idx + 1}</span>
                          {questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(idx)}
                              className="text-slate-500 hover:text-red-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="space-y-1">
                          <input
                            type="text"
                            required
                            placeholder="Question Prompt"
                            value={q.title}
                            onChange={(e) => {
                              const updated = [...questions];
                              updated[idx].title = e.target.value;
                              setQuestions(updated);
                            }}
                            className="w-full bg-[#212A31] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#E5B868]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={q.type}
                            onChange={(e) => {
                              const updated = [...questions];
                              updated[idx].type = e.target.value as any;
                              setQuestions(updated);
                            }}
                            className="bg-[#212A31] border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-[#E5B868]"
                          >
                            <option value="SHORT_TEXT">Short Text</option>
                            <option value="PARAGRAPH">Paragraph</option>
                            <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                            <option value="CHECKBOXES">Checkboxes</option>
                          </select>

                          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pl-2">
                            <input
                              type="checkbox"
                              checked={q.required}
                              onChange={(e) => {
                                const updated = [...questions];
                                updated[idx].required = e.target.checked;
                                setQuestions(updated);
                              }}
                              className="accent-[#E5B868]"
                            />
                            <span>Required</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl bg-[#212A31] border border-slate-800 text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-5 py-2 rounded-xl bg-[#E5B868] text-black font-black text-xs uppercase hover:bg-[#B8141B] transition-colors cursor-pointer flex items-center gap-2"
                  >
                    {isCreating ? 'Creating in Google...' : 'Create Form'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GoogleFormsHub;
