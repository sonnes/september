import React, { useEffect, useRef } from 'react';

interface CircularKeyboardProps {
  onKeyPress: (key: string) => void;
  width?: number;
  height?: number;
}

export const CircularKeyboard: React.FC<CircularKeyboardProps> = ({
  onKeyPress,
  width = 400,
  height = 400,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverCoords, setHoverCoords] = React.useState<{ x: number; y: number } | null>(null);

  // Constants for keyboard layout
  const CENTER_X = width / 2;
  const CENTER_Y = height / 2;
  const INNER_RADIUS = 60;
  const MIDDLE_RADIUS = 120;
  const OUTER_RADIUS = 180;

  const drawControlBar = (ctx: CanvasRenderingContext2D) => {
    const barWidth = 300;
    const barHeight = 40;
    const x = CENTER_X - barWidth / 2;
    const y = CENTER_Y - barHeight / 2;
    const buttons = ['⇧', '☺', '123', '␣', '⌫'];
    const buttonWidth = barWidth / buttons.length;

    // Draw control bar background
    ctx.fillStyle = '#f0f0f0';
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 20);
    ctx.fill();
    ctx.stroke();

    // Helper function to check if point is inside button
    const isPointInButton = (px: number, py: number, buttonIndex: number) => {
      const buttonX = x + buttonWidth * buttonIndex;
      return px >= buttonX && px <= buttonX + buttonWidth && py >= y && py <= y + barHeight;
    };

    // Draw control buttons
    buttons.forEach((button, index) => {
      const buttonX = x + buttonWidth * index;
      const isHovered = hoverCoords && isPointInButton(hoverCoords.x, hoverCoords.y, index);

      // Draw button background
      ctx.fillStyle = isHovered ? '#e0e0e0' : '#f0f0f0';
      ctx.beginPath();

      if (index === 0) {
        // First button - round left corners
        ctx.roundRect(buttonX, y, buttonWidth, barHeight, [20, 0, 0, 20]);
      } else if (index === buttons.length - 1) {
        // Last button - round right corners
        ctx.roundRect(buttonX, y, buttonWidth, barHeight, [0, 20, 20, 0]);
      } else {
        // Middle buttons - no rounded corners
        ctx.rect(buttonX, y, buttonWidth, barHeight);
      }

      ctx.fill();
      ctx.stroke();

      // Draw button text
      ctx.fillStyle = '#333';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(button, buttonX + buttonWidth / 2, y + barHeight / 2);
    });
  };

  const isPointInSector = (
    x: number,
    y: number,
    centerX: number,
    centerY: number,
    startAngle: number,
    endAngle: number,
    innerRadius: number,
    outerRadius: number
  ): boolean => {
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
    const normalizedStartAngle = startAngle < 0 ? startAngle + 2 * Math.PI : startAngle;
    const normalizedEndAngle = endAngle < 0 ? endAngle + 2 * Math.PI : endAngle;

    return (
      distance >= innerRadius &&
      distance <= outerRadius &&
      normalizedAngle >= normalizedStartAngle &&
      normalizedAngle <= normalizedEndAngle
    );
  };

  const drawHalf = (
    ctx: CanvasRenderingContext2D,
    startAngle: number,
    endAngle: number,
    keys: { inner: string[]; middle: string[]; outer: string[] },
    yOffset: number
  ) => {
    // Helper function to adjust coordinates with offset
    const adjustedArc = (radius: number, angle: number) => {
      const x = CENTER_X + Math.cos(angle) * radius;
      const y = CENTER_Y + Math.sin(angle) * radius + yOffset;
      return { x, y };
    };

    // Modified drawSector to handle the offset
    const drawOffsetSector = (
      startAngle: number,
      endAngle: number,
      innerRadius: number,
      outerRadius: number,
      text: string,
      isHovered: boolean
    ) => {
      // Draw sector background
      ctx.fillStyle = isHovered ? '#e0e0e0' : '#f0f0f0';
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 1;

      ctx.beginPath();

      // Draw the sector path
      const outerStart = adjustedArc(outerRadius, startAngle);
      const innerEnd = adjustedArc(innerRadius, endAngle);

      ctx.moveTo(outerStart.x, outerStart.y);
      ctx.arc(CENTER_X, CENTER_Y + yOffset, outerRadius, startAngle, endAngle);
      ctx.lineTo(innerEnd.x, innerEnd.y);
      ctx.arc(CENTER_X, CENTER_Y + yOffset, innerRadius, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fill();
      ctx.stroke();

      // Draw text
      const textAngle = (startAngle + endAngle) / 2;
      const textRadius = (innerRadius + outerRadius) / 2;
      const textPoint = adjustedArc(textRadius, textAngle);

      ctx.fillStyle = '#333';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, textPoint.x, textPoint.y);
    };

    // Draw inner section
    const innerStep = (endAngle - startAngle) / keys.inner.length;
    keys.inner.forEach((key, i) => {
      const sectorStart = startAngle + i * innerStep;
      const sectorEnd = startAngle + (i + 1) * innerStep;
      const isHovered = hoverCoords
        ? isPointInSector(
            hoverCoords.x,
            hoverCoords.y - yOffset, // Adjust for offset when checking hover
            CENTER_X,
            CENTER_Y,
            sectorStart,
            sectorEnd,
            0,
            INNER_RADIUS
          )
        : false;
      drawOffsetSector(sectorStart, sectorEnd, 0, INNER_RADIUS, key, isHovered);
    });

    // Draw middle section
    const middleStep = (endAngle - startAngle) / keys.middle.length;
    keys.middle.forEach((key, i) => {
      const sectorStart = startAngle + i * middleStep;
      const sectorEnd = startAngle + (i + 1) * middleStep;
      const isHovered = hoverCoords
        ? isPointInSector(
            hoverCoords.x,
            hoverCoords.y - yOffset, // Adjust for offset when checking hover
            CENTER_X,
            CENTER_Y,
            sectorStart,
            sectorEnd,
            INNER_RADIUS,
            MIDDLE_RADIUS
          )
        : false;
      drawOffsetSector(sectorStart, sectorEnd, INNER_RADIUS, MIDDLE_RADIUS, key, isHovered);
    });

    // Draw outer section
    const outerStep = (endAngle - startAngle) / keys.outer.length;
    keys.outer.forEach((key, i) => {
      const sectorStart = startAngle + i * outerStep;
      const sectorEnd = startAngle + (i + 1) * outerStep;
      const isHovered = hoverCoords
        ? isPointInSector(
            hoverCoords.x,
            hoverCoords.y - yOffset, // Adjust for offset when checking hover
            CENTER_X,
            CENTER_Y,
            sectorStart,
            sectorEnd,
            MIDDLE_RADIUS,
            OUTER_RADIUS
          )
        : false;
      drawOffsetSector(sectorStart, sectorEnd, MIDDLE_RADIUS, OUTER_RADIUS, key, isHovered);
    });
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check control bar buttons first
    const barWidth = 300;
    const barHeight = 40;
    const barX = CENTER_X - barWidth / 2;
    const barY = CENTER_Y - barHeight / 2;
    const buttons = ['⇧', '☺', '123', '␣', '⌫'];
    const buttonWidth = barWidth / buttons.length;

    // Check if click is in control bar area
    if (y >= barY && y <= barY + barHeight && x >= barX && x <= barX + barWidth) {
      const buttonIndex = Math.floor((x - barX) / buttonWidth);
      const button = buttons[buttonIndex];

      switch (button) {
        case '␣':
          onKeyPress(' ');
          break;
        case '⌫':
          onKeyPress('Backspace');
          break;
        case '⇧':
          onKeyPress('Shift');
          break;
        case '☺':
          onKeyPress('Emoji');
          break;
        case '123':
          onKeyPress('Numbers');
          break;
      }
      return;
    }

    // Helper function to check which sector was clicked
    const checkSectorClick = (
      startAngle: number,
      endAngle: number,
      keys: string[],
      innerRadius: number,
      outerRadius: number,
      yOffset: number
    ): string | null => {
      const step = (endAngle - startAngle) / keys.length;

      for (let i = 0; i < keys.length; i++) {
        const sectorStart = startAngle + i * step;
        const sectorEnd = startAngle + (i + 1) * step;

        if (
          isPointInSector(
            x,
            y - yOffset,
            CENTER_X,
            CENTER_Y,
            sectorStart,
            sectorEnd,
            innerRadius,
            outerRadius
          )
        ) {
          return keys[i];
        }
      }
      return null;
    };

    // Check top half
    const topKeys = {
      inner: ['t', 'c'],
      middle: ['h', 'd', 'u', 'm', 'q'],
      outer: ['v', 'k', 'x', 'j', 'z', 'l', 'h'],
    };

    // Check bottom half
    const bottomKeys = {
      inner: ['e', 'a'],
      middle: ['s', 'n', 'o', 'p', 'f'],
      outer: ['b', 'y', 'w', 'g', 'i', 'p', 'f'],
    };

    // Check each section in both halves
    const sections = [
      { keys: topKeys.inner, innerRadius: 0, outerRadius: INNER_RADIUS, yOffset: -10 },
      { keys: topKeys.middle, innerRadius: INNER_RADIUS, outerRadius: MIDDLE_RADIUS, yOffset: -10 },
      { keys: topKeys.outer, innerRadius: MIDDLE_RADIUS, outerRadius: OUTER_RADIUS, yOffset: -10 },
      { keys: bottomKeys.inner, innerRadius: 0, outerRadius: INNER_RADIUS, yOffset: 10 },
      {
        keys: bottomKeys.middle,
        innerRadius: INNER_RADIUS,
        outerRadius: MIDDLE_RADIUS,
        yOffset: 10,
      },
      {
        keys: bottomKeys.outer,
        innerRadius: MIDDLE_RADIUS,
        outerRadius: OUTER_RADIUS,
        yOffset: 10,
      },
    ];

    for (const section of sections) {
      const key = checkSectorClick(
        section.yOffset < 0 ? -Math.PI : 0,
        section.yOffset < 0 ? 0 : Math.PI,
        section.keys,
        section.innerRadius,
        section.outerRadius,
        section.yOffset
      );

      if (key) {
        onKeyPress(key);
        return;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHoverCoords({ x, y });
  };

  const handleMouseLeave = () => {
    setHoverCoords(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw top half
    const topKeys = {
      inner: ['t', 'c'],
      middle: ['h', 'd', 'u', 'm', 'q'],
      outer: ['v', 'k', 'x', 'j', 'z', 'l', 'h'],
    };
    drawHalf(ctx, -Math.PI, 0, topKeys, -10);

    // Draw bottom half
    const bottomKeys = {
      inner: ['e', 'a'],
      middle: ['s', 'n', 'o', 'p', 'f'],
      outer: ['b', 'y', 'w', 'g', 'i', 'p', 'f'],
    };
    drawHalf(ctx, 0, Math.PI, bottomKeys, 10);

    // Draw control bar
    drawControlBar(ctx);
  }, [hoverCoords]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: 'pointer' }}
    />
  );
};
