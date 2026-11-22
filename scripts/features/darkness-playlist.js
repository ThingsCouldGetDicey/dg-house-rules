/** Foundry v14: opt-in, scene-scoped darkness playlist switching.
 * The native Scene.playlist remains the daytime/default playlist; no Scene
 * document update or additional module is required for the audio transition.
 */
export const MODULE_ID = "dg-house-rules";
export const NIGHT_FLAG = "darknessPlaylist";
export const THRESHOLD_FLAG = "darknessThreshold";
export const DEFAULT_THRESHOLD = 0.5;

function flag(scene, key) {
  return scene?.getFlag?.(MODULE_ID, key) ?? scene?.flags?.[MODULE_ID]?.[key];
}

export function nightSettings(scene) {
  const id = flag(scene, NIGHT_FLAG);
  const raw = flag(scene, THRESHOLD_FLAG);
  const number = raw === undefined || raw === null || raw === "" ? DEFAULT_THRESHOLD : Number(raw);
  return {
    nightPlaylistId: typeof id === "string" && /^[a-zA-Z0-9]{16}$/.test(id) ? id : "",
    threshold: Number.isFinite(number) && number >= 0 && number <= 1 ? number : DEFAULT_THRESHOLD
  };
}

/** Only the authoritative GM issues audio changes; other clients observe them. */
export function isPrimaryGM(game) {
  if (!game?.user?.isGM) return false;
  const leader = game.users?.activeGM;
  if (leader) return leader.id === game.user.id;
  const online = (game.users?.contents ?? Array.from(game.users ?? []))
    .filter(user => user.isGM && user.active).sort((a, b) => a.id.localeCompare(b.id));
  return online[0]?.id === game.user.id;
}

export function sceneUpdateAffectsAudio(changes) {
  if (!changes || typeof changes !== "object") return false;
  return Object.hasOwn(changes, "active") || Object.hasOwn(changes, "playlist") ||
    Object.hasOwn(changes, "environment.darknessLevel") ||
    Object.hasOwn(changes.environment ?? {}, "darknessLevel") ||
    Object.hasOwn(changes.flags?.[MODULE_ID] ?? {}, NIGHT_FLAG) ||
    Object.hasOwn(changes.flags?.[MODULE_ID] ?? {}, THRESHOLD_FLAG) ||
    Object.hasOwn(changes, "flags." + MODULE_ID + "." + NIGHT_FLAG) ||
    Object.hasOwn(changes, "flags." + MODULE_ID + "." + THRESHOLD_FLAG);
}

export function playlistDecision(scene, game) {
  const {nightPlaylistId, threshold} = nightSettings(scene);
  if (!nightPlaylistId) return null; // opt-in: no effect on ordinary Scenes
  const night = game.playlists?.get?.(nightPlaylistId);
  const day = scene.playlist ? game.playlists?.get?.(scene.playlist) : null;
  if (!night || (scene.playlist && !day)) return null; // stale/deleted reference
  if (night.id === day?.id) return null;
  // Scene soundscapes are simultaneous-mode playlists; don't accidentally
  // play every track of a sequential or soundboard playlist at once.
  if (night.mode !== 2 || (day && day.mode !== 2)) return null;
  const level = Number(scene.environment?.darknessLevel ?? 0);
  return {night, day, isNight: Number.isFinite(level) && level >= threshold};
}

export class DarknessPlaylistController {
  constructor(getGame = () => globalThis.game, onError = error => console.error("[" + MODULE_ID + "]", error)) {
    this.getGame = getGame;
    this.onError = onError;
    this.pending = Promise.resolve();
    this.activeNight = null;
  }

  enqueue(scene) {
    // Serialise all changes (including an immediate night->day toggle), then
    // evaluate CURRENT Scene data instead of replaying stale hook snapshots.
    this.pending = this.pending.catch(this.onError).then(() => this.reconcile(scene));
    return this.pending.catch(this.onError);
  }

