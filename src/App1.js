import React, { useState, useEffect } from 'react';
import './App.css';
import ChatWindow from './components/chatwindow/ChatWindow';
import LoginModal from './components/sidebar/LoginModal';
import SearchOverlay from './components/searchoverlay/SearchOverlay';
import Sidebar from './components/sidebar/Sidebar';

function App() {
  // 初始"新对话"模板
  const initialMainConversation = {
    dialog_id: null,
    title: '新对话',
    messages: [{
      sender: 'bot',
      text: { image_url: null, text: '您好，我是智能ai助手。请问有什么可以帮您的吗？' }
    }],
    isMainPage: true,
  };

  // 状态定义
  const [conversations, setConversations] = useState([initialMainConversation]);
  const [selectedConversationIndex, setSelectedConversationIndex] = useState(0);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('model1');
  const [user, setUser] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // 搜索相关状态
  const [showSearchWindow, setShowSearchWindow] = useState(false);
  const [jumpMessageIndex, setJumpMessageIndex] = useState(null);

  // 当前对话
  const currentConversation = conversations[selectedConversationIndex] || { messages: [] };

  // 侧边栏对话列表（已保存对话）
  const sidebarConversations = conversations.filter(conv => conv.dialog_id !== null);

  // 当前选中的侧边栏项（排除主对话）
  const selectedSidebarIndex = currentConversation?.isMainPage
    ? -1
    : sidebarConversations.findIndex(conv => conv.dialog_id === currentConversation?.dialog_id);

  // 辅助函数 - 更新对话数组中特定索引位置的对话
  const updateConversationAtIndex = (index, updater) => {
    setConversations(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updater };
      return updated;
    });
  };

  // 更新对话标题
  const updateConversationTitle = (index, text) => {
    const newTitle = text.length > 10 ? text.slice(0, 10) + '...' : text;
    updateConversationAtIndex(index, { title: newTitle });
  };

  // 更新对话的 dialog_id
  const updateDialogId = (index, dialog_id) => {
    updateConversationAtIndex(index, { dialog_id });
  };

  // 从侧边栏选中对话
  const handleSelectConversationFromSidebar = (sidebarIndex) => {
    const conv = sidebarConversations[sidebarIndex];
    const globalIndex = conversations.findIndex(c => c.dialog_id === conv.dialog_id);
    setSelectedConversationIndex(globalIndex);
  };

  // 新增对话
  const handleAddConversation = () => {
    if (currentConversation?.isMainPage) {
      alert("主界面无法新增对话，请先发送消息以进入正常对话模式！");
      return;
    }
    
    setConversations(prev => [...prev, initialMainConversation]);
    setSelectedConversationIndex(conversations.length); // 指向新添加的对话
  };

  // 将对话移至列表最顶部
  const moveConversationToTop = (globalIndex) => {
    setConversations(prev => {
      const arr = [...prev];
      const [conv] = arr.splice(globalIndex, 1);
      return [conv, ...arr];
    });
    setSelectedConversationIndex(0);
  };

  // 发送消息
  const handleSendMessage = async (payload) => {
    // 用户未登录时打开登录模态框
    if (!user) {
      setIsLoginModalOpen(true);
      return false;
    }
    
    // 防止重复发送
    if (isSending) {
      console.warn("正在发送中，请等待回复...");
      return false;
    }
    
    const wasMain = currentConversation.isMainPage;
    
    // 若当前为主对话，则发送消息后转为非主模式
    if (wasMain) {
      updateConversationAtIndex(selectedConversationIndex, { isMainPage: false });
    }
    
    setIsSending(true);
  
    // 处理对话标题
    let convTitle = currentConversation.title;
    if (convTitle === "新对话") {
      convTitle = payload.text.length > 10 ? payload.text.slice(0, 10) + "..." : payload.text;
      updateConversationTitle(selectedConversationIndex, convTitle);
    }
  
    // 处理对话ID
    let dialogId = currentConversation.dialog_id;
    
    // 新建对话保存记录
    if (!dialogId) {
      try {
        const result = await createNewDialog(user, convTitle);
        dialogId = result.dialog_id;
        updateDialogId(selectedConversationIndex, dialogId);
      } catch (err) {
        console.error(err);
        alert('创建新对话失败');
        setIsSending(false);
        return false;
      }
    }
  
    // 添加用户消息
    addMessageToCurrentConversation({
      sender: 'user', 
      text: { image_url: payload.image_base64 || null, text: payload.text }
    });
  
    // 准备请求参数
    const serverPayload = {
      username: user,
      dialog_id: dialogId,
      conversation_title: convTitle,
      question: payload.text,
      model: selectedModel,
      image_base64: payload.image_base64,
      image_path: payload.image_path,
    };
  
    try {
      // 发送请求并处理流式响应
      return await handleStreamingResponse(serverPayload);
    } catch (err) {
      console.error(err);
      alert(`请求失败: ${err.message || '未知错误'}`);
      return false;
    } finally {
      setIsSending(false);
      moveConversationToTop(selectedConversationIndex);
      
      // 如果是主对话则在末尾追加一个新的主对话
      if (wasMain) {
        setConversations(prev => [...prev, initialMainConversation]);
      }
    }
  };
  
  // 创建新对话
  const createNewDialog = async (username, title) => {
    const payload = { username, conversation_title: title };
    const res = await fetch('http://localhost:8000/new_dialog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) throw new Error('创建对话失败');
    return await res.json();
  };
  
  // 向当前对话添加消息
  const addMessageToCurrentConversation = (message) => {
    setConversations(prev => {
      const updated = [...prev];
      updated[selectedConversationIndex] = {
        ...updated[selectedConversationIndex],
        messages: [...updated[selectedConversationIndex].messages, message]
      };
      return updated;
    });
  };
  
  // 处理流式响应
  const handleStreamingResponse = async (serverPayload) => {
    const res = await fetch('http://localhost:8000/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serverPayload),
    });
    
    if (!res.ok) throw new Error("请求失败：" + res.statusText);
    if (!res.body) throw new Error("响应流为空");
    
    // 插入一个空白 AI 回复占位
    addMessageToCurrentConversation({
      sender: 'bot',
      text: { image_url: null, text: "" }
    });
    
    // 读取流式响应
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let done = false, botReply = "";
    
    // 读取流式响应并更新最新 AI 消息
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunk = decoder.decode(value, { stream: !done });
      botReply += chunk;
      
      // 更新最新消息内容
      setConversations(prev => {
        const arr = [...prev];
        const messages = arr[selectedConversationIndex].messages;
        const lastMsg = messages[messages.length - 1];
        lastMsg.text.text = botReply;
        return arr;
      });
    }
    
    if (!botReply.trim()) throw new Error("未收到有效的回答");
    return true;
  };
  
  // 模型切换、登录相关处理
  const handleSelectModel = (model) => setSelectedModel(model);
  const handleLoginClick = () => setIsLoginModalOpen(true);
  const handleCloseLoginModal = () => setIsLoginModalOpen(false);

  // 删除对话
  const handleDeleteConversation = (globalIndex) => {
    let updated = conversations.filter((_, i) => i !== globalIndex);
    
    // 如果删除后没有对话了，添加一个初始对话
    if (updated.length === 0) {
      updated = [initialMainConversation];
      setSelectedConversationIndex(0);
    } 
    // 如果删除的是当前选中的对话，重新选择第一个对话
    else if (selectedConversationIndex === globalIndex) {
      setSelectedConversationIndex(0);
    } 
    // 如果删除的对话在当前选中的对话之前，需要更新选中索引
    else if (globalIndex < selectedConversationIndex) {
      setSelectedConversationIndex(selectedConversationIndex - 1);
    }
    
    setConversations(updated);
  };

  // 从侧边栏删除对话
  const handleDeleteConversationFromSidebar = (sidebarIndex) => {
    const conv = sidebarConversations[sidebarIndex];
    const globalIndex = conversations.findIndex(c => c.dialog_id === conv.dialog_id);
    handleDeleteConversation(globalIndex);
  };

  // 切换侧边栏显示状态
  const handleToggleSidebar = () => setIsSidebarOpen(prev => !prev);

  // 重置对话状态（用于退出登录时）
  const handleResetConversations = () => {
    setConversations([initialMainConversation]);
    setSelectedConversationIndex(0);
  };

  // 处理搜索结果项点击
  const handleSearchResultClick = (result) => {
    setSelectedConversationIndex(result.conversationIndex);
    setJumpMessageIndex(result.type === 'message' ? result.messageIndex : null);
  };

  // 加载历史对话
  useEffect(() => {
    if (!user) return;
    
    const fetchDialogs = async () => {
      try {
        const res = await fetch(`http://localhost:8000/dialogs?username=${user}`);
        if (!res.ok) throw new Error("加载对话列表失败");
        
        const data = await res.json();
        const historicalConvs = data.conversations.map(mapServerDialogToLocalFormat);
        
        setConversations(prev => {
          const main = prev.find(c => c.isMainPage === true) || initialMainConversation;
          return [main, ...historicalConvs];
        });
        
        setSelectedConversationIndex(0);
      } catch (err) {
        console.error("获取对话列表错误：", err);
      }
    };
    
    fetchDialogs();
  }, [user]);
  
  // 服务器对话数据映射到本地格式
  const mapServerDialogToLocalFormat = (item) => ({
    dialog_id: item.dialog_id,
    title: item.title,
    messages: item.chat_records.map(record => ({
      sender: record.role === 1 ? 'user' : 'bot',
      text: {
        image_url: record.media_url
          ? (record.media_url.startsWith('data:') 
             ? record.media_url 
             : `http://localhost:8000/uploads/${record.media_url}`)
          : null,
        text: record.content,
      },
      created_at: record.created_at,
    })),
    isMainPage: false,
  });
  
  // 编辑对话标题处理
  const handleEditTitle = (sidebarIndex, newTitle) => {
    const conv = sidebarConversations[sidebarIndex];
    const globalIndex = conversations.findIndex(c => c.dialog_id === conv.dialog_id);
    const dialog = conversations[globalIndex];
    
    // 检查是否是新对话
    if (dialog.dialog_id === null) {
      alert("新对话的标题不能编辑，请先发送消息以保存对话。");
      return;
    }
    
    updateConversationTitle(globalIndex, newTitle);
    return dialog;
  };

  return (
    <div className="app">
      {/* ========== 左侧栏 ========== */}
      <div className="left-column">
        <div className="fixed-buttons">
          <button
            className="toggle-sidebar"
            onClick={handleToggleSidebar}
            title="展开/关闭侧边栏"
          >
            ☰
          </button>
          <button
            className="add-conversation"
            onClick={handleAddConversation}
            title="新增对话"
          >
            ＋
          </button>
          <button
            className="search-button"
            onClick={() => setShowSearchWindow(true)}
            title="搜索"
          >
            🔍
          </button>
        </div>
        
        {/* 侧边栏组件 */}
        <Sidebar
          isOpen={isSidebarOpen}
          conversations={sidebarConversations}
          onSelectConversation={handleSelectConversationFromSidebar}
          onDeleteConversation={handleDeleteConversationFromSidebar}
          onEditTitle={handleEditTitle}
          selectedConversationIndex={selectedSidebarIndex}
          user={user}
          onLoginClick={handleLoginClick}
          onLogout={() => setUser(null)}
          onResetConversations={handleResetConversations}
        />
      </div>

      {/* ========== 中间聊天区域 ========== */}
      <div className="center-column">
        <ChatWindow
          messages={currentConversation.messages}
          onSendMessage={handleSendMessage}
          onSelectModel={handleSelectModel}
          isSending={isSending}
          jumpMessageIndex={jumpMessageIndex}
          dialogId={currentConversation.dialog_id}
          user={user}
        />
      </div>
      
      {/* ========== 右侧空白区域 ========== */}
      <div className="right-column"></div>
      
      {/* ========== 模态框组件 ========== */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={handleCloseLoginModal}
        onLoginSuccess={(account) => setUser(account)}
      />

      <SearchOverlay 
        isOpen={showSearchWindow}
        onClose={() => setShowSearchWindow(false)}
        conversations={conversations}
        onResultClick={handleSearchResultClick}
      />
    </div>
  );
}

export default App;