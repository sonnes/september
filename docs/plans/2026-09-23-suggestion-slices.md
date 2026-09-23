# Sentence Suggestions and Word Slices

History matching uses individual sentences from stored messages. Newer messages
retain priority, and duplicate sentences appear once.

Every suggestion row shows at most six unaccepted words. Punctuation does not
count toward the limit. A slice ends at a sentence boundary or after six words.
Short sentences and final slices can contain fewer words.

Word selection inserts text through the selected word. The next slice then
appears. An unfinished row ends with an insert action. The final slice offers
Speak, except for starters, which retain their insert action.

1. Add failing tests for sentence matching, slicing, continuation, and selection.
2. Update the shared stripe rules and suggestion component.
3. Update the module READMEs and saved-phrase concept document.
4. Run core tests and type checks, web tests/lint/build, and desktop tests/build.
