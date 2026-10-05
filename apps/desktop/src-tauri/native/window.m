#import <AppKit/AppKit.h>

// With `on`, the panel floats above other apps, including an app in full
// screen, and follows the user to each Space. Without it, the panel is a normal
// window.
void september_window_float(void *nsWindow, bool on) {
  NSWindow *window = (__bridge NSWindow *)nsWindow;
  NSWindowCollectionBehavior floating =
      NSWindowCollectionBehaviorFullScreenAuxiliary |
      NSWindowCollectionBehaviorCanJoinAllSpaces;
  if (on) {
    window.collectionBehavior |= floating;
    window.level = NSFloatingWindowLevel;
  } else {
    window.collectionBehavior &= ~floating;
    window.level = NSNormalWindowLevel;
  }
}
