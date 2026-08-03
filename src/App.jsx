import { AppProvider, useApp } from './context/AppContext.jsx'
import Sidebar from './components/Layout/Sidebar.jsx'
import Header from './components/Layout/Header.jsx'
import ChatView from './views/ChatView.jsx'
import PlaygroundView from './views/PlaygroundView.jsx'
import RawRequestView from './views/RawRequestView.jsx'

function AppContent() {
  const { state } = useApp()
  const { activeView } = state

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <Header />
        <div className="app-content">
          {activeView === 'chat'       && <ChatView />}
          {activeView === 'playground' && <PlaygroundView />}
          {activeView === 'raw'        && <RawRequestView />}
        </div>
      </div>

      <style>{`
        .app-layout {
          display: flex;
          height: 100%;
          width: 100%;
          overflow: hidden;
        }

        .app-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
        }

        .app-content {
          flex: 1;
          display: flex;
          overflow: hidden;
          min-width: 0;
          position: relative;
        }
      `}</style>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
