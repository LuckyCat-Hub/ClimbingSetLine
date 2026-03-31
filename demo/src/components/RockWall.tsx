"use client";

import { useState, useMemo } from "react";
import { Canvas, ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

export type HoldType = "jug" | "sloper" | "crimp" | "pinch" | "pocket" | "edge";

interface Hold {
  id: number;
  position: [number, number, number];
  color: string;
  holdType: HoldType;
  rotation: number; // 岩点自身的旋转角度（绕Z轴）
}

// FRP 面板标准尺寸
const PANEL_WIDTH = 2.4;
const PANEL_HEIGHT = 4.8;
const FLOOR_Y = -0.5;

// 倾斜角度选项
const TILT_OPTIONS = [
  { label: "0° (垂直)", value: 0 },
  { label: "15°", value: Math.PI / 12 },
  { label: "30°", value: Math.PI / 6 },
  { label: "45° (大仰角)", value: Math.PI / 4 },
];

// 岩点类型定义
export const HOLD_TYPES: { type: HoldType; label: string; color: string }[] = [
  { type: "jug", label: "Jug (大握)", color: "#e74c3c" },
  { type: "sloper", label: "Sloper (斜面)", color: "#3498db" },
  { type: "crimp", label: "Crimp (窄边)", color: "#2ecc71" },
  { type: "pinch", label: "Pinch (捏握)", color: "#f39c12" },
  { type: "pocket", label: "Pocket (扣点)", color: "#9b59b6" },
  { type: "edge", label: "Edge (平边)", color: "#1abc9c" },
];

const FRP_COLOR = "#e8dcc8";

// 岩点旋转选项
const ROTATION_OPTIONS = [
  { label: "0°", value: 0 },
  { label: "45°", value: Math.PI / 4 },
  { label: "90°", value: Math.PI / 2 },
  { label: "135°", value: (3 * Math.PI) / 4 },
  { label: "180°", value: Math.PI },
  { label: "225°", value: (5 * Math.PI) / 4 },
  { label: "270°", value: (3 * Math.PI) / 2 },
  { label: "315°", value: (7 * Math.PI) / 4 },
];

function FRPWall() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#e8dcc8";
    ctx.fillRect(0, 0, 512, 1024);

    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 1024;
      const radius = Math.random() * 3 + 1;
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
    <group>
      {/* 主面板 */}
      <mesh position={[0, PANEL_HEIGHT / 2, 0]}>
        <planeGeometry args={[PANEL_WIDTH, PANEL_HEIGHT]} />
        <meshStandardMaterial
          map={texture}
          color={FRP_COLOR}
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>
      {/* 边框 */}
      <mesh position={[0, PANEL_HEIGHT + 0.05, 0.05]}>
        <boxGeometry args={[PANEL_WIDTH + 0.1, 0.1, 0.1]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.05, 0.05]}>
        <boxGeometry args={[PANEL_WIDTH + 0.1, 0.1, 0.1]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[PANEL_WIDTH / 2 + 0.05, PANEL_HEIGHT / 2, 0.05]}>
        <boxGeometry args={[0.1, PANEL_HEIGHT, 0.1]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[-PANEL_WIDTH / 2 - 0.05, PANEL_HEIGHT / 2, 0.05]}>
        <boxGeometry args={[0.1, PANEL_HEIGHT, 0.1]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

// Jug - 大深槽手握
function JugHold({ color, isSelected, holdRotation }: { color: string; isSelected: boolean; holdRotation: number }) {
  return (
    <group rotation={[0, 0, holdRotation]}>
      <mesh scale={isSelected ? 1.15 : 1}>
        <cylinderGeometry args={[0.12, 0.08, 0.1, 16]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
    </group>
  );
}

// Sloper - 圆形外倾无边缘
function SloperHold({ color, isSelected, holdRotation }: { color: string; isSelected: boolean; holdRotation: number }) {
  return (
    <mesh scale={isSelected ? 1.15 : 1} rotation={[Math.PI / 4, 0, holdRotation]}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshStandardMaterial color={color} roughness={0.8} metalness={0.05} />
    </mesh>
  );
}

// Crimp - 尖锐窄边
function CrimpHold({ color, isSelected, holdRotation }: { color: string; isSelected: boolean; holdRotation: number }) {
  return (
    <mesh scale={isSelected ? 1.15 : 1} rotation={[0, 0, holdRotation]}>
      <boxGeometry args={[0.15, 0.04, 0.06]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
    </mesh>
  );
}

// Pinch - 捏握
function PinchHold({ color, isSelected, holdRotation }: { color: string; isSelected: boolean; holdRotation: number }) {
  return (
    <group rotation={[0, 0, holdRotation]} scale={isSelected ? 1.15 : 1}>
      <mesh position={[0.04, 0, 0]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.04, 0.12, 0.08]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh position={[-0.04, 0, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[0.04, 0.12, 0.08]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
      </mesh>
    </group>
  );
}

// Pocket - 手指孔
function PocketHold({ color, isSelected, holdRotation }: { color: string; isSelected: boolean; holdRotation: number }) {
  return (
    <group rotation={[0, 0, holdRotation]} scale={isSelected ? 1.15 : 1}>
      <mesh>
        <boxGeometry args={[0.12, 0.15, 0.08]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <cylinderGeometry args={[0.025, 0.025, 0.1, 12]} />
        <meshStandardMaterial color="#333333" roughness={0.9} />
      </mesh>
    </group>
  );
}

// Edge - 平边
function EdgeHold({ color, isSelected, holdRotation }: { color: string; isSelected: boolean; holdRotation: number }) {
  return (
    <mesh scale={isSelected ? 1.15 : 1} rotation={[0.2, 0, holdRotation]}>
      <boxGeometry args={[0.12, 0.03, 0.08]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.15} />
    </mesh>
  );
}

function HoldMesh({
  holdType,
  color,
  isSelected,
  rotation,
}: {
  holdType: HoldType;
  color: string;
  isSelected: boolean;
  rotation: number;
}) {
  switch (holdType) {
    case "jug":
      return <JugHold color={color} isSelected={isSelected} holdRotation={rotation} />;
    case "sloper":
      return <SloperHold color={color} isSelected={isSelected} holdRotation={rotation} />;
    case "crimp":
      return <CrimpHold color={color} isSelected={isSelected} holdRotation={rotation} />;
    case "pinch":
      return <PinchHold color={color} isSelected={isSelected} holdRotation={rotation} />;
    case "pocket":
      return <PocketHold color={color} isSelected={isSelected} holdRotation={rotation} />;
    case "edge":
      return <EdgeHold color={color} isSelected={isSelected} holdRotation={rotation} />;
    default:
      return <JugHold color={color} isSelected={isSelected} holdRotation={rotation} />;
  }
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]}>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#d0d0d0" roughness={0.9} />
    </mesh>
  );
}

function Scene({
  holds,
  tiltAngle,
  onAddHold,
  onHoldClick,
  selectedHoldType,
  selectedHoldId,
  onHoldRotate,
}: {
  holds: Hold[];
  tiltAngle: number;
  onAddHold: (position: [number, number, number]) => void;
  onHoldClick: (id: number) => void;
  selectedHoldType: HoldType;
  selectedHoldId: number | null;
  onHoldRotate: (id: number) => void;
}) {
  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight
        position={[5, 10, 10]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-5, 5, 5]} intensity={0.5} />
      <pointLight position={[0, -2, 5]} intensity={0.3} />

      {/* 岩壁组 - 绕X轴旋转（以底部为轴心） */}
      <group position={[0, FLOOR_Y, 0]} rotation={[tiltAngle, 0, 0]}>
        <FRPWall />

        {/* 碰撞检测平面 */}
        <mesh position={[0, PANEL_HEIGHT / 2, 0.01]} onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          const point = e.point;
          if (point) {
            // 将点击位置转换为岩壁本地坐标
            // 由于墙已旋转，需要逆变换得到本地坐标
            const localX = point.x;
            const localY = point.y - FLOOR_Y; // 相对岩壁底部
            onAddHold([localX, localY, 0.1]);
          }
        }}>
          <planeGeometry args={[PANEL_WIDTH, PANEL_HEIGHT]} />
          <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
        </mesh>

        {/* 岩点 - 在岩壁组内，跟随岩壁旋转 */}
        {holds.map((hold) => (
          <group key={hold.id} position={hold.position}>
            <HoldMesh
              holdType={hold.holdType}
              color={hold.color}
              isSelected={selectedHoldId === hold.id}
              rotation={hold.rotation}
            />
            {/* 点击区域 */}
            <mesh
              rotation={[0, 0, 0]}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                onHoldClick(hold.id);
              }}
            >
              <sphereGeometry args={[0.2, 8, 8]} />
              <meshBasicMaterial visible={false} />
            </mesh>
          </group>
        ))}
      </group>

      <Floor />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={15}
        target={[0, 2, 0]}
      />
    </>
  );
}

