# FootballGM on Google Play

How the Play version works, and every step to publish it.

## How it fits together

- **The app is a Trusted Web Activity (TWA).** The Android app is a thin shell that opens https://peakbali.github.io/footballGM/ full screen in Chrome. Every push to `main` that deploys GitHub Pages also updates the Play app; a new app bundle is only needed when `twa/twa-manifest.json` changes (icon, colours, package settings).
- **Free first season, then a one-time "Full game" unlock.** No ads.
  - `src/core/gate.ts`: a new career plays its whole first season (including the season review) for free. Continue is then replaced by "Unlock season 2", which opens the paywall (`src/ui/features/paywall.tsx`). The squad, transfers and every screen stay usable; only advancing the calendar is locked.
  - Saves that existed before the gate shipped are marked `legacy` the first time they load and stay fully playable.
  - The unlock is per device/Google account and covers every save slot.
- **Billing** (`src/ui/billing.ts`): inside the Play app it uses the Digital Goods API + Payment Request with product ID `full_game`. On launch it re-reads Play's purchase list (handles reinstalls, new phones, refunds). The unlock is cached in `localStorage` so the game works offline.
- **Web version:** the same free first season; after that, the paywall links to the Play listing. There is no web payment. `npm run dev` adds a "Simulate purchase" button for testing.
- **Acknowledgement server** (`twa/ack-worker/`): Google refunds a one-time purchase that is not acknowledged within 3 days, and a TWA cannot acknowledge on the device. A tiny Cloudflare Worker (free plan) does it with the Google Play Developer API. It only accepts `full_game` tokens and stores nothing. After deploying it, its URL goes into `ACK_URL` in `src/ui/billing.ts`. The game re-sends tokens on every launch, so a purchase made before the worker existed is still acknowledged as long as the player opens the game within 3 days.
- **Content:** every club, league, stadium and player is fictional (generated in `src/core/data/pyramid.ts` and `foreign.ts`); crests are drawn by the game. The old local EA FC import was removed. `tests/gate.test.ts` checks that well-known real names do not appear.

## One-time setup (Khen)

### 1. Play Console account
1. Go to https://play.google.com/console/signup, choose **Personal** (or Organization if you have a registered business with a D-U-N-S number).
2. Pay the one-time $25 fee and complete identity verification (government ID; it can take a few days).
3. Personal accounts created after 13 Nov 2023 must run a **closed test with at least 12 testers for 14 days in a row** before production access (step 7).

### 2. Payments profile (needed to sell anything)
1. Play Console > **Setup > Payments profile** > create a payments (merchant) profile: legal name, address, bank account for payouts, tax info.
2. Set up the tax forms it asks for (for a non-US seller, the US tax form W-8BEN).

### 3. Signing key and Android build
An upload key is already generated for you in the project files: `play-signing/footballgm-upload.keystore` (password in `play-signing/keystore-password.txt`). Keep both somewhere safe (a password manager). Google keeps the real app signing key (Play App Signing), so if the upload key is ever lost, Play support can reset it.

1. In GitHub: repo **Settings > Secrets and variables > Actions > New repository secret**:
   - `ANDROID_KEYSTORE_B64` = the contents of `play-signing/footballgm-upload.keystore.base64.txt`
   - `ANDROID_KEYSTORE_PASSWORD` = the password from `keystore-password.txt`
2. **Actions > Android app bundle > Run workflow** (version code 1, version name 1.0.0). When it finishes, download the artifact; it contains `app-release-bundle.aab`.
3. For every later upload, run it again with the version code +1.

### 4. Create the app and the product
1. Play Console > **Create app**: name FootballGM, default language English, **Game**, **Free**, accept the declarations.
2. **Testing > Closed testing** > create a track, upload the `.aab` (the first upload is what enables in-app products).
3. **Monetize > Products > In-app products > Create product**:
   - Product ID: `full_game` (must be exactly this)
   - Name: Full game. Description: Unlocks every season after the first, for every save slot.
   - Price: your choice (e.g. US$4.99; Play converts per country). **Activate** it.

### 5. Digital Asset Links (removes the browser bar and enables billing)
The app proves it owns peakbali.github.io with a file at the *root* of the domain, which only a repo named `peakbali.github.io` can serve.
1. Play Console > **Test and release > App integrity > App signing**: copy the **SHA-256 certificate fingerprint** of the *App signing key*.
2. Create a new public GitHub repo named exactly `peakbali.github.io`, and add the three files from `twa/user-site/` (`.nojekyll`, `index.html`, `.well-known/assetlinks.json`). In `assetlinks.json`, replace `PASTE_THE_APP_SIGNING_KEY_SHA256_FROM_PLAY_CONSOLE_HERE` with the fingerprint from step 1 (keep the upload key line).
3. Repo **Settings > Pages**: deploy from branch `main`, folder `/`. After a minute, https://peakbali.github.io/.well-known/assetlinks.json should show the file. (The game itself keeps living at /footballGM/.)

### 6. Purchase acknowledgement worker
1. Google Cloud: create a project, enable the **Google Play Android Developer API**, create a **service account**, and download a JSON key.
2. Play Console > **Users and permissions** > invite the service account email, with app permission **View financial data** and **Manage orders and subscriptions**.
3. Cloudflare (free account): install Wrangler (`npm i -g wrangler`), then in `twa/ack-worker/`: `wrangler login`, `wrangler secret put SA_EMAIL` (the service account's `client_email`), `wrangler secret put SA_PRIVATE_KEY` (its `private_key`, pasted as one line), `wrangler deploy`.
4. Put the printed URL (like `https://footballgm-ack.<you>.workers.dev`) into `ACK_URL` in `src/ui/billing.ts` (or ask Claude to), and merge.

### 7. Store listing, policies and the closed test
1. **Main store listing**: copy the text from `store/listing.md`; upload `store/icon-512.png`, `store/feature-graphic.png` and the phone screenshots in `store/screenshots/`.
2. **App content** (Policy and programs > App content):
   - Privacy policy: https://peakbali.github.io/footballGM/privacy.html
   - Ads: **No ads**.
   - App access: all functionality available without special access.
   - Content rating: fill in the IARC questionnaire; category **Game**; answer No to violence, sexuality, language, controlled substances, gambling (there is no real-money or simulated gambling), user interaction/chat, sharing location; Yes to "digital purchases". Expected rating: Everyone / PEGI 3.
   - Target audience: **13 and over** (keeps the app out of the Families program requirements).
   - Data safety: **No data shared**. Data collected: *Financial info > Purchase history*, processed ephemerally, required, for app functionality (the purchase token is sent to the acknowledgement worker). Encrypted in transit: yes. Users can request deletion: not applicable (nothing stored).
   - Government app: no. Financial features: none. Health: none.
3. **Closed test**: add at least 12 testers (a Google Group or an email list), share the opt-in link, and keep them opted in for 14 days. Testers can buy the product for free if you add them as **License testers** (Setup > License testing).
4. After 14 days: **Apply for production access** (answer the short questionnaire about the test), then create a production release with the same `.aab` and roll out.

## Testing purchases
- Add your own Google account under **Setup > License testing**; test purchases are free and auto-refund.
- Install from the closed-test opt-in link (not by sideloading) so the Play billing service is available.
- In the game: play a season (or use a fresh career), tap **Unlock season 2**, buy, and check that Settings shows "Unlocked". Uninstall, reinstall, open the paywall and tap **Restore purchase**.
