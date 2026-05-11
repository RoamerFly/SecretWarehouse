import { useState, useRef, useCallback, useEffect } from 'react'
import { useStore } from '../stores/useStore'
import { useTheme } from './ThemeProvider'
import {
  X, Sun, Moon, Monitor, LayoutGrid, Space, RotateCcw, Maximize2, Check, Star, Eye, Key,
  Database, Download, Upload, Palette, AlignLeft, Archive, ShieldCheck, Plus,
  Crosshair, Move, CheckCircle, HelpCircle, Trash2, Save, ChevronRight, ChevronDown, Zap,
  User, Pencil
} from 'lucide-react'
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'

interface SettingsProps {
  username: string
}

// Preset resolutions
const windowResolutions = [
  { value: 'maximized', label: '最大化窗口' },
  { value: 'fullscreen', label: '全屏模式' },
  { value: 'divider1', label: '────────────────────' },
  { value: '2560x1600', label: '2560 × 1600 (推荐)' },
  { value: '2560x1440', label: '2560 × 1440' },
  { value: '2048x1536', label: '2048 × 1536' },
  { value: '2048x1152', label: '2048 × 1152' },
  { value: '1920x1440', label: '1920 × 1440' },
  { value: '1920x1200', label: '1920 × 1200' },
  { value: '1920x1080', label: '1920 × 1080' },
  { value: '1856x1392', label: '1856 × 1392' },
  { value: '1792x1344', label: '1792 × 1344' },
  { value: '1680x1050', label: '1680 × 1050' },
  { value: '1600x1200', label: '1600 × 1200' },
  { value: '1600x900', label: '1600 × 900' },
  { value: '1440x900', label: '1440 × 900' },
  { value: '1400x1050', label: '1400 × 1050' },
  { value: '1366x768', label: '1366 × 768' },
  { value: '1360x768', label: '1360 × 768' },
  { value: '1280x1024', label: '1280 × 1024' },
  { value: '1280x960', label: '1280 × 960' },
  { value: '1280x800', label: '1280 × 800' },
  { value: '1280x768', label: '1280 × 768' },
  { value: '1280x720', label: '1280 × 720' },
  { value: '1280x600', label: '1280 × 600' },
  { value: '1152x864', label: '1152 × 864' },
  { value: '1024x768', label: '1024 × 768' },
  { value: '800x600', label: '800 × 600' },
  { value: 'divider2', label: '────────────────────' },
  { value: 'custom', label: '自定义' },
]

// Slider with double-click input component
interface SliderWithInputProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit: string
  onChange: (value: number) => void
  icon?: React.ReactNode
}

