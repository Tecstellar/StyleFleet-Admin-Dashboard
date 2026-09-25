import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    // Provide fallback for process.env
    'process.env': {
      NEXT_PUBLIC_SUPABASE_URL: JSON.stringify('https://scgokpcoyfewrtrwqxpu.supabase.co'),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: JSON.stringify('sb_publishable_qkXDIACBQgrrge462eSpJg_UCMKQNna'),
    },
  },
});
