/** Opt-in Impossible Landscapes journal theme. Unrelated journals unaffected.
 * A module-relative load also tolerates a cached Foundry package manifest.
 */
export function ensureJournalTheme(doc,url=new URL("../../styles/king-in-yellow-journal.css?v=0.12.0",import.meta.url).href){
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
