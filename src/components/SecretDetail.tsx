import { useState } from 'react'
import { useStore } from '../stores/useStore'
import {
  Key, Globe, CreditCard, FileText, Terminal, Award, Lock, Shield,
  Mail, Smartphone, Wifi, Server, Star, Eye, EyeOff, Copy, Edit,
  Trash2, Clock, CheckCircle2,
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

export default function SecretDetail() {
  const { selectedSecret, updateSecret, deleteSecret, setEditingSecret } = useStore()
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({})
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!selectedSecret) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
            <Lock className="w-10 h-10 text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-400 mb-2">选择一个条目</h3>
          <p className="text-sm text-slate-500">从左侧列表选择条目查看详情</p>
        </div>
      </div>
    )
  }

  const Icon = iconMap[selectedSecret.icon] || Key
  const gradientColor = iconColors[selectedSecret.icon] || 'from-yellow-500 to-amber-600'

  const toggleSensitive = (field: string) => {
    setShowSensitive((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  const isFieldSensitive = (key: string) => {
    return SENSITIVE_KEYWORDS.some(kw => key.toLowerCase().includes(kw))
  }

  const copyToClipboard = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const toggleFavorite = () => {
    updateSecret({
      id: selectedSecret.id,
      favorite: !selectedSecret.favorite,
    })
  }

  const handleDelete = () => {
    deleteSecret(selectedSecret.id)
    setShowDeleteConfirm(false)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header Card */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 mb-4 backdrop-blur-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradientColor} flex items-center justify-center shadow-lg`}>
                <Icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {selectedSecret.title}
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  {Object.keys(selectedSecret.fields).length} 个字段
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFavorite}
                className={`p-2.5 rounded-xl transition-all duration-200 ${
                  selectedSecret.favorite
                    ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
                title={selectedSecret.favorite ? '取消收藏' : '添加收藏'}
              >
                <Star
                  className={`w-5 h-5 ${selectedSecret.favorite ? 'fill-yellow-400' : ''}`}
                />
              </button>
              <button
                onClick={() => setEditingSecret(selectedSecret)}
                className="p-2.5 rounded-xl bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white transition-all duration-200"
                title="编辑"
              >
                <Edit className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2.5 rounded-xl bg-slate-700/50 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all duration-200"
                title="删除"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tags */}
          {selectedSecret.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedSecret.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-xs font-medium bg-slate-700/50 text-slate-300 rounded-lg border border-slate-600/50"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Fields Card */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 mb-4 backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            字段内容
          </h2>
          <div className="space-y-4">
            {Object.entries(selectedSecret.fields).map(([key, value]) => {
              const isSensitive = isFieldSensitive(key)
              const isVisible = showSensitive[key]

              return (
                <div key={key} className="group">
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    {key}
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-slate-900/50 rounded-xl border border-slate-700/50">
                      <code className={`flex-1 text-sm font-mono break-all ${
                        isSensitive && !isVisible
                          ? 'text-slate-500'
                          : 'text-white'
                      }`}>
                        {isSensitive && !isVisible
                          ? '••••••••••••••••'
                          : value}
                      </code>
                    </div>
                    {isSensitive && (
                      <button
                        onClick={() => toggleSensitive(key)}
                        className={`p-3 rounded-xl transition-all duration-200 ${
                          isVisible
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {isVisible ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => copyToClipboard(value, key)}
                      className={`p-3 rounded-xl transition-all duration-200 ${
                        copiedField === key
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                      title="复制"
                    >
                      {copiedField === key ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Metadata Card */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            元数据
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 rounded-lg bg-slate-700/50">
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <span className="text-slate-500">创建时间</span>
                <p className="text-slate-300">{formatDate(selectedSecret.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 rounded-lg bg-slate-700/50">
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <span className="text-slate-500">更新时间</span>
                <p className="text-slate-300">{formatDate(selectedSecret.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-6 max-w-sm w-full mx-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                确认删除
              </h3>
              <p className="text-slate-400 mb-6">
                确定要删除 "<span className="text-white">{selectedSecret.title}</span>" 吗？此操作无法撤回。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
