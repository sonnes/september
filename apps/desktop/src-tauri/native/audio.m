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

  AudioUnit output = engine.outputNode.audioUnit;
  if (output == NULL) {
    WriteError(error, errorCapacity,
               @"the sound system did not provide an output unit");
    return NO;
  }
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
  [engine prepare];
  NSError *engineError = nil;
  if (![engine startAndReturnError:&engineError]) {
    [run fail:engineError.localizedDescription
                  ?: @"the September audio engine did not start"];
    return NO;
  }
  [node play];
  return YES;
}

static void ClearSpeech(SeptemberSpeechRun *run) {
  @synchronized(SeptemberSpeechLock()) {
    if (SeptemberRun == run) {
      SeptemberSpeechEngine = nil;
      SeptemberSpeechNode = nil;
      SeptemberSynthesizer = nil;
      SeptemberRun = nil;
    }
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
      tap.bundleIDs = @[ @"app.september.desktop" ];
      tap.exclusive = NO;
      tap.privateTap = NO;
      tap.processRestoreEnabled = YES;
      tap.muteBehavior = CATapUnmuted;

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

void september_speech_stop(void) {
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
    }
    [node stop];
    [engine stop];
    [synthesizer stopSpeakingAtBoundary:AVSpeechBoundaryImmediate];
    [run cancel];
  }
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
    if (!CreateSpeechEngine(outputUID, &engine, &node, error, errorCapacity)) {
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
             [engine connect:node
                           to:engine.mainMixerNode
                       format:audio.format];
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
    [node stop];
    [engine stop];
    ClearSpeech(run);
    if (run.error != nil) {
      WriteError(error, errorCapacity, run.error);
      return -1;
    }
    return 0;
  }
}

int32_t september_speech_file(const char *path, const char *outputUID,
                              char *error,
                              uintptr_t errorCapacity) {
  @autoreleasepool {
    if (path == NULL || strlen(path) == 0) {
      WriteError(error, errorCapacity, @"the voice file has no path");
      return -1;
    }

    september_speech_stop();
    NSURL *url = [NSURL fileURLWithPath:[NSString stringWithUTF8String:path]];
    NSError *fileError = nil;
    AVAudioFile *file = [[AVAudioFile alloc] initForReading:url error:&fileError];
    if (file == nil) {
      WriteError(error, errorCapacity,
                 fileError.localizedDescription
                     ?: @"the voice file did not open");
      return -1;
    }

    AVAudioEngine *engine = nil;
    AVAudioPlayerNode *node = nil;
    if (!CreateSpeechEngine(outputUID, &engine, &node, error, errorCapacity)) {
      return -1;
    }
    [engine connect:node to:engine.mainMixerNode format:file.processingFormat];

    SeptemberSpeechRun *run = [SeptemberSpeechRun new];
    @synchronized(SeptemberSpeechLock()) {
      SeptemberSpeechEngine = engine;
      SeptemberSpeechNode = node;
      SeptemberRun = run;
    }

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
    [node stop];
    [engine stop];
    ClearSpeech(run);
    if (run.error != nil) {
      WriteError(error, errorCapacity, run.error);
      return -1;
    }
    return 0;
  }
}
