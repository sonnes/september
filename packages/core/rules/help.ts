/** Platform-independent content and lookup rules for September Help. */

export type HelpPlatform = "browser" | "mac-app" | "mac-keyboard";

export interface HelpPlatformOption {
  key: HelpPlatform;
  label: string;
}

export const HELP_PLATFORMS: HelpPlatformOption[] = [
  { key: "browser", label: "Browser" },
  { key: "mac-app", label: "Mac app" },
  { key: "mac-keyboard", label: "Mac keyboard" },
];

export type HelpCategoryId =
  | "start-here"
  | "communicate-with-fewer-keystrokes"
  | "organize-conversations"
  | "choose-how-september-speaks-and-writes"
  | "use-september-on-a-mac"
  | "privacy-data-and-usage"
  | "fix-a-problem";

export interface HelpCategory {
  id: HelpCategoryId;
  title: string;
  summary: string;
}

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "start-here",
    title: "Start here",
    summary: "Set up September and speak a first message.",
  },
  {
    id: "communicate-with-fewer-keystrokes",
    title: "Communicate with fewer keystrokes",
    summary: "Use suggestions, saved phrases, and earlier messages.",
  },
  {
    id: "organize-conversations",
    title: "Organize conversations",
    summary: "Keep conversations and prepared writing in spaces.",
  },
  {
    id: "choose-how-september-speaks-and-writes",
    title: "Choose how September speaks and writes",
    summary: "Select a voice and optional writing service.",
  },
  {
    id: "use-september-on-a-mac",
    title: "Use September on a Mac",
    summary: "Use September in calls or as a floating keyboard.",
  },
  {
    id: "privacy-data-and-usage",
    title: "Privacy, data, and usage",
    summary: "See where data goes and how September measures use.",
  },
  {
    id: "fix-a-problem",
    title: "Fix a problem",
    summary: "Restore sound, suggestions, services, and Mac tools.",
  },
];

export interface HelpScreenshot {
  type: "screenshot";
  /** Action-oriented alternative text. */
  alt: string;
  /** An asset can be added later without changing the guide. */
  src?: string;
}

export interface HelpVideo {
  type: "video";
  title: string;
  /** The complete written fallback when the recording is missing or cannot play. */
  transcript: string;
  src?: string;
  captionsSrc?: string;
  posterSrc?: string;
}

export type HelpMedia = HelpScreenshot | HelpVideo;

export interface HelpGuide {
  slug: string;
  category: HelpCategoryId;
  title: string;
  summary: string;
  keywords: string[];
  platforms: HelpPlatform[];
  prerequisites: string[];
  steps: string[];
  expectedResult: string;
  recovery: string;
  related: string[];
  media?: HelpMedia[];
}

const BOTH_APPS: HelpPlatform[] = ["browser", "mac-app"];

