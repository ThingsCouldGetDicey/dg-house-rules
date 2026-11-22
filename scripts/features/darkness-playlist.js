/** Foundry v14: opt-in, scene-scoped darkness playlist switching.
 * The native Scene.playlist remains the daytime/default playlist; no Scene
 * document update or additional module is required for the audio transition.
 */
export const MODULE_ID = "dg-house-rules";
export const NIGHT_FLAG = "darknessPlaylist";
export const THRESHOLD_FLAG = "darknessThreshold";
export const NIGHT_SOUND_FLAG = "darknessPlaylistSound";
export const PLAYLIST_MODES = Object.freeze({[-1]:"Soundboard",[0]:"Sequential",[1]:"Shuffle",[2]:"Simultaneous"});

export function playlistModeLabel(mode) {return PLAYLIST_MODES[mode] ?? "Unknown";}

export function playlistSounds(playlist) {
  const collection = playlist?.sounds;
  return collection?.contents ?? (collection ? Array.from(collection) : []);
}
export const DEFAULT_THRESHOLD = 0.5;

function flag(scene, key) {
  return scene?.getFlag?.(MODULE_ID, key) ?? scene?.flags?.[MODULE_ID]?.[key];
}

export function nightSettings(scene) {
  const id = flag(scene, NIGHT_FLAG);
  const raw = flag(scene, THRESHOLD_FLAG);
  const soundId = flag(scene, NIGHT_SOUND_FLAG);
  const number = raw === undefined || raw === null || raw === "" ? DEFAULT_THRESHOLD : Number(raw);
  return {
    nightPlaylistId: typeof id === "string" && /^[a-zA-Z0-9]{16}$/.test(id) ? id : "",
    nightSoundId: typeof soundId === "string" && /^[a-zA-Z0-9]{16}$/.test(soundId) ? soundId : "",
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
    Object.hasOwn(changes.flags?.[MODULE_ID] ?? {}, NIGHT_SOUND_FLAG) ||
    Object.hasOwn(changes, "flags." + MODULE_ID + "." + NIGHT_FLAG) ||
    Object.hasOwn(changes, "flags." + MODULE_ID + "." + NIGHT_SOUND_FLAG) ||
    Object.hasOwn(changes, "flags." + MODULE_ID + "." + THRESHOLD_FLAG);
}

export function playlistDecision(scene, game) {
  const {nightPlaylistId, nightSoundId, threshold} = nightSettings(scene);
  if (!nightPlaylistId) return null; // opt-in: no effect on ordinary Scenes
  const night = game.playlists?.get?.(nightPlaylistId);
  const day = scene.playlist ? game.playlists?.get?.(scene.playlist) : null;
  if (!night || (scene.playlist && !day)) return null; // stale/deleted reference
  if (night.id === day?.id) return null;
  // All native Foundry playlist modes are selectable. Soundboard is different:
  // it cannot auto-play as a playlist; the GM must choose an individual sound.
  if (!Object.hasOwn(PLAYLIST_MODES, night.mode)) return null;
  const sound = night.mode === -1
    ? playlistSounds(night).find(s => s.id === nightSoundId)
    : null;
  if (night.mode === -1 && !sound) return null;
  const level = Number(scene.environment?.darknessLevel ?? 0);
  return {night, day, sound, isNight: Number.isFinite(level) && level >= threshold};
}

/** Use Foundry's mode-specific APIs; playAll must NEVER start a shuffled,
 * sequential or soundboard playlist, because playAll is simultaneous. */
export async function startPlaylist(playlist, sound = null) {
  if (!playlist) return;
  switch (playlist.mode) {
    case 2: return playlist.playAll();
    case 0:
    case 1: return playlist.playNext();
    case -1: return sound ? playlist.playSound(sound) : undefined;
    default: return undefined;
  }
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
    const {night, day, sound, isNight} = decision;
    if (isNight) {
      if (prior && (prior.sceneId !== scene.id || prior.playlistId !== night.id || prior.soundId !== sound?.id)) {
        const old = game.playlists?.get?.(prior.playlistId);
        this.activeNight = null;
        if (old?.playing) await old.stopAll();
      }
      if (day?.playing) await day.stopAll();
      if (!night.playing) await startPlaylist(night, sound);
      this.activeNight = {sceneId: scene.id, playlistId: night.id, soundId: sound?.id};
    } else {
      // Handle both normal night->day and a GM reload during daylight when
      // the sound was already playing before this client opened.
      if (night.playing) await night.stopAll();
      this.activeNight = null;
      if (day && !day.playing) await startPlaylist(day);
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
  const intro = create("p", {textContent:
    "The normal Scene Playlist is daytime audio. Search all playlists below, including Sequential, Shuffle and Soundboard. Soundboards require you to select a track."});
  intro.className = "hint";
  section.append(intro);
  const choices = [...(game.playlists?.contents ?? [])]
    .sort((a, b) => a.name.localeCompare(b.name));
  const searchLabel = create("label", {textContent:"Search playlists"});
  const search = create("input", {type:"search", placeholder:"Search all playlists…"});
  search.setAttribute("aria-label", "Search nighttime playlists");
  search.autocomplete = "off";
  searchLabel.append(search);
  const label = create("label", {textContent:"Nighttime playlist"});
  const select = create("select", {name:"flags." + MODULE_ID + "." + NIGHT_FLAG});
  select.setAttribute("aria-label", "Nighttime playlist");
  const empty = create("option", {value:"", textContent:"Disabled — keep normal Scene Playlist"});
  const originals = [empty];
  for (const playlist of choices) {
    originals.push(create("option", {value:playlist.id,
      textContent:playlist.name + " (" + playlistModeLabel(playlist.mode) + ")"}));
  }
  // Retain an unavailable saved ID explicitly; never silently lose it.
  if (settings.nightPlaylistId && !choices.some(p => p.id === settings.nightPlaylistId)) {
    originals.push(create("option", {value:settings.nightPlaylistId,
      textContent:"Missing playlist — select another"}));
  }
  select.append(...originals);
  select.value = settings.nightPlaylistId;
  const count = create("p");
  count.className = "hint";
  count.setAttribute("role", "status");
  const filter = () => {
    const value = select.value;
    const query = search.value.trim().toLocaleLowerCase();
    const matches = originals.filter(o => !query || o.value === value ||
      o.textContent.toLocaleLowerCase().includes(query));
    select.replaceChildren(...matches);
    // A search never resets the saved selection.
    select.value = value;
    const actualMatches = originals.filter(o => o.value && (!query ||
      o.textContent.toLocaleLowerCase().includes(query))).length;
    count.textContent = actualMatches + " of " + choices.length + " playlists match";
  };
  search.addEventListener("input", filter);
  label.append(select);
  section.append(searchLabel, label, count);

  // For soundboards (-1), selecting a specific track is mandatory. Nothing
  // is auto-picked: that could trigger an unintended sting or loud effect.
  const trackLabel = create("label", {textContent:"Soundboard track to play at night"});
  const trackSelect = create("select", {name:"flags." + MODULE_ID + "." + NIGHT_SOUND_FLAG});
  trackSelect.setAttribute("aria-label", "Nighttime soundboard track");
  trackLabel.append(trackSelect);
  const trackHint = create("p", {textContent:
    "Soundboards cannot play automatically as a whole. Choose the specific track to trigger, or use a different playlist."});
  trackHint.className = "hint";
  const updateTracks = () => {
    const current = choices.find(p => p.id === select.value);
    const showTrack = current?.mode === -1;
    trackLabel.hidden = trackHint.hidden = !showTrack;
    // Some Foundry themes set label {display:block}, which overrides the
    // browser's native [hidden] stylesheet. Hide explicitly as well.
    trackLabel.style.display = trackHint.style.display = showTrack ? "" : "none";
    const retained = current?.id === settings.nightPlaylistId ? settings.nightSoundId : "";
    trackSelect.replaceChildren(create("option", {value:"", textContent:"Choose a soundboard track…"}));
    if (current?.mode !== -1) return;
    const sounds = [...playlistSounds(current)].sort((a, b) => a.name.localeCompare(b.name));
    for (const sound of sounds) {
      trackSelect.append(create("option", {value:sound.id, textContent:sound.name}));
    }
    if (retained && !sounds.some(s => s.id === retained)) {
      trackSelect.append(create("option", {value:retained, textContent:"Missing track — select another"}));
    }
    trackSelect.value = retained;
  };
  select.addEventListener("change", updateTracks);
  updateTracks();
  filter();
  section.append(trackLabel, trackHint);
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
