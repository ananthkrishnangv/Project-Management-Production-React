import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FluentProvider, webLightTheme, createLightTheme, BrandVariants } from '@fluentui/react-components';
import App from './App';
import './index.css';

// Custom brand colors for Fluent UI matching our Tailwind palette
const csirBrand: BrandVariants = {
    10: '#001529',
    20: '#012a52',
    30: '#023f7a',
    40: '#0254a3',
    50: '#0369cc',
    60: '#0078d4',
    70: '#3387d6',
    80: '#66a5e0',
    90: '#99c3eb',
    100: '#cce1f5',
    110: '#e6f0fa',
    120: '#f0f6fc',
    130: '#f8fbfe',
    140: '#fcfdfe',
    150: '#fefeff',
    160: '#ffffff',
};

const csirTheme = createLightTheme(csirBrand);

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <FluentProvider theme={csirTheme}>
            <App />
        </FluentProvider>
    </StrictMode>
);