export const HELP_GUIDES: HelpGuide[] = [
  {
    slug: "set-up-september",
    category: "start-here",
    title: "Set up September",
    summary: "Answer the setup questions so September can prepare your first space.",
    keywords: ["setup", "start", "onboarding", "name", "needs"],
    platforms: BOTH_APPS,
    prerequisites: [],
    steps: [
      "Open September.",
      "Answer each setup question.",
      "Choose Continue after each answer.",
      "Finish setup to open September.",
    ],
    expectedResult: "September opens with a General space ready for a message.",
    recovery: "If you need guidance before setup is complete, use the Help action on the setup screen.",
    related: ["speak-your-first-message", "choose-browser-or-mac-app"],
  },
  {
    slug: "speak-your-first-message",
    category: "start-here",
    title: "Speak your first message",
    summary: "Type a few letters, choose a suggestion, and say a complete message.",
    keywords: ["AAC", "talk", "say", "speech", "first message", "composer"],
    platforms: BOTH_APPS,
    prerequisites: ["Finish setup and open a space."],
    steps: [
      "Open a space in Talk mode.",
      "Type the first letters of what you want to say.",
      "Choose a suggestion to complete more of the message.",
      "Press Speak.",
    ],
    expectedResult: "September speaks the complete message and adds it to the conversation.",
    recovery: "If you hear nothing, open Fix missing sound.",
    related: ["learn-the-talk-screen", "use-word-and-sentence-suggestions", "fix-missing-sound"],
    media: [
      {
        type: "video",
        title: "Speak a first message",
        transcript:
          "Open a space in Talk mode. Type the first letters of your message. Choose a suggestion, then press Speak. September says the message and adds it to the conversation.",
      },
    ],
  },
  {
    slug: "learn-the-talk-screen",
    category: "start-here",
    title: "Learn the Talk screen",
    summary: "Find the conversation, suggestions, composer, Speak button, spaces, and mode switch.",
    keywords: ["layout", "screen", "composer", "dock", "panels", "controls"],
    platforms: BOTH_APPS,
    prerequisites: ["Open a space."],
    steps: [
      "Read earlier messages in the conversation area.",
      "Choose ready words or phrases above the composer.",
      "Write or edit your message in the composer.",
      "Use Speak to say the message.",
      "Use the dock to change spaces or switch between Talk and Notes.",
    ],
    expectedResult: "You can reach the main Talk controls without leaving the space.",
    recovery: "If a control does not fit, enlarge the window or scroll its panel into view.",
    related: ["speak-your-first-message", "create-and-switch-spaces", "prepare-a-note"],
    media: [
      {
        type: "screenshot",
        alt: "Talk screen showing suggestions above the composer, the Speak button, the General space, and the Talk and Notes switch.",
        src: "/help/talk-screen.png",
      },
    ],
  },
  {
    slug: "choose-browser-or-mac-app",
    category: "start-here",
    title: "Choose the browser or Mac app",
    summary: "Choose the version that has the device and privacy features you need.",
    keywords: ["web", "desktop", "difference", "compare", "Apple Intelligence"],
    platforms: BOTH_APPS,
    prerequisites: [],
    steps: [
      "Use the browser app when you want September in a web browser.",
      "Use the Mac app when you want Apple Intelligence or September call devices.",
      "Set up each app separately on the device where you use it.",
    ],
    expectedResult: "You open the September app that supports your current task.",
    recovery: "If a Mac-only option is unavailable in the browser, open the Mac app.",
    related: ["set-up-september", "understand-what-stays-on-the-device"],
  },

  {
    slug: "use-word-and-sentence-suggestions",
    category: "communicate-with-fewer-keystrokes",
    title: "Use word and sentence suggestions",
    summary: "Choose ready words and sentences instead of typing the whole message.",
    keywords: ["autocomplete", "prediction", "tiles", "sentence", "word"],
    platforms: BOTH_APPS,
    prerequisites: ["Open a space in Talk mode."],
    steps: [
      "Type the beginning of a word or sentence.",
      "Read the suggestions above the composer.",
      "Choose a suggestion that continues your thought.",
      "Repeat until the message is ready.",
    ],
    expectedResult: "The chosen words appear in the composer with fewer typed characters.",
    recovery: "If useful suggestions do not appear, open Restore missing suggestions.",
    related: ["use-phrase-codes", "restore-missing-suggestions", "tell-september-about-a-space"],
    media: [
      {
        type: "video",
        title: "Build a message with suggestions",
        transcript:
          "Type the start of a word. Choose a word tile to add it to the composer. Continue choosing words or a full sentence until the message is ready.",
      },
    ],
  },
  {
    slug: "save-a-phrase",
    category: "communicate-with-fewer-keystrokes",
    title: "Save a phrase",
    summary: "Keep a phrase in one space so it stays ready to use.",
    keywords: ["pin", "keep", "favorite", "repeat", "saved phrase"],
    platforms: BOTH_APPS,
    prerequisites: ["Open the space where you use the phrase."],
    steps: [
      "Open the Phrases panel.",
      "Enter the phrase you want to keep.",
      "Add an optional phrase code.",
      "Save the phrase.",
    ],
    expectedResult: "The phrase appears with the kept phrases for this space.",
    recovery: "If the phrase already exists, find its existing row and keep that row instead.",
    related: ["use-phrase-codes", "find-and-replay-an-earlier-message"],
  },
  {
    slug: "use-phrase-codes",
    category: "communicate-with-fewer-keystrokes",
    title: "Use phrase codes",
    summary: "Type a short code to bring a saved phrase to the top of the suggestions.",
    keywords: ["abbreviation", "shortcut", "code", "saved phrase", "letters"],
    platforms: BOTH_APPS,
    prerequisites: ["Save a phrase with a code of two to five letters."],
    steps: [
      "Open the space that holds the phrase.",
      "Type the phrase code in the composer.",
      "Choose the matching phrase from the suggestions.",
      "Use or edit the full phrase.",
    ],
    expectedResult: "The short code becomes the complete saved phrase.",
    recovery: "If no phrase appears, check the code in the Phrases panel and type it again.",
    related: ["save-a-phrase", "use-word-and-sentence-suggestions"],
    media: [
      {
        type: "video",
        title: "Expand a phrase code",
        transcript:
          "Type the short code assigned to a saved phrase. Choose the phrase when it rises to the top. The complete phrase replaces the short code.",
      },
    ],
  },
  {
    slug: "find-and-replay-an-earlier-message",
    category: "communicate-with-fewer-keystrokes",
    title: "Find and replay an earlier message",
    summary: "Reuse something you already said in the current space.",
    keywords: ["history", "past", "repeat", "replay", "message"],
    platforms: BOTH_APPS,
    prerequisites: ["Open a space with earlier messages."],
    steps: [
      "Start typing words from the earlier message.",
      "Find the past-message suggestion marked with a clock.",
      "Choose the suggestion to put it in the composer.",
      "Press Speak to say it again.",
    ],
    expectedResult: "September speaks the earlier message again.",
    recovery: "If the message does not appear, type more of its opening words or write it again.",
    related: ["use-word-and-sentence-suggestions", "save-a-phrase"],
  },

  {
    slug: "create-and-switch-spaces",
    category: "organize-conversations",
    title: "Create and switch spaces",
    summary: "Keep words for each person, place, or subject in its own space.",
    keywords: ["new space", "tabs", "person", "place", "subject", "switch"],
    platforms: BOTH_APPS,
    prerequisites: ["Finish setup."],
    steps: [
      "Open Spaces.",
      "Choose the add action to create a space.",
      "Describe who or what the space is for, or choose Skip.",
      "Use a space tab or the Spaces list to move between spaces.",
    ],
    expectedResult: "The selected space opens with its own messages, phrases, and notes.",
    recovery: "If a new space cannot be prepared, choose Open the space anyway and add details later.",
    related: ["tell-september-about-a-space", "prepare-a-note"],
    media: [
      {
        type: "screenshot",
        alt: "The Spaces list with the add action and a space row identified.",
      },
    ],
  },
  {
    slug: "tell-september-about-a-space",
    category: "organize-conversations",
    title: "Tell September about a space",
    summary: "Describe the conversation so suggestions and phrases fit the people in it.",
    keywords: ["about", "context", "description", "conversation", "personalize"],
    platforms: BOTH_APPS,
    prerequisites: ["Open the space you want to describe."],
    steps: [
      "Switch the space to Notes.",
      "Open About this space.",
      "Write who you speak to here and why.",
      "Leave the field to save the change.",
    ],
    expectedResult: "Future suggestions and phrases can use the description of this space.",
    recovery:
      "If writing help is off, keep the description. September can use it when writing help is available.",
    related: ["create-and-switch-spaces", "choose-writing-help", "restore-missing-suggestions"],
    media: [
      {
        type: "screenshot",
        alt: "A space in Notes mode with About this space selected and its description field visible.",
      },
    ],
  },
  {
    slug: "prepare-a-note",
    category: "organize-conversations",
    title: "Prepare a note",
    summary: "Write a prepared message now and keep it ready to read, present, or export.",
    keywords: ["long form", "draft", "letter", "speech", "document"],
    platforms: BOTH_APPS,
    prerequisites: ["Open the space that should hold the note."],
    steps: [
      "Switch the space to Notes.",
      "Create a note.",
      "Give the note a name.",
      "Write or paste its text.",
    ],
    expectedResult: "The note stays in this space and is ready to read, present, or export.",
    recovery: "If no note is selected, create one or choose an existing note tab.",
    related: ["read-or-present-a-note", "export-text-audio-or-video"],
  },
  {
    slug: "read-or-present-a-note",
    category: "organize-conversations",
    title: "Read or present a note",
    summary: "Read a whole note aloud or show it one clear chunk at a time.",
    keywords: ["presentation", "full screen", "read aloud", "stage", "chunks"],
    platforms: BOTH_APPS,
    prerequisites: ["Open a note that contains text."],
    steps: [
      "Choose Read aloud to hear the note without changing the conversation.",
      "Choose Present to open the full-screen stage.",
      "Choose a tone and whether September speaks.",
      "Move through the chunks or let spoken chunks advance.",
    ],
    expectedResult: "The note is heard or shown clearly without adding it as a Talk message.",
    recovery: "If speech is unavailable, turn speaking off and move through the written chunks.",
    related: ["prepare-a-note", "choose-and-preview-a-voice", "export-text-audio-or-video"],
    media: [
      {
        type: "video",
        title: "Present a note",
        transcript:
          "Open a note and choose Present. Select a tone and whether September speaks. The stage shows one readable chunk at a time and advances after each spoken chunk.",
      },
    ],
  },
  {
    slug: "export-text-audio-or-video",
    category: "organize-conversations",
    title: "Export text, audio, or video",
    summary: "Save a note as words, spoken audio, or a captioned video.",
    keywords: ["download", "file", "markdown", "MP3", "MP4", "captions"],
    platforms: BOTH_APPS,
    prerequisites: ["Open a note that contains text."],
    steps: [
      "Open the note export choices.",
      "Choose Text, Audio, or Video.",
      "Review any voice or platform requirement shown for that format.",
      "Choose Export and select where to save the file.",
    ],
    expectedResult: "September saves the note in the selected format.",
    recovery: "If audio or video is unavailable, connect ElevenLabs and choose one of its voices, or export text.",
    related: ["prepare-a-note", "read-or-present-a-note", "connect-openrouter-or-elevenlabs"],
    media: [
      {
        type: "screenshot",
        alt: "The note export choices for text, audio, and video with unavailable reasons shown beside formats that need setup.",
      },
    ],
  },

  {
    slug: "choose-and-preview-a-voice",
    category: "choose-how-september-speaks-and-writes",
    title: "Choose and preview a voice",
    summary: "Select the voice that speaks your messages and hear a preview first.",
    keywords: ["voice preview", "Try it", "system voice", "speech", "hear"],
    platforms: BOTH_APPS,
    prerequisites: [],
    steps: [
      "Open Voice.",
      "Choose the system voice or ElevenLabs.",
      "Choose a voice from the available list.",
      "Use the preview action to hear it.",
    ],
    expectedResult: "The chosen voice speaks future Talk messages and notes.",
    recovery: "If ElevenLabs voices do not load, reconnect the service or use the device voice.",
    related: ["clone-a-voice", "connect-openrouter-or-elevenlabs", "fix-missing-sound"],
    media: [
      {
        type: "screenshot",
        alt: "The Voice screen with the service choices, voice list, and preview action identified.",
      },
    ],
  },
  {
    slug: "clone-a-voice",
    category: "choose-how-september-speaks-and-writes",
    title: "Clone a voice",
    summary: "Create a personal ElevenLabs voice from clear recordings.",
    keywords: ["personal voice", "record", "upload", "sample", "ElevenLabs"],
    platforms: BOTH_APPS,
    prerequisites: ["Connect ElevenLabs before creating a voice."],
    steps: [
      "Open Voice and choose Clone your voice.",
      "Record or upload clear samples with only the voice you want to clone.",
      "Name the voice.",
      "Choose Create voice and keep September open until it finishes.",
    ],
    expectedResult: "September selects the new personal voice and returns to Voice.",
    recovery: "If creation fails, check the ElevenLabs connection and use clear samples smaller than the displayed limit.",
    related: ["choose-and-preview-a-voice", "connect-openrouter-or-elevenlabs"],
  },
  {
    slug: "choose-writing-help",
    category: "choose-how-september-speaks-and-writes",
    title: "Choose writing help",
    summary: "Select optional writing help for generated suggestions and phrases.",
    keywords: ["AI", "model", "Apple Intelligence", "OpenRouter", "none"],
    platforms: BOTH_APPS,
    prerequisites: [],
    steps: [
      "Open Settings.",
      "Open Writing help.",
      "Choose an available writing service or No writing help.",
      "Connect the service if September asks for a key.",
    ],
    expectedResult: "September uses the selected service for writing jobs that need a model.",
    recovery: "If a service is unavailable, choose another one; basic autocomplete still works without writing help.",
    related: ["connect-openrouter-or-elevenlabs", "understand-what-connected-services-receive"],
  },
  {
    slug: "connect-openrouter-or-elevenlabs",
    category: "choose-how-september-speaks-and-writes",
    title: "Connect OpenRouter or ElevenLabs",
    summary: "Store a service key so September can ask for writing or speech.",
    keywords: ["API key", "connection", "provider", "cloud", "credentials"],
    platforms: BOTH_APPS,
    prerequisites: ["Have an OpenRouter account or an ElevenLabs API key."],
    steps: [
      "Open Settings.",
      "Choose the OpenRouter or ElevenLabs connection.",
      "For OpenRouter, choose Connect OpenRouter and authorize September in your browser.",
      "For ElevenLabs, enter the API key and choose Connect.",
      "Wait for the connection check.",
    ],
    expectedResult: "September marks the service as connected and enables its available features.",
    recovery: "If the check fails, retry authorization for OpenRouter or check the ElevenLabs key.",
    related: ["choose-writing-help", "choose-and-preview-a-voice", "reconnect-a-service"],
  },

  {
    slug: "speak-into-facetime-or-zoom",
    category: "use-september-on-a-mac",
    title: "Speak into FaceTime or Zoom",
    summary: "Send September speech directly into a call through September Microphone.",
    keywords: ["call", "meeting", "virtual microphone", "audio input", "video call"],
    platforms: ["mac-app"],
    prerequisites: ["Use the September Mac app."],
    steps: [
      "Open Talk and open the audio selector beside Speak.",
      "Turn on September Microphone.",
      "Open the audio settings in FaceTime, Zoom, or the calling app.",
      "Choose September Microphone as the call microphone.",
      "Speak a message in September.",
    ],
    expectedResult: "Other people in the call hear the message from September.",
    recovery: "If the call receives no sound, reselect September Microphone in the calling app and keep September open.",
    related: ["restore-the-microphone"],
    media: [
      {
        type: "video",
        title: "Use September Microphone in a call",
        transcript:
          "In September Talk, open the audio selector and enable September Microphone. In the calling app, choose September Microphone as the input. Return to September and speak a message.",
      },
    ],
  },
  {
    slug: "set-up-the-floating-keyboard",
    category: "use-september-on-a-mac",
    title: "Set up the floating keyboard",
    summary: "Open the separate Mac keyboard and prepare it to type in other apps.",
    keywords: ["native keyboard", "Swift", "floating", "overlay", "install"],
    platforms: ["mac-keyboard"],
    prerequisites: ["Install and open the September floating keyboard."],
    steps: [
      "Open the September keyboard on your Mac.",
      "If the permission banner appears, choose Open Settings.",
      "Grant Accessibility permission when macOS asks.",
      "Return to the keyboard and choose a text field in another app.",
    ],
    expectedResult: "The keyboard stays available above other apps and can type into the active field.",
    recovery: "If it does not type, complete Grant Accessibility permission and reopen the keyboard.",
    related: ["grant-accessibility-permission", "make-the-floating-keyboard-type"],
  },
  {
    slug: "grant-accessibility-permission",
    category: "use-september-on-a-mac",
    title: "Grant Accessibility permission",
    summary: "Allow the floating keyboard to read the active field and send chosen keys.",
    keywords: ["macOS settings", "privacy", "security", "permission", "accessibility"],
    platforms: ["mac-keyboard"],
    prerequisites: ["Open the September floating keyboard at least once."],
    steps: [
      "Open System Settings on the Mac.",
      "Open Privacy & Security.",
      "Open Accessibility.",
      "Turn on permission for the September keyboard.",
      "Quit and reopen the keyboard if macOS asks.",
    ],
    expectedResult: "The keyboard can mirror and edit text in the active non-password field.",
    recovery: "If permission is already on but typing fails, turn it off and on again, then reopen the keyboard.",
    related: ["set-up-the-floating-keyboard", "make-the-floating-keyboard-type"],
    media: [
      {
        type: "screenshot",
        alt: "Numbered macOS System Settings screens leading from Privacy & Security to the September Accessibility switch.",
      },
    ],
  },
  {
    slug: "use-the-input-bar-and-shortcut-panels",
    category: "use-september-on-a-mac",
    title: "Use the input bar and shortcut panels",
    summary: "See the active field and use buttons prepared for the current Mac app.",
    keywords: ["mirror", "caret", "selection", "panel", "app shortcuts", "keys"],
    platforms: ["mac-keyboard"],
    prerequisites: ["Grant Accessibility permission to the floating keyboard."],
    steps: [
      "Choose a text field in another Mac app.",
      "Read the mirrored field text in the input bar.",
      "Use the keyboard to edit at the mirrored caret or selection.",
      "Choose a shortcut-panel button for the active app.",
    ],
    expectedResult: "The input bar follows the active field and the panel changes for the active app.",
    recovery: "Password fields stay hidden; for another field, refocus it or check Accessibility permission.",
    related: ["grant-accessibility-permission", "make-the-floating-keyboard-type"],
    media: [
      {
        type: "video",
        title: "Use the input bar and app panels",
        transcript:
          "Choose a text field in a Mac app. The input bar mirrors its words, caret, and selection. Switch apps to see the shortcut panel change, then choose a panel button.",
      },
    ],
  },

  {
    slug: "understand-what-stays-on-the-device",
    category: "privacy-data-and-usage",
    title: "Understand what stays on the device",
    summary: "Know where September stores settings, spaces, messages, notes, and service keys.",
    keywords: ["privacy", "storage", "IndexedDB", "SQLite", "Keychain", "local"],
    platforms: BOTH_APPS,
    prerequisites: [],
    steps: [
      "Use the browser app to keep September data in that browser's local database.",
      "Use the Mac app to keep September data in its local database.",
      "Keep the browser profile or Mac account protected like any other personal data store.",
    ],
    expectedResult: "You know which device and app profile hold your September data.",
    recovery: "If you change browsers, profiles, or devices, expect a separate September data store.",
    related: ["understand-what-connected-services-receive", "review-typing-saved-and-service-use"],
  },
  {
    slug: "understand-what-connected-services-receive",
    category: "privacy-data-and-usage",
    title: "Understand what connected services receive",
    summary: "Know when writing or speech text goes to a service you selected.",
    keywords: ["privacy", "cloud", "OpenRouter", "ElevenLabs", "data sharing", "API"],
    platforms: BOTH_APPS,
    prerequisites: ["Connect a cloud service only if you want to use it."],
    steps: [
      "Check Writing help to see which service September uses for writing jobs.",
      "Check Voice to see whether the device or ElevenLabs speaks.",
      "Choose No writing help, Apple Intelligence, or System voice for jobs you want kept on the device.",
    ],
    expectedResult: "You can identify and change the service for each optional job.",
    recovery: "If you no longer want a cloud connection, choose another service and remove its saved key in Settings.",
    related: ["choose-writing-help", "connect-openrouter-or-elevenlabs", "understand-what-stays-on-the-device"],
  },
  {
    slug: "back-up-or-restore-your-data",
    category: "privacy-data-and-usage",
    title: "Back up or restore your data",
    summary: "Download one private backup file or restore that file in either September app.",
    keywords: ["backup", "restore", "export", "import", "JSON", "move data", "copy"],
    platforms: BOTH_APPS,
    prerequisites: [],
    steps: [
      "Open Settings, then open Data.",
      "Choose Download backup to save your settings, spaces, messages, notes, saved phrases, and usage history.",
      "Keep the backup file private because it is not encrypted. API keys are not included.",
      "To restore a backup, choose Choose backup file and select a September JSON file.",
      "Review the export date and the number of records in the file.",
      "Choose Import and replace, then confirm the replacement.",
      "Wait while September replaces your current settings and data and reloads the app.",
    ],
    expectedResult: "September opens with the settings and data from the selected backup.",
    recovery: "If September rejects the file, your current data stays unchanged. Choose an unedited September backup and try again.",
    related: ["understand-what-stays-on-the-device", "review-typing-saved-and-service-use"],
  },
  {
    slug: "review-typing-saved-and-service-use",
    category: "privacy-data-and-usage",
    title: "Review typing saved and service use",
    summary: "See how many keystrokes September saved and how connected services were used.",
    keywords: ["usage", "statistics", "requests", "cost", "quota", "CSV", "90 days"],
    platforms: BOTH_APPS,
    prerequisites: [],
    steps: [
      "Open Settings.",
      "Open Usage.",
      "Choose the time range you want to review.",
      "Read typing saved, service use, quota, and recent calls.",
      "Download CSV when you need a copy.",
    ],
    expectedResult: "The Usage screen summarizes local events for the selected range.",
    recovery: "If the report is empty, use Talk or a connected service and return after an event is recorded.",
    related: ["understand-what-stays-on-the-device", "understand-what-connected-services-receive"],
  },

  {
    slug: "fix-missing-sound",
    category: "fix-a-problem",
    title: "Fix missing sound",
    summary: "Restore speech when Speak runs but you cannot hear the message.",
    keywords: ["silent", "audio", "speaker", "volume", "voice", "no sound"],
    platforms: BOTH_APPS,
    prerequisites: ["Keep a short test message in the Talk composer."],
    steps: [
      "Raise the device volume and check that it is not muted.",
      "In the Mac app, choose the intended output beside Speak.",
      "Open Voice and preview the selected voice.",
      "Use the device voice if a cloud voice does not play.",
      "Return to Talk and press Speak again.",
    ],
    expectedResult: "The preview and Talk message play through the intended output.",
    recovery: "If every app is silent, check the device sound settings; if only ElevenLabs fails, reconnect that service.",
    related: ["choose-and-preview-a-voice", "reconnect-a-service"],
  },
  {
    slug: "restore-missing-suggestions",
    category: "fix-a-problem",
    title: "Restore missing suggestions",
    summary: "Bring suggestion words and phrases back above the composer.",
    keywords: ["autocomplete", "blank", "prediction", "dictionary", "tiles"],
    platforms: BOTH_APPS,
    prerequisites: ["Open a space in Talk mode."],
    steps: [
      "Type at least one letter in the composer.",
      "Check that the suggestions area is visible above it.",
      "Open About this space and add a short description if it is empty.",
      "Return to Talk and type the beginning again.",
    ],
    expectedResult: "Word or phrase suggestions appear for the text you started.",
    recovery: "Basic dictionary suggestions do not need a writing service; close and reopen September if none appear.",
    related: ["use-word-and-sentence-suggestions", "tell-september-about-a-space"],
  },
  {
    slug: "reconnect-a-service",
    category: "fix-a-problem",
    title: "Reconnect a service",
    summary: "Replace an expired or incorrect OpenRouter or ElevenLabs key.",
    keywords: ["API key", "unauthorized", "connection", "provider", "credentials"],
    platforms: BOTH_APPS,
    prerequisites: ["Have access to your provider account."],
    steps: [
      "Open Settings.",
      "Open the connection that is failing.",
      "Disconnect the service, then connect it again.",
      "Authorize OpenRouter in your browser, or enter a current ElevenLabs key.",
      "Retry the writing or speech action.",
    ],
    expectedResult: "The connection reports that it is ready and the service action works.",
    recovery: "If the new key fails, check its account permissions and quota on the service website.",
    related: ["connect-openrouter-or-elevenlabs", "fix-missing-sound"],
  },
  {
    slug: "restore-the-microphone",
    category: "fix-a-problem",
    title: "Restore the microphone",
    summary: "Make September Microphone available to another Mac app again.",
    keywords: ["virtual microphone", "FaceTime", "Zoom", "input", "call"],
    platforms: ["mac-app"],
    prerequisites: ["Keep the September Mac app open."],
    steps: [
      "Open the Talk audio selector and check September Microphone.",
      "Turn on September Microphone.",
      "Quit and reopen the calling app.",
      "Choose September Microphone again in that app.",
      "Send a short test message from Talk.",
    ],
    expectedResult: "The calling app receives September speech.",
    recovery: "If the microphone remains absent, restart September and the calling app after confirming Audio Recording permission.",
    related: ["speak-into-facetime-or-zoom", "fix-missing-sound"],
  },
  {
    slug: "make-the-floating-keyboard-type",
    category: "fix-a-problem",
    title: "Make the floating keyboard type",
    summary: "Restore typing when the Mac keyboard is visible but the active app does not change.",
    keywords: ["keyboard", "not typing", "focus", "Accessibility", "field", "permission"],
    platforms: ["mac-keyboard"],
    prerequisites: ["Open the floating keyboard and the target app."],
    steps: [
      "Choose the target text field again.",
      "Check that the input bar shows the field text.",
      "Confirm Accessibility permission for the September keyboard.",
      "Quit and reopen the keyboard after changing permission.",
      "Choose one letter as a test.",
    ],
    expectedResult: "The test letter appears in the active field and in the input bar.",
    recovery: "Password fields cannot be mirrored; test a regular text field before reopening the target app.",
    related: ["grant-accessibility-permission", "use-the-input-bar-and-shortcut-panels"],
  },
  {
    slug: "get-more-help",
    category: "fix-a-problem",
    title: "Get more help",
    summary: "Collect the useful details before using September's support channel.",
    keywords: ["support", "contact", "report", "bug", "assistance"],
    platforms: ["browser", "mac-app", "mac-keyboard"],
    prerequisites: [],
    steps: [
      "Write down which September app and feature you were using.",
      "Record what you expected and what happened instead.",
      "Include the exact error message without including any service key.",
      "Use the support action shown at the bottom of Help when it is available.",
    ],
    expectedResult: "Your support request has enough detail to identify the problem.",
    recovery: "If no support destination is configured, keep these details and ask the person who supplied September.",
    related: ["fix-missing-sound", "restore-missing-suggestions", "reconnect-a-service"],
  },
];

