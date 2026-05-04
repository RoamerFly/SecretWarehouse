import { useStore } from '../stores/useStore'
import { useTheme } from './ThemeProvider'
import {
  Plus,
  Star,
  Layers,
  Sun,
  Moon,
  Monitor,
  Lock,
} from 'lucide-react'

export default function Sidebar() {
  const { allTags, selectedTag, selectTag, setShowForm, secrets } = useStore()
  const { theme, setTheme } = useTheme()

  const favoriteCount = secrets.filter(s => s.favorite).length

  const themeOptions = [
    { value: 'light' as const, icon: Sun, label: '浅色' },
    { value: 'dark' as const, icon: Moon, label: '深色' },
    { value: 'system' as const, icon: Monitor, label: '跟随系统' },
  ]

  return (
    <aside className="w-72 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex flex-col border-r border-slate-200/80 dark:border-slate-700/50 transition-all duration-300">
      {/* Logo */}
      <div className="p-5 border-b border-slate-200/60 dark:border-slate-700/40">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25 dark:shadow-purple-500/10">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              SecretWarehouse
            </h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-wide">
              安全密码管理器
            </p>
          </div>
        </div>
      </div>

      {/* Add Button */}
      <div className="p-4">
        <button
          onClick={() => setShowForm(true)}
          className="w-full group relative flex items-center justify-center gap-2.5 px-4 py-3 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 hover:from-violet-600 hover:via-purple-600 hover:to-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          <span>新增条目</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-1">
        {/* All Items */}
        <button
          onClick={() => selectTag(null)}
          className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            selectedTag === null
              ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-md shadow-slate-200/50 dark:shadow-slate-900/50'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:shadow-sm'
          }`}
        >
          <div className={`p-1.5 rounded-lg transition-colors ${
            selectedTag === null
              ? 'bg-violet-100 dark:bg-violet-900/30'
              : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
          }`}>
            <Layers className="w-4 h-4" />
          </div>
          <span className="flex-1 text-left">全部条目</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            selectedTag === null
              ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
          }`}>
            {secrets.length}
          </span>
        </button>

        {/* Favorites */}
        <button
          onClick={() => selectTag('favorite')}
          className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            selectedTag === 'favorite'
              ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-md shadow-slate-200/50 dark:shadow-slate-900/50'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:shadow-sm'
          }`}
        >
          <div className={`p-1.5 rounded-lg transition-colors ${
            selectedTag === 'favorite'
              ? 'bg-amber-100 dark:bg-amber-900/30'
              : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
          }`}>
            <Star className={`w-4 h-4 ${selectedTag === 'favorite' ? 'fill-current' : ''}`} />
          </div>
          <span className="flex-1 text-left">收藏夹</span>
          {favoriteCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              selectedTag === 'favorite'
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>
              {favoriteCount}
            </span>
          )}
        </button>

        {/* Tags Section */}
        {allTags.length > 0 && (
          <>
            <div className="my-4 px-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent" />
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">标签</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent" />
              </div>
            </div>
            <div className="space-y-0.5">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => selectTag(tag)}
                  className={`w-full group flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200 ${
                    selectedTag === tag
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-md shadow-slate-200/50 dark:shadow-slate-900/50'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-medium transition-colors ${
                    selectedTag === tag
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                  }`}>
                    #
                  </span>
                  <span className="flex-1 text-left truncate">{tag}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Theme Switcher */}
      <div className="p-4 border-t border-slate-200/60 dark:border-slate-700/40">
        <div className="flex gap-1.5 p-1.5 bg-slate-200/80 dark:bg-slate-800/80 rounded-xl">
          {themeOptions.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex-1 flex items-center justify-center p-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                theme === value
                  ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
              title={label}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
