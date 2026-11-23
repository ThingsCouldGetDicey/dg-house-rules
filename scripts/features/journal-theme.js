/** Opt-in Impossible Landscapes journal theme. Unrelated journals unaffected.
 * A module-relative load also tolerates a cached Foundry package manifest.
 */
export function ensureJournalTheme(doc,url=new URL("../../styles/king-in-yellow-journal.css?v=0.7.0",import.meta.url).href){
  if(!doc?.head||!doc?.createElement)return false;
  if([...doc.querySelectorAll('link[rel="stylesheet"]')]
    .some(link=>link.href.includes("/styles/king-in-yellow-journal.css")))return false;
  const link=doc.createElement("link");
  link.rel="stylesheet";
  link.href=url;
  link.dataset.dgIlJournalTheme="true";
  doc.head.append(link);
  return true;
}
