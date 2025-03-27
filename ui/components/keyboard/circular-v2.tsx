'use client';

import React, { useEffect, useRef } from 'react';

import { Arc, Group, Layer, Rect, Stage, Text } from 'react-konva';

import { KeyboardProps } from './types';

interface ControlButton {
  key: string;
  label: string;
  width: number;
}

interface CircleKey {
  key: string;
  startAngle: number;
  endAngle: number;
  radius: number;
}

const BAR_HEIGHT = 45;
const BUTTON_SPACING = 1;
const CONTROL_BUTTONS: ControlButton[] = [
  { key: 'Special', label: '@$%', width: 60 },
  { key: 'Shift', label: '⇧', width: 60 },
  { key: 'Space', label: 'space', width: 180 },
  { key: 'Backspace', label: 'del', width: 60 },
  { key: 'Enter', label: '↵', width: 60 },
];

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
  { key: 'b', startAngle: -180, endAngle: -150, radius: 120 },
  { key: 'f', startAngle: -150, endAngle: -120, radius: 120 },
  { key: 'm', startAngle: -120, endAngle: -90, radius: 120 },
  { key: 'c', startAngle: -90, endAngle: -60, radius: 120 },
  { key: 'l', startAngle: -60, endAngle: -30, radius: 120 },
  { key: 'g', startAngle: -30, endAngle: 0, radius: 120 },

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

// Add a mapping for number to special character conversion
const SHIFT_NUMBER_MAP: { [key: string]: string } = {
  '0': ')',
  '1': '!',
  '2': '@',
  '3': '#',
  '4': '$',
  '5': '%',
  '6': '^',
  '7': '&',
  '8': '*',
  '9': '(',
};

export function CircularKeyboard({ onKeyPress }: KeyboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = React.useState({ width: 0, height: 0 });
  const [isShiftPressed, setIsShiftPressed] = React.useState(false);
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      setStageSize({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
    }
  }, []);

  const handleButtonClick = (key: string) => {
    if (key === 'Shift') {
      setIsShiftPressed(!isShiftPressed);
    } else if (onKeyPress) {
      if (isShiftPressed) {
        if (/^[a-z]$/.test(key)) {
          onKeyPress(key.toUpperCase());
        } else if (/^[0-9]$/.test(key)) {
          onKeyPress(SHIFT_NUMBER_MAP[key]);
        } else {
          onKeyPress(key);
        }
        setIsShiftPressed(false);
      } else {
        onKeyPress(key);
      }
    }
  };

  const renderKeys = (centerX: number, centerY: number, keys: CircleKey[]) => {
    return keys.map(key => {
      const midAngle = (key.startAngle + key.endAngle) / 2;
      const midAngleRad = (midAngle * Math.PI) / 180;
      const textRadius = key.radius - 25;
      const textX = centerX + textRadius * Math.cos(midAngleRad);
      const textY = centerY + textRadius * Math.sin(midAngleRad);

      let displayKey = key.key;
      if (isShiftPressed) {
        if (/^[a-z]$/.test(key.key)) {
          displayKey = key.key.toUpperCase();
        } else if (/^[0-9]$/.test(key.key)) {
          displayKey = SHIFT_NUMBER_MAP[key.key];
        }
      }

      const isHovered = hoveredKey === key.key;

      return (
        <Group
          key={key.key}
          onMouseEnter={() => setHoveredKey(key.key)}
          onMouseLeave={() => setHoveredKey(null)}
          onClick={() => handleButtonClick(key.key)}
          onTap={() => handleButtonClick(key.key)}
        >
          <Arc
            x={centerX}
            y={centerY}
            innerRadius={key.radius - 60}
            outerRadius={key.radius}
            angle={key.endAngle - key.startAngle}
            rotation={key.startAngle}
            fill={
              isHovered ? '#e8e8e8' : isShiftPressed && key.key === 'Shift' ? '#e0e0e0' : '#f1f1f1'
            }
            stroke={isHovered ? '#cccccc' : '#dddddd'}
            strokeWidth={1}
          />
          <Text
            x={textX - 15}
            y={textY - 10}
            width={30}
            height={20}
            text={displayKey}
            align="center"
            verticalAlign="middle"
            fill={isHovered ? '#000000' : '#333333'}
            fontSize={18}
            fontWeight={400}
            fontFamily="system-ui, -apple-system, sans-serif"
          />
        </Group>
      );
    });
  };

  const renderControlButtons = () => {
    const totalWidth = CONTROL_BUTTONS.reduce((acc, button) => acc + button.width, 0);
    let xOffset = (stageSize.width - totalWidth) / 2;

    const buttons = [
      <Rect
        key="background"
        x={xOffset}
        y={BUTTON_SPACING}
        width={totalWidth}
        height={BAR_HEIGHT}
        fill="#f1f1f1"
        cornerRadius={22}
        shadowColor="rgba(0, 0, 0, 0.1)"
        shadowBlur={4}
        shadowOffset={{ x: 0, y: 2 }}
        shadowOpacity={0.3}
      />,
    ];

    CONTROL_BUTTONS.forEach((button, index) => {
      if (index < CONTROL_BUTTONS.length - 1) {
        buttons.push(
          <Rect
            key={`divider-${index}`}
            x={xOffset + button.width}
            y={BUTTON_SPACING + BAR_HEIGHT * 0.2}
            width={1}
            height={BAR_HEIGHT * 0.6}
            fill="#e0e0e0"
          />
        );
      }

      const isHovered = hoveredKey === button.key;

      buttons.push(
        <Group
          key={button.key}
          onClick={() => handleButtonClick(button.key)}
          onMouseEnter={() => setHoveredKey(button.key)}
          onMouseLeave={() => setHoveredKey(null)}
        >
          <Rect
            x={xOffset}
            y={BUTTON_SPACING}
            width={button.width}
            height={BAR_HEIGHT}
            fill={isHovered ? '#e8e8e8' : '#f1f1f1'}
            opacity={0.5}
          />
          <Text
            x={xOffset}
            y={BUTTON_SPACING}
            width={button.width}
            height={BAR_HEIGHT}
            text={button.label}
            align="center"
            verticalAlign="middle"
            fill={isHovered ? '#000000' : '#333333'}
            fontSize={16}
            fontFamily="system-ui, -apple-system, sans-serif"
          />
        </Group>
      );

      xOffset += button.width;
    });

    return buttons;
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '600px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Stage width={stageSize.width} height={stageSize.height}>
        <Layer>
          <Group>{renderKeys(stageSize.width / 2, stageSize.height / 2, TOP_CIRCLE_KEYS)}</Group>
          <Group y={stageSize.height / 2}>{renderControlButtons()}</Group>
          <Group>
            {renderKeys(stageSize.width / 2, stageSize.height / 2 + 47, BOTTOM_CIRCLE_KEYS)}
          </Group>
        </Layer>
      </Stage>
    </div>
  );
}
