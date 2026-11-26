//! Writes each note as a Markdown file into the folder of the Write documents
//! of September Keyboard, `~/Documents/September`.
//!
//! The Write desk reads only the top of that folder, so the name of the space
//! goes into the file name. An export never writes over a file.

use std::{
    fs::{self, File, OpenOptions},
    io::{ErrorKind, Write},
    path::Path,
    time::{Duration, UNIX_EPOCH},
};

use serde::Serialize;

use crate::repository::{Note, Space};

/// What one export did.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct NoteExport {
    /// The number of files that the export made.
    pub count: usize,
    /// The folder of the files.
    pub folder: String,
}

/// Writes one file for each note into `folder`, and makes the folder when it
/// is missing.
pub fn export_notes(
    spaces: &[Space],
    notes: &[Note],
    folder: &Path,
) -> std::io::Result<NoteExport> {
    fs::create_dir_all(folder)?;
    for note in notes {
        let space = note
            .space_id
            .as_deref()
            .and_then(|id| spaces.iter().find(|space| space.id == id))
            .and_then(|space| space.title.as_deref())
            .map(clean)
            .filter(|title| !title.is_empty());
        let title = note_title(note);
        let stem = match space {
            Some(space) => format!("{space} - {title}"),
            None => title,
        };
        let mut file = create_free(folder, &stem)?;
        file.write_all(note.content.as_bytes())?;
        let modified = UNIX_EPOCH + Duration::from_millis(note.updated_at.max(0) as u64);
        file.set_modified(modified)?;
    }
    Ok(NoteExport {
        count: notes.len(),
        folder: folder.to_string_lossy().into_owned(),
    })
}

/// The longest title that the Write desk makes from a heading.
const MAX_TITLE_CHARS: usize = 100;
/// The number of words of a note that name it, as `noteNameFromContent` in
/// `packages/core/rules/notes.ts` does.
const NAME_WORDS: usize = 6;
const UNTITLED: &str = "Untitled";

/// The name of the note, or its first words when it has no name.
fn note_title(note: &Note) -> String {
    let name = note
        .name
        .as_deref()
        .map(clean)
        .filter(|name| !name.is_empty() && !name.eq_ignore_ascii_case("Untitled note"));
    name.unwrap_or_else(|| {
        let words = note
            .content
            .replace(['#', '*', '_', '>', '-', '`'], " ")
            .split_whitespace()
            .take(NAME_WORDS)
            .collect::<Vec<_>>()
            .join(" ");
        let words = clean(&words);
        if words.is_empty() {
            UNTITLED.to_owned()
        } else {
            words
        }
    })
}

/// A text made safe for a file name, by the rule of `DocumentLibrary.title`
/// of the keyboard: no slash, no colon, no leading dot, and 100 characters at
/// most.
fn clean(text: &str) -> String {
    let text = text.trim().replace(['/', ':'], "-");
    let text: String = text
        .trim_start_matches('.')
        .chars()
        .filter(|c| !c.is_control())
        .take(MAX_TITLE_CHARS)
        .collect();
    text.trim().to_owned()
}

/// Makes `<stem>.md`, or `<stem> 2.md` and up when the name is taken. The
/// file is new, so no text that is already in the folder changes.
fn create_free(folder: &Path, stem: &str) -> std::io::Result<File> {
    let mut number = 1;
    loop {
        let name = if number == 1 {
            format!("{stem}.md")
        } else {
            format!("{stem} {number}.md")
        };
        match OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(folder.join(name))
        {
            Err(error) if error.kind() == ErrorKind::AlreadyExists => number += 1,
            other => return other,
        }
    }
}

#[cfg(test)]
mod tests {
    use std::{fs, path::PathBuf, time::SystemTime};

    use super::*;

    fn folder() -> PathBuf {
        std::env::temp_dir().join(format!("september-export-{}", uuid::Uuid::new_v4()))
    }

    fn space(id: &str, title: Option<&str>) -> Space {
        Space {
            id: id.into(),
            user_id: "ravi".into(),
            title: title.map(Into::into),
            context: None,
            phrases_synced_count: None,
            created_at: 1,
            updated_at: 1,
        }
    }

    fn note(id: &str, space_id: Option<&str>, name: Option<&str>, content: &str) -> Note {
        Note {
            id: id.into(),
            space_id: space_id.map(Into::into),
            name: name.map(Into::into),
            content: content.into(),
            created_at: 1,
            updated_at: 1_700_000_000_000,
        }
    }

    fn read(folder: &Path, name: &str) -> String {
        fs::read_to_string(folder.join(name)).unwrap_or_else(|_| panic!("{name} is missing"))
    }

    fn names(folder: &Path) -> Vec<String> {
        let mut names: Vec<String> = fs::read_dir(folder)
            .unwrap()
            .map(|entry| entry.unwrap().file_name().to_string_lossy().into_owned())
            .collect();
        names.sort();
        names
    }

    #[test]
    fn each_note_becomes_one_markdown_file_named_from_its_space_and_title() {
        let folder = folder();
        let spaces = [space("s1", Some("Family"))];
        let notes = [
            note("n1", Some("s1"), Some("Shopping"), "# Shopping\n\n- milk"),
            note("n2", None, Some("Ideas"), "A loose note"),
        ];

        let export = export_notes(&spaces, &notes, &folder).unwrap();

        assert_eq!(export.count, 2);
        assert_eq!(export.folder, folder.to_string_lossy());
        assert_eq!(names(&folder), ["Family - Shopping.md", "Ideas.md"]);
        assert_eq!(
            read(&folder, "Family - Shopping.md"),
            "# Shopping\n\n- milk"
        );
        assert_eq!(read(&folder, "Ideas.md"), "A loose note");
    }

    #[test]
    fn an_existing_file_keeps_its_text_and_the_note_gets_a_number() {
        let folder = folder();
        fs::create_dir_all(&folder).unwrap();
        fs::write(folder.join("Ideas.md"), "Written in Write").unwrap();
        let notes = [
            note("n1", None, Some("Ideas"), "First"),
            note("n2", None, Some("Ideas"), "Second"),
        ];

        export_notes(&[], &notes, &folder).unwrap();

        assert_eq!(read(&folder, "Ideas.md"), "Written in Write");
        assert_eq!(read(&folder, "Ideas 2.md"), "First");
        assert_eq!(read(&folder, "Ideas 3.md"), "Second");
    }

    #[test]
    fn a_name_is_safe_for_a_file_and_a_missing_name_comes_from_the_words() {
        let folder = folder();
        let spaces = [space("s1", Some("Work/Home")), space("s2", None)];
        let notes = [
            note("n1", Some("s1"), Some("..Plan: today"), "x"),
            note(
                "n2",
                Some("s2"),
                None,
                "Call the nurse at five today please",
            ),
            note("n3", None, Some("   "), ""),
        ];

        export_notes(&spaces, &notes, &folder).unwrap();

        assert_eq!(
            names(&folder),
            [
                "Call the nurse at five today.md",
                "Untitled.md",
                "Work-Home - Plan- today.md",
            ]
        );
    }

    #[test]
    fn a_file_keeps_the_time_of_the_last_change_of_its_note() {
        let folder = folder();
        export_notes(&[], &[note("n1", None, Some("Ideas"), "x")], &folder).unwrap();

        let modified = fs::metadata(folder.join("Ideas.md"))
            .unwrap()
            .modified()
            .unwrap();
        let millis = modified
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_millis();
        assert_eq!(millis, 1_700_000_000_000);
    }
}
