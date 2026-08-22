import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  MAX_VOICE_CLONE_BYTES,
  MAX_VOICE_SAMPLE_BYTES,
  MediaRecorderManager,
  SamplePlayer,
  encodeVoiceClone,
  keepCreatedVoice,
  recentCreatedVoice,
  recordingFile,
  rememberCreatedVoice,
  validateVoiceCloneBytes,
  validateVoiceClone,
} from "../src/services/cloning.ts";

test("a clone becomes one multipart request with every sample", async () => {
  const upload = new File([new Uint8Array([1, 2])], "upload.mp3", {
    type: "audio/mpeg",
  });
  const recording = new File([new Uint8Array([3, 4])], "prompt.m4a", {
    type: "audio/mp4",
  });

  const encoded = await encodeVoiceClone({
    files: [upload, recording],
    name: "  My voice  ",
    description: "Calm and clear",
  });

  assert.match(encoded.contentType, /^multipart\/form-data; boundary=/);
  const body = Buffer.from(encoded.bytes).toString("utf8");
  assert.match(body, /name="files"; filename="upload\.mp3"/);
  assert.match(body, /name="files"; filename="prompt\.m4a"/);
  assert.match(body, /name="name"\r\n\r\nMy voice/);
  assert.match(body, /name="description"\r\n\r\nCalm and clear/);
  assert.match(body, /name="labels"\r\n\r\n\{"app":"september"\}/);
});

test("clone validation keeps bad input away from the provider", () => {
  const audio = new File([new Uint8Array([1])], "voice.wav", {
    type: "audio/wav",
  });
  const text = new File([new Uint8Array([1])], "notes.txt", {
    type: "text/plain",
  });
  const tooLarge = {
    name: "large.wav",
    type: "audio/wav",
    size: MAX_VOICE_SAMPLE_BYTES + 1,
  };

  assert.equal(validateVoiceClone({ files: [], name: "Voice" }), "Add at least one voice sample.");
  assert.equal(validateVoiceClone({ files: [audio], name: "   " }), "Give this voice a name.");
  assert.equal(validateVoiceClone({ files: [text], name: "Voice" }), "notes.txt is not an audio file.");
  assert.equal(
    validateVoiceClone({ files: [tooLarge], name: "Voice" }),
    "large.wav is larger than 25 MB.",
  );
  assert.equal(validateVoiceClone({ files: [audio], name: "Voice" }), null);
});

test("the encoded clone cannot exceed the native request limit", () => {
  assert.equal(validateVoiceCloneBytes(MAX_VOICE_CLONE_BYTES), null);
  assert.equal(
    validateVoiceCloneBytes(MAX_VOICE_CLONE_BYTES + 1),
    "Voice samples are larger than 100 MB in total.",
  );
});

test("a recording file keeps the recorder's real media type", () => {
  const file = recordingFile("birch-canoe", new Blob([new Uint8Array([1])], {
    type: "audio/mp4",
  }));

  assert.equal(file.name, "birch-canoe.m4a");
  assert.equal(file.type, "audio/mp4");
});

test("a stale account refresh cannot hide the voice that was just created", () => {
  const created = { id: "new", name: "My voice", preview_url: null };
  const old = { id: "old", name: "Old voice", preview_url: "https://example.com/old.mp3" };

  assert.deepEqual(keepCreatedVoice([old], created), [created, old]);
  assert.deepEqual(keepCreatedVoice([created, old], created), [created, old]);
  assert.deepEqual(keepCreatedVoice([old], null), [old]);
});

test("the Voice page can remember the clone made on its subpage", () => {
  rememberCreatedVoice({ id: "new", name: "My voice" });
  assert.deepEqual(recentCreatedVoice(), { id: "new", name: "My voice" });
});

test("starting another recording stops the old microphone and stopAll stops the new one", async () => {
  const originalNavigator = globalThis.navigator;
  const originalRecorder = globalThis.MediaRecorder;
  const streams = [];
  const completed = [];

  class FakeMediaRecorder {
    static isTypeSupported(type) {
      return type === "audio/mp4";
    }

    state = "inactive";
    mimeType;
    ondataavailable = null;
    onstop = null;
    onerror = null;

    constructor(_stream, options = {}) {
      this.mimeType = options.mimeType ?? "audio/mp4";
    }

    start() {
      this.state = "recording";
    }

    stop() {
      if (this.state === "inactive") return;
      this.state = "inactive";
      this.ondataavailable?.({ data: new Blob([new Uint8Array([1])], { type: this.mimeType }) });
      this.onstop?.();
    }
  }

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: async () => {
          const track = { stopped: false, stop() { this.stopped = true; } };
          const stream = { track, getTracks: () => [track] };
          streams.push(stream);
          return stream;
        },
      },
    },
  });
  globalThis.MediaRecorder = FakeMediaRecorder;

  try {
    const manager = new MediaRecorderManager({
      onComplete: (id, blob) => completed.push([id, blob]),
    });

    await manager.start("first");
    await manager.start("second");
    assert.equal(streams[0].track.stopped, true);
    assert.equal(completed[0][0], "first");
    assert.equal(completed[0][1].type, "audio/mp4");

    manager.stopAll();
    assert.equal(streams[1].track.stopped, true);
  } finally {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: originalNavigator,
    });
    globalThis.MediaRecorder = originalRecorder;
  }
});

