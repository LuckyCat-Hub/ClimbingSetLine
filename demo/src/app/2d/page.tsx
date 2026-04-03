"use client";

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import html2canvas from "html2canvas";

type HoldType = "jug" | "sloper" | "crimp" | "pinch" | "pocket" | "edge";

interface HoldSubtype {
  id: string;
  label: string;
}

interface Hold2D {
  id: number;
  x: number; // 百分比 0-100
  y: number; // 百分比 0-100
  type: HoldType;
  subtype: string;
  color: string;
  size: number;
  rotation: number; // 旋转角度（度）
}

const HOLD_CONFIG: Record<HoldType, { label: string; color: string; defaultSize: number }> = {
  jug: { label: "Jug (大握)", color: "#e74c3c", defaultSize: 120 },
  sloper: { label: "Sloper (斜面)", color: "#3498db", defaultSize: 135 },
  crimp: { label: "Crimp (窄边)", color: "#2ecc71", defaultSize: 90 },
  pinch: { label: "Pinch (捏握)", color: "#f39c12", defaultSize: 105 },
  pocket: { label: "Pocket (扣点)", color: "#9b59b6", defaultSize: 105 },
  edge: { label: "Edge (平边)", color: "#1abc9c", defaultSize: 105 },
};

const HOLD_SUBTYPES: Record<HoldType, HoldSubtype[]> = {
  jug: [
    { id: "jug-bowl", label: "碗形 Jug" },
    { id: "jug-oval", label: "椭圆 Jug" },
    { id: "jug-horn", label: "牛角 Jug" },
    { id: "jug-flat", label: "平面 Jug" },
    { id: "jug-dip", label: "双孔 Jug" },
  ],
  sloper: [
    { id: "sloper-hemi", label: "半球 Sloper" },
    { id: "sloper-wedge", label: "楔形 Sloper" },
    { id: "sloper-dome", label: "圆顶 Sloper" },
    { id: "sloper-negative", label: "负角 Sloper" },
  ],
  crimp: [
    { id: "crimp-standard", label: "标准 Crimp" },
    { id: "crimp-open", label: "开放手 Crimp" },
    { id: "crimp-deep", label: "深 Crimp" },
    { id: "crimp-thin", label: "薄片 Crimp" },
  ],
  pinch: [
    { id: "pinch-standard", label: "标准 Pinch" },
    { id: "pinch-wide", label: "宽 Pinch" },
    { id: "pinch-slender", label: "狭长 Pinch" },
    { id: "pinch-thumb", label: "拇指 Pinch" },
  ],
  pocket: [
    { id: "pocket-1f", label: "1指 Pocket" },
    { id: "pocket-2f", label: "2指 Pocket" },
    { id: "pocket-3f", label: "3指 Pocket" },
    { id: "pocket-oval", label: "椭圆 Pocket" },
  ],
  edge: [
    { id: "edge-standard", label: "标准 Edge" },
    { id: "edge-deep", label: "深 Edge" },
    { id: "edge-rolled", label: "卷边 Edge" },
    { id: "edge-angled", label: "斜面 Edge" },
  ],
};

