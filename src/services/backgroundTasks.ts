import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { performSync } from './syncManager';

const SYNC_TASK_NAME = 'BACKGROUND_SYNC_TASK';

// 1. Define the task
TaskManager.defineTask(SYNC_TASK_NAME, async () => {
  try {
    await performSync();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// 2. Register the task
export const registerBackgroundTasks = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_TASK_NAME);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(SYNC_TASK_NAME, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false, // Keep running after app is closed (Android)
        startOnBoot: true,      // Start on device boot (Android)
      });
      console.log('Background Sync Task registered successfully.');
    } else {
      console.log('Background Sync Task is already registered.');
    }
  } catch (error) {
    console.error('Failed to register Background Task:', error);
  }
};
