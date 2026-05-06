import { useState, useEffect, useRef, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'
import { Search, Copy, Check, X, Eye, EyeOff } from 'lucide-react'
import { useStore } from '../stores/useStore'
import { iconMap } from '../constants/icons'

interface FieldPreview {
  name: string
  value: string
}

interface QuickSearchResult {
  id: string
  title: string
  description: string
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
  const { settings, updateSettings } = useStore()

  const showPlaintext = settings.quickSearchShowPlaintext

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

  const togglePlaintext = useCallback(() => {
    updateSettings({ quickSearchShowPlaintext: !showPlaintext })
  }, [showPlaintext, updateSettings])

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

  // Search when query or showPlaintext changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await invoke<QuickSearchResult[]>('search_secrets_quick', {
          query: query.trim(),
          showPlaintext: showPlaintext
        })
        setResults(res)
      } catch (err) {
        console.error('Search failed:', err)
        setResults([])
      }
      setIsLoading(false)
    }, 200)

    return () => clearTimeout(timer)
  }, [query, showPlaintext])

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

  // Get shortcut display text
  const getShortcutDisplay = () => {
    const shortcut = settings.quickSearchShortcut || 'CommandOrControl+Shift+P'
    return shortcut
      .replace('CommandOrControl', navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
      .replace('+', ' + ')
      .replace('Command', '⌘')
      .replace('Control', 'Ctrl')
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-[480px] max-h-[60vh] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 p-3 border-b border-slate-200 dark:border-slate-700">
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
            onClick={togglePlaintext}
            className={`p-1.5 rounded-lg transition-colors ${
              showPlaintext
                ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
                : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400'
            }`}
            title={showPlaintext ? '隐藏明文' : '显示明文'}
          >
            {showPlaintext ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-[40vh]">
          {isLoading && (
            <div className="p-6 text-center">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}

          {!isLoading && query && results.length === 0 && (
            <div className="p-6 text-center text-slate-500">
              未找到匹配的条目
            </div>
          )}

          {!isLoading && results.map((result) => (
            <div key={result.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0">
              <div className="px-4 py-3 flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getIconColor(result.icon)} flex items-center justify-center flex-shrink-0`}>
                  {getIcon(result.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 dark:text-white truncate">{result.title}</div>
                  {result.description && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{result.description}</div>
                  )}
                </div>
              </div>
              <div className="px-2 py-0.5">
                {result.fields.map((field) => (
                  <button
                    key={field.name}
                    onClick={() => handleCopy(result.id, field.name)}
                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors group"
                  >
                    <div className="text-left">
                      <div className="text-xs text-slate-500 dark:text-slate-400">{field.name}</div>
                      <div className={`text-sm font-mono ${showPlaintext ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                        {field.value}
                      </div>
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
            <div className="p-6 text-center text-slate-500">
              <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">输入关键词搜索密码条目</p>
              <p className="text-xs mt-1">快捷键: {getShortcutDisplay()}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
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
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlaintext}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-violet-500 transition-colors"
            >
              {showPlaintext ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span>{showPlaintext ? '隐藏明文' : '显示明文'}</span>
            </button>
            <span className="text-xs text-slate-400">ESC 关闭</span>
          </div>
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
