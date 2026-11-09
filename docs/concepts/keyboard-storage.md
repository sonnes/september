---
title: Keyboard storage (macOS)
description: Where the macOS keyboard keeps its data. Preferences are in UserDefaults, secrets in the Keychain, documents in Markdown files, and the records that the keyboard keeps or learns in keyboard.sqlite or in JSON files.
package: keyboard
---

# Keyboard Storage (macOS)

The keyboard keeps each kind of data in the store that fits its owner and its
sensitivity. All the files are in
`~/Library/Application Support/September Keyboard/`, except the Write
documents.

## The Stores

| Kind | Store | Data |
|---|---|---|
| A preference that the user sets | `UserDefaults` | The switches of the predictions, the look, Talk Return, the clipboard history, the sentence history, the app panels, the voice choice, and the places of the windows |
| A secret | Keychain | The ElevenLabs key (`com.september.keyboard`) and the text of each private button (`com.september.keyboard.private`) |
| A document of the user | Markdown files | The Write documents in `~/Documents/September/` |
| A definition that ships with the app | JSON in the bundle | Panels, accents, and context rules in `Sources/SeptemberKit/Resources/` |
| A record that the keyboard keeps or learns | `keyboard.sqlite` | The sentence history |
| A record that the keyboard keeps or learns | JSON files | The Said list (`talk-history.json`), the clipboard history (`clipboard-history.json`), the presses of the panel buttons (`usage.json`, `my-panel-usage.json`), the learned chords (`learned.json`), and the buttons of My Panel (`my-panel.json`) |

The JSON records move to `keyboard.sqlite` one store at a time. The plan is in
the `2026-11-09-sentence-history` change of the project.

## The Database

`KeyboardDatabase` opens `keyboard.sqlite` through the SQLite of macOS
(`import SQLite3`). The app has no third-party dependencies.

- Only the user can read the file (mode 0600).
- The journal mode is WAL, and foreign keys are on.
- `PRAGMA user_version` holds the schema version.
- `KeyboardDatabase.migrations` holds one SQL step for each version. Each step
  runs in one transaction with the new version number. A new table or column
  is a new step at the end. An old step never changes.
- If the file does not open or does not migrate, the keyboard moves it to
  `keyboard.broken.sqlite` and opens a new file. If no file opens, the
  database stays in memory.
- A `DatabaseValue` that holds text describes itself by its length only. A log
  or a test failure never prints the text.

The stores that own the database run on the main actor. A search reads one
index and returns in less than one millisecond.

## The Sentence History

`SentenceHistory` owns the `sentence` table.

```sql
CREATE TABLE sentence (
  id        INTEGER PRIMARY KEY,
  text      TEXT    NOT NULL,          -- as the user last wrote it
  key       TEXT    NOT NULL UNIQUE,   -- lowercased, one space between words
  uses      INTEGER NOT NULL DEFAULT 1,
  first_at  REAL    NOT NULL,          -- seconds since 1970
  last_at   REAL    NOT NULL
);
CREATE INDEX sentence_last_at ON sentence(last_at);
```

`record(_:)` splits a text into sentences with `NLTokenizer`. Each sentence
that holds a letter and has 500 characters or fewer gets a row. If the key of
the sentence is already in the table, its row gets one more use and the new
form of the text. After each record, the table keeps the 10,000 rows with the
newest `last_at`.

`matches(for:limit:)` takes the sentence that the user types at the end of the
text. The key of this sentence keeps one space at its end, so "I would " does
not find "I wouldn't". The query is a range on the unique index of `key`. The
history ranks the rows by their uses, and each use loses half its weight in 14
days. A sentence that the field already holds in full is not a match.

The switch is in `UserDefaults`, key `history.sentences`, and it is on by
default. When the user turns it off, the history removes every row and keeps
no new ones.

`PredictionEngine.submit(keepsSentences:)` is the only caller of `record(_:)`.
See [keyboard-session.md](keyboard-session.md).
