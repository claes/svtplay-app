import { app, BrowserWindow, shell, session, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

// Improve media autoplay and performance for video-heavy sites
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
app.commandLine.appendSwitch('ignore-gpu-blacklist')

const SVTPLAY_URL = 'https://www.svtplay.se/'

/**
 * Create the main application window and load svtplay.se
 */
async function createWindow() {
  const appPath = app.getAppPath()
  const iconPath = path.join(appPath, 'assets', 'icon.png')
  const hasIcon = fs.existsSync(iconPath)

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'SVT Play',
    backgroundColor: '#111111',
    autoHideMenuBar: true,
    icon: hasIcon ? iconPath : undefined,
    webPreferences: {
      preload: path.join(appPath, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      webSecurity: true,
      devTools: process.env.NODE_ENV !== 'production'
    }
  })

  // Keep navigation inside the app for svtplay.se, open others externally
  const handleExternal = (targetUrl) => {
    try {
      const url = new URL(targetUrl)
      if (url.hostname.endsWith('svt.se') || url.hostname.endsWith('svtplay.se')) {
        return false // allow in-app
      }
    } catch {}
    shell.openExternal(targetUrl)
    return true // handled externally
  }

  win.webContents.setWindowOpenHandler(({ url }) => ({
    action: handleExternal(url) ? 'deny' : 'allow'
  }))

  win.webContents.on('will-navigate', (event, url) => {
    if (handleExternal(url)) event.preventDefault()
  })

  // Intercept arrow keys at a low level and route to spatial focus navigation
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    if (input.alt || input.control || input.meta) return
    const key = input.key
    let dir = null
    if (key === 'ArrowLeft' || key === 'Left') dir = 'left'
    else if (key === 'ArrowRight' || key === 'Right') dir = 'right'
    else if (key === 'ArrowUp' || key === 'Up') dir = 'up'
    else if (key === 'ArrowDown' || key === 'Down') dir = 'down'
    if (!dir) return

    // Prevent default scrolling/handling and run spatial navigation in the page
    event.preventDefault()
    const js = `try { window.__svtSpatialNavigate ? window.__svtSpatialNavigate(${JSON.stringify(dir)}) : false } catch (e) { false }`
    win.webContents.executeJavaScript(js).then((moved) => {
      if (moved) return
      // Fallback: send a real Tab keypress to let the site enter keyboard-focus mode
      try {
        win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Tab' })
        win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Tab' })
        // Try navigating again on next frame
        setTimeout(() => {
          win.webContents.executeJavaScript(js).catch(() => {})
        }, 30)
      } catch {}
    }).catch(() => {})
  })

  // Optional: spoof a stable desktop UA to avoid any oddities
  const baseUA = win.webContents.getUserAgent()
  const ua = baseUA.replace(/Electron\/[\d.]+\s?/, '') // some sites dislike the Electron token

  await win.loadURL(SVTPLAY_URL, {
    userAgent: ua
  })

  // Inject spatial navigation helper and a visible focus outline into the page world
  try {
    await win.webContents.insertCSS(`:focus-visible { outline: 2px solid #00bfff !important; outline-offset: 2px; }`)
  } catch {}

  try {
    await win.webContents.executeJavaScript(`(function(){
      if (window.__svtSpatialNavigate) return;
      function isEditable(el){
        if (!el) return false;
        const tag = (el.tagName||'').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
        if (el.isContentEditable) return true;
        return false;
      }
      function isVisible(el){
        if (!el || typeof el.getBoundingClientRect !== 'function') return false;
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return false;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') return false;
        return true;
      }
      const selector = 'a[href], button, input, select, textarea, [tabindex], [role="button"], [role="link"]';
      function collectFocusable(root){
        const list = [];
        const seen = new Set();
        function addFrom(container){
          try {
            const nodes = container.querySelectorAll(selector);
            for (const el of nodes){
              if (!el) continue;
              try {
                const ti = el.tabIndex;
                if (ti >= 0 && !el.disabled && isVisible(el)){
                  if (!seen.has(el)) { seen.add(el); list.push(el); }
                }
              } catch {}
              if (el.shadowRoot) addFrom(el.shadowRoot);
            }
          } catch {}
        }
        addFrom(root);
        // Also traverse top-level shadow hosts (if any)
        const walker = document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT);
        let n = walker.currentNode;
        while(n){ if (n.shadowRoot) addFrom(n.shadowRoot); n = walker.nextNode(); }
        return list;
      }
      function wakeControls(){
        try {
          const coords = [ [0.5, 0.9], [0.5, 0.5] ];
          for (const [fx, fy] of coords){
            const x = Math.max(0, Math.min(innerWidth-1, Math.floor(innerWidth*fx)));
            const y = Math.max(0, Math.min(innerHeight-1, Math.floor(innerHeight*fy)));
            const t = document.elementFromPoint(x,y) || document.body;
            if (!t) continue;
            const evInit = { bubbles:true, cancelable:true, clientX:x, clientY:y };
            try { t.dispatchEvent(new PointerEvent('pointermove', evInit)); } catch {}
            try { t.dispatchEvent(new MouseEvent('mousemove', evInit)); } catch {}
            try { t.dispatchEvent(new MouseEvent('mouseover', evInit)); } catch {}
          }
        } catch {}
      }
      function centerOf(el){ const r = el.getBoundingClientRect(); return {x:r.left + r.width/2, y:r.top + r.height/2, r}; }
      function overlapFrac(a, b, axis){
        const ra = a.r || a.getBoundingClientRect();
        const rb = b.r || b.getBoundingClientRect();
        if (axis === 'vertical'){
          const top = Math.max(ra.top, rb.top), bottom = Math.min(ra.bottom, rb.bottom);
          const ov = Math.max(0, bottom - top);
          const h = Math.min(ra.height, rb.height) || 1;
          return ov / h;
        } else {
          const left = Math.max(ra.left, rb.left), right = Math.min(ra.right, rb.right);
          const ov = Math.max(0, right - left);
          const w = Math.min(ra.width, rb.width) || 1;
          return ov / w;
        }
      }
      function byReadingOrder(a,b){ const ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect(); if (Math.abs(ra.top-rb.top)>2) return ra.top-rb.top; return ra.left-rb.left; }
      function chooseNext(current, candidates, dir){
        const c = centerOf(current);
        const primary = [];
        const secondary = [];
        for (const el of candidates){
          const p = centerOf(el);
          let directional=false;
          if (dir==='left') directional = p.x < c.x - 1;
          else if (dir==='right') directional = p.x > c.x + 1;
          else if (dir==='up') directional = p.y < c.y - 1;
          else if (dir==='down') directional = p.y > c.y + 1;
          if (!directional) continue;
          const frac = (dir==='left'||dir==='right') ? overlapFrac(c, p, 'vertical') : overlapFrac(c, p, 'horizontal');
          if (frac >= 0.4) primary.push({el, p}); else secondary.push({el, p});
        }
        function score(item){ const dx=item.p.x-c.x, dy=item.p.y-c.y; const ax=Math.abs(dx), ay=Math.abs(dy); if (dir==='left'||dir==='right') return (ay*ay)*50 + (ax*ax); return (ax*ax)*50 + (ay*ay); }
        let pool = primary.length ? primary : secondary;
        let best=null, bestScore=Infinity;
        for (const it of pool){ const s=score(it); if (s<bestScore){ best=it.el; bestScore=s; } }
        return best;
      }
      function getDeepActive(){ let el=document.activeElement; while (el && el.shadowRoot && el.shadowRoot.activeElement) el=el.shadowRoot.activeElement; return el; }
      window.__svtSpatialNavigate = async function(dir){
        let candidates = collectFocusable(document);
        if (!candidates.length){
          wakeControls();
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          candidates = collectFocusable(document);
          if (!candidates.length){
            wakeControls();
            await new Promise(r => requestAnimationFrame(r));
            candidates = collectFocusable(document);
          }
        }
        if (!candidates.length) return false;
        let current = getDeepActive(); if (current===document.body) current=null;
        if (isEditable(current)) return false;
        let next=null;
        if (current){
          next = chooseNext(current, candidates.filter(el=>el!==current), dir);
          if (!next){ const ordered=candidates.slice().sort(byReadingOrder); const idx=ordered.indexOf(current); if (idx!==-1){ next = (dir==='left'||dir==='up') ? ordered[Math.max(0, idx-1)] : ordered[Math.min(ordered.length-1, idx+1)]; if (next===current) next=null; } }
        } else {
          const cx=window.innerWidth/2, cy=window.innerHeight/2; let best=null, bestD=Infinity; for (const el of candidates){ const r=el.getBoundingClientRect(); const x=r.left+r.width/2, y=r.top+r.height/2; const dx=x-cx, dy=y-cy; const d=dx*dx+dy*dy; if (d<bestD){ bestD=d; best=el; } } next=best;
        }
        if (next){ try{ next.scrollIntoView({block:'nearest', inline:'nearest'});}catch(e){}; try{ next.focus({preventScroll:true}); }catch(e){ try{ next.focus(); }catch(e2){} } return document.activeElement===next; }
        return false;
      };
    })();`)
  } catch {}

  // Show a simple startup dialog so you can confirm it's working.
  // We await loadURL above, so the page is already loaded; show the dialog now.
  try {
    await dialog.showMessageBox(win, {
      type: 'info',
      buttons: ['OK'],
      title: 'SVT Play App',
      message: 'Electron wrapper loaded',
      detail: 'If you see this, the app is active. Arrow-key focus is enabled outside text inputs.'
    })
  } catch {}
}

// Minimal permissions policy for this app
function setupPermissions() {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    // SVT Play typically doesn't need privileged permissions; deny by default
    const allowed = new Set([])
    callback(allowed.has(permission))
  })
}

app.whenReady().then(() => {
  setupPermissions()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
