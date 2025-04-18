import React, { useState } from 'react';
import axios from 'axios';

function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true); // 默认记住登录状态

  // 账号只能包含字母和数字
  const handleAccountChange = (e) => {
    setAccount(e.target.value.replace(/[^a-zA-Z0-9]/g, ''));
  };

  // 密码只允许字母、数字及部分特殊字符
  const handlePasswordChange = (e) => {
    setPassword(e.target.value.replace(/[^a-zA-Z0-9!@#$%^&*]/g, ''));
  };

  // 重置表单并关闭模态框
  const resetForm = () => {
    setAccount('');
    setPassword('');
    setConfirmPassword('');
    onClose();
  };

  // 提交处理：区分注册和登录操作
  const handleSubmit = async () => {
    if (isRegistering) {
      if (password !== confirmPassword) {
        alert("两次输入的密码不一致");
        return;
      }
      // 调用注册接口
      try {
        const { data } = await axios.post('http://localhost:8000/register', {
          username: account,
          password,
        });
        
        // 如果选择了记住登录状态，保存用户信息到本地
        if (rememberMe && data.token) {
          localStorage.setItem('user', account);
          localStorage.setItem('token', data.token);
        }
        
        alert(data.message);
        onLoginSuccess(account);
        resetForm();
      } catch (error) {
        console.error("注册失败:", error);
        alert(error.response?.data?.detail || "注册失败");
      }
    } else {
      // 调用登录接口
      try {
        const { data } = await axios.post('http://localhost:8000/login', {
          username: account,
          password,
        });
        
        // 如果选择了记住登录状态，保存用户信息到本地
        if (rememberMe && data.token) {
          localStorage.setItem('user', account);
          localStorage.setItem('token', data.token);
        }
        
        alert(data.message);
        onLoginSuccess(account);
        resetForm();
      } catch (error) {
        console.error("登录失败:", error);
        alert(error.response?.data?.detail || "登录失败");
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="login-modal-overlay">
      <div className="login-modal">
        <h3>{isRegistering ? '用户注册' : '用户登录'}</h3>
        
        <div className="form-group">
          <label>账号：</label>
          <input
            type="text"
            value={account}
            onChange={handleAccountChange}
            placeholder="字母/数字组合"
          />
        </div>

        <div className="form-group">
          <label>密码：</label>
          <input
            type="password"
            value={password}
            onChange={handlePasswordChange}
            placeholder="字符/数字/字母"
          />
        </div>

        {isRegistering && (
          <div className="form-group">
            <label>确认密码：</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        )}

        <div className="form-group checkbox">
          <input
            type="checkbox"
            id="rememberMe"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <label htmlFor="rememberMe">记住登录状态</label>
        </div>

        <div className="button-group">
          <button className="submit-btn" onClick={handleSubmit}>
            {isRegistering ? '注册' : '登录'}
          </button>
          <button className="cancel-btn" onClick={resetForm}>
            取消
          </button>
        </div>

        <div className="switch-mode">
          {isRegistering ? '已有账号？' : '没有账号？'}
          <span onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? '立即登录' : '立即注册'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default LoginModal;