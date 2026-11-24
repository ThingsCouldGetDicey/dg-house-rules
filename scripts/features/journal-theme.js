/** Opt-in Impossible Landscapes journal theme. Unrelated journals unaffected.
 * A module-relative load also tolerates a cached Foundry package manifest.
 */
export function ensureJournalTheme(doc,url=new URL("../../styles/king-in-yellow-journal.css?v=0.13.0",import.meta.url).href){
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
