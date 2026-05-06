import { useState, useEffect, useRef, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'
import { appWindow } from '@tauri-apps/api/window'
import { Search, Copy, Check, X, Eye, EyeOff, Lock } from 'lucide-react'
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

export default function QuickSearchWindow() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<QuickSearchResult[]>([])
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [showPlaintext, setShowPlaintext] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const settings = useStore((s) => s.settings)

  const handleClose = useCallback(async () => {
    setQuery('')
    setResults([])
    setCopiedField(null)
    // 隐藏窗口而不是关闭
    await appWindow.hide()
  }, [])

  const handleFocusInput = useCallback(() => {
    setQuery('')
    setResults([])
    setCopiedField(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  // 检查是否有活动会话
  useEffect(() => {
    const checkSession = async () => {
      try {
        // 尝试获取总数来检查是否有活动会话
        await invoke<number>('get_total_secrets_count')
        setIsLocked(false)
        // 聚焦输入框
        inputRef.current?.focus()
      } catch {
        // 未登录，直接隐藏窗口
        appWindow.hide()
      }
    }
    checkSession()
  }, [])

  // 监听 focus-input 事件
  useEffect(() => {
    const unlisten = listen('focus-input', () => {
      handleFocusInput()
    })
    return () => {
      unlisten.then(fn => fn())
    }
  }, [handleFocusInput])

  // 监听 clipboard-cleared 事件
  useEffect(() => {
    const unlisten = listen('clipboard-cleared', () => {
      setClipboardMessage('剪贴板已自动清除')
      setTimeout(() => setClipboardMessage(null), 2000)
    })
    return () => {
      unlisten.then(fn => fn())
    }
  }, [])

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

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleClose])

  // 失去焦点时隐藏窗口
  useEffect(() => {
    const unlisten = listen('tauri://blur', () => {
      // 延迟隐藏，避免点击时立即消失
      setTimeout(() => {
        appWindow.isFocused().then(focused => {
          if (!focused) {
            handleClose()
          }
        })
      }, 100)
    })
    return () => {
      unlisten.then(fn => fn())
    }
  }, [handleClose])

  // 如果未锁定，显示登录提示
  if (isLocked) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-900 p-6">
        <Lock className="w-12 h-12 text-slate-400 mb-4" />
        <p className="text-slate-600 dark:text-slate-400 text-center">
          请先在主窗口登录
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
          按 ESC 关闭
        </p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
      {/* Search input */}
      <div className="flex items-center gap-3 p-3 border-b border-slate-200 dark:border-slate-700">
        <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索密码条目..."
          className="flex-1 bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400 text-sm"
        />
        <button
          onClick={() => setShowPlaintext(!showPlaintext)}
          className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
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
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-6 text-center">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {!isLoading && query && results.length === 0 && (
          <div className="p-6 text-center text-slate-500 text-sm">
            未找到匹配的条目
          </div>
        )}

        {!isLoading && results.map((result) => (
          <div key={result.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0">
            <div className="px-4 py-2.5 flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50">
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${getIconColor(result.icon)} flex items-center justify-center flex-shrink-0`}>
                {getIcon(result.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 dark:text-white text-sm truncate">{result.title}</div>
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
                  <div className="text-left min-w-0 flex-1">
                    <div className="text-xs text-slate-500 dark:text-slate-400">{field.name}</div>
                    <div className={`text-sm font-mono truncate ${showPlaintext ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                      {field.value}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
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
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
        {clipboardMessage ? (
          <span className="text-xs text-amber-500">{clipboardMessage}</span>
        ) : (
          <span className="text-xs text-slate-500">
            点击字段复制
            {settings.clipboardClearSeconds > 0 && (
              <>, {settings.clipboardClearSeconds}秒后清除</>
            )}
          </span>
        )}
        <span className="text-xs text-slate-400">ESC 关闭</span>
      </div>
    </div>
  )
}

function getIcon(iconName: string) {
  const Icon = iconMap[iconName]
  return Icon ? <Icon className="w-3.5 h-3.5 text-white" /> : <span className="text-white text-xs">?</span>
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
