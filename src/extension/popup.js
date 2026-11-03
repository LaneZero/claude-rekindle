// Minimal-privilege popup. Only the current Claude tab receives state queries.
const $ = id => document.getElementById(id);
const wallets = Object.freeze({
  btc:'bc1q5tl36qpk27hf7upl8l753xa0gcm57adrvmwgkz',
  tron:'TA5pibChqS7CeHiDvfP7V3uQVMynk6SxLq',
  evm:'0x6634E26BA0e323182B7A9a89278E9a7BbCa9aF70',
  sol:'91kuBFEZAnRk8ixsuzAQnAVvtzLAsQpPFRsfe285ZKUC'
});
let tabId = null;
const query = async (type,payload={}) => {
  if (tabId === null) throw new Error('Open a Claude conversation first.');
  return chrome.tabs.sendMessage(tabId,{type,...payload});
};
const fmt = ms => Number.isFinite(Number(ms)) ? new Date(Number(ms)).toLocaleString() : 'Unknown time';
const setState = (label,kind='') => { $('state').textContent=label; $('state').className=`pill ${kind}`; };
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
    if(!tab||!/^https:\/\/claude\.ai(?:\/|$)/.test(tab.url||'')) throw new Error('Open a Claude conversation to monitor its status.');
    tabId=tab.id;
    const [data,hist]=await Promise.all([query('getState'),query('getHistory')]);
    setState(data.enabled?'Active':'Disabled',data.enabled?'on':'off');
    $('enabled').checked=!!data.enabled;$('enabled').disabled=false;
    $('status').textContent=data.status||'Monitoring';
    $('last').textContent=data.latest?`${fmt(data.latest.time)} · ${data.latest.result}`:'No attempts yet';
    $('count').textContent=String(data.historyCount||0);
    drawHistory(hist.events);
  } catch(e) {
    tabId=null;setState('No tab');$('status').textContent=e.message||'Could not connect to the active Claude tab.';
    $('enabled').disabled=true;$('last').textContent='Open Claude to view';drawHistory([]);
  }
}
for(const tab of document.querySelectorAll('.tab')) tab.addEventListener('click',()=>{
  for(const item of document.querySelectorAll('.tab')) {const selected=item===tab;item.classList.toggle('active',selected);item.setAttribute('aria-selected',String(selected));}
  for(const page of document.querySelectorAll('.page')) page.classList.toggle('active',page.id===`page-${tab.dataset.tab}`);
});
$('enabled').addEventListener('change',async()=>{try{await query('setEnabled',{enabled:$('enabled').checked});await refresh();}catch(e){$('status').textContent=e.message;}});
$('show').addEventListener('click',async()=>{try{await query('showPanel');}catch(e){$('status').textContent=e.message;}});
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