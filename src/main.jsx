import { createRoot } from 'react-dom/client';
import './styles.css';
import { GymProvider } from './state.jsx';
import App from './App.jsx';
import { loadRemoteConfig } from './remote.js';

/* Read the central settings first (waits at most about 2.5 seconds), then start the app. */
loadRemoteConfig().finally(() => {
  createRoot(document.getElementById('app')).render(
    <GymProvider>
      <App />
    </GymProvider>
  );
});
