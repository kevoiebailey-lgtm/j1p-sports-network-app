/**
 * Shared Firestore collection definitions and subcollection mappings
 * for Just1Play migration, backup, and restore routines.
 */

export const CORE_COLLECTIONS = [
  'users',
  'athletes',
  'scouts',
  'scouting_notes',
  'tournaments',
  'games',
  'posts',
  'comments',
  'locker_room_posts',
  'gallery',
  'videos',
  'checkins',
  'site_announcements',
  'plays',
  'stripe_payments',
  'tournament_entries',
  'game_stats',
  'albums',
  'Albums',
  'brackets',
  'chats',
  'direct_messages',
  'notifications',
  'feed_posts',
  'organizers',
  'teams',
  'streamRooms',
  'liveStreams'
];

export const KNOWN_SUBCOLLECTIONS: Record<string, string[]> = {
  posts: ['comments', 'reactions'],
  locker_room_posts: ['comments', 'reactions'],
  tournaments: ['games', 'brackets', 'teams', 'schedules', 'referees'],
  events: ['brackets', 'checkins', 'registrations'],
  users: ['game_stats', 'notifications', 'purchases', 'bookmarks'],
  streamRooms: ['chat', 'viewers'],
  liveStreams: ['chat', 'reactions']
};
