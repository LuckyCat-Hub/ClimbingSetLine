"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Canvas, ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

export type HoldType = "jug" | "sloper" | "crimp" | "pinch" | "pocket" | "edge";

export interface HoldSubtype {
  id: string;
  label: string;
  scale: number;
  geometry: "sphere" | "cylinder" | "box" | "cone" | "torus";
  params: number[];
}

interface Hold {
  id: number;
  position: [number, number, number];
  color: string;
  holdType: HoldType;
  holdSubtype: string;
  rotation: number;
}

// FRP 面板标准尺寸
const PANEL_WIDTH = 2.4;
const PANEL_HEIGHT = 4.8;
const FLOOR_Y = -0.5;

const TILT_OPTIONS = [
  { label: "0° (垂直)", value: 0 },
  { label: "15°", value: Math.PI / 12 },
  { label: "30°", value: Math.PI / 6 },
  { label: "45° (大仰角)", value: Math.PI / 4 },
];

export const HOLD_SUBTYPES: Record<HoldType, HoldSubtype[]> = {
  jug: [
    { id: "jug-large", label: "大 Jug", scale: 1.4, geometry: "cylinder", params: [0.14, 0.1, 0.12, 16] },
    { id: "jug-medium", label: "中 Jug", scale: 1.0, geometry: "cylinder", params: [0.1, 0.07, 0.1, 16] },
    { id: "jug-small", label: "小 Jug", scale: 0.7, geometry: "cylinder", params: [0.07, 0.05, 0.08, 16] },
    { id: "jug-crescent", label: "月牙 Jug", scale: 1.1, geometry: "torus", params: [0.08, 0.04, 8, 16, Math.PI] },
    { id: "jug-egg", label: "椭圆 Jug", scale: 1.2, geometry: "sphere", params: [0.1, 16, 16] },
  ],
  sloper: [
    { id: "sloper-big", label: "大 Sloper", scale: 1.3, geometry: "sphere", params: [0.12, 16, 16] },
    { id: "sloper-small", label: "小 Sloper", scale: 0.7, geometry: "sphere", params: [0.07, 12, 12] },
    { id: "sloper-wide", label: "宽 Sloper", scale: 1.2, geometry: "sphere", params: [0.1, 12, 16] },
    { id: "sloper-negative", label: "负角度 Sloper", scale: 1.0, geometry: "sphere", params: [0.09, 16, 16] },
  ],
  crimp: [
    { id: "crimp-big", label: "大 Crimp", scale: 1.2, geometry: "box", params: [0.18, 0.05, 0.07] },
    { id: "crimp-small", label: "小 Crimp", scale: 0.8, geometry: "box", params: [0.12, 0.04, 0.05] },
    { id: "crimp-thin", label: "薄 Crimp", scale: 0.9, geometry: "box", params: [0.15, 0.025, 0.05] },
    { id: "crimp-open", label: "开手 Crimp", scale: 1.0, geometry: "box", params: [0.14, 0.06, 0.08] },
  ],
  pinch: [
    { id: "pinch-wide", label: "宽 Pinch", scale: 1.3, geometry: "box", params: [0.06, 0.14, 0.1] },
    { id: "pinch-narrow", label: "窄 Pinch", scale: 0.9, geometry: "box", params: [0.05, 0.1, 0.08] },
    { id: "pinch-slanted", label: "倾斜 Pinch", scale: 1.1, geometry: "box", params: [0.055, 0.12, 0.09] },
    { id: "pinch-thumbs", label: "拇指 Pinch", scale: 0.8, geometry: "box", params: [0.045, 0.08, 0.07] },
  ],
  pocket: [
    { id: "pocket-1f", label: "1指 Pocket", scale: 0.7, geometry: "cylinder", params: [0.025, 0.025, 0.08, 12] },
    { id: "pocket-2f", label: "2指 Pocket", scale: 0.9, geometry: "cylinder", params: [0.04, 0.04, 0.1, 12] },
    { id: "pocket-3f", label: "3指 Pocket", scale: 1.2, geometry: "cylinder", params: [0.055, 0.055, 0.12, 12] },
    { id: "pocket-oval", label: "椭圆 Pocket", scale: 1.0, geometry: "box", params: [0.08, 0.12, 0.06] },
  ],
  edge: [
    { id: "edge-big", label: "大 Edge", scale: 1.2, geometry: "box", params: [0.14, 0.035, 0.09] },
    { id: "edge-small", label: "小 Edge", scale: 0.7, geometry: "box", params: [0.08, 0.025, 0.06] },
    { id: "edge-deep", label: "深 Edge", scale: 1.0, geometry: "box", params: [0.1, 0.045, 0.12] },
    { id: "edge-incut", label: "内凹 Edge", scale: 0.9, geometry: "box", params: [0.12, 0.03, 0.07] },
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

const FRP_COLOR = "#e8dcc8";

// 岩点示意图组件 - 45度轴测图
function HoldPreview({ subtype, color }: { subtype: HoldSubtype; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(60, 60);
    renderer.setClearColor(0xf0f0f0, 1);

    // 创建场景
    const scene = new THREE.Scene();

    // 创建相机 - 45度轴测视角
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(2, 2, 2);
    camera.lookAt(0, 0, 0);

    // 添加灯光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(3, 5, 3);
    scene.add(directionalLight);

    // 创建几何体
    let geometry: THREE.BufferGeometry;
    switch (subtype.geometry) {
      case "sphere":
        geometry = new THREE.SphereGeometry(...(subtype.params as [number, number, number]));
        break;
      case "cylinder":
        geometry = new THREE.CylinderGeometry(...(subtype.params as [number, number, number, number]));
        break;
      case "box":
        geometry = new THREE.BoxGeometry(...(subtype.params as [number, number, number]));
        break;
      case "cone":
        geometry = new THREE.ConeGeometry(...(subtype.params as [number, number, number]));
        break;
      case "torus":
        geometry = new THREE.TorusGeometry(...(subtype.params as [number, number, number, number, number]));
        break;
      default:
        geometry = new THREE.SphereGeometry(0.1, 16, 16);
    }

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.5,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.setScalar(subtype.scale * 0.8);
    scene.add(mesh);

    // 渲染
    renderer.render(scene, camera);

    // 清理
    return () => {
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [subtype, color]);

  return <canvas ref={canvasRef} width={60} height={60} className="rounded bg-gray-100" />;
}

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
      <mesh position={[0, PANEL_HEIGHT / 2, 0]}>
        <planeGeometry args={[PANEL_WIDTH, PANEL_HEIGHT]} />
        <meshStandardMaterial map={texture} color={FRP_COLOR} roughness={0.9} metalness={0.05} />
      </mesh>
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

function HoldGeometry({
  geometry,
  params,
  scale,
  color,
  isSelected,
}: {
  geometry: string;
  params: number[];
  scale: number;
  color: string;
  isSelected: boolean;
}) {
  const actualScale = scale * (isSelected ? 1.15 : 1);

  const material = (
    <meshStandardMaterial
      color={color}
      roughness={0.5}
      metalness={0.1}
      emissive={isSelected ? color : "#000000"}
      emissiveIntensity={isSelected ? 0.3 : 0}
    />
  );

  switch (geometry) {
    case "sphere":
      return (
        <mesh scale={actualScale}>
          <sphereGeometry args={params as [number, number, number]} />
          {material}
        </mesh>
      );
    case "cylinder":
      return (
        <mesh scale={actualScale}>
          <cylinderGeometry args={params as [number, number, number, number]} />
          {material}
        </mesh>
      );
    case "box":
      return (
        <mesh scale={actualScale}>
          <boxGeometry args={params as [number, number, number]} />
          {material}
        </mesh>
      );
    case "cone":
      return (
        <mesh scale={actualScale}>
          <coneGeometry args={params as [number, number, number]} />
          {material}
        </mesh>
      );
    case "torus":
      return (
        <mesh scale={actualScale} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={params as [number, number, number, number, number]} />
          {material}
        </mesh>
      );
    default:
      return (
        <mesh scale={actualScale}>
          <sphereGeometry args={[0.1, 16, 16]} />
          {material}
        </mesh>
      );
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
  onHoldDoubleClick,
  selectedHoldType,
  selectedHoldSubtype,
  selectedHoldId,
}: {
  holds: Hold[];
  tiltAngle: number;
  onAddHold: (position: [number, number, number]) => void;
  onHoldClick: (id: number) => void;
  onHoldDoubleClick: (id: number) => void;
  selectedHoldType: HoldType;
  selectedHoldSubtype: string;
  selectedHoldId: number | null;
}) {
  const getSubtypeConfig = (type: HoldType, subtypeId: string) => {
    return HOLD_SUBTYPES[type].find((s) => s.id === subtypeId) || HOLD_SUBTYPES[type][0];
  };

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

      <group position={[0, FLOOR_Y, 0]} rotation={[tiltAngle, 0, 0]}>
        <FRPWall />

        <mesh
          position={[0, PANEL_HEIGHT / 2, 0.01]}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            const point = e.point;
            if (point) {
              const localX = point.x;
              const localY = point.y - FLOOR_Y;
              onAddHold([localX, localY, 0.1]);
            }
          }}
        >
          <planeGeometry args={[PANEL_WIDTH, PANEL_HEIGHT]} />
          <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
        </mesh>

        {holds.map((hold) => {
          const subtype = getSubtypeConfig(hold.holdType, hold.holdSubtype);
          return (
            <group key={hold.id} position={hold.position}>
              <group rotation={[0, 0, hold.rotation]}>
                <HoldGeometry
                  geometry={subtype.geometry}
                  params={subtype.params}
                  scale={subtype.scale}
                  color={hold.color}
                  isSelected={selectedHoldId === hold.id}
                />
              </group>
              <mesh
                onClick={(e: ThreeEvent<MouseEvent>) => {
                  e.stopPropagation();
                  onHoldClick(hold.id);
                }}
                onDoubleClick={(e: ThreeEvent<MouseEvent>) => {
                  e.stopPropagation();
                  onHoldDoubleClick(hold.id);
                }}
              >
                <sphereGeometry args={[0.2, 8, 8]} />
                <meshBasicMaterial visible={false} />
              </mesh>
            </group>
          );
        })}
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
  const [selectedHoldSubtype, setSelectedHoldSubtype] = useState("jug-medium");
  const [holds, setHolds] = useState<Hold[]>([
    { id: 1, position: [-0.8, 1.2, 0.1], color: "#e74c3c", holdType: "jug", holdSubtype: "jug-large", rotation: 0 },
    { id: 2, position: [-0.3, 2.0, 0.1], color: "#e74c3c", holdType: "jug", holdSubtype: "jug-medium", rotation: Math.PI / 4 },
    { id: 3, position: [0.2, 1.5, 0.1], color: "#e74c3c", holdType: "jug", holdSubtype: "jug-small", rotation: 0 },
    { id: 4, position: [-0.6, 2.8, 0.1], color: "#3498db", holdType: "sloper", holdSubtype: "sloper-big", rotation: 0 },
    { id: 5, position: [0.3, 2.5, 0.1], color: "#3498db", holdType: "sloper", holdSubtype: "sloper-small", rotation: Math.PI / 6 },
    { id: 6, position: [-0.4, 3.5, 0.1], color: "#2ecc71", holdType: "crimp", holdSubtype: "crimp-big", rotation: 0 },
    { id: 7, position: [0.5, 3.2, 0.1], color: "#2ecc71", holdType: "crimp", holdSubtype: "crimp-thin", rotation: Math.PI / 4 },
    { id: 8, position: [-0.7, 4.0, 0.1], color: "#f39c12", holdType: "pinch", holdSubtype: "pinch-wide", rotation: 0 },
    { id: 9, position: [0.6, 3.8, 0.1], color: "#f39c12", holdType: "pinch", holdSubtype: "pinch-narrow", rotation: -Math.PI / 6 },
    { id: 10, position: [-0.2, 4.3, 0.1], color: "#9b59b6", holdType: "pocket", holdSubtype: "pocket-2f", rotation: 0 },
    { id: 11, position: [0.4, 4.5, 0.1], color: "#9b59b6", holdType: "pocket", holdSubtype: "pocket-1f", rotation: Math.PI / 3 },
    { id: 12, position: [-0.5, 1.8, 0.1], color: "#1abc9c", holdType: "edge", holdSubtype: "edge-big", rotation: 0 },
    { id: 13, position: [0.7, 2.2, 0.1], color: "#1abc9c", holdType: "edge", holdSubtype: "edge-small", rotation: -Math.PI / 4 },
  ]);
  const [selectedHold, setSelectedHold] = useState<number | null>(null);
  const [idCounter, setIdCounter] = useState(14);

  const handleTypeChange = (type: HoldType) => {
    setSelectedHoldType(type);
    setSelectedHoldSubtype(HOLD_SUBTYPES[type][0].id);
  };

  const handleAddHold = (position: [number, number, number]) => {
    const config = HOLD_TYPE_CONFIG[selectedHoldType];
    const newHold: Hold = {
      id: idCounter,
      position,
      color: config.color,
      holdType: selectedHoldType,
      holdSubtype: selectedHoldSubtype,
      rotation: 0,
    };
    setHolds([...holds, newHold]);
    setIdCounter(idCounter + 1);
  };

  const handleHoldClick = (id: number) => {
    setSelectedHold(selectedHold === id ? null : id);
  };

  const handleHoldDoubleClick = (id: number) => {
    setHolds(holds.filter((h) => h.id !== id));
    if (selectedHold === id) {
      setSelectedHold(null);
    }
  };

  // 旋转岩点 - 22.5度步进
  const rotateHold = useCallback((direction: "left" | "right") => {
    if (selectedHold !== null) {
      // Shift+左方向键顺时针，Shift+右方向键逆时针
      const delta = direction === "left" ? Math.PI / 8 : -Math.PI / 8;
      setHolds(holds.map((h) =>
        h.id === selectedHold
          ? { ...h, rotation: (h.rotation + delta) % (Math.PI * 2) }
          : h
      ));
    }
  }, [selectedHold, holds]);

  // 移动岩点 - 沿岩壁平面微调
  const moveHold = useCallback((direction: "up" | "down" | "left" | "right") => {
    if (selectedHold !== null) {
      const step = 0.1; // 每次移动 0.1 单位
      setHolds(holds.map((h) => {
        if (h.id !== selectedHold) return h;
        const [x, y, z] = h.position;
        switch (direction) {
          case "up":
            return { ...h, position: [x, y + step, z] };
          case "down":
            return { ...h, position: [x, Math.max(0, y - step), z] };
          case "left":
            return { ...h, position: [x - step, y, z] };
          case "right":
            return { ...h, position: [x + step, y, z] };
          default:
            return h;
        }
      }));
    }
  }, [selectedHold, holds]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略输入框等元素的事件
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (selectedHold !== null) {
        if (e.shiftKey) {
          switch (e.key) {
            case "ArrowLeft":
              e.preventDefault();
              rotateHold("left");
              break;
            case "ArrowRight":
              e.preventDefault();
              rotateHold("right");
              break;
          }
        } else {
          switch (e.key) {
            case "ArrowUp":
              e.preventDefault();
              moveHold("up");
              break;
            case "ArrowDown":
              e.preventDefault();
              moveHold("down");
              break;
            case "ArrowLeft":
              e.preventDefault();
              moveHold("left");
              break;
            case "ArrowRight":
              e.preventDefault();
              moveHold("right");
              break;
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedHold, rotateHold, moveHold]);

  const handleHoldRotate = () => {
    rotateHold("right");
  };

  const removeSelectedHold = () => {
    if (selectedHold !== null) {
      setHolds(holds.filter((h) => h.id !== selectedHold));
      setSelectedHold(null);
    }
  };

  const subtypes = HOLD_SUBTYPES[selectedHoldType];

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
              选中:{" "}
              <span className="font-semibold text-slate-700">
                {HOLD_TYPE_CONFIG[holds.find((h) => h.id === selectedHold)?.holdType || "jug"]?.label}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* 右侧控制面板 */}
      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur rounded-lg shadow-lg p-4 w-80 max-h-[calc(100vh-8rem)] overflow-y-auto">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">岩壁设置</h2>

        {/* 岩点类型选择 */}
        <div className="mb-4">
          <label className="text-xs text-slate-500 mb-2 block">岩点类型</label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(HOLD_TYPE_CONFIG) as HoldType[]).map((type) => (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                className={`px-2 py-2 text-xs rounded-md transition-colors flex items-center gap-1.5 ${
                  selectedHoldType === type
                    ? "bg-blue-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: HOLD_TYPE_CONFIG[type].color }}
                />
                <span className="truncate">{HOLD_TYPE_CONFIG[type].label.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 子类型选择 - 带示意图 */}
        <div className="mb-4">
          <label className="text-xs text-slate-500 mb-2 block">
            {HOLD_TYPE_CONFIG[selectedHoldType].label} 子类型
          </label>
          <div className="grid grid-cols-2 gap-2">
            {subtypes.map((subtype) => (
              <button
                key={subtype.id}
                onClick={() => setSelectedHoldSubtype(subtype.id)}
                className={`p-2 text-xs rounded-md transition-colors flex flex-col items-center gap-1 ${
                  selectedHoldSubtype === subtype.id
                    ? "bg-blue-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <HoldPreview
                  subtype={subtype}
                  color={HOLD_TYPE_CONFIG[selectedHoldType].color}
                />
                <span className="text-center">{subtype.label}</span>
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
                旋转
              </button>
              <button
                onClick={removeSelectedHold}
                className="flex-1 px-3 py-2 bg-red-500 text-white text-xs rounded-md hover:bg-red-600 transition-colors"
              >
                删除
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">双击岩点可直接删除</p>
          </div>
        )}
      </div>

      {/* 底部操作提示 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur rounded-lg shadow-lg px-4 py-2">
        <div className="text-sm text-slate-600 space-y-1">
          <p>
            <span className="text-slate-400">基础操作：</span>
            点击岩壁添加 · 点击岩点选中 · 双击删除
          </p>
          <p>
            <span className="text-slate-400">选中岩点后：</span>
            方向键微调移动 · Shift+左/右方向键旋转
          </p>
        </div>
      </div>

      <Canvas shadows camera={{ position: [0, 2.5, 8], fov: 50 }} gl={{ antialias: true }}>
        <Scene
          holds={holds}
          tiltAngle={tiltAngle}
          onAddHold={handleAddHold}
          onHoldClick={handleHoldClick}
          onHoldDoubleClick={handleHoldDoubleClick}
          selectedHoldType={selectedHoldType}
          selectedHoldSubtype={selectedHoldSubtype}
          selectedHoldId={selectedHold}
        />
      </Canvas>
    </div>
  );
}
