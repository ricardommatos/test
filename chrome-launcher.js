#!/usr/bin/env node

import { spawn, exec } from 'child_process';
import { platform } from 'os';

const VITE_URL = 'http://localhost:5173';
const WAIT_TIME = 2000; // Wait 2 seconds for Vite to start

// Function to open Chrome based on OS
function openChrome(url) {
  const os = platform();
  let command;

  switch (os) {
    case 'darwin': // macOS
      command = `open -a "Google Chrome" "${url}"`;
      break;
    case 'win32': // Windows
      command = `start chrome "${url}"`;
      break;
    default: // Linux and others
      command = `google-chrome "${url}" || chromium-browser "${url}" || chromium "${url}"`;
      break;
  }

  exec(command, (error) => {
    if (error) {
      console.error('❌ Failed to open Chrome. Make sure Chrome is installed.');
      console.error('   You can manually open:', url);
    } else {
      console.log('✅ Chrome opened successfully!');
    }
  });
}

// Start Vite dev server
console.log('🚀 Starting Vite dev server...');
const viteProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// Wait for Vite to start, then open Chrome
setTimeout(() => {
  console.log('🌐 Opening Chrome at', VITE_URL);
  openChrome(VITE_URL);
}, WAIT_TIME);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  viteProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  viteProcess.kill();
  process.exit(0);
});

viteProcess.on('error', (error) => {
  console.error('❌ Failed to start Vite:', error.message);
  process.exit(1);
});

viteProcess.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`❌ Vite exited with code ${code}`);
    process.exit(code);
  }
});
