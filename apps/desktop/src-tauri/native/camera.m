#import <CoreMediaIO/CoreMediaIO.h>
#import <Foundation/Foundation.h>
#import <SystemExtensions/SystemExtensions.h>

#include <string.h>

static NSString *const SeptemberCameraExtensionIdentifier = @"app.september.desktop.camera";
static NSString *const SeptemberCameraDeviceUID = @"app.september.desktop.camera.device";
static const CMIOObjectPropertySelector SeptemberOverlaySelector = 'otxt';

static void WriteCameraError(char *output, size_t capacity, NSString *message) {
  if (output == NULL || capacity == 0) {
    return;
  }
  const char *text = message.UTF8String;
  if (text == NULL) {
    text = "the camera system did not answer";
  }
  strlcpy(output, text, capacity);
}

static CMIODeviceID SeptemberCameraDevice(void) {
  CMIOObjectPropertyAddress address = {
      kCMIOHardwarePropertyDevices,
      kCMIOObjectPropertyScopeGlobal,
      kCMIOObjectPropertyElementMain,
  };
  UInt32 size = 0;
  if (CMIOObjectGetPropertyDataSize(kCMIOObjectSystemObject, &address, 0, NULL,
                                    &size) != noErr ||
      size == 0) {
    return kCMIOObjectUnknown;
  }

  const UInt32 count = size / sizeof(CMIODeviceID);
  CMIODeviceID *devices = calloc(count, sizeof(CMIODeviceID));
  if (devices == NULL) {
    return kCMIOObjectUnknown;
  }
  UInt32 used = 0;
  OSStatus status = CMIOObjectGetPropertyData(kCMIOObjectSystemObject, &address,
                                               0, NULL, size, &used, devices);
  if (status != noErr) {
    free(devices);
    return kCMIOObjectUnknown;
  }

  CMIODeviceID found = kCMIOObjectUnknown;
  address.mSelector = kCMIODevicePropertyDeviceUID;
  for (UInt32 index = 0; index < count; index += 1) {
    CFStringRef uid = NULL;
    UInt32 uidSize = sizeof(uid);
    status = CMIOObjectGetPropertyData(devices[index], &address, 0, NULL,
                                       uidSize, &uidSize, &uid);
    if (status == noErr && uid != NULL) {
      if (CFStringCompare(uid, (__bridge CFStringRef)SeptemberCameraDeviceUID,
                          0) == kCFCompareEqualTo) {
        found = devices[index];
      }
      CFRelease(uid);
    }
    if (found != kCMIOObjectUnknown) {
      break;
    }
  }
  free(devices);
  return found;
}

@interface SeptemberCameraController
    : NSObject <OSSystemExtensionRequestDelegate>
@property(nonatomic, assign) BOOL pending;
@property(nonatomic, copy) NSString *lastError;
@property(nonatomic, strong) OSSystemExtensionRequest *request;
@end

@implementation SeptemberCameraController

+ (instancetype)shared {
  static SeptemberCameraController *controller;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    controller = [SeptemberCameraController new];
    controller.lastError = @"";
  });
  return controller;
}

- (void)submitActivation:(BOOL)activate {
  @synchronized(self) {
    self.pending = YES;
    self.lastError = @"";
  }

  dispatch_block_t submit = ^{
    OSSystemExtensionRequest *request =
        activate
            ? [OSSystemExtensionRequest
                  activationRequestForExtension:SeptemberCameraExtensionIdentifier
                                          queue:dispatch_get_main_queue()]
            : [OSSystemExtensionRequest
                  deactivationRequestForExtension:SeptemberCameraExtensionIdentifier
                                            queue:dispatch_get_main_queue()];
    request.delegate = self;
    @synchronized(self) {
      self.request = request;
    }
    [[OSSystemExtensionManager sharedManager] submitRequest:request];
  };

  if ([NSThread isMainThread]) {
    submit();
  } else {
    dispatch_async(dispatch_get_main_queue(), submit);
  }
}

- (OSSystemExtensionReplacementAction)
                  request:(OSSystemExtensionRequest *)request
    actionForReplacingExtension:(OSSystemExtensionProperties *)existing
                   withExtension:(OSSystemExtensionProperties *)extension {
  return OSSystemExtensionReplacementActionReplace;
}

