import { activeProfile } from '../../wpr-games/workplace-readiness/online/profile-sync.mjs?v=guest-map-v1';
import { addPracticeReturn } from '../student/practice-return.mjs';

addPracticeReturn(document.querySelector('header .ecosystem-nav'), activeProfile, '/cs-games/robotics/');
