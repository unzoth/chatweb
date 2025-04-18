import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Trash } from 'lucide-react';
import './ModelSelector.css';

// 初始模型选项定义
const initialModels = [
  { value: "model1", label: "deepseek v3" },
  { value: "model2", label: "deepseek R1" },
  { value: "model3", label: "百度千帆" },
  { value: "model4", label: "通义千问" },
  { value: "model5", label: "腾讯混元" },
  { value: "model6", label: "多模态" },
];

// 最大允许的模型数量
const MAX_MODELS = 15;

function ModelSelector({ onSelectModel }) {
  const [models, setModels] = useState(() => {
    // 从本地存储加载自定义模型
    const savedModels = localStorage.getItem('customModels');
    return savedModels ? [...initialModels, ...JSON.parse(savedModels)] : initialModels;
  });
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(models[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  
  // 新模型表单数据
  const [newModel, setNewModel] = useState({
    url: '',
    model: '',
    name: '',
    key: ''
  });
  
  const dropdownRef = useRef(null);
  
  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // 选择模型
  const handleSelectModel = (model, event) => {
    // 防止点击编辑或删除按钮时触发选择
    if (event && (event.target.closest('.edit-button') || event.target.closest('.delete-button'))) {
      return;
    }
    
    if (model.label === "添加模型") {
      // 检查模型总数是否达到上限
      if (models.length >= MAX_MODELS) {
        alert(`模型数量已达到上限(${MAX_MODELS})，无法继续添加。请先删除部分模型后再试。`);
        return;
      }
      
      setShowAddModal(true);
      setEditingModel(null);
      setNewModel({ url: '', model: '', name: '', key: '' });
    } else {
      setSelectedModel(model);
      onSelectModel(model.value);
      setIsOpen(false);
    }
  };
  
  // 处理输入变化
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewModel({
      ...newModel,
      [name]: value
    });
  };
  
  // 保存新模型
  const handleSaveModel = () => {
    // 检查所有字段是否已填写
    if (!newModel.url || !newModel.model || !newModel.name || !newModel.key) {
      alert('请填写所有字段');
      return;
    }
    
    // 获取现有自定义模型
    const existingCustomModels = localStorage.getItem('customModels') 
      ? JSON.parse(localStorage.getItem('customModels')) 
      : [];
    
    let updatedCustomModels;
    
    if (editingModel) {
      // 更新现有模型
      updatedCustomModels = existingCustomModels.map(model => 
        model.value === editingModel.value 
          ? {
              ...model,
              label: newModel.name,
              url: newModel.url,
              model: newModel.model,
              key: newModel.key
            }
          : model
      );
    } else {
      // 检查模型总数是否达到上限
      if (initialModels.length + existingCustomModels.length >= MAX_MODELS) {
        alert(`模型数量已达到上限(${MAX_MODELS})，无法继续添加。请先删除部分模型后再试。`);
        return;
      }
      
      // 添加新模型
      const customModel = {
        value: `custom-${Date.now()}`,
        label: newModel.name,
        url: newModel.url,
        model: newModel.model,
        key: newModel.key,
        isCustom: true // 标记为自定义模型
      };
      updatedCustomModels = [...existingCustomModels, customModel];
    }
    
    // 保存到本地存储
    localStorage.setItem('customModels', JSON.stringify(updatedCustomModels));
    
    // 更新模型列表
    const updatedModels = [...initialModels, ...updatedCustomModels];
    setModels(updatedModels);
    
    // 如果正在编辑的是当前选中的模型，更新选中状态
    if (editingModel && editingModel.value === selectedModel.value) {
      const updatedModel = updatedCustomModels.find(model => model.value === editingModel.value);
      if (updatedModel) {
        setSelectedModel(updatedModel);
      }
    }
    
    // 关闭模态窗口并清空表单
    setShowAddModal(false);
    setEditingModel(null);
    setNewModel({ url: '', model: '', name: '', key: '' });
  };
  
  // 编辑模型函数修改
const handleEditModel = (model, event) => {
  // 阻止事件冒泡，防止触发选择模型
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  // 重要：延迟设置状态，确保React状态更新顺序正确
  setTimeout(() => {
    setEditingModel(model);
    setNewModel({
      url: model.url || '',
      model: model.model || '',
      name: model.label || '',
      key: model.key || ''
    });
    setShowAddModal(true);
  }, 0);
};
  
  // 删除模型
  const handleDeleteModel = (modelToDelete, event) => {
    event.stopPropagation();
    
    // 确认删除
    const confirmDelete = window.confirm(`确定要删除模型 "${modelToDelete.label}" 吗？`);
    if (!confirmDelete) return;
    
    // 获取现有自定义模型
    const existingCustomModels = localStorage.getItem('customModels') 
      ? JSON.parse(localStorage.getItem('customModels')) 
      : [];
    
    // 过滤掉要删除的模型
    const updatedCustomModels = existingCustomModels.filter(
      model => model.value !== modelToDelete.value
    );
    
    // 保存到本地存储
    localStorage.setItem('customModels', JSON.stringify(updatedCustomModels));
    
    // 更新模型列表
    const updatedModels = [...initialModels, ...updatedCustomModels];
    setModels(updatedModels);
    
    // 如果删除的是当前选中的模型，切换到第一个默认模型
    if (selectedModel.value === modelToDelete.value) {
      setSelectedModel(initialModels[0]);
      onSelectModel(initialModels[0].value);
    }
  };
  
  // 取消添加/编辑模型
  const handleCancel = () => {
    setShowAddModal(false);
    setEditingModel(null);
    setNewModel({ url: '', model: '', name: '', key: '' });
  };
  
  // 判断模型是否为自定义模型
  const isCustomModel = (model) => {
    return model.isCustom || model.value.startsWith('custom-');
  };
  
  // 判断是否显示"添加模型"选项
  const showAddModelOption = models.length < MAX_MODELS;
  
  return (
    <div className="model-selector-container" ref={dropdownRef}>
      <div className="selected-model" onClick={() => setIsOpen(!isOpen)}>
        {selectedModel.label}
      </div>
      
      {isOpen && (
        <div className="model-dropdown">
          {models.map((model) => (
            <div 
              key={model.value} 
              className="model-option" 
              onClick={(e) => handleSelectModel(model, e)}
            >
              <span className="model-label">{model.label}</span>
              {isCustomModel(model) && (
                <div className="model-actions">
                  <button 
                    className="edit-button" 
                    onClick={(e) => handleEditModel(model, e)}
                    title="编辑模型"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    className="delete-button" 
                    onClick={(e) => handleDeleteModel(model, e)}
                    title="删除模型"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {showAddModelOption && (
            <div 
              className="model-option add-model-option" 
              onClick={(e) => handleSelectModel({ label: "添加模型" }, e)}
            >
              添加模型
            </div>
          )}
        </div>
      )}
      
      {showAddModal && (
        <div className="add-model-modal-overlay" onClick={(e) => {
          // 仅当点击背景时关闭模态窗口
          if (e.target === e.currentTarget) {
            handleCancel();
          }
        }}>
          <div className="add-model-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingModel ? '编辑模型' : '添加新模型'}</h3>
            <div className="form-group">
              <label>地址</label>
              <input 
                type="text" 
                name="url" 
                value={newModel.url} 
                onChange={handleInputChange} 
                placeholder="请输入API地址"
              />
            </div>
            <div className="form-group">
              <label>模型</label>
              <input 
                type="text" 
                name="model" 
                value={newModel.model} 
                onChange={handleInputChange} 
                placeholder="请输入模型标识符"
              />
            </div>
            <div className="form-group">
              <label>模型名称</label>
              <input 
                type="text" 
                name="name" 
                value={newModel.name} 
                onChange={handleInputChange} 
                placeholder="请输入显示的名称"
              />
            </div>
            <div className="form-group">
              <label>密钥</label>
              <input 
                type="text" 
                name="key" 
                value={newModel.key} 
                onChange={handleInputChange} 
                placeholder="请输入API密钥"
              />
            </div>
            <div className="modal-buttons">
              <button className="cancel-button" onClick={handleCancel}>取消</button>
              <button 
                className="save-button" 
                onClick={handleSaveModel}
                disabled={!newModel.url || !newModel.model || !newModel.name || !newModel.key}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModelSelector;