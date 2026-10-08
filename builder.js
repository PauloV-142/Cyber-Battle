const fallbackCatalog = {
  belts: [
    {
      id: 'belt-esteiras',
      name: 'Esteiras',
      type: 'belt',
      sprite: 'assets/tanks/belts/Track01.png',
      stats: { speed: 80, drag: 0.55, weight: 18, traction: 1 },
      display: { x: 0, y: 0, scaleX: 1.0, scaleY: 1.0 }
    },
    {
      id: 'belt-propulsores',
      name: 'Propulsores',
      type: 'belt',
      sprite: 'assets/tanks/belts/Track02.png',
      stats: { speed: 120, drag: 0.35, weight: 12, traction: 1.2 },
      display: { x: 0, y: 0, scaleX: 1.0, scaleY: 1.0 }
    }
  ],
  chassis: [
    {
      id: 'chassis-equilibrado',
      name: 'Equilibrado',
      type: 'chassis',
      sprite: 'assets/tanks/chasiss/Chassis01.png',
      stats: { hp: 110, weight: 55, armor: 1, resistance: 12 },
      display: { x: 0, y: 0, scaleX: 1.0, scaleY: 1.0 }
    },
    {
      id: 'chassis-leve',
      name: 'Leve',
      type: 'chassis',
      sprite: 'assets/tanks/chasiss/Chassis02.png',
      stats: { hp: 90, weight: 40, armor: 0.8, resistance: 9 },
      display: { x: 0, y: 0, scaleX: 1.0, scaleY: 1.0 }
    },
    {
      id: 'chassis-pesado',
      name: 'Pesado',
      type: 'chassis',
      sprite: 'assets/tanks/chasiss/Chassis03.png',
      stats: { hp: 150, weight: 75, armor: 1.4, resistance: 18 },
      display: { x: 0, y: 0, scaleX: 1.0, scaleY: 1.0 }
    }
  ],
  cannons: [
    {
      id: 'cannon-parabolica',
      name: 'Parabólica',
      type: 'cannon',
      sprite: 'assets/tanks/cannons/Cannon01.png',
      stats: { cooldown: 420, damage: 18, projectileSpeed: 300, projectileType: 'laser', spread: 0.08 },
      display: { x: 0, y: 0, scaleX: 1.0, scaleY: 1.0 }
    },
    {
      id: 'cannon-onda-de-choque',
      name: 'Onda de Choque',
      type: 'cannon',
      sprite: 'assets/tanks/cannons/Cannon02.png',
      stats: { cooldown: 260, damage: 14, projectileSpeed: 420, projectileType: 'shockwave', spread: 0.04 },
      display: { x: 0, y: 0, scaleX: 1.0, scaleY: 1.0 }
    },
    {
      id: 'cannon-rapido',
      name: 'Canhão Rápido',
      type: 'cannon',
      sprite: 'assets/tanks/cannons/Cannon03.png',
      stats: { cooldown: 120, damage: 9, projectileSpeed: 500, projectileType: 'bullet', spread: 0.12 },
      display: { x: 0, y: 0, scaleX: 1.0, scaleY: 1.0 }
    }
  ]
};

