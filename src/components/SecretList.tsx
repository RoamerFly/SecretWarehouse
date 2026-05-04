import { useStore } from '../stores/useStore'
import { Key, Lock, Star } from 'lucide-react'
import { iconMap, iconColors } from '../constants/icons'

const SENSITIVE_KEYWORDS = ['password', '密码', 'secret', '密钥', 'key', 'token', 'cvv', 'pin']

export default function SecretList() {
  const { secrets, selectedSecret, selectSecret, isLoading } = useStore()

  if (isLoading) {
    return (
      <div className="w-80 bg-slate-50/50 dark:bg-slate-900/50 border-r border-slate-200/60 dark:border-slate-700/40 flex items-center justify-center transition-colors">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 border-3 border-violet-200 dark:border-violet-900 rounded-full animate-spin" />
            <div className="absolute inset-0 w-10 h-10 border-3 border-transparent border-t-violet-500 rounded-full animate-spin" />
          </div>
          <span className="text-sm text-slate-400 font-medium">加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 bg-slate-50/50 dark:bg-slate-900/50 border-r border-slate-200/60 dark:border-slate-700/40 flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/40">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            条目列表
          </span>
          <span className="px-2.5 py-1 bg-slate-200/60 dark:bg-slate-700/60 rounded-full text-xs font-semibold text-slate-500 dark:text-slate-400">
            {secrets.length} 项
          </span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {secrets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">暂无条目</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">点击"新增条目"开始添加</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {secrets.map((secret) => {
              const Icon = iconMap[secret.icon] || Key
              const isSelected = selectedSecret?.id === secret.id
              const gradientColor = iconColors[secret.icon] || 'from-yellow-400 to-amber-500'
              const preview = getPreview(secret.fields)

              return (
                <li key={secret.id}>
                  <button
                    onClick={() => selectSecret(secret)}
                    className={`w-full group p-3 flex items-center gap-3 text-left rounded-2xl transition-all duration-200 ${
                      isSelected
                        ? 'bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 ring-1 ring-violet-500/20 dark:ring-violet-400/20'
                        : 'hover:bg-white/80 dark:hover:bg-slate-800/80 hover:shadow-md'
                    }`}
                  >
                    <div className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${gradientColor} flex items-center justify-center flex-shrink-0 shadow-md transition-transform duration-200 group-hover:scale-105 ${
                      isSelected ? 'shadow-lg' : ''
                    }`}>
                      <Icon className="w-5 h-5 text-white" />
                      {secret.favorite && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
                          <Star className="w-2.5 h-2.5 text-white fill-current" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold truncate text-sm ${
                          isSelected
                            ? 'text-slate-800 dark:text-white'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {secret.title}
                        </span>
                      </div>
                      {preview && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-1 font-mono">
                          {preview}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="w-1.5 h-8 bg-gradient-to-b from-violet-500 to-purple-500 rounded-full" />
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
  for (const [key, value] of Object.entries(fields)) {
    if (value && !SENSITIVE_KEYWORDS.some(kw => key.toLowerCase().includes(kw))) {
      return value.substring(0, 25) + (value.length > 25 ? '...' : '')
    }
  }
  return ''
}
