import { useState, useEffect, useRef, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'
import { Search, Copy, Check, X } from 'lucide-react'
import { useStore } from '../stores/useStore'
import { iconMap } from '../constants/icons'

interface FieldPreview {
  name: string
  value: string
}

interface QuickSearchResult {
  id: string
  title: string
  icon: string
  fields: FieldPreview[]
}

export default function QuickSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<QuickSearchResult[]>([])
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const settings = useStore((s) => s.settings)

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setResults([])
    setCopiedField(null)
  }, [])

  const handleOpen = useCallback(() => {
    setIsOpen(true)
    setQuery('')
    setResults([])
    setCopiedField(null)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  // Listen for global shortcut event
  useEffect(() => {
    const unlisten = listen('show-quick-search', () => {
      handleOpen()
    })

    return () => {
      unlisten.then(fn => fn())
    }
  }, [handleOpen])

  // Listen for clipboard cleared event
  useEffect(() => {
    const unlisten = listen('clipboard-cleared', () => {
      setClipboardMessage('剪贴板已自动清除')
      setTimeout(() => setClipboardMessage(null), 2000)
    })

    return () => {
      unlisten.then(fn => fn())
    }
  }, [])

  // Search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await invoke<QuickSearchResult[]>('search_secrets_quick', { query: query.trim() })
        setResults(res)
      } catch (err) {
        console.error('Search failed:', err)
        setResults([])
      }
      setIsLoading(false)
    }, 200)

    return () => clearTimeout(timer)
  }, [query])

  const handleCopy = async (secretId: string, fieldName: string) => {
    try {
      await invoke('copy_field_to_clipboard', {
        secretId,
        fieldName,
        clearSeconds: settings.clipboardClearSeconds,
      })
      setCopiedField(`${secretId}-${fieldName}`)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
      setClipboardMessage(String(err))
      setTimeout(() => setClipboardMessage(null), 3000)
    }
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-32 z-50 animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-[500px] max-h-[70vh] overflow-hidden animate-in slide-in-from-top-4 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索密码条目..."
            className="flex-1 bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400"
          />
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-[50vh]">
          {isLoading && (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}

          {!isLoading && query && results.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              未找到匹配的条目
            </div>
          )}

          {!isLoading && results.map((result) => (
            <div key={result.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0">
              <div className="px-4 py-3 flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getIconColor(result.icon)} flex items-center justify-center`}>
                  {getIcon(result.icon)}
                </div>
                <span className="font-medium text-slate-900 dark:text-white">{result.title}</span>
              </div>
              <div className="px-2 py-1">
                {result.fields.map((field) => (
                  <button
                    key={field.name}
                    onClick={() => handleCopy(result.id, field.name)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors group"
                  >
                    <div className="text-left">
                      <div className="text-xs text-slate-500 dark:text-slate-400">{field.name}</div>
                      <div className="text-sm text-slate-700 dark:text-slate-300 font-mono">{field.value}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {copiedField === `${result.id}-${field.name}` ? (
                        <>
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="text-xs text-green-500">已复制</span>
                        </>
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {!query && !isLoading && (
            <div className="p-8 text-center text-slate-500">
              <Search className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p>输入关键词搜索密码条目</p>
              <p className="text-xs mt-2">快捷键: Ctrl+Shift+P</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          {clipboardMessage ? (
            <span className="text-xs text-amber-500">{clipboardMessage}</span>
          ) : (
            <span className="text-xs text-slate-500">
              点击字段复制到剪贴板
              {settings.clipboardClearSeconds > 0 && (
                <>, {settings.clipboardClearSeconds}秒后自动清除</>
              )}
            </span>
          )}
          <span className="text-xs text-slate-400">ESC 关闭</span>
        </div>
      </div>
    </div>
  )
}

function getIcon(iconName: string) {
  const Icon = iconMap[iconName]
  return Icon ? <Icon className="w-4 h-4 text-white" /> : <span className="text-white text-sm">?</span>
}

function getIconColor(iconName: string): string {
  const colors: Record<string, string> = {
    key: 'from-yellow-400 to-amber-500',
    globe: 'from-blue-400 to-cyan-500',
    'credit-card': 'from-green-400 to-emerald-500',
    lock: 'from-red-400 to-rose-500',
    shield: 'from-violet-400 to-purple-500',
    mail: 'from-pink-400 to-rose-500',
    server: 'from-slate-400 to-slate-500',
    terminal: 'from-gray-400 to-gray-500',
  }
  return colors[iconName] || 'from-yellow-400 to-amber-500'
}
