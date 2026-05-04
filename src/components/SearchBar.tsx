import { useState, useCallback } from 'react'
import { useStore } from '../stores/useStore'
import { Search, X, Command } from 'lucide-react'

export default function SearchBar() {
  const { searchQuery, searchSecrets, setSearchQuery, fetchSecrets, selectedTag } = useStore()
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const [isFocused, setIsFocused] = useState(false)

  const handleSearch = useCallback(() => {
    if (localQuery.trim()) {
      searchSecrets(localQuery)
    } else {
      fetchSecrets(selectedTag || undefined)
    }
  }, [localQuery, searchSecrets, fetchSecrets, selectedTag])

  const handleClear = useCallback(() => {
    setLocalQuery('')
    setSearchQuery('')
    fetchSecrets(selectedTag || undefined)
  }, [setSearchQuery, fetchSecrets, selectedTag])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200/60 dark:border-slate-700/40 px-6 py-3 transition-all duration-300">
      <div className={`relative flex items-center transition-all duration-300 ${
        isFocused ? 'scale-[1.02]' : ''
      }`}>
        <div className={`absolute left-4 transition-all duration-300 ${
          isFocused ? 'text-violet-500' : 'text-slate-400'
        }`}>
          <Search className="w-4.5 h-4.5" />
        </div>
        <input
          type="text"
          placeholder="搜索密码、标签..."
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`w-full pl-11 pr-20 py-3 bg-slate-100/80 dark:bg-slate-800/80 border-2 rounded-2xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all duration-300 ${
            isFocused
              ? 'border-violet-400 dark:border-violet-500 bg-white dark:bg-slate-800 shadow-lg shadow-violet-500/10 dark:shadow-violet-500/5'
              : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
          } focus:outline-none`}
        />
        <div className="absolute right-3 flex items-center gap-2">
          {localQuery && (
            <button
              onClick={handleClear}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg transition-all duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-slate-200/60 dark:bg-slate-700/60 rounded-lg">
            <Command className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] font-medium text-slate-400">K</span>
          </div>
        </div>
      </div>
    </div>
  )
}
