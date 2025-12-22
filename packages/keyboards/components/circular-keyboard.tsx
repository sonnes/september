'use client';

import React, { useEffect, useRef } from 'react';

import { Arc, Group, Layer, Rect, Stage, Text } from 'react-konva';

import {
  CONTROL_BUTTONS,
  getBottomCircleKeys,
  getBottomSpecialKeys,
  getTopCircleKeys,
  getTopSpecialKeys,
} from '../lib/keys';
import { CircleKey } from '../types';

interface CircularKeyboardProps {
  className?: string;
  onKeyPress: (key: string) => void;
}

const BAR_HEIGHT = 45;
const BUTTON_SPACING = 1;

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

export function CircularKeyboard({ className = '', onKeyPress }: CircularKeyboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = React.useState({ width: 0, height: 0 });
  const [isShiftPressed, setIsShiftPressed] = React.useState(false);
  const [isSpecialPressed, setIsSpecialPressed] = React.useState(false);
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);
  const [isMounted, setIsMounted] = React.useState(false);

  useEffect(() => {
    setIsMounted(true);
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    return () => {
      window.removeEventListener('resize', updateSize);
      setIsMounted(false);
    };
  }, []);

  const handleButtonClick = (key: string) => {
    if (key === 'Shift') {
      setIsShiftPressed(!isShiftPressed);
    } else if (key === 'Special') {
      setIsSpecialPressed(!isSpecialPressed);
    } else if (key === 'Space') {
      onKeyPress('SPACE');
      setIsShiftPressed(false);
    } else if (key === 'Backspace') {
      onKeyPress('BACKSPACE');
      setIsShiftPressed(false);
    } else if (key === 'Enter') {
      onKeyPress('ENTER');
      setIsShiftPressed(false);
    } else {
      let transformedKey = key;
      if (isShiftPressed) {
        if (/^[a-z]$/.test(key)) {
          transformedKey = key.toUpperCase();
        } else if (/^[0-9]$/.test(key)) {
          transformedKey = SHIFT_NUMBER_MAP[key];
        }
        setIsShiftPressed(false);
      } else {
        // Letters should be lowercase like qwerty keyboard
        if (/^[a-z]$/.test(key)) {
          transformedKey = key.toLowerCase();
        }
      }
      onKeyPress(transformedKey);
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
        stroke="#dddddd"
        strokeWidth={1}
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

  const topKeys = isSpecialPressed ? getTopSpecialKeys() : getTopCircleKeys();
  const bottomKeys = isSpecialPressed ? getBottomSpecialKeys() : getBottomCircleKeys();

  return (
    <div className={`bg-white mt-2 border-t border-zinc-200 p-2 sm:p-4 ${className}`}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '420px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isMounted && stageSize.width > 0 && stageSize.height > 0 && (
          <Stage width={stageSize.width} height={stageSize.height}>
            <Layer>
              <Group>{renderKeys(stageSize.width / 2, stageSize.height / 2 - 30, topKeys)}</Group>
              <Group>{renderKeys(stageSize.width / 2, stageSize.height / 2 - 5, bottomKeys)}</Group>
            </Layer>
            <Layer>
              <Group y={stageSize.height / 2 - 40}>{renderControlButtons()}</Group>
            </Layer>
          </Stage>
        )}
      </div>
    </div>
  );
}

