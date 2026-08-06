import Header from './components/Header'
import Dashboard from './components/Dashboard'
import Footer from './components/Footer'
import Toast from './components/Toast'
import { useToast } from './hooks/useToast'

function App() {
  const { message, showToast } = useToast()

  return (
    <div className="flex min-h-svh flex-col bg-slate-950">
      <Header />
      <Dashboard onNotify={showToast} />
      <Footer />
      <Toast message={message} />
    </div>
  )
}

export default App
