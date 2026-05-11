import { useState, useEffect, useRef, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { Plus, X, Eye, EyeOff, GripVertical, Save, Loader2 } from 'lucide-react'
import { iconMap } from '../constants/icons'

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
    quickAddPositionMode: 'center',
    quickAddCustomX: 720,
    quickAddCustomY: 340,
  }
}

interface FieldItem {
  id: number
  key: string
  value: string
  sensitive: boolean
}

let fieldIdCounter = 0
const generateFieldId = () => ++fieldIdCounter

export default function QuickAddWindow() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [fields, setFields] = useState<FieldItem[]>([
    { id: generateFieldId(), key: '用户名', value: '', sensitive: false },
    { id: generateFieldId(), key: '密码', value: '', sensitive: true },
  ])
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [icon, setIcon] = useState('key')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  // 设置窗口位置
  const setWindowPosition = useCallback(async () => {
    try {
      const settings = getSettings()
      if (settings.quickAddPositionMode === 'custom') {
        await invoke('set_quick_add_position', {
          x: settings.quickAddCustomX,
          y: settings.quickAddCustomY
        })
      } else {
        const [sw, sh] = await invoke<[number, number]>('get_screen_size')
        const x = Math.round((sw - 480) / 2)
        const y = Math.round((sh - 500) / 2)
        await invoke('set_quick_add_position', { x, y })
      }
    } catch (err) {
      console.error('Position error:', err)
    }
  }, [])

  // 隐藏窗口
  const hideWindow = useCallback(async () => {
    await invoke('hide_quick_add_window')
  }, [])

  // 重置表单
  const resetForm = useCallback(() => {
    setTitle('')
    setDescription('')
    setFields([
      { id: generateFieldId(), key: '用户名', value: '', sensitive: false },
      { id: generateFieldId(), key: '密码', value: '', sensitive: true },
    ])
    setTags([])
    setTagInput('')
    setIcon('key')
    setError(null)
    setSuccess(false)
  }, [])

  // 初始化
  useEffect(() => {
    const init = async () => {
      try {
        await invoke('get_total_secrets_count')
        await setWindowPosition()
        titleRef.current?.focus()
      } catch {
        await hideWindow()
      }
    }
    init()

    // 监听 focus-quick-add-input 事件
    const unlistenFocus = listen('focus-quick-add-input', async () => {
      resetForm()
      await setWindowPosition()
      setTimeout(() => titleRef.current?.focus(), 50)
    })

    // 键盘事件
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        hideWindow()
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSubmit()
      }
    }
    document.addEventListener('keydown', handleKey, true)

    return () => {
      unlistenFocus.then(fn => fn())
      document.removeEventListener('keydown', handleKey, true)
    }
  }, [setWindowPosition, hideWindow, resetForm])

  // 添加字段
  const addField = () => {
    setFields([...fields, { id: generateFieldId(), key: '', value: '', sensitive: false }])
  }

  // 更新字段
  const updateField = (id: number, key: string, value: string) => {
    setFields(fields.map(f => f.id === id ? { ...f, key, value } : f))
  }

  // 切换敏感字段
  const toggleSensitive = (id: number) => {
    setFields(fields.map(f => f.id === id ? { ...f, sensitive: !f.sensitive } : f))
  }

  // 删除字段
  const removeField = (id: number) => {
    if (fields.length > 1) {
      setFields(fields.filter(f => f.id !== id))
    }
  }

  // 添加标签
  const addTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }

  // 删除标签
  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  // 标签回车
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  // 提交
  const handleSubmit = async () => {
    if (!title.trim() || isSubmitting) return

    setError(null)
    setIsSubmitting(true)

    try {
      const fieldsObj: Record<string, string> = {}
      const fieldOrder: string[] = []
      const sensitiveFields: string[] = []

      fields.forEach(f => {
        const key = f.key.trim()
        if (key) {
          fieldsObj[key] = f.value
          fieldOrder.push(key)
          if (f.sensitive) {
            sensitiveFields.push(key)
          }
        }
      })

      await invoke('create_secret', {
        title: title.trim(),
        description,
        fields: fieldsObj,
        fieldOrder,
        tags,
        icon,
        sensitiveFields,
      })

      setSuccess(true)
      setTimeout(() => {
        resetForm()
      }, 1000)
    } catch (err) {
      setError(String(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-900 overflow-hidden" style={{ borderRadius: '12px' }}>
      {/* 标题栏 - 使用 data-tauri-drag-region 实现拖动（完全照搬 QuickSearchWindow） */}
      <div
        data-tauri-drag-region
        className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 select-none cursor-move"
      >
        <div className="flex items-center gap-2" data-tauri-drag-region>
          <GripVertical className="w-4 h-4 text-slate-400 pointer-events-none" />
          <Plus className="w-4 h-4 text-violet-500 pointer-events-none" />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400" data-tauri-drag-region>快速添加</span>
        </div>
        <div className="flex items-center gap-1">
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

      {/* 表单内容 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {success && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-xl text-sm text-green-600 dark:text-green-400 animate-in fade-in duration-200">
            ✓ 已成功添加！
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-sm text-red-600 dark:text-red-400 animate-in fade-in duration-200">
            {error}
          </div>
        )}

        {/* 标题 */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">标题 *</label>
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入标题..."
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
          />
        </div>

        {/* 描述 */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">描述</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="添加描述（可选）..."
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
          />
        </div>

        {/* 字段 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">字段</label>
            <button
              type="button"
              onClick={addField}
              className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-md transition-all"
            >
              <Plus className="w-3 h-3" />
              添加
            </button>
          </div>
          <div className="space-y-2">
            {fields.map((field) => (
              <div key={field.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={field.key}
                  onChange={(e) => updateField(field.id, e.target.value, field.value)}
                  placeholder="字段名"
                  className="w-24 px-2 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all"
                />
                <div className="relative flex-1">
                  <input
                    type={field.sensitive ? 'password' : 'text'}
                    value={field.value}
                    onChange={(e) => updateField(field.id, field.key, e.target.value)}
                    placeholder="值..."
                    className="w-full px-2 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all pr-7"
                  />
                  {field.sensitive && (
                    <LockIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-amber-500" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => toggleSensitive(field.id)}
                  className={`p-1 rounded-md transition-all ${
                    field.sensitive
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                  title={field.sensitive ? '取消遮蔽' : '遮蔽字段'}
                >
                  {field.sensitive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeField(field.id)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded-md transition-all"
                    title="删除字段"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 标签 */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            标签 <span className="font-normal text-slate-400">（回车添加）</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="输入标签后按回车添加..."
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
            />
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-md text-xs font-medium"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="p-0.5 hover:bg-violet-200 dark:hover:bg-violet-800 rounded transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-mono">Ctrl+Enter</kbd>
          <span>快速保存</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={hideWindow}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg transition-all"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-violet-600 hover:bg-violet-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 text-white rounded-lg transition-all shadow-lg shadow-violet-500/25 disabled:shadow-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                保存
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  )
}
