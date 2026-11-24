import test from 'node:test';
import assert from 'node:assert/strict';
import {journalActFromHeading, applyJournalActThemes} from '../scripts/features/journal-theme.js';
const headings=[
 ["Part One — The Night Floors","nyc"],
 ["Part Two · A Volume of Secret Faces","boston"],
 ["IMPOSSIBLE LANDSCAPES · PART TWO — A VOLUME OF SECRET FACES · GM ONLY","boston"],
 ["Part Three — Like a Map Made of Skin","map"],
 ["Part Four — The End of the World of the End","carcosa"],
 ["Exeunt — The Bookshop","bookshop"],["Exeunt · The Missing Room","missing-room"],
 ["Exeunt — Hotel Broadalbin","hotel"],["Introduction","reference"],
 ["Campaign navigation","reference"],["Whole campaign · sourcebook contents","reference"]
];
test("Chapter-based theme resolution has no dependency on current campaign state",()=>{
 for(const [h,t] of headings)assert.equal(journalActFromHeading(h),t,h);
});
test("Missing or malformed root is harmless",()=>{
 assert.equal(applyJournalActThemes(null),0);
 assert.equal(applyJournalActThemes({}),0);
});
