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

static void place_buttons(NSWindow *window, double x, double y) {
  NSButton *close = [window standardWindowButton:NSWindowCloseButton];
  NSButton *mini = [window standardWindowButton:NSWindowMiniaturizeButton];
  NSButton *zoom = [window standardWindowButton:NSWindowZoomButton];
  if (!close || !mini) return;
  NSView *bar = close.superview.superview;
  CGFloat height = close.frame.size.height + y;
  // The buttons are in place, so there is nothing to lay out again.
  if (close.frame.origin.x == x && bar.frame.size.height == height) return;
  NSRect frame = bar.frame;
  frame.size.height = height;
  frame.origin.y = window.frame.size.height - height;
  bar.frame = frame;
  CGFloat step = mini.frame.origin.x - close.frame.origin.x;
  NSArray<NSButton *> *buttons = zoom ? @[ close, mini, zoom ] : @[ close, mini ];
  for (NSUInteger at = 0; at < buttons.count; at++) {
    NSButton *button = buttons[at];
    [button setFrameOrigin:NSMakePoint(x + at * step, button.frame.origin.y)];
  }
}

// Puts the window buttons at `x` from the left, in a title bar `y` points
// higher than the buttons. AppKit lays out the title bar again after the
// window shows, so each update of the window puts the buttons back.
void september_window_buttons(void *nsWindow, double x, double y) {
  NSWindow *window = (__bridge NSWindow *)nsWindow;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    [[NSNotificationCenter defaultCenter]
        addObserverForName:NSWindowDidUpdateNotification
                    object:window
                     queue:nil
                usingBlock:^(__unused NSNotification *note) {
                  place_buttons(window, x, y);
                }];
  });
  place_buttons(window, x, y);
}
