import { useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useStore } from './stores/useStore'
import { ThemeProvider } from './components/ThemeProvider'
import Sidebar from './components/Sidebar'
import SearchBar from './components/SearchBar'
import SecretList from './components/SecretList'
import SecretDetail from './components/SecretDetail'
import SecretForm from './components/SecretForm'
import TemplateList from './components/TemplateList'
import TemplateForm from './components/TemplateForm'
import Settings from './components/Settings'
import MasterPassword from './components/MasterPassword'
import QuickSearch from './components/QuickSearch'
import QuickSearchWindow from './components/QuickSearchWindow'

// 检查是否是快速搜索独立窗口模式
const isQuickSearchWindow = window.location.hash === '#quick-search'

function AppContent() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [currentUsername, setCurrentUsername] = useState<string>('')
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [dontAskAgain, setDontAskAgain] = useState(false)
  const fetchSecrets = useStore((s) => s.fetchSecrets)
  const showForm = useStore((s) => s.showForm)
  const selectedSecret = useStore((s) => s.selectedSecret)
  const showTemplates = useStore((s) => s.showTemplates)
  const showTemplateForm = useStore((s) => s.showTemplateForm)
  const showSettings = useStore((s) => s.showSettings)
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const setShowTemplates = useStore((s) => s.setShowTemplates)
  const setShowForm = useStore((s) => s.setShowForm)
  const initialized = useRef(false)

  // 监听关闭请求事件
  useEffect(() => {
    const unlisten = listen('close-requested', async () => {
      // 从 store 获取最新的设置值
      const currentSettings = useStore.getState().settings
      if (currentSettings.askOnClose) {
        setShowCloseDialog(true)
      } else {
        // 不询问，直接按设置执行
        if (currentSettings.closeToTray) {
          try {
            await getCurrentWindow().hide()
          } catch (e) {
            console.error('Failed to hide window:', e)
          }
        } else {
          invoke('exit_app')
        }
      }
    })

    return () => {
      unlisten.then(fn => fn())
    }
  }, [])

  // 处理关闭对话框选择
  const handleCloseChoice = async (minimizeToTray: boolean) => {
    setShowCloseDialog(false)

    // 如果勾选了"不再询问"，更新设置
    if (dontAskAgain) {
      updateSettings({ askOnClose: false, closeToTray: minimizeToTray })
    }

    if (minimizeToTray) {
      await getCurrentWindow().hide()
    } else {
      await invoke('exit_app')
    }
  }

  useEffect(() => {
    if (!initialized.current && isUnlocked) {
      initialized.current = true
      fetchSecrets()
    }
  }, [fetchSecrets, isUnlocked])

  const handleSelectTemplate = (template: any) => {
    setShowTemplates(false)
    useStore.getState().setEditingSecret(null)
    setShowForm(true)
    ;(window as any).__selectedTemplate = template
  }

  const handleUnlock = (username: string) => {
    setCurrentUsername(username)
    setIsUnlocked(true)
    fetchSecrets()
  }

  const handleLogout = async () => {
    // Clear encryption key from memory
    await invoke('clear_encryption_key')
    setCurrentUsername('')
    setIsUnlocked(false)
    initialized.current = false
  }

  const handleSwitchUser = async () => {
    // Clear encryption key from memory and switch to login screen
    await invoke('clear_encryption_key')
    setCurrentUsername('')
    setIsUnlocked(false)
    initialized.current = false
  }

  if (!isUnlocked) {
    return <MasterPassword onUnlock={handleUnlock} />
  }

  return (
    <div className="flex h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-white" style={{ fontSize: `${settings.fontSize}px` }}>
      <Sidebar username={currentUsername} onLogout={handleLogout} onSwitchUser={handleSwitchUser} />
      <div className="flex-1 flex flex-col overflow-hidden" style={{ gap: `${settings.spacing}px` }}>
        <SearchBar />
        <SecretList />
      </div>
      {selectedSecret && <SecretDetail />}
      {showForm && <SecretForm />}
      {showTemplates && <TemplateList onSelectTemplate={handleSelectTemplate} />}
      {showTemplateForm && <TemplateForm />}
      {showSettings && <Settings username={currentUsername} />}
      <QuickSearch />

      {/* 关闭询问对话框 */}
      {showCloseDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70]">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm mx-4 border border-slate-200 dark:border-slate-700/60 shadow-2xl">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">关闭窗口</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                选择关闭方式：
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleCloseChoice(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-xl transition-colors"
                >
                  <span className="text-lg">📥</span>
                  <div className="text-left">
                    <div className="font-medium">最小化到托盘</div>
                    <div className="text-xs opacity-75">继续在后台运行</div>
                  </div>
                </button>
                <button
                  onClick={() => handleCloseChoice(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
                >
                  <span className="text-lg">🚪</span>
                  <div className="text-left">
                    <div className="font-medium">退出应用</div>
                    <div className="text-xs opacity-75">完全关闭程序</div>
                  </div>
                </button>
              </div>
              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dontAskAgain}
                  onChange={(e) => setDontAskAgain(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-violet-500 focus:ring-violet-500"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">记住此选择，下次不再询问</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function App() {
  // 如果是快速搜索独立窗口，只渲染 QuickSearchWindow
  if (isQuickSearchWindow) {
    return (
      <ThemeProvider>
        <QuickSearchWindow />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App
