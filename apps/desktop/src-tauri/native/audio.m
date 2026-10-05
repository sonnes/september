#import <AVFoundation/AVFoundation.h>
#import <AudioToolbox/AudioToolbox.h>
#import <CoreAudio/AudioHardwareTapping.h>
#import <CoreAudio/CATapDescription.h>
#import <CoreAudio/CoreAudio.h>
#import <Foundation/Foundation.h>

#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static const char *SeptemberMicrophoneUID =
    "app.september.desktop.virtual-microphone";

static AudioObjectID SeptemberTapID = kAudioObjectUnknown;
static AudioObjectID SeptemberAggregateID = kAudioObjectUnknown;
static AVAudioEngine *SeptemberKeepaliveEngine = nil;
static AVAudioEngine *SeptemberSpeechEngine = nil;
static AVAudioPlayerNode *SeptemberSpeechNode = nil;
static AVSpeechSynthesizer *SeptemberSynthesizer = nil;

/// Waits for one voice to finish, and lets a stop end the wait at once.
@interface SeptemberSpeechRun : NSObject
@property(nonatomic, strong) dispatch_semaphore_t done;
@property(atomic) BOOL cancelled;
@property(nonatomic, copy) NSString *error;
@property(nonatomic) NSInteger pendingBuffers;
@property(nonatomic) BOOL synthesisFinished;
@property(nonatomic) BOOL finished;
/// The sound began, then the output changed under it.
@property(atomic) BOOL interrupted;
/// The watch on the engine for a changed output.
@property(nonatomic, strong) id observer;
- (void)finish;
- (void)cancel;
- (void)fail:(NSString *)message;
- (void)scheduledBuffer;
- (void)playedBuffer;
- (void)finishedSynthesis;
@end

@implementation SeptemberSpeechRun

- (instancetype)init {
  self = [super init];
  if (self != nil) {
    _done = dispatch_semaphore_create(0);
  }
  return self;
}

- (void)finish {
  @synchronized(self) {
    if (self.finished) {
      return;
    }
    self.finished = YES;
    dispatch_semaphore_signal(self.done);
  }
}

- (void)cancel {
  self.cancelled = YES;
  [self finish];
}

- (void)fail:(NSString *)message {
  @synchronized(self) {
    if (self.error == nil) {
      self.error = message;
    }
  }
  [self finish];
}

- (void)interrupt:(NSString *)message {
  self.interrupted = YES;
  [self fail:message];
}

- (void)scheduledBuffer {
  @synchronized(self) {
    self.pendingBuffers += 1;
  }
}

- (void)playedBuffer {
  BOOL complete = NO;
  @synchronized(self) {
    self.pendingBuffers -= 1;
    complete = self.synthesisFinished && self.pendingBuffers == 0;
  }
  if (complete) {
    [self finish];
  }
}

- (void)finishedSynthesis {
  BOOL complete = NO;
  @synchronized(self) {
    self.synthesisFinished = YES;
    complete = self.pendingBuffers == 0;
  }
  if (complete) {
    [self finish];
  }
}

@end

static SeptemberSpeechRun *SeptemberRun = nil;
/// The number of the open stream, or 0. A late call from a stopped stream
/// carries an old number, so it cannot touch a newer sentence.
static int64_t SeptemberStreamActive = 0;
static int64_t SeptemberStreamCount = 0;
/// The number of the sentence that may play. A stop or a new sentence raises
/// it, so a sentence that was about to play when a stop came stays silent.
static int64_t SeptemberSentence = 0;

/// The lock for the process tap and its aggregate device.
static NSObject *SeptemberDeviceLock(void) {
  static NSObject *lock;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    lock = [NSObject new];
  });
  return lock;
}

/// The lock for the two voices of September.
static NSObject *SeptemberSpeechLock(void) {
  static NSObject *lock;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    lock = [NSObject new];
  });
  return lock;
}

static NSString *AudioKey(const char *key) {
  return [NSString stringWithUTF8String:key];
}

static void WriteError(char *buffer, uintptr_t capacity, NSString *message) {
  if (buffer == NULL || capacity == 0) {
    return;
  }

  const char *text = message.UTF8String ?: "the sound system did not answer";
  snprintf(buffer, capacity, "%s", text);
}

static int32_t WriteStatus(char *buffer, uintptr_t capacity, NSString *action,
                           OSStatus status) {
  if (status == noErr) {
    return 0;
  }

  WriteError(buffer, capacity,
             [NSString stringWithFormat:@"the sound system could not %@ (%d)",
                                        action, status]);
  return status;
}

