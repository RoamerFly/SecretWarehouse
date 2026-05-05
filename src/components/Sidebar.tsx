import { useStore } from '../stores/useStore'
import { Plus, Star, Layers, Settings, Lock, Database, Loader2 } from 'lucide-react'
import { useState } from 'react'

export default function Sidebar() {
  const { allTags, tagCounts, selectedTag, selectTag, setShowForm, setShowSettings, secrets, generateTestData } = useStore()
  const [isGenerating, setIsGenerating] = useState(false)

  const allCount = secrets.length
  const favoriteCount = secrets.filter(s => s.favorite).length

  const handleGenerateTestData = async () => {
    setIsGenerating(true)
    try {
      const count = await generateTestData()
      console.log(`Generated ${count} test entries`)
    } catch (err) {
      console.error('Failed to generate test data:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <aside className="w-72 bg-white dark:bg-slate-900 flex flex-col border-r border-slate-200 dark:border-slate-700/50">
      {/* Logo */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-700/40">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">SecretWarehouse</h1>
            <p className="text-[10px] text-slate-500 font-medium">安全密码管理器</p>
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
          onClick={handleGenerateTestData}
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
    </aside>
  )
}
