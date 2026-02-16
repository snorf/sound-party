(async function () {
  const tabsEl = document.getElementById('category-tabs');
  const gridContainer = document.getElementById('grid-container');
  const settingsBtn = document.getElementById('settings-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const speakerSelect = document.getElementById('speaker-select');
  const statusEl = document.getElementById('status');

  let data = null;
  let activeCategory = 0;
  let busy = false;

  // --- Load data ---
  try {
    const resp = await fetch('sounds.json');
    data = await resp.json();
  } catch {
    showStatus('Kunde inte ladda ljud');
    return;
  }

  // --- Build UI ---
  data.categories.forEach((cat, i) => {
    // Tab
    const tab = document.createElement('button');
    tab.className = 'tab' + (i === 0 ? ' active' : '');
    tab.textContent = cat.label;
    tab.style.background = i === 0 ? cat.color : '';
    tab.addEventListener('click', () => switchCategory(i));
    tabsEl.appendChild(tab);

    // Grid
    const grid = document.createElement('div');
    grid.className = 'grid' + (i === 0 ? ' active' : '');
    grid.dataset.category = i;

    cat.items.forEach((item) => {
      const tile = document.createElement('button');
      tile.className = 'tile' + (item.mystery ? ' mystery' : '');
      tile.style.background = item.mystery ? '' : cat.color;
      tile.innerHTML =
        '<span class="tile-emoji">' + item.emoji + '</span>' +
        '<span class="tile-label">' + item.label + '</span>';
      tile.addEventListener('click', () => handleTap(tile, cat, item));
      grid.appendChild(tile);
    });

    gridContainer.appendChild(grid);
  });

  // --- Settings toggle ---
  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
  });

  // --- Load speakers ---
  try {
    const resp = await fetch('/api/devices');
    if (resp.ok) {
      const devices = await resp.json();
      speakerSelect.innerHTML = '';
      const speakers = Object.values(devices).filter(
        (d) => d.class === 'speaker' || (d.virtualClass && d.virtualClass === 'speaker')
      );
      if (speakers.length === 0) {
        speakerSelect.innerHTML = '<option value="">Inga högtalare hittade</option>';
      } else {
        speakers.forEach((s) => {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = s.name;
          speakerSelect.appendChild(opt);
        });
      }
    }
  } catch {
    speakerSelect.innerHTML = '<option value="">Kunde inte ansluta</option>';
  }

  // --- Category switching ---
  function switchCategory(index) {
    activeCategory = index;
    tabsEl.querySelectorAll('.tab').forEach((t, i) => {
      const isActive = i === index;
      t.classList.toggle('active', isActive);
      t.style.background = isActive ? data.categories[i].color : '';
    });
    gridContainer.querySelectorAll('.grid').forEach((g) => {
      g.classList.toggle('active', Number(g.dataset.category) === index);
    });
  }

  // --- Tile tap handler ---
  async function handleTap(tile, category, item) {
    if (busy) return;
    busy = true;

    // Animate
    tile.classList.remove('pop');
    void tile.offsetWidth; // reflow
    tile.classList.add('pop');

    // Resolve mystery
    let command;
    if (item.mystery) {
      const realItems = category.items.filter((it) => !it.mystery);
      const pick = realItems[Math.floor(Math.random() * realItems.length)];
      command = pick.command;
      showStatus(pick.emoji + ' ' + pick.label);
    } else {
      command = item.command;
    }

    try {
      const resp = await fetch('/api/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      if (!resp.ok) throw new Error('Kunde inte spela ljud');
    } catch (err) {
      showStatus('Fel: ' + err.message);
    }

    setTimeout(() => {
      busy = false;
    }, 600);
  }

  // --- Status toast ---
  function showStatus(msg) {
    statusEl.textContent = msg;
    statusEl.classList.remove('hidden');
    clearTimeout(statusEl._timer);
    statusEl._timer = setTimeout(() => {
      statusEl.classList.add('hidden');
    }, 2500);
  }
})();
