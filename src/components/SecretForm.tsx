import { useState, useEffect } from 'react'
import { useStore } from '../stores/useStore'
import { X, RefreshCw, Sparkles } from 'lucide-react'
import { SecretType, CreateSecretRequest } from '../types'

const fieldLabels: Record<string, Record<string, string>> = {
  website: {
    url: '网址',
    username: '用户名',
    password: '密码',
  },
  api_key: {
    service: '服务名称',
    key: 'API Key',
    note: '备注',
  },
  bank_card: {
    bank: '银行名称',
    card_number: '卡号',
    holder: '持卡人',
    expiry: '有效期',
    cvv: 'CVV',
  },
  secure_note: {
    content: '内容',
  },
  ssh_key: {
    title: '标题',
    private_key: '私钥',
    public_key: '公钥',
    note: '备注',
  },
  license: {
    software: '软件名称',
    license_key: '许可证密钥',
    email: '邮箱',
    note: '备注',
  },
}

const passwordFields = ['password', 'cvv', 'license_key']

export default function SecretForm() {
  const { secretTypes, editingSecret, setShowForm, createSecret, updateSecret, generatePassword } =
    useStore()

  const [secretType, setSecretType] = useState<SecretType>(
    (editingSecret?.secret_type as SecretType) || 'website'
  )
  const [title, setTitle] = useState(editingSecret?.title || '')
  const [fields, setFields] = useState<Record<string, string>>(
    editingSecret?.fields || { url: '', username: '', password: '' }
  )
  const [tags, setTags] = useState(editingSecret?.tags.join(', ') || '')
  const [generatingField, setGeneratingField] = useState<string | null>(null)

  useEffect(() => {
    if (!editingSecret) {
      const defaultFields: Record<string, string> = {}
      const fieldLabelsForType = fieldLabels[secretType] || {}
      Object.keys(fieldLabelsForType).forEach((key) => {
        defaultFields[key] = ''
      })
      setFields(defaultFields)
    }
  }, [secretType, editingSecret])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingSecret) {
      await updateSecret({
        id: editingSecret.id,
        title,
        fields,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      })
    } else {
      const req: CreateSecretRequest = {
        secret_type: secretType,
        title,
        fields,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      }
      await createSecret(req)
    }
  }

  const handleFieldChange = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  const handleGeneratePassword = async (field: string) => {
    setGeneratingField(field)
    try {
      const password = await generatePassword(16)
      handleFieldChange(field, password)
    } catch (err) {
      console.error('Failed to generate password:', err)
    }
    setGeneratingField(null)
  }

  const labels = fieldLabels[secretType] || {}

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-white">
              {editingSecret ? '编辑条目' : '新增条目'}
            </h2>
          </div>
          <button
            onClick={() => setShowForm(false)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Type Selector */}
          {!editingSecret && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                类型
              </label>
              <select
                value={secretType}
                onChange={(e) => setSecretType(e.target.value as SecretType)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              >
                {secretTypes.map((type) => (
                  <option key={type.type_name} value={type.type_name}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="输入标题..."
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
            />
          </div>

          {/* Dynamic Fields */}
          {Object.entries(labels).map(([key, label]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {label}
              </label>
              <div className="flex gap-2">
                {key === 'content' || key === 'private_key' || key === 'note' ? (
                  <textarea
                    value={fields[key] || ''}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                    rows={4}
                    className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 font-mono text-sm transition-all duration-200 resize-none"
                  />
                ) : (
                  <>
                    <input
                      type="text"
                      value={fields[key] || ''}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      placeholder={`输入${label}...`}
                      className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    />
                    {passwordFields.includes(key) && (
                      <button
                        type="button"
                        onClick={() => handleGeneratePassword(key)}
                        disabled={generatingField === key}
                        className="px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/25"
                        title="生成随机密码"
                      >
                        <RefreshCw
                          className={`w-5 h-5 ${generatingField === key ? 'animate-spin' : ''}`}
                        />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              标签 <span className="text-slate-500">(用逗号分隔)</span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="例如: 工作, 个人, 重要..."
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
            />
          </div>
        </form>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-700/50 flex gap-3">
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-blue-500/25"
          >
            {editingSecret ? '保存更改' : '创建条目'}
          </button>
        </div>
      </div>
    </div>
  )
}
