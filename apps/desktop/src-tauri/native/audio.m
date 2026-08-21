#import <AVFoundation/AVFoundation.h>
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
static AVAudioPlayer *SeptemberPlayer = nil;
static AVSpeechSynthesizer *SeptemberSynthesizer = nil;

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
    @synchronized([AVSpeechSynthesizer class]) {
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
        AudioKey(kAudioAggregateDeviceIsPrivateKey) : @NO,
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
    @synchronized([AVSpeechSynthesizer class]) {
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
    AVAudioPlayer *player = nil;
    AVSpeechSynthesizer *synthesizer = nil;
    @synchronized([AVAudioPlayer class]) {
      player = SeptemberPlayer;
      synthesizer = SeptemberSynthesizer;
      SeptemberPlayer = nil;
      SeptemberSynthesizer = nil;
    }
    [player stop];
    [synthesizer stopSpeakingAtBoundary:AVSpeechBoundaryImmediate];
  }
}

int32_t september_speech_system(const char *words, const char *voiceIdentifier,
                                float speed, char *error,
                                uintptr_t errorCapacity) {
  @autoreleasepool {
    if (words == NULL || strlen(words) == 0) {
      WriteError(error, errorCapacity, @"there are no words to speak");
      return -1;
    }

    september_speech_stop();
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

    @synchronized([AVAudioPlayer class]) {
      SeptemberSynthesizer = synthesizer;
    }
    [synthesizer speakUtterance:utterance];
    while (synthesizer.isSpeaking) {
      [NSThread sleepForTimeInterval:0.02];
    }
    @synchronized([AVAudioPlayer class]) {
      if (SeptemberSynthesizer == synthesizer) {
        SeptemberSynthesizer = nil;
      }
    }
    return 0;
  }
}

int32_t september_speech_file(const char *path, char *error,
                              uintptr_t errorCapacity) {
  @autoreleasepool {
    if (path == NULL || strlen(path) == 0) {
      WriteError(error, errorCapacity, @"the voice file has no path");
      return -1;
    }

    september_speech_stop();
    NSURL *url = [NSURL fileURLWithPath:[NSString stringWithUTF8String:path]];
    NSError *playerError = nil;
    AVAudioPlayer *player =
        [[AVAudioPlayer alloc] initWithContentsOfURL:url error:&playerError];
    if (player == nil) {
      WriteError(error, errorCapacity,
                 playerError.localizedDescription
                     ?: @"the voice file did not open");
      return -1;
    }
    if (![player prepareToPlay] || ![player play]) {
      WriteError(error, errorCapacity, @"the voice file did not play");
      return -1;
    }

    @synchronized([AVAudioPlayer class]) {
      SeptemberPlayer = player;
    }
    while (player.isPlaying) {
      [NSThread sleepForTimeInterval:0.02];
    }
    @synchronized([AVAudioPlayer class]) {
      if (SeptemberPlayer == player) {
        SeptemberPlayer = nil;
      }
    }
    return 0;
  }
}
