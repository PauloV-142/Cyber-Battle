const DOWNLOAD_BUTTON_ENABLED = false;
const fallbackCatalog = {
  belts: [
    {
      id: 'belt-esteiras',
      name: 'Esteiras',
      type: 'belt',
      sprite: 'assets/tanks/belts/track01.png',
      stats: { speed: 80, drag: 0.55, weight: 18, traction: 1 },
      display: { x: 0, y: 0, scaleX: 1.0, scaleY: 1.0 }
    },
    {
      id: 'belt-propulsores',
      name: 'Propulsores',
      type: 'belt',
      sprite: 'assets/tanks/belts/track02.png',
      stats: { speed: 120, drag: 0.35, weight: 12, traction: 1.2 },
      display: { x: 0, y: 0, scaleX: 1.0, scaleY: 1.0 }
    }
  ],
  chassis: [
    {
      id: 'chassis-equilibrado',
      name: 'Equilibrado',
      type: 'chassis',
      sprite: 'assets/tanks/chasiss/chassis02.png',
      stats: { hp: 110, weight: 55, armor: 1, resistance: 12 },
      display: { x: 0, y: 0, scaleX: 1.0, scaleY: 1.0 }
    },
    {
      id: 'chassis-leve',
      name: 'Leve',
      type: 'chassis',
      sprite: 'assets/tanks/chasiss/chassis01.png',
      stats: { hp: 90, weight: 40, armor: 0.8, resistance: 9 },
      display: { x: 0, y: 0, scaleX: 1.0, scaleY: 1.0 }
    }
  ],
  cannons: [
    {
      id: 'cannon-parabolica',
      name: 'Parabólica',
      type: 'cannon',
      sprite: 'assets/tanks/cannons/cannon01.png',
      stats: { cooldown: 420, damage: 18, projectileSpeed: 300, projectileType: 'laser', spread: 0.08 },
      display: { x: 0, y: 0, scaleX: 1.0, scaleY: 1.0 }
    },
    {
      id: 'cannon-onda-de-choque',
      name: 'Onda de Choque',
      type: 'cannon',
      sprite: 'assets/tanks/cannons/cannon02.png',
      stats: { cooldown: 260, damage: 14, projectileSpeed: 420, projectileType: 'shockwave', spread: 0.04 },
      display: { x: 0, y: 0, scaleX: 1.0, scaleY: 1.0 }
    },
    {
      id: 'cannon-rapido',
      name: 'Canhão Rápido',
      type: 'cannon',
      sprite: 'assets/tanks/cannons/cannon03.png',
      stats: { cooldown: 120, damage: 9, projectileSpeed: 500, projectileType: 'bullet', spread: 0.12 },
      display: { x: 0, y: 0, scaleX: 1.0, scaleY: 1.0 }
    }
  ],
  turrets: [
    {
      id: 'turret-leve',
      name: 'Leve',
      type: 'turret',
      sprite: 'assets/tanks/chasiss/turret01.png',
      stats: { weight: 20 },
      display: { x: 0, y: -15, scaleX: 0.5, scaleY: 0.5 }
    },
    {
      id: 'turret-equilibrada',
      name: 'Equilibrada',
      type: 'turret',
      sprite: 'assets/tanks/chasiss/turret02.png',
      stats: { weight: 28 },
      display: { x: 0, y: -10, scaleX: 0.45, scaleY: 0.45 }
    },
    {
      id: 'turret-pesada',
      name: 'Pesada',
      type: 'turret',
      sprite: 'assets/tanks/chasiss/turret03.png',
      stats: { weight: 36 },
      display: { x: 0, y: -12, scaleX: 0.5, scaleY: 0.5 }
    }
  ]
};

// preset
const state = {
  currentPlayer: 1,
  selections: {
    1: {
      belt: 'belt-esteiras',
      turret: 'turret-equilibrada',
      chassis: 'chassis-leve',
      cannon: 'cannon-parabolica'
    },
    2: {
      belt: 'belt-esteiras',
      turret: 'turret-equilibrada',
      chassis: 'chassis-leve',
      cannon: 'cannon-parabolica'
    }
  }
};

async function loadCatalog() {
  try {
    const response = await fetch('assets/tanks/parts.json');
    if (!response.ok) throw new Error('Failed to load catalog');
    return await response.json();
  } catch (error) {
    console.warn('Using fallback part catalog', error);
    return fallbackCatalog;
  }
}

function findPart(catalog, type, id) {
  const list = catalog[type + 's'] || catalog[type];
  return list.find((item) => item.id === id);
}

function getPartCode(part) {
  const filename = part.sprite.split('/').pop() || '';
  const code = filename.replace(/\D/g, '');
  if (code.length !== 2) {
    throw new Error(`Invalid part code in sprite path: ${part.sprite}`);
  }
  return code;
}

