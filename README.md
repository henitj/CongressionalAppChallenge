# EcoTrek

EcoTrek is a local-first React Native app that helps people walk, hike, and bike outdoors. It records GPS activities, discovers nearby trails, tracks environmental impact, and keeps the experience approachable across phones and tablets.

Built for the Congressional App Challenge by Henit Jain, Matan Heber, Arjun Averineni, and Basil Vinesh.

## Highlights

- GPS walk and ride recording with background location support
- Nearby trail discovery, completion detection, ratings, and tailored recommendations
- Weekly, monthly, and yearly activity history with automatic one-year retention
- EcoPoints, badges, challenges, cleanup logging, streaks, and symbolic trees
- Trail Assistant with compact prompts and keyboard-safe layouts
- First-account guided onboarding
- Responsive light and dark themes, scalable type, and reduced-motion support
- Optional Neon/Postgres API; core features remain usable offline

## Run locally

```bash
cd EcoTrek
npm install
npm start          # Expo tunnel for a physical device
npm run web        # browser
npm run typecheck
npm test
```

Copy `EcoTrek/.env.example` to `EcoTrek/.env` only when configuring optional OAuth or API services. Never place a database password in the app environment.

## Repository map

```text
EcoTrek/
├── assets/              App icons and brand artwork
├── db/                  Postgres schema and seed data
├── docs/                Setup, privacy, testing, and launch guides
├── server/              Optional Node API
└── src/
    ├── components/      Reusable UI and illustrations
    ├── constants/       Design tokens and static catalogues
    ├── context/         App state and persistence providers
    ├── hooks/           Reusable device and UI behavior
    ├── navigation/      Stack and tab navigation
    ├── screens/         Product screens
    ├── services/        Storage, location, trail, API, and domain logic
    ├── types/           Type declarations
    └── __tests__/       Logic and render tests
```

Detailed app architecture and backend setup are in [`EcoTrek/README.md`](EcoTrek/README.md), [`EcoTrek/server/README.md`](EcoTrek/server/README.md), and [`EcoTrek/docs/NEON_SETUP.md`](EcoTrek/docs/NEON_SETUP.md).

## Privacy

Location is requested for nearby trails and recorded only during an active walk or ride. Activity data is local-first. See [`EcoTrek/docs/PRIVACY_POLICY.md`](EcoTrek/docs/PRIVACY_POLICY.md).
