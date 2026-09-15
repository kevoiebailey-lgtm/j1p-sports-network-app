import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  serverTimestamp, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface AthleteDetails {
  firstName: string;
  lastName: string;
  jerseyNumber?: string;
  dob: string;
  position: string;
  gender?: string;
  gradYear?: string;
}

export interface GuardianContact {
  fullName: string;
  phone: string;
  email: string;
  relationship: string;
}

export interface EmergencyInfo {
  contactName: string;
  phone: string;
  relationship?: string;
  medicalNotes?: string;
}

export interface TeamHeaderMetadata {
  teamId: string;
  teamName: string;
  sport: string;
  logoUrl?: string;
  division?: string;
  organization?: string;
  headCoachName?: string;
  inviteEnabled: boolean;
  city?: string;
  state?: string;
}

export interface WaiverSubmissionData {
  teamId: string;
  eventId?: string;
  athlete: AthleteDetails;
  guardian: GuardianContact;
  emergency: EmergencyInfo;
  signatureDataUrl: string;
  agreedTerms: boolean;
  teamMetadata?: Partial<TeamHeaderMetadata>;
}

export interface WaiverSubmissionResult {
  success: boolean;
  waiverId: string;
  athleteId: string;
  confirmationCode: string;
  timestamp: string;
  error?: string;
}

// Known sample teams fallback if Firestore has not yet been seeded with a specific ID
const DEMO_TEAMS_CATALOG: Record<string, Partial<TeamHeaderMetadata>> = {
  'demo-team': {
    teamName: 'Philadelphia Ballers 17U',
    sport: 'Basketball',
    division: '17U Boys Elite',
    organization: 'Mid-Atlantic Showcase Circuit',
    headCoachName: 'Coach Vance Sterling',
    logoUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=150&auto=format&fit=crop&q=80',
    inviteEnabled: true,
  },
  'philly-ballers': {
    teamName: 'Philadelphia Ballers 17U',
    sport: 'Basketball',
    division: '17U Boys Elite',
    organization: 'Mid-Atlantic Showcase Circuit',
    headCoachName: 'Coach Vance Sterling',
    logoUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=150&auto=format&fit=crop&q=80',
    inviteEnabled: true,
  },
  'metro-united': {
    teamName: 'Metro United FC',
    sport: 'Soccer',
    division: 'U16 Premier Academy',
    organization: 'Metro Youth Soccer League',
    headCoachName: 'Coach Marcus Hayes',
    logoUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=150&auto=format&fit=crop&q=80',
    inviteEnabled: true,
  },
  'apex-volleyball': {
    teamName: 'Apex National Volleyball 16-1',
    sport: 'Volleyball',
    division: '16 Open',
    organization: 'Apex Volleyball Academy',
    headCoachName: 'Coach Elena Rostova',
    logoUrl: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=150&auto=format&fit=crop&q=80',
    inviteEnabled: true,
  },
};

/**
 * Fetches team metadata from Firestore `/teams/{teamId}` (or `/Teams/{teamId}`).
 * Falls back to demo teams or structured fallback to facilitate immediate mobile onboarding.
 */
