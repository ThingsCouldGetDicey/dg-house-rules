/**
 * Delta Green 2.0.1 / Foundry v14 client-side chat-card display extension.
 * Visual concealment only: original ChatMessage/Actor data is not redacted.
 */
const ROLL_TYPES = new Set([
  "stat", "skill", "typed-skill", "weapon", "special-training", "sanity", "luck"
]);
export function shouldHideTarget({actorType, isGM, hideNpc, hideUnnatural, message}) {
  if (isGM === true || !message?.flags?.deltagreen?.chatCard) return false;
  const selected =
    (actorType === "unnatural" && hideUnnatural === true) ||
    (actorType === "npc" && hideNpc === true);
  if (!selected) return false;
  const rolls = message?.rolls;
  if (!Array.isArray(rolls) || rolls.length === 0) return false;
  return rolls.some((roll) =>
    roll?.constructor?.name === "DGPercentileRoll" ||
    (ROLL_TYPES.has(roll?.options?.rollType) &&
      roll?.constructor?.name === "DGRoll")
  );
}

/** Drop the target and target-breakdown tooltip, but not dice or outcome. */
export function concealRenderedTarget(element) {
  if (!element?.querySelector) return false;
  const card = element.querySelector(".dg-chat-card");
  if (!card) return false;
  const label = card.querySelector(".dg-chat-card__roll-label");
  if (!label || label.dataset?.dgTargetHidden === "true") return false;
  // DG v2.0.1: <b>Firearms</b>: 60% [optional tooltip]. The
  // <b> node contains skill/stat name and possibly [INHUMAN], not target.
  const heading = label.querySelector("b");
  if (!heading?.textContent?.trim()) return false;
  const doc = label.ownerDocument;
  if (!doc?.createElement || !doc?.createTextNode) return false;
  const safeName = doc.createElement("strong");
  safeName.textContent = heading.textContent.trim();
  const hidden = doc.createElement("span");
  hidden.className = "dg-house-rules__concealed-target";
  hidden.textContent = "Target hidden";
  label.replaceChildren(safeName, doc.createTextNode(": "), hidden);
  label.dataset.dgTargetHidden = "true";
  return true;
}

/** The real speaker's Actor type, never inferred from the actor name. */
export function resolveSpeakerActor(message, chatClass, actors) {
  const speaker = message?.speaker;
  if (!speaker) return null;
  const found = chatClass?.getSpeakerActor?.(speaker);
  if (found) return found;
  if (speaker.token && actors?.tokens?.[speaker.token]) return actors.tokens[speaker.token];
  return speaker.actor ? (actors?.get?.(speaker.actor) ?? null) : null;
}
