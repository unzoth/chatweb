import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';       
import remarkMath from 'remark-math';     
import rehypeKatex from 'rehype-katex';    
import 'katex/dist/katex.min.css';        
import ModelSelector from './ModelSelector';

// 自定义代码块组件
const CodeBlock = ({ node, inline, className, children, ...props }) => {
  const codeRef = useRef(null);
  const codeText = children && children.join ? children.join('') : children;
  // 内联或短代码直接显示
  if (inline || (codeText && codeText.length < 40)) {
    return <code className={className} {...props}>{children}</code>;
  }
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'code';
  const copyCode = () => {
    navigator.clipboard.writeText(String(codeText).replace(/\n$/, ''));
  };
  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-language">{language}</span>
        <button className="copy-code-button" onClick={copyCode}>复制</button>
      </div>
      <pre ref={codeRef} className={className} {...props}>
        <code>{children}</code>
      </pre>
    </div>
  );
};

// 设定 Markdown 组件的映射
const markdownComponents = {
  inlineMath({ value }) {
    return <span className="katex-inline">{value}</span>;
  },
  math({ value }) {
    return <div className="katex-display">{value}</div>;
  },
  code: CodeBlock,
};

function ChatWindow({ messages, onSendMessage, onSelectModel, isSending, jumpMessageIndex, dialogId, user }) {
  // 输入和文件状态
  const [input, setInput] = useState('');
  const [imageBase64, setImageBase64] = useState(null);
  const [imagePath, setImagePath] = useState(null);
  const [modalImage, setModalImage] = useState(null);
  // 消息区域高度、滚动状态与折叠状态
  const [messagesHeight, setMessagesHeight] = useState('auto');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [collapsedMessages, setCollapsedMessages] = useState({});
  const [isStreaming, setIsStreaming] = useState(false); // 是否正在等待 AI 回复

  // ref 引用，方便获取 DOM 节点
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const inputFormRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const messageRefs = useRef([]);

  // 自动调整输入框高度
  const adjustTextAreaHeight = () => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      const newHeight = Math.min(ta.scrollHeight, ta.clientHeight * 9 || 200);
      ta.style.height = newHeight + 'px';
    }
  };

  useEffect(() => {
    adjustTextAreaHeight();
    updateMessagesHeight();
  }, [input, imageBase64]);

  // 每次消息更新后自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 根据容器及输入框高度更新消息显示区域高度
  const updateMessagesHeight = () => {
    if (chatContainerRef.current && inputFormRef.current) {
      const containerHeight = chatContainerRef.current.offsetHeight;
      const inputHeight = inputFormRef.current.offsetHeight;
      setMessagesHeight(containerHeight - inputHeight);
    }
  };

  useEffect(() => {
    window.addEventListener('resize', updateMessagesHeight);
    return () => window.removeEventListener('resize', updateMessagesHeight);
  }, []);

  // 显示或隐藏“滚动到底部”按钮
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

  // 跳转到特定消息
  useEffect(() => {
    if (jumpMessageIndex !== null && messageRefs.current[jumpMessageIndex]) {
      messageRefs.current[jumpMessageIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [jumpMessageIndex]);

  // 处理回车发送（Shift+Enter 换行）
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
      e.preventDefault();
      handleSend();
    }
  };

  // 图片选择处理：读入后转 base64 方便预览上传
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagePath(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setImageBase64(reader.result);
        updateMessagesHeight();
      };
      reader.readAsDataURL(file);
    }
  };

  // 清除已选图片
  const removeImage = () => {
    setImageBase64(null);
    setImagePath(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    updateMessagesHeight();
  };

  // 发送消息或等待 AI 回复（并清空输入）
  const handleSend = async () => {
    if (!input.trim() && !imageBase64) return;
    const payload = { text: input, image_base64: imageBase64, image_path: imagePath };
    setInput('');
    setIsStreaming(true);
    const sent = await onSendMessage(payload);
    if (sent) {
      setImageBase64(null);
      setImagePath(null);
      updateMessagesHeight();
    }
  };

  // 调用后端 /stop 接口停止流式回复
  const handleStop = () => {
    if (!dialogId || !user) return;
    fetch("http://localhost:8000/stop", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ dialog_id: dialogId, username: user })
    }).then(() => setIsStreaming(false))
      .catch(err => {
        console.error("停止请求失败", err);
      });
  };

  // 根据当前状态决定执行发送或停止操作
  const handleSendOrStop = () => {
    isStreaming ? handleStop() : handleSend();
  };

  // 图片放大预览处理
  const openModal = (src) => setModalImage(src);
  const closeModal = () => setModalImage(null);

  // 切换消息折叠状态
  const toggleMessageCollapse = (index) => {
    setCollapsedMessages(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // 复制消息内容
  const copyMessage = (text) => {
    navigator.clipboard.writeText(text);
  };

  // 根据消息类型和折叠状态渲染消息
  const renderMessage = (msg, index) => {
    const content = msg.text;
    const originalText = typeof content === 'object' && content !== null ? content.text : content;
    const displayedContent = collapsedMessages[index]
      ? "已折叠该消息"
      : (
        msg.sender === 'user' && typeof content === 'object' && content !== null && content.image_url
          ? (
            <div className="message-content">
              <div className="message-image">
                <img
                  src={content.image_url}
                  alt="uploaded"
                  style={{ maxHeight: '64px', width: 'auto', marginBottom: '5px', cursor: 'pointer' }}
                  onClick={() => openModal(content.image_url)}
                  onError={(e) => console.error('图片加载错误：', e.target.src)}
                />
              </div>
              <div className="message-text">{content.text}</div>
            </div>
          )
          : msg.sender === 'bot'
            ? (
              <div className="message-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={markdownComponents}
                >
                  {originalText}
                </ReactMarkdown>
              </div>
            )
            : (
              <div className="message-content">
                <div className="text">{originalText}</div>
              </div>
            )
      );
    return (
      <div className={`message ${msg.sender}`} style={{ position: 'relative', paddingBottom: '20px' }}>
        <div className="message-display">{displayedContent}</div>
        <div className="message-buttons">
          {msg.sender === 'user' ? (
            <>
              <button
                className="message-toggle-button toggle-user"
                title={collapsedMessages[index] ? "展开" : "折叠"}
                onClick={() => toggleMessageCollapse(index)}
              >
                {collapsedMessages[index] ? "↑" : "↓"}
              </button>
              <button
                className="message-copy-button copy-user"
                title="复制"
                onClick={() => copyMessage(originalText)}
              >
                📋
              </button>
            </>
          ) : (
            <>
              <button
                className="message-copy-button copy-bot"
                title="复制"
                onClick={() => copyMessage(originalText)}
              >
                📋
              </button>
              <button
                className="message-toggle-button toggle-bot"
                title={collapsedMessages[index] ? "展开" : "折叠"}
                onClick={() => toggleMessageCollapse(index)}
              >
                {collapsedMessages[index] ? "↑" : "↓"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="chat-window">
      <div className="chat-inner-content" ref={chatContainerRef}>
        <div className="messages-container" style={{ position: 'relative', flex: 1 }}>
          <div
            className="messages"
            style={{ height: messagesHeight ? messagesHeight + 'px' : 'auto' }}
            ref={messagesContainerRef}
            onScroll={handleMessagesScroll}
          >
            {messages.map((msg, index) => (
              <div key={index} ref={el => messageRefs.current[index] = el}>
                {renderMessage(msg, index)}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          {showScrollButton && (
            <button className="scroll-to-bottom-button" onClick={scrollToBottom}>
              ↓
            </button>
          )}
        </div>
        <form className="message-input-form" ref={inputFormRef}>
          {imageBase64 && (
            <div className="image-preview">
              <img
                src={imageBase64}
                alt="preview"
                style={{ cursor: 'pointer' }}
                onClick={() => openModal(imageBase64)}
              />
              <button type="button" className="cancel-image" onClick={removeImage}>
                ×
              </button>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              updateMessagesHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="请输入消息..."
            disabled={isSending}
            className="text-input"
          />
          <div className="bottom-controls">
            <div className="left-controls">
              <ModelSelector onSelectModel={onSelectModel} />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isSending}
                className="file-input"
              />
            </div>
            <div className="right-controls">
              <button
                type="button"
                className="send-button"
                disabled={isSending && !isStreaming}
                onClick={handleSendOrStop}
              >
                {isStreaming ? "停止" : "发送"}
              </button>
            </div>
          </div>
        </form>
      </div>
      {modalImage && (
        <div className="image-modal" onClick={closeModal}>
          <img src={modalImage} alt="Full view" />
        </div>
      )}
    </div>
  );
}

export default ChatWindow;
