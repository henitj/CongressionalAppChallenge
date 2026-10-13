# EcoTrek privacy policy

**Last updated: 13 October 2026**

EcoTrek is an outdoor activity app built by a student team for the
Congressional App Challenge. This policy describes the current website and
Android WebView APK, plus the optional native/backend configurations.

## The short version

- Your profile, profile photo, recorded activities, points, and settings are
  stored locally by default. There is no sign-in in the current release.
- EcoTrek requests foreground location when you use nearby-trail discovery or
  start an activity. It does not request background location in the website or
  WebView APK.
- When you use maps, trail search, weather, trail photos, or the online
  assistant, those features contact their respective providers. Details are
  below.
- Website and APK assistant questions use Grok through Puter by default. The
  question and recent conversation (up to eight turns), plus relevant trail
  and weather facts, are sent to Puter. GPS coordinates, profile data, and
  recorded route history are not included in that prompt.
- EcoTrek does not sell personal data or show advertising.

## Information stored on your device

The local profile can include your name, age, height, weight, and an optional
profile photo. Activity records can include route coordinates, distance,
duration, elevation, timestamps, trail completion and self-reported cleanup
counts. Preferences, points, badges, and streaks are stored locally as well.

The profile photo is resized and saved on the device; it is not uploaded by
EcoTrek. Removing the app or clearing its site data can erase locally stored
information. If an optional backend is configured by a deployment, its own
storage and deletion terms also apply.

## Location and external services

EcoTrek uses foreground location after you open Trails or tap Start. Location
is used to look up nearby trails, fetch local weather, center the tracking map,
and record a route while an activity is running. The website and WebView APK
do not ask for background location. You can deny or revoke location access in
browser or Android settings; nearby features and distance tracking then have
limited functionality.

When these features are used, the following services may receive request
information:

| Service | Information sent | Purpose |
|---|---|---|
| OpenStreetMap Overpass / Nominatim | Nearby coordinates or reverse-geocoding coordinates | Find nearby trail records and a region label. |
| Open-Meteo and the U.S. National Weather Service | Coordinates for local forecast, air quality, or alerts | Show weather and safety conditions. |
| Google Maps Platform, when a valid key is configured | Map viewport, center/location, and map-rendering requests; the browser key is included in the client request | Display the Google basemap and route. Google Maps is not loaded when its key is absent; EcoTrek then shows a local route sketch. |
| Wikimedia Commons | Coordinates of a listed trailhead and trail-name search terms | Find community trail photos. |

These providers receive the requests directly from the app/browser, not from an
EcoTrek account. Their own privacy policies and retention practices apply.

## Online assistant

On the website and Android WebView APK, EcoTrek loads the Puter JavaScript SDK
and asks its hosted Grok model for a response. Puter receives the user's
question, up to eight recent user/assistant turns, and relevant trail/weather
facts. The prompt does not include the user's precise coordinates, profile
photo, name, or activity history. Do not include sensitive personal
information in a question. Puter may require its own consent or account flow;
Puter's terms and privacy policy apply to those requests.

If the online request fails, EcoTrek says so and shows its local trail-data
answer instead. Native builds can optionally use a project backend or an
OpenAI-compatible provider key entered by the user. Such a personal key is
stored in local app storage and sent over HTTPS directly to the provider the
user selected. It can be removed in Trail Assistant settings. The provider's
own terms apply.

## Optional backend

A deployment may configure an EcoTrek API and database for cross-device
features. The current release does not require that backend or sign-in. If a
server is enabled, data sent to it and its retention must be described by that
deployment and its operator; local-only behavior should not be assumed for a
custom deployment.

## What EcoTrek does not do

- It does not sell or rent personal data.
- It does not show advertising or use advertising identifiers.
- It does not share your recorded route with other users.
- It does not claim that a trail, map, weather report, or AI answer is a
  guarantee of current conditions. Check official local information before
  you go.

## Your choices

- Deny or revoke location in your browser or Android system settings.
- Remove your profile photo from Profile, and clear local activity/data from
  the app's data settings or your browser storage.
- Disable online assistant use by staying offline; the local trail-data
  fallback remains available. Avoid entering sensitive information in prompts.
- Restrict the Google Maps browser key to the deployed website and the
  Android WebView origin (`appassets.ecotrek.app`). The key is client-visible
  by design and must not be treated as a secret.

## Children and security

EcoTrek is not directed at children under 13. Requests use HTTPS where the
provider supports it. No system is perfectly secure; if you discover a
security issue, contact the team privately.

## Contact

Questions or privacy requests: **ecotrek.support@gmail.com**

EcoTrek — Congressional App Challenge entry, Austin, Texas.
