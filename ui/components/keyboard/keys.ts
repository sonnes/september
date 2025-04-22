export interface ControlButton {
  key: string;
  label: string;
  width: number;
}

export interface CircleKey {
  key: string;
  startAngle: number;
  endAngle: number;
  radius: number;
}

const CONTROL_BUTTONS: ControlButton[] = [
  { key: 'Special', label: '@$%', width: 60 },
  { key: 'Shift', label: '⇧', width: 60 },
  { key: 'Space', label: 'space', width: 180 },
  { key: 'Backspace', label: 'del', width: 60 },
  { key: 'Enter', label: '↵', width: 60 },
];

function createCircleKeys(keys: string[], startAngle: number, radius: number) {
  const angle = 180 / keys.length;
  return keys.map((key, index) => ({
    key,
    startAngle: startAngle + index * angle,
    endAngle: startAngle + (index + 1) * angle,
    radius,
  }));
}

export function getTopCircleKeys() {
  const outerRing = createCircleKeys(['q', 'z', 'x', 'j', 'v', 'k', 'w', 'y', 'p'], -180, 180);
  const middleRing = createCircleKeys(['s', 'b', 'f', 'm', 'c', 'l', 'g'], -180, 120);
  const innerRing = createCircleKeys(['e', 't'], -180, 60);

  return [...outerRing, ...middleRing, ...innerRing];
}

export function getBottomCircleKeys() {
  const outerRing = createCircleKeys(['0', '9', '8', '7', '6', '5', '4', '3', '2', '1'], 0, 180);
  const middleRing = createCircleKeys(['h', 'u', 'd', 'r', 'o', 'n'], 0, 120);
  const innerRing = createCircleKeys(['a', 'i'], 0, 60);

  return [...outerRing, ...middleRing, ...innerRing];
}

export function getTopSpecialKeys() {
  // Least frequently used special characters in outer ring
  const outerRing = createCircleKeys(
    ['~', '`', '#', '^', '\\', '?', '|', '<', '>', '°'],
    -180,
    180
  );
  // Medium frequency special characters in middle ring
  const middleRing = createCircleKeys(['!', '$', '%', '&', '*', '+'], -180, 120);
  // Most frequently used special characters in inner ring
  const innerRing = createCircleKeys(['@', '.'], -180, 60);

  return [...outerRing, ...middleRing, ...innerRing];
}

export function getBottomSpecialKeys() {
  // Least frequently used special characters in outer ring
  const outerRing = createCircleKeys(['(', ')', '{', '}', '[', ']', ':', ';', '/', '\\'], 0, 180);
  // Medium frequency special characters in middle ring
  const middleRing = createCircleKeys(['-', '_', '=', '+', '/', '?'], 0, 120);
  // Most frequently used special characters in inner ring
  const innerRing = createCircleKeys(['"', "'"], 0, 60);

  return [...outerRing, ...middleRing, ...innerRing];
}

// Define the circular keys in three rings with continuous segments
const TOP_CIRCLE_KEYS: CircleKey[] = [
  // Top outer ring (less frequent)
  { key: 'q', startAngle: -180, endAngle: -160, radius: 180 },
  { key: 'z', startAngle: -160, endAngle: -140, radius: 180 },
  { key: 'x', startAngle: -140, endAngle: -120, radius: 180 },
  { key: 'j', startAngle: -120, endAngle: -100, radius: 180 },
  { key: 'v', startAngle: -100, endAngle: -80, radius: 180 },
  { key: 'k', startAngle: -80, endAngle: -60, radius: 180 },
  { key: 'w', startAngle: -60, endAngle: -40, radius: 180 },
  { key: 'y', startAngle: -40, endAngle: -20, radius: 180 },
  { key: 'p', startAngle: -20, endAngle: 0, radius: 180 },

  // Top middle ring (medium frequency)
  { key: 's', startAngle: -180, endAngle: -180 + 180 / 7, radius: 120 },
  { key: 'b', startAngle: -180 + 180 / 7, endAngle: -180 + (2 * 180) / 7, radius: 120 },
  { key: 'f', startAngle: -180 + (2 * 180) / 7, endAngle: -180 + (3 * 180) / 7, radius: 120 },
  { key: 'm', startAngle: -180 + (3 * 180) / 7, endAngle: -180 + (4 * 180) / 7, radius: 120 },
  { key: 'c', startAngle: -180 + (4 * 180) / 7, endAngle: -180 + (5 * 180) / 7, radius: 120 },
  { key: 'l', startAngle: -180 + (5 * 180) / 7, endAngle: -180 + (6 * 180) / 7, radius: 120 },
  { key: 'g', startAngle: -180 + (6 * 180) / 7, endAngle: -180 + (7 * 180) / 7, radius: 120 },

  // Top inner ring (most frequent)
  { key: 'e', startAngle: -180, endAngle: -90, radius: 60 }, // Most common letter
  { key: 't', startAngle: -90, endAngle: 0, radius: 60 }, // Second most common
];

const BOTTOM_CIRCLE_KEYS: CircleKey[] = [
  // Bottom outer ring (less frequent)
  { key: '0', startAngle: 0, endAngle: 18, radius: 180 },
  { key: '9', startAngle: 18, endAngle: 36, radius: 180 },
  { key: '8', startAngle: 36, endAngle: 54, radius: 180 },
  { key: '7', startAngle: 54, endAngle: 72, radius: 180 },
  { key: '6', startAngle: 72, endAngle: 90, radius: 180 },
  { key: '5', startAngle: 90, endAngle: 108, radius: 180 },
  { key: '4', startAngle: 108, endAngle: 126, radius: 180 },
  { key: '3', startAngle: 126, endAngle: 144, radius: 180 },
  { key: '2', startAngle: 144, endAngle: 162, radius: 180 },
  { key: '1', startAngle: 162, endAngle: 180, radius: 180 },

  // Bottom middle ring (medium frequency)
  { key: 'h', startAngle: 0, endAngle: 30, radius: 120 },
  { key: 'u', startAngle: 30, endAngle: 60, radius: 120 },
  { key: 'd', startAngle: 60, endAngle: 90, radius: 120 },
  { key: 'r', startAngle: 90, endAngle: 120, radius: 120 },
  { key: 'o', startAngle: 120, endAngle: 150, radius: 120 },
  { key: 'n', startAngle: 150, endAngle: 180, radius: 120 },

  // Bottom inner ring (most frequent)
  { key: 'a', startAngle: 0, endAngle: 90, radius: 60 }, // Third most common
  { key: 'i', startAngle: 90, endAngle: 180, radius: 60 }, // Fourth most common
];

const TOP_SPECIAL_KEYS: CircleKey[] = [
  { key: '~', startAngle: -180, endAngle: -160, radius: 180 },
  { key: '!', startAngle: -160, endAngle: -140, radius: 180 },
  { key: '@', startAngle: -140, endAngle: -120, radius: 180 },
  { key: '#', startAngle: -120, endAngle: -100, radius: 180 },
  { key: '$', startAngle: -100, endAngle: -80, radius: 180 },
  { key: '%', startAngle: -80, endAngle: -60, radius: 180 },
  { key: '^', startAngle: -60, endAngle: -40, radius: 180 },
  { key: '&', startAngle: -40, endAngle: -20, radius: 180 },
  { key: '*', startAngle: -20, endAngle: 0, radius: 180 },
];

export { CONTROL_BUTTONS, TOP_CIRCLE_KEYS, BOTTOM_CIRCLE_KEYS, TOP_SPECIAL_KEYS };
