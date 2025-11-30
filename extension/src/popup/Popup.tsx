import React, { useEffect } from 'react';
import { WEB_APP_URL } from '../constants';

export const Popup: React.FC = () => {
  useEffect(() => {
    // Immediately redirect to web app
    window.location.href = WEB_APP_URL;
  }, []);

  return (
    <div style={{ 
      width: '300px', 
      padding: '20px', 
      textAlign: 'center',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h2 style={{ margin: '0 0 10px' }}>🎯 Procastus</h2>
      <p style={{ margin: '0 0 15px', color: '#666' }}>
        Redirecting to web app...
      </p>
      <a 
        href={WEB_APP_URL} 
        target="_blank"
        style={{
          display: 'inline-block',
          padding: '10px 20px',
          background: '#667eea',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: '600'
        }}
      >
        Open Web App
      </a>
    </div>
  );
};
