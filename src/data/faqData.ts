export interface FaqItem {
  id: string;
  category: 'account' | 'tournaments' | 'director' | 'gallery' | 'videos' | 'events' | 'credentials' | 'scouting' | 'social' | 'payments' | 'general';
  question: string;
  answer: string;
  steps?: string[];
  tags: string[];
  roleTarget?: ('athlete' | 'scout' | 'director' | 'viewer' | 'admin' | 'all')[];
  featured?: boolean;
}

export interface FaqCategory {
  key: string;
  label: string;
  iconName: string;
  description: string;
  count?: number;
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  { key: 'all', label: 'All Topics', iconName: 'HelpCircle', description: 'Browse all platform guides, tutorials, and FAQs' },
  { key: 'account', label: 'Accounts & Roles', iconName: 'UserCheck', description: 'Login, logout, profile setup, and switching user roles' },
  { key: 'events', label: 'Events & Combines', iconName: 'Calendar', description: 'Registering for showcases, combines, camps, and RSVP' },
  { key: 'tournaments', label: 'Tournaments & Brackets', iconName: 'Trophy', description: 'Creating tournaments, brackets, pools, and live schedules' },
  { key: 'director', label: 'Director Command Desk', iconName: 'SlidersHorizontal', description: 'Court management, delay offsets, rosters, and payouts' },
  { key: 'gallery', label: '4K Photo Vault', iconName: 'Camera', description: 'Searching albums, downloading high-res photos, and media' },
  { key: 'videos', label: 'Video Reels & Film', iconName: 'Film', description: 'Uploading game tape, highlight reels, and video embeds' },
  { key: 'credentials', label: 'QR Passes & Check-In', iconName: 'QrCode', description: 'Athlete QR passes, age verification, and gate scanning' },
  { key: 'scouting', label: 'Scouting Matrix', iconName: 'Crosshair', description: 'College recruiter search, player cards, and combine radar' },
  { key: 'social', label: 'The Locker Room', iconName: 'Flame', description: 'Community social feed, discussions, photos, and reactions' },
  { key: 'payments', label: 'Payments & PayPal', iconName: 'CreditCard', description: 'Entry fees, media deposits, refunds, and PayPal security' },
];

