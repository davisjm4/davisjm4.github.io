import {createStudioApp} from './studio-app.js?v=guest-map-v1';
import {createWorkspace} from './workspace.js?v=usability-v3';
import {startActivePractice} from '../session.js?v=guest-map-v1';
const app=createStudioApp();createWorkspace(app);startActivePractice();
