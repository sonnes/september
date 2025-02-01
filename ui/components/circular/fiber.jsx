"use client";

import * as THREE from "three";
import React, { useRef, useState } from "react";
import {
  extend,
  Canvas as FiberCanvas,
  useFrame,
  useThree,
} from "@react-three/fiber";
import { Text } from "@react-three/drei";

// Extend Three.js elements
extend({ Canvas: FiberCanvas });

const colors = {
  buttonBg: "#444444", // Dark gray for the control bar background
  buttonHover: "#aaaaaa", // Slightly lighter gray for hover
  buttonStroke: "#666666", // Border color
  buttonText: "#ffffff", // White text
  buttonTextHover: "#aaaaaa", // Lighter text color for hover
};

const controlBar = ["⇧", "ABC", "☺", "⎵", "return", "⌫"];

function ControlButton({ text, position, index }) {
  const [hovered, setHovered] = useState(false);
  const buttonWidth = 0.8;
  const buttonHeight = 0.5;

  return (
    <group
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Hover indicator */}
      {hovered && (
        <mesh position={[0, 0, 0.005]}>
          <planeGeometry args={[buttonWidth, buttonHeight]} />
          <meshStandardMaterial
            color={colors.buttonHover}
            transparent
            opacity={0.5}
          />
        </mesh>
      )}
      <Text
        position={[0, 0, 0.01]}
        fontSize={0.2}
        color={hovered ? colors.buttonTextHover : colors.buttonText}
        anchorX="center"
        anchorY="middle"
      >
        {text === "⎵" ? "space" : text}
      </Text>
    </group>
  );
}

function ControlBar() {
  const buttonSpacing = 1;
  const totalWidth = controlBar.length * buttonSpacing;
  const startX = -totalWidth / 2 + buttonSpacing / 2;
  const barHeight = 0.8;
  const cornerRadius = 0.4;

  return (
    <group>
      {/* Rounded background bar */}
      <mesh>
        <roundedPlaneGeometry
          args={[totalWidth + 1, barHeight, cornerRadius]}
        />
        <meshStandardMaterial color={colors.buttonBg} />
      </mesh>
      {controlBar.map((text, index) => (
        <ControlButton
          key={text}
          text={text}
          position={[startX + index * buttonSpacing, 0, 0]}
          index={index}
        />
      ))}
    </group>
  );
}

function Sector({ radius, startAngle, endAngle, text, position, isHovered }) {
  const points = [];
  const segments = 32;
  const angleStep = (endAngle - startAngle) / segments;
  const [hovered, setHovered] = useState(false);

  // Create sector shape
  points.push(new THREE.Vector2(0, 0));
  for (let i = 0; i <= segments; i++) {
    const angle = startAngle + angleStep * i;
    points.push(
      new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius)
    );
  }

  const shape = new THREE.Shape(points);

  return (
    <group position={position}>
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial
          color={hovered ? colors.buttonHover : colors.buttonBg}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Text
        position={[
          Math.cos((startAngle + endAngle) / 2) * (radius * 0.7),
          Math.sin((startAngle + endAngle) / 2) * (radius * 0.7),
          0.1,
        ]}
        fontSize={0.3}
        color={colors.buttonText}
      >
        {text}
      </Text>
    </group>
  );
}

function CircularKeyboard() {
  const [hoveredSection, setHoveredSection] = useState(null);

  // Define keyboard layouts
  const keyboard = {
    upperHalf: {
      outerRing: ["k", "x", "j", "z", "q"],
      middleRing: ["h", "l", "d", "c", "u", "m"],
      innerRing: ["t"],
    },
  };

  return (
    <group position={[0, 1, 0]}>
      {/* Outer Ring */}
      {keyboard.upperHalf.outerRing.map((letter, index) => {
        const totalLetters = keyboard.upperHalf.outerRing.length;
        const startAngle = (index * Math.PI) / totalLetters;
        const endAngle = ((index + 1) * Math.PI) / totalLetters;

        return (
          <Sector
            key={`outer-${index}`}
            radius={2}
            startAngle={startAngle}
            endAngle={endAngle}
            text={letter}
            position={[0, 0, 0]}
          />
        );
      })}

      {/* Middle Ring */}
      {keyboard.upperHalf.middleRing.map((letter, index) => {
        const totalLetters = keyboard.upperHalf.middleRing.length;
        const startAngle = (index * Math.PI) / totalLetters;
        const endAngle = ((index + 1) * Math.PI) / totalLetters;

        return (
          <Sector
            key={`middle-${index}`}
            radius={1.5}
            startAngle={startAngle}
            endAngle={endAngle}
            text={letter}
            position={[0, 0, 0]}
          />
        );
      })}

      {/* Inner Ring - Center Letter */}
      <Text
        position={[0, 0, 0.1]}
        fontSize={0.3}
        color={colors.buttonText}
        anchorX="center"
        anchorY="middle"
      >
        {keyboard.upperHalf.innerRing[0]}
      </Text>

      <ControlBar />
    </group>
  );
}

// Add RoundedPlaneGeometry class before the components
class RoundedPlaneGeometry extends THREE.ExtrudeGeometry {
  constructor(width = 1, height = 1, radius = 0.2) {
    const shape = new THREE.Shape();
    const x = -width / 2;
    const y = -height / 2;

    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(
      x + width,
      y + height,
      x + width - radius,
      y + height
    );
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);

    const extrudeSettings = {
      steps: 1,
      depth: 0.01,
      bevelEnabled: false,
    };

    super(shape, extrudeSettings);
  }
}

// Register the custom geometry
extend({ RoundedPlaneGeometry: RoundedPlaneGeometry });

export default function CircularKeyboardFiber() {
  return (
    <FiberCanvas
      camera={{ position: [0, 0, 5], fov: 75 }}
      style={{ width: "500px", height: "400px" }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <CircularKeyboard />
    </FiberCanvas>
  );
}
