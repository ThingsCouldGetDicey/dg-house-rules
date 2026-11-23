# Changelog

## 0.7.0 — King in Yellow-inspired GM journal styling

- Opt-in archival case-file design scoped to campaign Journal pages.
- Styled headings, Handler notices, provenance, tables and image links.
- Separate source-verified, image-only Journal Entries designed for individual GM-controlled sharing.
- Module-relative style loading with a fallback for cached module metadata.

## 0.6.0 — Matching search in the native Scene Playlist dropdown

- Apply the same magnifying-glass, in-dropdown search to Foundry’s built-in
  **Scene Playlist** selector, matching the existing Nighttime selector.
- Refactor both controls to share one picker implementation and scoped CSS.
- Move the original native select[name="playlist"] into its wrapper without
  cloning or replacing it, preserving its options, selected value, listeners,
  disabled options and standard Foundry form submission.
- Retain all darkness audio switching, crossfades and the Nighttime selector.
- Expand real Chromium DOM tests for both menus, native change events, zero
  search results, disabled choices and saved-field values.
- Keep module style loading compatible with a cached server manifest; no
  server restart or Guest GM session changes are required to stage the update.

## 0.5.0 — Integrated search inside nighttime playlist dropdown

- Replace the separate search input with a single accessible dropdown control.
- Show a magnifying-glass search field in the **opened menu**, before options;
  keep it hidden while the dropdown is closed.
- Preserve the same native Scene flag field and all four playlist modes.
- Support mouse and keyboard interaction, Escape, click-outside closing,
  case-insensitive search and empty-result feedback.
- Add scoped stylesheet with a module-relative client load fallback so a
  browser refresh can pick up new visuals when the running Foundry server
  still holds an older cached package manifest.
- Extend Chromium acceptance tests to exercise the embedded search, actual
  form submission, background module CSS loading, and unchanged day/night audio.

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
