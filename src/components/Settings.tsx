import { useState, useRef } from 'react'
import { useStore } from '../stores/useStore'
import { useTheme } from './ThemeProvider'
import { X, Sun, Moon, Monitor, Type, LayoutGrid, Space, RotateCcw, Maximize2, Check, Star, Eye, Key } from 'lucide-react'
import { appWindow } from '@tauri-apps/api/window'

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

export default function Settings() {
  const { showSettings, setShowSettings, settings, updateSettings, resetSettings } = useStore()
  const { theme, setTheme } = useTheme()
  const [showSaved, setShowSaved] = useState(false)
  const [editingWidth, setEditingWidth] = useState(false)
  const [editingHeight, setEditingHeight] = useState(false)
  const [widthInput, setWidthInput] = useState(String(settings.customWidth))
  const [heightInput, setHeightInput] = useState(String(settings.customHeight))
  const widthInputRef = useRef<HTMLInputElement>(null)
  const heightInputRef = useRef<HTMLInputElement>(null)

  // Show saved notification
  const handleUpdateSettings = (partial: Partial<typeof settings>) => {
    updateSettings(partial)
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 1500)
  }

  // Handle window size change
  const handleWindowSizeChange = async (size: string) => {
    handleUpdateSettings({ windowSize: size })
    await applyWindowSize(size, settings.customWidth, settings.customHeight)
  }

  // Apply window size
  const applyWindowSize = async (size: string, width: number, height: number) => {
    try {
      if (size === 'maximized') {
        await appWindow.maximize()
        await appWindow.setFullscreen(false)
      } else if (size === 'fullscreen') {
        await appWindow.setFullscreen(true)
        await appWindow.unmaximize()
      } else if (size === 'custom') {
        await appWindow.setFullscreen(false)
        await appWindow.unmaximize()
        await appWindow.setSize({ type: 'Logical', width, height })
        await appWindow.center()
      } else if (size.includes('x')) {
        await appWindow.setFullscreen(false)
        await appWindow.unmaximize()
        const [w, h] = size.split('x').map(Number)
        await appWindow.setSize({ type: 'Logical', width: w, height: h })
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
          <div className="w-1/2 overflow-y-auto p-6 space-y-8 border-r border-slate-200 dark:border-slate-700/40">
            {/* Theme */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sun className="w-4 h-4 text-violet-500" />
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">主题模式</label>
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
                <Maximize2 className="w-4 h-4 text-violet-500" />
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">窗口大小</label>
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

            {/* Font Size Slider */}
            <SliderWithInput
              label="字体大小"
              value={settings.fontSize}
              min={1}
              max={999}
              unit="px"
              icon={<Type className="w-4 h-4 text-violet-500" />}
              onChange={(value) => handleUpdateSettings({ fontSize: value })}
            />

            {/* Card Size Slider */}
            <SliderWithInput
              label="卡片大小"
              value={settings.cardSize}
              min={1}
              max={999}
              unit="px"
              icon={<LayoutGrid className="w-4 h-4 text-violet-500" />}
              onChange={(value) => handleUpdateSettings({ cardSize: value })}
            />

            {/* Spacing Slider */}
            <SliderWithInput
              label="间距"
              value={settings.spacing}
              min={0}
              max={999}
              unit="px"
              icon={<Space className="w-4 h-4 text-violet-500" />}
              onChange={(value) => handleUpdateSettings({ spacing: value })}
            />
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
    </div>
  )
}