const HOLD_ICONS: Record<string, React.ReactNode> = {
  // Jug 类型 - 碗形大握
  "jug-bowl": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <circle cx="20" cy="20" r="14" fill="currentColor" />
      <circle cx="20" cy="18" r="8" fill="#2a2a2a" />
    </svg>
  ),
  // Jug 类型 - 椭圆 Jug
  "jug-oval": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <ellipse cx="20" cy="20" rx="14" ry="10" fill="currentColor" />
      <ellipse cx="20" cy="18" rx="7" ry="4" fill="#2a2a2a" />
    </svg>
  ),
  // Jug 类型 - 牛角 Jug
  "jug-horn": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <path d="M8 30 L14 10 L18 30" fill="currentColor" />
      <path d="M22 30 L26 10 L32 30" fill="currentColor" />
      <rect x="8" y="28" width="24" height="6" rx="2" fill="currentColor" />
    </svg>
  ),
  // Jug 类型 - 平面 Jug
  "jug-flat": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <rect x="4" y="12" width="32" height="16" rx="4" fill="currentColor" />
      <rect x="6" y="22" width="28" height="4" rx="1" fill="#2a2a2a" />
    </svg>
  ),
  // Jug 类型 - 双孔 Jug
  "jug-dip": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <circle cx="13" cy="22" r="9" fill="currentColor" />
      <circle cx="27" cy="22" r="9" fill="currentColor" />
      <circle cx="13" cy="20" r="4" fill="#2a2a2a" />
      <circle cx="27" cy="20" r="4" fill="#2a2a2a" />
    </svg>
  ),
  // Sloper 类型 - 半球 Sloper
  "sloper-hemi": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <path d="M6 28 Q10 6 20 6 Q30 6 34 28 Q26 30 20 30 Q14 30 6 28" fill="currentColor" />
    </svg>
  ),
  // Sloper 类型 - 楔形 Sloper
  "sloper-wedge": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <path d="M6 30 L14 8 L26 8 L34 30 Q20 32 6 30" fill="currentColor" />
    </svg>
  ),
  // Sloper 类型 - 圆顶 Sloper
  "sloper-dome": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <ellipse cx="20" cy="24" rx="15" ry="12" fill="currentColor" />
      <ellipse cx="20" cy="22" rx="10" ry="7" fill="currentColor" opacity="0.8" />
    </svg>
  ),
  // Sloper 类型 - 负角 Sloper
  "sloper-negative": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <path d="M6 16 Q20 34 34 16 Q26 12 20 12 Q14 12 6 16" fill="currentColor" />
    </svg>
  ),
  // Crimp 类型 - 标准 Crimp
  "crimp-standard": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <rect x="6" y="14" width="28" height="14" rx="3" fill="currentColor" />
      <rect x="6" y="24" width="28" height="4" fill="#2a2a2a" />
    </svg>
  ),
  // Crimp 类型 - 开放手 Crimp
  "crimp-open": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <rect x="4" y="12" width="32" height="16" rx="4" fill="currentColor" />
      <rect x="4" y="24" width="32" height="4" fill="#2a2a2a" />
    </svg>
  ),
  // Crimp 类型 - 深 Crimp
  "crimp-deep": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <rect x="8" y="8" width="24" height="24" rx="4" fill="currentColor" />
      <rect x="8" y="26" width="24" height="4" fill="#2a2a2a" />
    </svg>
  ),
  // Crimp 类型 - 薄片 Crimp
  "crimp-thin": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <rect x="6" y="16" width="28" height="8" rx="2" fill="currentColor" />
      <rect x="6" y="22" width="28" height="2" fill="#2a2a2a" />
    </svg>
  ),
  // Pinch 类型 - 标准 Pinch
  "pinch-standard": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <rect x="4" y="10" width="12" height="20" rx="3" fill="currentColor" />
      <rect x="24" y="10" width="12" height="20" rx="3" fill="currentColor" />
    </svg>
  ),
  // Pinch 类型 - 宽 Pinch
  "pinch-wide": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <rect x="2" y="8" width="14" height="24" rx="4" fill="currentColor" />
      <rect x="24" y="8" width="14" height="24" rx="4" fill="currentColor" />
    </svg>
  ),
  // Pinch 类型 - 狭长 Pinch
  "pinch-slender": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <rect x="8" y="6" width="8" height="28" rx="3" fill="currentColor" />
      <rect x="24" y="6" width="8" height="28" rx="3" fill="currentColor" />
    </svg>
  ),
  // Pinch 类型 - 拇指 Pinch
  "pinch-thumb": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <rect x="4" y="10" width="12" height="20" rx="3" fill="currentColor" />
      <rect x="24" y="12" width="12" height="16" rx="3" fill="currentColor" />
    </svg>
  ),
  // Pocket 类型 - 1指 Pocket
  "pocket-1f": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <circle cx="20" cy="20" r="14" fill="currentColor" />
      <ellipse cx="20" cy="18" rx="5" ry="7" fill="#1a1a1a" />
    </svg>
  ),
  // Pocket 类型 - 2指 Pocket
  "pocket-2f": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <rect x="6" y="6" width="28" height="28" rx="5" fill="currentColor" />
      <ellipse cx="14" cy="16" rx="4" ry="6" fill="#1a1a1a" />
      <ellipse cx="26" cy="16" rx="4" ry="6" fill="#1a1a1a" />
    </svg>
  ),
  // Pocket 类型 - 3指 Pocket
  "pocket-3f": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <rect x="4" y="4" width="32" height="32" rx="5" fill="currentColor" />
      <ellipse cx="11" cy="16" rx="3.5" ry="6" fill="#1a1a1a" />
      <ellipse cx="20" cy="16" rx="3.5" ry="6" fill="#1a1a1a" />
      <ellipse cx="29" cy="16" rx="3.5" ry="6" fill="#1a1a1a" />
    </svg>
  ),
  // Pocket 类型 - 椭圆 Pocket
  "pocket-oval": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <ellipse cx="20" cy="20" rx="16" ry="14" fill="currentColor" />
      <ellipse cx="20" cy="18" rx="7" ry="9" fill="#1a1a1a" />
    </svg>
  ),
  // Edge 类型 - 标准 Edge
  "edge-standard": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <rect x="2" y="12" width="36" height="16" rx="4" fill="currentColor" />
      <rect x="2" y="22" width="36" height="4" rx="1" fill="#2a2a2a" />
    </svg>
  ),
  // Edge 类型 - 深 Edge
  "edge-deep": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <rect x="4" y="6" width="32" height="28" rx="4" fill="currentColor" />
      <rect x="4" y="26" width="32" height="4" rx="1" fill="#2a2a2a" />
    </svg>
  ),
  // Edge 类型 - 卷边 Edge
  "edge-rolled": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <rect x="2" y="10" width="36" height="22" rx="5" fill="currentColor" />
      <rect x="4" y="8" width="32" height="4" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="4" y="18" width="32" height="10" rx="2" fill="#2a2a2a" />
    </svg>
  ),
  // Edge 类型 - 斜面 Edge
  "edge-angled": (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <rect x="2" y="12" width="36" height="16" rx="3" fill="currentColor" transform="rotate(-8 20 20)" />
      <rect x="4" y="22" width="32" height="3" rx="1" fill="#2a2a2a" transform="rotate(-8 20 20)" />
    </svg>
  ),
};

