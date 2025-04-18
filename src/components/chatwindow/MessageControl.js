import React, { useState, useRef, useEffect } from 'react';
import ModelSelector from './ModelSelector';
import {X,ImagePlus}  from 'lucide-react';
import './MessageControl.css'

function MessageControl({ 
  onSendMessage, 
  onSelectModel, 
  isSending, 
  dialogId, 
  user, 
  updateMessagesHeight,
  openModal
}) {
  // 输入和文件状态
  const [input, setInput] = useState('');
  const [imageBase64, setImageBase64] = useState(null);
  const [imagePath, setImagePath] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false); // 是否正在等待 AI 回复

  // ref 引用，方便获取 DOM 节点
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputFormRef = useRef(null);

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
  }, [input, imageBase64, updateMessagesHeight]);

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
    updateMessagesHeight();
  };

  // 发送消息或等待 AI 回复（并清空输入）
  const handleSend = async () => {
    if (!input.trim() && !imageBase64) return;
    const payload = { text: input, image_base64: imageBase64, image_path: imagePath };
    setInput('');
    removeImage();
    setIsStreaming(true);
    await onSendMessage(payload);
    setIsStreaming(false);
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

  return (
    <form className="message-input-form" ref={inputFormRef}>
      {imageBase64 && (
        <div className="image-preview">
          <img
            src={imageBase64}
            alt="preview"
            style={{ cursor: 'pointer' }}
            onClick={() => openModal(imageBase64)}
          />
          <button
            type="button"
            className="cancel-image"
            onClick={removeImage}
            title="取消图片"
            aria-label="取消图片"
          >
            <X size={18} strokeWidth={1.5} />
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

          <label
            htmlFor="file-upload"
            className="upload-button"
            title="上传图片"
            aria-label="上传图片"
            style={{ cursor: isSending ? 'not-allowed' : 'pointer' }}
          >
            <ImagePlus size={18} strokeWidth={1.5} />
          </label>

          <input
            id="file-upload"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isSending}
            className="file-input"
            style={{ display: 'none' }}
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
  );
}

export default MessageControl;