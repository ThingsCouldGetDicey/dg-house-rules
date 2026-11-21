# Delta Green — House Rules

Small modular changes to the Foundry v14 Delta Green system, without editing
the installed game system itself.

## Skill target visibility

Game Settings → Configure Settings → Module Settings → Delta Green — House Rules

- Hide Unnatural skill targets from players: ON by default.
- Hide NPC skill targets from players: OFF by default.
- GMs retain full targets. Agent/player actor rolls are unaffected.
- For selected actors, player chat cards read "Firearms: Target hidden"
  instead of showing the target or modifier breakdown.
- The dice result, success/failure, critical result, and item damage action
  remain unchanged.

NOTE: This is client-side **visual concealment** only, not data secrecy.
The target still exists in the underlying ChatMessage or actor data, which a
technically privileged user may inspect. Use private/blind rolls for actual
secret rolls. Do not give players ownership of creatures whose statistics
you intend to hide.

Settings are per-world; installing the module does not activate it in a world.
Future house rules should live in separate, tested feature modules.

## Testing

Run npm test and npm run check. Test a real player-view Foundry client before
deploying to the campaign world.
