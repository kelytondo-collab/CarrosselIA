import { useState } from 'react'
import { Eye, EyeOff, Save, ExternalLink, Key } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import toast from 'react-hot-toast'

export default function Settings() {
  const { apiKey, setApiKey, isDark, toggleDark } = useApp()
  const [key, setKey] = useState(apiKey)
  const [show, setShow] = useState(false)

  const handleSave = () => {
    setApiKey(key.trim())
    toast.success('Configurações salvas!')
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-8 overflow-y-auto h-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Configurações</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie sua chave API e preferências</p>
      </div>

      <div className="space-y-5">
        {/* API Key */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Key size={16} className="text-violet-500" />
            <h2 className="font-bold text-gray-800 dark:text-white text-sm">Chave API Gemini</h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Obtenha sua chave gratuita em{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-1">
              aistudio.google.com <ExternalLink size={10} />
            </a>
          </p>
          <div className="relative mb-3">
            <input
              type={show ? 'text' : 'password'}
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-400 font-mono"
            />
            <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {apiKey && (
            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Chave configurada
            </div>
          )}
          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-all">
            <Save size={14} /> Salvar chave
          </button>
        </div>

        {/* Theme */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-bold text-gray-800 dark:text-white text-sm mb-4">Aparência</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Modo escuro</span>
            <button
              onClick={toggleDark}
              className={`relative w-12 h-6 rounded-full transition-all ${isDark ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isDark ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="bg-violet-50 dark:bg-violet-900/20 rounded-2xl border border-violet-200 dark:border-violet-800 p-5">
          <h3 className="font-bold text-violet-800 dark:text-violet-300 text-sm mb-2">Sobre o Carrossel IA</h3>
          <p className="text-xs text-violet-600 dark:text-violet-400 leading-relaxed">
            App gratuito para geração de carrosseis com IA. Todos os dados ficam no seu dispositivo (localStorage). Nenhuma informação é enviada para servidores externos além da API do Google Gemini.
          </p>
          <p className="text-xs text-violet-500 dark:text-violet-500 mt-2">v1.0.0</p>
        </div>
      </div>
    </div>
  )
}
