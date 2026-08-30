import * as FileSystem from 'expo-file-system/legacy';
import { getAds, insertAd, deleteAd, Ad } from './db';
import { getApiBaseUrl } from './deviceService';

export interface RemoteAd {
  id: string;
  title: string;
  video_url: string;
  target_play_date: string;
}

import { convex } from './convexClient';
import { api } from '../../convex/_generated/api';

/**
 * Fetches the daily manifest, downloads missing videos to local storage,
 * and updates the SQLite ads table.
 * Syncs directly with Convex Cloud database.
 */
export const downloadPayload = async () => {
  try {
    console.log('Fetching active ad manifest...');
    let manifest: RemoteAd[] = [];

    // 1. Try Convex Cloud database first
    try {
      const convexAds = await convex.query(api.campaigns.list, { status: 'ACTIVE' });
      if (convexAds && convexAds.length > 0) {
        manifest = convexAds.map(c => ({
          id: String(c._id),
          title: c.title,
          video_url: c.video_url,
          target_play_date: c.start_date ? c.start_date.split('T')[0] : '2026-08-30',
        }));
        console.log(`[CONVEX CLOUD] Retrieved ${manifest.length} active campaigns from Convex.`);
      }
    } catch (convexErr) {
      console.log('[CONVEX CLOUD] Fallback to REST API for manifest:', convexErr);
    }

    // 2. Fallback to local REST API if Convex has no active ads or in offline mode
    if (manifest.length === 0) {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/manifest`);
      if (response.ok) {
        manifest = await response.json();
      }
    }

    const localAds = await getAds();
    const manifestIds = new Set(manifest.map(ad => ad.id));

    // 1. Purge expired videos (Local files not in the current manifest)
    for (const localAd of localAds) {
      if (!manifestIds.has(localAd.id)) {
        console.log(`Purging expired ad: ${localAd.id}`);
        try {
          await FileSystem.deleteAsync(localAd.local_file_path, { idempotent: true });
        } catch (fileErr) {
          console.warn(`Could not delete file ${localAd.local_file_path}:`, fileErr);
        }
        await deleteAd(localAd.id);
      }
    }

    // 2. Download missing or remote-only videos
    const localAdMap = new Map(localAds.map(ad => [ad.id, ad]));
    
    for (const remoteAd of manifest) {
      const existing = localAdMap.get(remoteAd.id);
      let needsDownload = false;

      if (!existing) {
        needsDownload = true;
      } else if (!existing.local_file_path.startsWith('file://')) {
        needsDownload = true;
      } else {
        const fileInfo = await FileSystem.getInfoAsync(existing.local_file_path);
        if (!fileInfo.exists) {
          needsDownload = true;
        }
      }

      if (needsDownload) {
        console.log(`Downloading video for ad: ${remoteAd.id} from ${remoteAd.video_url}`);
        
        const localUri = FileSystem.documentDirectory + `ad_${remoteAd.id}.mp4`;
        
        const downloadRes = await FileSystem.downloadAsync(remoteAd.video_url, localUri);
        
        if (downloadRes.status === 200) {
          const newAd: Ad = {
            id: remoteAd.id,
            title: remoteAd.title,
            local_file_path: downloadRes.uri,
            target_play_date: remoteAd.target_play_date,
          };
          await insertAd(newAd);
          console.log(`Successfully stored ad: ${newAd.id} at ${newAd.local_file_path}`);
        } else {
          console.error(`Failed to download ad ${remoteAd.id} (HTTP status: ${downloadRes.status}) from ${remoteAd.video_url}`);
        }
      }
    }
  } catch (error) {
    console.error('Error downloading payload:', error);
  }
};
