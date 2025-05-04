import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { store } from './store';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster 
          position="top-right"
          toastOptions={{
            className: 'bg-dark-700 text-white',
            style: {
              border: '1px solid #374151',
              padding: '16px',
              color: '#fff',
            },
          }}
        />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
); 