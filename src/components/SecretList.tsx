import { useStore } from '../stores/useStore'
import { Key, Lock, Star } from 'lucide-react'
import { iconMap, iconColors } from '../constants/icons'

const SENSITIVE_KEYWORDS = ['password', '密码', 'secret', '密钥', 'key', 'token', 'cvv', 'pin']

export default function SecretList() {
  const { secrets, selectedSecret, selectSecret, isLoading } = useStore()

  if (isLoading) {
    return (
      <div className="w-80 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700 flex items-center justify-center transition-colors">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="w-80 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-colors">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
            条目列表
          </span>
          <span className="text-xs text-slate-400">
            {secrets.length} 项
          </span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {secrets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <Lock className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm text-slate-400">暂无条目</p>
          </div>
        ) : (
          <ul className="py-1">
            {secrets.map((secret) => {
              const Icon = iconMap[secret.icon] || Key
              const isSelected = selectedSecret?.id === secret.id
              const gradientColor = iconColors[secret.icon] || 'from-yellow-400 to-amber-500'
              const preview = getPreview(secret.fields)

              return (
                <li key={secret.id}>
                  <button
                    onClick={() => selectSecret(secret)}
                    className={`w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/30'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradientColor} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-700 dark:text-slate-200 truncate text-sm">
                          {secret.title}
                        </span>
                        {secret.favorite && (
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                      {preview && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {preview}
                        </p>
                      )}
                    </div>
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
  for (const [key, value] of Object.entries(fields)) {
    if (value && !SENSITIVE_KEYWORDS.some(kw => key.toLowerCase().includes(kw))) {
      return value.substring(0, 30) + (value.length > 30 ? '...' : '')
    }
  }
  return ''
}
