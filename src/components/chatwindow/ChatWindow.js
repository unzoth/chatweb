import React, { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import MessageControl from './MessageControl';
import './ChatWindow.css'

function ChatWindow({ messages, onSendMessage, onSelectModel, isSending, jumpMessageIndex, dialogId, user }) {
  // 消息区域高度、滚动状态与图片预览状态
  const [messagesHeight, setMessagesHeight] = useState('auto');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  
  // ref 引用，方便获取 DOM 节点
  const chatContainerRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // 每次消息更新后自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 根据容器及输入框高度更新消息显示区域高度
  const updateMessagesHeight = () => {
    setTimeout(() => {
      if (chatContainerRef.current) {
        const containerHeight = chatContainerRef.current.offsetHeight;
        const controlEl = document.querySelector('.message-input-form');
        if (controlEl) {
          const inputHeight = controlEl.offsetHeight;
          setMessagesHeight(containerHeight - inputHeight);
        }
      }
    }, 0);
  };

  useEffect(() => {
    window.addEventListener('resize', updateMessagesHeight);
    return () => window.removeEventListener('resize', updateMessagesHeight);
  }, []);

  // 显示或隐藏"滚动到底部"按钮
  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (container) {
      const threshold = 20;
      if (container.scrollTop + container.clientHeight < container.scrollHeight - threshold) {
        setShowScrollButton(true);
      } else {
        setShowScrollButton(false);
      }
    }
  };

  // 滚动到底部
  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
      setShowScrollButton(false);
    }
  };

  // 图片放大预览处理
  const openModal = (src) => setModalImage(src);
  const closeModal = () => setModalImage(null);

  return (
    <div className="chat-window">
      <div className="chat-inner-content" ref={chatContainerRef}>
        <MessageList
          messages={messages}
          jumpMessageIndex={jumpMessageIndex}
          messagesHeight={messagesHeight}
          openModal={openModal}
          showScrollButton={showScrollButton}
          scrollToBottom={scrollToBottom}
          handleMessagesScroll={handleMessagesScroll}
          messagesContainerRef={messagesContainerRef}
        />
        <MessageControl
          onSendMessage={onSendMessage}
          onSelectModel={onSelectModel}
          isSending={isSending}
          dialogId={dialogId}
          user={user}
          updateMessagesHeight={updateMessagesHeight}
          openModal={openModal}
        />
        {modalImage && (
          <div className="image-modal" onClick={closeModal}>
            <img src={modalImage} alt="Full view" />
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatWindow;