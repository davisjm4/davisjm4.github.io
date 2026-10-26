// Depend on the exact existing entry URL so the original game mounts once first.
import '../app.js?v=platform-java-v3';
import {mountBooleanTools} from './learning-ui.js?v=boolean-tools-v3';
const root=document.createElement('section');root.id='boolean-learning-tools';root.setAttribute('aria-label','Boolean learning tools');document.getElementById('main').append(root);mountBooleanTools(root);
