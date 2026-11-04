// Minimal-privilege popup. Only the current Claude tab receives state queries.
const $ = id => document.getElementById(id);
const wallets = Object.freeze({
  btc:'bc1q5tl36qpk27hf7upl8l753xa0gcm57adrvmwgkz',
  tron:'TA5pibChqS7CeHiDvfP7V3uQVMynk6SxLq',
  evm:'0x6634E26BA0e323182B7A9a89278E9a7BbCa9aF70',
  sol:'91kuBFEZAnRk8ixsuzAQnAVvtzLAsQpPFRsfe285ZKUC'
});
let tabId = null;
let resetAt = null;
function updateCountdown() {
  const box = $('reset-card');
  if (!Number.isFinite(resetAt) || resetAt <= 0) { box.hidden = true; return; }
  box.hidden = false;
  $('reset-clock').textContent = new Intl.DateTimeFormat(undefined, {
    hour:'2-digit',minute:'2-digit',timeZoneName:'short'
  }).format(new Date(resetAt));
  const diff = resetAt - Date.now();
  if (diff <= 0) {
    $('reset-countdown').textContent = 'Announced time passed · awaiting confirmation';
  } else {
    const minutes = Math.ceil(diff / 60000);
    const hours = Math.floor(minutes / 60);
    $('reset-countdown').textContent = hours ? `${hours}h ${minutes % 60}m remaining` : `${minutes}m remaining`;
  }
}
setInterval(updateCountdown, 1000);
const query = async (type,payload={}) => {
  if (tabId === null) throw new Error('Open a Claude conversation first.');
  return chrome.tabs.sendMessage(tabId,{type,...payload});
};
const fmt = ms => Number.isFinite(Number(ms)) ? new Date(Number(ms)).toLocaleString() : 'Unknown time';
const setState = (label,kind='') => { $('state').textContent=label; $('state').className=`pill ${kind}`; };
const isClaude = url => /^https:\/\/claude\.ai(?:\/|$)/.test(url || '');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function report(message) { $('action-feedback').textContent = message; }

