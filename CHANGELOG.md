# Changelog

## 0.15.0 — Source-reviewed NPC dialogue and read-aloud boxes

- Add GM-only Send to Chat controls for explicitly reviewed original spoken passages. Sends only the selected literal text, not surrounding Handler notes. No automatic messages or inferred speech.


## 0.14.0 — Whole journal application skin

- Decorate the native Foundry v14 journal window, title bar, table of contents, search, scrollbars, controls and reading surround using the existing eight chapter palettes and original frame assets.
- Follow the selected native page in single- and multi-page modes. Keep unrelated journals and all journal controls untouched.
- Scope the observer to the owning journal TOC, and disconnect it when the sheet closes.


## 0.13.0 — Contextual act journal themes

- Fix low-contrast native Foundry links, icons, focus and hover states.
- Add original lightweight vector art plates and gilt frames for New York, Boston, cartographic horror, Carcosa, and three Exeunts; neutral reference pages.
- Choose decoration from each page’s own chapter, not campaign progress. Preserve all source text and native document interactions.
- Scope decoration to opted-in journals; nested embeds retain a plain reading layout.


## 0.12.0 — One unified Impossible Landscapes Handler Journal

- Add original Delta Green/Yellow King case-file styling for a unified JournalEntry index, twelve chapter dividers and 74 subchapter pages.
- Style native 12/74/2 chapter, section and Scene Reference hierarchy and provide responsive one-journal navigation, including the original-book index and three Exeunts.
- Keep all 370 pinned PDF pages as source-verified original native content embeds; do not duplicate text or change source UUIDs.
- Keep player-shareable image handouts separately permissioned, and conceal obsolete source workbook links in a collapsed technical reference.
- No automatic Scene activation, audio playback, GM-to-player journal display, macros or image sharing.


## 0.11.0 — Full sourcebook pages inline inside Handler briefings

- Style each original native Foundry v14 JournalEntryPage inline embed within a collapsible sourcebook page section, without introducing a second text copy.
- Preserve complete exact text, original artwork and citations while providing direct source-page fallback links.
- Support sourcebook-scale 370-page section navigation and mobile readability with a GM case-file presentation.
- No executable macros, Scene activation, player handout sharing or audio playback is introduced by this release.


## 0.10.0 — Original Delta Green source-verbatim adventure styling (staged)

- Add an independently written case-file/King in Yellow layout with headers, source headings, evidence, rule, dialogue and GM-only visual treatments.
- Keep all published text inside real selectable UTF-8 native Journal content, not rendered images, paraphrases or screenshots.
- Make the source/Sidebar layout mobile-responsive and retain the original printed/PDF page citations.
- Scope all CSS under .dg-il-journal so unrelated worlds and Journals remain unaffected.
- Prepare the action UI style for separately tested and approved Scene/audio/macros; this release does not execute them.


## 0.9.0 — Verbatim selectable source text and original page illustrations

- Preserve all 370 original PDF pages as native selectable Journal text, matching the pinned UTF-8 extraction per page byte-for-byte.
- Keep the optional editorially reformatted reading layout as a separate collapsed view.
- Style source whitespace responsively with pre-wrap and text selection on mobile and desktop.
- Include original sourcebook images as supplementary page artwork and separate private handouts.

## 0.8.0 — Full private PDF sourcebook Journal formatting

- Style original 370-page sourcebook transcript with two-column text, tagged source
  evidence, searchable mechanics, and indexed native page links.
- Provide compact mobile layout for sourcebook and complete chapter indexes.
- Keep all sourcebook page content GM-only and unrelated Journal styling unchanged.

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