static AudioObjectPropertyAddress
GlobalProperty(AudioObjectPropertySelector selector) {
  return (AudioObjectPropertyAddress){selector, kAudioObjectPropertyScopeGlobal,
                                      kAudioObjectPropertyElementMain};
}

static AudioObjectID DeviceWithUID(NSString *wanted) {
  AudioObjectPropertyAddress devices =
      GlobalProperty(kAudioHardwarePropertyDevices);
  UInt32 size = 0;
  if (AudioObjectGetPropertyDataSize(kAudioObjectSystemObject, &devices, 0,
                                     NULL, &size) != noErr ||
      size == 0) {
    return kAudioObjectUnknown;
  }

  const UInt32 count = size / sizeof(AudioObjectID);
  AudioObjectID *listed = calloc(count, sizeof(AudioObjectID));
  if (listed == NULL) {
    return kAudioObjectUnknown;
  }

  if (AudioObjectGetPropertyData(kAudioObjectSystemObject, &devices, 0, NULL,
                                 &size, listed) != noErr) {
    free(listed);
    return kAudioObjectUnknown;
  }

  AudioObjectID found = kAudioObjectUnknown;
  AudioObjectPropertyAddress uid =
      GlobalProperty(kAudioDevicePropertyDeviceUID);
  for (UInt32 index = 0; index < count; index += 1) {
    CFStringRef value = NULL;
    UInt32 valueSize = sizeof(value);
    if (AudioObjectGetPropertyData(listed[index], &uid, 0, NULL, &valueSize,
                                   &value) == noErr &&
        value != NULL) {
      if ([(__bridge NSString *)value isEqualToString:wanted]) {
        found = listed[index];
      }
      CFRelease(value);
    }
    if (found != kAudioObjectUnknown) {
      break;
    }
  }

  free(listed);
  return found;
}

/// Turns off the input side of the engine's I/O unit.
///
/// On macOS, one unit runs both the output and the default input. When the
/// default input cannot run, for example an aggregate device with a missing
/// member, the unit sees no I/O cycle and no output plays. September only
/// plays sound, so it does not open the input.
static BOOL UseOutputOnly(AVAudioEngine *engine, char *error,
                          uintptr_t errorCapacity) {
  AudioUnit unit = engine.outputNode.audioUnit;
  if (unit == NULL) {
    WriteError(error, errorCapacity,
               @"the sound system did not provide an output unit");
    return NO;
  }
  // The output must be turned on again after the input is turned off, or
  // the unit still sees no I/O cycle.
  UInt32 off = 0;
  UInt32 on = 1;
  OSStatus status =
      AudioUnitSetProperty(unit, kAudioOutputUnitProperty_EnableIO,
                           kAudioUnitScope_Input, 1, &off, sizeof(off));
  if (status == noErr) {
    status = AudioUnitSetProperty(unit, kAudioOutputUnitProperty_EnableIO,
                                  kAudioUnitScope_Output, 0, &on, sizeof(on));
  }
  if (status != noErr) {
    WriteStatus(error, errorCapacity, @"use only the output of September",
                status);
    return NO;
  }
  return YES;
}

/// Points one September-owned engine at a device, for output only.
static BOOL RouteEngineToDevice(AVAudioEngine *engine, AudioObjectID device,
                                char *error, uintptr_t errorCapacity) {
  if (!UseOutputOnly(engine, error, errorCapacity)) {
    return NO;
  }
  AudioUnit output = engine.outputNode.audioUnit;
  OSStatus status = AudioUnitSetProperty(
      output, kAudioOutputUnitProperty_CurrentDevice, kAudioUnitScope_Global, 0,
      &device, sizeof(device));
  if (status != noErr) {
    WriteStatus(error, errorCapacity, @"route September to that output",
                status);
    return NO;
  }
  return YES;
}

/// Points one September-owned engine at a device without changing macOS.
static BOOL RouteEngine(AVAudioEngine *engine, NSString *deviceUID, char *error,
                        uintptr_t errorCapacity) {
  AudioObjectID device = DeviceWithUID(deviceUID);
  if (device == kAudioObjectUnknown) {
    WriteError(error, errorCapacity,
               [NSString stringWithFormat:@"this Mac has no output called %@",
                                          deviceUID]);
    return NO;
  }

  return RouteEngineToDevice(engine, device, error, errorCapacity);
}

