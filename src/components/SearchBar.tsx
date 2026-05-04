import { useState, useCallback } from 'react'
import { useStore } from '../stores/useStore'
import { Search, X, Command } from 'lucide-react'

export default function SearchBar() {
  const { searchQuery, searchSecrets, setSearchQuery, fetchSecrets, selectedType } = useStore()
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const [isFocused, setIsFocused] = useState(false)

  const handleSearch = useCallback(() => {
    if (localQuery.trim()) {
      searchSecrets(localQuery)
    } else {
      fetchSecrets(selectedType || undefined)
    }
  }, [localQuery, searchSecrets, fetchSecrets, selectedType])

  const handleClear = useCallback(() => {
    setLocalQuery('')
    setSearchQuery('')
    fetchSecrets(selectedType || undefined)
  }, [setSearchQuery, fetchSecrets, selectedType])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="bg-slate-800/50 border-b border-slate-700/50 px-6 py-4 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        {/* Search Input */}
        <div className={`flex-1 relative flex items-center transition-all duration-200 ${
          isFocused ? 'ring-2 ring-blue-500/50' : ''
        } rounded-xl`}>
          <Search className="absolute left-4 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="搜索条目、密码、标签..."
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full pl-12 pr-12 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all duration-200"
          />
          {localQuery && (
            <button
              onClick={handleClear}
              className="absolute right-4 p-1 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Keyboard Shortcut Hint */}
        <div className="hidden md:flex items-center gap-1 px-3 py-2 bg-slate-900/50 rounded-lg border border-slate-700/50">
          <Command className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-500 font-medium">K</span>
        </div>
      </div>
    </div>
  )
}
