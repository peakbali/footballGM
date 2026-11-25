import { render } from 'preact';
import './styleUnits';
import '@fontsource/silkscreen/latin-400.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-800.css';
import './styles.css';
import '../core/systems/all';
import './features';
import { installAudio } from './audio';
installAudio();
import { App } from './App';
import { installBackHandler } from './store';
import { installPwa } from './pwa';
import { billing } from './billing';
import { store } from './store';

render(<App />, document.getElementById('app')!);
installBackHandler();
installPwa();
billing.subscribe(() => store.bump());
void billing.init();

// dev-only handle for automated UI checks
if (import.meta.env.DEV) (window as unknown as { __fgm: unknown }).__fgm = { store: (await import('./store')).store };
