# EcoTrek privacy policy

**Last updated: 16 August 2026**

EcoTrek is a hiking and cycling app built by a student team for the
Congressional App Challenge. This policy explains, in plain language, exactly
what the app collects and what it does with it.

> **Before you publish:** replace the contact email at the bottom with a real
> address you check, publish this page at a public URL, and paste that URL into
> `EXPO_PUBLIC_PRIVACY_URL` in `.env` and into the Google Play listing. Play
> will not approve the app without a working privacy policy link.

---

## The short version

- EcoTrek reads your location **only while you are recording an activity**, and
  only while the app is open. It never tracks you in the background.
- If you use EcoTrek as a guest, **nothing leaves your phone at all**.
- If you sign in with Google, we store your name, email and profile picture so
  your progress follows you between devices.
- We do not sell your data. We do not run advertising. There are no third-party
  analytics or tracking SDKs in this app.

---

## What we collect

### If you continue as a guest

Nothing. Every activity, point, badge and streak is stored in the app's own
storage on your device. There is no account and no server involved. Deleting
the app deletes the data.

### If you sign in with Google

Google sends us three things from your account:

| Data | Why |
|---|---|
| Name | Shown on your profile and your club roster |
| Email address | Identifies your account across devices |
| Profile picture | Shown on your profile and club roster |

We never receive your Google password, and we cannot see anything else in your
Google account.

### Activity data

When you record a hike or ride, EcoTrek stores:

- the GPS route you covered, as a list of coordinates
- distance, duration and average speed
- which trail (if any) the route matched
- the date and time

Location is read from your device only while a recording is running. EcoTrek
does not request background location permission, and the Android manifest
explicitly blocks it.

### Usage data

The app keeps a basic count of screens opened and features used, stored on your
device, to help us understand which parts of the app are worth improving. It is
not tied to advertising and is not shared.

---

## Where your data goes

If the app is configured with a backend, your data is stored in a Postgres
database hosted by [Neon](https://neon.com) in the United States, reachable only
by our API. Requests are authenticated with a Google-signed token, so one
account cannot read or modify another's data.

Weather and safety information is fetched from two public services:

- **Open-Meteo** (open-meteo.com) — conditions and forecast
- **National Weather Service** (weather.gov) — official watches and warnings

To get local conditions, EcoTrek sends these services your approximate
coordinates, rounded. Neither service receives your name, email or any account
identifier, and neither is able to link a request to you.

---

## What we never do

- We do not sell or rent personal data to anyone.
- We do not show advertising or use advertising identifiers.
- We do not include third-party trackers, social SDKs or analytics services.
- We do not share your location with other users. Club members see your name,
  points, distance and trees — never your routes or where you were.

---

## Your control

- **See your data.** Everything the app knows about you is visible in the app:
  Profile, Impact and Clubs.
- **Erase your data.** Settings → Your data → *Erase my data* clears activities,
  points, badges and streaks from the device.
- **Delete your account.** Settings → Your data → *Delete account* erases
  everything and signs you out. If a backend is connected, your rows are removed
  from the database too.
- **Turn off location.** Your phone's system settings control this. The app will
  keep working; distance tracking will not.
- **Turn off notifications.** Settings → Notifications, or your phone's system
  settings.

---

## Children

EcoTrek is rated for ages 13 and up and is not directed at children under 13. We
do not knowingly collect personal information from children under 13. If you
believe a child under 13 has created an account, email us and we will delete it.

---

## Security

Data in transit uses HTTPS. Access to the database requires a valid, unexpired
Google-issued token that we verify server-side on every request. We keep the
amount of personal data we hold deliberately small — the less we store, the less
there is to lose.

No system is perfectly secure, and we will not pretend otherwise. If you find a
security problem, please email us rather than disclosing it publicly.

---

## Changes

If this policy changes in a way that affects what we collect or how we use it,
we will update the date at the top and note the change in the app's release
notes.

---

## Contact

Questions, requests, or a data deletion you cannot do in the app:

**ecotrek.support@gmail.com**

EcoTrek — Congressional App Challenge entry, Austin, Texas.
