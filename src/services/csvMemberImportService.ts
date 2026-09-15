import Papa from 'papaparse';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { ParsedMemberRecord, CsvImportProgress, CsvImportSummary, CsvRawRow } from '../types/csvImport';

const SAMPLE_CSV_CONTENT = `firstName,lastName,email,phone,role,sport,graduationYear,teamName
Marcus,Johnson,marcus.johnson@example.com,(555) 234-5678,Athlete,Boys' Basketball,2026,Camden High School
Jessica,Martinez,jessica.martinez@example.com,(555) 345-6789,Athlete,Girls' Flag Football,2027,Paramus Catholic
Coach Derrick,Williams,coach.williams@example.com,(555) 456-7890,Coach,Boys' Basketball,,Tri-State Elite
Sarah,Jenkins,s.jenkins@scoutingnetwork.org,(555) 567-8901,Scout,All Sports,,Northeast Scouting Bureau
Tyler,O'Connor,tyler.oconnor@example.com,(555) 678-9012,Athlete,Boys' Lacrosse,2025,Delbarton Prep
Amara,Davis,amara.davis@example.com,(555) 789-0123,Athlete,Girls' Volleyball,2026,Immaculate Heart
David,Chen,david.chen@example.com,(555) 890-1234,Athlete,Boys' Soccer,2028,St. Benedict's Prep`;

export class CsvMemberImportService {
  /**
   * Generates and triggers browser download of the standard sample CSV template
   */
  public static downloadSampleTemplate(): void {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'just1play_members_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Helper to normalize raw CSV column keys to standard naming
   */
  private static normalizeKey(key: string): string {
    const clean = key.trim().toLowerCase().replace(/[\s_-]+/g, '');
    if (['firstname', 'first', 'fname', 'givenname'].includes(clean)) return 'firstName';
    if (['lastname', 'last', 'lname', 'surname', 'familyname'].includes(clean)) return 'lastName';
    if (['email', 'emailaddress', 'mail', 'e-mail'].includes(clean)) return 'email';
    if (['phone', 'phonenumber', 'mobile', 'cell', 'telephone'].includes(clean)) return 'phone';
    if (['role', 'userrole', 'accounttype', 'type'].includes(clean)) return 'role';
    if (['sport', 'sportcategory', 'primarysport', 'discipline'].includes(clean)) return 'sport';
    if (['graduationyear', 'gradyear', 'classof', 'year', 'grad'].includes(clean)) return 'graduationYear';
    if (['teamname', 'team', 'highschool', 'school', 'club', 'organization', 'org'].includes(clean)) return 'teamName';
    return clean;
  }

  /**
   * Normalize user role string to valid UserRole
   */
  private static parseRole(rawRole: string | undefined): { role: UserRole; warning?: string } {
    if (!rawRole || !rawRole.trim()) {
      return { role: 'athlete', warning: 'Role was empty; defaulted to Athlete' };
    }
    const clean = rawRole.trim().toLowerCase();
    if (clean.includes('scout') || clean.includes('recruiter')) return { role: 'scout' };
    if (clean.includes('coach') || clean.includes('trainer')) return { role: 'coach' };
    if (clean.includes('org') || clean.includes('school') || clean.includes('club')) return { role: 'organization' };
    if (clean.includes('creator') || clean.includes('media')) return { role: 'creator' };
    if (clean.includes('admin')) return { role: 'admin' };
    if (clean.includes('athlete') || clean.includes('player')) return { role: 'athlete' };
    
    return { role: 'athlete', warning: `Unrecognized role "${rawRole}"; defaulted to Athlete` };
  }

  /**
   * Parse CSV File and validate all rows with detailed error reporting
   */
  public static async parseAndValidateCsv(file: File): Promise<{
    records: ParsedMemberRecord[];
    totalRows: number;
    validRows: number;
    invalidRows: number;
  }> {
    return new Promise((resolve, reject) => {
      Papa.parse<CsvRawRow>(file, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (header) => CsvMemberImportService.normalizeKey(header),
        complete: (results) => {
          try {
            const seenEmails = new Set<string>();
            const records: ParsedMemberRecord[] = [];
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            results.data.forEach((row, index) => {
              const rowNumber = index + 2; // Accounting for 1-based index + header row
              const errors: string[] = [];
              const warnings: string[] = [];

              const firstName = (row['firstName'] || row['firstname'] || row['name'] || '').trim();
              const lastName = (row['lastName'] || row['lastname'] || '').trim();
              const rawEmail = (row['email'] || '').trim();
              const email = rawEmail.toLowerCase();
              const phone = (row['phone'] || '').trim();
              const rawRole = row['role'] || '';
              const { role, warning: roleWarning } = CsvMemberImportService.parseRole(rawRole);
              if (roleWarning) warnings.push(roleWarning);

              const sport = (row['sport'] || '').trim() || 'Basketball';
              if (!row['sport']) {
                warnings.push('Sport was empty; defaulted to Basketball');
              }

              const graduationYear = (row['graduationYear'] || row['gradyear'] || '').trim();
              const teamName = (row['teamName'] || row['team'] || row['highSchool'] || '').trim();

              // Validation Checks
              if (!firstName) {
                errors.push('Missing First Name');
              }
              if (!lastName && !firstName.includes(' ')) {
                // If single name provided in first name, we can split
                if (!firstName) errors.push('Missing Last Name');
              }

              if (!rawEmail) {
                errors.push('Missing Email Address');
              } else if (!emailRegex.test(email)) {
                errors.push(`Invalid Email Format ("${rawEmail}")`);
              } else if (seenEmails.has(email)) {
                errors.push(`Duplicate Email in CSV ("${email}")`);
              } else {
                seenEmails.add(email);
              }

              const displayName = `${firstName} ${lastName}`.trim() || firstName || 'Member';
              const isValid = errors.length === 0;

              records.push({
                id: `parsed-row-${index + 1}`,
                rowNumber,
                firstName,
                lastName,
                displayName,
                email,
                phone,
                role,
                sport,
                graduationYear,
                teamName,
                isValid,
                errors,
                warnings
              });
            });

            const validRows = records.filter(r => r.isValid).length;
            const invalidRows = records.length - validRows;

            resolve({
              records,
              totalRows: records.length,
              validRows,
              invalidRows
            });
          } catch (err) {
            reject(err);
          }
        },
        error: (error) => {
          reject(new Error(`Failed to parse CSV file: ${error.message}`));
        }
      });
    });
  }

