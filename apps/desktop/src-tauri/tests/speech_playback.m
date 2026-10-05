#import <AVFoundation/AVFoundation.h>
#import <CoreAudio/CoreAudio.h>
#import <objc/runtime.h>
#include <assert.h>
#include <stdint.h>
#include <stdio.h>

extern int64_t september_speech_claim(void);
extern void september_speech_stop(void);
extern int32_t september_speech_file(int64_t, const char *, const char *, char *,
                                     uintptr_t);
extern int64_t september_speech_stream_begin(int64_t, double, const char *,
                                             char *, uintptr_t);

static NSString *SilentFile(void);

static AVAudioEngine *playedEngine;

/// Records the engine of the node and plays nothing, so a sentence waits
/// until a stop or a changed output ends it.
static void HoldPlay(id node, SEL selector) {
  (void)selector;
  @synchronized([AVAudioPlayerNode class]) {
    playedEngine = [node engine];
  }
}

/// Plays one file with a held player. `then` runs once the file waits on its
/// engine. The result is the status of the file and the engine it used.
static int32_t PlayHeld(NSString *output, void (^then)(AVAudioEngine *),
                        AVAudioEngine **used) {
  Method play =
      class_getInstanceMethod([AVAudioPlayerNode class], @selector(play));
  IMP original = method_setImplementation(play, (IMP)HoldPlay);
  @synchronized([AVAudioPlayerNode class]) {
    playedEngine = nil;
  }

  NSString *path = SilentFile();
  __block int32_t status = 1;
  dispatch_semaphore_t done = dispatch_semaphore_create(0);
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_DEFAULT, 0), ^{
    char error[512] = {0};
    status = september_speech_file(september_speech_claim(), path.UTF8String,
                                   output.UTF8String, error, sizeof(error));
    dispatch_semaphore_signal(done);
  });

  AVAudioEngine *engine = nil;
  while (engine == nil) {
    @synchronized([AVAudioPlayerNode class]) {
      engine = playedEngine;
    }
    usleep(1000);
  }
  then(engine);
  dispatch_semaphore_wait(done, DISPATCH_TIME_FOREVER);

  method_setImplementation(play, original);
  [[NSFileManager defaultManager] removeItemAtPath:path error:nil];
  *used = engine;
  return status;
}

static void Stop(AVAudioEngine *engine) {
  (void)engine;
  september_speech_stop();
}

/// Another output of this Mac than `output`, or nil.
static NSString *OtherOutput(NSString *output) {
  AudioObjectPropertyAddress address = {kAudioHardwarePropertyDevices,
                                        kAudioObjectPropertyScopeGlobal,
                                        kAudioObjectPropertyElementMain};
  UInt32 size = 0;
  AudioObjectGetPropertyDataSize(kAudioObjectSystemObject, &address, 0, NULL,
                                 &size);
  AudioObjectID devices[64];
  size = MIN(size, (UInt32)sizeof(devices));
  AudioObjectGetPropertyData(kAudioObjectSystemObject, &address, 0, NULL, &size,
                             devices);
  for (UInt32 index = 0; index < size / sizeof(AudioObjectID); index++) {
    AudioObjectPropertyAddress streams = {kAudioDevicePropertyStreams,
                                          kAudioObjectPropertyScopeOutput,
                                          kAudioObjectPropertyElementMain};
    UInt32 streamSize = 0;
    if (AudioObjectGetPropertyDataSize(devices[index], &streams, 0, NULL,
                                       &streamSize) != noErr ||
        streamSize == 0) {
      continue;
    }
    AudioObjectPropertyAddress uidAddress = {kAudioDevicePropertyDeviceUID,
                                             kAudioObjectPropertyScopeGlobal,
                                             kAudioObjectPropertyElementMain};
    CFStringRef uid = NULL;
    UInt32 uidSize = sizeof(uid);
    if (AudioObjectGetPropertyData(devices[index], &uidAddress, 0, NULL,
                                   &uidSize, &uid) != noErr) {
      continue;
    }
    NSString *found = CFBridgingRelease(uid);
    if (![found isEqualToString:output]) {
      return found;
    }
  }
  return nil;
}

static NSString *DefaultOutput(void) {
  AudioObjectPropertyAddress address = {kAudioHardwarePropertyDefaultOutputDevice,
                                        kAudioObjectPropertyScopeGlobal,
                                        kAudioObjectPropertyElementMain};
  AudioObjectID device = kAudioObjectUnknown;
  UInt32 size = sizeof(device);
  assert(AudioObjectGetPropertyData(kAudioObjectSystemObject, &address, 0, NULL,
                                    &size, &device) == noErr);
  address.mSelector = kAudioDevicePropertyDeviceUID;
  CFStringRef uid = NULL;
  size = sizeof(uid);
  assert(AudioObjectGetPropertyData(device, &address, 0, NULL, &size, &uid) ==
         noErr);
  return CFBridgingRelease(uid);
}

