import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';
import { useKeepAwake } from 'expo-keep-awake';
import { Ad, logPlayback } from '../services/db';

interface VideoPlayerProps {
  playlist: Ad[];
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ playlist }) => {
  // Prevent in-transit vehicle tablets from sleeping
  useKeepAwake();

  const videoRef = useRef<Video>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  // Restart from 0 if playlist changes and current index is out of bounds
  useEffect(() => {
    if (playlist.length > 0 && currentIndex >= playlist.length) {
      setCurrentIndex(0);
    }
  }, [playlist, currentIndex]);

  if (playlist.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.logoPill}>
          <Text style={styles.logoPillText}>⚡ TRIPCAST DOOH NETWORK</Text>
        </View>
        <Text style={styles.emptyTitle}>In-Transit Media Display</Text>
        <Text style={styles.emptySubtitle}>Awaiting active ad payload. Connecting to central manifest...</Text>
      </View>
    );
  }

  const currentAd = playlist[currentIndex];

  const handlePlaybackStatusUpdate = async (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsVideoLoading(!status.isPlaying && status.isBuffering);
      const successStatus = status as AVPlaybackStatusSuccess;
      
      if (successStatus.didJustFinish) {
        // 1. Log verified playback to SQLite
        await logPlayback(currentAd.id);

        // 2. Move to next video in playlist, looping back to 0
        const nextIndex = (currentIndex + 1) % playlist.length;
        setCurrentIndex(nextIndex);
      }
    } else if (status.error) {
      console.warn(`[VIDEO RECOVERY] Playback error on ad ${currentAd.id}: ${status.error}. Skipping to next video.`);
      // Auto-skip corrupted or missing video to prevent vehicle black screen
      if (playlist.length > 1) {
        const nextIndex = (currentIndex + 1) % playlist.length;
        setCurrentIndex(nextIndex);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{ uri: currentAd.local_file_path }}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay={true}
        isLooping={false} // Handled manually to log each completed playback
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        useNativeControls={false}
      />

      {/* Top Banner showing current Ad Info */}
      <View style={styles.adHeader}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>NOW PLAYING</Text>
        </View>
        <Text style={styles.adTitle} numberOfLines={1}>{currentAd.title}</Text>
      </View>

      {isVideoLoading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  logoPill: {
    backgroundColor: '#F9D058',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 12,
  },
  logoPillText: {
    color: '#1E1E22',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  adHeader: {
    position: 'absolute',
    top: 35,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    maxWidth: '80%',
  },
  badge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  adTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
});