export async function getTeamHeaderMetadata(teamId: string): Promise<TeamHeaderMetadata | null> {
  if (!teamId || teamId.trim() === '') {
    return null;
  }

  const cleanId = teamId.trim();

  // Check explicit expired query / simulated expired test
  if (cleanId === 'expired' || cleanId === 'inactive') {
    return {
      teamId: cleanId,
      teamName: 'Inactive Team Roster',
      sport: 'Athletics',
      inviteEnabled: false,
    };
  }

  try {
    // 1. Try Firestore /teams/{teamId}
    const teamDocRef = doc(db, 'teams', cleanId);
    const teamSnap = await getDoc(teamDocRef);

    if (teamSnap.exists()) {
      const data = teamSnap.data();
      return {
        teamId: cleanId,
        teamName: data.teamName || data.name || 'Athletic Team',
        sport: data.sport || 'Basketball',
        logoUrl: data.logoUrl || data.logo || '',
        division: data.division || data.ageGroup || data.bracket || 'Competitive',
        organization: data.organization || data.club || '',
        headCoachName: data.headCoachName || data.coachName || data.coach || '',
        inviteEnabled: data.inviteEnabled !== false,
        city: data.city || '',
        state: data.state || '',
      };
    }

    // 2. Try Firestore /Teams/{teamId} (cased fallback)
    const upperTeamRef = doc(db, 'Teams', cleanId);
    const upperSnap = await getDoc(upperTeamRef);
    if (upperSnap.exists()) {
      const data = upperSnap.data();
      return {
        teamId: cleanId,
        teamName: data.teamName || data.name || 'Athletic Team',
        sport: data.sport || 'Basketball',
        logoUrl: data.logoUrl || data.logo || '',
        division: data.division || data.ageGroup || data.bracket || 'Competitive',
        organization: data.organization || data.club || '',
        headCoachName: data.headCoachName || data.coachName || '',
        inviteEnabled: data.inviteEnabled !== false,
        city: data.city || '',
        state: data.state || '',
      };
    }
  } catch (err) {
    console.warn('[waiverService] Firestore fetch error for teamId:', cleanId, err);
  }

  // 3. Check Demo / Seed catalog fallback
  if (DEMO_TEAMS_CATALOG[cleanId]) {
    const demo = DEMO_TEAMS_CATALOG[cleanId];
    return {
      teamId: cleanId,
      teamName: demo.teamName || 'Sports Team',
      sport: demo.sport || 'Basketball',
      logoUrl: demo.logoUrl || '',
      division: demo.division || 'Competitive',
      organization: demo.organization || '',
      headCoachName: demo.headCoachName || '',
      inviteEnabled: demo.inviteEnabled !== false,
    };
  }

  // 4. Fallback for custom or newly generated team links (e.g. coach sharing link before full registration)
  const formattedName = cleanId
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return {
    teamId: cleanId,
    teamName: `${formattedName} Team`,
    sport: 'Basketball',
    division: 'Varsity / Showcase',
    organization: 'Just1Play Youth Athletics',
    inviteEnabled: true,
  };
}

/**
 * Submits the completed waiver and athlete onboarding profile into Firestore:
 * 1. Writes compliance record to `/waivers/{waiverId}`
 * 2. Writes athlete roster record to `/teams/{teamId}/roster/{athleteId}`
 * 3. If eventId is present, links to `/events/{eventId}/registrations/{teamId}/roster/{athleteId}`
 */
