import {
  shouldHideTarget, concealRenderedTarget, resolveSpeakerActor
} from "./features/roll-target-visibility.js";
const MODULE = "dg-house-rules";

Hooks.once("init", () => {
  if (game.system?.id !== "deltagreen") return;
  game.settings.register(MODULE, "hideUnnatural", {
    name: "Hide Unnatural skill targets from players",
    hint: "Hides targets and target modifiers in Unnatural chat roll cards for non-GM viewers. Dice results remain visible. Presentation only, not a secure redaction.",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(MODULE, "hideNpc", {
    name: "Hide NPC skill targets from players",
    hint: "The same rule for NPCs. Defaults off; agents and vehicles are excluded.",
    scope: "world", config: true, type: Boolean, default: false
  });
});

Hooks.on("renderChatMessageHTML", (message, element) => {
  if (game.system?.id !== "deltagreen" || game.user?.isGM) return;
  const actor = resolveSpeakerActor(message, ChatMessage, game.actors);
  if (!actor) return;
  if (!shouldHideTarget({
    actorType: actor.type,
    isGM: game.user.isGM,
    hideNpc: game.settings.get(MODULE, "hideNpc"),
    hideUnnatural: game.settings.get(MODULE, "hideUnnatural"),
    message
  })) return;
  concealRenderedTarget(element);
});