  /**
   * Execute batch-writes to Firestore 'users' and 'members' collections with chunking and progress reporting
   */
  public static async batchImportMembersToFirestore(
    records: ParsedMemberRecord[],
    onProgress?: (progress: CsvImportProgress) => void
  ): Promise<{
    successCount: number;
    failedCount: number;
    errors: string[];
    summary: CsvImportSummary;
  }> {
    const validRecords = records.filter(r => r.isValid);
    const totalCount = validRecords.length;

    if (totalCount === 0) {
      throw new Error('No valid records found to import. Please review validation errors.');
    }

    if (!db) {
      throw new Error('Firestore database instance is not available.');
    }

    // Chunk records into batches of 150 items (each record performs 2 set operations: users + members = 300 ops max, well below Firestore 500 limit)
    const CHUNK_SIZE = 150;
    const chunks: ParsedMemberRecord[][] = [];
    for (let i = 0; i < validRecords.length; i += CHUNK_SIZE) {
      chunks.push(validRecords.slice(i, i + CHUNK_SIZE));
    }

    const totalBatches = chunks.length;
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    onProgress?.({
      status: 'importing',
      currentBatch: 1,
      totalBatches,
      processedCount: 0,
      totalCount,
      percentage: 0,
      message: `Starting import for ${totalCount} valid members across ${totalBatches} batch(es)...`
    });

    for (let bIndex = 0; bIndex < chunks.length; bIndex++) {
      const chunk = chunks[bIndex];
      const batchNum = bIndex + 1;
      const batch = writeBatch(db);

      for (let rIndex = 0; rIndex < chunk.length; rIndex++) {
        const record = chunk[rIndex];
        const uniqueSuffix = `${Date.now()}_${bIndex}_${rIndex}_${Math.random().toString(36).substring(2, 6)}`;
        const uid = `usr_csv_${uniqueSuffix}`;
        const athleteId = `J1P-${Math.floor(100000 + Math.random() * 900000)}`;

        const positionDefault = record.role === 'athlete' 
          ? 'Athlete' 
          : record.role === 'coach' 
            ? 'Head Coach' 
            : record.role === 'scout' 
              ? 'Official Scout' 
              : 'Member';

        const userProfileDoc: UserProfile = {
          uid,
          athleteId,
          email: record.email,
          displayName: record.displayName,
          role: record.role,
          sport: record.sport,
          gradYear: record.graduationYear || '2026',
          highSchool: record.teamName || 'Tri-State High School',
          teamName: record.teamName || '',
          state: 'NJ',
          position: positionDefault,
          height: record.role === 'athlete' ? "6'1\"" : '',
          weight: record.role === 'athlete' ? '180 lbs' : '',
          gpa: record.role === 'athlete' ? '3.6' : '',
          bio: `Member imported via Admin CSV Batch Import (${record.teamName || record.sport}).`,
          isVerified: true,
          hasCompletedOnboarding: true,
          social: { instagram: '', twitter: '', tiktok: '', hudl: '' },
          stats: { points: 15.5, rebounds: 5.2, assists: 4.1, steals: 1.8, blocks: 0.7 },
          mediaUrls: [],
          preferences: {
            preferredSport: record.sport,
            notificationAlerts: true,
            defaultDashboard: record.role
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Dual write to 'users' collection and 'members' collection
        const userRef = doc(db, 'users', uid);
        batch.set(userRef, userProfileDoc);

        const memberRef = doc(db, 'members', uid);
        batch.set(memberRef, {
          ...userProfileDoc,
          phone: record.phone,
          importSource: 'csv_batch_admin',
          importedAt: new Date().toISOString()
        });
      }

      try {
        await batch.commit();
        processedCount += chunk.length;
        successCount += chunk.length;

        const percentage = Math.round((processedCount / totalCount) * 100);
        onProgress?.({
          status: bIndex === totalBatches - 1 ? 'completed' : 'importing',
          currentBatch: batchNum,
          totalBatches,
          processedCount,
          totalCount,
          percentage,
          message: `Batch ${batchNum} of ${totalBatches} committed successfully (${processedCount}/${totalCount} members).`
        });
      } catch (err: any) {
        console.error(`Error committing batch ${batchNum}:`, err);
        failedCount += chunk.length;
        errors.push(`Batch ${batchNum} failed: ${err.message || 'Firestore write error'}`);
      }
    }

    const summary: CsvImportSummary = {
      fileName: 'Imported CSV',
      fileSizeBytes: 0,
      totalRows: records.length,
      validRows: validRecords.length,
      invalidRows: records.length - validRecords.length,
      importedCount: successCount,
      failedCount,
      importedAt: new Date().toISOString(),
      records
    };

    return {
      successCount,
      failedCount,
      errors,
      summary
    };
  }
}