int32_t september_audio_output_prepare(const char *uid, char *error,
                                       uintptr_t errorCapacity) {
  @autoreleasepool {
    if (uid == NULL || strlen(uid) == 0) {
      WriteError(error, errorCapacity, @"the sound output has no identifier");
      return -1;
    }
    AVAudioEngine *engine = [[AVAudioEngine alloc] init];
    NSString *deviceUID = [NSString stringWithUTF8String:uid];
    return RouteEngine(engine, deviceUID, error, errorCapacity) ? 0 : -1;
  }
}

static BOOL CreateSpeechEngine(const char *uid, AVAudioEngine **engineResult,
                               AVAudioPlayerNode **nodeResult, char *error,
                               uintptr_t errorCapacity) {
  if (uid == NULL || strlen(uid) == 0) {
    WriteError(error, errorCapacity, @"the sound output has no identifier");
    return NO;
  }

  AVAudioEngine *engine = [[AVAudioEngine alloc] init];
  NSString *deviceUID = [NSString stringWithUTF8String:uid];
  if (!RouteEngine(engine, deviceUID, error, errorCapacity)) {
    return NO;
  }

  AVAudioPlayerNode *node = [[AVAudioPlayerNode alloc] init];
  [engine attachNode:node];
  *engineResult = engine;
  *nodeResult = node;
  return YES;
}

static BOOL StartSpeechEngine(AVAudioEngine *engine, AVAudioPlayerNode *node,
                              SeptemberSpeechRun *run) {
  @try {
    if (!engine.isRunning) {
      [engine prepare];
      NSError *engineError = nil;
      if (![engine startAndReturnError:&engineError]) {
        [run fail:engineError.localizedDescription
                      ?: @"the September audio engine did not start"];
        return NO;
      }
    }
    [node play];
    return YES;
  } @catch (NSException *exception) {
    [run fail:[NSString
                  stringWithFormat:@"the September audio engine did not start (%@): %@",
                                   exception.name,
                                   exception.reason ?: @"unknown audio error"]];
    return NO;
  }
}

/// Ends a run when its output changes. The engine then stops, and without
/// this watch the wait for the last sound never ends.
static void WatchEngine(AVAudioEngine *engine, SeptemberSpeechRun *run) {
  run.observer = [[NSNotificationCenter defaultCenter]
      addObserverForName:AVAudioEngineConfigurationChangeNotification
                  object:engine
                   queue:nil
              usingBlock:^(NSNotification *note) {
                (void)note;
                [run interrupt:@"the sound output changed"];
              }];
}

static void StopWatching(SeptemberSpeechRun *run) {
  id observer = nil;
  @synchronized(run) {
    observer = run.observer;
    run.observer = nil;
  }
  if (observer != nil) {
    [[NSNotificationCenter defaultCenter] removeObserver:observer];
  }
}

/// True when `sentence` is still the sentence that may play.
static BOOL IsCurrentSentence(int64_t sentence) {
  @synchronized(SeptemberSpeechLock()) {
    return sentence == SeptemberSentence;
  }
}

/// September keeps one speech engine while the output stays the same, so a
/// sentence after another starts about 25 ms sooner. A new output, or an
/// engine that stopped, gives a new engine.
static AVAudioEngine *SeptemberSharedEngine = nil;
static AVAudioPlayerNode *SeptemberSharedNode = nil;
static NSString *SeptemberSharedOutput = nil;
static AVAudioFormat *SeptemberSharedFormat = nil;
/// Raised on each use, so an idle release sees a newer sentence.
static int64_t SeptemberSharedUse = 0;
/// An engine without a sentence for this long lets go of the output, so a
/// Bluetooth device is not held open.
static const int64_t SeptemberIdleSeconds = 30;