test("a newer recording cancels a microphone request that is still pending", async () => {
  const originalNavigator = globalThis.navigator;
  const originalRecorder = globalThis.MediaRecorder;
  const pending = [];

  class FakeMediaRecorder {
    static isTypeSupported() {
      return true;
    }

    state = "inactive";
    mimeType = "audio/mp4";
    ondataavailable = null;
    onstop = null;
    onerror = null;

    start() {
      this.state = "recording";
    }

    stop() {
      this.state = "inactive";
      this.onstop?.();
    }
  }

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: () => new Promise((resolve) => pending.push(resolve)),
      },
    },
  });
  globalThis.MediaRecorder = FakeMediaRecorder;

  try {
    const first = { track: { stopped: false, stop() { this.stopped = true; } } };
    const second = { track: { stopped: false, stop() { this.stopped = true; } } };
    const manager = new MediaRecorderManager();
    const firstStart = manager.start("first");
    const secondStart = manager.start("second");

    pending[0]({ getTracks: () => [first.track] });
    await firstStart;
    assert.equal(first.track.stopped, true);

    pending[1]({ getTracks: () => [second.track] });
    await secondStart;
    manager.stopAll();
    assert.equal(second.track.stopped, true);
  } finally {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: originalNavigator,
    });
    globalThis.MediaRecorder = originalRecorder;
  }
});

test("recorder setup failure releases the microphone and reports the error", async () => {
  const originalNavigator = globalThis.navigator;
  const originalRecorder = globalThis.MediaRecorder;
  const track = { stopped: false, stop() { this.stopped = true; } };
  const statuses = [];
  const errors = [];

  class BrokenMediaRecorder {
    static isTypeSupported() {
      throw new Error("Recorder unavailable");
    }
  }

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: async () => ({ getTracks: () => [track] }),
      },
    },
  });
  globalThis.MediaRecorder = BrokenMediaRecorder;

  try {
    const manager = new MediaRecorderManager({
      onStatus: (id, status) => statuses.push([id, status]),
      onError: (id, message) => errors.push([id, message]),
    });

    await manager.start("sample");

    assert.equal(track.stopped, true);
    assert.deepEqual(statuses, [["sample", "error"]]);
    assert.deepEqual(errors, [["sample", "Recorder unavailable"]]);
  } finally {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: originalNavigator,
    });
    globalThis.MediaRecorder = originalRecorder;
  }
});

test("sample playback revokes its object URL when it stops", async () => {
  const originalAudio = globalThis.Audio;
  const create = URL.createObjectURL;
  const revoke = URL.revokeObjectURL;
  const revoked = [];

  class FakeAudio {
    currentTime = 0;
    onended = null;
    onerror = null;
    pause() {}
    async play() {}
  }

  globalThis.Audio = FakeAudio;
  URL.createObjectURL = () => "blob:sample";
  URL.revokeObjectURL = (url) => revoked.push(url);

  try {
    const player = new SamplePlayer();
    await player.play("sample", new Blob([new Uint8Array([1])], { type: "audio/mp4" }));
    player.stop();
    assert.deepEqual(revoked, ["blob:sample"]);
  } finally {
    globalThis.Audio = originalAudio;
    URL.createObjectURL = create;
    URL.revokeObjectURL = revoke;
  }
});

test("a stopped sample cannot report itself playing after play resolves", async () => {
  const originalAudio = globalThis.Audio;
  const create = URL.createObjectURL;
  const revoke = URL.revokeObjectURL;
  let release;

  class SlowAudio {
    currentTime = 0;
    onended = null;
    onerror = null;
    pause() {}
    play() {
      return new Promise((resolve) => {
        release = resolve;
      });
    }
  }

  globalThis.Audio = SlowAudio;
  URL.createObjectURL = () => "blob:slow";
  URL.revokeObjectURL = () => undefined;

  try {
    const player = new SamplePlayer();
    const playing = player.play("sample", new Blob([new Uint8Array([1])]));
    player.stop();
    release();
    assert.equal(await playing, false);
  } finally {
    globalThis.Audio = originalAudio;
    URL.createObjectURL = create;
    URL.revokeObjectURL = revoke;
  }
});

test("voice cloning is a dedicated subpage that selects the result", async () => {
  const voice = await readFile(
    new URL("../src/pages/voice.tsx", import.meta.url),
    "utf8",
  );
  const main = await readFile(
    new URL("../src/main.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(voice, /<Sheet\b/);
  assert.match(main, /path: "\/voice\/clone"[\s\S]*component: VoiceCloneScreen/);
  assert.match(voice, /export function VoiceCloneScreen/);
  assert.match(voice, /to="\/voice\/clone"/);
  assert.match(voice, /Clone your voice/);
  assert.match(voice, /<input[\s\S]*type="file"/);
  assert.match(voice, /onClick=\{\(\) => inputRef\.current\?\.click\(\)\}/);
  assert.doesNotMatch(voice, /<Button asChild type="button"[\s\S]*?<label/);
  assert.match(voice, /new MediaRecorderManager/);
  assert.match(voice, /cloneVoice\(/);
  assert.match(voice, /provider:\s*"elevenlabs",[\s\S]*voiceId:\s*created\.id/);
  assert.match(voice, /navigate\(\{ to: "\/voice"/);
});
