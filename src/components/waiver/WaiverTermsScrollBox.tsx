import React, { useRef, useState, useEffect } from 'react';
import { ShieldCheck, FileText, ChevronDown, CheckCircle2, Eye } from 'lucide-react';

interface WaiverTermsScrollBoxProps {
  onScrollToBottom?: () => void;
  teamName?: string;
  sport?: string;
  className?: string;
}

export const WaiverTermsScrollBox: React.FC<WaiverTermsScrollBoxProps> = ({
  onScrollToBottom,
  teamName = 'the athletic club',
  sport = 'Athletics',
  className = '',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [scrollPercentage, setScrollPercentage] = useState(0);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const maxScroll = scrollHeight - clientHeight;
    const currentPercent = maxScroll > 0 ? Math.min(100, Math.round((scrollTop / maxScroll) * 100)) : 100;
    setScrollPercentage(currentPercent);

    if (scrollTop + clientHeight >= scrollHeight - 20 && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
      onScrollToBottom?.();
    }
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight) {
      setHasScrolledToBottom(true);
      setScrollPercentage(100);
      onScrollToBottom?.();
    }
  }, [onScrollToBottom]);

  const scrollToBottom = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: 'smooth',
    });
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Header with reading progress */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
          <FileText className="w-4 h-4 text-[#FF6A00]" />
          <span>Compliance & Legal Terms</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {scrollPercentage}% Read
          </span>
          {hasScrolledToBottom ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              Reviewed
            </span>
          ) : (
            <button
              type="button"
              id="scroll-to-bottom-btn"
              onClick={scrollToBottom}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-[#FF6A00] dark:hover:text-[#FF6A00] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span>Scroll to end</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="max-h-64 sm:max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed shadow-inner space-y-4"
      >
        {/* Notice Banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px]">
          <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p>
            Please carefully read all four compliance sections below. Participation in {teamName} activities and Just1Play events requires acceptance of these terms.
          </p>
        </div>

        {/* Section 1 */}
        <section className="space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-xs">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#FF6A00]/10 text-[#FF6A00] text-[11px]">1</span>
            <h4>Youth Sports Participation & General Liability Release</h4>
          </div>
          <p>
            In consideration of being permitted to participate in any way in athletic activities, practices, games, tournaments, combines, or showcases conducted by <strong>{teamName}</strong> and hosted on the <strong>Just1Play</strong> platform, the undersigned acknowledges, appreciates, and agrees that:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-500 dark:text-slate-400">
            <li>
              The risk of injury from the activities involved in {sport} is significant, including the potential for permanent paralysis and death. While particular rules, equipment, and personal discipline may reduce this risk, the risk of serious injury does exist.
            </li>
            <li>
              I knowingly and freely assume all such risks, both known and unknown, even if arising from the negligence of the releasees or others, and assume full responsibility for participation.
            </li>
            <li>
              I, for myself and on behalf of my heirs, assigns, personal representatives, and next of kin, hereby release, indemnify, and hold harmless {teamName}, Just1Play LLC, their directors, coaches, officials, agents, and sponsoring organizations from any and all claims, demands, or liabilities.
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-xs">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#FF6A00]/10 text-[#FF6A00] text-[11px]">2</span>
            <h4>Concussion Safety Protocol & Head Injury Acknowledgment</h4>
          </div>
          <p>
            In accordance with state and national youth sports safety guidelines (including CDC HEADS UP protocols):
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-500 dark:text-slate-400">
            <li>
              A concussion is a brain injury that cannot be seen on standard X-rays or CT scans. Any bump, blow, or jolt to the head or body that causes the head and brain to move rapidly back and forth can cause a concussion.
            </li>
            <li>
              Athletes who exhibit signs, symptoms, or behaviors consistent with a concussion must be immediately removed from the practice or competition and may not return until cleared by a licensed healthcare professional trained in concussion evaluation and management.
            </li>
            <li>
              I acknowledge receipt of this concussion protocol and commit to reporting any head impact, dizziness, headache, or disorientation immediately to team coaching and medical staff.
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-xs">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#FF6A00]/10 text-[#FF6A00] text-[11px]">3</span>
            <h4>Just1Play Media, Photo, Video & Live Stream Release</h4>
          </div>
          <p>
            Just1Play provides high-definition tournament broadcast streaming, digital media vaults, college recruiting reels, and sideline photography:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-500 dark:text-slate-400">
            <li>
              I grant permission to Just1Play and its verified media creators, photographers, and broadcast partners to film, photograph, and record the participating athlete during scheduled games, combines, and events.
            </li>
            <li>
              I authorize the reproduction, publication, live broadcast streaming, and distribution of such photographs and videos on the Just1Play platform, highlight reels, recruitment portals, and official team social channels.
            </li>
            <li>
              I understand that game films and photographs are curated to support athlete recruiting and scouting exposure.
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-xs">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#FF6A00]/10 text-[#FF6A00] text-[11px]">4</span>
            <h4>Emergency Medical Treatment Consent</h4>
          </div>
          <p>
            In the event of an emergency where parents or emergency contacts cannot be promptly reached, I hereby grant permission to the coaching staff, certified athletic trainers, tournament directors, and licensed medical personnel to administer first aid, arrange medical transportation, and authorize necessary medical treatments.
          </p>
        </section>

        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Just1Play Digital Compliance Engine • Standard Youth Athletic Protocol (v2026.1)</span>
        </div>
      </div>
    </div>
  );
};
