import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { StudyWidget } from './StudyWidget';
import styles from './widget.css?inline';

const CONTAINER_ID = 'sf-widget-root';
let reactRoot: Root | null = null;

function mountWidget() {
  if (document.getElementById(CONTAINER_ID)) return;

  const host = document.createElement('div');
  host.id = CONTAINER_ID;
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  shadow.appendChild(styleEl);

  const app = document.createElement('div');
  shadow.appendChild(app);

  reactRoot = createRoot(app);
  reactRoot.render(<StudyWidget />);
}

mountWidget();

