## Test Bed Setup: Android ↔ PC Server

1. Connect Android phone and PC to SAME WiFi network
2. Run: `pnpm setup` (installs deps, starts Postgres, pushes schema, seeds)
   - Postgres is exposed on `localhost:5433` (avoids conflicts with any existing local Postgres on 5432)
3. Start all services: `pnpm dev` (from repo root, starts backend + mobile via turbo)
4. Note the IP printed: `Server running on http://192.168.X.X:3000`
5. Update `apps/mobile/src/config/api.ts` with that IP (or set `EXPO_PUBLIC_API_URL`)
6. Run: `cd apps/mobile && pnpm dev`
7. Scan QR code with Expo Go app on Android
8. App will connect to your PC's backend over local WiFi

Firewall note: allow port 3000 inbound on your PC's firewall.

