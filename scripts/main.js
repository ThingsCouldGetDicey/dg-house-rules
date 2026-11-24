import {ensureJournalTheme, applyJournalActThemes, applyJournalChrome, detachJournalChrome} from "./features/journal-theme.js";
import {
  MODULE_ID, DarknessPlaylistController, addDarknessPlaylistFields,
  sceneUpdateAffectsAudio
} from "./features/darkness-playlist.js";
import {
  shouldHideTarget, concealRenderedTarget, resolveSpeakerActor
} from "./features/roll-target-visibility.js";
const MODULE = MODULE_ID;
const darknessController = new DarknessPlaylistController();

Hooks.on("renderSceneConfig", (app, html) => {
  if (game.system?.id === "deltagreen") addDarknessPlaylistFields(app, html, game);
});
Hooks.on("renderApplicationV2", (app, html) => {
  if (game.system?.id !== "deltagreen") return;
  applyJournalActThemes(html?.[0] ?? html);
  applyJournalChrome(app, html);
  // Foundry v14 SceneConfig inherits ApplicationV2; safeguard against
  // changes to the specific renderSceneConfig hook name.
  const SceneConfig = globalThis.foundry?.applications?.sheets?.SceneConfig;
  if (SceneConfig && app instanceof SceneConfig) addDarknessPlaylistFields(app, html, game);
});
Hooks.on("renderJournalSheet", (app, html) => {
  if (game.system?.id === "deltagreen") applyJournalActThemes(html?.[0] ?? html);
});
Hooks.on("renderJournalEntrySheet", (app, html) => {
  if (game.system?.id === "deltagreen") applyJournalChrome(app, html);
});
Hooks.on("closeApplicationV2", (app, html) => {
  const root=html?.[0] ?? html ?? app?.element;
  if(root?.matches?.(".journal-sheet.journal-entry.dg-il-app-chrome")) detachJournalChrome(root);
});
Hooks.on("updateScene", (scene, changes) => {
  if (game.system?.id !== "deltagreen" || !sceneUpdateAffectsAudio(changes)) return;
  void darknessController.enqueue(scene);
});
Hooks.on("canvasReady", canvas => {
  if (game.system?.id === "deltagreen" && canvas?.scene) void darknessController.enqueue(canvas.scene);
});
Hooks.once("ready", () => {
  if (game.system?.id === "deltagreen") {
    ensureJournalTheme(document);
    applyJournalActThemes(document);
  }
  if (game.system?.id === "deltagreen" && game.scenes?.active)
    void darknessController.enqueue(game.scenes.active);
});


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
