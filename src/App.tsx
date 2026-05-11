import { useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
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
import QuickAddWindow from './components/QuickAddWindow'

// 检查是否是快速搜索或快速添加浮窗模式
const isQuickSearchWindow = window.location.hash === '#quick-search'
const isQuickAddWindow = window.location.hash === '#quick-add'

function AppContent() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [currentUsername, setCurrentUsername] = useState<string>('')
  const fetchSecrets = useStore((s) => s.fetchSecrets)
  const showForm = useStore((s) => s.showForm)
  const selectedSecret = useStore((s) => s.selectedSecret)
  const showTemplates = useStore((s) => s.showTemplates)
  const showTemplateForm = useStore((s) => s.showTemplateForm)
  const showSettings = useStore((s) => s.showSettings)
  const settings = useStore((s) => s.settings)
  const setShowTemplates = useStore((s) => s.setShowTemplates)
  const setShowForm = useStore((s) => s.setShowForm)
  const initialized = useRef(false)

  // 同步 closeToTray 设置到 Rust（每次设置变化时）
  useEffect(() => {
    if (isUnlocked) {
      invoke('set_close_to_tray', { closeToTray: settings.closeToTray })
    }
  }, [settings.closeToTray, isUnlocked])

  // 监听托盘菜单的"设置"事件
  useEffect(() => {
    const unlisten = listen('open-settings', () => {
      useStore.getState().setShowSettings(true)
    })
    return () => {
      unlisten.then(fn => fn())
    }
  }, [])

  useEffect(() => {
    if (!initialized.current && isUnlocked) {
      initialized.current = true
      // 同步初始设置到 Rust
      invoke('set_close_to_tray', { closeToTray: settings.closeToTray })
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
    // 如果启用了"启动时最小化到托盘"，登录后立即隐藏窗口
    if (settings.startMinimized) {
      invoke('hide_main_window')
    }
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
    </div>
  )
}

function App() {
  // 如果是快速搜索独立窗口
  if (isQuickSearchWindow) {
    return (
      <ThemeProvider>
        <QuickSearchWindow />
      </ThemeProvider>
    )
  }

  // 如果是快速添加独立窗口
  if (isQuickAddWindow) {
    return (
      <ThemeProvider>
        <QuickAddWindow />
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
