import { useState, useEffect, useRef, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'
import { Search, Copy, Check, X, Eye, EyeOff, GripVertical } from 'lucide-react'
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

// 从 localStorage 读取设置
function getSettings() {
  try {
    const saved = localStorage.getItem('secret-warehouse-settings')
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('Failed to load settings:', e)
  }
  return {
    quickSearchPositionMode: 'center',
    quickSearchCustomX: 720,
    quickSearchCustomY: 340,
    clipboardClearSeconds: 30,
  }
}

export default function QuickSearchWindow() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<QuickSearchResult[]>([])
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPlaintext, setShowPlaintext] = useState(false)
  const [clipboardSeconds, setClipboardSeconds] = useState(30)
  const inputRef = useRef<HTMLInputElement>(null)

  // 设置窗口位置
  const setWindowPosition = useCallback(async () => {
    try {
      const settings = getSettings()
      if (settings.quickSearchPositionMode === 'custom') {
        await invoke('set_quick_search_position', {
          x: settings.quickSearchCustomX,
          y: settings.quickSearchCustomY
        })
      } else {
        const [sw, sh] = await invoke<[number, number]>('get_screen_size')
        const x = Math.round((sw - 480) / 2)
        const y = Math.round((sh - 400) / 2)
        await invoke('set_quick_search_position', { x, y })
      }
    } catch (err) {
      console.error('Position error:', err)
    }
  }, [])

  // 隐藏窗口
  const hideWindow = useCallback(async () => {
    await invoke('hide_quick_search_window')
  }, [])

  // 初始化和事件监听
  useEffect(() => {
    // 加载剪贴板设置
    const settings = getSettings()
    setClipboardSeconds(settings.clipboardClearSeconds || 30)

    // 检查会话并设置初始位置（仅首次）
    const init = async () => {
      try {
        await invoke('get_total_secrets_count')
        await setWindowPosition()
        inputRef.current?.focus()
      } catch {
        await hideWindow()
      }
    }
    init()

    // 监听 focus-input 事件（每次显示都重置位置到设置的位置）
    const unlistenFocus = listen('focus-input', async () => {
      setQuery('')
      setResults([])
      setCopiedField(null)
      await setWindowPosition()
      setTimeout(() => inputRef.current?.focus(), 50)
    })

    // 键盘事件
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        hideWindow()
      }
    }
    document.addEventListener('keydown', handleKey, true)

    return () => {
      unlistenFocus.then(fn => fn())
      document.removeEventListener('keydown', handleKey, true)
    }
  }, [setWindowPosition, hideWindow])

  // 搜索
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
          showPlaintext
        })
        setResults(res)
      } catch (err) {
        console.error('Search error:', err)
        setResults([])
      }
      setIsLoading(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [query, showPlaintext])

  // 复制字段
  const handleCopy = async (secretId: string, fieldName: string) => {
    try {
      await invoke('copy_field_to_clipboard', {
        secretId,
        fieldName,
        clearSeconds: clipboardSeconds,
      })
      setCopiedField(`${secretId}-${fieldName}`)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Copy error:', err)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-900 overflow-hidden" style={{ borderRadius: '12px' }}>
      {/* 标题栏 - 使用 data-tauri-drag-region 实现拖动 */}
      <div
        data-tauri-drag-region
        className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 select-none cursor-move"
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-slate-400" />
          <Search className="w-4 h-4 text-violet-500" />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">快速搜索</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setShowPlaintext(!showPlaintext)}
            className={`p-1.5 rounded-md transition-all ${
              showPlaintext
                ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title={showPlaintext ? '隐藏明文' : '显示明文'}
          >
            {showPlaintext ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={hideWindow}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            title="关闭"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索标题、描述、字段..."
            className="flex-1 bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400 text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 结果列表 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Search className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">未找到匹配的条目</p>
          </div>
        )}

        {!isLoading && results.map((result) => (
          <div key={result.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0">
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50/50 dark:bg-slate-800/30">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getIconColor(result.icon)} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                {getIcon(result.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 dark:text-white text-sm truncate">{result.title}</div>
                {result.description && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{result.description}</div>
                )}
              </div>
            </div>
            <div className="px-3 py-1">
              {result.fields.map((field) => (
                <button
                  key={field.name}
                  type="button"
                  onClick={() => handleCopy(result.id, field.name)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors group"
                >
                  <div className="text-left min-w-0 flex-1 mr-3">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">{field.name}</div>
                    <div className={`text-sm font-mono truncate ${showPlaintext ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                      {field.value}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {copiedField === `${result.id}-${field.name}` ? (
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-md">
                        <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">已复制</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Copy className="w-3.5 h-3.5 text-violet-500" />
                        <span className="text-xs text-violet-500">复制</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {!query && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <Search className="w-7 h-7 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">输入关键词搜索</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">支持搜索标题、描述、字段名</p>
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          {results.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              找到 <span className="font-medium text-violet-600 dark:text-violet-400">{results.length}</span> 个结果
            </span>
          )}
          {clipboardSeconds > 0 && (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              复制后 {clipboardSeconds}秒 清除剪贴板
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-mono">ESC</kbd>
          <span>关闭</span>
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