  async reconcile(scene) {
    const game = this.getGame();
    if (!isPrimaryGM(game) || !scene?.id) return;
    const active = scene.active === true && game.scenes?.active?.id === scene.id;
    const prior = this.activeNight;
    if (!active) {
      if (prior?.sceneId === scene.id) {
        this.activeNight = null;
        const old = game.playlists?.get?.(prior.playlistId);
        if (old?.playing) await old.stopAll();
      }
      return;
    }
    const decision = playlistDecision(scene, game);
    if (!decision) {
      // If the feature was disabled while the Scene was active, do not leave
      // its former night audio playing. Otherwise leave all existing audio alone.
      if (prior?.sceneId === scene.id) {
        this.activeNight = null;
        const old = game.playlists?.get?.(prior.playlistId);
        if (old?.playing) await old.stopAll();
      }
      return;
    }
    const {night, day, isNight} = decision;
    if (isNight) {
      if (prior && (prior.sceneId !== scene.id || prior.playlistId !== night.id)) {
        const old = game.playlists?.get?.(prior.playlistId);
        this.activeNight = null;
        if (old?.playing) await old.stopAll();
      }
      if (day?.playing) await day.stopAll();
      if (!night.playing) await night.playAll();
      this.activeNight = {sceneId: scene.id, playlistId: night.id};
    } else {
      // Handle both normal night->day and a GM reload during daylight when
      // the sound was already playing before this client opened.
      if (night.playing) await night.stopAll();
      this.activeNight = null;
      if (day && !day.playing) await day.playAll();
    }
  }
}

/** Expandable controls injected into the native Scene settings form. */
export function addDarknessPlaylistFields(app, element, game) {
  const scene = app?.document ?? app?.object;
  if (scene?.documentName !== "Scene" || !game?.user?.isGM) return false;
  const form = element?.matches?.("form") ? element : element?.querySelector?.("form");
  if (!form || form.querySelector("[data-dg-house-rules-darkness]")) return false;
  const doc = form.ownerDocument;
  const create = (tag, props = {}) => Object.assign(doc.createElement(tag), props);
  const section = create("details");
  section.dataset.dgHouseRulesDarkness = "true";
  section.className = "dg-house-rules-darkness";
  section.style.cssText = "margin:12px 0;padding:10px;border:1px solid var(--color-border-light-primary,#777);border-radius:5px";
  const settings = nightSettings(scene);
  section.open = Boolean(settings.nightPlaylistId);
  section.append(create("summary", {textContent:"Darkness Playlist (optional)"}));
  const intro = create("p", {textContent:"Keep the regular Scene Playlist as daytime audio. Choose a simultaneous-mode playlist to switch to automatically when Scene darkness reaches the threshold."});
  intro.className = "hint";
  section.append(intro);
  const label = create("label", {textContent:"Nighttime playlist"});
  const select = create("select", {name:"flags." + MODULE_ID + "." + NIGHT_FLAG});
  select.setAttribute("aria-label", "Nighttime playlist");
  select.append(create("option", {value:"", textContent:"Disabled — keep normal Scene Playlist"}));
  const choices = [...(game.playlists?.contents ?? [])].filter(p => p.mode === 2)
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const playlist of choices) {
    const option = create("option", {value:playlist.id, textContent:playlist.name});
    option.selected = playlist.id === settings.nightPlaylistId;
    select.append(option);
  }
  // Keep missing selections visible instead of silently changing the saved value.
  if (settings.nightPlaylistId && !choices.some(p => p.id === settings.nightPlaylistId)) {
    const missing = create("option", {value:settings.nightPlaylistId,
      textContent:"Missing or incompatible playlist (select a new one)"});
    missing.selected = true;
    select.append(missing);
  }
  label.append(select);
  section.append(label);
  const thresholdLabel = create("label", {textContent:"Switch at darkness level (0=day, 1=night)"});
  const threshold = create("input", {type:"number", min:"0", max:"1", step:"0.05",
    value:String(settings.threshold), name:"flags." + MODULE_ID + "." + THRESHOLD_FLAG});
  threshold.setAttribute("aria-label", "Darkness threshold");
  thresholdLabel.append(threshold);
  section.append(thresholdLabel);
  const hint = create("p", {textContent:"The selected playlist changes when you use Foundry's standard Lighting / Transition to Darkness controls. Only this Scene is affected; the original Playlist setting remains unchanged."});
  hint.className = "hint";
  section.append(hint);
  const nativePlaylist = form.querySelector('[name="playlist"]');
  const anchor = nativePlaylist?.closest?.(".form-group") ?? nativePlaylist?.parentElement;
  if (anchor?.parentElement) anchor.after(section);
  else form.append(section); // v14 layout fallback, still inside the submitted form
  return true;
}
