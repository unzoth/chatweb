import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

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

function MessageList({ 
  messages, 
  jumpMessageIndex, 
  messagesHeight, 
  openModal, 
  showScrollButton,
  scrollToBottom,
  handleMessagesScroll,
  messagesContainerRef 
}) {
  const [collapsedMessages, setCollapsedMessages] = useState({});
  const messagesEndRef = useRef(null);
  const messageRefs = useRef([]);

  // 跳转到特定消息
  useEffect(() => {
    if (jumpMessageIndex !== null && messageRefs.current[jumpMessageIndex]) {
      messageRefs.current[jumpMessageIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [jumpMessageIndex]);

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
  );
}

export default MessageList;