/// The speech engine and its player node on the output `uid`.
static BOOL AcquireSpeechEngine(const char *uid, AVAudioEngine **engineResult,
                                AVAudioPlayerNode **nodeResult, char *error,
                                uintptr_t errorCapacity) {
  if (uid == NULL || strlen(uid) == 0) {
    WriteError(error, errorCapacity, @"the sound output has no identifier");
    return NO;
  }
  NSString *output = [NSString stringWithUTF8String:uid];
  AVAudioEngine *stale = nil;
  AVAudioPlayerNode *staleNode = nil;
  @synchronized(SeptemberSpeechLock()) {
    SeptemberSharedUse += 1;
    if (SeptemberSharedEngine != nil && SeptemberSharedEngine.isRunning &&
        [SeptemberSharedOutput isEqualToString:output]) {
      *engineResult = SeptemberSharedEngine;
      *nodeResult = SeptemberSharedNode;
      return YES;
    }
    stale = SeptemberSharedEngine;
    staleNode = SeptemberSharedNode;
    SeptemberSharedEngine = nil;
    SeptemberSharedNode = nil;
    SeptemberSharedOutput = nil;
    SeptemberSharedFormat = nil;
  }
  [staleNode stop];
  [stale stop];

  AVAudioEngine *engine = nil;
  AVAudioPlayerNode *node = nil;
  if (!CreateSpeechEngine(uid, &engine, &node, error, errorCapacity)) {
    return NO;
  }
  @synchronized(SeptemberSpeechLock()) {
    SeptemberSharedEngine = engine;
    SeptemberSharedNode = node;
    SeptemberSharedOutput = output;
  }
  *engineResult = engine;
  *nodeResult = node;
  return YES;
}

/// Connects the node to the mixer in `format`, unless it already is.
static void UseFormat(AVAudioEngine *engine, AVAudioPlayerNode *node,
                      AVAudioFormat *format) {
  @synchronized(SeptemberSpeechLock()) {
    if (engine == SeptemberSharedEngine) {
      if ([SeptemberSharedFormat isEqual:format]) {
        return;
      }
      SeptemberSharedFormat = format;
    }
  }
  [engine disconnectNodeOutput:node];
  [engine connect:node to:engine.mainMixerNode format:format];
}

/// Stops the shared engine when no sentence uses it for a while.
static void ReleaseWhenIdle(void) {
  int64_t use = 0;
  @synchronized(SeptemberSpeechLock()) {
    use = SeptemberSharedUse;
  }
  dispatch_after(
      dispatch_time(DISPATCH_TIME_NOW, SeptemberIdleSeconds * NSEC_PER_SEC),
      dispatch_get_global_queue(QOS_CLASS_UTILITY, 0), ^{
        AVAudioEngine *engine = nil;
        AVAudioPlayerNode *node = nil;
        @synchronized(SeptemberSpeechLock()) {
          if (use != SeptemberSharedUse || SeptemberRun != nil) {
            return;
          }
          engine = SeptemberSharedEngine;
          node = SeptemberSharedNode;
          SeptemberSharedEngine = nil;
          SeptemberSharedNode = nil;
          SeptemberSharedOutput = nil;
          SeptemberSharedFormat = nil;
        }
        [node stop];
        [engine stop];
      });
}

/// Ends the sound of `run` when it is still the current run. The engine keeps
/// running for the next sentence.
static void ClearSpeech(SeptemberSpeechRun *run) {
  StopWatching(run);
  AVAudioPlayerNode *node = nil;
  @synchronized(SeptemberSpeechLock()) {
    if (SeptemberRun == run) {
      node = SeptemberSpeechNode;
      SeptemberSpeechEngine = nil;
      SeptemberSpeechNode = nil;
      SeptemberSynthesizer = nil;
      SeptemberRun = nil;
      SeptemberStreamActive = 0;
    }
  }
  if (node != nil) {
    [node stop];
    ReleaseWhenIdle();
  }
}

static AudioObjectID CurrentProcessObject(void) {
  AudioObjectPropertyAddress address =
      GlobalProperty(kAudioHardwarePropertyTranslatePIDToProcessObject);
  pid_t pid = getpid();
  AudioObjectID process = kAudioObjectUnknown;
  UInt32 size = sizeof(process);
  OSStatus status = AudioObjectGetPropertyData(
      kAudioObjectSystemObject, &address, sizeof(pid), &pid, &size, &process);
  return status == noErr ? process : kAudioObjectUnknown;
}

static BOOL StartKeepaliveEngine(char *error, uintptr_t errorCapacity) {
  if (SeptemberKeepaliveEngine != nil && SeptemberKeepaliveEngine.isRunning) {
    return YES;
  }

  AVAudioEngine *engine = [[AVAudioEngine alloc] init];
  // An engine left on its own device follows the default input too, so it
  // goes to the default output by name.
  AudioObjectPropertyAddress address = {
      kAudioHardwarePropertyDefaultOutputDevice, kAudioObjectPropertyScopeGlobal,
      kAudioObjectPropertyElementMain};
  AudioObjectID device = kAudioObjectUnknown;
  UInt32 size = sizeof(device);
  OSStatus status = AudioObjectGetPropertyData(kAudioObjectSystemObject, &address,
                                               0, NULL, &size, &device);
  if (status != noErr) {
    WriteStatus(error, errorCapacity, @"find the default output", status);
    return NO;
  }
  if (!RouteEngineToDevice(engine, device, error, errorCapacity)) {
    return NO;
  }
  (void)engine.mainMixerNode;
  [engine prepare];
  NSError *engineError = nil;
  if (![engine startAndReturnError:&engineError]) {
    WriteError(error, errorCapacity,
               engineError.localizedDescription
                   ?: @"the native audio process did not start");
    return NO;
  }
  SeptemberKeepaliveEngine = engine;
  return YES;
}