function getPresetSpritePath(catalog, selection) {
  const cannon = findPart(catalog, 'cannon', selection.cannon);
  const turret = findPart(catalog, 'turret', selection.turret);
  const chassis = findPart(catalog, 'chassis', selection.chassis);
  const belt = findPart(catalog, 'belt', selection.belt);

  if (!cannon || !turret || !chassis || !belt) {
    throw new Error('Preset selection contains an unknown tank part');
  }

  const code = [cannon, turret, chassis, belt].map(getPartCode).join('');
  return `assets/preset-sprites/version02/CyberAssets/tank${code}.png`;
}

function computeTankStats(catalog, selection) {
  const belt = findPart(catalog, 'belt', selection.belt);
  const chassis = findPart(catalog, 'chassis', selection.chassis);
  const turret = findPart(catalog, 'turret', selection.turret);
  const cannon = findPart(catalog, 'cannon', selection.cannon);

  const tank = {
    belt,
    chassis,
    turret,
    cannon,
    speed: belt.stats.speed,
    drag: belt.stats.drag,
    weight: chassis.stats.weight,
    armor: chassis.stats.armor,
    hp: chassis.stats.hp,
    cooldown: cannon.stats.cooldown,
    damage: cannon.stats.damage,
    projectileSpeed: cannon.stats.projectileSpeed,
    projectileType: cannon.stats.projectileType
  };

  console.log(tank);
  return tank;
}

function buildFinishedTank(catalog, selection) {
  const stats = computeTankStats(catalog, selection);

  return {
    ...selection,
    ...stats,
    id: `${selection.belt}__${selection.turret}__${selection.chassis}__${selection.cannon}`,
    rotationSpeed: 2,
    muzzleOffset: 86,
    projectile: {
      image: 'ball_projectile',
      damage: stats.damage,
      speed: stats.projectileSpeed,
      lifetime: 1800,
      owner: undefined,
      hitbox: undefined
    },
    canon: {
      cooldown: stats.cooldown
    }
  };
}

function renderPartGroup(container, groupTitle, type, items, selectedId) {
  const group = document.createElement('div');
  group.className = 'part-group';

  const header = document.createElement('div');
  header.className = 'group-title';
  header.textContent = groupTitle;
  group.appendChild(header);

  const cards = document.createElement('div');
  cards.className = 'part-grid';

  items.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `part-card ${selectedId === item.id ? 'selected' : ''}`;
    button.dataset.type = type;
    button.dataset.id = item.id;
    button.innerHTML = `
      <img src="${item.sprite}" alt="${item.name}" />
      <span>${item.name}</span>
    `;

    button.addEventListener('click', () => {
      state.selections[state.currentPlayer][type] = item.id;
      render();
    });

    cards.appendChild(button);
  });

  group.appendChild(cards);
  container.appendChild(group);
}

