import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import fs from 'fs';

// Automatically copy the logo PNG from the user's brain directory to src/assets
try {
  const source = 'C:/Users/Nitro 5/.gemini/antigravity-ide/brain/3535eaeb-7c0c-4cab-8b72-d33117c9cbd4/media__1783689243353.png';
  const destDir = path.resolve(__dirname, 'src/assets');
  const dest = path.join(destDir, 'logo.png');

  if (fs.existsSync(source)) {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(source, dest);
    console.log('Successfully copied logo.png to assets');
  } else {
    console.warn('Source logo file does not exist at ' + source);
  }
} catch (err) {
  console.error('Failed to copy logo.png:', err);
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/data/db.json', '**/data/**']
      },
    },
  };
});
