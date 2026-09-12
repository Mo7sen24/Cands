document.addEventListener("DOMContentLoaded", () => {

  // 1. حماية DevTools
  if (typeof DisableDevtool !== 'undefined') {
    DisableDevtool({
      url: 'about:blank',
      disableMenu: true
    });
  }

  // 2. نظام تسجيل الدخول
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

  if (sessionStorage.getItem('candat_unlocked') === '1') {
    overlay.style.display = 'none';
    app.style.display = 'block';
    app.style.opacity = '1';
  }

  // 3. عناصر واجهة المستخدم
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

  // لوحة ألوان العناصر
  const PALETTE = ['var(--acc-violet)','var(--acc-cyan)','var(--acc-amber)','var(--acc-rose)','var(--acc-blue)'];
  function accentFor(name){
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }

  // الثيم (Dark / Light)
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

  // 4. جلب وقراءة ملف الإكسيل المحلي (candat_data.xlsx)
  const EXCEL_FILE_NAME = 'candat_data.xlsx';

  fetch(EXCEL_FILE_NAME)
    .then(resp => {
      if (!resp.ok) throw new Error("لم يتم العثور على ملف candat_data.xlsx في الفولدر");
      return resp.arrayBuffer();
    })
    .then(buffer => {
      const wb = XLSX.read(buffer, { type: "array" });
      handleWorkbook(wb);
    })
    .catch(error => {
      cardsGrid.innerHTML = `<div class="empty">⚠️ خطأ أثناء قراءة ملف الإكسيل: ${escapeHtml(error.message)}</div>`;
      console.error("Error loading Excel:", error);
    });

  // معالجة بيانات شيتات الإكسيل
  function handleWorkbook(wb) {
    workbookData = {};
    
    wb.SheetNames.forEach(sheetName => {
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      if (rows.length > 1) {
        // الصف الأول هيدر: العمود الأول (الاسم) والعمود الثاني (المحتوى)
        const items = rows.slice(1)
          .filter(row => row[0] || row[1])
          .map(row => ({
            name: row[0] ? String(row[0]) : 'بدون عنوان',
            content: row[1] ? String(row[1]) : '',
            sheet: sheetName
          }));
        
        if (items.length > 0) {
          workbookData[sheetName] = items;
        }
      }
    });

    const sheetNames = Object.keys(workbookData);
    toolCount.textContent = sheetNames.length;
    renderSheetList(sheetNames);

    if (sheetNames.length) {
      showSheet(sheetNames[0]);
    } else {
      cardsGrid.innerHTML = '<div class="empty">ملف الإكسيل فارغ أو لا يحتوي على بيانات صالحة.</div>';
    }
  }

  // 5. عرض قائمة الشيتات
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

  // 6. عرض شيت محدد
  function showSheet(name) {
    window.scrollTo({top: 0, behavior: 'smooth'});
    currentSheet = name;
    searchInput.value = '';
    document.querySelectorAll('.sheet-item').forEach(el => {
      const isActive = el.querySelector('.label').textContent === name;
      el.classList.toggle('active', isActive);
    });
    sectionTitle.textContent = name;
    renderCards(workbookData[name] || []);
  }

  // 7. بناء وعرض الكروت
  function renderCards(items) {
    cardsGrid.innerHTML = '';
    const query = searchInput.value.trim();
    resultCount.textContent = `${items.length} نتيجة`;
    
    if (!items || !items.length) {
      cardsGrid.innerHTML = `<div class="empty">${query ? `لا توجد نتائج مطابقة لبحثك عن: <b>"${escapeHtml(query)}"</b> 🔍` : 'اختر شيت من القائمة للبدء 🚀'}</div>`;
      return;
    }

    items.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.setProperty('--accent', accentFor(item.sheet || currentSheet || ''));
      const displayContent = escapeHtml(item.content).replace(/\n/g, '<br>');
      
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
      setTimeout(() => card.classList.add('visible'), 35 + index * 20);
    });
  }

  // 8. أدوات مساعدة (Copy / Sound / Escape)
  function escapeHtml(value) { 
    return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); 
  }

  function copyText(text) {
    navigator.clipboard.writeText(text).catch(() => {
      const temp = document.createElement('textarea');
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      temp.remove();
    });
  }

  function playClick() { 
    clickSound.currentTime = 0; 
    clickSound.play().catch(() => {}); 
  }

  // 9. محرك البحث اللحظي
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) { 
      if (currentSheet) showSheet(currentSheet); 
      return; 
    }
    
    document.querySelectorAll('.sheet-item').forEach(el => el.classList.remove('active'));
    const results = [];
    
    Object.keys(workbookData).forEach(sheetName => {
      (workbookData[sheetName] || []).forEach(item => {
        const hay = (item.name + ' ' + item.content).toLowerCase();
        if (hay.includes(q)) results.push({...item, sheet: sheetName});
      });
    });
    
    sectionTitle.textContent = 'نتائج البحث';
    renderCards(results);
  });

});
