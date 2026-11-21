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
