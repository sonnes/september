import { ControlButton } from './types';

export const CONTROL_BUTTONS: ControlButton[] = [
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
  const outerRing = createCircleKeys(['~', '`', '#', '^', '&', '?', '|', '<', '>', '°'], -180, 180);
  // Medium frequency special characters in middle ring
  const middleRing = createCircleKeys(['!', '$', '%', '§', '*', '+'], -180, 120);
  // Most frequently used special characters in inner ring
  const innerRing = createCircleKeys(['@', '.'], -180, 60);

  return [...outerRing, ...middleRing, ...innerRing];
}

export function getBottomSpecialKeys() {
  // Least frequently used special characters in outer ring
  const outerRing = createCircleKeys(['(', ')', '{', '}', '[', ']', ':', ';', '/', '\\'], 0, 180);
  // Medium frequency special characters in middle ring
  const middleRing = createCircleKeys(['-', '_', '=', '±', '°', '×'], 0, 120);
  // Most frequently used special characters in inner ring
  const innerRing = createCircleKeys(['"', "'"], 0, 60);

  return [...outerRing, ...middleRing, ...innerRing];
}