- (void)requestNeedsUserApproval:(OSSystemExtensionRequest *)request {
  @synchronized(self) {
    self.pending = YES;
  }
}

- (void)request:(OSSystemExtensionRequest *)request
    didFinishWithResult:(OSSystemExtensionRequestResult)result {
  @synchronized(self) {
    self.pending = NO;
    self.request = nil;
    if (result == OSSystemExtensionRequestWillCompleteAfterReboot) {
      self.lastError = @"Restart this Mac to finish enabling September Camera.";
    }
  }
}

- (void)request:(OSSystemExtensionRequest *)request
    didFailWithError:(NSError *)error {
  @synchronized(self) {
    self.pending = NO;
    self.request = nil;
    self.lastError = error.localizedDescription ?: @"September Camera could not be changed.";
  }
}

@end

int september_virtual_camera_status(int *pending, char *error,
                                    size_t errorCapacity) {
  SeptemberCameraController *controller = [SeptemberCameraController shared];
  @synchronized(controller) {
    if (pending != NULL) {
      *pending = controller.pending ? 1 : 0;
    }
    WriteCameraError(error, errorCapacity, controller.lastError);
  }
  return SeptemberCameraDevice() != kCMIOObjectUnknown ? 1 : 0;
}

int september_virtual_camera_start(char *error, size_t errorCapacity) {
  @autoreleasepool {
    if (SeptemberCameraDevice() != kCMIOObjectUnknown) {
      return 0;
    }

    NSURL *extensionURL = [[NSBundle mainBundle].bundleURL
        URLByAppendingPathComponent:
            @"Contents/Library/SystemExtensions/SeptemberCamera.systemextension"];
    if (![[NSFileManager defaultManager] fileExistsAtPath:extensionURL.path]) {
      WriteCameraError(error, errorCapacity,
                       @"This build does not contain September Camera.");
      return -1;
    }
    if (![[NSBundle mainBundle].bundlePath hasPrefix:@"/Applications/"]) {
      WriteCameraError(error, errorCapacity,
                       @"Move September to Applications before enabling its camera.");
      return -1;
    }

    [[SeptemberCameraController shared] submitActivation:YES];
    return 0;
  }
}

int september_virtual_camera_stop(char *error, size_t errorCapacity) {
  @autoreleasepool {
    (void)error;
    (void)errorCapacity;
    SeptemberCameraController *controller = [SeptemberCameraController shared];
    if (SeptemberCameraDevice() == kCMIOObjectUnknown && !controller.pending) {
      return 0;
    }
    [[SeptemberCameraController shared] submitActivation:NO];
    return 0;
  }
}

int september_virtual_camera_overlay(const char *text, int visible, char *error,
                                     size_t errorCapacity) {
  @autoreleasepool {
    CMIODeviceID device = SeptemberCameraDevice();
    if (device == kCMIOObjectUnknown) {
      WriteCameraError(error, errorCapacity,
                       @"September Camera is not available yet.");
      return -1;
    }

    NSString *words = text == NULL ? @"" : [NSString stringWithUTF8String:text];
    if (words == nil) {
      WriteCameraError(error, errorCapacity,
                       @"The camera text is not valid Unicode.");
      return -1;
    }
    NSDictionary *state = @{ @"text" : words, @"visible" : @(visible != 0) };
    NSError *jsonError = nil;
    NSData *data = [NSJSONSerialization dataWithJSONObject:state options:0 error:&jsonError];
    NSString *json = data == nil
                         ? nil
                         : [[NSString alloc] initWithData:data
                                                 encoding:NSUTF8StringEncoding];
    if (json == nil) {
      WriteCameraError(error, errorCapacity,
                       jsonError.localizedDescription ?: @"The camera text could not be encoded.");
      return -1;
    }

    CMIOObjectPropertyAddress address = {
        SeptemberOverlaySelector,
        kCMIOObjectPropertyScopeGlobal,
        kCMIOObjectPropertyElementMain,
    };
    CFStringRef value = (__bridge CFStringRef)json;
    OSStatus status = CMIOObjectSetPropertyData(device, &address, 0, NULL,
                                                 sizeof(value), &value);
    if (status != noErr) {
      WriteCameraError(error, errorCapacity,
                       [NSString stringWithFormat:
                                     @"September Camera did not accept its text (%d).",
                                     status]);
      return status;
    }
    return 0;
  }
}
