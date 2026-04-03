import RockWall3D from "@/components/RockWall3D";
import Link from "next/link";

export default function Page3D() {
  return (
    <div className="relative">
      {/* 返回首页 */}
      <Link
        href="/"
        className="absolute top-4 left-4 z-30 bg-white/90 backdrop-blur rounded-lg px-4 py-2 flex items-center gap-2 text-slate-700 hover:bg-white transition-colors shadow-lg"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        <span className="font-medium">返回首页</span>
      </Link>
      <RockWall3D />
    </div>
  );
}
