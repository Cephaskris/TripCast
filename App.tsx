import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { initDB, seedDummyAds, getAds, Ad } from './src/services/db';
import { initNetworkListener, performSync } from './src/services/syncManager';
import { registerBackgroundTasks } from './src/services/backgroundTasks';
import { getDeviceInfo, sendFleetHeartbeat } from './src/services/deviceService';
import { VideoPlayer } from './src/components/VideoPlayer';
import { ConvexProvider } from 'convex/react';
import { convex } from './src/services/convexClient';

function TripCastTabletApp() {
  const [isReady, setIsReady] = useState(false);
  const [ads, setAds] = useState<Ad[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const deviceInfo = getDeviceInfo();

  const reloadAds = async () => {
    const loadedAds = await getAds();
    setAds(loadedAds);
    return loadedAds;
  };

  useEffect(() => {
    const setup = async () => {
      try {
        // 1. Initialize SQLite Database
        await initDB();
        
        // 2. Seed dummy data for testing
        await seedDummyAds();
        
        // 3. Register Background Tasks & Network Listeners
        await registerBackgroundTasks();
        initNetworkListener();

        // 4. Send initial device heartbeat to cloud fleet manager
        await sendFleetHeartbeat();

        // 5. Load initial ads from DB
        await reloadAds();

        setIsReady(true);
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };

    setup();
  }, []);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setStatusMessage('🔄 Syncing with backend server...');

    try {
      const result = await performSync();
      const latestAds = await reloadAds();
      setStatusMessage(`✅ Sync complete! ${latestAds.length} ads active (${result.syncedLogs} logs uploaded)`);
    } catch (error: any) {
      setStatusMessage(`❌ Sync failed: ${error?.message || 'Network error'}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => {
        setStatusMessage(null);
      }, 4000);
    }
  };

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Initializing TripCast...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <VideoPlayer playlist={ads} />
      
      {/* HUD Info & Status Toast */}
      {statusMessage && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{statusMessage}</Text>
        </View>
      )}

      {/* Floating Diagnostics & Manual Sync Button overlay */}
      <View style={styles.overlayControls}>
        <View style={styles.infoBadge}>
          <Text style={styles.infoBadgeText}>{deviceInfo.license_plate} • {ads.length} Ads</Text>
        </View>

        <TouchableOpacity 
          style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]} 
          onPress={handleManualSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <View style={styles.syncRow}>
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.syncButtonText}>Syncing...</Text>
            </View>
          ) : (
            <Text style={styles.syncButtonText}>⚡ Manual Sync</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <ConvexProvider client={convex}>
      <TripCastTabletApp />
    </ConvexProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 12,
  },
  toastContainer: {
    position: 'absolute',
    top: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(20, 20, 20, 0.92)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    zIndex: 100,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  overlayControls: {
    position: 'absolute',
    bottom: 25,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  infoBadgeText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '500',
  },
  syncButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  syncButtonDisabled: {
    backgroundColor: '#555',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  }
});