export type HelpShortcutTarget =
  | { type: "guide"; slug: string }
  | { type: "category"; categoryId: HelpCategoryId };

export interface HelpHomeShortcut {
  title: string;
  summary: string;
  target: HelpShortcutTarget;
}

export const HELP_HOME_SHORTCUTS: HelpHomeShortcut[] = [
  {
    title: "Speak your first message",
    summary: "Type a few letters and say a complete thought.",
    target: { type: "guide", slug: "speak-your-first-message" },
  },
  {
    title: "Fix a problem",
    summary: "Restore sound, suggestions, a service, or a Mac tool.",
    target: { type: "category", categoryId: "fix-a-problem" },
  },
  {
    title: "Use September in a call",
    summary: "Send September's voice into FaceTime, Zoom, or another Mac app.",
    target: { type: "guide", slug: "speak-into-facetime-or-zoom" },
  },
];

const GUIDE_BY_SLUG = new Map(HELP_GUIDES.map((guide) => [guide.slug, guide]));

/** Finds one guide for its stable route slug. */
export function helpGuide(slug: string): HelpGuide | undefined {
  return GUIDE_BY_SLUG.get(slug);
}

export interface HelpGuideGroup {
  category: HelpCategory;
  guides: HelpGuide[];
}

/** Groups guides in the order chosen for the Help home. */
export function groupHelpGuides(guides: HelpGuide[] = HELP_GUIDES): HelpGuideGroup[] {
  return HELP_CATEGORIES.map((category) => ({
    category,
    guides: guides.filter((guide) => guide.category === category.id),
  })).filter((group) => group.guides.length > 0);
}

function searchText(guide: HelpGuide): string {
  return [guide.title, guide.summary, ...guide.keywords, ...guide.steps]
    .join(" ")
    .toLocaleLowerCase();
}

/** Finds guides containing every query word and preserves catalog order. */
export function searchHelpGuides(
  query: string,
  guides: HelpGuide[] = HELP_GUIDES,
): HelpGuide[] {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return guides;

  return guides.filter((guide) => {
    const searchable = searchText(guide);
    return words.every((word) => searchable.includes(word));
  });
}
