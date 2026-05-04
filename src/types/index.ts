export interface SecretEntry {
  id: string
  title: string
  fields: Record<string, string>  // 自由键值对
  tags: string[]
  icon: string  // 图标名称
  created_at: number
  updated_at: number
  favorite: boolean
}

export interface CreateSecretRequest {
  title: string
  fields: Record<string, string>
  tags?: string[]
  icon?: string
}

export interface UpdateSecretRequest {
  id: string
  title?: string
  fields?: Record<string, string>
  tags?: string[]
  icon?: string
  favorite?: boolean
}

export interface ListSecretsRequest {
  tag?: string
  favorite?: boolean
  limit?: number
  offset?: number
}

// 可选的图标列表
export const ICON_OPTIONS = [
  { name: 'key', label: '密钥' },
  { name: 'globe', label: '网站' },
  { name: 'credit-card', label: '银行卡' },
  { name: 'file-text', label: '笔记' },
  { name: 'terminal', label: '终端' },
  { name: 'award', label: '许可' },
  { name: 'lock', label: '锁' },
  { name: 'shield', label: '盾牌' },
  { name: 'mail', label: '邮件' },
  { name: 'smartphone', label: '手机' },
  { name: 'wifi', label: 'WiFi' },
  { name: 'server', label: '服务器' },
]
