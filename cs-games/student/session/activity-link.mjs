import { activeProfile } from '../../../wpr-games/workplace-readiness/online/profile-sync.mjs?v=guest-map-v1';

for (const link of document.querySelectorAll('a[data-my-session]')) {
  if (activeProfile) continue;
  const url = new URL(link.href);
  url.searchParams.set('learner', 'guest');
  link.href = url;
}
