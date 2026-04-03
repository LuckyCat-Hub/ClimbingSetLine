import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* 标题 */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">液丘</h1>
          <p className="text-slate-400 text-lg">攀岩抱石定线 Web 应用</p>
          <p className="text-slate-500 text-sm mt-2">3D 可视化 · 2D 便捷 · AI 辅助</p>
        </div>

        {/* 选择卡片 */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* 3D 模式 */}
          <Link href="/3d">
            <div className="group bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 hover:bg-slate-700/50 hover:border-blue-500/50 transition-all duration-300 cursor-pointer">
              <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/30 transition-colors">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-white mb-3">3D 模式</h2>
              <p className="text-slate-400 mb-6">
                多角度攀岩墙立体可视化，支持旋转、缩放，模拟真实岩壁视角
              </p>
              <ul className="text-sm text-slate-500 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  多角度墙面倾斜 (0°-90°)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  6种岩点类型完整3D模型
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  轨道相机自由旋转查看
                </li>
              </ul>
              <div className="mt-8 flex items-center gap-2 text-blue-400">
                <span>进入 3D 模式</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* 2D 模式 */}
          <Link href="/2d">
            <div className="group bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 hover:bg-slate-700/50 hover:border-green-500/50 transition-all duration-300 cursor-pointer">
              <div className="w-16 h-16 bg-green-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-500/30 transition-colors">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-white mb-3">2D 模式</h2>
              <p className="text-slate-400 mb-6">
                简化平面视图，上传岩壁照片，在2D平面上快速规划线路
              </p>
              <ul className="text-sm text-slate-500 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  上传真实岩壁照片
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  2D岩点标记快速放置
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  适合现场快速定线
                </li>
              </ul>
              <div className="mt-8 flex items-center gap-2 text-green-400">
                <span>进入 2D 模式</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* 底部说明 */}
        <div className="text-center mt-16 text-slate-500 text-sm">
          <p>Vibecoding 项目 · AI 辅助编程实践</p>
        </div>
      </div>
    </div>
  );
}