function drawHistory(events) {
  const target=$('history');target.replaceChildren();
  if (!events?.length) {target.textContent='No activity has been recorded yet.';return;}
  for(const event of events.slice(0,25)) {
    const row=document.createElement('div');row.className='history-row';
    const title=document.createElement('b');title.textContent=event.result||'Unknown result';
    const subtitle=document.createElement('small');subtitle.textContent=fmt(event.time);
    row.append(title,subtitle);target.append(row);
  }
}
async function refresh() {
  try {
    const tabs=await chrome.tabs.query({active:true,currentWindow:true});
    const tab=tabs[0];
    // On Android and in ordinary browsing, the selected tab may not be Claude.
    // Read an existing Claude tab without silently navigating the user away.
    let target = tab && isClaude(tab.url) ? tab : null;
    if (!target) {
      const matches = await chrome.tabs.query({url:'https://claude.ai/*'});
      target = matches.find(item => /^https:\/\/claude\.ai\/chat\//.test(item.url || '')) || matches[0] || null;
    }
    if (!target) throw new Error('No Claude tab open. Use Open Claude or Show page panel.');
    tabId=target.id;
    const [data,hist]=await Promise.all([query('getState'),query('getHistory')]);
    setState(data.enabled?'Active':'Disabled',data.enabled?'on':'off');
    $('enabled').checked=!!data.enabled;$('enabled').disabled=false;
    $('check-minutes').value = String(data.checkMinutes ?? 5);
    $('safe-reload').checked = data.safeReload === true;
    $('status').textContent=data.status||'Monitoring';
    resetAt = Number.isFinite(data.resetAt) ? data.resetAt : null;
    updateCountdown();
    $('last').textContent=data.latest?`${fmt(data.latest.time)} · ${data.latest.result}`:'No attempts yet';
    $('count').textContent=String(data.historyCount||0);
    drawHistory(hist.events);
  } catch(e) {
    tabId=null;resetAt=null;updateCountdown();setState('No tab');$('status').textContent=e.message||'Could not connect to the active Claude tab.';
    $('enabled').disabled=true;$('last').textContent='Open Claude to view';drawHistory([]);
  }
}
for(const tab of document.querySelectorAll('.tab')) tab.addEventListener('click',()=>{
  for(const item of document.querySelectorAll('.tab')) {const selected=item===tab;item.classList.toggle('active',selected);item.setAttribute('aria-selected',String(selected));}
  for(const page of document.querySelectorAll('.page')) page.classList.toggle('active',page.id===`page-${tab.dataset.tab}`);
});
$('save-settings').addEventListener('click', async () => {
  const minutes = Number($('check-minutes').value);
  const safeReload = $('safe-reload').checked;
  try {
    const result = await query('setSettings', { checkMinutes: minutes, safeReload });
    if (!result?.ok) throw new Error(result?.error || 'Save failed');
    $('settings-feedback').textContent = `Saved: ${minutes}-minute checks; safe reload ${safeReload ? 'on' : 'off'}.`;
  } catch (error) { $('settings-feedback').textContent = error.message; }
});
$('enabled').addEventListener('change',async()=>{try{await query('setEnabled',{enabled:$('enabled').checked});await refresh();}catch(e){$('status').textContent=e.message;}});
// Show must work even when the current browser tab is not Claude.
// The toolbar popup covers the web page until it closes, so close it only after
// Claude confirms the panel is visible. No chat data or cookies are accessed.
async function showPagePanel() {
  const show = $('show');
  show.disabled = true;
  report('Finding an open Claude tab…');
  try {
    let candidate = null;
    const active = (await chrome.tabs.query({active:true,currentWindow:true}))[0];
    if (active && isClaude(active.url)) candidate = active;
    if (!candidate) {
      const matches = await chrome.tabs.query({url:'https://claude.ai/*'});
      candidate = matches.find(tab => /^https:\/\/claude\.ai\/chat\//.test(tab.url||'')) || matches[0];
    }
    if (!candidate) {
      report('No Claude tab found. Opening Claude…');
      candidate = await chrome.tabs.create({url:'https://claude.ai/new',active:true});
    } else {
      await chrome.tabs.update(candidate.id,{active:true});
      // Some Android browsers do not implement window focus. This must not block Show.
      if (candidate.windowId != null && chrome.windows?.update) {
        try { await chrome.windows.update(candidate.windowId,{focused:true}); }
        catch { /* The tab is already activated. Continue without window focus. */ }
      }
    }
    // Content scripts may still be loading after navigation or tab activation.
    let lastError = null;
    for (let i=0;i<12;i++) {
      try {
        const result = await chrome.tabs.sendMessage(candidate.id,{type:'showPanel'});
        if (result?.ok && result.visible) {
          report('Page panel opened.');
          window.close();
          return;
        }
        lastError = new Error('ClaudeRekindle did not confirm that its panel is visible.');
      } catch (error) { lastError = error; }
      await sleep(350);
    }
    throw lastError || new Error('Unable to show page panel. Reload the Claude tab, then retry.');
  } catch (error) {
    report(`Show failed: ${error?.message || String(error)}. Reload Claude and try again.`);
  } finally { show.disabled = false; }
}
$('show').addEventListener('click',showPagePanel);
$('open-claude').addEventListener('click', async () => {
  try { await chrome.tabs.create({url:'https://claude.ai/new',active:true}); window.close(); }
  catch (error) { report(`Could not open Claude: ${error.message || String(error)}`); }
});
$('refresh-status').addEventListener('click', async () => {
  report('Checking Claude tabs…');
  await refresh();
  report('Status refreshed.');
});
async function exportHistory(){try{
  const data=await query('getHistory');
  const file=new Blob([JSON.stringify(data.events||[],null,2)],{type:'application/json'});
  const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download='claude-rekindle-history.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}catch(e){$('status').textContent=e.message;}}
$('export').addEventListener('click',exportHistory);$('export2').addEventListener('click',exportHistory);
for(const button of document.querySelectorAll('[data-wallet]')) button.addEventListener('click',async()=>{
  const value=wallets[button.dataset.wallet];if(!value)return;
  try {await navigator.clipboard.writeText(value);$('copy-status').textContent='Address copied. Verify the network before transferring.';}
  catch { $('copy-status').textContent='Unable to copy automatically. Select the address above and copy it manually.'; }
});
refresh();