static void StopKeepaliveEngine(void) {
  [SeptemberKeepaliveEngine stop];
  SeptemberKeepaliveEngine = nil;
}

static NSString *TapUID(AudioObjectID tapID, char *error,
                        uintptr_t errorCapacity) {
  AudioObjectPropertyAddress uid = GlobalProperty(kAudioTapPropertyUID);
  CFStringRef value = NULL;
  UInt32 size = sizeof(value);
  OSStatus status =
      AudioObjectGetPropertyData(tapID, &uid, 0, NULL, &size, &value);
  if (status != noErr || value == NULL) {
    WriteStatus(error, errorCapacity, @"read the microphone identifier",
                status);
    return nil;
  }
  return CFBridgingRelease(value);
}

bool september_virtual_microphone_status(void) {
  @autoreleasepool {
    NSString *uid = [NSString stringWithUTF8String:SeptemberMicrophoneUID];
    return DeviceWithUID(uid) != kAudioObjectUnknown;
  }
}

int32_t september_virtual_microphone_start(char *error,
                                           uintptr_t errorCapacity) {
  @autoreleasepool {
    @synchronized(SeptemberDeviceLock()) {
      NSString *deviceUID =
          [NSString stringWithUTF8String:SeptemberMicrophoneUID];
      AudioObjectID existing = DeviceWithUID(deviceUID);
      if (existing != kAudioObjectUnknown &&
          SeptemberAggregateID != kAudioObjectUnknown) {
        return 0;
      }
      if (existing != kAudioObjectUnknown) {
        OSStatus removed = AudioHardwareDestroyAggregateDevice(existing);
        if (removed != noErr) {
          return WriteStatus(error, errorCapacity,
                             @"remove an old September Microphone", removed);
        }
      }

      if (!StartKeepaliveEngine(error, errorCapacity)) {
        return -1;
      }

      AudioObjectID process = CurrentProcessObject();
      if (process == kAudioObjectUnknown) {
        StopKeepaliveEngine();
        WriteError(
            error, errorCapacity,
            @"the sound system could not find the September audio process");
        return -1;
      }
      CATapDescription *tap =
          [[CATapDescription alloc] initMonoMixdownOfProcesses:@[ @(process) ]];
      tap.name = @"September audio";
      tap.UUID = [NSUUID UUID];
      tap.exclusive = NO;
      tap.privateTap = NO;
      tap.muteBehavior = CATapUnmuted;
      // macOS 26 names the tapped bundle and restores the tap when September
      // restarts. An older system keeps the tap without those two answers.
      if (@available(macOS 26.0, *)) {
        tap.bundleIDs = @[ @"app.september.desktop" ];
        tap.processRestoreEnabled = YES;
      }

      OSStatus status = AudioHardwareCreateProcessTap(tap, &SeptemberTapID);
      if (status != noErr) {
        SeptemberTapID = kAudioObjectUnknown;
        StopKeepaliveEngine();
        return WriteStatus(error, errorCapacity, @"start the audio tap",
                           status);
      }

      NSString *tapUID = TapUID(SeptemberTapID, error, errorCapacity);
      if (tapUID == nil) {
        AudioHardwareDestroyProcessTap(SeptemberTapID);
        SeptemberTapID = kAudioObjectUnknown;
        StopKeepaliveEngine();
        return -1;
      }

      NSDictionary *aggregate = @{
        AudioKey(kAudioAggregateDeviceNameKey) : @"September Microphone",
        AudioKey(kAudioAggregateDeviceUIDKey) : deviceUID,
        AudioKey(kAudioAggregateDeviceIsPrivateKey) : @0,
      };

      status = AudioHardwareCreateAggregateDevice(
          (__bridge CFDictionaryRef)aggregate, &SeptemberAggregateID);
      if (status != noErr) {
        AudioHardwareDestroyProcessTap(SeptemberTapID);
        SeptemberTapID = kAudioObjectUnknown;
        SeptemberAggregateID = kAudioObjectUnknown;
        StopKeepaliveEngine();
        return WriteStatus(error, errorCapacity,
                           @"publish September Microphone", status);
      }

      CFArrayRef tapList = (__bridge CFArrayRef) @[ tapUID ];
      UInt32 tapListSize = sizeof(tapList);
      AudioObjectPropertyAddress tapListProperty =
          GlobalProperty(kAudioAggregateDevicePropertyTapList);
      status =
          AudioObjectSetPropertyData(SeptemberAggregateID, &tapListProperty, 0,
                                     NULL, tapListSize, &tapList);
      if (status != noErr) {
        AudioHardwareDestroyAggregateDevice(SeptemberAggregateID);
        AudioHardwareDestroyProcessTap(SeptemberTapID);
        SeptemberTapID = kAudioObjectUnknown;
        SeptemberAggregateID = kAudioObjectUnknown;
        StopKeepaliveEngine();
        return WriteStatus(error, errorCapacity,
                           @"connect the microphone audio tap", status);
      }
      return 0;
    }
  }
}

