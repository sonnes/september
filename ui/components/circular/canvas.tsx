"use client";
import React, { useEffect, useRef } from "react";

interface CircularKeyboardCanvasProps {
  dimensions: { width: number; height: number };
  isUpperCase: boolean;
  isNumberMode: boolean;
  isSmileyMode: boolean;
  hoveredSection: string | null;
  onLetterClick: (letter: string) => void;
  onControlClick: (control: string) => void;
  onHover: (section: string | null) => void;
}

const CircularKeyboardCanvas = ({
  dimensions,
  isUpperCase,
  isNumberMode,
  isSmileyMode,
  hoveredSection,
  onLetterClick,
  onControlClick,
  onHover,
}: CircularKeyboardCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Add control bar width constant
  const CONTROL_BAR_WIDTH = 60;

  // Add color variables
  const colors = {
    buttonBg:
      getComputedStyle(document.documentElement)
        .getPropertyValue("--button-bg")
        .trim() || "#666666",
    buttonHover:
      getComputedStyle(document.documentElement)
        .getPropertyValue("--button-hover")
        .trim() || "#555555",
    buttonStroke:
      getComputedStyle(document.documentElement)
        .getPropertyValue("--button-stroke")
        .trim() || "#505050",
    buttonText:
      getComputedStyle(document.documentElement)
        .getPropertyValue("--button-text")
        .trim() || "#ffffff",
  };

  // Update smiley keyboard layout
  const smileyKeyboard = {
    upperHalf: {
      outerRing: ["😊", "😂", "🥰", "😍", "😎", "🤗"],
      middleRing: ["😄", "😅", "😆", "😉", "😋"],
      innerRing: ["❤️"],
    },
    lowerHalf: {
      outerRing: ["😭", "🥺", "😢", "😩", "😤", "😡", "🤬"],
      middleRing: ["😐", "😑", "😒", "😕", "😔", "😪"],
      innerRing: ["💔"],
    },
    controlBar: ["⇧", "ABC", "123", "⎵", "return", "⌫"],
  };

  // Update number keyboard layout
  const numberKeyboard = {
    upperHalf: {
      outerRing: ["!", "@", "#", "$", "%", "&"],
      middleRing: ["1", "2", "3", "4", "5"],
      innerRing: ["0"],
    },
    lowerHalf: {
      outerRing: ["*", "(", ")", "-", "+", "=", "/"],
      middleRing: ["6", "7", "8", "9", ".", ","],
      innerRing: ["?"],
    },
    controlBar: ["⇧", "ABC", "☺", "⎵", "return", "⌫"],
  };

  // Update letter keyboard layout
  const letterKeyboard = {
    upperHalf: {
      outerRing: ["k", "x", "j", "z", "q", "a"],
      middleRing: ["l", "h", "d", "c", "u"],
      innerRing: ["t"],
    },
    lowerHalf: {
      outerRing: ["b", "s", "n", "w", "g", "p", "y"],
      middleRing: ["r", "f", "v", "i", "o", "m"],
      innerRing: ["e"],
    },
    controlBar: ["⇧", "123", "☺", "⎵", "return", "⌫"],
  };

  // Update keyboard selection logic
  const keyboard = isSmileyMode
    ? smileyKeyboard
    : isNumberMode
    ? numberKeyboard
    : letterKeyboard;

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Adjust center coordinates to account for control bar
    const centerX =
      CONTROL_BAR_WIDTH + (dimensions.width - CONTROL_BAR_WIDTH) / 2;
    const centerY = dimensions.height / 2;

    // Check control bar on left
    if (x <= CONTROL_BAR_WIDTH) {
      const buttonHeight = dimensions.height / keyboard.controlBar.length;
      const buttonIndex = Math.floor(y / buttonHeight);
      const button = keyboard.controlBar[buttonIndex];
      onControlClick(button);
      return;
    }

    // Calculate distance and angle for sector detection
    const distance = Math.sqrt(
      Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
    );
    let angle = Math.atan2(y - centerY, x - centerX) + Math.PI / 2;
    if (angle < 0) angle += 2 * Math.PI;

    // Determine which letter was clicked
    let letter = "";
    const isUpperHalf = angle <= Math.PI;
    const half = isUpperHalf ? "upperHalf" : "lowerHalf";

    const ringData = {
      inner: { maxRadius: 60, letters: keyboard[half].innerRing },
      middle: { maxRadius: 120, letters: keyboard[half].middleRing },
      outer: { maxRadius: 180, letters: keyboard[half].outerRing },
    };

    for (const [ring, { maxRadius, letters }] of Object.entries(ringData)) {
      if (distance < maxRadius) {
        if (ring === "inner") {
          letter = letters[0];
        } else {
          const sectionAngle = Math.PI / letters.length;
          const section = Math.floor((angle % Math.PI) / sectionAngle);
          if (section >= 0 && section < letters.length) {
            letter = letters[section];
          }
        }
        break;
      }
    }

    if (letter) {
      onLetterClick(
        isNumberMode ? letter : isUpperCase ? letter.toUpperCase() : letter
      );
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Adjust center coordinates
    const centerX =
      CONTROL_BAR_WIDTH + (dimensions.width - CONTROL_BAR_WIDTH) / 2;
    const centerY = dimensions.height / 2;

    // Check control bar on left
    if (x <= CONTROL_BAR_WIDTH) {
      const buttonHeight = dimensions.height / keyboard.controlBar.length;
      const buttonIndex = Math.floor(y / buttonHeight);
      if (buttonIndex >= 0 && buttonIndex < keyboard.controlBar.length) {
        onHover(`control-${buttonIndex}`);
        return;
      }
    }

    const distance = Math.sqrt(
      Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
    );

    let angle = Math.atan2(y - centerY, x - centerX) + Math.PI / 2;
    if (angle < 0) angle += 2 * Math.PI;

    let ring = "";
    if (distance < 60) ring = "inner";
    else if (distance < 120) ring = "middle";
    else if (distance < 180) ring = "outer";
    else {
      onHover(null);
      return;
    }

    const isUpperHalf = angle <= Math.PI;
    const half = isUpperHalf ? "upper" : "lower";
    const ringKey = `${ring}Ring` as "outerRing" | "middleRing" | "innerRing";
    const letters = keyboard[`${half}Half`][ringKey];

    const sectionAngle = Math.PI / letters.length;
    const section = Math.floor((angle % Math.PI) / sectionAngle);

    if (section >= 0 && section < letters.length) {
      onHover(`${half}-${ring}-${section}`);
    } else {
      onHover(null);
    }
  };

  // Update useEffect with drawing code
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Set up high-DPI canvas
    const dpr = 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    // Adjust center coordinates
    const centerX =
      CONTROL_BAR_WIDTH + (dimensions.width - CONTROL_BAR_WIDTH) / 2;
    const centerY = dimensions.height / 2;

    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    const radii = {
      outer: 180,
      middle: 120,
      inner: 60,
    };

    const drawSector = (
      radius: number,
      startAngle: number,
      endAngle: number,
      text: string,
      ring: string,
      half: string,
      index: number
    ) => {
      const sectionId = `${half}-${ring}-${index}`;
      const isHovered = hoveredSection === sectionId;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.lineTo(centerX, centerY);
      ctx.fillStyle = isHovered ? colors.buttonHover : colors.buttonBg;
      ctx.fill();
      ctx.strokeStyle = colors.buttonStroke;
      ctx.stroke();

      if (text) {
        const textRadius =
          ring === "outer"
            ? radius - 30
            : ring === "middle"
            ? radius - 25
            : radius - 20;
        const textAngle = (startAngle + endAngle) / 2;
        const textX = centerX + Math.cos(textAngle) * textRadius;
        const textY = centerY + Math.sin(textAngle) * textRadius;

        ctx.save();
        ctx.translate(textX, textY);
        ctx.fillStyle = colors.buttonText;
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
          isNumberMode ? text : isUpperCase ? text.toUpperCase() : text,
          0,
          0
        );
        ctx.restore();
      }
    };

    const drawHalf = (
      half: { outerRing: string[]; middleRing: string[]; innerRing: string[] },
      startAngle: number,
      endAngle: number,
      halfName: string
    ) => {
      const rings = ["outer", "middle", "inner"] as const;
      rings.forEach((ring) => {
        const letters = half[`${ring}Ring`];
        const radius = radii[ring];
        const angleSize =
          ring === "inner"
            ? endAngle - startAngle
            : (endAngle - startAngle) / letters.length;

        letters.forEach((letter: string, i: number) => {
          drawSector(
            radius,
            startAngle + i * angleSize,
            startAngle + (i + 1) * angleSize,
            letter,
            ring,
            halfName,
            i
          );
        });
      });
    };

    // Draw circles first
    drawHalf(keyboard.upperHalf, -Math.PI / 2, Math.PI / 2, "upper");
    drawHalf(keyboard.lowerHalf, Math.PI / 2, Math.PI * 1.5, "lower");

    // Draw control bar on left
    const buttonHeight = dimensions.height / keyboard.controlBar.length;
    keyboard.controlBar.forEach((button, i) => {
      const isHovered = hoveredSection === `control-${i}`;
      ctx.fillStyle = isHovered ? colors.buttonHover : colors.buttonBg;
      ctx.fillRect(0, i * buttonHeight, CONTROL_BAR_WIDTH, buttonHeight);

      ctx.strokeStyle = colors.buttonStroke;
      ctx.strokeRect(0, i * buttonHeight, CONTROL_BAR_WIDTH, buttonHeight);

      ctx.fillStyle = colors.buttonText;
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Save context for text rotation
      ctx.save();
      ctx.translate(CONTROL_BAR_WIDTH / 2, i * buttonHeight + buttonHeight / 2);
      ctx.fillText(button, 0, 0);
      ctx.restore();
    });
  }, [dimensions, hoveredSection, isUpperCase, isNumberMode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
      }}
      className="rounded-lg cursor-pointer shrink-0"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => onHover(null)}
      onClick={handleClick}
    />
  );
};

export default CircularKeyboardCanvas;
