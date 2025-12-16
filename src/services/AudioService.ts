/**
 * AudioService
 * Handles audio feedback for user interactions
 * Respects user preferences for audio enabled/disabled
 */

import { useKioskStore } from '@/store/kioskStore';

type SoundName = 'click' | 'success' | 'error' | 'notification';

class AudioService {
  private audioCache: Map<SoundName, HTMLAudioElement> = new Map();

  /**
   * Preload audio files for faster playback
   * Call this on app initialization
   */
  preload() {
    const sounds: SoundName[] = ['click', 'success', 'error', 'notification'];

    sounds.forEach((sound) => {
      const audio = new Audio(`/audio/${sound}.mp3`);
      audio.preload = 'auto';
      this.audioCache.set(sound, audio);
    });

    console.log('Audio files preloaded');
  }

  /**
   * Play a sound effect
   * Automatically checks if audio is enabled in user preferences
   */
  play(soundName: SoundName) {
    const audioEnabled = useKioskStore.getState().userPreferences.audioEnabled;

    if (!audioEnabled) {
      return; // Audio is disabled, do nothing
    }

    try {
      // Try to use cached audio first
      let audio = this.audioCache.get(soundName);

      if (!audio) {
        // If not cached, create new instance
        audio = new Audio(`/audio/${soundName}.mp3`);
        this.audioCache.set(soundName, audio);
      }

      // Clone the audio element to allow overlapping sounds
      const clonedAudio = audio.cloneNode(true) as HTMLAudioElement;
      clonedAudio.volume = 0.5; // Set to 50% volume for kiosk environment

      // Play the sound
      clonedAudio.play().catch((error) => {
        // Ignore autoplay policy errors (user hasn't interacted yet)
        if (error.name !== 'NotAllowedError') {
          console.warn(`Failed to play sound: ${soundName}`, error);
        }
      });
    } catch (error) {
      console.error(`Error playing sound: ${soundName}`, error);
    }
  }

  /**
   * Play click sound for button presses
   */
  click() {
    this.play('click');
  }

  /**
   * Play success sound for successful actions
   */
  success() {
    this.play('success');
  }

  /**
   * Play error sound for errors or failed actions
   */
  error() {
    this.play('error');
  }

  /**
   * Play notification sound for alerts or important information
   */
  notification() {
    this.play('notification');
  }
}

// Export singleton instance
export const audioService = new AudioService();
