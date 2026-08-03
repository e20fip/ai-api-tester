import AgentConfigPanel from '../components/Config/AgentConfigPanel.jsx'
import ChatWindow from '../components/Chat/ChatWindow.jsx'
import MessageInput from '../components/Chat/MessageInput.jsx'
import PayloadInspector from '../components/Inspector/PayloadInspector.jsx'

export default function ChatView() {
  return (
    <>
      <div className="chat-view">
        <AgentConfigPanel />
        <div className="chat-main">
          <ChatWindow />
          <MessageInput />
        </div>
      </div>
      <PayloadInspector />

      <style>{`
        .chat-view {
          display: flex;
          flex: 1;
          overflow: hidden;
          height: 100%;
        }

        .chat-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
        }
      `}</style>
    </>
  )
}
