import { useEffect, useRef } from 'react'
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

function AppContent() {
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
    if (!initialized.current) {
      initialized.current = true
      fetchSecrets()
    }
  }, [fetchSecrets])

  const handleSelectTemplate = (template: any) => {
    setShowTemplates(false)
    // Open form with template data - this is handled by SecretForm
    // We need to pass the template data somehow
    // For now, we'll use a temporary approach
    useStore.getState().setEditingSecret(null)
    setShowForm(true)
    // Store the selected template for SecretForm to use
    ;(window as any).__selectedTemplate = template
  }

  // Generate classes based on settings
  const fontSizeClass = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  }[settings.fontSize]

  const spacingClass = {
    tight: 'gap-2',
    normal: 'gap-4',
    relaxed: 'gap-6',
  }[settings.spacing]

  return (
    <div className={`flex h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-white ${fontSizeClass}`}>
      <Sidebar />
      <div className={`flex-1 flex flex-col overflow-hidden ${spacingClass}`}>
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
