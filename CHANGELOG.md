# Changelog

## 0.2.0 — Scene darkness playlist switching

- Add an optional expandable Scene Config section for Nighttime playlist and
  darkness threshold (default 0.5); the existing Scene Playlist remains daytime.
- Switch simultaneous ambience playlists on actual Foundry v14 darkness
  updates and Scene activation, leaving unconfigured Scenes untouched.
- Restrict automated audio changes to the active primary GM, serialize quick
  transitions, and stop night audio when the Scene deactivates.
- Add Node unit tests and real isolated Chromium DOM/Scene hook acceptance.

## 0.1.0 — Initial release

- Added independent NPC and Unnatural chat roll-target visibility settings.
