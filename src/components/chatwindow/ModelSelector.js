import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Trash } from 'lucide-react';
import './ModelSelector.css';

// 初始模型选项定义（这些是系统默认模型，不可修改和删除）
const initialModels = [
  { value: "model1", label: "deepseek v3", isDefault: true },
  { value: "model2", label: "deepseek R1", isDefault: true },
  { value: "model3", label: "百度千帆", isDefault: true },
  { value: "model4", label: "通义千问", isDefault: true },
  { value: "model5", label: "腾讯混元", isDefault: true },
  { value: "model6", label: "多模态", isDefault: true },
];

// 最大允许的模型数量
const MAX_MODELS = 15;

function ModelSelector({ onSelectModel, user }) {
  const [models, setModels] = useState(initialModels);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(initialModels[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 新模型表单数据
  const [newModel, setNewModel] = useState({
    model_url: '',
    model_name: '',
    name: '',
    api_key: ''
  });
  
  const dropdownRef = useRef(null);
  
  // 从API加载用户模型
  useEffect(() => {
    if (!user) return;
    
    const fetchUserModels = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`http://localhost:8000/models?username=${user}`);
        
        if (!response.ok) {
          throw new Error('获取模型列表失败');
        }
        
        const data = await response.json();
        
        // 将API返回的模型转换为组件格式
        const userModels = data.models.map(model => ({
          value: `custom-${model.model_id}`,
          label: model.name,
          model_id: model.model_id,
          model_name: model.model_name,
          model_url: model.model_url,
          api_key: model.api_key,
          isCustom: true
        }));
        
        // 合并默认模型和用户自定义模型
        setModels([...initialModels, ...userModels]);
        
      } catch (err) {
        console.error('加载用户模型失败:', err);
        setError('加载用户模型失败，请刷新重试');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserModels();
  }, [user]);
  
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
      setNewModel({ model_url: '', model_name: '', name: '', api_key: '' });
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
  
  // 保存新模型到API
  const handleSaveModel = async () => {
    // 检查所有字段是否已填写
    if (!newModel.model_url || !newModel.model_name || !newModel.name || !newModel.api_key) {
      alert('请填写所有字段');
      return;
    }
    
    try {
      let response;
      let modelData;
      
      if (editingModel) {
        // 更新现有模型
        response = await fetch(`http://localhost:8000/models/${editingModel.model_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model_name: newModel.model_name,
            model_url: newModel.model_url,
            api_key: newModel.api_key,
            name: newModel.name
          })
        });
      } else {
        // 添加新模型
        response = await fetch(`http://localhost:8000/models?username=${user}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model_name: newModel.model_name, 
            model_url: newModel.model_url,
            api_key: newModel.api_key,
            name: newModel.name
          })
        });
      }
      
      if (!response.ok) {
        throw new Error(editingModel ? '更新模型失败' : '添加模型失败');
      }
      
      modelData = await response.json();
      
      // 重新加载所有模型
      const modelsResponse = await fetch(`http://localhost:8000/models?username=${user}`);
      
      if (!modelsResponse.ok) {
        throw new Error('刷新模型列表失败');
      }
      
      const modelsData = await modelsResponse.json();
      
      // 更新模型列表
      const userModels = modelsData.models.map(model => ({
        value: `custom-${model.model_id}`,
        label: model.name,
        model_id: model.model_id,
        model_name: model.model_name,
        model_url: model.model_url,
        api_key: model.api_key,
        isCustom: true
      }));
      
      setModels([...initialModels, ...userModels]);
      
      // 如果添加了新模型，自动选择它
      if (!editingModel) {
        const newAddedModel = userModels.find(m => m.model_id === modelData.model_id);
        if (newAddedModel) {
          setSelectedModel(newAddedModel);
          onSelectModel(newAddedModel.value);
        }
      }
      
      // 关闭模态窗口并清空表单
      setShowAddModal(false);
      setEditingModel(null);
      setNewModel({ model_url: '', model_name: '', name: '', api_key: '' });
      
    } catch (err) {
      console.error('保存模型失败:', err);
      alert(err.message || '操作失败，请重试');
    }
  };
  
  // 编辑模型
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
        model_url: model.model_url || '',
        model_name: model.model_name || '',
        name: model.label || '',
        api_key: model.api_key || ''
      });
      setShowAddModal(true);
    }, 0);
  };
  
  // 删除模型
  const handleDeleteModel = async (modelToDelete, event) => {
    event.stopPropagation();
    
    // 确认删除
    const confirmDelete = window.confirm(`确定要删除模型 "${modelToDelete.label}" 吗？`);
    if (!confirmDelete) return;
    
    try {
      const response = await fetch(`http://localhost:8000/models/${modelToDelete.model_id}?username=${user}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('删除模型失败');
      }
      
      // 刷新模型列表
      const modelsResponse = await fetch(`http://localhost:8000/models?username=${user}`);
      
      if (!modelsResponse.ok) {
        throw new Error('刷新模型列表失败');
      }
      
      const modelsData = await modelsResponse.json();
      
      // 更新模型列表
      const userModels = modelsData.models.map(model => ({
        value: `custom-${model.model_id}`,
        label: model.name,
        model_id: model.model_id,
        model_name: model.model_name, 
        model_url: model.model_url,
        api_key: model.api_key,
        isCustom: true
      }));
      
      setModels([...initialModels, ...userModels]);
      
      // 如果删除的是当前选中的模型，切换到第一个默认模型
      if (selectedModel.value === modelToDelete.value) {
        setSelectedModel(initialModels[0]);
        onSelectModel(initialModels[0].value);
      }
      
    } catch (err) {
      console.error('删除模型失败:', err);
      alert(err.message || '删除失败，请重试');
    }
  };
  
  // 取消添加/编辑模型
  const handleCancel = () => {
    setShowAddModal(false);
    setEditingModel(null);
    setNewModel({ model_url: '', model_name: '', name: '', api_key: '' });
  };
  
  // 判断是否显示"添加模型"选项
  const showAddModelOption = models.length < MAX_MODELS && user;
  
  return (
    <div className="model-selector-container" ref={dropdownRef}>
      <div className="selected-model" onClick={() => setIsOpen(!isOpen)}>
        {isLoading ? '加载中...' : selectedModel.label}
      </div>
      
      {isOpen && (
        <div className="model-dropdown">
          {error && <div className="error-message">{error}</div>}
          
          {models.map((model) => (
            <div 
              key={model.value} 
              className="model-option" 
              onClick={(e) => handleSelectModel(model, e)}
            >
              <span className="model-label">{model.label}</span>
              {model.isCustom && (
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
                name="model_url" 
                value={newModel.model_url} 
                onChange={handleInputChange} 
                placeholder="请输入API地址"
              />
            </div>
            <div className="form-group">
              <label>模型</label>
              <input 
                type="text" 
                name="model_name" 
                value={newModel.model_name} 
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
                name="api_key" 
                value={newModel.api_key} 
                onChange={handleInputChange} 
                placeholder="请输入API密钥"
              />
            </div>
            <div className="modal-buttons">
              <button className="cancel-button" onClick={handleCancel}>取消</button>
              <button 
                className="save-button" 
                onClick={handleSaveModel}
                disabled={!newModel.model_url || !newModel.model_name || !newModel.name || !newModel.api_key}
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