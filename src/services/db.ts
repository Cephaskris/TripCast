import * as SQLite from 'expo-sqlite';

export interface Ad {
  id: string;
  title: string;
  local_file_path: string;
  target_play_date: string;
}

export interface PlaybackLog {
  id: number;
  ad_id: string;
  timestamp: number;
  is_synced: number;
}

// Global database instance
let db: SQLite.SQLiteDatabase | null = null;

export const initDB = async () => {
  try {
    db = await SQLite.openDatabaseAsync('tripcast.db');
    
    // Create ads table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS ads (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        local_file_path TEXT NOT NULL,
        target_play_date TEXT
      );
    `);

    // Create playback_logs table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS playback_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ad_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        is_synced INTEGER DEFAULT 0
      );
    `);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

export const logPlayback = async (adId: string) => {
  if (!db) return;
  const timestamp = Date.now();
  try {
    await db.runAsync(
      'INSERT INTO playback_logs (ad_id, timestamp, is_synced) VALUES (?, ?, 0)',
      adId, timestamp
    );
    console.log(`Logged playback for ad ${adId} at ${timestamp}`);
  } catch (error) {
    console.error('Error logging playback:', error);
  }
};

export const getUnsyncedLogs = async (): Promise<PlaybackLog[]> => {
  if (!db) return [];
  try {
    const logs = await db.getAllAsync<PlaybackLog>('SELECT * FROM playback_logs WHERE is_synced = 0');
    return logs;
  } catch (error) {
    console.error('Error getting unsynced logs:', error);
    return [];
  }
};

export const markLogsAsSynced = async (logIds: number[]) => {
  if (!db || logIds.length === 0) return;
  try {
    const ids = logIds.join(',');
    await db.runAsync(`UPDATE playback_logs SET is_synced = 1 WHERE id IN (${ids})`);
    console.log(`Marked ${logIds.length} logs as synced.`);
  } catch (error) {
    console.error('Error marking logs as synced:', error);
  }
};

export const getAds = async (): Promise<Ad[]> => {
  if (!db) return [];
  try {
    const ads = await db.getAllAsync<Ad>('SELECT * FROM ads');
    return ads;
  } catch (error) {
    console.error('Error getting ads:', error);
    return [];
  }
};

export const deleteAd = async (id: string) => {
  if (!db) return;
  try {
    await db.runAsync('DELETE FROM ads WHERE id = ?', id);
  } catch (error) {
    console.error(`Error deleting ad ${id}:`, error);
  }
};

export const insertAd = async (ad: Ad) => {
  if (!db) return;
  try {
    await db.runAsync(
      'INSERT OR REPLACE INTO ads (id, title, local_file_path, target_play_date) VALUES (?, ?, ?, ?)',
      ad.id, ad.title, ad.local_file_path, ad.target_play_date
    );
  } catch (error) {
    console.error(`Error inserting ad ${ad.id}:`, error);
  }
};

// Seed dummy data for testing if empty
export const seedDummyAds = async () => {
  if (!db) return;
  // Clean up any old non-file URIs from earlier tests so fresh local files are downloaded
  await db.runAsync("DELETE FROM ads WHERE local_file_path LIKE 'http%'");
};
