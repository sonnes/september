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
| A record that the keyboard keeps or learns | `keyboard.sqlite` | The sentence history, the Said list of Talk mode, and the clipboard history |
| A record that the keyboard keeps or learns | JSON files | The presses of the buttons of My Panel (`my-panel-usage.json`) and the buttons of My Panel (`my-panel.json`) |

The two JSON stores of My Panel move to `keyboard.sqlite` in later changes.

## The Database

`KeyboardDatabase` opens `keyboard.sqlite` through the SQLite of macOS
(`import SQLite3`). The app has no third-party dependencies.

- Only the user can read the file and its `-wal` and `-shm` files (mode
  0600). The file gets mode 0600 before SQLite opens it, because SQLite gives
  the `-wal` and `-shm` files the mode of the database file.
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

`AppDelegate` opens one `KeyboardDatabase` at launch and gives it to each
store. A store that gets no database uses a database in memory. The snapshots
and most tests use this database.

The stores that own the database run on the main actor. A search reads one
index and returns in less than one millisecond.

## The JSON Files of Older Versions

Older versions of the keyboard kept the Said list in `talk-history.json` and
the clipboard history in `clipboard-history.json`. At launch, each store moves
the rows of its file into its table with `KeyboardDatabase.importJSON`:

1. The store decodes the file.
2. The store inserts the rows in one transaction. A row that is already in
   the table stays as it is.
3. After the commit, the store removes the file.

If the file does not decode, it moves to `<name>.broken.json`, and the table
gets no rows. If the transaction fails, the file stays, and the next launch
tries again. A second import of the same file changes nothing, because the
insert ignores the rows that are already in the table.

The import is not a step of `KeyboardDatabase.migrations`. The steps hold SQL
only, and they do not know the file formats of the stores.

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

## The Said List

`SaidList` owns the `talk_line` table. Each row is one line that the user
spoke in Talk mode. A line can hold more than one sentence.

```sql
CREATE TABLE talk_line (
  id       TEXT PRIMARY KEY,           -- the UUID of SaidLine
  text     TEXT NOT NULL,
  said_at  REAL NOT NULL               -- seconds since 1970
);
CREATE INDEX talk_line_said_at ON talk_line(said_at);
```

The list keeps the lines of the last 30 days, and 1,000 lines at most. It
removes the other rows at launch and after each new line. `lines` holds the
rows in memory, newest first, so the views do not read the database.
`clear()` removes every row.

`talk_line` and `sentence` are separate tables. `talk_line` is a log of what
the user said, and when. `sentence` holds the sentences that the user uses,
and how often.

## The Clipboard History

`ClipboardHistory` owns the `clip` table. Each row is one text that the user
copied.

```sql
CREATE TABLE clip (
  id         TEXT PRIMARY KEY,         -- the UUID of ClipboardItem
  text       TEXT NOT NULL UNIQUE,
  copied_at  REAL NOT NULL             -- seconds since 1970
);
CREATE INDEX clip_copied_at ON clip(copied_at);
```

The history keeps the texts of the last 7 days, and 200 texts at most. It
removes the other rows at launch and after each new copy. A copy of a text
that is already in the table replaces its row, so the text gets a new ID and
moves to the newest place. `items` holds the rows in memory, newest first.

The switch is in `UserDefaults`, key `clipboardHistoryEnabled`, and it is on
by default. When the user turns it off, the history removes every row and
keeps no new copies.
