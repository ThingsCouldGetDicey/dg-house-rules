/** Opt-in Impossible Landscapes journal theme. Unrelated journals unaffected.
 * A module-relative load also tolerates a cached Foundry package manifest.
 */
export function ensureJournalTheme(doc,url=new URL("../../styles/king-in-yellow-journal.css?v=0.15.0",import.meta.url).href){
  if(!doc?.head||!doc?.createElement)return false;
  const old=[...doc.querySelectorAll('link[rel="stylesheet"]')]
    .find(link=>link.href.includes("/styles/king-in-yellow-journal.css"));
  if(old){
    if(old.href===url)return false;
    old.href=url;
    return true;
  }
  const link=doc.createElement("link");
  link.rel="stylesheet";
  link.href=url;
  link.dataset.dgIlJournalTheme="true";
  doc.head.append(link);
  return true;
}

/** Presentation only. Resolve chapter identity from the existing authored
 * section header, never from active Scene, campaign state or user progress.
 * Nested source embeds inherit their parent page and get no second frame.
 */
export function journalActFromHeading(heading) {
  const s=String(heading??"").toLowerCase().replace(/[–—·]/g," ").replace(/\s+/g," ").trim();
  if (s.startsWith("part one ")) return "nyc";
  if (s.startsWith("part two ") || s.includes("part two a volume of secret faces")) return "boston";
  if (s.startsWith("part three ")) return "map";
  if (s.startsWith("part four ")) return "carcosa";
  if (s.startsWith("exeunt the bookshop")) return "bookshop";
  if (s.startsWith("exeunt the missing room")) return "missing-room";
  if (s.startsWith("exeunt hotel broadalbin")) return "hotel";
  return "reference";
}

export function applyJournalActThemes(root) {
  if (!root?.querySelectorAll) return 0;
  const articles=[...(root.matches?.(".dg-il-journal")?[root]:[]), ...root.querySelectorAll(".dg-il-journal")];
  let count=0;
  for (const article of articles) {
    if (article.parentElement?.closest(".dg-il-journal")) continue;
    const head=article.querySelector(":scope > .dg-il-masthead > .dg-il-subtitle, :scope > .dg-il-case-header > .dg-il-case-overline");
    article.dataset.dgIlAct=journalActFromHeading(head?.textContent);
    // Only the journal which owns the scoped content receives chrome.
    article.closest(".journal-sheet")?.classList.add("dg-il-themed-sheet");
    count++;
  }
  return count;
}

/** Foundry v14 JournalEntrySheet chrome, scoped to explicitly managed pages.
 * Use native page metadata, not names of locations or active Scenes.
 * Observe only the owning sheet's TOC to follow multi-page scrolling.
 */
const chapterThemes = Object.freeze({4:"nyc",5:"bookshop",6:"boston",7:"missing-room",8:"map",9:"hotel",10:"carcosa"});
const sheetObservers = new WeakMap();
export function journalPageTheme(page) {
  const meta=page?.flags?.["computer-mcp"];
  if(meta?.source==="il-unified-handler-journal-v1") return chapterThemes[meta.chapterNumber] ?? "reference";
  return "reference";
}
export function detachJournalChrome(root) {
  const state=sheetObservers.get(root);
  state?.observer?.disconnect();
  sheetObservers.delete(root);
  if(root?.classList) {
    root.classList.remove("dg-il-app-chrome");
    delete root.dataset.dgIlChrome;
    root.querySelectorAll(".toc [data-dg-il-page-act]").forEach(row=>delete row.dataset.dgIlPageAct);
  }
}
export function applyJournalChrome(app, html) {
  const node=html?.[0] ?? html ?? app?.element;
  const root=node?.closest?.(".journal-sheet.journal-entry");
  if(!root) return false;
  const entry=app?.entry ?? app?.document;
  // Only this campaign's managed native JournalEntry. Never theme editors,
  // player image popouts, other journals, dialogs or the game canvas.
  if(entry?.id!=="lPiCcEpa0KK0rfo0" ||
     !entry.pages?.get || !root.querySelector(".journal-entry-content")) {
    return false;
  }
  const toc=root.querySelector(".journal-sidebar .toc");
  const previous=sheetObservers.get(root);
  previous?.observer?.disconnect();
  root.classList.add("dg-il-app-chrome");
  const sync=()=>{
    if(!root.isConnected) return;
    const active=toc?.querySelector("li[data-page-id].active");
    const page=entry.pages.get((app.isMultiple ? active?.dataset.pageId : app.pageId) ?? active?.dataset.pageId);
    const theme=journalPageTheme(page);
    if(root.dataset.dgIlChrome!==theme) root.dataset.dgIlChrome=theme;
  };
  for(const row of toc?.querySelectorAll("li[data-page-id]") ?? []) {
    row.dataset.dgIlPageAct=journalPageTheme(entry.pages.get(row.dataset.pageId));
  }
  sync();
  const observer=toc && typeof MutationObserver!=="undefined" ? new MutationObserver(sync) : null;
  observer?.observe(toc,{subtree:true,attributes:true,attributeFilter:["class"]});
  sheetObservers.set(root,{observer});
  return true;
}

/** GM-only chat controls for explicitly reviewed, player-facing source text.
 * Never publish surrounding Handler text or infer dialogue from quotation marks.
 */
export function spokenChatContent(text) {
  return '<div style="white-space:pre-wrap">'+String(text).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")+'</div>';
}
export function applyJournalSpeech(root, gameRef=globalThis.game, messageClass=globalThis.ChatMessage) {
  if(!root?.querySelectorAll || !gameRef?.user?.isGM || !messageClass?.create) return 0;
  let count=0;
  for(const box of root.querySelectorAll(".dg-il-journal .dg-il-visual-reviewed .dg-il-spoken-box")) {
    const source=box.querySelector(":scope > pre.dg-il-reviewed-block");
    if(!source || !["npc-dialogue","read-aloud"].includes(source.dataset.sourceRole))continue;
    if(box.querySelector(":scope > .dg-il-send-spoken"))continue;
    const button=box.ownerDocument.createElement("button");
    button.type="button";button.className="dg-il-send-spoken";button.textContent="Send to Chat";
    button.title="Send only this original passage publicly to game chat";
    button.addEventListener("click",async event=>{
      event.preventDefault();event.stopPropagation();
      if(!gameRef.user?.isGM || button.disabled || !source.textContent?.trim())return;
      button.disabled=true;
      try {
        await messageClass.create({content:spokenChatContent(source.textContent),speaker:{alias:"Handler"},whisper:[]});
      } catch(error) {
        globalThis.ui?.notifications?.error("Could not send journal passage to chat.");
        console.error("Delta Green journal chat:",error);
      } finally {button.disabled=false;}
    });
    box.append(button);count++;
  }
  return count;
}
