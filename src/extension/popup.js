// The popup queries only the active Claude tab. Conversation text is never collected.
const $ = id => document.getElementById(id);
let tabId = null;
const query = async (type, payload={}) => {
  if (tabId === null) throw new Error('Open a Claude conversation first.');
  return chrome.tabs.sendMessage(tabId, {type, ...payload});
};
const fmt = ms => new Date(ms).toLocaleString();
async function refresh() {
  try {
    const tabs = await chrome.tabs.query({active:true,currentWindow:true});
    const tab = tabs[0];
    if (!tab || !/^https:\/\/claude\.ai\//.test(tab.url || '')) throw new Error('Open a Claude tab.');
    tabId = tab.id;
    const data = await query('getState');
    $('state').textContent = data.enabled ? 'Active' : 'Disabled';
    $('enabled').checked = data.enabled;
    $('status').textContent = data.status;
    $('last').textContent = data.latest ? `${fmt(data.latest.time)} · ${data.latest.result}` : 'No attempts recorded';
  } catch (e) {
    $('state').textContent='Unavailable';
    $('status').textContent = e.message || 'Unable to reach Claude page. Refresh the tab.';
    $('enabled').disabled = true;
  }
}
$('enabled').addEventListener('change', async () => { try { await query('setEnabled', { enabled:$('enabled').checked }); await refresh(); } catch(e) { $('status').textContent=e.message; }});
$('show').addEventListener('click', async () => { try { await query('showPanel'); } catch(e) { $('status').textContent=e.message; }});
$('export').addEventListener('click', async () => {
  try {
    const data = await query('getHistory');
    const file = new Blob([JSON.stringify(data.events, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a'); anchor.href=url;anchor.download='claude-rekindle-history.json';anchor.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  } catch(e) { $('status').textContent=e.message; }
});
refresh();