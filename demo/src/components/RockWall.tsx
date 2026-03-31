"use client";

import { useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

interface Hold {
  id: number;
  position: [number, number, number];
  color: string;
}

function Wall() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial color="#8b7355" roughness={0.8} />
    </mesh>
  );
}

function Hold({ position, color, onClick }: { position: [number, number, number]; color: string; onClick: () => void }) {
  return (
    <mesh position={position} onClick={onClick}>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
  );
}

function Holds({
  holds,
  onHoldClick,
}: {
  holds: Hold[];
  onHoldClick: (id: number) => void;
}) {
  return (
    <>
      {holds.map((hold) => (
        <Hold
          key={hold.id}
          position={hold.position}
          color={hold.color}
          onClick={() => onHoldClick(hold.id)}
        />
      ))}
    </>
  );
}

function ClickPlane({
  onAddHold,
}: {
  onAddHold: (position: [number, number, number]) => void;
}) {
  const { camera, raycaster, mouse } = useThree();

  const handleClick = (event: THREE.Event) => {
    const threeEvent = event as unknown as { point: THREE.Vector3 };
    const point = threeEvent.point;
    if (point) {
      onAddHold([point.x, point.y, point.z]);
    }
  };

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0.01]}
      onClick={handleClick}
    >
      <planeGeometry args={[10, 10]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}

function Scene({
  holds,
  onAddHold,
  onHoldClick,
}: {
  holds: Hold[];
  onAddHold: (position: [number, number, number]) => void;
  onHoldClick: (id: number) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      <Wall />
      <Holds holds={holds} onHoldClick={onHoldClick} />
      <ClickPlane onAddHold={onAddHold} />
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
    </>
  );
}

export default function RockWall() {
  const [holds, setHolds] = useState<Hold[]>([
    { id: 1, position: [-2, 1, 0], color: "#e74c3c" },
    { id: 2, position: [-1, 2, 0], color: "#3498db" },
    { id: 3, position: [0, 1.5, 0], color: "#2ecc71" },
    { id: 4, position: [1, 2.5, 0], color: "#f39c12" },
    { id: 5, position: [2, 1, 0], color: "#9b59b6" },
  ]);
  const [selectedHold, setSelectedHold] = useState<number | null>(null);
  const [idCounter, setIdCounter] = useState(6);

  const handleAddHold = (position: [number, number, number]) => {
    const colors = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const newHold: Hold = { id: idCounter, position, color };
    setHolds([...holds, newHold]);
    setIdCounter(idCounter + 1);
  };

  const handleHoldClick = (id: number) => {
    setSelectedHold(selectedHold === id ? null : id);
  };

  return (
    <div className="w-full h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="absolute top-4 left-4 z-10 text-white">
        <h1 className="text-2xl font-bold mb-2">液丘 - 3D 岩壁</h1>
        <p className="text-sm text-slate-300">点击岩壁添加岩点 / 点击岩点选中</p>
        <p className="text-xs text-slate-400 mt-1">岩点数量: {holds.length}</p>
      </div>
      <Canvas camera={{ position: [0, 2, 8], fov: 50 }}>
        <Scene
          holds={holds}
          onAddHold={handleAddHold}
          onHoldClick={handleHoldClick}
        />
      </Canvas>
    </div>
  );
}
