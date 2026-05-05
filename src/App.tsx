import { useEffect, useRef, useState } from 'react'
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

  if (!isUnlocked) {
    return <MasterPassword onUnlock={handleUnlock} />
  }

  return (
    <div className="flex h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-white" style={{ fontSize: `${settings.fontSize}px` }}>
      <Sidebar username={currentUsername} />
      <div className="flex-1 flex flex-col overflow-hidden" style={{ gap: `${settings.spacing}px` }}>
        <SearchBar />
        <SecretList />
      </div>
      {selectedSecret && <SecretDetail />}
      {showForm && <SecretForm />}
      {showTemplates && <TemplateList onSelectTemplate={handleSelectTemplate} />}
      {showTemplateForm && <TemplateForm />}
      {showSettings && <Settings />}
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App
