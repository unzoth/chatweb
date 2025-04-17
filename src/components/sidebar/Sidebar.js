import React from 'react';
import ConversationList from './ConversationList';

/**
 * 侧边栏组件
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - 侧边栏是否打开
 * @param {Array} props.conversations - 对话列表数据
 * @param {Function} props.onSelectConversation - 选择对话的回调函数
 * @param {Function} props.onDeleteConversation - 删除对话的回调函数
 * @param {Function} props.onEditTitle - 编辑对话标题的回调函数
 * @param {number} props.selectedConversationIndex - 当前选中的对话索引
 * @param {string|null} props.user - 当前登录的用户名，未登录时为null
 * @param {Function} props.onLoginClick - 登录按钮点击回调
 * @param {Function} props.onLogout - 退出登录回调
 * @param {Function} props.onResetConversations - 重置对话状态的回调
 */
const Sidebar = ({
  isOpen,
  conversations,
  onSelectConversation,
  onDeleteConversation,
  onEditTitle,
  selectedConversationIndex,
  user,
  onLoginClick,
  onLogout,
  onResetConversations
}) => {
  // 退出登录的处理函数
  const handleLogout = () => {
    onLogout();
    onResetConversations();
  };
  
  // 处理编辑对话标题
  const handleEditConversationTitle = async (filteredIndex, newTitle) => {
    if (newTitle.length > 15) {
      alert("标题长度不能超过15个字");
      return;
    }
    
    const dialog = onEditTitle(filteredIndex, newTitle);
    
    if (!dialog || !dialog.dialog_id) return;
    
    try {
      const res = await fetch(`http://localhost:8000/dialog/${dialog.dialog_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, title: newTitle }),
      });
      if (!res.ok) throw new Error("更新对话标题失败");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };
  
  // 处理删除对话
  const handleDeleteConversation = async (filteredIndex) => {
    if (!window.confirm('确定要删除此对话吗？')) return;
    
    const conv = conversations[filteredIndex];
    
    if (conv.dialog_id) {
      try {
        const deleteUrl = `http://localhost:8000/dialog/${conv.dialog_id}?username=${user}`;
        const res = await fetch(deleteUrl, { method: 'DELETE' });
        if (!res.ok) {
          const errRes = await res.json();
          throw new Error(errRes.detail || '删除失败');
        }
      } catch (err) {
        console.error(err);
        alert("删除对话失败：" + err.message);
        return;
      }
    }
    
    // 调用父组件的删除处理
    onDeleteConversation(filteredIndex);
  };

  return (
    <div className={`sidebar ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-content">
        <ConversationList
          conversations={conversations}
          onSelectConversation={onSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          onEditTitle={handleEditConversationTitle}
          selectedConversationIndex={selectedConversationIndex}
        />
      </div>
      <div className="sidebar-footer">
        <hr className="sidebar-divider" />
        <div className="login-module">
          {user ? (
            <div className="user-container">
              <span className="welcome-text">欢迎 <strong>{user}</strong>!</span>
              <button
                className="logout-button"
                onClick={handleLogout}
              >
                退出
              </button>
            </div>
          ) : (
            <div className="user-container">
              <button className="login-button" onClick={onLoginClick}>
                登录
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;