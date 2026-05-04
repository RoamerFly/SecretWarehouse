import {
  Key, Globe, CreditCard, FileText, Terminal, Award, Lock, Shield,
  Mail, Smartphone, Wifi, Server,
} from 'lucide-react'

export const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
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

export const iconColors: Record<string, string> = {
  key: 'from-yellow-400 to-amber-500',
  globe: 'from-blue-400 to-cyan-500',
  'credit-card': 'from-rose-400 to-pink-500',
  'file-text': 'from-slate-400 to-gray-500',
  terminal: 'from-green-400 to-emerald-500',
  award: 'from-purple-400 to-violet-500',
  lock: 'from-red-400 to-orange-500',
  shield: 'from-indigo-400 to-blue-500',
  mail: 'from-cyan-400 to-teal-500',
  smartphone: 'from-pink-400 to-rose-500',
  wifi: 'from-teal-400 to-green-500',
  server: 'from-slate-500 to-gray-600',
}
