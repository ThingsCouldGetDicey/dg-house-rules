# Changelog

## 0.4.0 — Smooth daytime/nighttime playlist transitions

- Confirm the daylight threshold restores the Scene’s existing normal Playlist.
- Add a per-Scene Playlist transition selector, defaulting to simultaneous
  crossfade. The alternative fades out the previous playlist before starting
  the next one, retaining the former stop-first behaviour.
- Trigger incoming and outgoing native Foundry Playlist playback operations
  together for an overlapping crossfade without modifying Playlist documents.
- Show the configured Fade Duration of both Playlists in Scene settings with
  instructions for setting a nonzero fade duration on each Playlist.
- Preserve safe Soundboard track changes within the same Playlist and
  strengthen automated crossfade and DOM regression testing.

## 0.3.0 — Search all playlists and play every native mode correctly

- Search by playlist name or playback mode within the Scene darkness selector.
- List all playlists, rather than only Simultaneous ones.
- Use native Foundry v14 playNext for Sequential and Shuffle, playAll only for
  Simultaneous, and an explicitly selected playSound for Soundboards.
- Preserve the current selection while filtering or clearing search.
- Only reveal the Soundboard track picker for Soundboard playlists, including
  with CSS themes that override native hidden styles.
- Cover each playback mode, search filtering, form submission, and mode
  switching in automated unit and Chromium integration tests.

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
