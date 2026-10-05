#import <AVFoundation/AVFoundation.h>
#import <CoreAudio/CoreAudio.h>
#import <objc/runtime.h>
#include <assert.h>
#include <stdint.h>
#include <stdio.h>

extern int64_t september_speech_claim(void);
extern int64_t september_speech_stream_begin(int64_t, double, const char *,
                                             char *, uintptr_t);

static AVAudioEngine *failedEngine;

static void FailPlayback(id node, SEL selector) {
  (void)selector;
  failedEngine = [node engine];
  @throw [NSException exceptionWithName:@"com.apple.coreaudio.avfaudio"
                                reason:@"injected playback startup failure"
                              userInfo:nil];
}

int main(void) {
  @autoreleasepool {
    AudioObjectPropertyAddress address = {
        kAudioHardwarePropertyDefaultOutputDevice,
        kAudioObjectPropertyScopeGlobal, kAudioObjectPropertyElementMain};
    AudioObjectID device = kAudioObjectUnknown;
    UInt32 size = sizeof(device);
    assert(AudioObjectGetPropertyData(kAudioObjectSystemObject, &address, 0,
                                     NULL, &size, &device) == noErr);
    address.mSelector = kAudioDevicePropertyDeviceUID;
    CFStringRef uid = NULL;
    size = sizeof(uid);
    assert(AudioObjectGetPropertyData(device, &address, 0, NULL, &size, &uid) ==
           noErr);
    NSString *output = CFBridgingRelease(uid);

    Method play =
        class_getInstanceMethod([AVAudioPlayerNode class], @selector(play));
    IMP original = method_setImplementation(play, (IMP)FailPlayback);
    char error[1024] = {0};
    int64_t stream = 0;
    @try {
      stream = september_speech_stream_begin(september_speech_claim(), 24000,
                                            output.UTF8String,
                                            error, sizeof(error));
    } @catch (NSException *exception) {
      fprintf(stderr, "Startup exception escaped the native API: %s\n",
              exception.name.UTF8String);
      return 1;
    }
    assert(stream == -1);
    assert(error[0] != '\0');
    assert(failedEngine != nil && !failedEngine.isRunning);
    failedEngine = nil;
    method_setImplementation(play, original);
  }
  return 0;
}
