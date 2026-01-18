
import { MatchState } from '../types';

// We use a public KV store. If this service is down, the app remains functional locally.
const BASE_URL = 'https://keyvalue.immanent.workers.dev/key';

export const syncService = {
  async saveState(roomId: string, state: MatchState): Promise<boolean> {
    if (!roomId) return false;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(`${BASE_URL}/scoreboard_v2_${roomId}`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(state),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      clearTimeout(timeoutId);
      // Quietly log and return false instead of letting the error bubble up
      return false;
    }
  },

  async getState(roomId: string): Promise<MatchState | null> {
    if (!roomId) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(`${BASE_URL}/scoreboard_v2_${roomId}`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) return null;
      const data = await response.json();
      return data as MatchState;
    } catch (error) {
      clearTimeout(timeoutId);
      return null;
    }
  }
};
