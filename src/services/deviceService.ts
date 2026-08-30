/**
 * Device identity and hardware telemetry service for TripCast edge tablets.
 */

// Default to Mac local IP for physical Android tablet testing over Wi-Fi, or env var if provided
export const getApiBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  return 'http://172.20.10.5:8080/api';
};

export interface DeviceInfo {
  tablet_device_id: string;
  vehicle_id: string;
  driver_name: string;
  license_plate: string;
  app_version: string;
  battery_level: number;
  storage_free_mb: number;
}

// Default device configuration for Lagos Fleet Tablet #001
let currentDeviceInfo: DeviceInfo = {
  tablet_device_id: 'tab_lagos_001',
  vehicle_id: 'veh_01',
  driver_name: 'Emeka Okafor',
  license_plate: 'LAG-492-AA',
  app_version: '1.0.0 (SDK 54)',
  battery_level: 94,
  storage_free_mb: 14200,
};

export const getDeviceInfo = (): DeviceInfo => {
  return currentDeviceInfo;
};

export const setDeviceInfo = (info: Partial<DeviceInfo>) => {
  currentDeviceInfo = { ...currentDeviceInfo, ...info };
};

import { convex } from './convexClient';
import { api } from '../../convex/_generated/api';

/**
 * Sends a device heartbeat to the TripCast Cloud Fleet manager.
 * Reports battery health, storage capacity, and online connectivity.
 * Syncs directly to Convex Cloud with REST fallback.
 */
export const sendFleetHeartbeat = async (): Promise<boolean> => {
  // 1. Sync directly with Convex Cloud Database
  try {
    const convexRes = await convex.mutation(api.vehicles.heartbeat, {
      tabletDeviceId: currentDeviceInfo.tablet_device_id,
      batteryLevel: currentDeviceInfo.battery_level,
      storageFreeMb: currentDeviceInfo.storage_free_mb,
      appVersion: currentDeviceInfo.app_version,
    });
    console.log(`[CONVEX HEARTBEAT] Live sync to Convex Cloud for ${currentDeviceInfo.tablet_device_id} (Battery: ${currentDeviceInfo.battery_level}%)`);
  } catch (convexErr) {
    console.log('[CONVEX HEARTBEAT] Convex sync fallback to local REST API:', convexErr);
  }

  // 2. Mirror to local REST API
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/fleet/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tablet_device_id: currentDeviceInfo.tablet_device_id,
        battery_level: currentDeviceInfo.battery_level,
        storage_free_mb: currentDeviceInfo.storage_free_mb,
        app_version: currentDeviceInfo.app_version,
      }),
    });

    if (response.ok) {
      console.log(`[HEARTBEAT] Sent status for ${currentDeviceInfo.tablet_device_id} (Battery: ${currentDeviceInfo.battery_level}%)`);
      return true;
    } else {
      console.warn(`[HEARTBEAT] REST failed with status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('[HEARTBEAT] Network error sending fleet heartbeat:', error);
    return false;
  }
};