static NSString *SilentFile(void) {
  NSString *path = [NSTemporaryDirectory()
      stringByAppendingPathComponent:[NSUUID UUID].UUIDString];
  path = [path stringByAppendingPathExtension:@"wav"];
  AVAudioFormat *format =
      [[AVAudioFormat alloc] initStandardFormatWithSampleRate:24000 channels:1];
  NSError *error = nil;
  AVAudioFile *file =
      [[AVAudioFile alloc] initForWriting:[NSURL fileURLWithPath:path]
                                 settings:format.settings
                                    error:&error];
  assert(file != nil);
  AVAudioPCMBuffer *buffer =
      [[AVAudioPCMBuffer alloc] initWithPCMFormat:format frameCapacity:2400];
  buffer.frameLength = 2400;
  assert([file writeFromBuffer:buffer error:&error]);
  return path;
}

static void AStoppedSentenceDoesNotPlay(NSString *output) {
  char error[512] = {0};
  int64_t sentence = september_speech_claim();
  september_speech_stop();

  // The path does not exist, so only a refusal before the file opens gives 0.
  assert(september_speech_file(sentence, "/nonexistent/stopped.mp3",
                               output.UTF8String, error, sizeof(error)) == 0);
  assert(september_speech_stream_begin(sentence, 24000, output.UTF8String,
                                       error, sizeof(error)) == 0);
}

static void AnOlderSentenceDoesNotPlay(NSString *output) {
  char error[512] = {0};
  int64_t older = september_speech_claim();
  (void)september_speech_claim();

  assert(september_speech_file(older, "/nonexistent/older.mp3",
                               output.UTF8String, error, sizeof(error)) == 0);
}

static void AnUnreadableFileSaysSo(NSString *output) {
  char error[512] = {0};
  NSString *path = [NSTemporaryDirectory()
      stringByAppendingPathComponent:[NSUUID UUID].UUIDString];
  path = [path stringByAppendingPathExtension:@"mp3"];
  [@"not audio" writeToFile:path
                 atomically:YES
                   encoding:NSUTF8StringEncoding
                      error:nil];

  assert(september_speech_file(september_speech_claim(), path.UTF8String,
                               output.UTF8String, error, sizeof(error)) == -3);
  assert(error[0] != '\0');
  [[NSFileManager defaultManager] removeItemAtPath:path error:nil];
}

/// The engine plays only output. The default input of this Mac can be any
/// device, and a broken one must not stop the sound.
static void AFilePlaysOnTheOutput(NSString *output) {
  NSString *path = SilentFile();
  char error[512] = {0};
  int32_t played = september_speech_file(september_speech_claim(), path.UTF8String,
                                         output.UTF8String, error, sizeof(error));
  if (played != 0) {
    fprintf(stderr, "the file did not play: %s\n", error);
  }
  assert(played == 0);
  [[NSFileManager defaultManager] removeItemAtPath:path error:nil];
}

static void AChangedOutputEndsTheFile(NSString *output) {
  AVAudioEngine *used = nil;
  // The held player never plays the file, so only the change ends the wait.
  int32_t status = PlayHeld(output, ^(AVAudioEngine *engine) {
    [[NSNotificationCenter defaultCenter]
        postNotificationName:AVAudioEngineConfigurationChangeNotification
                      object:engine];
  }, &used);
  assert(status == -2);
}

static void ASecondSentenceUsesTheSameEngine(NSString *output) {
  AVAudioEngine *first = nil;
  AVAudioEngine *second = nil;
  assert(PlayHeld(output, ^(AVAudioEngine *engine) { Stop(engine); }, &first) == 0);
  assert(PlayHeld(output, ^(AVAudioEngine *engine) { Stop(engine); }, &second) == 0);
  assert(first == second);
}

static void AnotherOutputGetsItsOwnEngine(NSString *output) {
  NSString *other = OtherOutput(output);
  if (other == nil) {
    fprintf(stderr, "skipped: this Mac has one output\n");
    return;
  }
  AVAudioEngine *first = nil;
  AVAudioEngine *second = nil;
  assert(PlayHeld(output, ^(AVAudioEngine *engine) { Stop(engine); }, &first) == 0);
  assert(PlayHeld(other, ^(AVAudioEngine *engine) { Stop(engine); }, &second) == 0);
  assert(first != second);
}

int main(void) {
  @autoreleasepool {
    NSString *output = DefaultOutput();
    AStoppedSentenceDoesNotPlay(output);
    AnOlderSentenceDoesNotPlay(output);
    AnUnreadableFileSaysSo(output);
    AFilePlaysOnTheOutput(output);
    AChangedOutputEndsTheFile(output);
    ASecondSentenceUsesTheSameEngine(output);
    AnotherOutputGetsItsOwnEngine(output);
  }
  return 0;
}
