import { useStore } from '../stores/useStore'
import { Globe, Key, CreditCard, FileText, Terminal, Award, Star, Plus } from 'lucide-react'
import { SecretType } from '../types'

const typeIcons: Record<SecretType, React.ComponentType<{ className?: string }>> = {
  website: Globe,
  api_key: Key,
  bank_card: CreditCard,
  secure_note: FileText,
  ssh_key: Terminal,
  license: Award,
}

const typeColors: Record<SecretType, string> = {
  website: 'from-green-500 to-emerald-600',
  api_key: 'from-purple-500 to-violet-600',
  bank_card: 'from-rose-500 to-pink-600',
  secure_note: 'from-cyan-500 to-teal-600',
  ssh_key: 'from-orange-500 to-amber-600',
  license: 'from-indigo-500 to-blue-600',
}

export default function SecretList() {
  const { secrets, selectedSecret, selectSecret, isLoading, setShowForm } = useStore()

  if (isLoading) {
    return (
      <div className="w-96 bg-slate-800/30 border-r border-slate-700/50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-96 bg-slate-800/30 border-r border-slate-700/50 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            条目列表
          </h2>
          <span className="px-2 py-1 text-xs bg-slate-700/50 rounded-full text-slate-400">
            {secrets.length} 项
          </span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {secrets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">暂无条目</h3>
            <p className="text-sm text-slate-500 mb-6">
              点击下方按钮创建你的第一个密码条目
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              新增条目
            </button>
          </div>
        ) : (
          <ul className="p-2 space-y-1">
            {secrets.map((secret) => {
              const Icon = typeIcons[secret.secret_type] || FileText
              const isSelected = selectedSecret?.id === secret.id
              const gradientColor = typeColors[secret.secret_type] || 'from-slate-500 to-slate-600'

              return (
                <li key={secret.id}>
                  <button
                    onClick={() => selectSecret(secret)}
                    className={`w-full p-3 flex items-center gap-3 text-left rounded-xl transition-all duration-200 ${
                      isSelected
                        ? 'bg-slate-700/70 shadow-lg'
                        : 'hover:bg-slate-700/40'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientColor} flex items-center justify-center shadow-lg flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white truncate">
                          {secret.title}
                        </h3>
                        {secret.favorite && (
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-slate-400 truncate mt-0.5">
                        {getSubtitle(secret)}
                      </p>
                    </div>

                    {/* Type Badge */}
                    <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded-md flex-shrink-0">
                      {getTypeLabel(secret.secret_type)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function getSubtitle(secret: { secret_type: SecretType; fields: Record<string, string> }): string {
  switch (secret.secret_type) {
    case 'website':
      return secret.fields.username || secret.fields.url || ''
    case 'api_key':
      return secret.fields.service || ''
    case 'bank_card':
      return secret.fields.bank || ''
    case 'license':
      return secret.fields.software || ''
    case 'ssh_key':
      return secret.fields.title || ''
    default:
      return secret.fields.content?.substring(0, 30) || ''
  }
}

function getTypeLabel(type: SecretType): string {
  const labels: Record<SecretType, string> = {
    website: '网站',
    api_key: 'API',
    bank_card: '银行卡',
    secure_note: '笔记',
    ssh_key: 'SSH',
    license: '许可',
  }
  return labels[type] || type
}
