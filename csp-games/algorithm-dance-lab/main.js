import {createStudioApp} from './studio-app.js?v=usability-v3';
import {createWorkspace} from './workspace.js?v=usability-v3';
import {startActivePractice} from '../session.js';
const app=createStudioApp();createWorkspace(app);startActivePractice();
