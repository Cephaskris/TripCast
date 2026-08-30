import NetInfo from '@react-native-community/netinfo';
import { getUnsyncedLogs, markLogsAsSynced } from './db';
import { downloadPayload } from './payloadManager';
import { getApiBaseUrl, getDeviceInfo, sendFleetHeartbeat } from './deviceService';

let isSyncing = false;

/**
 * Queries local SQLite for unsynced logs and sends them to the backend API
 * along with the tablet's vehicle attribution.
 */
export const syncTelemetry = async (): Promise<{ count: number; success: boolean }> => {
  if (isSyncing) return { count: 0, success: false };
  
  try {
    isSyncing = true;
    const unsyncedLogs = await getUnsyncedLogs();
    const deviceInfo = getDeviceInfo();
    const apiUrl = getApiBaseUrl();
    
    if (unsyncedLogs.length === 0) {
      console.log('No new telemetry logs to sync.');
      return { count: 0, success: true };
    }

    console.log(`Uploading ${unsyncedLogs.length} playback logs from vehicle ${deviceInfo.vehicle_id} (${deviceInfo.tablet_device_id})...`);
    
    const response = await fetch(`${apiUrl}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicle_id: deviceInfo.vehicle_id,
        tablet_device_id: deviceInfo.tablet_device_id,
        logs: unsyncedLogs,
      }),
    });

    if (response.ok || response.status === 200 || response.status === 201) {
      const syncedIds = unsyncedLogs.map((log) => log.id);
      await markLogsAsSynced(syncedIds);
      console.log(`Telemetry successfully synced to backend for vehicle ${deviceInfo.vehicle_id}.`);
      return { count: unsyncedLogs.length, success: true };
    } else {
      console.log(`Telemetry upload failed with status ${response.status}`);
      return { count: 0, success: false };
    }
  } catch (error) {
    console.error('Network error uploading telemetry:', error);
    return { count: 0, success: false };
  } finally {
    isSyncing = false;
  }
};

/**
 * Master sync function to run telemetry syncs, payload downloads, and fleet heartbeat.
 */
export const performSync = async (): Promise<{ syncedLogs: number; success: boolean }> => {
  console.log('Running Master Sync Sequence...');
  const telResult = await syncTelemetry();
  await downloadPayload();
  await sendFleetHeartbeat();
  return { syncedLogs: telResult.count, success: telResult.success };
};

/**
 * Initializes the NetInfo event listener to automatically trigger sync 
 * when the device comes back online.
 */
export const initNetworkListener = () => {
  NetInfo.addEventListener(state => {
    if (state.isConnected && state.isInternetReachable) {
      console.log('Internet connected! Triggering automatic background sync & heartbeat...');
      performSync();
    }
  });
};

