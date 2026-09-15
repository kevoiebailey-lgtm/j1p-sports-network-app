import React, { useMemo } from 'react';
import {
  Trophy,
  Activity,
  ShieldCheck,
  Eye,
  Building2,
  Video,
  Ticket,
  Sliders,
  Users,
  TrendingUp,
  Award,
  CheckCircle2,
  Sparkles,
  BarChart2,
  Bookmark,
  Calendar,
  Flame,
  Star,
  MapPin,
  CheckSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface RoleAnalyticsSummaryProps {
  customRole?: UserRole;
}

export const RoleAnalyticsSummary: React.FC<RoleAnalyticsSummaryProps> = ({ customRole }) => {
  const { role: authRole, profile } = useAuth();
  const activeRole: UserRole = customRole || authRole || 'athlete';

  // Compute or fetch role-specific metric data
  const analyticsData = useMemo(() => {
    switch (activeRole) {
      case 'athlete': {
        const gamesPlayed = profile?.gameLogs?.length ? profile.gameLogs.length : 28;
        return {
          roleName: 'Athlete Performance Summary',
          badgeText: 'VERIFIED ATHLETE MATRIX',
          badgeColor: 'text-[#E5B868]',
          badgeBg: 'bg-[#E5B868]/10 border-[#E5B868]/30',
          accentColor: 'text-[#E5B868]',
          borderHover: 'hover:border-[#E5B868]/50',
          metrics: [
            {
              id: 'games_played',
              label: 'Games Played',
              value: `${gamesPlayed}`,
              subtext: '+4 games this month',
              icon: Trophy,
              trend: '+16.2%',
              trendPositive: true
            },
            {
              id: 'ppg_scoring',
              label: 'Scoring Average',
              value: (profile?.stats as any)?.ppg ? `${(profile?.stats as any).ppg} PPG` : '21.4 PPG',
              subtext: '48.5% FG • 82% FT',
              icon: Activity,
              trend: '+2.1 PPG',
              trendPositive: true
            },
            {
              id: 'recruiting_views',
              label: 'Recruiting Profile Views',
              value: '1,240',
              subtext: '14 D1 Coach Inquiries',
              icon: Eye,
              trend: '+34%',
              trendPositive: true
            },
            {
              id: 'highlight_views',
              label: 'Highlight Reel Views',
              value: '3.8K',
              subtext: '12 Tagged Game Film Clips',
              icon: Video,
              trend: 'Top 5%',
              trendPositive: true
            }
          ]
        };
      }

      case 'coach': {
        return {
          roleName: 'Coach Roster & Gate Check-in Analytics',
          badgeText: 'VERIFIED COACH PORTAL',
          badgeColor: 'text-red-500',
          badgeBg: 'bg-red-600/10 border-red-600/30',
          accentColor: 'text-red-500',
          borderHover: 'hover:border-red-600/50',
          metrics: [
            {
              id: 'checkins_managed',
              label: 'Total Check-ins Managed',
              value: '154',
              subtext: 'Players & Staff Gate Passes',
              icon: CheckSquare,
              trend: '100% Verified',
              trendPositive: true
            },
            {
              id: 'verified_rosters',
              label: 'Verified Roster Players',
              value: '24',
              subtext: 'Across 2 AAU & Varsity Teams',
              icon: Users,
              trend: '2 Teams Active',
              trendPositive: true
            },
            {
              id: 'college_placements',
              label: 'College Commitments',
              value: '34 D1/D2',
              subtext: '3 State Championships',
              icon: Award,
              trend: '+4 this season',
              trendPositive: true
            },
            {
              id: 'event_passes',
              label: 'Approved Check-in Passes',
              value: '8 Events',
              subtext: 'NextGen National Showcase',
              icon: ShieldCheck,
              trend: 'Approved',
              trendPositive: true
            }
          ]
        };
      }

      case 'scout': {
        return {
          roleName: 'Recruiter Scouting Matrix Analytics',
          badgeText: 'NCAA CERTIFIED SCOUT MATRIX',
          badgeColor: 'text-slate-300',
          badgeBg: 'bg-slate-700/10 border-cyan-500/30',
          accentColor: 'text-slate-300',
          borderHover: 'hover:border-cyan-500/50',
          metrics: [
            {
              id: 'scouting_leads',
              label: 'Scouting Leads',
              value: '42',
              subtext: 'High-Potential Prospects Tracked',
              icon: Eye,
              trend: '+8 New Leads',
              trendPositive: true
            },
            {
              id: 'evaluations_logged',
              label: 'Evaluations Logged',
              value: '142 Reports',
              subtext: 'Detailed Player Rating Rubrics',
              icon: BarChart2,
              trend: '12 Circuit Events',
              trendPositive: true
            },
            {
              id: 'shortlist_count',
              label: 'Shortlist Prospects',
              value: '18 Athletes',
              subtext: 'Real-time Game Log Alerts',
              icon: Bookmark,
              trend: '2026/2027 Class',
              trendPositive: true
            },
            {
              id: 'd1_offers_projected',
              label: 'Projected D1 Prospects',
              value: '26 Players',
              subtext: 'Southeast & Mid-Atlantic Region',
              icon: Star,
              trend: 'Verified Film',
              trendPositive: true
            }
          ]
        };
      }

      case 'organization': {
        return {
          roleName: 'Organization & Tournament Operations Summary',
          badgeText: 'OPERATIONS & SANCTION HUB',
          badgeColor: 'text-indigo-400',
          badgeBg: 'bg-indigo-500/10 border-indigo-500/30',
          accentColor: 'text-indigo-400',
          borderHover: 'hover:border-indigo-500/50',
          metrics: [
            {
              id: 'tournaments_hosted',
              label: 'Tournaments Sanctioned',
              value: '48',
              subtext: 'USAB & NFHS Approved Host',
              icon: Building2,
              trend: '+6 This Year',
              trendPositive: true
            },
            {
              id: 'teams_enrolled',
              label: 'Teams Checked In',
              value: '320 Teams',
              subtext: 'Across 12 Major Showcases',
              icon: Users,
              trend: 'Capacity 98%',
              trendPositive: true
            },
            {
              id: 'athletes_impacted',
              label: 'Athletes Impacted',
              value: '4,500+',
              subtext: 'Verified Game Stats Logged',
              icon: Trophy,
              trend: '32 D1 Scouts Attended',
              trendPositive: true
            },
            {
              id: 'venues_managed',
              label: 'Hardwood Venues',
              value: '16 Courts',
              subtext: 'Real-Time Scoreboard Sync',
              icon: MapPin,
              trend: '100% Live Sync',
              trendPositive: true
            }
          ]
        };
      }

      case 'creator':
      case 'content_creator': {
        return {
          roleName: 'Media Creator Studio & Reel Performance',
          badgeText: 'VERIFIED MEDIA STUDIO',
          badgeColor: 'text-purple-400',
          badgeBg: 'bg-purple-500/10 border-purple-500/30',
          accentColor: 'text-purple-400',
          borderHover: 'hover:border-purple-500/50',
          metrics: [
            {
              id: 'mixtapes_published',
              label: 'Media Mixtapes Published',
              value: '184',
              subtext: '4K High School & AAU Highlights',
              icon: Video,
              trend: '+12 This Month',
              trendPositive: true
            },
            {
              id: 'total_views',
              label: 'Total Film Views',
              value: '2.4M',
              subtext: 'Across YouTube, IG, & Platform',
              icon: Flame,
              trend: '+18% MoM',
              trendPositive: true
            },
            {
              id: 'tagged_prospects',
              label: 'Tagged Prospects',
              value: '310 Athletes',
              subtext: 'Direct Video Tagging to Profiles',
              icon: Sparkles,
              trend: '100% Verified',
              trendPositive: true
            },
            {
              id: 'booking_requests',
              label: 'Media Bookings',
              value: '14 Games',
              subtext: 'Upcoming Game Coverage',
              icon: Calendar,
              trend: 'Booked Solid',
              trendPositive: true
            }
          ]
        };
      }

      case 'viewer': {
        return {
          roleName: 'Spectator Gate Pass & Stream Activity',
          badgeText: 'VERIFIED FAN PASS',
          badgeColor: 'text-amber-400',
          badgeBg: 'bg-amber-500/10 border-amber-500/30',
          accentColor: 'text-amber-400',
          borderHover: 'hover:border-amber-500/50',
          metrics: [
            {
              id: 'streams_watched',
              label: 'Live Streams Watched',
              value: '48 Hours',
              subtext: 'HD Multi-Cam Court Feed',
              icon: Ticket,
              trend: '12 Games Streamed',
              trendPositive: true
            },
            {
              id: 'followed_prospects',
              label: 'Followed Athletes',
              value: '12 Athletes',
              subtext: 'Instant Score & Film Alerts',
              icon: Star,
              trend: 'Alerts Active',
              trendPositive: true
            },
            {
              id: 'gate_passes',
              label: 'Tournaments Attended',
              value: '6 Gate Passes',
              subtext: 'Fast-Track Venue Scans',
              icon: ShieldCheck,
              trend: 'Pass Active',
              trendPositive: true
            },
            {
              id: 'favorite_teams',
              label: 'Favorite Programs',
              value: '3 Programs',
              subtext: 'Oak Ridge Wildcats & Select AAU',
              icon: Activity,
              trend: 'In Top 8',
              trendPositive: true
            }
          ]
        };
      }

      case 'admin':
      default: {
        return {
          roleName: 'System Operations & Platform Health',
          badgeText: 'ADMINISTRATIVE CONTROL MATRIX',
          badgeColor: 'text-red-400',
          badgeBg: 'bg-red-500/10 border-red-500/30',
          accentColor: 'text-red-400',
          borderHover: 'hover:border-red-500/50',
          metrics: [
            {
              id: 'active_users',
              label: 'Active Platform Members',
              value: '12,480',
              subtext: 'Athletes, Coaches, & Scouts',
              icon: Users,
              trend: '+1,200 this week',
              trendPositive: true
            },
            {
              id: 'verified_passports',
              label: 'Verified Sports Passports',
              value: '8,920',
              subtext: 'Biometric & Stat Verification',
              icon: CheckCircle2,
              trend: '99.2% Clean',
              trendPositive: true
            },
            {
              id: 'server_uptime',
              label: 'Server & API Health',
              value: '99.98%',
              subtext: 'Firestore & Cloud Sync Live',
              icon: Sliders,
              trend: 'Optimal',
              trendPositive: true
            },
            {
              id: 'security_flags',
              label: 'Security Audits',
              value: '0 Flags',
              subtext: 'Role Access Rules Enforced',
              icon: ShieldCheck,
              trend: 'Secure',
              trendPositive: true
            }
          ]
        };
      }
    }
  }, [activeRole, profile]);

  return (
    <div id="role-analytics-summary" className="bg-[#212A31]/90 border border-white/10 rounded-3xl p-6 backdrop-blur-xl space-y-4 shadow-xl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${analyticsData.badgeBg} ${analyticsData.badgeColor}`}>
              {analyticsData.badgeText}
            </span>
            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#E5B868]" /> Real-Time Analytics
            </span>
          </div>
          <h3 className="text-lg font-black italic uppercase tracking-tight text-white font-sans mt-1">
            {analyticsData.roleName}
          </h3>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#E5B868] animate-ping" />
          <span>Live Data Feed Active</span>
        </div>
      </div>

      {/* Grid of Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {analyticsData.metrics.map((metric) => {
          const MetricIcon = metric.icon;

          return (
            <div
              key={metric.id}
              className={`p-4 rounded-2xl bg-black/40 border border-white/10 ${analyticsData.borderHover} transition-all duration-300 flex flex-col justify-between space-y-3 group`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 group-hover:text-slate-200 transition-colors">
                  {metric.label}
                </span>
                <div className={`p-2 rounded-xl bg-white/5 border border-white/10 ${analyticsData.accentColor}`}>
                  <MetricIcon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="text-2xl font-black italic text-white tracking-tight font-sans">
                  {metric.value}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] font-mono text-slate-400 truncate max-w-[130px]">
                    {metric.subtext}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#E5B868] bg-[#E5B868]/10 px-1.5 py-0.5 rounded border border-[#E5B868]/20">
                    {metric.trend}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
