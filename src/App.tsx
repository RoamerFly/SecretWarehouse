import { useEffect, useRef } from 'react'
import { useStore } from './stores/useStore'
import { ThemeProvider } from './components/ThemeProvider'
import Sidebar from './components/Sidebar'
import SearchBar from './components/SearchBar'
import SecretList from './components/SecretList'
import SecretDetail from './components/SecretDetail'
import SecretForm from './components/SecretForm'

function AppContent() {
  const fetchSecrets = useStore((s) => s.fetchSecrets)
  const showForm = useStore((s) => s.showForm)
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      fetchSecrets()
    }
  }, [fetchSecrets])

  return (
    <div className="flex h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <SearchBar />
        <div className="flex-1 flex overflow-hidden">
          <SecretList />
          <SecretDetail />
        </div>
      </div>
      {showForm && <SecretForm />}
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
