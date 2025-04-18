import React, { useState } from 'react';
import axios from 'axios';

function ChangePasswordModal({ isOpen, onClose, handleLogout, username }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 密码只允许字母、数字及部分特殊字符
  const handlePasswordChange = (e, setter) => {
    setter(e.target.value.replace(/[^a-zA-Z0-9!@#$%^&*]/g, ''));
  };

  // 重置表单并关闭模态框
  const resetForm = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  // 提交处理：修改密码
  const handleSubmit = async () => {
    // 验证新密码与确认密码是否一致
    if (newPassword !== confirmPassword) {
      alert("两次输入的新密码不一致");
      return;
    }

    // 验证新密码不能与旧密码相同
    if (oldPassword === newPassword) {
      alert("新密码不能与旧密码相同");
      return;
    }

    // 调用修改密码接口
    try {
      const { data } = await axios.post('http://localhost:8000/change_password', {
        username,
        old_password: oldPassword,
        new_password: newPassword,
      });
      
      alert(data.message);
      handleLogout(); // 修改成功后触发回调（退出登录）
      resetForm();
    } catch (error) {
      console.error("修改密码失败:", error);
      alert(error.response?.data?.detail || "修改密码失败");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="login-modal-overlay">
      <div className="login-modal">
        <h3>修改密码</h3>
        
        <div className="form-group">
          <label>原密码：</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => handlePasswordChange(e, setOldPassword)}
            placeholder="请输入原密码"
          />
        </div>

        <div className="form-group">
          <label>新密码：</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => handlePasswordChange(e, setNewPassword)}
            placeholder="字符/数字/字母"
          />
        </div>

        <div className="form-group">
          <label>确认新密码：</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => handlePasswordChange(e, setConfirmPassword)}
            placeholder="再次输入新密码"
          />
        </div>

        <div className="button-group">
          <button className="submit-btn" onClick={handleSubmit}>
            确认修改
          </button>
          <button className="cancel-btn" onClick={resetForm}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChangePasswordModal;