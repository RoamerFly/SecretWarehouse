import { useState } from 'react'
import { useStore } from '../stores/useStore'
import { X, Plus, Trash2, RefreshCw, Sparkles, Eye, EyeOff } from 'lucide-react'
import { ICON_OPTIONS } from '../types'

// 敏感字段关键词 - 这些字段默认隐藏
const SENSITIVE_KEYWORDS = ['password', '密码', 'secret', '密钥', 'key', 'token', 'cvv', 'pin']

export default function SecretForm() {
  const { editingSecret, setShowForm, createSecret, updateSecret, generatePassword } = useStore()

  const [title, setTitle] = useState(editingSecret?.title || '')
  const [fields, setFields] = useState<Array<{ key: string; value: string; visible: boolean }>>(
    editingSecret
      ? Object.entries(editingSecret.fields).map(([key, value]) => ({
          key,
          value,
          visible: !SENSITIVE_KEYWORDS.some(kw => key.toLowerCase().includes(kw))
        }))
      : [{ key: '名称', value: '', visible: true }]
  )
  const [tags, setTags] = useState(editingSecret?.tags.join(', ') || '')
  const [icon, setIcon] = useState(editingSecret?.icon || 'key')
  const [generatingField, setGeneratingField] = useState<number | null>(null)

  const handleSubmit = async () => {
    if (!title.trim()) return

    // 构建 fields 对象
    const fieldsObj: Record<string, string> = {}
    fields.forEach(f => {
      if (f.key.trim()) {
        fieldsObj[f.key.trim()] = f.value
      }
    })

    const tagsArray = tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)

    if (editingSecret) {
      await updateSecret({
        id: editingSecret.id,
        title,
        fields: fieldsObj,
        tags: tagsArray,
        icon,
      })
    } else {
      await createSecret({
        title,
        fields: fieldsObj,
        tags: tagsArray,
        icon,
      })
    }
  }

  const addField = () => {
    setFields([...fields, { key: '', value: '', visible: true }])
  }

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const updateField = (index: number, key: string, value: string) => {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], key, value }
    setFields(newFields)
  }

  const toggleFieldVisibility = (index: number) => {
    const newFields = [...fields]
    newFields[index].visible = !newFields[index].visible
    setFields(newFields)
  }

  const handleGeneratePassword = async (index: number) => {
    setGeneratingField(index)
    try {
      const password = await generatePassword(16)
      const newFields = [...fields]
      newFields[index].value = password
      setFields(newFields)
    } catch (err) {
      console.error('Failed to generate password:', err)
    }
    setGeneratingField(null)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-white">
              {editingSecret ? '编辑条目' : '新建条目'}
            </h2>
          </div>
          <button
            onClick={() => setShowForm(false)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              标题 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给这个秘密起个名字..."
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
            />
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              图标
            </label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map(opt => (
                <button
                  key={opt.name}
                  type="button"
                  onClick={() => setIcon(opt.name)}
                  className={`px-3 py-2 rounded-lg text-sm transition-all ${
                    icon === opt.name
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">
                字段
              </label>
              <button
                type="button"
                onClick={addField}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                添加字段
              </button>
            </div>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={index} className="flex gap-2 items-start">
                  {/* Field Name */}
                  <input
                    type="text"
                    value={field.key}
                    onChange={(e) => updateField(index, e.target.value, field.value)}
                    placeholder="字段名"
                    className="w-28 px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                  />

                  {/* Field Value */}
                  <div className="flex-1 flex gap-2">
                    <input
                      type={field.visible ? 'text' : 'password'}
                      value={field.value}
                      onChange={(e) => updateField(index, field.key, e.target.value)}
                      placeholder="输入值..."
                      className="flex-1 px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                    />

                    {/* Toggle Visibility */}
                    <button
                      type="button"
                      onClick={() => toggleFieldVisibility(index)}
                      className="p-2.5 text-slate-400 hover:text-white bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-all"
                    >
                      {field.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    {/* Generate Password */}
                    <button
                      type="button"
                      onClick={() => handleGeneratePassword(index)}
                      disabled={generatingField === index}
                      className="p-2.5 text-purple-400 hover:text-purple-300 bg-purple-600/20 rounded-xl hover:bg-purple-600/30 transition-all"
                      title="生成随机密码"
                    >
                      <RefreshCw className={`w-4 h-4 ${generatingField === index ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Remove Field */}
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeField(index)}
                        className="p-2.5 text-red-400 hover:text-red-300 bg-red-600/20 rounded-xl hover:bg-red-600/30 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              提示：包含 "密码"、"密钥"、"token" 等关键词的字段将默认隐藏
            </p>
          </div>

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
        </div>

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
            disabled={!title.trim()}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-blue-500/25"
          >
            {editingSecret ? '保存更改' : '创建条目'}
          </button>
        </div>
      </div>
    </div>
  )
}
