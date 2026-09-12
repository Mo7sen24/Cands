document.addEventListener("DOMContentLoaded", () => {

  // حماية DevTools
  if (typeof DisableDevtool !== 'undefined') {
    DisableDevtool({
      url: 'about:blank',
      disableMenu: true
    });
  }

  // تسجيل الدخول
  const FIXED_PASSWORD = 'Chat2025';
  const overlay = document.getElementById('loginOverlay');
  const btn = document.getElementById('loginBtn');
  const pwd = document.getElementById('loginPwd');
  const msg = document.getElementById('loginMsg');
  const app = document.getElementById('protectedApp');
  const formContent = document.getElementById('loginFormContent');
  const successMsg = document.getElementById('loginSuccess');

  pwd.focus();
  function unlock() {
    if (pwd.value === FIXED_PASSWORD) {
      formContent.classList.add('hide');
      successMsg.classList.add('show');
      setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.style.display = 'none', 400);
        app.style.display = 'block';
        setTimeout(() => app.style.opacity = '1', 50);
      }, 900);
      sessionStorage.setItem('candat_unlocked', '1');
    } else {
      msg.textContent = 'كلمة المرور غير صحيحة، حاول مرة أخرى';
      pwd.value = '';
      pwd.focus();
    }
  }
  btn.addEventListener('click', unlock);
  pwd.addEventListener('keydown', (e) => { if (e.key === 'Enter') unlock(); });
  if (sessionStorage.setItem && sessionStorage.getItem('candat_unlocked') === '1') {
    overlay.style.display = 'none';
    app.style.display = 'block';
    app.style.opacity = '1';
  }

  // عناصر واجهة المستخدم
  const splash = document.getElementById("splash");
  const sheetList = document.getElementById("sheetList");
  const cardsGrid = document.getElementById("cardsGrid");
  const searchInput = document.getElementById("searchInput");
  const clickSound = document.getElementById("clickSound");
  const themeToggle = document.getElementById("themeToggle");
  const toolCount = document.getElementById("toolCount");
  const sectionTitle = document.getElementById("sectionTitle");
  const resultCount = document.getElementById("resultCount");

  let workbookData = {};
  let currentSheet = null;

  const PALETTE = ['var(--acc-violet)','var(--acc-cyan)','var(--acc-amber)','var(--acc-rose)','var(--acc-blue)'];
  function accentFor(name){
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }

  const savedTheme = localStorage.getItem('candat_theme') || 'dark';
  document.body.setAttribute('data-theme', savedTheme);
  themeToggle.textContent = savedTheme === 'dark' ? '🌙' : '☀️';

  setTimeout(() => splash.style.opacity = "0", 750);
  setTimeout(() => splash.style.display = "none", 1150);

  themeToggle.addEventListener("click", () => {
    const next = document.body.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", next);
    themeToggle.textContent = next === "dark" ? "🌙" : "☀️";
    localStorage.setItem('candat_theme', next);
  });

  // Google Apps Script Web App URL
  const GOOGLE_SCRIPT_URL = 'ضع_رابط_WEB_APP_URL_هنا';

  fetch(GOOGLE_SCRIPT_URL)
    .then(resp => {
      if (!resp.ok) throw new Error("Network response was not ok");
      return resp.json();
    })
    .then(data => {
      workbookData = data;
      const sheetNames = Object.keys(data);
      toolCount.textContent = sheetNames.length;
      renderSheetList(sheetNames);
      if (sheetNames.length) showSheet(sheetNames[0]);
      else cardsGrid.innerHTML = '<div class="empty">الشيت فارغ أو لا يحتوي على بيانات قابلة للعرض.</div>';
    })
    .catch(error => {
      cardsGrid.innerHTML = '<div class="empty">⚠️ حدث خطأ أثناء جلب البيانات من Google Sheets.</div>';
      console.error("Error loading data:", error);
    });

  function renderSheetList(names) {
    sheetList.innerHTML = '';
    names.forEach(name => {
      const btn = document.createElement('div');
      btn.className = 'sheet-item';
      btn.style.setProperty('--accent', accentFor(name));
      btn.innerHTML = `<span class="chip"></span><span class="label">${escapeHtml(name)}</span>`;
      btn.addEventListener('click', () => showSheet(name));
      sheetList.appendChild(btn);
    });
  }

  function showSheet(name) {
    window.scrollTo({top:0,behavior:'smooth'});
    currentSheet = name;
    searchInput.value = '';
    document.querySelectorAll('.sheet-item').forEach(el => {
      const isActive = el.querySelector('.label').textContent === name;
      el.classList.toggle('active', isActive);
    });
    sectionTitle.textContent = name;
    renderCards(workbookData[name] || []);
  }

  function renderCards(items) {
    cardsGrid.innerHTML = '';
    const query = searchInput.value.trim();
    resultCount.textContent = `${items.length} نتيجة`;
    if (!items || !items.length) {
      cardsGrid.innerHTML = `<div class="empty">${query ? `لا توجد نتائج مطابقة لبحثك عن: <b>"${escapeHtml(query)}"</b> 🔍` : 'اختر شيت من القائمة للبدء 🚀'}</div>`;
      return;
    }
    items.forEach((item,index) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.setProperty('--accent', accentFor(item.sheet || currentSheet || ''));
      const displayContent = escapeHtml(item.content).replace(/\n/g,'<br>');
      card.innerHTML = `
        <div class="card-title">
          <span class="ext">رد</span>
          <span class="t">${escapeHtml(item.name)}</span>
        </div>
        <div class="card-content">
          <div class="frame">${displayContent}</div>
        </div>
        <div class="card-footer" data-original-text="${escapeHtml(item.sheet || currentSheet || '')}">
          <span class="path">${escapeHtml(item.sheet || currentSheet || '')}</span>
          <span class="cmd">انسخ ↗</span>
        </div>`;
      card.addEventListener('click', () => {
        const contentToCopy = item.content.replace(/\n/g, "\n<p>&nbsp;</p>\n");
        copyText(contentToCopy);
        playClick();
        const footer = card.querySelector('.card-footer');
        const original = footer.getAttribute('data-original-text');
        footer.innerHTML = ' تم النسخ ✅';
        footer.classList.add('copied');
        setTimeout(() => {
          footer.innerHTML = `<span class="path">${original}</span><span class="cmd">انسخ ↗</span>`;
          footer.classList.remove('copied');
        }, 1500);
      });
      cardsGrid.appendChild(card);
      setTimeout(() => card.classList.add('visible'), 35 + index*20);
    });
  }

  function escapeHtml(value){ return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

  function copyText(text) {
    navigator.clipboard.writeText(text).catch(() => {
      const temp=document.createElement('textarea'); temp.value=text; document.body.appendChild(temp); temp.select(); document.execCommand('copy'); temp.remove();
    });
  }
  function playClick(){ clickSound.currentTime=0; clickSound.play().catch(()=>{}); }

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) { if (currentSheet) showSheet(currentSheet); return; }
    document.querySelectorAll('.sheet-item').forEach(el => el.classList.remove('active'));
    const results=[];
    Object.keys(workbookData).forEach(sheetName => (workbookData[sheetName] || []).forEach(item => {
      const hay=(item.name+' '+item.content).toLowerCase();
      if(hay.includes(q)) results.push({...item,sheet:sheetName});
    }));
    sectionTitle.textContent='نتائج البحث';
    renderCards(results);
  });

});
