import { useStore } from '../stores/useStore'
import {
  Key, Globe, CreditCard, FileText, Terminal, Award, Lock, Shield,
  Mail, Smartphone, Wifi, Server, Star, Plus
} from 'lucide-react'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  key: Key,
  globe: Globe,
  'credit-card': CreditCard,
  'file-text': FileText,
  terminal: Terminal,
  award: Award,
  lock: Lock,
  shield: Shield,
  mail: Mail,
  smartphone: Smartphone,
  wifi: Wifi,
  server: Server,
}

const iconColors: Record<string, string> = {
  key: 'from-yellow-500 to-amber-600',
  globe: 'from-blue-500 to-cyan-600',
  'credit-card': 'from-rose-500 to-pink-600',
  'file-text': 'from-slate-500 to-gray-600',
  terminal: 'from-green-500 to-emerald-600',
  award: 'from-purple-500 to-violet-600',
  lock: 'from-red-500 to-orange-600',
  shield: 'from-indigo-500 to-blue-600',
  mail: 'from-cyan-500 to-teal-600',
  smartphone: 'from-pink-500 to-rose-600',
  wifi: 'from-teal-500 to-green-600',
  server: 'from-slate-600 to-gray-700',
}

// 敏感字段关键词
const SENSITIVE_KEYWORDS = ['password', '密码', 'secret', '密钥', 'key', 'token', 'cvv', 'pin']

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
              <Lock className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">暂无条目</h3>
            <p className="text-sm text-slate-500 mb-6">
              点击下方按钮创建你的第一个秘密条目
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
              const Icon = iconMap[secret.icon] || Key
              const isSelected = selectedSecret?.id === secret.id
              const gradientColor = iconColors[secret.icon] || 'from-yellow-500 to-amber-600'
              const preview = getPreview(secret.fields)

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
                      {preview && (
                        <p className="text-sm text-slate-400 truncate mt-0.5">
                          {preview}
                        </p>
                      )}
                    </div>

                    {/* Tags indicator */}
                    {secret.tags.length > 0 && (
                      <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded-md flex-shrink-0">
                        #{secret.tags[0]}
                      </span>
                    )}
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

function getPreview(fields: Record<string, string>): string {
  // 找到第一个非敏感字段作为预览
  for (const [key, value] of Object.entries(fields)) {
    if (value && !SENSITIVE_KEYWORDS.some(kw => key.toLowerCase().includes(kw))) {
      return `${key}: ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`
    }
  }
  return ''
}