export const ALL_FAQ_DATA: FaqItem[] = [
  // 1. ACCOUNTS, AUTH & ROLES
  {
    id: 'acc-1',
    category: 'account',
    question: 'How do I create an account or sign in to Just1Play?',
    answer: 'You can create an account or sign in using your email address and password or via 1-click Google Authentication. Every user gets a unified Just1Play ID that works across all devices.',
    steps: [
      'Click the "Sign In" or "Get Started" button in the navigation bar.',
      'Choose either "Sign In with Google" for instant 1-click login or enter your Email and Password.',
      'If you are new, select your primary role (Athlete, Coach/Scout, Director, or Fan/Viewer).',
      'Complete your initial profile details (Name, Sport, Jersey #, or Organization).'
    ],
    tags: ['sign in', 'login', 'create account', 'register', 'google auth', 'password'],
    roleTarget: ['all'],
    featured: true
  },
  {
    id: 'acc-2',
    category: 'account',
    question: 'How do I log out of my account?',
    answer: 'Logging out takes just 1 click and securely clears your session token from your device.',
    steps: [
      'Tap your Profile Avatar / Initials in the top-right corner of the screen.',
      'In the dropdown profile menu, scroll down to the bottom.',
      'Click the red "Log Out" button with the power icon.',
      'You will be safely logged out and redirected to the public hub.'
    ],
    tags: ['logout', 'sign out', 'log off', 'session', 'exit'],
    roleTarget: ['all'],
    featured: true
  },
  {
    id: 'acc-3',
    category: 'account',
    question: 'What are the 5 User Roles and how do I switch between them?',
    answer: 'Just1Play features 5 specialized role perspectives: Athlete (film & stats), Coach / Scout (talent discovery), Tournament Director (brackets & score desk), Fan / Viewer (live center & media), and Super Admin (platform command). You can switch roles anytime to test or access different features.',
    steps: [
      'Click your Profile Avatar in the top-right header.',
      'Under "Switch Role Perspective", select the role you want to view (Athlete, Scout, Director, Viewer, or Admin).',
      'The interface instantly re-configures its bottom dock, tabs, and permissions to match that role.',
      'You can also open the App Matrix Drawer (top-left menu) to jump directly into any role hub.'
    ],
    tags: ['roles', 'switch role', 'athlete', 'scout', 'director', 'viewer', 'admin', 'permissions'],
    roleTarget: ['all'],
    featured: true
  },
  {
    id: 'acc-4',
    category: 'account',
    question: 'How do I update my athlete profile, combine stats, or photo?',
    answer: 'Athletes can update their bio, GPA, SAT/ACT scores, height, weight, 40-yard dash times, social links, and profile photos directly from their Player Card.',
    steps: [
      'Navigate to "Athlete View" -> "Player Card" (or route /dashboard/athlete/profile).',
      'Click the "Edit Profile" button.',
      'Update your basic stats, school, graduation year, position, and bio.',
      'Click "Save Changes" to publish your updated metrics live to the Scouting Matrix.'
    ],
    tags: ['profile', 'edit stats', 'gpa', 'height', 'weight', 'avatar', 'player card'],
    roleTarget: ['athlete'],
    featured: false
  },
  {
    id: 'acc-5',
    category: 'account',
    question: 'What should I do if I forgot my password?',
    answer: 'On the Sign In popup modal, click "Forgot Password?". Enter your registered email address, and a secure password reset link will be sent to your inbox within seconds.',
    tags: ['forgot password', 'reset password', 'account recovery', 'email'],
    roleTarget: ['all'],
    featured: false
  },

  // 2. EVENTS, SHOWCASES & COMBINES
  {
    id: 'evt-1',
    category: 'events',
    question: 'How do I browse and register for upcoming Showcases, Combines, and Camps?',
    answer: 'The Events & Showcase Hub (/events) lists all sanctioned Just1Play combines, 7-on-7 tournaments, camp clinics, and media days across NJ, NY, and PA with instant digital RSVP.',
    steps: [
      'Go to the "Events Hub" via the top navigation or App Matrix.',
      'Filter events by Sport (Basketball, Football, Soccer, Track) or Event Type (Combine, Showcase, Tournament).',
      'Click on any event card to view the full itinerary, venue location map, age brackets, and ticket pricing.',
      'Click "Register / RSVP", select your division or ticket tier, and complete checkout.'
    ],
    tags: ['events', 'register', 'rsvp', 'showcase', 'combines', 'camps', 'tickets'],
    roleTarget: ['athlete', 'director', 'viewer'],
    featured: true
  },
  {
    id: 'evt-2',
    category: 'events',
    question: 'How does the Combine Laser Leaderboard work?',
    answer: 'During Just1Play combines, certified timers record official 40-Yard Dash laser sprints, Pro Agility 5-10-5 shuttles, Vertical Jumps, and Broad Jumps. These times sync directly to the Combine Leaderboard (/combine).',
    steps: [
      'Participate in a sanctioned Just1Play combine or media event.',
      'Official laser timers record your attempts at each drill station.',
      'Results are verified and uploaded to the live Combine Leaderboard in real-time.',
      'Scouts can sort athletes by 40-yard dash speed, athleticism rating, and graduation class.'
    ],
    tags: ['combine', 'leaderboard', '40 yard dash', 'laser timed', 'vertical jump', 'shuttle'],
    roleTarget: ['athlete', 'scout'],
    featured: true
  },
  {
    id: 'evt-3',
    category: 'events',
    question: 'Can I purchase spectator tickets or VIP hospitality passes for events?',
    answer: 'Yes. Every event page offers Spectator General Admission, Weekend Passes, and VIP Scout Hospitality credentials with digital QR passes sent immediately to your phone.',
    tags: ['spectator tickets', 'passes', 'vip', 'admission', 'gate entry'],
    roleTarget: ['viewer', 'scout'],
    featured: false
  },

  // 3. TOURNAMENTS & BRACKETS
  {
    id: 'trn-1',
    category: 'tournaments',
    question: 'How do I create and publish a new Tournament on Just1Play?',
    answer: 'Tournament Directors and Admins can build complete tournaments with custom divisions, entry fees, venues, and auto-generated brackets using our 5-Step Tournament Wizard.',
    steps: [
      'Switch to "Director View" or "Admin View" and navigate to "Events / Tournaments".',
      'Click the "+ Create Tournament" button.',
      'Step 1: Enter Tournament Title, Sport, Start/End Dates, and Venue Address.',
      'Step 2: Define Age Divisions (e.g. 14U Open, 17U Varsity, Gold/Silver Brackets).',
      'Step 3: Set Team Entry Fee (e.g. $450/team) and Team Limit (e.g. 16 teams).',
      'Step 4: Choose Bracket Format (Single Elimination, Double Elimination, or Pool-to-Bracket).',
      'Step 5: Click "Publish Tournament" to launch the public registration page.'
    ],
    tags: ['create tournament', 'tournament director', 'brackets', 'new tournament', 'publish event'],
    roleTarget: ['director', 'admin'],
    featured: true
  },
  {
    id: 'trn-2',
    category: 'tournaments',
    question: 'How do live Double Elimination and Single Elimination brackets work?',
    answer: 'Just1Play features a reactive bracket engine. When game scores are submitted at court tables, the bracket automatically moves winners to the next round, drops losers to the consolation bracket (if double elimination), and calculates championship matchups.',
    tags: ['double elimination', 'single elimination', 'bracket tree', 'advancement', 'championship'],
    roleTarget: ['director', 'viewer', 'athlete'],
    featured: true
  },
  {
    id: 'trn-3',
    category: 'tournaments',
    question: 'How do coaches register their team roster for a tournament?',
    answer: 'Coaches head to the tournament page, click "Register Team", enter their team name, select the division, upload or select roster athletes, and complete the registration entry fee checkout via PayPal.',
    tags: ['team registration', 'roster upload', 'coach register', 'entry fee'],
    roleTarget: ['director', 'athlete'],
    featured: false
  },
  {
    id: 'trn-4',
    category: 'tournaments',
    question: 'How do referees and scorekeepers submit live game scores?',
    answer: 'Referees use the mobile-optimized Director Score Desk (/dashboard/director/scores) to tap live scoring buttons (+1, +2, +3, +6 TD), start/pause the court clock, and submit the final score to update brackets instantly.',
    tags: ['scorekeeper', 'referee', 'live scores', 'court clock', 'game score'],
    roleTarget: ['director', 'admin'],
    featured: false
  },

  // 4. DIRECTOR MASTER COMMAND DESK
  {
    id: 'dir-1',
    category: 'director',
    question: 'What is the Director Master Command Desk and how do I use it?',
    answer: 'The Director Master Command Desk (/dashboard/director) is the operational nerve center for event organizers to manage court clocks, broadcast facility delays, oversee team rosters, and track tournament finances.',
    steps: [
      'Switch your role to "Director" from your profile menu.',
      'Tab 1 (Command): Broadcast 0, +5, +15, +30 min court delay offsets or send emergency text alerts.',
      'Tab 2 (Score Desk): Control multi-court game clocks, period progressions, and live scoring.',
      'Tab 3 (Brackets): View pool standings, point differentials, and advance seeds to championship rounds.',
      'Tab 4 (Ops & Ledger): Track registration revenue, athlete liability waivers, and PayPal Commerce payouts.'
    ],
    tags: ['director command desk', 'court delay', 'delay offset', 'emergency alert', 'director hub'],
    roleTarget: ['director', 'admin'],
    featured: true
  },
  {
    id: 'dir-2',
    category: 'director',
    question: 'How do Master Court Delay Offsets work?',
    answer: 'If games on Court 1 or Field 2 run late, the Director taps "+15 min" on the Command Desk. This instantly offsets all upcoming match countdowns and sends an alert banner to coaches and parents without manually editing every game time.',
    tags: ['court delay', 'delay offset', 'schedule update', 'game delay', 'weather delay'],
    roleTarget: ['director'],
    featured: true
  },
  {
    id: 'dir-3',
    category: 'director',
    question: 'How do Tournament Directors receive payouts via PayPal Partner Commerce?',
    answer: 'Tournament Directors connect their PayPal merchant account in the Operations tab. Team registration fees collected on Just1Play automatically split and settle instantly into the director\'s linked PayPal account with automated platform fee deduction.',
    tags: ['paypal commerce', 'director payout', 'instant settlement', 'registration fees', 'merchant onboarding'],
    roleTarget: ['director', 'admin'],
    featured: false
  },

  // 5. 4K PHOTO VAULT & MEDIA
  {
    id: 'gal-1',
    category: 'gallery',
    question: 'How do I find, view, and download 4K action photos of an athlete?',
    answer: 'The Just1Play 4K Media & Photo Vault (/gallery) hosts high-resolution game photography categorized by tournament, sport, team, and tagged athletes.',
    steps: [
      'Go to "Media Gallery" (/gallery) from the navigation bar or App Matrix.',
      'Filter by Sport, Event, or use the Search bar to type an athlete name, jersey number, or team name.',
      'Click on any photo thumbnail to open the full-screen 4K Lightbox.',
      'Click "Download High-Res" to save the crystal-clear uncompressed 4K photo directly to your phone or computer.'
    ],
    tags: ['download photos', '4k vault', 'gallery', 'high res', 'action photos', 'lightbox', 'watermark'],
    roleTarget: ['all'],
    featured: true
  },
  {
    id: 'gal-2',
    category: 'gallery',
    question: 'What is the difference between Watermarked previews and Full Clean Master downloads?',
    answer: 'Public previews display a subtle Just1Play security watermark. Once purchased or when logged in as an authorized athlete, parent, director, or media pass holder, you can download the 100% clean, uncompressed full-resolution photo master.',
    tags: ['watermark', 'clean master', 'photo resolution', 'commercial license'],
    roleTarget: ['viewer', 'athlete'],
    featured: false
  },
  {
    id: 'gal-3',
    category: 'gallery',
    question: 'How do photographers and media staff upload photos in bulk?',
    answer: 'Admins and approved media staff can use the Gallery Manager in the Admin Console (/dashboard/admin) to drag-and-drop hundreds of photos simultaneously, set album titles, tag players, and assign prices.',
    tags: ['bulk upload', 'photographer', 'media upload', 'album creator'],
    roleTarget: ['admin', 'director'],
    featured: false
  },

  // 6. VIDEO REELS & HIGHLIGHTS
  {
    id: 'vid-1',
    category: 'videos',
    question: 'How do I upload or embed video highlight reels to my profile?',
    answer: 'Athletes can attach game film, Hudl links, YouTube mixtapes, TikTok highlights, and Instagram reels directly to their Player Card and Film room.',
    steps: [
      'Go to "Athlete View" -> "Film" (/dashboard/athlete/film).',
      'Click "+ Add Highlight Video".',
      'Paste your video link (YouTube, Hudl, Vimeo, or MP4 cloud link).',
      'Enter the Video Title, Sport, and optional timestamp notes.',
      'Click "Save Video" — your reel will immediately appear on your public scouting profile.'
    ],
    tags: ['upload video', 'highlight reel', 'hudl', 'youtube embed', 'game tape', 'mixtape'],
    roleTarget: ['athlete', 'director'],
    featured: true
  },
  {
    id: 'vid-2',
    category: 'videos',
    question: 'How do I book a Just1Play videographer for raw game film or a custom mixtape?',
    answer: 'Use the Media Coverage Calculator on the Pricing page or Storefront. Choose Raw Game Tape ($150), Highlight Reel ($250), or Full Hype Mixtape ($400), pick your game date, and secure your slot with a 50% deposit.',
    tags: ['book videographer', 'game film', 'custom mixtape', 'media pricing', 'deposit'],
    roleTarget: ['all'],
    featured: true
  },

  // 7. QR CREDENTIAL PASS & CHECK-IN
  {
    id: 'crd-1',
    category: 'credentials',
    question: 'What is the Athlete QR Digital Credential Pass and where do I find it?',
    answer: 'Every registered athlete receives an official dynamic QR pass containing verified player eligibility, team roster assignment, emergency contact info, and combine metrics. Find it on your Player Card (/dashboard/athlete/profile) or under your account badge.',
    steps: [
      'Navigate to your "Player Card" or tap your profile badge.',
      'Click "View QR Credential Pass".',
      'Present this QR code on your phone screen to gate staff upon arrival at any Just1Play tournament or showcase.'
    ],
    tags: ['qr pass', 'digital pass', 'check-in', 'barcode', 'credential', 'player badge'],
    roleTarget: ['athlete', 'viewer'],
    featured: true
  },
  {
    id: 'crd-2',
    category: 'credentials',
    question: 'How does the Admin & Staff Gate Check-In Scanner work?',
    answer: 'Gate staff open the Check-In Scanner (/dashboard/admin) to scan athlete passes, coach badges, and spectator tickets in real-time. The scanner validates passes, prevents duplicate re-entries, and logs entry gate timestamps to Firestore.',
    tags: ['scanner', 'gate check-in', 'duplicate warning', 'bib number', 'attendance'],
    roleTarget: ['admin', 'director'],
    featured: false
  },

  // 8. SCOUTING MATRIX & RECRUITER RADAR
  {
    id: 'sct-1',
    category: 'scouting',
    question: 'How do college coaches and scouts search for athletes on the Matrix?',
    answer: 'The Athlete Scouting Matrix (/athletes or /dashboard/scout) lets verified recruiters filter thousands of prospects by Sport, Graduation Year (2025–2030), Position, State, GPA (e.g. 3.5+), Height, and 40-Yard Dash times.',
    steps: [
      'Switch to "Scout View" or visit the Scouting Matrix (/athletes).',
      'Use the filter sidebar to select your target criteria (e.g. Class of 2026 Point Guards with 3.5+ GPA in NJ/NY).',
      'Click on any athlete card to view their full Player Card, video reels, combine laser metrics, and coach contact info.',
      'Click "+ Add to Watchlist" to track the prospect\'s upcoming games and stat updates.'
    ],
    tags: ['scouting matrix', 'college coach', 'recruiter', 'search athletes', 'gpa filter', 'watchlist'],
    roleTarget: ['scout', 'admin'],
    featured: true
  },
  {
    id: 'sct-2',
    category: 'scouting',
    question: 'How do scouts get the "Verified NCAA / Pro Scout" badge?',
    answer: 'College coaches and professional scouts submit their institution email (.edu or official athletic department address). Just1Play administrators review the credential and grant full scout access with the Verified Scout badge.',
    tags: ['verified scout', 'ncaa scout', 'recruiter credential', 'verification'],
    roleTarget: ['scout'],
    featured: false
  },

  // 9. THE LOCKER ROOM & COMMUNITY SOCIAL WALL
  {
    id: 'soc-1',
    category: 'social',
    question: 'What is The Locker Room Social Wall and how do I post?',
    answer: 'The Locker Room (/locker-room) is Just1Play\'s live community feed where athletes, coaches, and fans share game reactions, buzzer-beater clips, scholarship offers, and tournament photos.',
    steps: [
      'Visit "The Locker Room" (/locker-room) from the top bar or App Matrix.',
      'Click the "Share Post" box at the top of the feed.',
      'Type your message, attach an image/video URL, and select your sport tag.',
      'Click "Post to Locker Room" to share with the community.'
    ],
    tags: ['locker room', 'social wall', 'community feed', 'share post', 'comments', 'likes'],
    roleTarget: ['all'],
    featured: true
  },
  {
    id: 'soc-2',
    category: 'social',
    question: 'How does content moderation work in The Locker Room?',
    answer: 'Just1Play maintains a strictly positive, sportsmanship-first environment. Our AI-assisted filter and Super Admin moderation team monitor posts 24/7. Offensive language, harassment, or unauthorized spam is immediately removed.',
    tags: ['moderation', 'community guidelines', 'safety', 'report post'],
    roleTarget: ['all'],
    featured: false
  },

  // 10. PAYMENTS, PAYPAL & REFUNDS
  {
    id: 'pay-1',
    category: 'payments',
    question: 'What payment methods does Just1Play accept?',
    answer: 'We accept PayPal, Pay Later, all major Credit and Debit cards (Visa, MasterCard, American Express, Discover), and Venmo through the 256-bit encrypted PayPal Partner Commerce Platform.',
    tags: ['payments', 'paypal', 'pay later', 'credit card', 'venmo', 'checkout'],
    roleTarget: ['all'],
    featured: true
  },
  {
    id: 'pay-2',
    category: 'payments',
    question: 'What is the Out-of-State Travel Fee policy for media bookings?',
    answer: 'Events within New Jersey incur $0 travel fees. For events located in neighboring states (New York, Pennsylvania, Connecticut, Delaware, Maryland), a flat $150 travel surcharge is added to cover equipment transport, tolls, and technician transit.',
    tags: ['travel fee', 'out of state', 'media pricing', 'new jersey', 'new york'],
    roleTarget: ['all'],
    featured: true
  },
  {
    id: 'pay-3',
    category: 'payments',
    question: 'What is the refund policy for tournaments and media bookings?',
    answer: 'Media booking deposits are 100% refundable up to 72 hours before the scheduled event start time. If a tournament is postponed or cancelled due to severe weather, full registration credits are provided toward the rescheduled date or future events.',
    tags: ['refund policy', 'cancellation', 'weather delay', 'credits', 'deposit refund'],
    roleTarget: ['all'],
    featured: true
  },

  // 11. GENERAL & PLATFORM ARCHITECTURE
  {
    id: 'gen-1',
    category: 'general',
    question: 'Is Just1Play affiliated with or reliant on external apps like Zorts or Tourney Machine?',
    answer: 'No. Just1Play (just1play.com) is a 100% standalone, modern sports technology ecosystem. Brackets, scorekeeper consoles, athlete matrices, QR passes, and video vaults run natively on our cloud platform without requiring third-party software.',
    tags: ['standalone', 'zorts', 'tourney machine', 'platform architecture'],
    roleTarget: ['all'],
    featured: false
  },
  {
    id: 'gen-2',
    category: 'general',
    question: 'How do I contact Just1Play executive support or report a problem?',
    answer: 'You can reach Just1Play support 7 days a week via email at kevoiebailey@gmail.com, phone at (201) 206-9097, or by submitting a ticket through the Contact modal in the Help Center.',
    tags: ['contact', 'support', 'phone number', 'email', 'help desk', 'customer service'],
    roleTarget: ['all'],
    featured: true
  }
];

