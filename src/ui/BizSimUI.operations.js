import { escapeHtml } from '../utils/object.js';
import { showConfirm, deleteVariableSafe } from '../utils/stCompat.js';

export async function runSimulation(ui) {
  const resultDiv = ui.byId('simulation-result');
  const resultContent = ui.byId('simulation-result-content');
  if (!resultDiv || !resultContent) return;

  if (ui.isSimulating) return;

  const useHistory = ui.saveSimulationSettings(true);
  ui.setSimulationBusy(true, '运行中');

  try {
    const result = await ui.engine.runSimulation(useHistory);
    ui.setPromptViewMode('lastSent');
    await ui.refreshPromptSnapshot();
    ui.refreshDashboard();
    ui.refreshTracks();
    resultDiv.style.display = 'block';

    if (result.success) {
      const activeTracks = result.data.worldSimulation?.tracks?.filter((t) => t.status === '推演中').length || 0;
      resultContent.innerHTML = `<div class="bizsim-helper" style="color:var(--bizsim-success);">推演成功，活跃视角 ${activeTracks} 个。</div>`;
      const replaced = result.data?.floorSync?.replacedExisting;
      ui.log(replaced ? '推演成功（同楼层已覆盖旧变量）' : '推演成功');
    } else {
      const constraintErrors = Array.isArray(result.constraintErrors) ? result.constraintErrors : [];
      const constraintHtml = constraintErrors.length
        ? `<div class="bizsim-helper" style="margin-top:8px;color:var(--bizsim-danger);">约束详情:<br>${constraintErrors.map((item) => `- ${escapeHtml(item)}`).join('<br>')}</div>`
        : '';
      resultContent.innerHTML = `<div class="bizsim-helper" style="color:var(--bizsim-danger);">推演失败: ${escapeHtml(result.error || '未知错误')}</div>${constraintHtml}`;
      ui.log(`推演失败: ${result.error}`);
    }
  } catch (error) {
    resultDiv.style.display = 'block';
    resultContent.innerHTML = `<div class="bizsim-helper" style="color:var(--bizsim-danger);">错误: ${escapeHtml(error.message)}</div>`;
    ui.log(`错误: ${error.message}`);
  } finally {
    ui.setSimulationBusy(false);
  }
}

export async function resetAllData(ui) {
  const ok = await showConfirm('确定要清空所有 BizSim 数据吗？');
  if (!ok) return;

  await deleteVariableSafe(ui.engine.config.VAR_PATH);
  await ui.engine.initialize();
  ui.refreshTracks();
  ui.log('已重置数据');
}

export async function quickAudit(ui) {
  ui.log('执行快速审计...');
  const result = ui.engine.validateCrossSheetIntegrity();

  if (result.valid) {
    if (typeof toastr !== 'undefined') toastr.success('审计通过！所有跨表数据一致性检查正常。');
    ui.log('审计通过: 所有检查项正常');
  } else {
    if (typeof toastr !== 'undefined') toastr.warning(`发现 ${result.issues.length} 个问题，请查看控制台`);
    ui.log(`审计警告: ${result.issues.join(', ')}`);
  }
}

export function exportReport(ui) {
  const report = ui.engine.getReportText();
  const blob = new Blob([report], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = ui.rootDoc.createElement('a');
  a.href = url;
  a.download = `BizSim_Report_${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);

  ui.log('报告已导出');
  if (typeof toastr !== 'undefined') toastr.success('报告已导出为 Markdown 文件');
}
