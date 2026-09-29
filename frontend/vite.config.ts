import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on all interfaces (IPv4 + IPv6): Windows resolves 'localhost'
    // unpredictably, and an IPv6-only Vite breaks mixed-family setups.
    host: true,
  },
})
