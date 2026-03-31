"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Canvas, ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

export type HoldType = "jug" | "sloper" | "crimp" | "pinch" | "pocket" | "edge";

export interface HoldSubtype {
  id: string;
  label: string;
  scale: number;
  params: number[];
}

interface Hold {
  id: number;
  wallId: number;
  localPosition: [number, number, number];
  color: string;
  holdType: HoldType;
  holdSubtype: string;
  rotation: number;
}

interface Wall {
  id: number;
  angle: number;
  bottomY: number;
  z: number;
  x: number;
  width: number;
  holds: Hold[];
}

const PANEL_WIDTH = 2.4;
const PANEL_HEIGHT = 3.0;
const FLOOR_Y = -0.5;

const TILT_OPTIONS = [
  { label: "0°", value: 0 },
  { label: "15°", value: Math.PI / 12 },
  { label: "30°", value: Math.PI / 6 },
  { label: "45°", value: Math.PI / 4 },
];

export const HOLD_SUBTYPES: Record<HoldType, HoldSubtype[]> = {
  jug: [
    { id: "jug-bowl", label: "碗形 Jug", scale: 1.2, params: [0.15, 0.12, 0.1, 16] },
    { id: "jug-oval", label: "椭圆 Jug", scale: 1.1, params: [0.12, 0.08, 0.09, 16] },
    { id: "jug-horn", label: "牛角 Jug", scale: 1.0, params: [0.1, 0.07, 0.08, 16] },
    { id: "jug-flat", label: "平面 Jug", scale: 1.3, params: [0.14, 0.06, 0.1, 16] },
    { id: "jug-dip", label: "双孔 Jug", scale: 1.0, params: [0.11, 0.08, 0.09, 16] },
  ],
  sloper: [
    { id: "sloper-hemi", label: "半球 Sloper", scale: 1.2, params: [0.1, 16, 16, 0, Math.PI] },
    { id: "sloper-wedge", label: "楔形 Sloper", scale: 1.1, params: [0.09, 0.07, 0.12, 12] },
    { id: "sloper-dome", label: "圆顶 Sloper", scale: 1.3, params: [0.11, 16, 16, 0, Math.PI / 2] },
    { id: "sloper-negative", label: "负角 Sloper", scale: 1.0, params: [0.1, 0.08, 0.06, 16] },
  ],
  crimp: [
    { id: "crimp-standard", label: "标准 Crimp", scale: 1.0, params: [0.08, 0.015, 0.05, 16] },
    { id: "crimp-open", label: "开放手 Crimp", scale: 1.1, params: [0.12, 0.02, 0.06, 16] },
    { id: "crimp-deep", label: "深 Crimp", scale: 0.9, params: [0.07, 0.03, 0.08, 12] },
    { id: "crimp-thin", label: "薄片 Crimp", scale: 0.8, params: [0.1, 0.01, 0.04, 16] },
  ],
  pinch: [
    { id: "pinch-standard", label: "标准 Pinch", scale: 1.1, params: [0.04, 0.1, 0.08, 16] },
    { id: "pinch-wide", label: "宽 Pinch", scale: 1.2, params: [0.06, 0.12, 0.1, 16] },
    { id: "pinch-slender", label: "狭长 Pinch", scale: 0.9, params: [0.03, 0.14, 0.06, 16] },
    { id: "pinch-thumb", label: "拇指 Pinch", scale: 1.0, params: [0.05, 0.08, 0.09, 16] },
  ],
  pocket: [
    { id: "pocket-1f", label: "1指 Pocket", scale: 0.9, params: [0.025, 0.06, 0.08, 12] },
    { id: "pocket-2f", label: "2指 Pocket", scale: 1.0, params: [0.04, 0.08, 0.1, 12] },
    { id: "pocket-3f", label: "3指 Pocket", scale: 1.2, params: [0.055, 0.1, 0.12, 12] },
    { id: "pocket-oval", label: "椭圆 Pocket", scale: 1.1, params: [0.06, 0.08, 0.1, 12] },
  ],
  edge: [
    { id: "edge-standard", label: "标准 Edge", scale: 1.1, params: [0.1, 0.02, 0.06, 16] },
    { id: "edge-deep", label: "深 Edge", scale: 1.0, params: [0.08, 0.035, 0.1, 12] },
    { id: "edge-rolled", label: "卷边 Edge", scale: 1.2, params: [0.11, 0.025, 0.07, 16] },
    { id: "edge-angled", label: "斜面 Edge", scale: 0.9, params: [0.09, 0.03, 0.065, 16] },
  ],
};

export const HOLD_TYPE_CONFIG: Record<HoldType, { label: string; color: string }> = {
  jug: { label: "Jug (大握)", color: "#e74c3c" },
  sloper: { label: "Sloper (斜面)", color: "#3498db" },
  crimp: { label: "Crimp (窄边)", color: "#2ecc71" },
  pinch: { label: "Pinch (捏握)", color: "#f39c12" },
  pocket: { label: "Pocket (扣点)", color: "#9b59b6" },
  edge: { label: "Edge (平边)", color: "#1abc9c" },
};

