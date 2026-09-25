import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ThemeProvider } from './context/ThemeContext';
import { DateFilterProvider } from './context/DateFilterContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <DateFilterProvider>
        <App />
      </DateFilterProvider>
    </ThemeProvider>
  </React.StrictMode>
);
