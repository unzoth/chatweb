import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {Copy,ChevronDown, ChevronRight,ChevronUp} from 'lucide-react'
import 'katex/dist/katex.min.css';
import './MessageList.css'

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

  const [showReasoning, setShowReasoning] = useState(() => {
    // 为所有消息创建默认为 true 的显示状态
    const defaultState = {};
    messages.forEach((_, index) => {
      defaultState[index] = true;
    });
    return defaultState;
  });

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

  // 切换推理内容显示状态
  const toggleReasoning = (index) => {
    setShowReasoning(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // 复制消息内容
  const copyMessage = (text) => {
    navigator.clipboard.writeText(text);
  };

  // 渲染推理内容部分
  const renderReasoningContent = (reasoning, index) => {
    if (!reasoning || reasoning.trim() === "") return null;
    
    return (
      <div className={`reasoning-content ${showReasoning[index] ? 'visible' : 'hidden'}`}>
        <div className="reasoning-header" onClick={() => toggleReasoning(index)}>
          <span>
            推理过程{" "}
            {showReasoning[index] ? (
              <ChevronDown size={10} strokeWidth={1.5} />
            ) : (
              <ChevronRight size={10} strokeWidth={1.5} />
            )}
          </span>
        </div>
        {showReasoning[index] && (
          <div className="reasoning-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={markdownComponents}
            >
              {reasoning}
            </ReactMarkdown>
            <button
              className="copy-reasoning-button"
              title="复制推理内容"
              onClick={(e) => {
                e.stopPropagation();
                copyMessage(reasoning);
              }}
            >
              <Copy size={10} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
    );
  };

  // 根据消息类型和折叠状态渲染消息
  const renderMessage = (msg, index) => {
    const content = msg.text;
    const originalText = typeof content === 'object' && content !== null ? content.text : content;
    const hasReasoning = msg.reasoning_content && msg.reasoning_content.trim().length > 0;
    
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
                {/* 将流式推理内容放在回答内容上方 */}
                {hasReasoning && renderReasoningContent(msg.reasoning_content, index)}
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
        <div
          className={`message ${msg.sender} ${hasReasoning ? 'has-reasoning' : ''}`}
          style={{ position: 'relative', paddingBottom: '20px' }}
        >
          <div className="message-display">{displayedContent}</div>
          <div className="message-buttons">
            {msg.sender === 'user' ? (
              <>
                <button
                  className="message-toggle-button toggle-user"
                  title={collapsedMessages[index] ? '展开' : '折叠'}
                  onClick={() => toggleMessageCollapse(index)}
                >
                  {collapsedMessages[index] ? (
                    <ChevronUp size={10} strokeWidth={1.5} />
                  ) : (
                    <ChevronDown size={10} strokeWidth={1.5} />
                  )}
                </button>
                <button
                  className="message-copy-button copy-user"
                  title="复制"
                  onClick={() => copyMessage(originalText)}
                >
                  <Copy size={10} strokeWidth={1.5} />
                </button>
              </>
            ) : (
              <>
                <button
                  className="message-copy-button copy-bot"
                  title="复制"
                  onClick={() => copyMessage(originalText)}
                >
                  <Copy size={10} strokeWidth={1.5} />
                </button>
                <button
                  className="message-toggle-button toggle-bot"
                  title={collapsedMessages[index] ? '展开' : '折叠'}
                  onClick={() => toggleMessageCollapse(index)}
                >
                  {collapsedMessages[index] ? (
                    <ChevronUp size={10} strokeWidth={1.5} />
                  ) : (
                    <ChevronDown size={10} strokeWidth={1.5} />
                  )}
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