export default function RockWall() {
  const [tiltAngle, setTiltAngle] = useState(0);
  const [selectedHoldType, setSelectedHoldType] = useState<HoldType>("jug");
  const [holds, setHolds] = useState<Hold[]>([
    { id: 1, position: [-0.6, 1.5, 0.1], color: "#e74c3c", holdType: "jug", rotation: 0 },
    { id: 2, position: [-0.2, 2.2, 0.1], color: "#3498db", holdType: "sloper", rotation: 0 },
    { id: 3, position: [0.3, 1.8, 0.1], color: "#2ecc71", holdType: "crimp", rotation: Math.PI / 4 },
    { id: 4, position: [0.5, 2.8, 0.1], color: "#f39c12", holdType: "pinch", rotation: 0 },
    { id: 5, position: [-0.4, 3.5, 0.1], color: "#9b59b6", holdType: "pocket", rotation: Math.PI / 2 },
    { id: 6, position: [0.6, 3.2, 0.1], color: "#1abc9c", holdType: "edge", rotation: -Math.PI / 4 },
  ]);
  const [selectedHold, setSelectedHold] = useState<number | null>(null);
  const [idCounter, setIdCounter] = useState(7);

  const handleAddHold = (position: [number, number, number]) => {
    const holdTypeConfig = HOLD_TYPES.find((h) => h.type === selectedHoldType);
    const color = holdTypeConfig?.color || "#e74c3c";
    const newHold: Hold = {
      id: idCounter,
      position,
      color,
      holdType: selectedHoldType,
      rotation: 0,
    };
    setHolds([...holds, newHold]);
    setIdCounter(idCounter + 1);
  };

  const handleHoldClick = (id: number) => {
    setSelectedHold(selectedHold === id ? null : id);
  };

  const handleHoldRotate = () => {
    if (selectedHold !== null) {
      setHolds(holds.map((h) =>
        h.id === selectedHold
          ? { ...h, rotation: (h.rotation + Math.PI / 8) % (Math.PI * 2) }
          : h
      ));
    }
  };

  const removeSelectedHold = () => {
    if (selectedHold !== null) {
      setHolds(holds.filter((h) => h.id !== selectedHold));
      setSelectedHold(null);
    }
  };

  return (
    <div className="w-full h-screen bg-slate-200">
      {/* 顶部信息栏 */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur rounded-lg shadow-lg p-4">
        <h1 className="text-xl font-bold text-slate-800 mb-1">液丘 - 室内抱石墙</h1>
        <p className="text-sm text-slate-500">FRP 面板 · 米色</p>
        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-xs text-slate-400">
            岩点数量: <span className="font-semibold text-slate-700">{holds.length}</span>
          </p>
          {selectedHold !== null && (
            <p className="text-xs text-slate-400 mt-1">
              选中岩点:{" "}
              <span className="font-semibold text-slate-700">
                {holds.find((h) => h.id === selectedHold)?.holdType}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* 右侧控制面板 */}
      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur rounded-lg shadow-lg p-4 w-64">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">岩壁设置</h2>

        {/* 岩点类型选择 */}
        <div className="mb-4">
          <label className="text-xs text-slate-500 mb-2 block">选择岩点类型</label>
          <div className="grid grid-cols-2 gap-2">
            {HOLD_TYPES.map((ht) => (
              <button
                key={ht.type}
                onClick={() => setSelectedHoldType(ht.type)}
                className={`px-2 py-2 text-xs rounded-md transition-colors flex items-center gap-1.5 ${
                  selectedHoldType === ht.type
                    ? "bg-blue-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: ht.color }}
                />
                {ht.label}
              </button>
            ))}
          </div>
        </div>

        {/* 倾斜角度控制 */}
        <div className="mb-4">
          <label className="text-xs text-slate-500 mb-2 block">岩壁倾斜角度</label>
          <div className="flex flex-wrap gap-2">
            {TILT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTiltAngle(opt.value)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  tiltAngle === opt.value
                    ? "bg-blue-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 选中岩点操作 */}
        {selectedHold !== null && (
          <div className="border-t border-slate-200 pt-3 mt-3">
            <label className="text-xs text-slate-500 mb-2 block">选中岩点操作</label>
            <div className="flex gap-2">
              <button
                onClick={handleHoldRotate}
                className="flex-1 px-3 py-2 bg-green-500 text-white text-xs rounded-md hover:bg-green-600 transition-colors"
              >
                旋转 22.5°
              </button>
              <button
                onClick={removeSelectedHold}
                className="flex-1 px-3 py-2 bg-red-500 text-white text-xs rounded-md hover:bg-red-600 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 底部操作提示 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur rounded-lg shadow-lg px-4 py-2">
        <p className="text-sm text-slate-600">
          <span className="text-slate-400">操作：</span>
          点击岩壁添加岩点 · 点击岩点选中 · 选中后可旋转或删除
        </p>
      </div>

      <Canvas
        shadows
        camera={{ position: [0, 2.5, 8], fov: 50 }}
        gl={{ antialias: true }}
      >
        <Scene
          holds={holds}
          tiltAngle={tiltAngle}
          onAddHold={handleAddHold}
          onHoldClick={handleHoldClick}
          selectedHoldType={selectedHoldType}
          selectedHoldId={selectedHold}
          onHoldRotate={handleHoldRotate}
        />
      </Canvas>
    </div>
  );
}
