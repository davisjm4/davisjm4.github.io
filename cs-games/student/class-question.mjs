import { request } from '../../wpr-games/workplace-readiness/online/config.mjs';
import { activeProfile, classLaunchId, syncQueuedPractice } from '../../wpr-games/workplace-readiness/online/profile-sync.mjs?v=guest-map-v1';

// Activity adapters keep only the data needed to restore their currently open question.
export function classQuestion(access, activityId) {
  if (!access) return null;
  const mode = new URL(access.destination, location.origin).searchParams.get('mode');
  const key = 'cs-games:class-question:' + activityId + ':' + activeProfile.id + ':' + classLaunchId;
  return {
    mode,
    read() {
      try {
        const checkpoint = JSON.parse(sessionStorage.getItem(key));
        return checkpoint?.mode === mode ? checkpoint : null;
      } catch { return null; }
    },
    save(checkpoint) {
      try {
        if (checkpoint) sessionStorage.setItem(key, JSON.stringify(checkpoint));
        else sessionStorage.removeItem(key);
      } catch {}
    },
    async open() {
      const questionId = crypto.randomUUID();
      await syncQueuedPractice();
      await request('/profile/class-launch/' + classLaunchId + '/question', {
        token: activeProfile.token, body: { questionId, mode },
      });
      return { questionId, mode, selected: null };
    },
  };
}

export function questionAccessMessage(error) {
  return error.status ? error.message : 'Reconnect to verify class access before opening another question.';
}
