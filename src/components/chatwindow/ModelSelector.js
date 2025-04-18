import React from 'react';
import './ModelSelector.css'

// 模型选项定义
const models = [
  { value: "model1", label: "deepseek v3" },
  { value: "model2", label: "deepseek R1" },
  { value: "model3", label: "百度千帆" },
  { value: "model4", label: "通义千问" },
  { value: "model5", label: "腾讯混元" },
  { value: "model6", label: "多模态" },
];

function ModelSelector({ onSelectModel }) {
  return (
    <select onChange={(e) => onSelectModel(e.target.value)}>
      {models.map(model => (
        <option key={model.value} value={model.value}>
          {model.label}
        </option>
      ))}
    </select>
  );
}

export default ModelSelector;
