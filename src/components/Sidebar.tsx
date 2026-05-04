import { useStore } from '../stores/useStore'
import {
  Plus,
  Star,
  Layers,
  Shield,
  Tag,
} from 'lucide-react'

export default function Sidebar() {
  const { allTags, selectedTag, selectTag, setShowForm, secrets } = useStore()

  const handleTagClick = (tagName: string | null) => {
    selectTag(tagName)
  }

  // 统计收藏数量
  const favoriteCount = secrets.filter(s => s.favorite).length

  return (
    <aside className="w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col border-r border-slate-700/50">
      {/* Logo Header */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              SecretWarehouse
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              自由秘密管理器
            </p>
          </div>
        </div>
      </div>

      {/* Add Button */}
      <div className="p-4">
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          新增条目
        </button>
      </div>

      {/* Quick Filters */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="space-y-1">
          {/* All Items */}
          <button
            onClick={() => handleTagClick(null)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              selectedTag === null
                ? 'bg-slate-700/50 text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-700/30 hover:text-white'
            }`}
          >
            <div className={`p-2 rounded-lg ${
              selectedTag === null
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-slate-700/50 text-slate-500'
            }`}>
              <Layers className="w-4 h-4" />
            </div>
            <span className="flex-1 text-left">全部条目</span>
            <span className="text-xs text-slate-500">{secrets.length}</span>
          </button>

          {/* Favorites */}
          <button
            onClick={() => handleTagClick('favorite')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              selectedTag === 'favorite'
                ? 'bg-slate-700/50 text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-700/30 hover:text-white'
            }`}
          >
            <div className={`p-2 rounded-lg ${
              selectedTag === 'favorite'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-slate-700/50 text-slate-500'
            }`}>
              <Star className="w-4 h-4" />
            </div>
            <span className="flex-1 text-left">收藏夹</span>
            <span className="text-xs text-slate-500">{favoriteCount}</span>
          </button>
        </div>

        {/* Divider */}
        <div className="my-4 px-4">
          <div className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
        </div>

        {/* Tags */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-4 mb-2">
            <Tag className="w-3.5 h-3.5 text-slate-500" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              标签
            </p>
          </div>
          {allTags.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500 italic">
              暂无标签
            </p>
          ) : (
            allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  selectedTag === tag
                    ? 'bg-slate-700/50 text-white shadow-lg'
                    : 'text-slate-400 hover:bg-slate-700/30 hover:text-white'
                }`}
              >
                <span className="text-slate-500">#</span>
                <span className="flex-1 text-left truncate">{tag}</span>
              </button>
            ))
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700/50">
        <p className="text-xs text-slate-500 text-center">
          AES-256 加密保护
        </p>
      </div>
    </aside>
  )
}
