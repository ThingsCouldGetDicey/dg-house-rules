/** Foundry v14: opt-in, scene-scoped darkness playlist switching.
 * The native Scene.playlist remains the daytime/default playlist; no Scene
 * document update or additional module is required for the audio transition.
 */
export const MODULE_ID = "dg-house-rules";
export const NIGHT_FLAG = "darknessPlaylist";
export const THRESHOLD_FLAG = "darknessThreshold";
export const NIGHT_SOUND_FLAG = "darknessPlaylistSound";
export const CROSSFADE_FLAG = "darknessCrossfade";
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
  const crossfade = flag(scene, CROSSFADE_FLAG);
  const number = raw === undefined || raw === null || raw === "" ? DEFAULT_THRESHOLD : Number(raw);
  return {
    nightPlaylistId: typeof id === "string" && /^[a-zA-Z0-9]{16}$/.test(id) ? id : "",
    nightSoundId: typeof soundId === "string" && /^[a-zA-Z0-9]{16}$/.test(soundId) ? soundId : "",
    crossfade: crossfade !== false && crossfade !== "false" && crossfade !== 0 && crossfade !== "0",
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
    Object.hasOwn(changes.flags?.[MODULE_ID] ?? {}, CROSSFADE_FLAG) ||
    Object.hasOwn(changes, "flags." + MODULE_ID + "." + NIGHT_FLAG) ||
    Object.hasOwn(changes, "flags." + MODULE_ID + "." + NIGHT_SOUND_FLAG) ||
    Object.hasOwn(changes, "flags." + MODULE_ID + "." + CROSSFADE_FLAG) ||
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

/** Native PlaylistSound.fade and Playlist.fade supply the timing. Do not
 * mutate these global documents just to change one Scene's transition.
 * The switch only coordinates starting and stopping the intended playlists.
 */
export async function transitionPlaylists({incoming, sound = null, outgoing = [], crossfade = true}) {
  const toStop = [...new Map(outgoing.filter(p => p?.playing && p.id !== incoming?.id)
    .map(p => [p.id, p])).values()];
  const shouldStart = incoming && !incoming.playing;
  if (crossfade) {
    // Launch both Foundry document updates without awaiting either one first.
    // Their native audio fades therefore run at the same time.
    const pending = [];
    if (shouldStart) pending.push(startPlaylist(incoming, sound));
    for (const prior of toStop) pending.push(prior.stopAll());
    await Promise.all(pending);
  } else {
    for (const prior of toStop) await prior.stopAll();
    if (shouldStart) await startPlaylist(incoming, sound);
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
    const {crossfade} = nightSettings(scene);
    if (isNight) {
      const changing = prior && (prior.sceneId !== scene.id ||
        prior.playlistId !== night.id || prior.soundId !== sound?.id);
      const old = changing ? game.playlists?.get?.(prior.playlistId) : null;
      // When changing a Soundboard track *within the same playlist* we must
      // stop the old sound first; stopping afterward would also stop the new.
      if (old?.id === night.id && old.playing) await old.stopAll();
      await transitionPlaylists({incoming:night, sound,
        outgoing:[day, old?.id === night.id ? null : old], crossfade});
      this.activeNight = {sceneId: scene.id, playlistId: night.id, soundId: sound?.id};
    } else {
      // Handle both normal night->day and a GM reload during daylight when
      // the sound was already playing before this client opened.
      await transitionPlaylists({incoming:day, outgoing:[night], crossfade});
      this.activeNight = null;
    }
  }
}

/** Foundry may cache an older module manifest during a live on-disk update.
 * Load scoped picker CSS on demand as well as declaring it in module.json,
 * so a client refresh can pick up styles without forcing a server restart.
 */
export function ensurePickerStyles(doc) {
  if (!doc?.head || !doc?.createElement) return;
  const key = "darkness-playlist.css";
  if ([...doc.querySelectorAll('link[rel="stylesheet"]')]
    .some(link => link.href.includes(key))) return;
  const style = doc.createElement("link");
  style.rel = "stylesheet";
  style.href = new URL("../../styles/" + key + "?v=0.5.0", import.meta.url).href;
  style.dataset.dgHouseRulesPickerStyle = "true";
  doc.head.append(style);
}

/** Expandable controls injected into the native Scene settings form. */
export function addDarknessPlaylistFields(app, element, game) {
  const scene = app?.document ?? app?.object;
  if (scene?.documentName !== "Scene" || !game?.user?.isGM) return false;
  const form = element?.matches?.("form") ? element : element?.querySelector?.("form");
  if (!form || form.querySelector("[data-dg-house-rules-darkness]")) return false;
  const doc = form.ownerDocument;
  ensurePickerStyles(doc);
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
  // Native HTML select popups cannot contain an input. Keep a genuine
  // submitted select (hidden visually) and render an accessible in-form popup
  // whose search row exists *inside the open dropdown*, never above it.
  const label = create("label", {textContent:"Nighttime playlist"});
  const picker = create("div");
  picker.className = "dg-house-rules-picker";
  const select = create("select", {name:"flags." + MODULE_ID + "." + NIGHT_FLAG});
  select.className = "dg-house-rules-picker-value";
  // Hide immediately, even before the on-demand CSS finishes loading.
  select.style.display = "none";
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");
  const empty = create("option", {value:"", textContent:"Disabled — keep normal Scene Playlist"});
  const originals = [empty];
  for (const playlist of choices) {
    originals.push(create("option", {value:playlist.id,
      textContent:playlist.name + " (" + playlistModeLabel(playlist.mode) + ")"}));
  }
  if (settings.nightPlaylistId && !choices.some(p => p.id === settings.nightPlaylistId)) {
    originals.push(create("option", {value:settings.nightPlaylistId,
      textContent:"Missing playlist — select another"}));
  }
  select.append(...originals);
  select.value = settings.nightPlaylistId;

  const trigger = create("button", {type:"button"});
  trigger.className = "dg-house-rules-picker-trigger";
  trigger.setAttribute("aria-label", "Nighttime playlist");
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  const triggerText = create("span");
  triggerText.className = "dg-house-rules-picker-selected";
  const caret = create("span", {textContent:"▾"});
  caret.className = "dg-house-rules-picker-chevron";
  caret.setAttribute("aria-hidden", "true");
  trigger.append(triggerText, caret);

  const popup = create("div");
  popup.className = "dg-house-rules-picker-popup";
  popup.hidden = true;
  const searchRow = create("div");
  searchRow.className = "dg-house-rules-picker-search-row";
  const icon = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("width", "17");
  icon.setAttribute("height", "17");
  icon.setAttribute("fill", "none");
  icon.setAttribute("stroke", "currentColor");
  icon.setAttribute("stroke-width", "2");
  icon.setAttribute("stroke-linecap", "round");
  icon.setAttribute("aria-hidden", "true");
  const circle = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "11");
  circle.setAttribute("cy", "11");
  circle.setAttribute("r", "8");
  const handle = doc.createElementNS("http://www.w3.org/2000/svg", "path");
  handle.setAttribute("d", "m21 21-4.35-4.35");
  icon.append(circle, handle);
  const search = create("input", {type:"search", placeholder:"Search playlists…"});
  search.className = "dg-house-rules-picker-search-input";
  search.setAttribute("aria-label", "Search nighttime playlists");
  search.autocomplete = "off";
  searchRow.append(icon, search);

  const list = create("div");
  list.className = "dg-house-rules-picker-options";
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "Available nighttime playlists");
  const count = create("p");
  count.className = "dg-house-rules-picker-count";
  count.setAttribute("role", "status");
  popup.append(searchRow, list, count);
  picker.append(select, trigger, popup);
  section.append(label, picker);

  const setDisplay = () => {
    triggerText.textContent = originals.find(o => o.value === select.value)?.textContent
      ?? "Disabled — keep normal Scene Playlist";
  };
  const renderOptions = () => {
    list.replaceChildren();
    const query = search.value.trim().toLocaleLowerCase();
    const matches = originals.filter(o => o.textContent.toLocaleLowerCase().includes(query));
    for (const option of matches) {
      const row = create("button", {type:"button", textContent:option.textContent});
      row.className = "dg-house-rules-picker-option";
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(option.value === select.value));
      if (option.value === select.value) row.classList.add("is-selected");
      row.dataset.playlistId = option.value;
      row.addEventListener("click", () => {
        select.value = option.value;
        select.dispatchEvent(new Event("change", {bubbles:true}));
        closePopup();
        trigger.focus();
      });
      list.append(row);
    }
    if (!matches.length) {
      const emptyRow = create("p", {textContent:"No playlists match your search"});
      emptyRow.className = "dg-house-rules-picker-empty";
      list.append(emptyRow);
    }
    const matchingPlaylists = matches.filter(o => o.value).length;
    count.textContent = matchingPlaylists + " of " + choices.length + " playlists match";
  };
  const onOutsidePointer = event => {
    if (!picker.contains(event.target)) closePopup();
  };
  const closePopup = () => {
    if (popup.hidden) return;
    popup.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    doc.removeEventListener("pointerdown", onOutsidePointer);
  };
  const openPopup = () => {
    popup.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    search.value = "";
    renderOptions();
    doc.addEventListener("pointerdown", onOutsidePointer);
    search.focus();
  };
  trigger.addEventListener("click", () => popup.hidden ? openPopup() : closePopup());
  const onPickerKey = event => {
    if (event.key === "Escape" && !popup.hidden) {
      event.preventDefault();
      closePopup();
      trigger.focus();
      return;
    }
    if (popup.hidden && (event.key === "ArrowDown" || event.key === "ArrowUp")
      && event.target === trigger) {
      event.preventDefault();
      openPopup();
    } else if (!popup.hidden && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      const buttons = [...list.querySelectorAll(".dg-house-rules-picker-option")];
      if (!buttons.length) return;
      event.preventDefault();
      const current = buttons.indexOf(doc.activeElement);
      const next = event.key === "ArrowDown"
        ? (current + 1) % buttons.length
        : (current <= 0 ? buttons.length - 1 : current - 1);
      buttons[next].focus();
    } else if (event.key === "Tab" && !popup.hidden) {
      closePopup();
    }
  };
  picker.addEventListener("keydown", onPickerKey);
  search.addEventListener("input", renderOptions);
  select.addEventListener("change", () => {
    setDisplay();
    if (!popup.hidden) renderOptions();
  });
  setDisplay();

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
  section.append(trackLabel, trackHint);
  const thresholdLabel = create("label", {textContent:"Switch at darkness level (0=day, 1=night)"});
  const threshold = create("input", {type:"number", min:"0", max:"1", step:"0.05",
    value:String(settings.threshold), name:"flags." + MODULE_ID + "." + THRESHOLD_FLAG});
  threshold.setAttribute("aria-label", "Darkness threshold");
  thresholdLabel.append(threshold);
  section.append(thresholdLabel);
  const crossfadeLabel = create("label", {textContent:"Playlist transition"});
  const crossfadeSelect = create("select", {name:"flags." + MODULE_ID + "." + CROSSFADE_FLAG});
  crossfadeSelect.setAttribute("aria-label", "Playlist transition");
  crossfadeSelect.append(
    create("option", {value:"true", textContent:"Crossfade — overlap fade-in and fade-out"}),
    create("option", {value:"false", textContent:"Fade out first, then fade in"})
  );
  crossfadeSelect.value = settings.crossfade ? "true" : "false";
  crossfadeLabel.append(crossfadeSelect);
  section.append(crossfadeLabel);
  const nativeFadeInfo = create("p");
  nativeFadeInfo.className = "hint";
  const fadeText = playlist => {
    const milliseconds = Number(playlist?.fade);
    return playlist
      ? (Number.isFinite(milliseconds) && milliseconds > 0
        ? (milliseconds / 1000).toLocaleString(undefined, {maximumFractionDigits:2}) + "s"
        : "0s (instant)")
      : "not set";
  };
  const showFades = () => {
    const dayPlaylist = game.playlists?.get?.(scene.playlist);
    const nightPlaylist = game.playlists?.get?.(select.value);
    nativeFadeInfo.textContent =
      "Foundry controls fade duration in each Playlist's settings (Fade Duration, ms). " +
      "Current daytime: " + fadeText(dayPlaylist) +
      "; nighttime: " + fadeText(nightPlaylist) +
      ". Set both above 0 for a smooth crossfade. Track-level fade settings may also apply.";
  };
  select.addEventListener("change", showFades);
  showFades();
  section.append(nativeFadeInfo);
  const hint = create("p", {textContent:"The selected playlist changes when you use Foundry's standard Lighting / Transition to Darkness controls. Only this Scene is affected; the original Playlist setting remains unchanged."});
  hint.className = "hint";
  section.append(hint);
  const nativePlaylist = form.querySelector('[name="playlist"]');
  const anchor = nativePlaylist?.closest?.(".form-group") ?? nativePlaylist?.parentElement;
  if (anchor?.parentElement) anchor.after(section);
  else form.append(section); // v14 layout fallback, still inside the submitted form
  return true;
}
