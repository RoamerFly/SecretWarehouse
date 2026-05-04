import { useStore } from '../stores/useStore'
import {
  Globe,
  Key,
  CreditCard,
  FileText,
  Terminal,
  Award,
  Plus,
  Star,
  Layers,
  Shield,
} from 'lucide-react'

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  website: Globe,
  api_key: Key,
  bank_card: CreditCard,
  secure_note: FileText,
  ssh_key: Terminal,
  license: Award,
}

export default function Sidebar() {
  const { secretTypes, selectedType, selectType, setShowForm } = useStore()

  const handleTypeClick = (typeName: string | null) => {
    selectType(typeName)
  }

  return (
    <aside className="w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col border-r border-slate-700/50">
      {/* Logo Header */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              SecretWarehouse
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              安全密码管理器
            </p>
          </div>
        </div>
      </div>

      {/* Add Button */}
      <div className="p-4">
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          新增条目
        </button>
      </div>

      {/* Categories */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="space-y-1">
          {/* All Items */}
          <button
            onClick={() => handleTypeClick(null)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              selectedType === null
                ? 'bg-slate-700/50 text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-700/30 hover:text-white'
            }`}
          >
            <div className={`p-2 rounded-lg ${
              selectedType === null
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-slate-700/50 text-slate-500'
            }`}>
              <Layers className="w-4 h-4" />
            </div>
            全部条目
          </button>

          {/* Favorites */}
          <button
            onClick={() => handleTypeClick('favorite')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              selectedType === 'favorite'
                ? 'bg-slate-700/50 text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-700/30 hover:text-white'
            }`}
          >
            <div className={`p-2 rounded-lg ${
              selectedType === 'favorite'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-slate-700/50 text-slate-500'
            }`}>
              <Star className="w-4 h-4" />
            </div>
            收藏夹
          </button>
        </div>

        {/* Divider */}
        <div className="my-4 px-4">
          <div className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
        </div>

        {/* Secret Types */}
        <div className="space-y-1">
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            分类
          </p>
          {secretTypes.map((type) => {
            const Icon = typeIcons[type.type_name] || FileText
            const colorClass = getTypeColor(type.type_name)
            return (
              <button
                key={type.type_name}
                onClick={() => handleTypeClick(type.type_name)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  selectedType === type.type_name
                    ? 'bg-slate-700/50 text-white shadow-lg'
                    : 'text-slate-400 hover:bg-slate-700/30 hover:text-white'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  selectedType === type.type_name
                    ? colorClass
                    : 'bg-slate-700/50 text-slate-500'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                {type.label}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700/50">
        <p className="text-xs text-slate-500 text-center">
          AES-256 加密保护
        </p>
      </div>
    </aside>
  )
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    website: 'bg-green-500/20 text-green-400',
    api_key: 'bg-purple-500/20 text-purple-400',
    bank_card: 'bg-rose-500/20 text-rose-400',
    secure_note: 'bg-cyan-500/20 text-cyan-400',
    ssh_key: 'bg-orange-500/20 text-orange-400',
    license: 'bg-indigo-500/20 text-indigo-400',
  }
  return colors[type] || 'bg-slate-700/50 text-slate-500'
}