export const QUICK_HOW_TO_GUIDES = [
  {
    id: 'guide-login',
    title: 'Sign In, Sign Out & Switch Roles',
    category: 'account',
    shortDesc: 'Master the 5 role perspectives (Athlete, Scout, Director, Viewer, Admin) and account controls.',
    iconName: 'UserCheck',
    color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/40 text-cyan-400',
    steps: [
      'Click "Sign In" in the top bar to log in with Google or Email/Password.',
      'Click your Avatar in the top-right to switch between Athlete, Scout, Director, Viewer, or Admin modes.',
      'Click "Log Out" at the bottom of the profile dropdown to securely exit.'
    ]
  },
  {
    id: 'guide-create-event',
    title: 'Create & Host a Tournament',
    category: 'tournaments',
    shortDesc: 'Step-by-step walkthrough to build brackets, set divisions, and collect team fees.',
    iconName: 'Trophy',
    color: 'from-amber-500/20 to-yellow-500/20 border-amber-500/40 text-amber-400',
    steps: [
      'Switch to Director or Admin View and navigate to "Events / Tournaments".',
      'Click "+ Create Tournament" to open the 5-Step Wizard.',
      'Set your dates, venue location, divisions (14U, 17U, Varsity), entry fee, and bracket format.',
      'Publish to immediately accept live team registrations via PayPal.'
    ]
  },
  {
    id: 'guide-download-photos',
    title: 'Find & Download 4K Action Photos',
    category: 'gallery',
    shortDesc: 'Search game albums, tag your athlete, and download crystal-clear master files.',
    iconName: 'Camera',
    color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/40 text-purple-400',
    steps: [
      'Open the "4K Photo Vault" (/gallery) from the navigation bar.',
      'Search by athlete name, jersey number, team, or filter by tournament sport.',
      'Click any thumbnail to open the Lightbox viewer.',
      'Click "Download High-Res" for direct uncompressed 4K download.'
    ]
  },
  {
    id: 'guide-qr-pass',
    title: 'Access & Scan Athlete QR Pass',
    category: 'credentials',
    shortDesc: 'Gate entry verification, proof-of-age badges, and fast barcode scanning.',
    iconName: 'QrCode',
    color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-400',
    steps: [
      'Athletes: View your digital pass on your Player Card or Account Badge.',
      'Venue Staff: Open the Gate Check-In Scanner (/dashboard/admin).',
      'Point camera at the pass to instantly verify eligibility and prevent duplicates.'
    ]
  }
];