export default function Page2D() {
  const [holds, setHolds] = useState<Hold2D[]>([]);
  const [selectedType, setSelectedType] = useState<HoldType>("jug");
  const [selectedSubtype, setSelectedSubtype] = useState<string>("jug-bowl");
  const [selectedHoldId, setSelectedHoldId] = useState<number | null>(null);
  const [holdIdCounter, setHoldIdCounter] = useState(1);
  const [wallImage, setWallImage] = useState<string | null>(null);
  const [wallSize, setWallSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [draggingHoldId, setDraggingHoldId] = useState<number | null>(null);
  const [mode, setMode] = useState<'add' | 'select'>('add');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<Hold2D[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  // 保存历史记录
  const saveHistory = useCallback((newHolds: Hold2D[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push([...newHolds]);
      return newHistory.slice(-50); // 最多保存50步
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // 撤销
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setHolds([...history[newIndex]]);
    }
  }, [historyIndex, history]);

  // 重做
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setHolds([...history[newIndex]]);
    }
  }, [historyIndex, history]);

  // 处理图片上传 (暂时禁用)
  const _handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          setWallSize({ width: img.width, height: img.height });
        };
        img.src = ev.target?.result as string;
        setWallImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 在画布上点击添加岩点
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // 选择模式下点击空白区域取消选择
    if (mode === 'select') {
      // 检查是否点击了已有岩点
      const clickedHold = holds.find(h => {
        const distance = Math.sqrt(Math.pow(h.x - x, 2) + Math.pow(h.y - y, 2));
        const threshold = h.size / 100; // 根据岩点大小判断
        return distance < threshold;
      });

      if (clickedHold) {
        setSelectedHoldId(clickedHold.id);
      } else {
        setSelectedHoldId(null);
      }
      return;
    }

    // 添加模式：检查是否点击了已有岩点，如果是则选中而不是新增
    const existingHold = holds.find(h => {
      const distance = Math.sqrt(Math.pow(h.x - x, 2) + Math.pow(h.y - y, 2));
      const threshold = h.size / 100;
      return distance < threshold;
    });

    if (existingHold) {
      setSelectedHoldId(existingHold.id);
      return;
    }

    const newHold: Hold2D = {
      id: holdIdCounter,
      x,
      y,
      type: selectedType,
      subtype: selectedSubtype,
      color: HOLD_CONFIG[selectedType].color,
      size: HOLD_CONFIG[selectedType].defaultSize,
      rotation: 0,
    };

    const newHolds = [...holds, newHold];
    setHolds(newHolds);
    saveHistory(newHolds);
    setHoldIdCounter(holdIdCounter + 1);
    setSelectedHoldId(newHold.id);
  };

  // 移动选中岩点（仅在真正拖拽时移动）
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!isDragging || draggingHoldId === null) return;
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setHolds(holds.map((h) =>
      h.id === draggingHoldId ? { ...h, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : h
    ));
  };

  // 停止拖拽
  const handleMouseUp = () => {
    if (isDragging) {
      saveHistory(holds);
    }
    setIsDragging(false);
    setDraggingHoldId(null);
  };

  // 截图功能 - 使用 html2canvas 捕获实际显示内容
  const handleScreenshot = async () => {
    if (!canvasRef.current) return;

    try {
      // html2canvas v1.4+ API
      const canvas = await html2canvas(canvasRef.current);

      const dataUrl = canvas.toDataURL('image/png');
      setCapturedImage(dataUrl);
    } catch (error) {
      console.error('截图失败:', error);
    }
  };

  // 下载图片
  const handleDownload = () => {
    if (!capturedImage) return;
    const link = document.createElement('a');
    link.download = `rock-wall-${Date.now()}.png`;
    link.href = capturedImage;
    link.click();
  };

  // 分享图片
  const handleShare = async () => {
    if (!capturedImage) return;
    try {
      const blob = await (await fetch(capturedImage)).blob();
      const file = new File([blob], 'rock-wall.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: '攀岩定线',
          text: '我的攀岩定线作品',
        });
      } else {
        // 不支持分享则提示
        alert('您的浏览器不支持分享功能，请使用下载按钮');
      }
    } catch (error) {
      console.error('分享失败:', error);
    }
  };

  // 删除选中岩点
  const deleteSelectedHold = useCallback(() => {
    if (selectedHoldId !== null) {
      const newHolds = holds.filter((h) => h.id !== selectedHoldId);
      saveHistory(newHolds);
      setHolds(newHolds);
      setSelectedHoldId(null);
    }
  }, [selectedHoldId, holds, saveHistory]);

  // 键盘删除
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") {
          e.preventDefault();
          undo();
        } else if (e.key === "y") {
          e.preventDefault();
          redo();
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelectedHold();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelectedHold, undo, redo]);

  // 计算是否显示侧边栏（选择模式下隐藏）
  const showLeftSidebar = mode === 'add';
  const showRightSidebar = mode === 'add' || (mode === 'select' && selectedHoldId !== null);
  const showRightSidebarEmpty = mode === 'select' && selectedHoldId === null;

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* 左侧工具条 - 始终显示 */}
      <div className="w-14 bg-slate-800 border-r border-slate-700 p-2 flex flex-col items-center gap-2">
        {/* 选择模式 */}
        <button
          onClick={() => setMode('select')}
          className={`p-2 rounded-lg transition-all ${
            mode === 'select'
              ? 'bg-yellow-500 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
          title="选择模式"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            <path d="M13 13l6 6" />
          </svg>
        </button>

        {/* 添加模式 */}
        <button
          onClick={() => setMode('add')}
          className={`p-2 rounded-lg transition-all ${
            mode === 'add'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
          title="添加模式"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </button>

        {/* 截图功能 */}
        <button
          onClick={handleScreenshot}
          className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
          title="截图"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>

        {/* 分隔线 */}
        <div className="w-8 h-px bg-slate-600 my-1" />

        {/* 返回首页 */}
        <Link
          href="/"
          className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
          title="返回首页"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
      </div>

      {/* 左侧边栏 - 父类选择 (可折叠) */}
      {showLeftSidebar && (
        <div className="w-1/4 bg-white border-r border-slate-200 p-4 flex flex-col overflow-y-auto">
          <h2 className="text-base font-bold text-slate-800 mb-1">岩点类型</h2>
        <p className="text-sm text-slate-500 mb-4">选择父类</p>

        {/* 父类选择 */}
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(HOLD_CONFIG) as HoldType[]).map((type) => (
            <button
              key={type}
              onClick={() => {
                setSelectedType(type);
                setSelectedSubtype(HOLD_SUBTYPES[type][0].id);
              }}
              className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                selectedType === type
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div
                className="w-12 h-12"
                style={{ color: HOLD_CONFIG[type].color }}
              >
                {HOLD_ICONS[HOLD_SUBTYPES[type][0].id]}
              </div>
              <span className="text-xs text-slate-600">{HOLD_CONFIG[type].label.split(" ")[0]}</span>
            </button>
          ))}
        </div>

        {/* 统计 */}
        <div className="mt-auto pt-4 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            岩点数量: <span className="font-semibold text-slate-700">{holds.length}</span>
          </p>
        </div>
        </div>
      )}

      {/* 中间画布 - 攀岩板 */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-auto p-8">
        {/* 画布区域 - 木质洞洞板背景 竖屏 */}
        <div
          ref={canvasRef}
          className="relative rounded-xl shadow-lg overflow-hidden cursor-crosshair select-none bg-wood"
          style={{
            width: "533px",
            height: "800px",
            maxWidth: "100%",
            aspectRatio: "2 / 3",
          }}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* 木质纹理背景 */}
          <div className="absolute inset-0 bg-wood-texture" />

          {/* 洞洞层 - 竖屏排列 */}
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="holes" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="6" fill="#2a2a2a" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#holes)" />
          </svg>

          {wallImage && (
            <img
              src={wallImage}
              alt="岩壁"
              className="absolute inset-0 w-full h-full object-contain z-10"
              draggable={false}
            />
          )}

          {/* 岩点渲染层 */}
          {holds.map((hold) => (
            <div
              key={hold.id}
              className={`absolute transition-all cursor-grab ${
                selectedHoldId === hold.id && mode === 'select'
                  ? "ring-4 ring-yellow-400 ring-offset-2 shadow-lg shadow-yellow-400/50"
                  : selectedHoldId === hold.id
                  ? "ring-4 ring-blue-500 ring-offset-2"
                  : ""
              }`}
              style={{
                left: `${hold.x}%`,
                top: `${hold.y}%`,
                width: hold.size,
                height: hold.size,
                color: hold.color,
                transform: `translate(-50%, -50%) rotate(${hold.rotation}deg)`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                // 在添加模式下点击已有岩点则选中它
                if (mode === 'add' || mode === 'select') {
                  setSelectedHoldId(hold.id);
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                const newHolds = holds.filter((h) => h.id !== hold.id);
                saveHistory(newHolds);
                setHolds(newHolds);
                if (selectedHoldId === hold.id) setSelectedHoldId(null);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                // 如果之前有拖拽，先结束之前的拖拽
                if (isDragging && draggingHoldId !== null) {
                  saveHistory(holds);
                }
                setDraggingHoldId(hold.id);
                setIsDragging(true);
              }}
              onMouseUp={() => {
                setIsDragging(false);
                setDraggingHoldId(null);
              }}
            >
              {HOLD_ICONS[hold.subtype] || HOLD_ICONS[HOLD_SUBTYPES[hold.type][0].id]}
            </div>
          ))}
        </div>

        {/* 标题和撤销重做按钮 */}
        <div className="mt-4 flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-slate-700">岩壁画布</h2>
            <div className="flex gap-1">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className={`p-2 rounded-lg ${historyIndex <= 0 ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                title="撤销 (Ctrl+Z)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 10h10a5 5 0 0 1 5 5v2" />
                  <polyline points="3 10 8 5" />
                  <polyline points="3 10 8 15" />
                </svg>
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className={`p-2 rounded-lg ${historyIndex >= history.length - 1 ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                title="重做 (Ctrl+Y)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10H11a5 5 0 0 0-5 5v2" />
                  <polyline points="21 10 16 5" />
                  <polyline points="21 10 16 15" />
                </svg>
              </button>
            </div>
          </div>

          {/* 选择模式指针按钮 - 左下角 */}
        </div>

        {/* 提示 */}
        <div className="mt-2 text-sm text-slate-500">
          <p>点击画布添加岩点 · 点击岩点选中 · 双击删除岩点 · 拖拽移动岩点 · Ctrl+Z撤销 · Ctrl+Y重做</p>
        </div>
      </div>

      {/* 右侧边栏 */}
      {showRightSidebar && (
        <div className="w-1/4 bg-white border-l border-slate-200 p-4 flex flex-col overflow-y-auto">
          {/* 添加模式：显示子类选择 */}
          {mode === 'add' && (
            <>
              <h2 className="text-base font-bold text-slate-800 mb-1">{HOLD_CONFIG[selectedType].label}</h2>
              <p className="text-sm text-slate-500 mb-4">选择子类型</p>

              {/* 子类选择 */}
              <div className="grid grid-cols-3 gap-3">
                {HOLD_SUBTYPES[selectedType].map((subtype) => (
                  <button
                    key={subtype.id}
                    onClick={() => setSelectedSubtype(subtype.id)}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      selectedSubtype === subtype.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div
                      className="w-14 h-14"
                      style={{ color: HOLD_CONFIG[selectedType].color }}
                    >
                      {HOLD_ICONS[subtype.id]}
                    </div>
                    <span className="text-xs text-slate-600 text-center">{subtype.label.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* 选中岩点时显示属性（添加和选择模式都显示） */}
          {selectedHoldId !== null && (
            <div className={mode === 'add' ? 'mt-6 pt-4 border-t border-slate-200' : ''}>
              <h2 className="text-base font-bold text-slate-800 mb-1">选中岩点</h2>
              <p className="text-sm text-slate-500 mb-4">调整属性</p>

              {/* 选中岩点属性 */}
              <div className="pt-4 border-t border-slate-200">
                {/* 尺寸滑条 */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-slate-500 mb-2">
                    <span>尺寸</span>
                    <span>{Math.round(holds.find(h => h.id === selectedHoldId)?.size ?? 0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="5"
                    value={holds.find(h => h.id === selectedHoldId)?.size ?? 100}
                    onMouseDown={() => saveHistory(holds)}
                    onChange={(e) => {
                      const newSize = parseInt(e.target.value);
                      setHolds(holds.map(h =>
                        h.id === selectedHoldId ? { ...h, size: newSize } : h
                      ));
                    }}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* 旋转滑条 */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-slate-500 mb-2">
                    <span>旋转</span>
                    <span>{Math.round((holds.find(h => h.id === selectedHoldId)?.rotation ?? 0))}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="5"
                    value={holds.find(h => h.id === selectedHoldId)?.rotation ?? 0}
                    onMouseDown={() => saveHistory(holds)}
                    onChange={(e) => {
                      const newRotation = parseInt(e.target.value);
                      setHolds(holds.map(h =>
                        h.id === selectedHoldId ? { ...h, rotation: newRotation } : h
                      ));
                    }}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <button
                  onClick={deleteSelectedHold}
                  className="w-full px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                >
                  删除岩点
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 选择模式且未选中岩点时显示的空提示（不占位） */}
      {showRightSidebarEmpty && (
        <div className="w-1/4 bg-white border-l border-slate-200 p-4 flex flex-col items-center justify-center">
          <p className="text-slate-400 text-sm">点击岩点进行选择</p>
        </div>
      )}

      {/* 截图预览弹窗 */}
      {capturedImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 max-w-lg w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">截图预览</h3>
              <button
                onClick={() => setCapturedImage(null)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <img
              src={capturedImage}
              alt="截图预览"
              className="w-full rounded-lg mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                下载
              </button>
              <button
                onClick={handleShare}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                分享
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