int32_t september_virtual_microphone_stop(char *error,
                                          uintptr_t errorCapacity) {
  @autoreleasepool {
    @synchronized(SeptemberDeviceLock()) {
      OSStatus firstError = noErr;
      NSString *deviceUID =
          [NSString stringWithUTF8String:SeptemberMicrophoneUID];
      AudioObjectID aggregate = SeptemberAggregateID;
      if (aggregate == kAudioObjectUnknown) {
        aggregate = DeviceWithUID(deviceUID);
      }
      if (aggregate != kAudioObjectUnknown) {
        firstError = AudioHardwareDestroyAggregateDevice(aggregate);
      }
      SeptemberAggregateID = kAudioObjectUnknown;

      if (SeptemberTapID != kAudioObjectUnknown) {
        OSStatus tapError = AudioHardwareDestroyProcessTap(SeptemberTapID);
        if (firstError == noErr) {
          firstError = tapError;
        }
      }
      SeptemberTapID = kAudioObjectUnknown;
      StopKeepaliveEngine();

      return WriteStatus(error, errorCapacity, @"stop September Microphone",
                         firstError);
    }
  }
}

/// Stops the sound now. The sentence number stays.
static void StopSound(void) {
  @autoreleasepool {
    AVAudioEngine *engine = nil;
    AVAudioPlayerNode *node = nil;
    AVSpeechSynthesizer *synthesizer = nil;
    SeptemberSpeechRun *run = nil;
    @synchronized(SeptemberSpeechLock()) {
      engine = SeptemberSpeechEngine;
      node = SeptemberSpeechNode;
      synthesizer = SeptemberSynthesizer;
      run = SeptemberRun;
      SeptemberSpeechEngine = nil;
      SeptemberSpeechNode = nil;
      SeptemberSynthesizer = nil;
      SeptemberRun = nil;
      SeptemberStreamActive = 0;
    }
    // The engine keeps running for the next sentence.
    (void)engine;
    [node stop];
    [synthesizer stopSpeakingAtBoundary:AVSpeechBoundaryImmediate];
    StopWatching(run);
    [run cancel];
    if (node != nil) {
      ReleaseWhenIdle();
    }
  }
}

/// Stops the sound now, and every sentence that has not begun to play.
void september_speech_stop(void) {
  @synchronized(SeptemberSpeechLock()) {
    SeptemberSentence += 1;
  }
  StopSound();
}

/// Stops the sound now, and gives the number of the next sentence.
int64_t september_speech_claim(void) {
  int64_t sentence = 0;
  @synchronized(SeptemberSpeechLock()) {
    sentence = ++SeptemberSentence;
  }
  StopSound();
  return sentence;
}

int32_t september_speech_system(const char *words, const char *voiceIdentifier,
                                float speed, const char *outputUID, char *error,
                                uintptr_t errorCapacity) {
  @autoreleasepool {
    if (words == NULL || strlen(words) == 0) {
      WriteError(error, errorCapacity, @"there are no words to speak");
      return -1;
    }

    september_speech_stop();
    AVAudioEngine *engine = nil;
    AVAudioPlayerNode *node = nil;
    if (!AcquireSpeechEngine(outputUID, &engine, &node, error, errorCapacity)) {
      return -1;
    }
    AVSpeechSynthesizer *synthesizer = [[AVSpeechSynthesizer alloc] init];
    AVSpeechUtterance *utterance = [[AVSpeechUtterance alloc]
        initWithString:[NSString stringWithUTF8String:words]];
    float rate = AVSpeechUtteranceDefaultSpeechRate * speed;
    utterance.rate = fmaxf(AVSpeechUtteranceMinimumSpeechRate,
                           fminf(rate, AVSpeechUtteranceMaximumSpeechRate));
    if (voiceIdentifier != NULL && strlen(voiceIdentifier) > 0) {
      AVSpeechSynthesisVoice *voice = [AVSpeechSynthesisVoice
          voiceWithIdentifier:[NSString stringWithUTF8String:voiceIdentifier]];
      if (voice != nil) {
        utterance.voice = voice;
      }
    }

    SeptemberSpeechRun *run = [SeptemberSpeechRun new];
    @synchronized(SeptemberSpeechLock()) {
      SeptemberSpeechEngine = engine;
      SeptemberSpeechNode = node;
      SeptemberSynthesizer = synthesizer;
      SeptemberRun = run;
    }
    WatchEngine(engine, run);

    __block BOOL started = NO;
    [synthesizer
        writeUtterance:utterance
       toBufferCallback:^(AVAudioBuffer *buffer) {
         if (run.cancelled) {
           return;
         }
         AVAudioPCMBuffer *audio = (AVAudioPCMBuffer *)buffer;
         if (audio.frameLength == 0) {
           [run finishedSynthesis];
           return;
         }

         @synchronized(run) {
           if (run.cancelled || run.finished) {
             return;
           }
           if (!started) {
             UseFormat(engine, node, audio.format);
           }
           [run scheduledBuffer];
           [node scheduleBuffer:audio
               completionCallbackType:AVAudioPlayerNodeCompletionDataPlayedBack
                    completionHandler:^(
                        AVAudioPlayerNodeCompletionCallbackType callbackType) {
                      (void)callbackType;
                      [run playedBuffer];
                    }];
           if (!started) {
             started = StartSpeechEngine(engine, node, run);
           }
         }
       }];
    dispatch_semaphore_wait(run.done, DISPATCH_TIME_FOREVER);
    ClearSpeech(run);
    if (run.error != nil) {
      WriteError(error, errorCapacity, run.error);
      return -1;
    }
    return 0;
  }
}

/// Plays one voice file, when `sentence` is still the sentence that may play.
///
/// The result is 0 after the whole file, or after a stop. It is -2 when the
/// output changed after the sound began, -3 when the file is not audio, and -1
/// for another error.
int32_t september_speech_file(int64_t sentence, const char *path,
                              const char *outputUID, char *error,
                              uintptr_t errorCapacity) {
  @autoreleasepool {
    if (!IsCurrentSentence(sentence)) {
      return 0;
    }
    if (path == NULL || strlen(path) == 0) {
      WriteError(error, errorCapacity, @"the voice file has no path");
      return -1;
    }

    StopSound();
    NSURL *url = [NSURL fileURLWithPath:[NSString stringWithUTF8String:path]];
    NSError *fileError = nil;
    AVAudioFile *file = [[AVAudioFile alloc] initForReading:url error:&fileError];
    if (file == nil) {
      WriteError(error, errorCapacity,
                 fileError.localizedDescription
                     ?: @"the voice file did not open");
      return -3;
    }

    AVAudioEngine *engine = nil;
    AVAudioPlayerNode *node = nil;
    if (!AcquireSpeechEngine(outputUID, &engine, &node, error, errorCapacity)) {
      return -1;
    }
    UseFormat(engine, node, file.processingFormat);

    SeptemberSpeechRun *run = [SeptemberSpeechRun new];
    @synchronized(SeptemberSpeechLock()) {
      if (sentence != SeptemberSentence) {
        return 0;
      }
      SeptemberSpeechEngine = engine;
      SeptemberSpeechNode = node;
      SeptemberRun = run;
    }
    WatchEngine(engine, run);

    [node scheduleFile:file
                        atTime:nil
         completionCallbackType:AVAudioPlayerNodeCompletionDataPlayedBack
              completionHandler:^(
                  AVAudioPlayerNodeCompletionCallbackType callbackType) {
                (void)callbackType;
                [run finish];
              }];
    StartSpeechEngine(engine, node, run);

    dispatch_semaphore_wait(run.done, DISPATCH_TIME_FOREVER);
    ClearSpeech(run);
    if (run.error != nil) {
      WriteError(error, errorCapacity, run.error);
      return run.interrupted ? -2 : -1;
    }
    return 0;
  }
}