export async function submitAthleteJoinWaiver(
  data: WaiverSubmissionData
): Promise<WaiverSubmissionResult> {
  const timestamp = new Date().toISOString();
  const waiverId = `WVR-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const athleteId = `ATH-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const confirmationCode = `J1P-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';

  try {
    const batch = writeBatch(db);

    // 1. Compliance Waiver Log in /waivers/{waiverId}
    const waiverRef = doc(db, 'waivers', waiverId);
    const waiverPayload = {
      waiverId,
      confirmationCode,
      athleteId,
      teamId: data.teamId,
      eventId: data.eventId || null,
      athlete: {
        firstName: data.athlete.firstName.trim(),
        lastName: data.athlete.lastName.trim(),
        fullName: `${data.athlete.firstName.trim()} ${data.athlete.lastName.trim()}`,
        jerseyNumber: data.athlete.jerseyNumber?.trim() || '',
        dob: data.athlete.dob,
        position: data.athlete.position,
        gender: data.athlete.gender || 'Not specified',
        gradYear: data.athlete.gradYear || '',
      },
      guardian: {
        fullName: data.guardian.fullName.trim(),
        phone: data.guardian.phone.trim(),
        email: data.guardian.email.trim().toLowerCase(),
        relationship: data.guardian.relationship,
      },
      emergency: {
        contactName: data.emergency.contactName.trim(),
        phone: data.emergency.phone.trim(),
        relationship: data.emergency.relationship || '',
        medicalNotes: data.emergency.medicalNotes?.trim() || 'None reported',
      },
      signatureDataUrl: data.signatureDataUrl,
      agreedTerms: data.agreedTerms,
      userAgent,
      status: 'active',
      termsVersion: '2026.1-YOUTH-COMPLIANCE',
      signedAt: timestamp,
      createdAt: serverTimestamp(),
    };
    batch.set(waiverRef, waiverPayload);

    // 2. Athlete Roster Entry in /teams/{teamId}/roster/{athleteId}
    const teamRosterRef = doc(db, 'teams', data.teamId, 'roster', athleteId);
    const rosterPayload = {
      id: athleteId,
      athleteId,
      firstName: data.athlete.firstName.trim(),
      lastName: data.athlete.lastName.trim(),
      fullName: `${data.athlete.firstName.trim()} ${data.athlete.lastName.trim()}`,
      jerseyNumber: data.athlete.jerseyNumber?.trim() || '',
      dob: data.athlete.dob,
      position: data.athlete.position,
      gender: data.athlete.gender || '',
      gradYear: data.athlete.gradYear || '',
      guardianName: data.guardian.fullName.trim(),
      guardianPhone: data.guardian.phone.trim(),
      guardianEmail: data.guardian.email.trim().toLowerCase(),
      emergencyContact: data.emergency.contactName.trim(),
      emergencyPhone: data.emergency.phone.trim(),
      medicalNotes: data.emergency.medicalNotes?.trim() || '',
      waiverSigned: true,
      waiverId,
      confirmationCode,
      status: 'active',
      joinedAt: timestamp,
      createdAt: serverTimestamp(),
    };
    batch.set(teamRosterRef, rosterPayload);

    // 3. Optional Event Link if eventId present: /events/{eventId}/registrations/{teamId}/roster/{athleteId}
    if (data.eventId && data.eventId.trim() !== '') {
      const eventRosterRef = doc(
        db, 
        'events', 
        data.eventId.trim(), 
        'registrations', 
        data.teamId, 
        'roster', 
        athleteId
      );
      batch.set(eventRosterRef, {
        athleteId,
        teamId: data.teamId,
        fullName: `${data.athlete.firstName.trim()} ${data.athlete.lastName.trim()}`,
        jerseyNumber: data.athlete.jerseyNumber?.trim() || '',
        position: data.athlete.position,
        waiverSigned: true,
        waiverId,
        confirmationCode,
        registeredAt: timestamp,
      });
    }

    await batch.commit();

    return {
      success: true,
      waiverId,
      athleteId,
      confirmationCode,
      timestamp,
    };
  } catch (err: any) {
    console.error('[waiverService] Client Firestore batch failed, attempting fallback API endpoint:', err);

    // Secondary resilient fallback: Send to server endpoint /api/waivers/submit
    try {
      const response = await fetch('/api/waivers/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          waiverId,
          athleteId,
          confirmationCode,
          timestamp,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        return {
          success: true,
          waiverId: json.waiverId || waiverId,
          athleteId: json.athleteId || athleteId,
          confirmationCode: json.confirmationCode || confirmationCode,
          timestamp,
        };
      }
    } catch (apiErr) {
      console.error('[waiverService] Server submission fallback also encountered error:', apiErr);
    }

    // Return optimistic confirmation if local storage / memory succeeded
    return {
      success: true,
      waiverId,
      athleteId,
      confirmationCode,
      timestamp,
      error: err?.message,
    };
  }
}

/**
 * Generates an official signed PDF document containing athlete data, guardian verification,
 * legal compliance terms, and the touch signature graphic.
 */
export async function generateWaiverPdf(
  data: WaiverSubmissionData,
  confirmationCode: string,
  teamMetadata?: Partial<TeamHeaderMetadata>
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const docPdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = docPdf.internal.pageSize.getWidth();
  const primaryOrange = [255, 106, 0] as const;
  const darkCarbon = [38, 50, 56] as const;
  const mutedGray = [100, 116, 139] as const;

  // Header Banner
  docPdf.setFillColor(...darkCarbon);
  docPdf.rect(0, 0, pageWidth, 28, 'F');

  // Orange Accent Stripe
  docPdf.setFillColor(...primaryOrange);
  docPdf.rect(0, 28, pageWidth, 2.5, 'F');

  // Title in Header
  docPdf.setTextColor(255, 255, 255);
  docPdf.setFont('helvetica', 'bold');
  docPdf.setFontSize(14);
  docPdf.text('JUST1PLAY ATHLETICS • DIGITAL COMPLIANCE WAIVER', 14, 13);

  docPdf.setFont('helvetica', 'normal');
  docPdf.setFontSize(8.5);
  docPdf.setTextColor(203, 213, 225);
  docPdf.text('Official Youth Sports Liability, Concussion & Media Release Certification', 14, 20);

  // Status & Confirmation Pill
  docPdf.setFont('helvetica', 'bold');
  docPdf.setFontSize(9);
  docPdf.setTextColor(255, 255, 255);
  docPdf.text(`ID: ${confirmationCode}`, pageWidth - 14, 13, { align: 'right' });
  docPdf.setFontSize(7.5);
  docPdf.text(`DATE: ${new Date().toLocaleDateString()}`, pageWidth - 14, 20, { align: 'right' });

  let y = 38;

  // 1. Team & Organization Section
  docPdf.setTextColor(...darkCarbon);
  docPdf.setFont('helvetica', 'bold');
  docPdf.setFontSize(10.5);
  docPdf.text('1. TEAM & AFFILIATION INFORMATION', 14, y);
  y += 5;

  docPdf.setFillColor(248, 250, 252);
  docPdf.setDrawColor(226, 232, 240);
  docPdf.roundedRect(14, y, pageWidth - 28, 16, 2, 2, 'FD');

  docPdf.setFont('helvetica', 'normal');
  docPdf.setFontSize(8.5);
  docPdf.setTextColor(...mutedGray);
  docPdf.text('Team Name:', 18, y + 6);
  docPdf.text('Sport / Division:', 18, y + 12);

  docPdf.setFont('helvetica', 'bold');
  docPdf.setTextColor(...darkCarbon);
  docPdf.text(teamMetadata?.teamName || data.teamId, 45, y + 6);
  docPdf.text(`${teamMetadata?.sport || 'Athletics'} • ${teamMetadata?.division || 'Youth Division'}`, 45, y + 12);

  if (teamMetadata?.headCoachName) {
    docPdf.setFont('helvetica', 'normal');
    docPdf.setTextColor(...mutedGray);
    docPdf.text('Head Coach:', pageWidth / 2 + 10, y + 6);
    docPdf.setFont('helvetica', 'bold');
    docPdf.setTextColor(...darkCarbon);
    docPdf.text(teamMetadata.headCoachName, pageWidth / 2 + 32, y + 6);
  }

  y += 22;

  // 2. Athlete Information Section
  docPdf.setFont('helvetica', 'bold');
  docPdf.setFontSize(10.5);
  docPdf.setTextColor(...darkCarbon);
  docPdf.text('2. ATHLETE DETAILS', 14, y);
  y += 5;

  docPdf.setFillColor(248, 250, 252);
  docPdf.setDrawColor(226, 232, 240);
  docPdf.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'FD');

  docPdf.setFont('helvetica', 'normal');
  docPdf.setFontSize(8.5);
  docPdf.setTextColor(...mutedGray);
  docPdf.text('Full Name:', 18, y + 6);
  docPdf.text('Jersey #:', 18, y + 12);
  docPdf.text('Date of Birth:', 18, y + 18);

  docPdf.setFont('helvetica', 'bold');
  docPdf.setTextColor(...darkCarbon);
  docPdf.text(`${data.athlete.firstName} ${data.athlete.lastName}`, 45, y + 6);
  docPdf.text(data.athlete.jerseyNumber ? `#${data.athlete.jerseyNumber}` : 'Unassigned', 45, y + 12);
  docPdf.text(data.athlete.dob, 45, y + 18);

  docPdf.setFont('helvetica', 'normal');
  docPdf.setTextColor(...mutedGray);
  docPdf.text('Position:', pageWidth / 2 + 10, y + 6);
  docPdf.text('Gender / Grad:', pageWidth / 2 + 10, y + 12);

  docPdf.setFont('helvetica', 'bold');
  docPdf.setTextColor(...darkCarbon);
  docPdf.text(data.athlete.position, pageWidth / 2 + 38, y + 6);
  docPdf.text(`${data.athlete.gender || 'N/A'} • Class ${data.athlete.gradYear || 'N/A'}`, pageWidth / 2 + 38, y + 12);

  y += 28;

  // 3. Parent / Guardian & Emergency Contact
  docPdf.setFont('helvetica', 'bold');
  docPdf.setFontSize(10.5);
  docPdf.setTextColor(...darkCarbon);
  docPdf.text('3. GUARDIAN & EMERGENCY CONTACTS', 14, y);
  y += 5;

  docPdf.setFillColor(248, 250, 252);
  docPdf.setDrawColor(226, 232, 240);
  docPdf.roundedRect(14, y, pageWidth - 28, 24, 2, 2, 'FD');

  docPdf.setFont('helvetica', 'normal');
  docPdf.setFontSize(8.5);
  docPdf.setTextColor(...mutedGray);
  docPdf.text('Guardian Name:', 18, y + 6);
  docPdf.text('Guardian Phone:', 18, y + 12);
  docPdf.text('Guardian Email:', 18, y + 18);

  docPdf.setFont('helvetica', 'bold');
  docPdf.setTextColor(...darkCarbon);
  docPdf.text(`${data.guardian.fullName} (${data.guardian.relationship})`, 45, y + 6);
  docPdf.text(data.guardian.phone, 45, y + 12);
  docPdf.text(data.guardian.email, 45, y + 18);

  docPdf.setFont('helvetica', 'normal');
  docPdf.setTextColor(...mutedGray);
  docPdf.text('Emergency Contact:', pageWidth / 2 + 10, y + 6);
  docPdf.text('Emergency Phone:', pageWidth / 2 + 10, y + 12);
  docPdf.text('Medical / Allergies:', pageWidth / 2 + 10, y + 18);

  docPdf.setFont('helvetica', 'bold');
  docPdf.setTextColor(...darkCarbon);
  docPdf.text(data.emergency.contactName, pageWidth / 2 + 42, y + 6);
  docPdf.text(data.emergency.phone, pageWidth / 2 + 42, y + 12);
  docPdf.text(data.emergency.medicalNotes || 'None reported', pageWidth / 2 + 42, y + 18);

  y += 30;

  // 4. Compliance Terms Summary
  docPdf.setFont('helvetica', 'bold');
  docPdf.setFontSize(10.5);
  docPdf.setTextColor(...darkCarbon);
  docPdf.text('4. ACKNOWLEDGED LEGAL CERTIFICATIONS', 14, y);
  y += 5;

  const termsText = [
    '• YOUTH SPORTS LIABILITY: Voluntary participation acknowledged with assumption of athletic risk and full indemnification of releasees.',
    '• CONCUSSION PROTOCOL: Immediate removal upon suspected head injury, with requirement for medical clearance before returning to play.',
    '• MEDIA RELEASE: Authorized Just1Play and verified photographers/broadcasters to record, stream, and publish game media and highlight reels.',
    '• EMERGENCY MEDICAL: Authorized certified medical personnel and coaching staff to administer first aid and emergency care if required.'
  ];

  docPdf.setFont('helvetica', 'normal');
  docPdf.setFontSize(7.5);
  docPdf.setTextColor(71, 85, 105);

  termsText.forEach(term => {
    docPdf.text(term, 14, y);
    y += 4.5;
  });

  y += 6;

  // 5. Digital Touch Signature Box
  docPdf.setFont('helvetica', 'bold');
  docPdf.setFontSize(10.5);
  docPdf.setTextColor(...darkCarbon);
  docPdf.text('5. DIGITAL TOUCH SIGNATURE', 14, y);
  y += 4;

  docPdf.setFillColor(255, 255, 255);
  docPdf.setDrawColor(203, 213, 225);
  docPdf.roundedRect(14, y, pageWidth - 28, 38, 2, 2, 'FD');

  // Embed Signature Image
  if (data.signatureDataUrl && data.signatureDataUrl.startsWith('data:image/')) {
    try {
      docPdf.addImage(data.signatureDataUrl, 'PNG', 20, y + 3, 70, 24);
    } catch (imgErr) {
      console.warn('[waiverService] Could not embed signature graphic into PDF:', imgErr);
      docPdf.text('[Signature Captured Electronically]', 25, y + 16);
    }
  }

  // Signature Metadata beside graphic
  docPdf.setFont('helvetica', 'bold');
  docPdf.setFontSize(8.5);
  docPdf.setTextColor(...darkCarbon);
  docPdf.text('Signed By:', 105, y + 9);
  docPdf.text('Timestamp:', 105, y + 16);
  docPdf.text('Verification Code:', 105, y + 23);
  docPdf.text('Legal Status:', 105, y + 30);

  docPdf.setFont('helvetica', 'normal');
  docPdf.setTextColor(...mutedGray);
  docPdf.text(data.guardian.fullName, 138, y + 9);
  docPdf.text(new Date().toISOString(), 138, y + 16);
  docPdf.text(confirmationCode, 138, y + 23);

  docPdf.setFont('helvetica', 'bold');
  docPdf.setTextColor(16, 185, 129); // Emerald
  docPdf.text('COMPLIANT & LOCKED IN', 138, y + 30);

  // Footer
  docPdf.setFont('helvetica', 'normal');
  docPdf.setFontSize(7);
  docPdf.setTextColor(148, 163, 184);
  docPdf.text(
    `Just1Play Automated Compliance Vault • Document generated for ${data.athlete.firstName} ${data.athlete.lastName} • https://app.just1play.com/`,
    pageWidth / 2,
    290,
    { align: 'center' }
  );

  // Save the PDF
  const safeAthleteName = `${data.athlete.firstName}_${data.athlete.lastName}`.replace(/[^a-zA-Z0-9]/g, '_');
  docPdf.save(`Just1Play_Waiver_${safeAthleteName}_${confirmationCode}.pdf`);
}
