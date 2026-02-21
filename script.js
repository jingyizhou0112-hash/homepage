const menuItems = [
  { name: '拍黄瓜', desc: '蒜香酸辣，清爽开胃', price: 16, category: 'cold' },
  { name: '口水鸡', desc: '红油椒麻，川味经典', price: 32, category: 'cold' },
  { name: '宫保鸡丁', desc: '荔枝口，花生香脆', price: 36, category: 'hot' },
  { name: '麻婆豆腐', desc: '麻辣鲜香，超级下饭', price: 26, category: 'hot' },
  { name: '回锅肉', desc: '豆瓣浓香，家常硬菜', price: 42, category: 'hot' },
  { name: '蛋炒饭', desc: '锅气十足，颗粒分明', price: 18, category: 'staple' },
  { name: '担担面', desc: '芝麻香浓，微辣过瘾', price: 16, category: 'staple' },
  { name: '冰粉', desc: '红糖山楂，清甜解辣', price: 12, category: 'dessert' },
  { name: '红糖糍粑', desc: '外酥内糯，甜香满足', price: 18, category: 'dessert' },
  { name: '酸梅汤', desc: '冰镇酸甜，解腻清口', price: 10, category: 'drink' },
  { name: '茉莉茶', desc: '清香淡雅，餐后舒缓', price: 8, category: 'drink' },
];

const roomInput = document.querySelector('#roomId');
const applyRoomBtn = document.querySelector('#applyRoomBtn');
const syncBtn = document.querySelector('#syncBtn');
const menuList = document.querySelector('#menuList');
const selectedList = document.querySelector('#selectedList');
const wishList = document.querySelector('#wishList');
const wishName = document.querySelector('#wishName');
const addWishBtn = document.querySelector('#addWishBtn');
const tabs = document.querySelectorAll('.tab');
const switchBtns = document.querySelectorAll('.switch-btn');
const pages = { menu: document.querySelector('#menuPage'), wish: document.querySelector('#wishPage') };
const itemCount = document.querySelector('#itemCount');
const totalPrice = document.querySelector('#totalPrice');

const url = new URL(window.location.href);
let room = (url.searchParams.get('room') || 'A01').toUpperCase();
let selected = {};
let wishes = [];
roomInput.value = room;

function renderMenu(category = 'all') {
  menuList.innerHTML = '';
  const list = category === 'all' ? menuItems : menuItems.filter((x) => x.category === category);
  list.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'menu-item glass';
    card.innerHTML = `<div><h3 class="name">${item.name}</h3><p class="desc">${item.desc}</p><p class="price">¥${item.price}</p></div><button class="btn-primary add-btn">加入</button>`;
    card.querySelector('.add-btn').addEventListener('click', () => {
      const it = selected[item.name] || { name: item.name, price: item.price, qty: 0 };
      it.qty += 1;
      selected[item.name] = it;
      updateSummary();
    });
    menuList.appendChild(card);
  });
}

function renderWishes() {
  if (!wishes.length) {
    wishList.innerHTML = '<article class="wish-item glass"><span>还没有添加想吃菜品</span></article>';
    return;
  }
  wishList.innerHTML = wishes.map((name, idx) => `<article class="wish-item glass"><span>${name}</span><button class="btn-light" data-idx="${idx}">删除</button></article>`).join('');
  wishList.querySelectorAll('[data-idx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      wishes.splice(Number(btn.dataset.idx), 1);
      renderWishes();
    });
  });
}

function updateSummary() {
  const entries = Object.values(selected);
  const count = entries.reduce((sum, x) => sum + x.qty, 0);
  const total = entries.reduce((sum, x) => sum + x.qty * x.price, 0);
  itemCount.textContent = `${count} 项`;
  totalPrice.textContent = `¥${total}`;

  if (!entries.length && !wishes.length) {
    selectedList.innerHTML = '<article class="selected-card glass"><p class="selected-title">当前暂无已点菜品与想吃菜品</p></article>';
    return;
  }

  const lines = entries.map((x) => `<p class="selected-row"><span>${x.name} × ${x.qty}</span><strong>¥${x.qty * x.price}</strong></p>`).join('');
  const wishLines = wishes.map((x) => `<p class="selected-row"><span>${x}</span><em>想吃</em></p>`).join('');
  selectedList.innerHTML = `<article class="selected-card glass"><p class="selected-title">桌号 ${room} 汇总</p>${lines}${wishLines}</article>`;
}

async function fetchState() {
  const res = await fetch(`/api/state?room=${encodeURIComponent(room)}`);
  const data = await res.json();
  selected = {};
  (data.orderItems || data.items || []).forEach((x) => { selected[x.name] = { ...x }; });
  wishes = Array.isArray(data.wishItems) ? data.wishItems : [];
  renderWishes();
  updateSummary();
}

async function saveState() {
  await fetch('/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room, orderItems: Object.values(selected), wishItems: wishes }),
  });
}

function applyRoom() {
  room = (roomInput.value.trim() || 'A01').toUpperCase();
  const u = new URL(window.location.href);
  u.searchParams.set('room', room);
  history.replaceState({}, '', u);
  fetchState();
}

function switchPage(page) {
  switchBtns.forEach((b) => b.classList.toggle('active', b.dataset.page === page));
  Object.entries(pages).forEach(([key, el]) => el.classList.toggle('active', key === page));
}

applyRoomBtn.addEventListener('click', applyRoom);
syncBtn.addEventListener('click', saveState);
addWishBtn.addEventListener('click', () => {
  const name = wishName.value.trim();
  if (!name) return;
  if (!wishes.includes(name)) wishes.push(name);
  wishName.value = '';
  renderWishes();
  updateSummary();
});

tabs.forEach((tab) => tab.addEventListener('click', () => {
  tabs.forEach((t) => t.classList.remove('active'));
  tab.classList.add('active');
  renderMenu(tab.dataset.category);
}));

switchBtns.forEach((btn) => btn.addEventListener('click', () => switchPage(btn.dataset.page)));

renderMenu();
renderWishes();
fetchState();
setInterval(fetchState, 3000);
