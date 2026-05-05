import { useStore } from '../stores/useStore'
import { useTheme } from './ThemeProvider'
import { X, Sun, Moon, Monitor, Type, LayoutGrid, Space, RotateCcw } from 'lucide-react'

export default function Settings() {
  const { showSettings, setShowSettings, settings, updateSettings, resetSettings } = useStore()
  const { theme, setTheme } = useTheme()

  if (!showSettings) return null

  const fontSizes = [
    { value: 'small' as const, label: '小', preview: '12px' },
    { value: 'medium' as const, label: '中', preview: '14px' },
    { value: 'large' as const, label: '大', preview: '16px' },
  ]

  const cardSizes = [
    { value: 'compact' as const, label: '紧凑', preview: '小卡片' },
    { value: 'normal' as const, label: '标准', preview: '中卡片' },
    { value: 'comfortable' as const, label: '宽松', preview: '大卡片' },
  ]

  const spacingOptions = [
    { value: 'tight' as const, label: '紧凑' },
    { value: 'normal' as const, label: '标准' },
    { value: 'relaxed' as const, label: '宽松' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col border border-slate-200 dark:border-slate-700/60 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/40">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">设置</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={resetSettings}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              title="恢复默认"
            >
              <RotateCcw className="w-4 h-4" />
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Theme */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sun className="w-4 h-4 text-slate-500" />
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

          {/* Font Size */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Type className="w-4 h-4 text-slate-500" />
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">字体大小</label>
            </div>
            <div className="flex gap-2">
              {fontSizes.map(({ value, label, preview }) => (
                <button
                  key={value}
                  onClick={() => updateSettings({ fontSize: value })}
                  className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                    settings.fontSize === value
                      ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 ring-2 ring-violet-500'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="text-lg font-bold" style={{ fontSize: preview }}>{label}</span>
                  <span className="text-xs opacity-60">{preview}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Card Size */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <LayoutGrid className="w-4 h-4 text-slate-500" />
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">卡片大小</label>
            </div>
            <div className="flex gap-2">
              {cardSizes.map(({ value, label, preview }) => (
                <button
                  key={value}
                  onClick={() => updateSettings({ cardSize: value })}
                  className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                    settings.cardSize === value
                      ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 ring-2 ring-violet-500'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className="flex gap-0.5">
                    <div className={`w-2 bg-current rounded-sm ${value === 'compact' ? 'h-4' : value === 'normal' ? 'h-5' : 'h-6'}`} />
                    <div className={`w-2 bg-current rounded-sm ${value === 'compact' ? 'h-4' : value === 'normal' ? 'h-5' : 'h-6'}`} />
                  </div>
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Spacing */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Space className="w-4 h-4 text-slate-500" />
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">间距</label>
            </div>
            <div className="flex gap-2">
              {spacingOptions.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => updateSettings({ spacing: value })}
                  className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                    settings.spacing === value
                      ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 ring-2 ring-violet-500'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className={`w-8 h-1 bg-current rounded ${value === 'tight' ? 'mb-0' : value === 'normal' ? 'mb-0.5' : 'mb-1'}`} />
                    <div className={`w-8 h-1 bg-current rounded ${value === 'tight' ? 'mb-0' : value === 'normal' ? 'mb-0.5' : 'mb-1'}`} />
                    <div className="w-8 h-1 bg-current rounded" />
                  </div>
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
