import { render } from 'preact';
import '@fontsource/silkscreen/latin-400.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-800.css';
import './styles.css';
import '../core/systems/all';
import { App } from './App';

render(<App />, document.getElementById('app')!);