// preset
const state = {
  currentPlayer: 1,
  selections: {
    1: {
      belt: 'belt-propulsores',
      chassis: 'chassis-pesado',
      cannon: 'cannon-rapido'
    },
    2: {
      belt: 'belt-propulsores',
      chassis: 'chassis-pesado',
      cannon: 'cannon-onda-de-choque'
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

function computeTankStats(catalog, selection) {
  const belt = findPart(catalog, 'belt', selection.belt);
  const chassis = findPart(catalog, 'chassis', selection.chassis);
  const cannon = findPart(catalog, 'cannon', selection.cannon);

  const tank = {
    belt,
    chassis,
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

function renderPreview(player, stats) {
  const preview = document.createElement('div');
  preview.className = 'tank-preview';

  // The tank is symetrical, and the belt image is of a single belt, so we have to put twice belt images under the tank, to represent a real tank set of belts.
  const leftBelt = document.createElement('img');
  leftBelt.className = 'preview-layer preview-belt left';
  leftBelt.src = stats.belt.sprite;
  leftBelt.alt = stats.belt.name;
  const beltDisplay = stats.belt.display;
  leftBelt.style.left = `${beltDisplay.leftX}px`;
  leftBelt.style.top = `${beltDisplay.y}px`;
  leftBelt.style.transform = `scale(${beltDisplay.scaleX}, ${beltDisplay.scaleY})`;

  const rightBelt = document.createElement('img');
  rightBelt.className = 'preview-layer preview-belt right';
  rightBelt.src = stats.belt.sprite;
  rightBelt.alt = stats.belt.name;
  rightBelt.style.left = `${beltDisplay.leftX + beltDisplay.rightX}px`;
  rightBelt.style.top = `${beltDisplay.y}px`;
  rightBelt.style.transform = `scale(${beltDisplay.scaleX}, ${beltDisplay.scaleY})`;

  const chassis = document.createElement('img');
  chassis.className = 'preview-layer preview-chassis';
  chassis.src = stats.chassis.sprite;
  chassis.alt = stats.chassis.name;
  const chassisDisplay = stats.chassis.display;
  chassis.style.left = `${chassisDisplay.x}px`;
  chassis.style.top = `${chassisDisplay.y}px`;
  chassis.style.transform = `scale(${chassisDisplay.scaleX}, ${chassisDisplay.scaleY})`;

  const cannon = document.createElement('img');
  cannon.className = 'preview-layer preview-cannon';
  cannon.src = stats.cannon.sprite;
  cannon.alt = stats.cannon.name;
  const cannonDisplay = stats.cannon.display;
  cannon.style.left = `${cannonDisplay.x}px`;
  cannon.style.top = `${cannonDisplay.y}px`;
  cannon.style.transform = `scale(${cannonDisplay.scaleX}, ${cannonDisplay.scaleY})`;

  preview.appendChild(leftBelt);
  preview.appendChild(rightBelt);
  preview.appendChild(chassis);
  preview.appendChild(cannon);

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

  builderScreen.innerHTML = '';

  const frame = document.createElement('div');
  frame.className = 'builder-frame';

  const header = document.createElement('header');
  header.className = 'builder-header';
  header.innerHTML = `<h1>JOGADOR ${player}</h1>
    <div class="toolbar">
      <button type="button">Editar</button>
      <button type="button">Substituir</button>
      <button type="button">Animar</button>
      <button type="button">Posição</button>
    </div>`;

  const layout = document.createElement('div');
  layout.className = 'builder-layout';

  const left = document.createElement('section');
  left.className = 'panel panel-parts';

  const leftTitle = document.createElement('div');
  leftTitle.className = 'panel-title';
  leftTitle.textContent = 'PEÇAS';
  left.appendChild(leftTitle);

  renderPartGroup(left, 'ESTEIRAS', 'belt', catalog.belts, selection.belt);
  renderPartGroup(left, 'CHASSIS', 'chassis', catalog.chassis, selection.chassis);
  renderPartGroup(left, 'CANHÕES', 'cannon', catalog.cannons, selection.cannon);

  const right = document.createElement('aside');
  right.className = 'panel panel-preview';

  const previewCard = document.createElement('div');
  previewCard.className = 'preview-card';

  const previewBlock = renderPreview(player, stats);
  previewCard.appendChild(previewBlock.label);
  previewCard.appendChild(previewBlock.preview);
  previewCard.appendChild(previewBlock.statsWrap);

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
      window.startGameWithSelections({
        1: { ...state.selections[1] },
        2: { ...state.selections[2] }
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

async function initBuilder() {
  const catalog = await loadCatalog();
  window.__tankCatalog = catalog;
  render();
}

initBuilder();
