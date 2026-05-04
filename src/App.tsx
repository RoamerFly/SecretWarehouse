import { useEffect } from 'react'
import { useStore } from './stores/useStore'
import Sidebar from './components/Sidebar'
import SearchBar from './components/SearchBar'
import SecretList from './components/SecretList'
import SecretDetail from './components/SecretDetail'
import SecretForm from './components/SecretForm'

function App() {
  const { fetchSecrets, showForm } = useStore()

  useEffect(() => {
    fetchSecrets()
  }, [fetchSecrets])

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search Bar */}
        <SearchBar />

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Secret List */}
          <SecretList />

          {/* Secret Detail */}
          <SecretDetail />
        </div>
      </div>

      {/* Form Modal */}
      {showForm && <SecretForm />}
    </div>
  )
}

export default App
