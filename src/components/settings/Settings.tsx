import { useApp } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'

export default function Settings() {
  const { isDark, toggleDark } = useApp()
  const { user } = useAuth()

  return (
    <div className="max-w-xl mx-auto px-6 py-8 overflow-y-auto h-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Configuracoes</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Preferencias da sua conta</p>
      </div>

      <div className="space-y-5">
        {/* Account */}
        {user && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="font-bold text-gray-800 dark:text-white text-sm mb-4">Conta</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Nome</span>
                <span className="text-gray-900 dark:text-white font-medium">{user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="text-gray-900 dark:text-white font-medium">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Plano</span>
                <span className="text-violet-600 dark:text-violet-400 font-medium">{user.plan_label}</span>
              </div>
              {user.trial_active && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Trial</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">{user.trial_days_left} dias restantes</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Theme */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-bold text-gray-800 dark:text-white text-sm mb-4">Aparencia</h2>
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
          <h3 className="font-bold text-violet-800 dark:text-violet-300 text-sm mb-2">Sobre AUTOR.IA</h3>
          <p className="text-xs text-violet-600 dark:text-violet-400 leading-relaxed">
            Fabrica de conteudo visual com essencia. IA integrada no servidor — voce nao precisa configurar nada. Seus dados sao salvos com seguranca.
          </p>
          <p className="text-xs text-violet-500 dark:text-violet-500 mt-2">v3.0</p>
        </div>
      </div>
    </div>
  )
}
