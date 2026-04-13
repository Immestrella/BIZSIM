/**
 * 预设系统管理器
 */

import { compileTemplateWithUserPref } from '../core/BizSimEngine.scaffold.js';
import { ensureCurrentTemplateStructure } from '../config/promptModules.js';

export class PromptPresetManager {
  constructor(engine) {
    this.engine = engine;
    this.presets = engine.config.SIMULATION?.presets || [];
    this.currentPresetId = engine.config.SIMULATION?.currentPresetId || null;
  }

  save() {
    this.engine.config.SIMULATION.presets = this.presets;
    this.engine.config.SIMULATION.currentPresetId = this.currentPresetId;
  }

  /**
   * 保存当前配置为新预设
   */
  createPreset(name, description = '') {
    const preset = {
      id: `preset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      description,
      tplRaw: JSON.parse(JSON.stringify(this.engine.config.SIMULATION?.tplRaw || {})),
      userPref: JSON.parse(JSON.stringify(this.engine.config.SIMULATION?.userPref || null)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.presets.push(preset);
    this.currentPresetId = preset.id;
    this.save();

    return preset;
  }

  /**
   * 加载预设
   */
  loadPreset(presetId) {
    const preset = this.presets.find((p) => p.id === presetId);
    if (!preset) {
      console.warn(`[PromptPresetManager] 预设 ${presetId} 不存在`);
      return null;
    }

    // 深复制预设数据到 engine config
    this.engine.config.SIMULATION.tplRaw = ensureCurrentTemplateStructure(
      JSON.parse(JSON.stringify(preset.tplRaw))
    );
    this.engine.config.SIMULATION.userPref = preset.userPref ? JSON.parse(JSON.stringify(preset.userPref)) : null;

    // 重新编译
    this.engine.config.SIMULATION.tpl = compileTemplateWithUserPref(
      this.engine.config.SIMULATION.tplRaw,
      this.engine.config.SIMULATION.userPref
    );

    this.currentPresetId = presetId;
    this.save();

    return preset;
  }

  /**
   * 删除预设
   */
  deletePreset(presetId) {
    this.presets = this.presets.filter((p) => p.id !== presetId);
    if (this.currentPresetId === presetId) {
      this.currentPresetId = null;
    }
    this.save();
  }

  /**
   * 更新预设内容
   */
  updatePreset(presetId) {
    const preset = this.presets.find((p) => p.id === presetId);
    if (!preset) return null;

    preset.tplRaw = JSON.parse(JSON.stringify(this.engine.config.SIMULATION?.tplRaw || {}));
    preset.userPref = this.engine.config.SIMULATION?.userPref || null;
    preset.updatedAt = new Date().toISOString();
    this.save();

    return preset;
  }

  /**
   * 列出所有预设
   */
  listPresets() {
    return this.presets.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));
  }

  /**
   * 获取预设数量
   */
  getPresetCount() {
    return this.presets.length;
  }

  /**
   * 获取当前预设
   */
  getCurrentPreset() {
    return this.presets.find((p) => p.id === this.currentPresetId) || null;
  }
}
