import 'bootstrap/dist/css/bootstrap.min.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <GoogleOAuthProvider clientId="677454578186-0hodnom32iphja4at1cqtbpi60k37vum.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
);