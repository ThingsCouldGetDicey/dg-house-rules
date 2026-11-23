# Delta Green — House Rules

Small modular changes to the Delta Green Foundry VTT game system, without
modifying the installed system files.

**Compatibility:** Foundry VTT v14 (tested on 14.370), Delta Green system
v2.0.1. Other versions have not been independently verified.

## Install in Foundry

In the Foundry **Setup** screen, choose **Add-on Modules → Install Module**.
Paste this URL into the **Manifest URL** field:

    https://github.com/ThingsCouldGetDicey/dg-house-rules/releases/latest/download/module.json

Select **Install**, then enable **Delta Green — House Rules** under **Manage
Modules** inside the world that uses the Delta Green system.

The manifest is hosted on the newest published GitHub Release and points to a
version-specific downloadable ZIP. Future releases can be installed using
Foundry's normal module updater. This repository's release workflow publishes
both files after tests succeed.

## Current feature: conceal skill targets

Under **Game Settings → Configure Settings → Module Settings**, find:

- **Hide Unnatural skill targets from players:** enabled by default.
- **Hide NPC skill targets from players:** disabled by default.

When enabled, a player's Delta Green roll chat-card label changes from
**Firearms: 65%** to **Firearms: Target hidden**. Modifier/target breakdown
tooltips also disappear. The dice result, success/failure outcome and damage
action remain available. The GM still sees the normal target and Agents are
not affected. Settings are independent and saved per world.

**Privacy limitation:** this is display-only, not a secure redaction.
The number remains present in underlying ChatMessage/Actor data and can be
available to advanced browser users or players with actor ownership. For
true secret rolls, use Foundry's private/blind roll modes instead.

**Testing limitation:** unit tests and a real Chromium DOM test passed.
A live two-client Foundry GM/player session comparison has not yet been
completed. This is an initial experimental release.

## Scene darkness playlist switching (v0.6.0)

In **Scene Configuration**, next to the native **Scene Playlist**, expand
**Darkness Playlist (optional)**. Choose a **Nighttime playlist** and a
**Switch at darkness level** value (defaults to `0.5`: 0 = daytime, 1 = night).
The core Scene Playlist is still the daytime/default playlist. Only the new
nighttime playlist and threshold are stored in per-Scene flags; Scene.playlist
is **never overwritten**. Leave Nighttime playlist set to **Disabled** to
preserve all existing Scene behaviour.

**Both playlist fields now use the same searchable in-dropdown control.**
Open the regular **Scene Playlist** selector and use the magnifying-glass box
inside its dropdown, just as you would with **Nighttime playlist**. The regular
Scene Playlist is the **native Foundry field**, not a separate module flag:
the existing select, available options, selected value, change events, and
normal Foundry save behaviour are preserved. The search input itself has no
submitted form name. A search does not change a playlist until you explicitly
select a result. Existing disabled native choices stay disabled.


To use it:

1. Prepare any native Playlist: Simultaneous, Sequential, Shuffle, or Soundboard.
   Soundboards additionally require selecting one specific track to play.
2. Set the normal Scene Playlist to the day ambience you already use.
3. Expand the Darkness Playlist section and **open the Nighttime playlist
   dropdown**. Its search box appears **inside the dropdown**, at the top of
   the choices, with a magnifying-glass icon on the left. Filter by name or
   playback mode and select a result. Closing the menu removes the search box
   from view; the saved playlist stays visible in the closed selector.
   If you choose a Soundboard, another field asks which track to play.
   The picker supports mouse, keyboard, Escape, and clicking outside to close.
4. Save Scene configuration, then use the normal Foundry v14 Scene Lighting
   controls / **Transition to Darkness**. At the threshold, the primary
   active GM stops the day playlist and starts the night playlist according
   to its playback mode (one track for sequential/shuffle, all tracks for
   simultaneous, the explicitly selected track for soundboards). Returning
   to daylight reverses the switch. This also responds to other modules which
   update the **Scene environment.darknessLevel** field.

### Smooth fade / crossfade behaviour

When the Scene returns to daylight, this feature **restores the original Scene
Playlist**, not a different fallback. The Scene Playlist field is never
overwritten.

Choose **Playlist transition → Crossfade — overlap fade-in and fade-out** in
Scene Configuration. This is the default for Scenes with the darkness feature
enabled. The incoming playlist starts while the outgoing playlist stops, so
their built-in fades can overlap. Or choose **Fade out first, then fade in**
for an intentionally separated transition.

**Duration comes from Foundry’s native Playlists tab:** right-click each
daytime and nighttime playlist → Edit Playlist → **Fade Duration (ms)**.
Give both a nonzero duration, for example **1500–2500 ms**, to hear the
overlap. The Scene configuration displays the current durations. An individual
track can also have its own fade setting; Foundry combines playlist and track
fade values. This module deliberately does **not** overwrite shared Playlist
fade data just because a Scene selects it. A playlist configured with 0ms fade
will still switch suddenly despite the Crossfade option.

The audio transition follows the darkness threshold in both directions; it
never changes Scene darkness or plays unrelated soundtracks. As with v0.3.0,
single-track Soundboard replacements stop the previous track before starting
another to avoid stopping the new sound accidentally.

No separate night image, duplicate Scene or extra audio module is required.
Soundboard tracks are never chosen automatically: until you select a sound,
that Scene has no darkness audio action. A Soundboard selected as the normal
Scene Playlist remains manual when the Scene returns to daylight.
The feature does not touch other Playlists or Scenes; an unconfigured Scene has
no playback automation. Night audio is stopped when the Scene deactivates.
Only one authoritative GM client issues playback calls. The module does **not**
change world time or the Scene lighting itself. It only observes darkness
changes. Playlist controls require an active GM client running the module.

**Compatibility notes:** Foundry v14 ApplicationV2 Scene Config render hook,
`updateScene` changes, and the official v14 `Playlist.playAll()` and
`stopAll()` APIs. Offline Chromium and unit integration tests cover the form
and lighting events. Live acceptance requires installing/enabling this module
in the intended world and choosing an approved nighttime recording. No
playlist is created, altered, or played by installation alone.

## Development

Run:

    npm run check
    npm test
    python3 tests/browser-smoke.py
    python3 tools/package_release.py

Release archives are deterministic ZIPs containing only the module manifest,
JavaScript, documentation and license, with the manifest at ZIP root.

To release a version, update the version fields in both module.json and
package.json, update the pinned download URL, and push a tag matching
the version prefixed by v, e.g. v0.1.0. The GitHub Actions workflow tests
the module and publishes the ZIP and manifest as release assets.

## License

MIT — see LICENSE. Not affiliated with Arc Dream Publishing or Foundry Gaming LLC.
