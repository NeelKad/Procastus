import React, { useEffect, useState } from 'react';

export const Options: React.FC = () => {
  const [defaultBlocked, setDefaultBlocked] = useState('facebook.com, youtube.com, twitter.com');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    chrome.storage.sync.get(['defaultBlockedSites'], (result) => {
      if (result.defaultBlockedSites) {
        setDefaultBlocked(result.defaultBlockedSites.join(', '));
      }
    });
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDefaultBlocked(e.target.value);
  }

  function handleSave() {
    const sites = defaultBlocked
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    chrome.storage.sync.set({ defaultBlockedSites: sites }, () => {
      setMessage('Saved');
      setTimeout(() => setMessage(null), 1500);
    });
  }

  return (
    <div>
      <h1>Study Focus Options</h1>
      <p style={{ fontSize: 12, opacity: 0.85 }}>Configure your default blocked sites for new focus sessions.</p>
      <textarea
        rows={4}
        value={defaultBlocked}
        onChange={handleChange}
      />
      <button onClick={handleSave}>Save</button>
      {message && <p style={{ fontSize: 12, marginTop: 6 }}>{message}</p>}
    </div>
  );
};
