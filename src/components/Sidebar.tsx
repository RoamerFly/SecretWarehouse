import { useStore } from '../stores/useStore'
import { Plus, Star, Layers, Settings, Lock, Database, Loader2, User, LogOut, RefreshCw, X, ShieldCheck } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface SidebarProps {
  username?: string
  onLogout?: () => void
  onSwitchUser?: () => void
}

export default function Sidebar({ username, onLogout, onSwitchUser }: SidebarProps) {
  const { allTags, tagCounts, selectedTag, selectTag, setShowForm, setShowSettings, totalSecretsCount, favoritesCount, generateTestData, passwordCheckMode, setPasswordCheckMode } = useStore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showTestDialog, setShowTestDialog] = useState(false)
  const [testCount, setTestCount] = useState(10)
  const menuRef = useRef<HTMLDivElement>(null)

  const allCount = totalSecretsCount
  const favoriteCount = favoritesCount

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleGenerateTestData = async () => {
    setIsGenerating(true)
    try {
      const count = await generateTestData(testCount)
      console.log(`Generated ${count} test entries`)
    } catch (err) {
      console.error('Failed to generate test data:', err)
    } finally {
      setIsGenerating(false)
      setShowTestDialog(false)
    }
  }

  return (
    <aside className="w-72 bg-white dark:bg-slate-900 flex flex-col border-r border-slate-200 dark:border-slate-700/50">
      {/* Logo */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-700/40">
        <div className="flex items-center gap-3">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center hover:scale-105 transition-transform"
            >
              <Lock className="w-5 h-5 text-white" />
            </button>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900" />

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <div className="absolute left-0 top-12 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
                {onLogout && (
                  <button
                    onClick={() => { setShowUserMenu(false); onLogout() }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>退出登录</span>
                  </button>
                )}
                {onSwitchUser && (
                  <button
                    onClick={() => { setShowUserMenu(false); onSwitchUser() }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>切换用户</span>
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">SecretWarehouse</h1>
            {username ? (
              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                <User className="w-3 h-3" />
                <span className="truncate">{username}</span>
              </div>
            ) : (
              <p className="text-[10px] text-slate-500 font-medium">安全密码管理器</p>
            )}
          </div>
        </div>
      </div>

      {/* Add Button */}
      <div className="p-4 space-y-2">
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>新增条目</span>
        </button>
        <button
          onClick={() => setShowTestDialog(true)}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Database className="w-4 h-4" />
          )}
          <span>{isGenerating ? '生成中...' : '生成测试数据'}</span>
        </button>
        <button
          onClick={() => setPasswordCheckMode(!passwordCheckMode)}
          className={`w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            passwordCheckMode
              ? 'bg-green-500 hover:bg-green-400 text-white'
              : 'bg-red-500 hover:bg-red-400 text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>密码强度检测</span>
          <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
            passwordCheckMode
              ? 'bg-green-600 text-green-100'
              : 'bg-red-600 text-red-100'
          }`}>
            {passwordCheckMode ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      {/* Fixed Navigation - All Items & Favorites */}
      <div className="px-3 space-y-1">
        {/* All Items */}
        <button
          onClick={() => selectTag(null)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            selectedTag === null
              ? 'bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span className="flex-1 text-left">全部条目</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {allCount}
          </span>
        </button>

        {/* Favorites */}
        <button
          onClick={() => selectTag('favorite')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            selectedTag === 'favorite'
              ? 'bg-amber-50 dark:bg-slate-800 text-amber-600 dark:text-amber-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          <Star className={`w-4 h-4 ${selectedTag === 'favorite' ? 'fill-current' : ''}`} />
          <span className="flex-1 text-left">收藏夹</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {favoriteCount}
          </span>
        </button>
      </div>

      {/* Scrollable Tags Section */}
      {allTags.length > 0 ? (
        <>
          <div className="my-3 px-6">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">标签</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => selectTag(tag)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                  selectedTag === tag
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
              >
                <span className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-medium bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  #
                </span>
                <span className="flex-1 text-left truncate">{tag}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {tagCounts[tag] || 0}
                </span>
              </button>
            ))}
          </nav>
        </>
      ) : (
        <div className="flex-1" />
      )}

      {/* Settings Button */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700/40">
        <button
          onClick={() => setShowSettings(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>设置</span>
        </button>
      </div>

      {/* Test Data Generation Dialog */}
      {showTestDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-80 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">生成测试数据</h3>
              <button onClick={() => setShowTestDialog(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                生成数量
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={testCount}
                onChange={(e) => setTestCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-slate-500">范围: 1-100</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTestDialog(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleGenerateTestData}
                disabled={isGenerating}
                className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors disabled:opacity-50"
              >
                {isGenerating ? '生成中...' : '确定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