function clampStat(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function renderProgress(label, value, min, max, theme) {
  const wrapper = document.createElement('div');
  wrapper.className = 'stat-row';

  const top = document.createElement('div');
  top.className = 'stat-head';
  top.innerHTML = `<span>${label}</span><span>${value}</span>`;

  const bar = document.createElement('div');
  bar.className = 'stat-bar';

  const meter = document.createElement('div');
  meter.className = `stat-fill ${theme}`;
  const percent = ((value - min) / (max - min)) * 100;
  meter.style.width = `${clampStat(percent, 8, 100)}%`;

  bar.appendChild(meter);
  wrapper.appendChild(top);
  wrapper.appendChild(bar);
  return wrapper;
}

const previewCenter = { x: 0, y: 0 };
const previewLayout = {
  belt: { width: 26, height: 108 },
  chassis: { width: 84, height: 136 },
  turret: { width: 70, height: 70 },
  cannon: { width: 32, height: 88 }
};

function positionPreviewLayer(layer, type, display, xOffset = 0, yScale = 0.35) {
  const size = previewLayout[type];
  layer.style.width = `${size.width}px`;
  layer.style.height = `${size.height}px`;
  layer.style.left = `calc(50% + ${previewCenter.x + xOffset}px)`;
  layer.style.top = `calc(50% + ${previewCenter.y + display.y * yScale}px)`;
  layer.style.marginLeft = '0';
  layer.style.scale = '1';
  layer.style.transform = 'translate(-50%, -50%)';
}

function renderPreview(player, stats, presetPath) {
  const preview = document.createElement('div');
  preview.className = 'tank-preview';

  const sprite = document.createElement('img');
  sprite.className = 'preview-layer preview-preset';
  sprite.src = presetPath;
  sprite.alt = 'Selected tank preset';
  preview.appendChild(sprite);

  const label = document.createElement('div');
  label.className = 'preview-title';
  label.textContent = `Jogador ${player}`;

  const statsWrap = document.createElement('div');
  statsWrap.className = 'stat-panel';

  statsWrap.appendChild(renderProgress('Velocidade', stats.speed, 40, 140, 'cyan'));
  statsWrap.appendChild(renderProgress('Escudos', Math.round(stats.armor * 100), 50, 160, 'green'));
  statsWrap.appendChild(renderProgress('Energia', stats.damage * 4, 30, 120, 'orange'));
  statsWrap.appendChild(renderProgress('Arresto', Math.round(stats.drag * 100), 20, 90, 'mint'));
  statsWrap.appendChild(renderProgress('Peso', stats.weight, 20, 100, 'yellow'));

  return { preview, label, statsWrap };
}

function render() {
  const builderScreen = document.getElementById('builder-screen');
  if (!builderScreen) return;

  const catalog = window.__tankCatalog || fallbackCatalog;
  const player = state.currentPlayer;
  const selection = state.selections[player];
  const stats = computeTankStats(catalog, selection);
  let presetPath;
  try {
    presetPath = getPresetSpritePath(catalog, selection);
  } catch (error) {
    console.error('Failed to resolve selected tank preset', error);
    presetPath = '';
  }

  builderScreen.innerHTML = '';

  const frame = document.createElement('div');
  frame.className = 'builder-frame';

  const header = document.createElement('header');
  header.className = 'builder-header';
  header.innerHTML = `<h1>JOGADOR ${player}</h1>`;

  const layout = document.createElement('div');
  layout.className = 'builder-layout';

  const left = document.createElement('section');
  left.className = 'panel panel-parts';

  const leftTitle = document.createElement('div');
  leftTitle.className = 'panel-title';
  leftTitle.textContent = 'PEÇAS';
  left.appendChild(leftTitle);

  renderPartGroup(left, 'CANNON', 'cannon', catalog.cannons, selection.cannon);
  renderPartGroup(left, 'TURRET', 'turret', catalog.turrets, selection.turret);
  renderPartGroup(left, 'CHASSIS', 'chassis', catalog.chassis, selection.chassis);
  renderPartGroup(left, 'TRACKS', 'belt', catalog.belts, selection.belt);

  const right = document.createElement('aside');
  right.className = 'panel panel-preview';

  const previewCard = document.createElement('div');
  previewCard.className = 'preview-card';

  const previewBlock = renderPreview(player, stats, presetPath);
  previewCard.appendChild(previewBlock.label);
  previewCard.appendChild(previewBlock.preview);
  previewCard.appendChild(previewBlock.statsWrap);

  if (DOWNLOAD_BUTTON_ENABLED) {
    // Download preset sprite button
    const downloadBtn = document.createElement('button');
    downloadBtn.type = 'button';
    downloadBtn.className = 'primary-btn';
    downloadBtn.style.height = '48px';
    downloadBtn.style.fontSize = '0.9rem';
    downloadBtn.textContent = 'BAIXAR SPRITE';
    downloadBtn.addEventListener('click', async () => {
      const sel = state.selections[player];
      const filename = `${sel.belt}__${sel.turret}__${sel.chassis}__${sel.cannon}.png`;
      try {
        await capturePreviewToPNG(previewBlock.preview, filename);
        console.log('Downloaded', filename);
      } catch (err) {
        console.error('Failed to download sprite', err);
      }
    });
    previewCard.appendChild(downloadBtn);
  }
  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'primary-btn';
  action.textContent = player === 1 ? 'PRÓXIMO' : 'INICIAR';
  action.addEventListener('click', () => {
    if (player === 1) {
      state.currentPlayer = 2;
      render();
      return;
    }

    console.log('Build finalizado', state.selections);
    if (window.startGameWithSelections) {
      const tankCatalog = window.__tankCatalog || fallbackCatalog;
      window.startGameWithSelections({
        1: { ...state.selections[1], tank: buildFinishedTank(tankCatalog, state.selections[1]) },
        2: { ...state.selections[2], tank: buildFinishedTank(tankCatalog, state.selections[2]) }
      });
      return;
    }

    console.warn('startGameWithSelections is not defined. main.js is probably not loaded.');
  });

  right.appendChild(previewCard);
  right.appendChild(action);

  layout.appendChild(left);
  layout.appendChild(right);
  frame.appendChild(header);
  frame.appendChild(layout);
  builderScreen.appendChild(frame);
}

// Capture the preview DOM node and save it as PNG using canvas
async function capturePreviewToPNG(previewNode, filename) {
  if (!previewNode) throw new Error('Missing preview node');

  // Ensure layout is up-to-date
  const parentRect = previewNode.getBoundingClientRect();
  const width = Math.ceil(parentRect.width);
  const height = Math.ceil(parentRect.height);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Fill transparent background
  ctx.clearRect(0, 0, width, height);

  // Collect layered images in DOM order (they are already appended in the correct order)
  const layers = Array.from(previewNode.querySelectorAll('.preview-layer'));

  // Load images sequentially and draw
  for (const el of layers) {
    if (!(el instanceof HTMLImageElement)) continue;
    const imgRect = el.getBoundingClientRect();
    const x = Math.round(imgRect.left - parentRect.left);
    const y = Math.round(imgRect.top - parentRect.top);
    const w = Math.round(imgRect.width);
    const h = Math.round(imgRect.height);

    await new Promise((resolve, reject) => {
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => {
        try {
          ctx.drawImage(im, x, y, w, h);
          resolve();
        } catch (e) { reject(e); }
      };
      im.onerror = reject;
      im.src = el.src;
    });
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Failed to create blob'));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}

async function initBuilder() {
  const catalog = await loadCatalog();
  window.__tankCatalog = catalog;
  render();
}

initBuilder();