/// Opens a stream of 16-bit mono samples on the September speech engine.
///
/// The stream uses the same engine and node as the other voices, so the
/// process tap and the chosen output hear it, and a stop ends it. The result
/// is the number of the stream, 0 when `sentence` was stopped, or -1.
int64_t september_speech_stream_begin(int64_t sentence, double sampleRate,
                                      const char *outputUID, char *error,
                                      uintptr_t errorCapacity) {
  @autoreleasepool {
    if (!IsCurrentSentence(sentence)) {
      return 0;
    }
    StopSound();
    AVAudioEngine *engine = nil;
    AVAudioPlayerNode *node = nil;
    if (!AcquireSpeechEngine(outputUID, &engine, &node, error, errorCapacity)) {
      return -1;
    }
    AVAudioFormat *format =
        [[AVAudioFormat alloc] initStandardFormatWithSampleRate:sampleRate
                                                      channels:1];
    UseFormat(engine, node, format);

    SeptemberSpeechRun *run = [SeptemberSpeechRun new];
    int64_t stream = 0;
    @synchronized(SeptemberSpeechLock()) {
      if (sentence != SeptemberSentence) {
        return 0;
      }
      SeptemberSpeechEngine = engine;
      SeptemberSpeechNode = node;
      SeptemberRun = run;
      stream = ++SeptemberStreamCount;
      SeptemberStreamActive = stream;
    }
    WatchEngine(engine, run);
    if (!StartSpeechEngine(engine, node, run)) {
      [node stop];
      [engine stop];
      ClearSpeech(run);
      WriteError(error, errorCapacity, run.error);
      return -1;
    }
    return stream;
  }
}

/// The run of the open stream, when `stream` is still the open stream.
static SeptemberSpeechRun *StreamRun(int64_t stream, AVAudioEngine **engine,
                                     AVAudioPlayerNode **node) {
  @synchronized(SeptemberSpeechLock()) {
    if (stream == 0 || SeptemberStreamActive != stream) {
      return nil;
    }
    if (engine != NULL) {
      *engine = SeptemberSpeechEngine;
    }
    *node = SeptemberSpeechNode;
    return SeptemberRun;
  }
}

/// Schedules one chunk of the open stream directly after the chunk before it.
int32_t september_speech_stream_append(int64_t stream, const int16_t *samples,
                                       uintptr_t count, char *error,
                                       uintptr_t errorCapacity) {
  @autoreleasepool {
    AVAudioPlayerNode *node = nil;
    SeptemberSpeechRun *run = StreamRun(stream, NULL, &node);
    if (node == nil || run == nil || run.cancelled) {
      WriteError(error, errorCapacity, @"the voice stopped");
      return -1;
    }
    if (samples == NULL || count == 0) {
      return 0;
    }

    AVAudioPCMBuffer *buffer =
        [[AVAudioPCMBuffer alloc] initWithPCMFormat:[node outputFormatForBus:0]
                                      frameCapacity:(AVAudioFrameCount)count];
    buffer.frameLength = (AVAudioFrameCount)count;
    float *channel = buffer.floatChannelData[0];
    for (uintptr_t index = 0; index < count; index++) {
      channel[index] = (float)samples[index] / 32768.0f;
    }

    @synchronized(run) {
      if (run.cancelled || run.finished) {
        return 0;
      }
      [run scheduledBuffer];
      [node scheduleBuffer:buffer
          completionCallbackType:AVAudioPlayerNodeCompletionDataPlayedBack
               completionHandler:^(
                   AVAudioPlayerNodeCompletionCallbackType callbackType) {
                 (void)callbackType;
                 [run playedBuffer];
               }];
    }
    return 0;
  }
}

/// Waits until the last chunk of the stream plays, or a stop ends it.
int32_t september_speech_stream_finish(int64_t stream, char *error,
                                       uintptr_t errorCapacity) {
  @autoreleasepool {
    AVAudioEngine *engine = nil;
    AVAudioPlayerNode *node = nil;
    SeptemberSpeechRun *run = StreamRun(stream, &engine, &node);
    if (run == nil) {
      return 0;
    }

    [run finishedSynthesis];
    dispatch_semaphore_wait(run.done, DISPATCH_TIME_FOREVER);
    @synchronized(SeptemberSpeechLock()) {
      if (SeptemberStreamActive == stream) {
        SeptemberStreamActive = 0;
      }
    }
    ClearSpeech(run);
    if (run.error != nil) {
      WriteError(error, errorCapacity, run.error);
      return -1;
    }
    return 0;
  }
}
