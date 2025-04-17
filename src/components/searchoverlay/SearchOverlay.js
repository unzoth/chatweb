import React, { useState, useEffect } from 'react';

const SearchOverlay = ({ 
  isOpen, 
  onClose, 
  conversations, 
  onResultClick 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Reset search when the overlay is opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen]);

  // 对搜索结果的文本做压缩处理，保留匹配关键字所在部分
  const compressResult = (text, query, maxLength = 25) => {
    if (!text || text.length <= maxLength) return text;
    const lowerText = text.toLowerCase(), lowerQuery = query.toLowerCase();
    const idx = lowerText.indexOf(lowerQuery);
    if (idx === -1) {
      return text.substring(0, maxLength - 3) + '...';
    }
    const queryLength = query.length;
    if (queryLength >= maxLength) return text.substring(idx, idx + maxLength);
    const remain = maxLength - queryLength;
    const leftLen = Math.floor(remain / 2), rightLen = remain - leftLen;
    let start = Math.max(idx - leftLen, 0);
    let end = Math.min(idx + queryLength + rightLen, text.length);
    let result = text.substring(start, end);
    if (start > 0) result = '...' + result;
    if (end < text.length) result = result + '...';
    return result;
  };

  // 执行搜索逻辑，按对话标题和消息内容匹配
  const handleSearch = (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const titleResults = [];
    const messageResults = [];
    conversations.forEach((conv, convIndex) => {
      if (conv.title.toLowerCase().includes(lowerQuery)) {
        titleResults.push({
          type: 'title',
          conversationIndex: convIndex,
          title: conv.title,
        });
      }
      conv.messages.forEach((msg, msgIndex) => {
        const msgText = (typeof msg.text === 'object' && msg.text !== null)
          ? msg.text.text : msg.text;
        if (msgText && msgText.toLowerCase().includes(lowerQuery)) {
          messageResults.push({
            type: 'message',
            conversationIndex: convIndex,
            messageIndex: msgIndex,
            snippet: msgText,
          });
        }
      });
    });
    titleResults.sort((a, b) => a.conversationIndex - b.conversationIndex);
    messageResults.sort((a, b) => {
      return a.conversationIndex !== b.conversationIndex
        ? a.conversationIndex - b.conversationIndex
        : b.messageIndex - a.messageIndex;
    });
    setSearchResults([...titleResults, ...messageResults]);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="search-overlay" 
      onClick={onClose}
    >
      <div 
        className="search-window" 
        onClick={e => e.stopPropagation()}
      >
        <div className="search-header">
          <span>搜索</span>
          <button 
            className="search-cancel" 
            onClick={onClose}
          >
            取消
          </button>
        </div>
        <div className="search-body">
          <input 
            type="text" 
            className="search-input" 
            placeholder="请输入搜索内容" 
            value={searchQuery}
            onChange={(e) => {
              const query = e.target.value;
              setSearchQuery(query);
              handleSearch(query);
            }}
            autoFocus
          />
          <div className="search-results">
            {searchResults.map((result, idx) => (
              <div 
                key={idx} 
                className="search-result-item" 
                onClick={() => {
                  onResultClick(result);
                  onClose();
                }}
              >
                {result.type === 'title'
                  ? <span>【标题匹配】 {compressResult(result.title, searchQuery)}</span>
                  : <span>【聊天记录】 {compressResult(result.snippet, searchQuery)}</span>
                }
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;