function createHoldGeometry(type: HoldType, subtypeId: string, color: string, isSelected: boolean): React.ReactElement {
  const scale = isSelected ? 1.15 : 1;
  const emissive = isSelected ? color : "#000000";
  const emissiveIntensity = isSelected ? 0.3 : 0;

  const material = (
    <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} emissive={emissive} emissiveIntensity={emissiveIntensity} />
  );

  switch (type) {
    case "jug": return createJugGeometry(subtypeId, scale, material);
    case "sloper": return createSloperGeometry(subtypeId, scale, material);
    case "crimp": return createCrimpGeometry(subtypeId, scale, material);
    case "pinch": return createPinchGeometry(subtypeId, scale, material);
    case "pocket": return createPocketGeometry(subtypeId, scale, material);
    case "edge": return createEdgeGeometry(subtypeId, scale, material);
    default: return <mesh scale={scale}><sphereGeometry args={[0.1, 16, 16]} />{material}</mesh>;
  }
}

function createJugGeometry(subtypeId: string, scale: number, material: React.ReactElement): React.ReactElement {
  switch (subtypeId) {
    case "jug-bowl":
      return <group scale={scale}><mesh><cylinderGeometry args={[0.12, 0.08, 0.1, 24]} />{material}</mesh><mesh position={[0, 0.03, 0]}><sphereGeometry args={[0.07, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#3a3a3a" roughness={0.9} side={THREE.DoubleSide} /></mesh><mesh position={[0, 0.05, 0]}><torusGeometry args={[0.1, 0.015, 8, 24]} />{material}</mesh></group>;
    case "jug-oval":
      return <group scale={scale}><mesh scale={[1.3, 1, 0.7]}><sphereGeometry args={[0.1, 24, 24]} />{material}</mesh><mesh position={[0, 0.02, 0]} scale={[1.1, 0.5, 0.6]}><sphereGeometry args={[0.06, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#3a3a3a" roughness={0.9} side={THREE.DoubleSide} /></mesh></group>;
    case "jug-horn":
      return <group scale={scale}><mesh position={[0.05, 0, 0]} rotation={[0, 0, 0.3]}><coneGeometry args={[0.04, 0.12, 12]} />{material}</mesh><mesh position={[-0.05, 0, 0]} rotation={[0, 0, -0.3]}><coneGeometry args={[0.04, 0.12, 12]} />{material}</mesh><mesh position={[0, -0.04, 0]}><boxGeometry args={[0.14, 0.04, 0.06]} />{material}</mesh></group>;
    case "jug-flat":
      return <group scale={scale}><mesh position={[0, 0.02, 0]}><boxGeometry args={[0.16, 0.04, 0.1]} />{material}</mesh><mesh position={[0, 0, 0]}><boxGeometry args={[0.14, 0.02, 0.08]} /><meshStandardMaterial color="#2a2a2a" roughness={0.9} /></mesh></group>;
    case "jug-dip":
      return <group scale={scale}><mesh><cylinderGeometry args={[0.1, 0.08, 0.08, 20]} />{material}</mesh><mesh position={[-0.035, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.025, 0.025, 0.12, 12]} /><meshStandardMaterial color="#2a2a2a" roughness={0.9} /></mesh><mesh position={[0.035, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.025, 0.025, 0.12, 12]} /><meshStandardMaterial color="#2a2a2a" roughness={0.9} /></mesh></group>;
    default:
      return <mesh scale={scale}><sphereGeometry args={[0.1, 16, 16]} />{material}</mesh>;
  }
}

function createSloperGeometry(subtypeId: string, scale: number, material: React.ReactElement): React.ReactElement {
  switch (subtypeId) {
    case "sloper-hemi":
      return <mesh scale={scale} rotation={[Math.PI, 0, 0]}><sphereGeometry args={[0.1, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />{material}</mesh>;
    case "sloper-wedge":
      return <group scale={scale}><mesh position={[0, 0.02, -0.02]} rotation={[0.3, 0, 0]}><sphereGeometry args={[0.09, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />{material}</mesh></group>;
    case "sloper-dome":
      return <mesh scale={scale}><sphereGeometry args={[0.1, 24, 24, 0, Math.PI * 2, 0, Math.PI / 4]} />{material}</mesh>;
    case "sloper-negative":
      return <group scale={scale}><mesh position={[0, 0, 0]} rotation={[-0.5, 0, 0]}><sphereGeometry args={[0.1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />{material}</mesh></group>;
    default:
      return <mesh scale={scale}><sphereGeometry args={[0.1, 16, 16]} />{material}</mesh>;
  }
}

function createCrimpGeometry(subtypeId: string, scale: number, material: React.ReactElement): React.ReactElement {
  switch (subtypeId) {
    case "crimp-standard":
      return <group scale={scale}><mesh position={[0, 0, 0.02]}><boxGeometry args={[0.06, 0.012, 0.04]} />{material}</mesh><mesh position={[0, -0.01, -0.01]}><boxGeometry args={[0.08, 0.02, 0.03]} />{material}</mesh></group>;
    case "crimp-open":
      return <group scale={scale}><mesh position={[0, 0, 0.025]}><boxGeometry args={[0.1, 0.018, 0.05]} />{material}</mesh><mesh position={[0, -0.015, -0.01]}><boxGeometry args={[0.12, 0.025, 0.04]} />{material}</mesh></group>;
    case "crimp-deep":
      return <group scale={scale}><mesh position={[0, 0, 0.04]}><boxGeometry args={[0.055, 0.025, 0.06]} />{material}</mesh><mesh position={[0, -0.02, 0]}><boxGeometry args={[0.07, 0.03, 0.05]} />{material}</mesh></group>;
    case "crimp-thin":
      return <group scale={scale}><mesh position={[0, 0, 0.015]}><boxGeometry args={[0.08, 0.008, 0.03]} />{material}</mesh><mesh position={[0, -0.008, -0.005]}><boxGeometry args={[0.1, 0.015, 0.025]} />{material}</mesh></group>;
    default:
      return <mesh scale={scale}><boxGeometry args={[0.08, 0.015, 0.05]} />{material}</mesh>;
  }
}

function createPinchGeometry(subtypeId: string, scale: number, material: React.ReactElement): React.ReactElement {
  switch (subtypeId) {
    case "pinch-standard":
      return <group scale={scale}><mesh position={[0.03, 0, 0]} rotation={[0, 0, 0.1]}><boxGeometry args={[0.025, 0.1, 0.07]} />{material}</mesh><mesh position={[-0.03, 0, 0]} rotation={[0, 0, -0.1]}><boxGeometry args={[0.025, 0.1, 0.07]} />{material}</mesh></group>;
    case "pinch-wide":
      return <group scale={scale}><mesh position={[0.04, 0, 0]}><boxGeometry args={[0.03, 0.12, 0.09]} />{material}</mesh><mesh position={[-0.04, 0, 0]}><boxGeometry args={[0.03, 0.12, 0.09]} />{material}</mesh></group>;
    case "pinch-slender":
      return <group scale={scale}><mesh position={[0.025, 0, 0]} rotation={[0, 0, 0.05]}><boxGeometry args={[0.02, 0.14, 0.055]} />{material}</mesh><mesh position={[-0.025, 0, 0]} rotation={[0, 0, -0.05]}><boxGeometry args={[0.02, 0.14, 0.055]} />{material}</mesh></group>;
    case "pinch-thumb":
      return <group scale={scale}><mesh position={[0.03, 0, 0]}><boxGeometry args={[0.025, 0.08, 0.08]} />{material}</mesh><mesh position={[-0.035, 0.01, 0]}><boxGeometry args={[0.025, 0.06, 0.06]} />{material}</mesh><mesh position={[-0.035, 0.02, 0.02]} rotation={[0.3, 0, 0]}><cylinderGeometry args={[0.015, 0.015, 0.04, 8]} /><meshStandardMaterial color="#3a3a3a" roughness={0.9} /></mesh></group>;
    default:
      return <group scale={scale}><mesh position={[0.03, 0, 0]}><boxGeometry args={[0.025, 0.1, 0.07]} />{material}</mesh><mesh position={[-0.03, 0, 0]}><boxGeometry args={[0.025, 0.1, 0.07]} />{material}</mesh></group>;
  }
}

function createPocketGeometry(subtypeId: string, scale: number, material: React.ReactElement): React.ReactElement {
  switch (subtypeId) {
    case "pocket-1f":
      return <group scale={scale}><mesh><cylinderGeometry args={[0.06, 0.07, 0.04, 20]} />{material}</mesh><mesh position={[0, 0.02, 0]} rotation={[Math.PI, 0, 0]}><sphereGeometry args={[0.028, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#1a1a1a" roughness={0.9} side={THREE.DoubleSide} /></mesh></group>;
    case "pocket-2f":
      return <group scale={scale}><mesh><boxGeometry args={[0.14, 0.04, 0.08]} />{material}</mesh><mesh position={[-0.038, 0.02, 0]} rotation={[Math.PI, 0, 0]}><sphereGeometry args={[0.026, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#1a1a1a" roughness={0.9} side={THREE.DoubleSide} /></mesh><mesh position={[0.038, 0.02, 0]} rotation={[Math.PI, 0, 0]}><sphereGeometry args={[0.026, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#1a1a1a" roughness={0.9} side={THREE.DoubleSide} /></mesh></group>;
    case "pocket-3f":
      return <group scale={scale}><mesh><boxGeometry args={[0.16, 0.04, 0.09]} />{material}</mesh><mesh position={[-0.05, 0.02, 0]} rotation={[Math.PI, 0, 0]}><sphereGeometry args={[0.024, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#1a1a1a" roughness={0.9} side={THREE.DoubleSide} /></mesh><mesh position={[0, 0.02, 0]} rotation={[Math.PI, 0, 0]}><sphereGeometry args={[0.024, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#1a1a1a" roughness={0.9} side={THREE.DoubleSide} /></mesh><mesh position={[0.05, 0.02, 0]} rotation={[Math.PI, 0, 0]}><sphereGeometry args={[0.024, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#1a1a1a" roughness={0.9} side={THREE.DoubleSide} /></mesh></group>;
    case "pocket-oval":
      return <group scale={scale}><mesh scale={[1.4, 1, 0.7]}><cylinderGeometry args={[0.06, 0.07, 0.04, 20]} />{material}</mesh><mesh position={[0, 0.025, 0]} rotation={[Math.PI, 0, 0]} scale={[1.3, 1, 1]}><sphereGeometry args={[0.035, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#1a1a1a" roughness={0.9} side={THREE.DoubleSide} /></mesh></group>;
    default:
      return <group scale={scale}><mesh><boxGeometry args={[0.12, 0.04, 0.08]} />{material}</mesh><mesh position={[0, 0.02, 0]} rotation={[Math.PI, 0, 0]}><sphereGeometry args={[0.03, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#1a1a1a" roughness={0.9} side={THREE.DoubleSide} /></mesh></group>;
  }
}

function createEdgeGeometry(subtypeId: string, scale: number, material: React.ReactElement): React.ReactElement {
  switch (subtypeId) {
    case "edge-standard":
      return <group scale={scale}><mesh position={[0, 0, 0.03]}><boxGeometry args={[0.1, 0.018, 0.05]} />{material}</mesh><mesh position={[0, -0.015, 0]}><boxGeometry args={[0.12, 0.025, 0.04]} />{material}</mesh></group>;
    case "edge-deep":
      return <group scale={scale}><mesh position={[0, 0, 0.05]}><boxGeometry args={[0.08, 0.03, 0.08]} />{material}</mesh><mesh position={[0, -0.025, 0]}><boxGeometry args={[0.1, 0.035, 0.06]} />{material}</mesh></group>;
    case "edge-rolled":
      return <group scale={scale}><mesh position={[0, 0, 0.035]}><boxGeometry args={[0.1, 0.02, 0.055]} />{material}</mesh><mesh position={[0, 0.01, 0.06]} rotation={[0.3, 0, 0]}><cylinderGeometry args={[0.025, 0.025, 0.08, 12]} />{material}</mesh><mesh position={[0, -0.02, 0]}><boxGeometry args={[0.12, 0.03, 0.05]} />{material}</mesh></group>;
    case "edge-angled":
      return <group scale={scale}><mesh position={[0, 0, 0.03]} rotation={[-0.2, 0, 0]}><boxGeometry args={[0.09, 0.025, 0.05]} />{material}</mesh><mesh position={[0, -0.02, 0]}><boxGeometry args={[0.11, 0.03, 0.04]} />{material}</mesh></group>;
    default:
      return <group scale={scale}><mesh position={[0, 0, 0.03]}><boxGeometry args={[0.1, 0.018, 0.05]} />{material}</mesh><mesh position={[0, -0.015, 0]}><boxGeometry args={[0.12, 0.025, 0.04]} />{material}</mesh></group>;
  }
}

function HoldPreview({ type, subtypeId, color }: { type: HoldType; subtypeId: string; color: string }) {
  return (
    <div className="w-[60px] h-[60px] rounded bg-gray-100 overflow-hidden">
      <Canvas camera={{ position: [2, 2, 2], fov: 45 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 5, 3]} intensity={0.6} />
        {createHoldGeometry(type, subtypeId, color, false)}
      </Canvas>
    </div>
  );
}

// 计算墙壁顶部Y坐标
function getWallTopY(wall: Wall): number {
  return wall.bottomY + PANEL_HEIGHT * Math.cos(wall.angle);
}

// 计算墙壁顶部Z坐标（考虑角度）
function getWallTopZ(wall: Wall): number {
  return wall.z + PANEL_HEIGHT * Math.sin(wall.angle);
}

function WallPanel({ wall, onWallClick, selectedWallId, selectedHoldId, onHoldClick, onHoldDoubleClick }: {
  wall: Wall;
  onWallClick: (wallId: number, localX: number, localY: number) => void;
  selectedWallId: number | null;
  selectedHoldId: number | null;
  onHoldClick: (holdId: number) => void;
  onHoldDoubleClick: (holdId: number) => void;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#e8dcc8";
    ctx.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 1500; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 512;
      const radius = Math.random() * 2 + 0.5;
      const shade = Math.random() * 30 - 15;
      const r = Math.min(255, Math.max(0, 232 + shade));
      const g = Math.min(255, Math.max(0, 220 + shade));
      const b = Math.min(255, Math.max(0, 200 + shade));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, []);

  return (
    <group position={[wall.x, wall.bottomY, wall.z]} rotation={[wall.angle, 0, 0]}>
      {/* 墙面 */}
      <mesh position={[0, PANEL_HEIGHT / 2, 0]}>
        <planeGeometry args={[wall.width, PANEL_HEIGHT]} />
        <meshStandardMaterial map={texture} color="#e8dcc8" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* 边框 */}
      <mesh position={[0, PANEL_HEIGHT + 0.03, 0.03]}><boxGeometry args={[wall.width + 0.06, 0.06, 0.06]} /><meshStandardMaterial color="#4a4a4a" metalness={0.8} roughness={0.3} /></mesh>
      <mesh position={[0, -0.03, 0.03]}><boxGeometry args={[wall.width + 0.06, 0.06, 0.06]} /><meshStandardMaterial color="#4a4a4a" metalness={0.8} roughness={0.3} /></mesh>
      <mesh position={[wall.width / 2 + 0.03, PANEL_HEIGHT / 2, 0.03]}><boxGeometry args={[0.06, PANEL_HEIGHT + 0.06, 0.06]} /><meshStandardMaterial color="#4a4a4a" metalness={0.8} roughness={0.3} /></mesh>
      <mesh position={[-wall.width / 2 - 0.03, PANEL_HEIGHT / 2, 0.03]}><boxGeometry args={[0.06, PANEL_HEIGHT + 0.06, 0.06]} /><meshStandardMaterial color="#4a4a4a" metalness={0.8} roughness={0.3} /></mesh>

      {/* 点击区域 */}
      <mesh
        position={[0, PANEL_HEIGHT / 2, 0.01]}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          const point = e.point;
          if (point) {
            // 正确的逆变换：将世界坐标转换为墙壁局部坐标
            // 墙壁绕X轴旋转，位置在 (wall.x, wall.bottomY, wall.z)
            const cosA = Math.cos(wall.angle);
            const sinA = Math.sin(wall.angle);

            // 减去墙壁组的世界位置
            const relX = point.x - wall.x;
            const relY = point.y - wall.bottomY;
            const relZ = point.z - wall.z;

            // 逆旋转（绕X轴）
            const localX = relX;
            const localY = relY * cosA + relZ * sinA;
            const localZ = -relY * sinA + relZ * cosA;

            // 使用局部坐标放置岩点
            onWallClick(wall.id, localX, localY);
          }
        }}
      >
        <planeGeometry args={[wall.width, PANEL_HEIGHT]} />
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      </mesh>

      {/* 岩点 */}
      {wall.holds.map((hold) => (
        <group key={hold.id} position={hold.localPosition}>
          <group rotation={[0, 0, hold.rotation]}>
            {createHoldGeometry(hold.holdType, hold.holdSubtype, hold.color, selectedHoldId === hold.id)}
          </group>
          <mesh
            onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onHoldClick(hold.id); }}
            onDoubleClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onHoldDoubleClick(hold.id); }}
          >
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshBasicMaterial visible={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Floor() {
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]}><planeGeometry args={[50, 50]} /><meshStandardMaterial color="#c8c8c8" roughness={0.9} /></mesh>;
}

function Scene({
  walls,
  selectedWallId,
  selectedHoldId,
  onWallClick,
  onHoldClick,
  onHoldDoubleClick,
}: {
  walls: Wall[];
  selectedWallId: number | null;
  selectedHoldId: number | null;
  onWallClick: (wallId: number, localX: number, localY: number) => void;
  onHoldClick: (holdId: number) => void;
  onHoldDoubleClick: (holdId: number) => void;
}) {
  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 10, 10]} intensity={1.5} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <directionalLight position={[-5, 5, 5]} intensity={0.5} />
      <pointLight position={[0, -2, 5]} intensity={0.3} />
      <Floor />
      {walls.map((wall) => (
        <WallPanel
          key={wall.id}
          wall={wall}
          onWallClick={onWallClick}
          selectedWallId={selectedWallId}
          selectedHoldId={selectedHoldId}
          onHoldClick={onHoldClick}
          onHoldDoubleClick={onHoldDoubleClick}
        />
      ))}
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} minDistance={2} maxDistance={25} target={[0, 2, 0]} />
    </>
  );
}

export default function RockWall() {
  const [walls, setWalls] = useState<Wall[]>([
    {
      id: 1,
      angle: 0,
      bottomY: FLOOR_Y,
      z: 0,
      x: 0,
      width: PANEL_WIDTH,
      holds: [
        { id: 1, wallId: 1, localPosition: [-0.6, 0.8, 0.1], color: "#e74c3c", holdType: "jug", holdSubtype: "jug-bowl", rotation: 0 },
        { id: 2, wallId: 1, localPosition: [-0.2, 1.5, 0.1], color: "#e74c3c", holdType: "jug", holdSubtype: "jug-oval", rotation: Math.PI / 6 },
        { id: 3, wallId: 1, localPosition: [0.3, 1.0, 0.1], color: "#3498db", holdType: "sloper", holdSubtype: "sloper-hemi", rotation: 0 },
      ],
    },
  ]);
  const [selectedHoldType, setSelectedHoldType] = useState<HoldType>("jug");
  const [selectedHoldSubtype, setSelectedHoldSubtype] = useState("jug-bowl");
  const [selectedWallId, setSelectedWallId] = useState<number | null>(1);
  const [selectedHoldId, setSelectedHoldId] = useState<number | null>(null);
  const [newWallAngle, setNewWallAngle] = useState(Math.PI / 6);
  const [addDirection, setAddDirection] = useState<"vertical" | "horizontal">("vertical");
  const [horizontalSide, setHorizontalSide] = useState<"left" | "right">("right");
  const [holdIdCounter, setHoldIdCounter] = useState(10);
  const [wallIdCounter, setWallIdCounter] = useState(2);

  const handleTypeChange = (type: HoldType) => {
    setSelectedHoldType(type);
    setSelectedHoldSubtype(HOLD_SUBTYPES[type][0].id);
  };

  const handleWallClick = (wallId: number, localX: number, localY: number) => {
    const config = HOLD_TYPE_CONFIG[selectedHoldType];
    const newHold: Hold = {
      id: holdIdCounter,
      wallId,
      localPosition: [localX, localY, 0.1],
      color: config.color,
      holdType: selectedHoldType,
      holdSubtype: selectedHoldSubtype,
      rotation: 0,
    };
    setWalls(walls.map((w) => w.id === wallId ? { ...w, holds: [...w.holds, newHold] } : w));
    setHoldIdCounter(holdIdCounter + 1);
    setSelectedWallId(wallId);
    setSelectedHoldId(newHold.id);
  };

  const handleHoldClick = (holdId: number) => {
    const hold = walls.flatMap((w) => w.holds).find((h) => h.id === holdId);
    if (hold) setSelectedWallId(hold.wallId);
    setSelectedHoldId(selectedHoldId === holdId ? null : holdId);
  };

  const handleHoldDoubleClick = (holdId: number) => {
    setWalls(walls.map((w) => ({ ...w, holds: w.holds.filter((h) => h.id !== holdId) })));
    if (selectedHoldId === holdId) setSelectedHoldId(null);
  };

  // 修改选中墙的角度
  const updateSelectedWallAngle = (newAngle: number) => {
    if (selectedWallId === null) return;

    setWalls((prevWalls) => {
      const wallIndex = prevWalls.findIndex((w) => w.id === selectedWallId);
      if (wallIndex === -1) return prevWalls;

      const updatedWalls = [...prevWalls];
      const wall = { ...updatedWalls[wallIndex] };
      wall.angle = newAngle;
      updatedWalls[wallIndex] = wall;

      // 重新计算所有后续墙的Y和Z位置，保持连接
      for (let i = wallIndex + 1; i < updatedWalls.length; i++) {
        const prevWall = updatedWalls[i - 1];
        const currentWall = { ...updatedWalls[i] };
        const prevTopY = prevWall.bottomY + PANEL_HEIGHT * Math.cos(prevWall.angle);
        const prevTopZ = prevWall.z + PANEL_HEIGHT * Math.sin(prevWall.angle);
        currentWall.bottomY = prevTopY;
        currentWall.z = prevTopZ;
        updatedWalls[i] = currentWall;
      }

      return updatedWalls;
    });
    setNewWallAngle(newAngle);
  };

  // 添加新墙（纵向或横向）
  const addNewWall = () => {
    if (selectedWallId === null) return;

    const refWall = walls.find((w) => w.id === selectedWallId);
    if (!refWall) return;

    let newWall: Wall;

    if (addDirection === "vertical") {
      // 纵向叠加：新墙的底部 = 前一墙顶部Y，新墙的z = 前一墙顶部z
      const refTopY = getWallTopY(refWall);
      const refTopZ = getWallTopZ(refWall);
      newWall = {
        id: wallIdCounter,
        angle: newWallAngle,
        bottomY: refTopY,
        z: refTopZ,
        x: refWall.x,
        width: PANEL_WIDTH,
        holds: [],
      };
    } else {
      // 横向叠加
      const newX = horizontalSide === "right"
        ? refWall.x + PANEL_WIDTH
        : refWall.x - PANEL_WIDTH;

      newWall = {
        id: wallIdCounter,
        angle: newWallAngle,
        bottomY: FLOOR_Y,
        z: 0,
        x: newX,
        width: PANEL_WIDTH,
        holds: [],
      };
    }

    setWalls([...walls, newWall]);
    setWallIdCounter(wallIdCounter + 1);
    setSelectedWallId(newWall.id);
  };

  // 删除选中墙（只能删除最上面的墙，不能删除最下面的墙）
  const deleteSelectedWall = () => {
    if (selectedWallId === null || walls.length <= 1) return;
    // 不能删除最下面的墙（第一面墙，id最小的）
    const bottomWallId = Math.min(...walls.map((w) => w.id));
    if (selectedWallId === bottomWallId) return;

    const wallIndex = walls.findIndex((w) => w.id === selectedWallId);
    const newWalls = walls.filter((w) => w.id !== selectedWallId);

    // 删除后，重新计算后续墙的位置（Y和Z）
    for (let i = wallIndex; i < newWalls.length; i++) {
      if (i === 0) {
        newWalls[i] = { ...newWalls[i], bottomY: FLOOR_Y, z: 0 };
      } else {
        const prevTopY = getWallTopY(newWalls[i - 1]);
        const prevTopZ = getWallTopZ(newWalls[i - 1]);
        newWalls[i] = { ...newWalls[i], bottomY: prevTopY, z: prevTopZ };
      }
    }

    setWalls(newWalls);
    setSelectedWallId(newWalls[newWalls.length - 1].id);
    setSelectedHoldId(null);
  };

  // 检查是否可以删除当前墙（不能删除最下面的墙）
  const canDeleteWall = () => {
    if (selectedWallId === null || walls.length <= 1) return false;
    const bottomWallId = Math.min(...walls.map((w) => w.id));
    return selectedWallId !== bottomWallId;
  };

  // 旋转岩点
  const rotateHold = useCallback((direction: "left" | "right") => {
    if (selectedHoldId !== null) {
      const delta = direction === "left" ? Math.PI / 8 : -Math.PI / 8;
      setWalls(walls.map((w) => ({ ...w, holds: w.holds.map((h) => h.id === selectedHoldId ? { ...h, rotation: (h.rotation + delta) % (Math.PI * 2) } : h) })));
    }
  }, [selectedHoldId, walls]);

  // 移动岩点
  const moveHold = useCallback((direction: "up" | "down" | "left" | "right") => {
    if (selectedHoldId !== null) {
      const step = 0.1;
      setWalls(walls.map((w) => ({ ...w, holds: w.holds.map((h) => {
        if (h.id !== selectedHoldId) return h;
        const [x, y, z] = h.localPosition;
        switch (direction) {
          case "up": return { ...h, localPosition: [x, y + step, z] };
          case "down": return { ...h, localPosition: [x, Math.max(0, y - step), z] };
          case "left": return { ...h, localPosition: [x - step, y, z] };
          case "right": return { ...h, localPosition: [x + step, y, z] };
          default: return h;
        }
      }) })));
    }
  }, [selectedHoldId, walls]);

  // 键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (selectedHoldId !== null) {
        if (e.shiftKey) {
          switch (e.key) {
            case "ArrowLeft": e.preventDefault(); rotateHold("left"); break;
            case "ArrowRight": e.preventDefault(); rotateHold("right"); break;
          }
        } else {
          switch (e.key) {
            case "ArrowUp": e.preventDefault(); moveHold("up"); break;
            case "ArrowDown": e.preventDefault(); moveHold("down"); break;
            case "ArrowLeft": e.preventDefault(); moveHold("left"); break;
            case "ArrowRight": e.preventDefault(); moveHold("right"); break;
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedHoldId, rotateHold, moveHold]);

  const selectedWall = walls.find((w) => w.id === selectedWallId);
  const selectedHold = walls.flatMap((w) => w.holds).find((h) => h.id === selectedHoldId);
  const totalHolds = walls.reduce((sum, w) => sum + w.holds.length, 0);
  const subtypes = HOLD_SUBTYPES[selectedHoldType];

  return (
    <div className="w-full h-screen bg-slate-200">
      {/* 顶部信息栏 */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur rounded-lg shadow-lg p-4">
        <h1 className="text-xl font-bold text-slate-800 mb-1">液丘 - 攀岩定线</h1>
        <p className="text-sm text-slate-500">FRP 墙壁 · {walls.length}面墙</p>
        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-xs text-slate-400">岩点数量: <span className="font-semibold text-slate-700">{totalHolds}</span></p>
          {selectedWall && (
            <p className="text-xs text-slate-400 mt-1">
              当前墙: <span className="font-semibold text-slate-700">#{selectedWall.id} ({selectedWall.angle * 180 / Math.PI}°)</span>
            </p>
          )}
        </div>
      </div>

      {/* 右侧控制面板 */}
      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur rounded-lg shadow-lg p-4 w-80 max-h-[calc(100vh-8rem)] overflow-y-auto">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">岩壁设置</h2>

        {/* 当前墙角度修改 */}
        {selectedWall && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <label className="text-xs text-green-600 font-medium mb-2 block">修改当前墙角度</label>
            <div className="flex flex-wrap gap-2">
              {TILT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateSelectedWallAngle(opt.value)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    selectedWall.angle === opt.value
                      ? "bg-green-500 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 添加新墙 */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <label className="text-xs text-blue-600 font-medium mb-2 block">添加新墙</label>

          {/* 方向选择 */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setAddDirection("vertical")}
              className={`flex-1 px-2 py-1.5 text-xs rounded-md ${addDirection === "vertical" ? "bg-blue-500 text-white" : "bg-white text-slate-600 border border-slate-300"}`}
            >
              纵向
            </button>
            <button
              onClick={() => setAddDirection("horizontal")}
              className={`flex-1 px-2 py-1.5 text-xs rounded-md ${addDirection === "horizontal" ? "bg-blue-500 text-white" : "bg-white text-slate-600 border border-slate-300"}`}
            >
              横向
            </button>
          </div>

          {/* 横向时选择左右 */}
          {addDirection === "horizontal" && (
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setHorizontalSide("left")}
                className={`flex-1 px-2 py-1 text-xs rounded-md ${horizontalSide === "left" ? "bg-green-500 text-white" : "bg-white text-slate-600 border border-slate-300"}`}
              >
                左边
              </button>
              <button
                onClick={() => setHorizontalSide("right")}
                className={`flex-1 px-2 py-1 text-xs rounded-md ${horizontalSide === "right" ? "bg-green-500 text-white" : "bg-white text-slate-600 border border-slate-300"}`}
              >
                右边
              </button>
            </div>
          )}

          {/* 新墙角度 */}
          <div className="flex gap-2 items-center mb-2">
            <span className="text-xs text-slate-500">新墙角度:</span>
            <select
              value={newWallAngle}
              onChange={(e) => setNewWallAngle(parseFloat(e.target.value))}
              className="flex-1 px-2 py-1.5 text-xs border border-slate-300 rounded-md"
            >
              {TILT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={addNewWall}
            className="w-full px-3 py-1.5 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600"
          >
            添加
          </button>

          {canDeleteWall() && (
            <button
              onClick={deleteSelectedWall}
              className="mt-2 w-full px-3 py-1.5 bg-red-100 text-red-600 text-xs rounded-md hover:bg-red-200"
            >
              删除当前墙
            </button>
          )}
          {!canDeleteWall() && walls.length > 1 && (
            <p className="mt-2 text-xs text-slate-400 text-center">无法删除最底层墙壁</p>
          )}
        </div>

        {/* 岩点类型选择 */}
        <div className="mb-4">
          <label className="text-xs text-slate-500 mb-2 block">岩点类型</label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(HOLD_TYPE_CONFIG) as HoldType[]).map((type) => (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                className={`px-2 py-2 text-xs rounded-md transition-colors flex items-center gap-1.5 ${
                  selectedHoldType === type ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: HOLD_TYPE_CONFIG[type].color }} />
                <span className="truncate">{HOLD_TYPE_CONFIG[type].label.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 子类型选择 */}
        <div className="mb-4">
          <label className="text-xs text-slate-500 mb-2 block">{HOLD_TYPE_CONFIG[selectedHoldType].label} 子类型</label>
          <div className="grid grid-cols-2 gap-2">
            {subtypes.map((subtype) => (
              <button
                key={subtype.id}
                onClick={() => setSelectedHoldSubtype(subtype.id)}
                className={`p-2 text-xs rounded-md transition-colors flex flex-col items-center gap-1 ${
                  selectedHoldSubtype === subtype.id ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <HoldPreview type={selectedHoldType} subtypeId={subtype.id} color={HOLD_TYPE_CONFIG[selectedHoldType].color} />
                <span className="text-center">{subtype.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 选中岩点操作 */}
        {selectedHold && (
          <div className="border-t border-slate-200 pt-3 mt-3">
            <label className="text-xs text-slate-500 mb-2 block">选中岩点操作</label>
            <div className="flex gap-2">
              <button onClick={() => rotateHold("right")} className="flex-1 px-3 py-2 bg-green-500 text-white text-xs rounded-md hover:bg-green-600">旋转</button>
              <button onClick={() => { setWalls(walls.map((w) => ({ ...w, holds: w.holds.filter((h) => h.id !== selectedHoldId) }))); setSelectedHoldId(null); }} className="flex-1 px-3 py-2 bg-red-500 text-white text-xs rounded-md hover:bg-red-600">删除</button>
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">双击岩点可直接删除</p>
          </div>
        )}
      </div>

      {/* 底部操作提示 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur rounded-lg shadow-lg px-4 py-2">
        <div className="text-sm text-slate-600 space-y-1">
          <p><span className="text-slate-400">基础：</span>点击墙面添加岩点 · 点击岩点选中 · 双击删除</p>
          <p><span className="text-slate-400">选中后：</span>方向键移动 · Shift+方向键旋转</p>
        </div>
      </div>

      <Canvas shadows camera={{ position: [0, 3, 12], fov: 50 }} gl={{ antialias: true }}>
        <Scene
          walls={walls}
          selectedWallId={selectedWallId}
          selectedHoldId={selectedHoldId}
          onWallClick={handleWallClick}
          onHoldClick={handleHoldClick}
          onHoldDoubleClick={handleHoldDoubleClick}
        />
      </Canvas>
    </div>
  );
}
