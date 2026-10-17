# EcoTrek privacy policy

**Last updated: 17 October 2026**

EcoTrek is an outdoor activity app built by a student team for the Congressional App Challenge. This policy describes the website, Android WebView app, and optional native/backend configurations.

## The short version

- Your profile, activity records, points, tree progress, ratings, and settings are stored locally by default. There is no EcoTrek account sign-in in the current app.
- EcoTrek requests foreground location when you use nearby trails, local weather, or activity tracking. It does not request background location in the website or WebView app.
- Trail, map, photo, and weather features contact the providers described below.
- There is no user-facing Grok or AI chatbot, no user chat prompt, and no conversation history sent to an AI chat provider.
- EcoTrek does not sell personal data or show advertising.

## Information stored on your device

The local profile can include your name, age, height, weight, and an optional profile photo. Activity records can include route coordinates, distance, duration, elevation, timestamps, trail completion, and self-reported cleanup counts. Preferences, points, badges, streaks, trail ratings, and tree-care progress are stored locally as well.

The profile photo is resized and stored on-device; EcoTrek does not upload it. Removing the app or clearing site data can erase locally stored information. A public trail catalogue and its last coarse search area may also be cached on-device; cache coordinates are rounded to two decimal places and are not a recorded route.

## Location and external services

EcoTrek requests foreground location when a person opens nearby-trail discovery, requests local weather, or starts an activity. Location is used to look up mapped trails, fetch weather, center the tracking map, and record a route during an activity. The website and Android WebView app do not ask for background location. You can deny or revoke location permission in browser or Android settings. Without a real location, EcoTrek does not substitute Austin or another city.

| Service | Information sent | Purpose |
|---|---|---|
| OpenStreetMap Overpass | Coordinates needed for a nearby search | Find mapped trail records. |
| Open-Meteo and the U.S. National Weather Service | Coordinates for local forecasts, air quality, or alerts | Show weather and safety conditions. |
| OpenStreetMap tile service | Requested tile numbers identify the visible map viewport, which can be centered on your location; the service also receives IP address, browser/referrer, and ordinary request metadata | Display the basemap with attribution. Tiles are not prefetched. A local route sketch remains available if tile loading fails. |
| Wikimedia Commons | A listed trailhead coordinate or trail-name search | Find community trail photos. |
| Google Maps | Trailhead information, only if you choose the external directions link; separately built native Android apps may use Google Maps Platform when configured | Open directions or display a configured native basemap. The website and WebView app use OpenStreetMap tiles. |

These providers receive requests directly from the app/browser and apply their own privacy policies and retention practices. Trail and weather lookups do not include your name or recorded activity history. If an optional EcoTrek API is configured, the app may request its public approved-trail catalogue without sending GPS coordinates in that request.

## Sharing a selected trail

If you choose “Share with friends” from a trail detail, EcoTrek sends a concise message containing that selected trail’s name, public details, a map link, and up to two safe photo links to the device’s system share sheet. EcoTrek does not upload this message; you choose whether and where to send it. Recipients and any sharing service you choose receive the content under their own terms.

## Optional backend trail information

The current app has no user-facing chatbot, does not ask users to connect a Grok account, and does not send a conversation history to an AI chat provider. A custom deployment may enable an optional server-side `trailIntel` service. If that service is enabled and invoked, public catalogue details for the selected trail (for example, name, area, distance, difficulty, and description) may be sent by the server to the model provider configured by that deployment. User-entered chat questions, profile details, precise GPS coordinates, and recorded route history are not part of that request. The deployment operator is responsible for documenting enabled providers and retention settings.

## Optional backend storage

A deployment may configure an EcoTrek API/database. The current app does not require that backend or an EcoTrek account and uses local guest profiles; guest profile and activity data do not sync to the API. Other API features or custom deployments may send data to a server, in which case its operator’s storage, access, and deletion terms apply.

## What EcoTrek does not do

- It does not sell or rent personal data.
- It does not show advertising or use advertising identifiers.
- It does not share recorded routes with other users.
- It does not claim that a trail, map, weather report, or description guarantees current conditions. Check official local information before you go.

## Your choices

- Deny or revoke location access in your browser or Android system settings.
- Remove your profile photo or clear local activity/app data.
- Choose whether to open external photo, map, or directions links.
- Contact the team with privacy questions or requests.

## Children and security

EcoTrek is not directed at children under 13. Requests use HTTPS where supported. No system is perfectly secure; if you discover a security issue, contact the team privately.

## Contact

Questions or privacy requests: **ecotrek.support@gmail.com**

EcoTrek — Congressional App Challenge entry, Austin, Texas.
