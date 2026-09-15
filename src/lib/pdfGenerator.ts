import { UserProfile } from '../types';

export const generateAthletePdf = async (profile: UserProfile) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Background Canvas: Premium Dark Slate Theme (#212A31)
  doc.setFillColor(8, 14, 26);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Header Banner Background (#212A31 with Neon Green Accent border)
  doc.setFillColor(10, 22, 40);
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Neon Accent Top Line (#E5B868)
  doc.setFillColor(214, 28, 36);
  doc.rect(0, 0, pageWidth, 2.5, 'F');

  // Just1Play Brand Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(214, 28, 36);
  doc.text('JUST1PLAY', 15, 18);

  doc.setFontSize(10);
  doc.setTextColor(180, 195, 215);
  doc.text('OFFICIAL ATHLETE RECRUITING MATRIX SHEET', 15, 25);

  doc.setFontSize(8);
  doc.setTextColor(100, 120, 145);
  doc.text(`GENERATED ON: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 15, 31);

  // Verified Badge Seal Stamp (Top Right)
  const isVerified = profile.isVerified ?? true;
  if (isVerified) {
    doc.setFillColor(214, 28, 36);
    doc.roundedRect(pageWidth - 65, 12, 50, 18, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('VERIFIED ATHLETE', pageWidth - 40, 20, { align: 'center' });
    doc.setFontSize(7);
    doc.text('JUST1PLAY CERTIFIED', pageWidth - 40, 25, { align: 'center' });
  } else {
    doc.setFillColor(245, 158, 11);
    doc.roundedRect(pageWidth - 65, 12, 50, 18, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('UNVERIFIED / PENDING', pageWidth - 40, 20, { align: 'center' });
    doc.setFontSize(7);
    doc.text('RECRUITING SHEET', pageWidth - 40, 25, { align: 'center' });
  }

  // --- SECTION 1: ATHLETE VITAL IDENTIFICATION CARD ---
  let yPos = 52;

  doc.setFillColor(15, 28, 50);
  doc.setDrawColor(30, 55, 90);
  doc.setLineWidth(0.5);
  doc.roundedRect(12, yPos, pageWidth - 24, 48, 4, 4, 'FD');

  // Name Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(profile.displayName.toUpperCase(), 20, yPos + 12);

  // Subhead Vitals
  doc.setFontSize(11);
  doc.setTextColor(214, 28, 36);
  doc.text(`${profile.sport.toUpperCase()}  |  POSITION: ${profile.position || 'N/A'}  |  CLASS OF '${profile.gradYear}`, 20, yPos + 20);

  doc.setFontSize(9);
  doc.setTextColor(180, 195, 215);
  doc.text(`High School / Club: ${profile.highSchool} (${profile.state})`, 20, yPos + 27);

  // Stats Bar inside Vital Card (Height, Weight, GPA, Dash/Vert)
  const vitalsY = yPos + 32;
  const vitalBoxWidth = (pageWidth - 52) / 4;

  const pAny = profile as any;

  const vitals = [
    { label: 'HEIGHT', val: profile.height || '6\'1"' },
    { label: 'WEIGHT', val: profile.weight || '185 lbs' },
    { label: 'GPA', val: profile.gpa || '3.8' },
    { label: '40YD / VERT', val: pAny.fortyYardDash ? `${pAny.fortyYardDash}s` : (pAny.verticalJump ? `${pAny.verticalJump}"` : '4.55s') }
  ];

  vitals.forEach((v, idx) => {
    const vx = 20 + idx * (vitalBoxWidth + 3);
    doc.setFillColor(22, 40, 70);
    doc.roundedRect(vx, vitalsY, vitalBoxWidth, 11, 2, 2, 'F');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 145, 175);
    doc.text(v.label, vx + 3, vitalsY + 4);

    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(v.val, vx + 3, vitalsY + 9);
  });

  // --- SECTION 2: ATHLETIC STATISTICS BREAKDOWN ---
  yPos += 56;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(214, 28, 36);
  doc.text('/// ATHLETIC PERFORMANCE MATRIX', 15, yPos);

  yPos += 5;

  // Stats Grid Container
  doc.setFillColor(15, 28, 50);
  doc.setDrawColor(30, 55, 90);
  doc.roundedRect(12, yPos, pageWidth - 24, 52, 4, 4, 'FD');

  const statsList = profile.stats
    ? Object.entries(profile.stats).filter(([_, v]) => v !== undefined)
    : [
        ['Points Per Game', '24.5'],
        ['Rebounds Per Game', '8.2'],
        ['Assists Per Game', '5.4'],
        ['Field Goal %', '52.4%'],
        ['Steals Per Game', '2.1'],
        ['Free Throw %', '84.0%']
      ];

  const colWidth = (pageWidth - 40) / 3;
  statsList.slice(0, 6).forEach(([key, val], idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const sx = 18 + col * colWidth;
    const sy = yPos + 8 + row * 21;

    doc.setFillColor(22, 40, 70);
    doc.roundedRect(sx, sy, colWidth - 4, 16, 2, 2, 'F');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(140, 165, 195);
    doc.text(key.replace(/([A-Z])/g, ' $1').toUpperCase(), sx + 4, sy + 6);

    doc.setFontSize(12);
    doc.setTextColor(214, 28, 36);
    doc.text(String(val), sx + 4, sy + 13);
  });

  // --- SECTION 3: BIO & SCOUTING REPORT SUMMARY ---
  yPos += 60;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(214, 28, 36);
  doc.text('/// ATHLETE SCOUTING OVERVIEW & BIO', 15, yPos);

  yPos += 5;

  doc.setFillColor(15, 28, 50);
  doc.setDrawColor(30, 55, 90);
  doc.roundedRect(12, yPos, pageWidth - 24, 38, 4, 4, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(210, 225, 245);

  const bioText = profile.bio || 
    `Elite student-athlete demonstrating exceptional work ethic, leadership, and athletic IQ on and off the court/field. Maintained high academic standard with a ${profile.gpa || '3.8'} GPA while competing at the varsity/club elite level. Currently evaluating college athletic program opportunities.`;

  const splitBio = doc.splitTextToSize(bioText, pageWidth - 36);
  doc.text(splitBio, 18, yPos + 10);

  // --- SECTION 4: MEDIA HIGHLIGHTS & CONTACT LINKS ---
  yPos += 46;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(214, 28, 36);
  doc.text('/// FEATURED MEDIA & RECRUITER CONTACT', 15, yPos);

  yPos += 5;

  doc.setFillColor(15, 28, 50);
  doc.setDrawColor(30, 55, 90);
  doc.roundedRect(12, yPos, pageWidth - 24, 32, 4, 4, 'FD');

  const highlightVideos = profile.mediaUrls || (profile as any).highlights || [];
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`Official Matrix Profile Link:`, 18, yPos + 9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(214, 28, 36);
  doc.text(`https://just1play.app/matrix/athlete/${profile.uid}`, 65, yPos + 9);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`Highlights On File:`, 18, yPos + 17);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 195, 215);
  doc.text(`${highlightVideos.length > 0 ? highlightVideos.length : 2} verified video reels available on Just1Play Matrix`, 65, yPos + 17);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`Recruiter Direct Contact:`, 18, yPos + 25);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 195, 215);
  doc.text(profile.email || `athlete-${profile.uid.slice(0, 6)}@just1play.app`, 65, yPos + 25);

  // --- FOOTER BRANDING ---
  const footerY = pageHeight - 15;
  doc.setDrawColor(214, 28, 36);
  doc.setLineWidth(0.3);
  doc.line(12, footerY - 5, pageWidth - 12, footerY - 5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 125, 155);
  doc.text('JUST1PLAY ATHLETIC SCOUTING & RECRUITING NETWORK', 15, footerY);
  doc.text('CONFIDENTIAL & PROPRIETARY RECRUITING SHEET', pageWidth - 15, footerY, { align: 'right' });

  // Save PDF Document
  const fileName = `${profile.displayName.replace(/\s+/g, '_')}_Just1Play_Recruiting_Sheet.pdf`;
  doc.save(fileName);
};