function SliderWithInput({ label, value, min, max, step = 1, unit, onChange, icon }: SliderWithInputProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDoubleClick = () => {
    setInputValue(String(value))
    setIsEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const handleSubmit = () => {
    const numValue = Math.min(max, Math.max(min, parseInt(inputValue) || min))
    onChange(numValue)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }

  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        </div>
        {isEditing ? (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={handleSubmit}
              onKeyDown={handleKeyDown}
              className="w-16 px-2 py-1 text-sm text-center bg-slate-100 dark:bg-slate-800 border border-violet-500 rounded-lg text-slate-900 dark:text-white focus:outline-none"
              min={min}
              max={max}
            />
            <span className="text-xs text-slate-500">{unit}</span>
          </div>
        ) : (
          <span
            onDoubleClick={handleDoubleClick}
            className="px-2 py-1 text-sm font-mono bg-slate-100 dark:bg-slate-800 rounded-lg text-violet-600 dark:text-violet-400 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="双击自定义输入"
          >
            {value}{unit}
          </span>
        )}
      </div>
      <div className="relative">
        <input
          type="range"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
          style={{
            background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${percentage}%, ${document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'} ${percentage}%, ${document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'} 100%)`
          }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-400">{min}{unit}</span>
          <span className="text-xs text-slate-400">{max}{unit}</span>
        </div>
      </div>
    </div>
  )
}

// Full screen position picker component
interface PositionPickerProps {
  x: number
  y: number
  screenWidth: number
  screenHeight: number
  onChange: (x: number, y: number) => void
  onClose: () => void
}

function FullScreenPositionPicker({ x, y, screenWidth, screenHeight, onChange, onClose }: PositionPickerProps) {
  const [position, setPosition] = useState({ x, y })
  const positionRef = useRef({ x, y })
  const rafRef = useRef<number | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Calculate position from mouse event
  const calculatePosition = useCallback((clientX: number, clientY: number) => {
    const scaleX = screenWidth / window.innerWidth
    const scaleY = screenHeight / window.innerHeight

    const newX = Math.round(clientX * scaleX - 240)
    const newY = Math.round(clientY * scaleY - 200)

    return {
      x: Math.max(0, Math.min(screenWidth - 480, newX)),
      y: Math.max(0, Math.min(screenHeight - 400, newY))
    }
  }, [screenWidth, screenHeight])

  // Handle mouse move with RAF for smooth updates
  const handleMouseMove = useCallback((e: MouseEvent) => {
    e.preventDefault()
    const newPos = calculatePosition(e.clientX, e.clientY)
    positionRef.current = newPos

    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        setPosition(positionRef.current)
        rafRef.current = null
      })
    }
  }, [calculatePosition])

  // Start dragging on mousedown
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const newPos = calculatePosition(e.clientX, e.clientY)
    positionRef.current = newPos
    setPosition(newPos)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }, { once: true })
  }, [calculatePosition, handleMouseMove])

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  const handleConfirm = () => {
    onChange(position.x, position.y)
    onClose()
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] bg-black/80 cursor-crosshair"
      onMouseDown={handleMouseDown}
    >
      {/* Instructions */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 px-6 py-3 rounded-full shadow-lg pointer-events-none">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          点击或拖动选择位置，然后点击确认
        </p>
      </div>

      {/* Preview window */}
      <div
        className="absolute bg-white dark:bg-slate-800 rounded-lg shadow-2xl border-2 border-violet-500 opacity-80 pointer-events-none"
        style={{
          left: `${(position.x / screenWidth) * 100}%`,
          top: `${(position.y / screenHeight) * 100}%`,
          width: '480px',
          height: '400px',
          willChange: 'left, top',
        }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Move className="w-12 h-12 text-violet-500 mx-auto mb-2" />
            <p className="text-violet-600 dark:text-violet-400 font-medium">快速搜索浮窗</p>
            <p className="text-xs text-slate-500 mt-1">位置: {position.x}, {position.y}</p>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 pointer-events-auto">
        <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-lg shadow-lg">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            X: <span className="font-mono text-violet-600">{position.x}</span>, Y: <span className="font-mono text-violet-600">{position.y}</span>
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleConfirm()
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex items-center gap-2 px-6 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg shadow-lg transition-colors"
        >
          <CheckCircle className="w-5 h-5" />
          <span>确认位置</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex items-center gap-2 px-6 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg shadow-lg transition-colors"
        >
          <X className="w-5 h-5" />
          <span>取消</span>
        </button>
      </div>
    </div>
  )
}

// Collapsible section component
interface CollapsibleSectionProps {
  icon: React.ElementType
  title: string
  defaultExpanded?: boolean
  children: React.ReactNode
}

function CollapsibleSection({ icon: Icon, title, defaultExpanded = false, children }: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border border-slate-200 dark:border-slate-700/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
        <Icon className="w-4 h-4 text-violet-500" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
      </button>
      {isExpanded && (
        <div className="p-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  )
}

export default function Settings({ username }: SettingsProps) {
  const { showSettings, setShowSettings, settings, updateSettings, resetSettings, fetchSecrets } = useStore()
  const { theme, setTheme } = useTheme()
  const [showSaved, setShowSaved] = useState(false)
  const [editingWidth, setEditingWidth] = useState(false)
  const [editingHeight, setEditingHeight] = useState(false)
  const [widthInput, setWidthInput] = useState(String(settings.customWidth))
  const [heightInput, setHeightInput] = useState(String(settings.customHeight))
  const widthInputRef = useRef<HTMLInputElement>(null)
  const heightInputRef = useRef<HTMLInputElement>(null)
  const [dataStatus, setDataStatus] = useState<'idle' | 'exporting' | 'importing' | 'success' | 'error'>('idle')
  const [dataMessage, setDataMessage] = useState('')
  const [newKeyword, setNewKeyword] = useState('')
  const [screenSize, setScreenSize] = useState({ width: 1920, height: 1080 })
  const [showPositionPicker, setShowPositionPicker] = useState(false)
  const [showQuickAddPositionPicker, setShowQuickAddPositionPicker] = useState(false)

  // Username rename state
  const [showRenameForm, setShowRenameForm] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [renameStatus, setRenameStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [renameMessage, setRenameMessage] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)

  // Change password state
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false)
  const [changePasswordOld, setChangePasswordOld] = useState('')
  const [changePasswordNew, setChangePasswordNew] = useState('')
  const [changePasswordConfirm, setChangePasswordConfirm] = useState('')
  const [changePasswordStatus, setChangePasswordStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [changePasswordMessage, setChangePasswordMessage] = useState('')
  const [changePasswordLoading, setChangePasswordLoading] = useState(false)
  const [showChangePasswordFields, setShowChangePasswordFields] = useState(false)

  // Security questions state
  const [hasSecurityQuestions, setHasSecurityQuestions] = useState(false)
  const [showSQForm, setShowSQForm] = useState(false)
  const [sqQuestions, setSQQuestions] = useState<string[]>(['', ''])
  const [sqAnswers, setSQAnswers] = useState<string[]>(['', ''])
  const [sqLoading, setSQLoading] = useState(false)
  const [sqMessage, setSQMessage] = useState('')
  const [sqStatus, setSQStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Show saved notification
  const handleUpdateSettings = (partial: Partial<typeof settings>) => {
    updateSettings(partial)
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 1500)
  }

  // Fetch screen size
  const fetchScreenSize = async () => {
    try {
      const [width, height] = await invoke<[number, number]>('get_screen_size')
      setScreenSize({ width, height })
    } catch (err) {
      console.error('Failed to get screen size:', err)
    }
  }

  // Check security questions status
  const checkSecurityQuestions = async () => {
    try {
      const has = await invoke<boolean>('has_security_questions', { username })
      setHasSecurityQuestions(has)
    } catch (err) {
      console.error('Failed to check security questions:', err)
    }
  }

  // Load security questions status on mount
  useEffect(() => {
    if (showSettings) {
      checkSecurityQuestions()
    }
  }, [showSettings])

  // Add security question row
  const addSQRow = () => {
    if (sqQuestions.length < 5) {
      setSQQuestions([...sqQuestions, ''])
      setSQAnswers([...sqAnswers, ''])
    }
  }

  // Remove security question row
  const removeSQRow = (index: number) => {
    if (sqQuestions.length > 2) {
      setSQQuestions(sqQuestions.filter((_, i) => i !== index))
      setSQAnswers(sqAnswers.filter((_, i) => i !== index))
    }
  }

  // Update security question
  const updateSQQuestion = (index: number, value: string) => {
    const newQuestions = [...sqQuestions]
    newQuestions[index] = value
    setSQQuestions(newQuestions)
  }

  // Update security answer
  const updateSQAnswer = (index: number, value: string) => {
    const newAnswers = [...sqAnswers]
    newAnswers[index] = value
    setSQAnswers(newAnswers)
  }

  // Save security questions
  const handleSaveSecurityQuestions = async () => {
    // Validate
    const validQuestions = sqQuestions.filter(q => q.trim())
    const validAnswers = sqAnswers.filter(a => a.trim())

    if (validQuestions.length < 2) {
      setSQStatus('error')
      setSQMessage('至少需要设置2个密保问题')
      setTimeout(() => { setSQStatus('idle'); setSQMessage('') }, 3000)
      return
    }

    if (validQuestions.length !== validAnswers.length) {
      setSQStatus('error')
      setSQMessage('每个问题都需要设置答案')
      setTimeout(() => { setSQStatus('idle'); setSQMessage('') }, 3000)
      return
    }

    setSQLoading(true)
    try {
      await invoke('set_security_questions', {
        username,
        questions: validQuestions,
        answers: validAnswers
      })
      setHasSecurityQuestions(true)
      setShowSQForm(false)
      setSQStatus('success')
      setSQMessage('密保问题设置成功！')
      setTimeout(() => { setSQStatus('idle'); setSQMessage('') }, 3000)
    } catch (err) {
      setSQStatus('error')
      setSQMessage(`设置失败: ${err}`)
      setTimeout(() => { setSQStatus('idle'); setSQMessage('') }, 3000)
    } finally {
      setSQLoading(false)
    }
  }

  // Delete security questions
  const handleDeleteSecurityQuestions = async () => {
    if (!confirm('确定要删除密保问题吗？删除后将无法通过密保问题找回密码。')) {
      return
    }

    setSQLoading(true)
    try {
      await invoke('delete_security_questions', { username })
      setHasSecurityQuestions(false)
      setSQStatus('success')
      setSQMessage('密保问题已删除')
      setTimeout(() => { setSQStatus('idle'); setSQMessage('') }, 3000)
    } catch (err) {
      setSQStatus('error')
      setSQMessage(`删除失败: ${err}`)
      setTimeout(() => { setSQStatus('idle'); setSQMessage('') }, 3000)
    } finally {
      setSQLoading(false)
    }
  }

  // Handle rename username
  const handleRenameUsername = async () => {
    if (!newUsername.trim()) {
      setRenameStatus('error')
      setRenameMessage('用户名不能为空')
      setTimeout(() => { setRenameStatus('idle'); setRenameMessage('') }, 3000)
      return
    }

    if (newUsername === username) {
      setShowRenameForm(false)
      setNewUsername('')
      return
    }

    setRenameLoading(true)
    try {
      await invoke('rename_user', { oldUsername: username, newUsername: newUsername.trim() })
      setRenameStatus('success')
      setRenameMessage('用户名修改成功！请重新登录。')
      setTimeout(() => {
        setRenameStatus('idle')
        setRenameMessage('')
        setShowRenameForm(false)
        setNewUsername('')
        // 需要重新登录
        window.location.reload()
      }, 1500)
    } catch (err) {
      setRenameStatus('error')
      setRenameMessage(`修改失败: ${err}`)
      setTimeout(() => { setRenameStatus('idle'); setRenameMessage('') }, 3000)
    } finally {
      setRenameLoading(false)
    }
  }

  // Handle change password
  const handleChangePassword = async () => {
    if (!changePasswordOld.trim()) {
      setChangePasswordStatus('error')
      setChangePasswordMessage('请输入当前密码')
      setTimeout(() => { setChangePasswordStatus('idle'); setChangePasswordMessage('') }, 3000)
      return
    }

    if (!changePasswordNew.trim()) {
      setChangePasswordStatus('error')
      setChangePasswordMessage('请输入新密码')
      setTimeout(() => { setChangePasswordStatus('idle'); setChangePasswordMessage('') }, 3000)
      return
    }

    if (changePasswordNew !== changePasswordConfirm) {
      setChangePasswordStatus('error')
      setChangePasswordMessage('两次输入的密码不一致')
      setTimeout(() => { setChangePasswordStatus('idle'); setChangePasswordMessage('') }, 3000)
      return
    }

    setChangePasswordLoading(true)
    try {
      await invoke('change_password_from_settings', {
        username,
        oldPassword: changePasswordOld,
        newPassword: changePasswordNew
      })
      setChangePasswordStatus('success')
      setChangePasswordMessage('密码修改成功！请重新登录。')
      setTimeout(() => {
        setChangePasswordStatus('idle')
        setChangePasswordMessage('')
        setShowChangePasswordForm(false)
        setChangePasswordOld('')
        setChangePasswordNew('')
        setChangePasswordConfirm('')
        setShowChangePasswordFields(false)
        // 需要重新登录
        window.location.reload()
      }, 1500)
    } catch (err) {
      setChangePasswordStatus('error')
      setChangePasswordMessage(`修改失败: ${err}`)
      setTimeout(() => { setChangePasswordStatus('idle'); setChangePasswordMessage('') }, 3000)
    } finally {
      setChangePasswordLoading(false)
    }
  }

  // Handle position mode change
  const handlePositionModeChange = async (mode: string) => {
    handleUpdateSettings({ quickSearchPositionMode: mode })
    if (mode === 'custom') {
      await fetchScreenSize()
      setShowPositionPicker(true)
    }
  }

  // Open position picker
  const openPositionPicker = async () => {
    await fetchScreenSize()
    setShowPositionPicker(true)
  }

  // Handle position change
  const handlePositionChange = (x: number, y: number) => {
    handleUpdateSettings({ quickSearchCustomX: x, quickSearchCustomY: y })
  }

  // Open quick add position picker
  const openQuickAddPositionPicker = async () => {
    await fetchScreenSize()
    setShowQuickAddPositionPicker(true)
  }

  // Handle quick add position change
  const handleQuickAddPositionChange = (x: number, y: number) => {
    handleUpdateSettings({ quickAddCustomX: x, quickAddCustomY: y })
  }

  // Handle window size change
  const handleWindowSizeChange = async (size: string) => {
    handleUpdateSettings({ windowSize: size })
    await applyWindowSize(size, settings.customWidth, settings.customHeight)
  }

  // Apply window size
  const applyWindowSize = async (size: string, width: number, height: number) => {
    try {
      const appWindow = getCurrentWindow()
      if (size === 'maximized') {
        await appWindow.maximize()
        await appWindow.setFullscreen(false)
      } else if (size === 'fullscreen') {
        await appWindow.setFullscreen(true)
        await appWindow.unmaximize()
      } else if (size === 'custom') {
        await appWindow.setFullscreen(false)
        await appWindow.unmaximize()
        await appWindow.setSize(new LogicalSize(width, height))
        await appWindow.center()
      } else if (size.includes('x')) {
        await appWindow.setFullscreen(false)
        await appWindow.unmaximize()
        const [w, h] = size.split('x').map(Number)
        await appWindow.setSize(new LogicalSize(w, h))
        await appWindow.center()
      }
    } catch (err) {
      console.error('Failed to resize window:', err)
    }
  }

  // Handle custom width change
  const handleCustomWidthChange = async () => {
    const newWidth = parseInt(widthInput) || 1200
    setWidthInput(String(newWidth))
    handleUpdateSettings({ customWidth: newWidth })
    setEditingWidth(false)
    if (settings.windowSize === 'custom') {
      await applyWindowSize('custom', newWidth, settings.customHeight)
    }
  }

  // Handle custom height change
  const handleCustomHeightChange = async () => {
    const newHeight = parseInt(heightInput) || 800
    setHeightInput(String(newHeight))
    handleUpdateSettings({ customHeight: newHeight })
    setEditingHeight(false)
    if (settings.windowSize === 'custom') {
      await applyWindowSize('custom', settings.customWidth, newHeight)
    }
  }

  // Handle double click on width
  const handleWidthDoubleClick = () => {
    setWidthInput(String(settings.customWidth))
    setEditingWidth(true)
    setTimeout(() => widthInputRef.current?.select(), 0)
  }

  // Handle double click on height
  const handleHeightDoubleClick = () => {
    setHeightInput(String(settings.customHeight))
    setEditingHeight(true)
    setTimeout(() => heightInputRef.current?.select(), 0)
  }

  // Export database
  const handleExport = async () => {
    try {
      setDataStatus('exporting')
      setDataMessage('正在导出...')

      const filePath = await save({
        defaultPath: `data/data_output.db`,
        filters: [{ name: 'Database', extensions: ['db'] }]
      })

      if (filePath) {
        await invoke('export_database', { username, path: filePath })
        setDataStatus('success')
        setDataMessage('导出成功！')
        setTimeout(() => {
          setDataStatus('idle')
          setDataMessage('')
        }, 2000)
      } else {
        setDataStatus('idle')
        setDataMessage('')
      }
    } catch (err) {
      setDataStatus('error')
      setDataMessage(`导出失败: ${err}`)
      setTimeout(() => {
        setDataStatus('idle')
        setDataMessage('')
      }, 3000)
    }
  }

  // Import database
  const handleImport = async (mode: 'overwrite' | 'incremental') => {
    try {
      const filePath = await open({
        filters: [{ name: 'Database', extensions: ['db'] }]
      })

      if (filePath && typeof filePath === 'string') {
        setDataStatus('importing')
        setDataMessage(mode === 'overwrite' ? '正在覆盖导入...' : '正在增量导入...')

        const count = await invoke<number>('import_database', { username, path: filePath, mode })
        await fetchSecrets()

        setDataStatus('success')
        setDataMessage(mode === 'overwrite' ? `覆盖导入成功！共 ${count} 条` : `增量导入成功！新增 ${count} 条`)
        setTimeout(() => {
          setDataStatus('idle')
          setDataMessage('')
        }, 3000)
      }
    } catch (err) {
      setDataStatus('error')
      setDataMessage(`导入失败: ${err}`)
      setTimeout(() => {
        setDataStatus('idle')
        setDataMessage('')
      }, 3000)
    }
  }

  // Export user data as ZIP
  const handleExportUserData = async () => {
    try {
      setDataStatus('exporting')
      setDataMessage('正在打包用户数据...')

      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
      const defaultName = `SecretWarehouse_${username}_${dateStr}.zip`

      const filePath = await save({
        defaultPath: defaultName,
        filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
      })

      if (filePath) {
        await invoke('export_user_data', { username, outputPath: filePath })
        setDataStatus('success')
        setDataMessage('用户数据导出成功！')
        setTimeout(() => {
          setDataStatus('idle')
          setDataMessage('')
        }, 2000)
      } else {
        setDataStatus('idle')
        setDataMessage('')
      }
    } catch (err) {
      setDataStatus('error')
      setDataMessage(`导出失败: ${err}`)
      setTimeout(() => {
        setDataStatus('idle')
        setDataMessage('')
      }, 3000)
    }
  }

  // Import user data from ZIP
  const handleImportUserData = async () => {
    try {
      const filePath = await open({
        filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
      })

      if (filePath && typeof filePath === 'string') {
        setDataStatus('importing')
        setDataMessage('正在导入用户数据...')

        const result = await invoke<string>('import_user_data', { username, zipPath: filePath })
        await fetchSecrets()

        setDataStatus('success')
        setDataMessage(result)
        setTimeout(() => {
          setDataStatus('idle')
          setDataMessage('')
        }, 3000)
      }
    } catch (err) {
      setDataStatus('error')
      setDataMessage(`导入失败: ${err}`)
      setTimeout(() => {
        setDataStatus('idle')
        setDataMessage('')
      }, 3000)
    }
  }

  // Add password check keyword
  const handleAddKeyword = () => {
    if (newKeyword.trim()) {
      const keywords = settings.passwordCheckKeywords || []
      if (!keywords.includes(newKeyword.trim())) {
        handleUpdateSettings({ passwordCheckKeywords: [...keywords, newKeyword.trim()] })
      }
      setNewKeyword('')
    }
  }

  // Remove password check keyword
  const handleRemoveKeyword = (keyword: string) => {
    const keywords = settings.passwordCheckKeywords || []
    handleUpdateSettings({ passwordCheckKeywords: keywords.filter(k => k !== keyword) })
  }

  if (!showSettings) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-5xl mx-4 h-[85vh] flex flex-col border border-slate-200 dark:border-slate-700/60 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/40">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">设置</h2>
            {showSaved && (
              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-medium animate-in slide-in-from-left-2 duration-200">
                <Check className="w-3 h-3" />
                已保存
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetSettings}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm"
              title="恢复默认设置"
            >
              <RotateCcw className="w-4 h-4" />
              <span>恢复默认</span>
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:scale-110"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Settings Panel */}
          <div className="w-1/2 overflow-y-auto p-6 space-y-3 border-r border-slate-200 dark:border-slate-700/40">
            {/* 外观 Section */}
            <CollapsibleSection icon={Palette} title="外观" defaultExpanded={true}>
              {/* Theme */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sun className="w-4 h-4 text-slate-400" />
                  <label className="text-sm text-slate-600 dark:text-slate-400">主题模式</label>
                </div>
                <div className="flex gap-2">
                  {[
                    { value: 'light' as const, icon: Sun, label: '浅色' },
                    { value: 'dark' as const, icon: Moon, label: '深色' },
                    { value: 'system' as const, icon: Monitor, label: '跟随系统' },
                  ].map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                        theme === value
                          ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 ring-2 ring-violet-500'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Window Size */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Maximize2 className="w-4 h-4 text-slate-400" />
                  <label className="text-sm text-slate-600 dark:text-slate-400">窗口大小</label>
                </div>
                <select
                  value={settings.windowSize}
                  onChange={(e) => handleWindowSizeChange(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                >
                  {windowResolutions.map(({ value, label }) => (
                    <option
                      key={value}
                      value={value}
                      disabled={value.startsWith('divider')}
                      className={value.startsWith('divider') ? 'text-slate-400' : ''}
                    >
                      {label}
                    </option>
                  ))}
                </select>

                {/* Custom width/height inputs */}
                {settings.windowSize === 'custom' && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">宽度</label>
                      {editingWidth ? (
                        <div className="flex items-center gap-1">
                          <input
                            ref={widthInputRef}
                            type="number"
                            value={widthInput}
                            onChange={(e) => setWidthInput(e.target.value)}
                            onBlur={handleCustomWidthChange}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCustomWidthChange()
                              if (e.key === 'Escape') setEditingWidth(false)
                            }}
                            className="w-full px-2 py-1.5 text-sm text-center bg-white dark:bg-slate-900 border border-violet-500 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                          />
                          <span className="text-xs text-slate-500">px</span>
                        </div>
                      ) : (
                        <div
                          onDoubleClick={handleWidthDoubleClick}
                          className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center text-violet-600 dark:text-violet-400 font-mono cursor-pointer hover:border-violet-400 dark:hover:border-violet-500 transition-colors"
                          title="双击编辑"
                        >
                          {settings.customWidth} px
                        </div>
                      )}
                    </div>
                    <span className="text-slate-400 mt-5">×</span>
                    <div className="flex-1">
                      <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">高度</label>
                      {editingHeight ? (
                        <div className="flex items-center gap-1">
                          <input
                            ref={heightInputRef}
                            type="number"
                            value={heightInput}
                            onChange={(e) => setHeightInput(e.target.value)}
                            onBlur={handleCustomHeightChange}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCustomHeightChange()
                              if (e.key === 'Escape') setEditingHeight(false)
                            }}
                            className="w-full px-2 py-1.5 text-sm text-center bg-white dark:bg-slate-900 border border-violet-500 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                          />
                          <span className="text-xs text-slate-500">px</span>
                        </div>
                      ) : (
                        <div
                          onDoubleClick={handleHeightDoubleClick}
                          className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center text-violet-600 dark:text-violet-400 font-mono cursor-pointer hover:border-violet-400 dark:hover:border-violet-500 transition-colors"
                          title="双击编辑"
                        >
                          {settings.customHeight} px
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => applyWindowSize('custom', settings.customWidth, settings.customHeight)}
                      className="mt-5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      应用
                    </button>
                  </div>
                )}
              </div>

              {/* Font Size */}
              <SliderWithInput
                label="字体大小"
                value={settings.fontSize}
                min={10}
                max={38}
                unit="px"
                icon={<AlignLeft className="w-4 h-4 text-slate-400" />}
                onChange={(value) => handleUpdateSettings({ fontSize: value })}
              />

              {/* Card Size */}
              <SliderWithInput
                label="卡片大小"
                value={settings.cardSize}
                min={24}
                max={88}
                unit="px"
                icon={<LayoutGrid className="w-4 h-4 text-slate-400" />}
                onChange={(value) => handleUpdateSettings({ cardSize: value })}
              />

              {/* Spacing */}
              <SliderWithInput
                label="间距"
                value={settings.spacing}
                min={4}
                max={84}
                unit="px"
                icon={<Space className="w-4 h-4 text-slate-400" />}
                onChange={(value) => handleUpdateSettings({ spacing: value })}
              />
            </CollapsibleSection>

            {/* 安全 Section */}
            <CollapsibleSection icon={ShieldCheck} title="安全">

              {/* Password Check Keywords */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-slate-400" />
                  <label className="text-sm text-slate-600 dark:text-slate-400">密码检测关键词</label>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  字段名包含这些关键词时，将进行密码强度检测
                </p>

                {/* Keywords list */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {(settings.passwordCheckKeywords || []).map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-lg text-sm"
                    >
                      {keyword}
                      <button
                        onClick={() => handleRemoveKeyword(keyword)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add keyword input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddKeyword()
                    }}
                    placeholder="输入新关键词"
                    className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <button
                    onClick={handleAddKeyword}
                    disabled={!newKeyword.trim()}
                    className="px-3 py-2 bg-violet-500 hover:bg-violet-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-xl transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Clipboard Clear Seconds */}
              <SliderWithInput
                label="剪贴板自动清除"
                value={settings.clipboardClearSeconds}
                min={0}
                max={120}
                step={5}
                unit="秒 (0=不自动清除)"
                icon={<Database className="w-4 h-4 text-slate-400" />}
                onChange={(value) => handleUpdateSettings({ clipboardClearSeconds: value })}
              />

              {/* Security Questions */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  <label className="text-sm text-slate-600 dark:text-slate-400">密保问题</label>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  忘记密码时可通过密保问题找回（可选设置）
                </p>

                {hasSecurityQuestions ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-emerald-600 dark:text-emerald-400">已设置密保问题</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSQQuestions(['', ''])
                          setSQAnswers(['', ''])
                          setShowSQForm(true)
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-xl text-sm transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        <span>重新设置</span>
                      </button>
                      <button
                        onClick={handleDeleteSecurityQuestions}
                        disabled={sqLoading}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setSQQuestions(['', ''])
                      setSQAnswers(['', ''])
                      setShowSQForm(true)
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>设置密保问题</span>
                  </button>
                )}

                {/* SQ Status Message */}
                {sqMessage && (
                  <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    sqStatus === 'success'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                      : sqStatus === 'error'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {sqStatus === 'success' && <Check className="w-4 h-4" />}
                    <span>{sqMessage}</span>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* 账户 Section */}
            <CollapsibleSection icon={User} title="账户">

              {/* Current Username Display */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-slate-400" />
                  <label className="text-sm text-slate-600 dark:text-slate-400">当前用户名</label>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{username}</span>
                  <button
                    onClick={() => {
                      setNewUsername(username)
                      setShowRenameForm(true)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>修改</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  修改用户名会重命名数据目录和数据库文件
                </p>
              </div>

              {/* Rename Status Message */}
              {renameMessage && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  renameStatus === 'success'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : renameStatus === 'error'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {renameStatus === 'success' && <Check className="w-4 h-4" />}
                  <span>{renameMessage}</span>
                </div>
              )}

              {/* Change Password */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Key className="w-4 h-4 text-slate-400" />
                  <label className="text-sm text-slate-600 dark:text-slate-400">密码</label>
                </div>
                <button
                  onClick={() => setShowChangePasswordForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>修改密码</span>
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  修改密码后需要重新登录
                </p>
              </div>
            </CollapsibleSection>

            {/* 行为 Section */}
            <CollapsibleSection icon={Zap} title="行为">

              {/* Quick Search Shortcut */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Key className="w-4 h-4 text-slate-400" />
                  <label className="text-sm text-slate-600 dark:text-slate-400">快速搜索快捷键</label>
                </div>
                <select
                  value={settings.quickSearchShortcut}
                  onChange={async (e) => {
                    const newShortcut = e.target.value
                    try {
                      await invoke('register_quick_search_shortcut', { shortcut: newShortcut })
                      handleUpdateSettings({ quickSearchShortcut: newShortcut })
                    } catch (err) {
                      console.error('Failed to register shortcut:', err)
                      alert(`快捷键注册失败: ${err}`)
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                >
                  <option value="CommandOrControl+Shift+P">Ctrl/Cmd + Shift + P</option>
                  <option value="CommandOrControl+Shift+K">Ctrl/Cmd + Shift + K</option>
                  <option value="CommandOrControl+Shift+F">Ctrl/Cmd + Shift + F</option>
                  <option value="CommandOrControl+Shift+S">Ctrl/Cmd + Shift + S</option>
                  <option value="CommandOrControl+Shift+Space">Ctrl/Cmd + Shift + Space</option>
                  <option value="Alt+Space">Alt + Space</option>
                  <option value="CommandOrControl+K">Ctrl/Cmd + K</option>
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  选择后立即生效，无需重启
                </p>
              </div>

              {/* Close to Tray */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-700 dark:text-slate-300">关闭时最小化到托盘</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">点击关闭按钮时隐藏到系统托盘而非退出</div>
                </div>
                <button
                  onClick={() => handleUpdateSettings({ closeToTray: !settings.closeToTray })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    settings.closeToTray ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.closeToTray ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Start Minimized */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-700 dark:text-slate-300">启动时最小化到托盘</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">应用启动后自动隐藏到系统托盘</div>
                </div>
                <button
                  onClick={() => handleUpdateSettings({ startMinimized: !settings.startMinimized })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    settings.startMinimized ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.startMinimized ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Quick Search Position */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Move className="w-4 h-4 text-slate-400" />
                  <label className="text-sm text-slate-600 dark:text-slate-400">浮窗出现位置</label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePositionModeChange('center')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all ${
                      settings.quickSearchPositionMode === 'center'
                        ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 ring-2 ring-violet-500'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>居中</span>
                  </button>
                  <button
                    onClick={() => handlePositionModeChange('custom')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all ${
                      settings.quickSearchPositionMode === 'custom'
                        ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 ring-2 ring-violet-500'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Crosshair className="w-4 h-4" />
                    <span>自定义</span>
                  </button>
                </div>
              </div>

              {/* Custom Position Picker */}
              {settings.quickSearchPositionMode === 'custom' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">当前位置</div>
                      <div className="text-sm font-mono text-violet-600 dark:text-violet-400">
                        X: {settings.quickSearchCustomX}, Y: {settings.quickSearchCustomY}
                      </div>
                    </div>
                    <button
                      onClick={openPositionPicker}
                      className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Crosshair className="w-4 h-4" />
                      <span>设置位置</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    浮窗大小: 480 × 400 像素
                  </p>
                </div>
              )}
            </CollapsibleSection>

            {/* 快速添加浮窗 Section */}
            <CollapsibleSection icon={Plus} title="快速添加浮窗">
              {/* Quick Add Shortcut */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Key className="w-4 h-4 text-slate-400" />
                  <label className="text-sm text-slate-600 dark:text-slate-400">快速添加快捷键</label>
                </div>
                <select
                  value={settings.quickAddShortcut}
                  onChange={async (e) => {
                    const newShortcut = e.target.value
                    try {
                      await invoke('register_quick_add_shortcut', { shortcut: newShortcut })
                      handleUpdateSettings({ quickAddShortcut: newShortcut })
                    } catch (err) {
                      console.error('Failed to register shortcut:', err)
                      alert(`快捷键注册失败: ${err}`)
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                >
                  <option value="CommandOrControl+Shift+A">Ctrl/Cmd + Shift + A</option>
                  <option value="CommandOrControl+Shift+N">Ctrl/Cmd + Shift + N</option>
                  <option value="CommandOrControl+Shift+D">Ctrl/Cmd + Shift + D</option>
                  <option value="CommandOrControl+Alt+A">Ctrl/Cmd + Alt + A</option>
                  <option value="Alt+Insert">Alt + Insert</option>
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  选择后立即生效，无需重启
                </p>
              </div>

              {/* Quick Add Position */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Move className="w-4 h-4 text-slate-400" />
                  <label className="text-sm text-slate-600 dark:text-slate-400">浮窗出现位置</label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateSettings({ quickAddPositionMode: 'center' })}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all ${
                      settings.quickAddPositionMode === 'center'
                        ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 ring-2 ring-violet-500'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>居中</span>
                  </button>
                  <button
                    onClick={() => handleUpdateSettings({ quickAddPositionMode: 'custom' })}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all ${
                      settings.quickAddPositionMode === 'custom'
                        ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 ring-2 ring-violet-500'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Crosshair className="w-4 h-4" />
                    <span>自定义</span>
                  </button>
                </div>
              </div>

              {/* Custom Position Picker for Quick Add */}
              {settings.quickAddPositionMode === 'custom' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">当前位置</div>
                      <div className="text-sm font-mono text-violet-600 dark:text-violet-400">
                        X: {settings.quickAddCustomX}, Y: {settings.quickAddCustomY}
                      </div>
                    </div>
                    <button
                      onClick={openQuickAddPositionPicker}
                      className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Crosshair className="w-4 h-4" />
                      <span>设置位置</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    浮窗大小: 480 × 500 像素
                  </p>
                </div>
              )}
            </CollapsibleSection>

            {/* 数据 Section */}
            <CollapsibleSection icon={Database} title="数据">

              {/* Export User Data (ZIP) */}
              <div>
                <button
                  onClick={handleExportUserData}
                  disabled={dataStatus === 'exporting'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Archive className="w-4 h-4" />
                  <span>导出用户数据</span>
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  导出加密数据和密钥文件为 ZIP 包（不含密码）
                </p>
              </div>

              {/* Import User Data (ZIP) */}
              <div>
                <button
                  onClick={handleImportUserData}
                  disabled={dataStatus === 'importing'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>导入用户数据</span>
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  从 ZIP 包导入加密数据（需用原密码解锁）
                </p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-2 py-2">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-[10px] text-slate-400 uppercase">仅数据库</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>

              {/* Export Database Only */}
              <div>
                <button
                  onClick={handleExport}
                  disabled={dataStatus === 'exporting'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>导出数据库</span>
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  仅导出 .db 文件（需配合密钥文件使用）
                </p>
              </div>

              {/* Import - Overwrite */}
              <div>
                <button
                  onClick={() => handleImport('overwrite')}
                  disabled={dataStatus === 'importing'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>覆盖导入</span>
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  替换当前所有数据，原有数据将被清除
                </p>
              </div>

              {/* Import - Incremental */}
              <div>
                <button
                  onClick={() => handleImport('incremental')}
                  disabled={dataStatus === 'importing'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>增量导入</span>
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  合并导入文件中的数据，跳过已存在的条目
                </p>
              </div>

              {dataMessage && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  dataStatus === 'success'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : dataStatus === 'error'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {(dataStatus === 'exporting' || dataStatus === 'importing') && (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  {dataStatus === 'success' && <Check className="w-4 h-4" />}
                  <span>{dataMessage}</span>
                </div>
              )}
            </CollapsibleSection>
          </div>

          {/* Preview Panel */}
          <div className="w-1/2 p-6 overflow-y-auto bg-slate-50 dark:bg-slate-800/50">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">实时预览</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">以下预览会根据您的设置实时变化</p>
            </div>

            {/* Preview Card */}
            <div
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm"
              style={{ padding: `${settings.cardSize / 4}px` }}
            >
              <div className="flex items-start" style={{ gap: `${settings.spacing}px` }}>
                <div
                  className="rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg"
                  style={{ width: `${settings.cardSize}px`, height: `${settings.cardSize}px` }}
                >
                  <Key className="text-white" style={{ width: `${settings.cardSize / 2}px`, height: `${settings.cardSize / 2}px` }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center" style={{ gap: `${settings.spacing / 2}px` }}>
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate" style={{ fontSize: `${settings.fontSize + 2}px` }}>示例密码</h3>
                    <Star className="text-amber-500 fill-current flex-shrink-0" style={{ width: `${settings.fontSize + 2}px`, height: `${settings.fontSize + 2}px` }} />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 truncate mt-1" style={{ fontSize: `${settings.fontSize}px` }}>
                    username@example.com
                  </p>
                </div>
                <div className="opacity-50">
                  <Eye className="text-violet-500" style={{ width: `${settings.fontSize + 2}px`, height: `${settings.fontSize + 2}px` }} />
                </div>
              </div>

              <div className="flex items-center mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/30" style={{ gap: `${settings.spacing / 2}px` }}>
                <span className="text-slate-400" style={{ fontSize: `${settings.fontSize - 2}px` }}>3 个字段</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-violet-500 dark:text-violet-400 font-medium" style={{ fontSize: `${settings.fontSize - 2}px` }}>双击查看详情</span>
              </div>
            </div>

            {/* Multiple Cards Preview */}
            <div
              className="mt-4 grid grid-cols-2"
              style={{ gap: `${settings.spacing}px` }}
            >
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm"
                  style={{ padding: `${settings.cardSize / 5}px` }}
                >
                  <div className="flex items-center" style={{ gap: `${settings.spacing / 2}px` }}>
                    <div
                      className="rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center"
                      style={{ width: `${settings.cardSize / 1.5}px`, height: `${settings.cardSize / 1.5}px` }}
                    >
                      <Key className="text-white" style={{ width: `${settings.cardSize / 3}px`, height: `${settings.cardSize / 3}px` }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 dark:text-white truncate" style={{ fontSize: `${settings.fontSize}px` }}>卡片 {i}</h4>
                      <p className="text-slate-500 dark:text-slate-400 truncate" style={{ fontSize: `${settings.fontSize - 2}px` }}>预览内容</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Text Size Preview */}
            <div className="mt-6 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/50">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">字体大小预览</h4>
              <div className="space-y-2">
                <p className="text-slate-600 dark:text-slate-400" style={{ fontSize: `${settings.fontSize}px` }}>
                  这是当前字体大小的示例文本，用于预览设置效果。
                </p>
                <p className="text-slate-500 dark:text-slate-500" style={{ fontSize: `${settings.fontSize}px` }}>
                  The quick brown fox jumps over the lazy dog.
                </p>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-slate-400" style={{ fontSize: `${settings.fontSize - 2}px` }}>
                    字体大小: {settings.fontSize}px | 卡片大小: {settings.cardSize}px | 间距: {settings.spacing}px
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen Position Picker */}
      {showPositionPicker && (
        <FullScreenPositionPicker
          x={settings.quickSearchCustomX}
          y={settings.quickSearchCustomY}
          screenWidth={screenSize.width}
          screenHeight={screenSize.height}
          onChange={handlePositionChange}
          onClose={() => setShowPositionPicker(false)}
        />
      )}

      {/* Quick Add Position Picker */}
      {showQuickAddPositionPicker && (
        <FullScreenPositionPicker
          x={settings.quickAddCustomX}
          y={settings.quickAddCustomY}
          screenWidth={screenSize.width}
          screenHeight={screenSize.height}
          onChange={handleQuickAddPositionChange}
          onClose={() => setShowQuickAddPositionPicker(false)}
        />
      )}

      {/* Security Questions Form Modal */}
      {showSQForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700/60 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/40">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">设置密保问题</h3>
              <button
                onClick={() => setShowSQForm(false)}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                设置密保问题后，忘记密码时可通过回答密保问题找回。至少需要设置 2 个问题，最多 5 个。
              </p>

              {sqQuestions.map((question, index) => (
                <div key={index} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">问题 {index + 1}</span>
                    {sqQuestions.length > 2 && (
                      <button
                        onClick={() => removeSQRow(index)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => updateSQQuestion(index, e.target.value)}
                    placeholder="例如：您的小学名称是？"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <input
                    type="text"
                    value={sqAnswers[index]}
                    onChange={(e) => updateSQAnswer(index, e.target.value)}
                    placeholder="答案"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              ))}

              {sqQuestions.length < 5 && (
                <button
                  onClick={addSQRow}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-violet-400 dark:hover:border-violet-500 text-slate-500 dark:text-slate-400 hover:text-violet-500 dark:hover:text-violet-400 rounded-xl text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>添加更多问题</span>
                </button>
              )}

              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>安全提示：</strong>建议设置"非标准答案"（如：小学名称填"ABCDEFG"），避免被他人猜到。
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700/40">
              <button
                onClick={() => setShowSQForm(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveSecurityQuestions}
                disabled={sqLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {sqLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>保存</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Username Form Modal */}
      {showRenameForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md mx-4 border border-slate-200 dark:border-slate-700/60 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/40">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">修改用户名</h3>
              <button
                onClick={() => {
                  setShowRenameForm(false)
                  setNewUsername('')
                }}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>注意：</strong>修改用户名后需要重新登录。数据目录和数据库文件将被重命名。
                </p>
              </div>

              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">新用户名</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="输入新用户名"
                  className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  autoFocus
                />
              </div>

              {/* Status Message */}
              {renameMessage && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  renameStatus === 'success'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : renameStatus === 'error'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {renameStatus === 'success' && <Check className="w-4 h-4" />}
                  <span>{renameMessage}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700/40">
              <button
                onClick={() => {
                  setShowRenameForm(false)
                  setNewUsername('')
                }}
                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleRenameUsername}
                disabled={renameLoading || !newUsername.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {renameLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>确认修改</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Form Modal */}
      {showChangePasswordForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md mx-4 border border-slate-200 dark:border-slate-700/60 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/40">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">修改密码</h3>
              <button
                onClick={() => {
                  setShowChangePasswordForm(false)
                  setChangePasswordOld('')
                  setChangePasswordNew('')
                  setChangePasswordConfirm('')
                  setShowChangePasswordFields(false)
                  setChangePasswordStatus('idle')
                  setChangePasswordMessage('')
                }}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {!showChangePasswordFields ? (
                <>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    请输入当前密码验证身份
                  </p>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">当前密码</label>
                    <input
                      type="password"
                      value={changePasswordOld}
                      onChange={(e) => setChangePasswordOld(e.target.value)}
                      placeholder="输入当前密码"
                      className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (!changePasswordOld.trim()) {
                        setChangePasswordStatus('error')
                        setChangePasswordMessage('请输入当前密码')
                        setTimeout(() => { setChangePasswordStatus('idle'); setChangePasswordMessage('') }, 3000)
                        return
                      }
                      try {
                        const valid = await invoke<boolean>('verify_master_password', { username, password: changePasswordOld })
                        if (valid) {
                          setShowChangePasswordFields(true)
                          setChangePasswordStatus('idle')
                          setChangePasswordMessage('')
                        } else {
                          setChangePasswordStatus('error')
                          setChangePasswordMessage('密码错误')
                          setTimeout(() => { setChangePasswordStatus('idle'); setChangePasswordMessage('') }, 3000)
                        }
                      } catch (err) {
                        setChangePasswordStatus('error')
                        setChangePasswordMessage(`验证失败: ${err}`)
                        setTimeout(() => { setChangePasswordStatus('idle'); setChangePasswordMessage('') }, 3000)
                      }
                    }}
                    className="w-full py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    验证密码
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    请设置新密码
                  </p>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">新密码</label>
                    <input
                      type="password"
                      value={changePasswordNew}
                      onChange={(e) => setChangePasswordNew(e.target.value)}
                      placeholder="输入新密码"
                      className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">确认新密码</label>
                    <input
                      type="password"
                      value={changePasswordConfirm}
                      onChange={(e) => setChangePasswordConfirm(e.target.value)}
                      placeholder="再次输入新密码"
                      className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </>
              )}

              {/* Status Message - fixed height */}
              <div className="h-12">
                {changePasswordMessage && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    changePasswordStatus === 'success'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                      : changePasswordStatus === 'error'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {changePasswordStatus === 'success' && <Check className="w-4 h-4" />}
                    <span>{changePasswordMessage}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            {showChangePasswordFields && (
              <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700/40">
                <button
                  onClick={() => {
                    setShowChangePasswordForm(false)
                    setChangePasswordOld('')
                    setChangePasswordNew('')
                    setChangePasswordConfirm('')
                    setShowChangePasswordFields(false)
                    setChangePasswordStatus('idle')
                    setChangePasswordMessage('')
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={changePasswordLoading || !changePasswordNew.trim() || !changePasswordConfirm.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {changePasswordLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>确认修改</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
