import React, { useState } from 'react';

const ConversationList = ({
  conversations,
  onSelectConversation,
  onDeleteConversation,
  onEditTitle, // 编辑标题回调，参数：index, newTitle
  selectedConversationIndex,
}) => {
  // 当前正在编辑的对话索引和对应内容
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedTitle, setEditedTitle] = useState("");

  // 启动编辑状态
  const startEditing = (index, currentTitle) => {
    setEditingIndex(index);
    setEditedTitle(currentTitle);
  };

  // 提交编辑，检查标题长度不超过15个字
  const submitEdit = (index) => {
    if (editedTitle.length > 15) {
      alert("标题最长15个字");
      return;
    }
    onEditTitle(index, editedTitle);
    setEditingIndex(null);
    setEditedTitle("");
  };

  // 回车键提交编辑
  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      submitEdit(index);
    }
  };

  return (
    <div className="conversation-list">
      <ul>
        {conversations.map((conversation, index) => (
          <li
            key={index}
            onClick={() => onSelectConversation(index)}
            className={`conversation-item ${index === selectedConversationIndex ? 'selected' : ''}`}
          >
            {editingIndex === index ? (
              <input
                className="conversation-title-edit"
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={() => submitEdit(index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                autoFocus
              />
            ) : (
              <span className="conversation-title">{conversation.title}</span>
            )}
            {/* 编辑按钮 */}
            <span 
              className="edit-button"
              onClick={(e) => {
                e.stopPropagation();
                startEditing(index, conversation.title);
              }}
            >
              ✎
            </span>
            {/* 删除按钮 */}
            <span 
              className="delete-button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteConversation(index);
              }}
            >
              🗑️
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ConversationList;
