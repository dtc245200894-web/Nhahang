const state = { user: null, page: 'overview', cart: {}, selectedTable: null };
let renderInProgress = false;
let renderRequested = false;
const $ = (selector) => document.querySelector(selector);
const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const dishImages = {
  'Cơm gà sốt tiêu': 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=600&q=85',
  'Cá hồi áp chảo': 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&q=85',
  'Mì Ý bò bằm': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&q=85',
  'Salad vườn xanh': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=85',
  'Khoai tây lắc': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=85',
  'Trà đào cam sả': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=85',
  'Nước ép dứa': 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&q=85',
  'Súp bí đỏ': 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=600&q=85',
  'Bò lúc lắc khoai tây': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=85',
  'Tôm nướng bơ tỏi': 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&q=85',
  'Gỏi cuốn tôm thịt': 'https://images.unsplash.com/photo-1562967916-eb82221dfb92?w=600&q=85',
  'Bánh xếp chiên': 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=600&q=85',
  'Trà chanh mật ong': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=85',
  'Sinh tố xoài': 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=600&q=85',
  'Cơm sườn nướng mật ong': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&q=85',
  'Mực nướng sa tế': 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&q=85',
  'Cơm chiên hải sản': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=85',
  'Đậu hũ chiên giòn': 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=600&q=85',
  'Nem rán': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=85',
  'Chè khúc bạch': 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&q=85',
  'Soda chanh bạc hà': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=85',
  'Cà phê sữa đá': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=85'
};
const dishIngredients = {
  'Cơm gà sốt tiêu': ['Thịt gà · 180 g', 'Sốt tiêu đen · 25 ml'],
  'Cá hồi áp chảo': ['Cá hồi · 200 g'],
  'Mì Ý bò bằm': ['Thịt bò · 150 g', 'Mì Ý · 120 g', 'Sốt cà chua · 80 ml'],
  'Salad vườn xanh': ['Rau xanh · 150 g'],
  'Khoai tây lắc': ['Khoai tây · 150 g'],
  'Tôm nướng bơ tỏi': ['Tôm · 180 g', 'Tỏi · 10 g'],
  'Cơm sườn nướng mật ong': ['Sườn heo · 220 g', 'Mật ong · 20 ml'],
  'Sinh tố xoài': ['Xoài · 180 g'],
  'Nước ép dứa': ['Dứa · 220 g'],
  'Cà phê sữa đá': ['Cà phê · 25 g', 'Sữa đặc · 30 ml']
};
const api = async (url, options = {}) => {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;
  if (!data) throw new Error(response.ok ? 'Máy chủ trả về dữ liệu không hợp lệ.' : `Máy chủ gặp lỗi (${response.status}).`);
  if (!response.ok) throw new Error(data.message || 'Có lỗi xảy ra.');
  return data;
};
const toast = (message) => { $('#toast').textContent = message; $('#toast').classList.add('show'); setTimeout(() => $('#toast').classList.remove('show'), 2600); };
function askCancelReservation(tableId) {
  document.querySelector('.confirm-modal')?.remove();
  const modal = document.createElement('div');
  modal.className = 'confirm-modal';
  modal.innerHTML = '<div class="confirm-card"><div class="confirm-icon">?</div><h3>Hủy đặt bàn?</h3><p>Bạn có chắc muốn xóa lịch đặt bàn này không?</p><div class="confirm-actions"><button type="button" class="confirm-cancel">Giữ lại</button><button type="button" class="confirm-delete">Xác nhận xóa</button></div></div>';
  document.body.append(modal);
  const close = () => modal.remove();
  modal.querySelector('.confirm-cancel').onclick = close;
  modal.querySelector('.confirm-delete').onclick = async () => { close(); await updateTable(tableId, 'cancel-reservation', 'Đã hủy đặt bàn.'); };
  modal.onclick = event => { if (event.target === modal) close(); };
}
async function openKitchenOrderModal(tableId) {
  try {
    const table = await api(`/api/tables/${tableId}`);
    const items = table.order?.items?.length ? table.order.items.map(item => `<li><span>${item.name}</span><strong>x${item.quantity}</strong></li>`).join('') : '<li class="empty-cart">Chưa có món nào trong đơn.</li>';
    document.querySelector('.confirm-modal')?.remove();
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.innerHTML = `
      <div class="confirm-card" style="max-width:540px; text-align:left;">
        <div class="confirm-icon">✓</div>
        <h3>${table.name}</h3>
        <p>Đơn đang phục vụ: kiểm tra món và xác nhận đã hoàn thành.</p>
        <ul class="kitchen-order-list" style="list-style:none;padding:0;margin:18px 0 0;display:grid;gap:10px;">${items}</ul>
        <div class="confirm-actions" style="justify-content:flex-end; margin-top:18px;">
          <button type="button" class="confirm-cancel">Đóng</button>
          <button type="button" class="confirm-delete">Xác nhận đã hoàn thành món</button>
        </div>
      </div>
    `;
    document.body.append(modal);
    const close = () => modal.remove();
    modal.querySelector('.confirm-cancel').onclick = close;
    modal.querySelector('.confirm-delete').onclick = async () => {
      try {
        const result = await api(`/api/tables/${tableId}/ready`, { method: 'POST' });
        toast(result.message);
        close();
        renderPage();
      } catch (error) {
        toast(error.message);
      }
    };
    modal.onclick = event => { if (event.target === modal) close(); };
  } catch (error) {
    toast(error.message);
  }
}
async function openPaymentInvoiceModal(tableId) {
  try {
    const table = await api(`/api/tables/${tableId}`);
    const order = table.order;
    if (!order) {
      toast('Không tìm thấy hóa đơn của bàn này.');
      return;
    }
    const rows = order.items?.length ? order.items.map(item => `<div class="invoice-item-detail"><img src="${dishImages[item.name] || ''}" alt="${item.name}"><div><strong>${item.name}</strong><small>${item.quantity} phần · ${money(item.price)}/phần</small></div><b>${money(item.price * item.quantity)}</b></div>`).join('') : '<p class="invoice-empty">Hóa đơn chưa có món.</p>';
    document.querySelector('.invoice-modal')?.remove();
    const modal = document.createElement('div');
    modal.className = 'invoice-modal';
    modal.innerHTML = `<div class="invoice-modal-card"><button class="invoice-modal-close" type="button">×</button><p class="eyebrow">HÓA ĐƠN THANH TOÁN</p><h2>${table.name}</h2><small>Đơn #${order.id}</small><div class="invoice-item-list">${rows}</div><div class="invoice-modal-total"><span>Tổng cộng</span><strong>${money(order.total)}</strong></div><button class="primary invoice-pay-button" type="button">Thanh toán</button><div class="payment-choices hidden"><p class="payment-choice-title">Chọn phương thức thanh toán</p><div class="payment-choice-buttons"><button type="button" data-payment="qr">QR nhà hàng</button><button type="button" data-payment="cash">Thanh toán tiền mặt</button></div><div class="restaurant-qr hidden"><img src="/static/restaurant-qr.png" alt="QR thanh toán nhà hàng"><p>Quét mã QR để thanh toán ${money(order.total)}.</p><button type="button" class="primary" data-qr-confirm>Xác nhận đã nhận thanh toán</button></div></div></div>`;
    document.body.append(modal);
    const close = () => modal.remove();
    const completePayment = async paymentMethod => {
      try {
        const result = await api(`/api/tables/${tableId}/pay`, { method: 'POST', body: JSON.stringify({ payment_method: paymentMethod }) });
        close();
        toast(result.message);
        renderPage();
      } catch (error) {
        toast(error.message);
      }
    };
    modal.querySelector('.invoice-modal-close').onclick = close;
    modal.querySelector('.invoice-pay-button').onclick = () => modal.querySelector('.payment-choices').classList.remove('hidden');
    modal.querySelector('[data-payment="cash"]').onclick = () => completePayment('cash');
    modal.querySelector('[data-payment="qr"]').onclick = () => modal.querySelector('.restaurant-qr').classList.remove('hidden');
    modal.querySelector('[data-qr-confirm]').onclick = () => completePayment('qr');
    modal.onclick = event => { if (event.target === modal) close(); };
  } catch (error) {
    toast(error.message);
  }
}
function askDeleteAccount(username) {
  document.querySelector('.confirm-modal')?.remove();
  const modal = document.createElement('div');
  modal.className = 'confirm-modal';
  modal.innerHTML = '<div class="confirm-card"><div class="confirm-icon">?</div><h3>Xóa tài khoản?</h3><p>Bạn có chắc muốn xóa tài khoản này không?</p><div class="confirm-actions"><button type="button" class="confirm-cancel">Giữ lại</button><button type="button" class="confirm-delete">Xác nhận xóa</button></div></div>';
  document.body.append(modal);
  const close = () => modal.remove();
  modal.querySelector('.confirm-cancel').onclick = close;
  modal.querySelector('.confirm-delete').onclick = async () => { close(); try { await api(`/api/users/${username}`, { method: 'DELETE' }); renderAccountApproval(); } catch (error) { toast(error.message); } };
  modal.onclick = event => { if (event.target === modal) close(); };
}
function askLogoutConfirmation() {
  document.querySelector('.confirm-modal')?.remove();
  const modal = document.createElement('div');
  modal.className = 'confirm-modal';
  modal.innerHTML = '<div class="confirm-card"><div class="confirm-icon">?</div><h3>Đăng xuất?</h3><p>Bạn có chắc muốn đăng xuất khỏi hệ thống không?</p><div class="confirm-actions"><button type="button" class="confirm-cancel">Ở lại</button><button type="button" class="confirm-delete">Đăng xuất</button></div></div>';
  document.body.append(modal);
  const close = () => modal.remove();
  modal.querySelector('.confirm-cancel').onclick = close;
  modal.querySelector('.confirm-delete').onclick = async () => { close(); try { await api('/api/logout', { method: 'POST' }); location.reload(); } catch (error) { toast(error.message); } };
  modal.onclick = event => { if (event.target === modal) close(); };
}
function updateShiftGreeting() {
  const hour = new Date().getHours();
  const period = hour < 5 ? 'buổi đêm' : hour < 12 ? 'buổi sáng' : hour < 18 ? 'buổi chiều' : 'buổi tối';
  const shift = hour < 5 ? 'Ca đêm' : hour < 12 ? 'Ca sáng' : hour < 18 ? 'Ca chiều' : 'Ca tối';
  const greeting = $('#shiftGreeting');
  if (greeting && state.user) greeting.innerHTML = `Chào <span>${period}</span>, <b>${state.user.name}</b> ✦ <small>${shift} đang hoạt động</small>`;
}
const originalRenderTables = renderTables;
renderTables = async function renderTablesLikeDemo() {
  const tables = await api('/api/tables');
  $('#page').innerHTML = `<div class="tables-heading"><div><p class="eyebrow">VẬN HÀNH</p><h1>Sơ đồ bàn</h1><p>Theo dõi trạng thái và mở đặt bàn.</p></div></div><div class="toolbar"><input id="tableSearch" placeholder="Tìm tên bàn..."><select id="tableFilter"><option value="all">Tất cả trạng thái</option><option value="free">Trống</option><option value="reserved">Đã đặt</option><option value="busy">Đang phục vụ</option><option value="waiting">Chờ thanh toán</option></select></div><section class="panel tables-panel"><div class="legend"><span><i class="free-dot"></i> Trống</span><span><i class="reserved-dot"></i> Đã đặt</span><span><i class="busy-dot"></i> Đang phục vụ</span><span><i class="waiting-dot"></i> Chờ thanh toán</span></div>${tableGrid(tables)}</section>`;
  const refresh = async () => { const result = await api(`/api/tables?search=${encodeURIComponent($('#tableSearch').value)}&status=${$('#tableFilter').value}`); document.querySelector('.tables-panel').innerHTML = `<div class="legend"><span><i class="free-dot"></i> Trống</span><span><i class="reserved-dot"></i> Đã đặt</span><span><i class="busy-dot"></i> Đang phục vụ</span><span><i class="waiting-dot"></i> Chờ thanh toán</span></div>${tableGrid(result)}`; bindTableActions(); };
  $('#tableSearch').oninput = refresh; $('#tableFilter').onchange = refresh; bindTableActions();
};
const originalRenderReservations = renderReservations;
renderReservations = async function renderReservationsLikeDemo() {
  await originalRenderReservations();
  $('#page').insertAdjacentHTML('afterbegin', '<div class="page-heading-like"><div><p class="eyebrow">TIẾP NHẬN ĐIỆN THOẠI</p><h1>Đặt bàn cho khách</h1><p>Nhập thông tin khách và xác nhận lịch đặt bàn.</p></div></div>');
};
const originalRenderMenu = renderMenu;
renderMenu = async function renderMenuLikeDemo() {
  await originalRenderMenu();
  $('#page').insertAdjacentHTML('afterbegin', '<div class="page-heading-like"><div><p class="eyebrow">DANH MỤC</p><h1>Thực đơn</h1><p>Món đang bán và tình trạng phục vụ.</p></div></div>');
    const decorateCards = async () => {
      const search = $('#menuSearch')?.value || '';
      const category = $('#menuCategory')?.value || 'all';
      const dishes = await api(`/api/menu?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`);
      document.querySelectorAll('#dishGrid .dish').forEach((card, index) => {
        const dish = dishes[index];
        if (!dish || card.dataset.decorated === 'true') return;
        card.dataset.decorated = 'true';
        card.querySelector('[data-add]')?.remove();
        const ingredients = dish.ingredients?.length ? dish.ingredients.map(item => `${item.name} · ${item.quantity < 1 ? Math.round(item.quantity * 1000) : item.quantity} ${item.quantity < 1 ? (item.unit === 'lít' ? 'ml' : 'g') : item.unit}`) : ['Chưa khai báo định lượng'];
        const block = document.createElement('div');
        block.className = 'ingredients-preview';
        block.innerHTML = `<span>NGUYÊN LIỆU · BẤM ĐỂ XEM ĐỊNH LƯỢNG</span><div>${ingredients.map(item => `<button type="button" data-ingredient="${item}">${item.split(' · ')[0]}</button>`).join('')}</div>`;
        const body = card.querySelector('.dish-body');
        const toggle = body?.querySelector('[data-availability]');
        body?.insertBefore(block, toggle || null);
        if (toggle) body.append(toggle);
        block.querySelectorAll('[data-ingredient]').forEach(button => button.onclick = () => toast(`${dish.name}: ${button.dataset.ingredient}`));
      });
    };
    const grid = $('#dishGrid');
    if (grid) new MutationObserver(() => decorateCards()).observe(grid, { childList: true });
    const bindAvailabilityButtons = () => document.querySelectorAll('[data-availability]').forEach(button => button.onclick = async () => {
      button.disabled = true;
      try {
        const currentlyAvailable = button.dataset.available === 'true' || button.dataset.available === '1';
        const result = await api(`/api/menu/${button.dataset.availability}/availability`, { method: 'PATCH', body: JSON.stringify({ available: !currentlyAvailable }) });
        toast(result.message);
        await originalRenderMenu();
        await decorateCards();
        bindAvailabilityButtons();
      } catch (error) {
        button.disabled = false;
        toast(error.message);
      }
    });
    bindAvailabilityButtons();
    decorateCards();
};
const originalRenderOrders = renderOrders;
renderOrders = async function renderOrdersLikeDemo() {
  await originalRenderOrders();
  $('#page').insertAdjacentHTML('afterbegin', '<div class="page-heading-like"><div><p class="eyebrow">GỌI MÓN</p><h1>Tạo đơn gọi món</h1><p>Chọn bàn và thêm món vào đơn.</p></div></div>');
};
function forceLightInterface() {
  document.documentElement.style.setProperty('color-scheme', 'light', 'important');
  document.body.style.setProperty('background-color', '#ffffff', 'important');
  document.querySelectorAll('.app,.sidebar,.main,.main header,.profile').forEach((element) => {
    element.style.setProperty('background-color', '#ffffff', 'important');
    element.style.setProperty('color', '#111111', 'important');
  });
  document.querySelector('.main').style.setProperty('background-image', "linear-gradient(rgba(255,255,255,.35),rgba(255,255,255,.35)),url('/static/login-background.jpg.jpg')", 'important');
  document.querySelector('.main').style.setProperty('background-size', 'cover', 'important');
  document.querySelector('.main').style.setProperty('background-position', 'center', 'important');
}
function applyOverviewPanelColors() {
  const colors = {
    '.dashboard-grid .table-panel': 'linear-gradient(135deg,#a9e0c4,#71be9d)',
    '.dashboard-grid .popular-panel': 'linear-gradient(135deg,#ffe289,#f4b870)',
    '.lower-grid .activity-panel': 'linear-gradient(135deg,#b1d2f4,#82aee0)',
    '.lower-grid .ai-callout': 'linear-gradient(135deg,#f7d86d,#82cfa5)',
    '.tables-panel': 'linear-gradient(135deg,#a9e0c4,#71be9d)'
  };
  Object.entries(colors).forEach(([selector, color]) => document.querySelectorAll(selector).forEach((element) => element.style.setProperty('background', color, 'important')));
}

async function login(event) {
  event.preventDefault();
  $('#loginError').textContent = '';
  try { const data = await api('/api/login', { method: 'POST', body: JSON.stringify({ username: $('#loginUsername').value.trim(), password: $('#loginPassword').value, role: $('#loginRole').value }) }); state.user = data.user; state.page = 'overview'; $('#authScreen').classList.add('hidden'); $('#authScreen').style.display = 'none'; $('#app').classList.remove('hidden'); $('#app').style.display = 'flex'; openApp(); }
  catch (error) { $('#loginError').textContent = error.message; }
}
async function register(event) {
  event.preventDefault();
  try { const data = await api('/api/register', { method: 'POST', body: JSON.stringify({ name: $('#registerName').value, username: $('#registerUsername').value, password: $('#registerPassword').value, phone: $('#registerPhone').value, role: $('#registerRole').value }) }); toast(data.message); $('#backLogin').click(); }
  catch (error) { $('#registerError').textContent = error.message; }
}
function openApp() { $('#authScreen').classList.add('hidden'); $('#app').classList.remove('hidden'); $('#profileName').textContent = state.user.name; $('#profileRole').textContent = state.user.role; const collapsed = localStorage.getItem('sidebar-collapsed') === 'true'; document.body.classList.toggle('sidebar-collapsed', collapsed); updateSidebarToggle(); forceLightInterface(); updateShiftGreeting(); setInterval(updateShiftGreeting, 60000); buildNavigation(); renderPage(); }
function updateSidebarToggle() { const button = $('#sidebarToggle'); if (!button) return; const collapsed = document.body.classList.contains('sidebar-collapsed'); button.textContent = collapsed ? '›' : '‹'; button.title = collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'; button.setAttribute('aria-label', button.title); }
function buildNavigation() {
  const labels = { overview: ['◇', 'Tổng quan'], tables: ['▦', 'Sơ đồ bàn'], reservations: ['◷', 'Đặt bàn'], menu: ['✦', 'Thực đơn'], orders: ['≡', 'Đơn gọi món'], reports: ['↗', 'Doanh thu'], invoices: ['▤', 'Hóa đơn'], ai: ['✳', 'Trợ lý AI'], accountApproval: ['✓', 'Quản lý tài khoản'], inventory: ['▤', 'Quản lý nguyên liệu'] };
  $('#navigation').innerHTML = Object.entries(labels).filter(([page]) => state.user && ({ manager: Object.keys(labels), server: ['overview', 'tables', 'orders', 'ai'], cashier: ['overview', 'reports', 'invoices'], kitchen: ['overview', 'tables'] }[state.user.role] || []).includes(page)).map(([page, [icon, label]]) => `<button class="nav-button ${page === state.page ? 'active' : ''}" data-page="${page}"><span class="nav-icon">${icon}</span><span class="nav-label">${label}</span>${page === 'ai' ? '<span class="nav-badge">mới</span>' : ''}</button>`).join('');
  document.querySelectorAll('[data-page]').forEach((button) => button.onclick = () => { state.page = button.dataset.page; renderPage(); });
}
function enforcePageAccess() {
  const pagesByRole = { manager: ['overview', 'tables', 'reservations', 'menu', 'orders', 'reports', 'invoices', 'activity', 'ai', 'accountApproval', 'inventory'], server: ['overview', 'tables', 'orders', 'ai'], cashier: ['overview', 'reports', 'invoices'], kitchen: ['overview', 'tables'] };
  const allowedPages = pagesByRole[state.user?.role] || [];
  if (!allowedPages.includes(state.page)) state.page = allowedPages[0] || 'overview';
}
function applyRoleRestrictions() {
  if (state.user?.role === 'cashier') {
    document.querySelectorAll('[data-page="orders"], [data-page="menu"], [data-page="tables"], [data-page="ai"]').forEach((element) => element.remove());
  }
  if (state.user?.role === 'kitchen') {
    document.querySelectorAll('[data-page="orders"], [data-page="menu"], [data-page="ai"]').forEach((element) => element.remove());
  }
}
function bindOverviewLinks() {
  document.querySelectorAll('button, a').forEach((element) => {
    if (!element.textContent.trim().startsWith('Xem tất cả')) return;
    if (state.user?.role !== 'manager') {
      element.remove();
      return;
    }
    element.onclick = () => {
      state.page = 'activity';
      renderPage();
    };
  });
}
async function renderPage() {
  if (renderInProgress) {
    renderRequested = true;
    return;
  }
  renderInProgress = true;
  try {
    do {
      renderRequested = false;
      enforcePageAccess();
      buildNavigation();
      try {
        await ({ overview: renderOverview, tables: renderTables, reservations: renderReservations, menu: renderMenu, orders: renderOrders, reports: renderReports, invoices: renderInvoices, activity: renderActivity, ai: renderAI, accountApproval: renderAccountApproval, inventory: renderInventory })[state.page]();
        forceLightInterface();
        applyOverviewPanelColors();
        applyRoleRestrictions();
        bindOverviewLinks();
      } catch (error) {
        toast(error.message);
      }
    } while (renderRequested);
  } finally {
    renderInProgress = false;
  }
}
async function renderOverview() { const stats = await api('/api/dashboard'); const tables = await api('/api/tables'); const dishes = await api('/api/menu'); const free = tables.filter(table => table.status === 'free').length; const busy = tables.filter(table => table.status === 'busy').length; const waiting = tables.filter(table => table.status === 'waiting').length; $('#page').innerHTML = `<div class="overview-heading"><div><p class="overview-date">${new Date().toLocaleDateString('vi-VN', {weekday:'long', day:'2-digit', month:'long', year:'numeric'})} <span>${new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</span></p><h1>Chào <span>buổi sáng</span>, <b>${state.user.name}</b> ✦</h1><p>Đây là tình hình nhà hàng trong ca hiện tại.</p></div><button class="primary overview-order" data-page="orders">+ Tạo đơn mới</button></div><div class="metrics"><div class="metric"><small>DOANH THU CA NÀY <i>↗ 12.8%</i></small><strong>${money(stats.revenue)}</strong><p>${stats.orders ? 'Đã ghi nhận trong ca' : 'Chưa có hóa đơn đã thanh toán trong ca'}</p><span class="sparkline">▁▃▂▅▆▇▅</span></div><div class="metric"><small>ĐƠN HÀNG <i>HÔM NAY</i></small><strong>${stats.orders}</strong><p>Đơn đã xác nhận</p><span class="mini-bars">▂▅▃▇▆█▇</span></div><div class="metric"><small>BÀN ĐANG PHỤC VỤ</small><strong>${String(stats.serving).padStart(2,'0')} <small>/ 18</small></strong><p>${Math.round(stats.serving / 18 * 100)}% công suất hiện tại</p><span class="capacity-line"></span></div><div class="metric"><small>GIÁ TRỊ ĐƠN TRUNG BÌNH</small><strong>${money(stats.average)}</strong><p>${stats.average ? 'Tính từ hóa đơn trong ca' : 'Chưa có dữ liệu thanh toán trong ca'}</p><span class="trend-line">╱╲╱╱╲╱╱╱</span></div></div><div class="dashboard-grid"><section class="panel table-panel"><div class="section-head"><div><h3>Sơ đồ bàn</h3><small>Cập nhật theo thời gian thực</small></div><button class="text-link" data-page="tables">Xem toàn bộ →</button></div><div class="legend"><span><i class="free-dot"></i> Trống ${free}</span><span><i class="busy-dot"></i> Đang phục vụ ${busy}</span><span><i class="waiting-dot"></i> Chờ thanh toán ${waiting}</span></div>${tableGrid(tables.slice(0, 12))}</section><section class="panel popular-panel"><div class="section-head"><div><h3>Món bán chạy</h3><small>Trong ca hiện tại</small></div><span class="more-dots">•••</span></div><div class="popular-grid">${dishes.slice(0,4).map(dish => `<article><img src="${dishImages[dish.name] || ''}" alt="${dish.name}"><div><b>${dish.name}</b><small>${dish.category}</small></div><em>${dish.sold} đơn</em></article>`).join('')}</div><button class="wide-link" data-page="menu">Xem thực đơn</button></section></div><div class="lower-grid"><section class="panel activity-panel"><div class="section-head"><div><h3>Hoạt động gần đây</h3><small>Thao tác mới nhất trong hệ thống</small></div><button class="text-link">Xem tất cả →</button></div><div class="activity-item"><b>✓</b><p><strong>Hệ thống đã sẵn sàng</strong><small>Các bàn và thực đơn đang được cập nhật</small></p><time>Vừa xong</time></div><div class="activity-item"><b>+</b><p><strong>${stats.orders ? 'Đơn hàng đã được ghi nhận' : 'Chưa có đơn mới'}</strong><small>Dữ liệu lấy từ SQLite backend</small></p><time>Hôm nay</time></div></section><section class="ai-callout"><span>✳</span><p class="eyebrow">BẾP NHÀ INTELLIGENCE</p><h2>Để AI giúp bạn <i>đọc vị</i> nhà hàng.</h2><p>Nhận gợi ý món, mô tả thực đơn và insight doanh thu trong vài giây.</p><button class="light-link" data-page="ai">Khám phá trợ lý AI →</button></section></div>`; document.querySelectorAll('#page [data-page]').forEach(button => button.onclick = () => { state.page = button.dataset.page; renderPage(); }); bindTableActions(); }
const tableGrid = (tables) => `<div class="table-grid">${tables.map(table => `<button class="table-tile ${table.status}" data-table-id="${table.id}" data-status="${table.status}">${table.name}<br><small>${({ free: 'Trống', reserved: 'Đã đặt', busy: 'Đang phục vụ', waiting: 'Chờ thanh toán' })[table.status]} · ${table.seats} chỗ</small></button>`).join('')}</div>`;
async function renderTables() { const tables = await api('/api/tables'); $('#page').innerHTML = `<div class="toolbar"><input id="tableSearch" placeholder="Tìm bàn..."><select id="tableFilter"><option value="all">Tất cả trạng thái</option><option value="free">Trống</option><option value="reserved">Đã đặt</option><option value="busy">Đang phục vụ</option><option value="waiting">Chờ thanh toán</option></select></div><section class="panel">${tableGrid(tables)}</section>`; $('#tableSearch').oninput = loadFilteredTables; $('#tableFilter').onchange = loadFilteredTables; bindTableActions(); }
async function loadFilteredTables() { const tables = await api(`/api/tables?search=${encodeURIComponent($('#tableSearch').value)}&status=${$('#tableFilter').value}`); $('.panel').innerHTML = tableGrid(tables); bindTableActions(); }
function bindTableActions() { document.querySelectorAll('[data-table-id]').forEach((button) => button.onclick = () => { state.selectedTable = Number(button.dataset.tableId); if (button.dataset.status === 'free') { if (state.user?.role === 'manager') { state.page = 'reservations'; renderPage(); } else { toast('Chỉ quản lý mới có quyền đặt bàn.'); } } else if (button.dataset.status === 'busy') { if (state.user?.role === 'kitchen') { openKitchenOrderModal(button.dataset.tableId); } else { toast('Chỉ nhân viên bếp mới xác nhận món đã hoàn tất.'); } } else if (button.dataset.status === 'waiting') { if (['manager', 'server'].includes(state.user?.role)) { openPaymentInvoiceModal(button.dataset.tableId); } else { toast('Chỉ quản lý và nhân viên phục vụ mới được thanh toán cho bàn chờ thanh toán.'); } } else if (button.dataset.status === 'reserved') { if (state.user?.role === 'manager') askCancelReservation(button.dataset.tableId); else toast('Chỉ quản lý mới có quyền quản lý đặt bàn.'); } }); }
async function updateTable(id, action, message) { try { await api(`/api/tables/${id}/${action}`, { method: 'POST' }); toast(message); renderPage(); } catch (error) { toast(error.message); } }
async function renderMenu() { const dishes = await api('/api/menu'); $('#page').innerHTML = `<div class="toolbar"><input id="menuSearch" placeholder="Tìm món ăn..."><select id="menuCategory"><option value="all">Tất cả nhóm</option><option>Khai vị</option><option>Món chính</option><option>Đồ uống</option></select></div><div class="dish-grid" id="dishGrid"></div>`; const refresh = async () => { const result = await api(`/api/menu?search=${encodeURIComponent($('#menuSearch').value)}&category=${encodeURIComponent($('#menuCategory').value)}`); $('#dishGrid').innerHTML = result.map(dish => `<article class="dish ${dish.available ? '' : 'sold-out-dish'}"><img src="${dishImages[dish.name] || ''}" alt="${dish.name}"><div class="dish-body"><span class="dish-category">${dish.category}</span><h4>${dish.name}</h4><p>${dish.description}</p><b>${money(dish.price)}</b><button class="availability-toggle ${dish.available ? '' : 'sold-out'}" data-availability="${dish.id}" data-available="${dish.available}">${dish.available ? 'Đang bán' : 'Hết món'}</button></div></article>`).join(''); document.querySelectorAll('[data-availability]').forEach(button => button.onclick = async () => { try { const result = await api(`/api/menu/${button.dataset.availability}/availability`, { method: 'PATCH', body: JSON.stringify({ available: button.dataset.available !== 'true' }) }); toast(result.message); refresh(); } catch (error) { toast(error.message); } }); }; $('#menuSearch').oninput = refresh; $('#menuCategory').onchange = refresh; await refresh(); }
async function renderReservations() { const tables = await api('/api/tables?status=free'); $('#page').innerHTML = `<section class="panel"><form id="reservationForm" class="form-grid"><label>Tên khách<input name="customer" required></label><label>Số điện thoại<input name="phone" required></label><label>Số khách<input name="guests" type="number" min="1" value="2" required></label><label>Ngày đến<input name="date" type="date" required></label><label>Giờ đến<input name="time" type="time" required></label><label>Bàn<select name="table_id" required>${tables.map(table => `<option value="${table.id}">${table.name} · ${table.seats} chỗ</option>`).join('')}</select></label><label style="grid-column:1/-1">Ghi chú<input name="note"></label><div class="form-actions" style="grid-column:1/-1"><button class="primary" type="submit">Xác nhận đặt bàn</button></div></form></section>`; if (state.selectedTable) $('#reservationForm select[name="table_id"]').value = String(state.selectedTable); $('#reservationForm').onsubmit = async (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.target)); try { const result = await api('/api/reservations', { method: 'POST', body: JSON.stringify(data) }); toast(result.message); state.selectedTable = null; state.page = 'tables'; renderPage(); } catch (error) { toast(error.message); } }; }
async function renderOrders() { const dishes = (await api('/api/menu')).filter(dish => dish.available); const tables = await api('/api/tables?status=free'); $('#page').innerHTML = `<div class="order-layout"><section class="panel order-menu-panel"><div class="order-toolbar"><input placeholder="Tìm món để thêm..."></div><div class="dish-grid">${dishes.map(dish => `<article class="dish"><img src="${dishImages[dish.name] || ''}" alt="${dish.name}"><div class="dish-body"><h4>${dish.name}</h4><b>${money(dish.price)}</b><button data-order-add="${dish.id}">+<span>Thêm</span></button></div></article>`).join('')}</div></section><aside class="panel cart"><p class="eyebrow">ĐƠN MỚI</p><h3>Chọn bàn phục vụ</h3><label>Bàn<select id="orderTable">${tables.map(table => `<option value="${table.id}">${table.name} · ${table.seats} chỗ</option>`).join('')}</select></label><div id="cartRows"></div><button class="primary" id="submitOrder">Xác nhận đơn →</button></aside></div>`; if (state.selectedTable) $('#orderTable').value = state.selectedTable; document.querySelectorAll('[data-order-add]').forEach(button => button.onclick = () => { state.cart[button.dataset.orderAdd] = (state.cart[button.dataset.orderAdd] || 0) + 1; updateCart(dishes); }); $('#submitOrder').onclick = async () => { try { const result = await api('/api/orders', { method: 'POST', body: JSON.stringify({ table_id: $('#orderTable').value, items: Object.entries(state.cart).map(([menu_id, quantity]) => ({ menu_id, quantity })) }) }); toast(result.message); state.cart = {}; state.page = 'tables'; renderPage(); } catch (error) { toast(error.message); } }; updateCart(dishes); }
function updateCart(dishes) { const items = Object.entries(state.cart); $('#cartRows').innerHTML = items.length ? items.map(([id, quantity]) => { const dish = dishes.find(item => item.id === Number(id)); return `<div class="cart-row"><span>${dish.name}</span><div class="cart-controls"><button type="button" data-cart-dec="${id}">−</button><b>${quantity}</b><button type="button" data-cart-inc="${id}">+</button><button type="button" class="cart-remove" data-cart-remove="${id}">×</button></div><strong>${money(dish.price * quantity)}</strong></div>`; }).join('') : '<p class="empty-cart">Đơn đang trống<br>Chọn món ở bên trái để bắt đầu.</p>'; document.querySelectorAll('[data-cart-inc]').forEach(button => button.onclick = () => { state.cart[button.dataset.cartInc]++; updateCart(dishes); }); document.querySelectorAll('[data-cart-dec]').forEach(button => button.onclick = () => { state.cart[button.dataset.cartDec]--; if (state.cart[button.dataset.cartDec] < 1) delete state.cart[button.dataset.cartDec]; updateCart(dishes); }); document.querySelectorAll('[data-cart-remove]').forEach(button => button.onclick = () => { delete state.cart[button.dataset.cartRemove]; updateCart(dishes); }); }
async function renderReports() { const stats = await api('/api/dashboard'); $('#page').innerHTML = `<section class="panel"><p class="eyebrow">DOANH THU ĐÃ GHI NHẬN</p><h1>${money(stats.revenue)}</h1><p>${stats.orders} hóa đơn · Giá trị trung bình ${money(stats.average)}</p></section>`; }
async function renderInvoices() {
  const invoices = await api('/api/invoices');
  const cards = invoices.map(invoice => {
    const items = invoice.items?.length ? invoice.items.map(item => `${item.name} x${item.quantity}`).join(', ') : 'Không có món';
    return `<article class="invoice-card"><div class="invoice-main"><strong>#${invoice.id}</strong><span>${invoice.table_name} · ${invoice.paid_at} · ${items}</span></div><b>${money(invoice.total)}</b><button class="invoice-detail-button" data-invoice="${invoice.id}">Chi tiết</button></article>`;
  }).join('');
  $('#page').innerHTML = `<div class="invoices-heading"><div><p class="eyebrow">GIAO DỊCH</p><h1>Hóa đơn đã thanh toán</h1><p>Theo dõi các giao dịch đã hoàn tất theo thời gian thực.</p></div></div><section class="invoices-panel"><div class="invoices-panel-head"><div><h3>Danh sách hóa đơn</h3><small>Cập nhật theo thời gian thực</small></div><strong>${invoices.length} hóa đơn</strong></div><div class="invoice-list">${cards || '<p class="invoice-empty">Chưa có hóa đơn đã thanh toán.</p>'}</div></section>`;
  document.querySelectorAll('.invoice-detail-button').forEach(button => button.onclick = async () => {
    const invoice = await api(`/api/invoices/${button.dataset.invoice}`);
    document.querySelector('.invoice-modal')?.remove();
    const rows = invoice.items?.length ? invoice.items.map(item => `<div class="invoice-item-detail"><img src="${dishImages[item.name] || ''}" alt="${item.name}"><div><strong>${item.name}</strong><small>${item.quantity} phần · ${money(item.price)}/phần</small></div><b>${money(item.price * item.quantity)}</b></div>`).join('') : '<p>Hóa đơn không có món.</p>';
    const modal = document.createElement('div');
    modal.className = 'invoice-modal';
    modal.innerHTML = `<div class="invoice-modal-card"><button class="invoice-modal-close" type="button">×</button><p class="eyebrow">CHI TIẾT HÓA ĐƠN #${invoice.id}</p><h2>${invoice.table_name}</h2><small>${invoice.paid_at}</small><div class="invoice-item-list">${rows}</div><div class="invoice-modal-total"><span>Tổng cộng</span><strong>${money(invoice.total)}</strong></div></div>`;
    document.body.append(modal);
    const close = () => modal.remove();
    modal.querySelector('.invoice-modal-close').onclick = close;
    modal.onclick = event => { if (event.target === modal) close(); };
  });
}
async function renderActivity() {
  const activities = await api('/api/activities');
  const rows = activities.length ? activities.map(activity => `<article class="activity-row"><div class="activity-icon">${activity.type === 'payment' ? '✓' : '+'}</div><div><strong>${activity.title}</strong><span>${activity.table_name} · ${activity.amount ? money(activity.amount) : 'Đang xử lý'}</span></div><time>${new Date(activity.occurred_at).toLocaleString('vi-VN')}</time></article>`).join('') : '<p class="activity-empty">Chưa có hoạt động nào.</p>';
  $('#page').innerHTML = `<div class="page-heading-like"><div><p class="eyebrow">NHẬT KÝ HỆ THỐNG</p><h1>Hoạt động gần đây</h1><p>Các đơn hàng và giao dịch mới nhất của nhà hàng.</p></div></div><section class="panel activity-history-panel"><div class="section-head"><div><h3>Tất cả hoạt động</h3><small>Cập nhật từ dữ liệu hệ thống</small></div><strong>${activities.length} hoạt động</strong></div><div class="activity-history-list">${rows}</div></section>`;
}
async function renderInventory() {
  const [items, dishes] = await Promise.all([api('/api/inventory'), api('/api/menu')]);
  const ingredientOptions = (selected = '') => items.map(item => `<option value="${item.id}" ${String(item.id) === String(selected) ? 'selected' : ''}>${item.name} (${item.unit})</option>`).join('');
  const recipeRows = (dish) => dish.ingredients.map(item => `<div class="recipe-row"><select required>${ingredientOptions(item.inventory_id)}</select><input type="number" min="0.001" step="0.001" value="${item.quantity}" required><button type="button" class="link-button recipe-remove">Xóa</button></div>`).join('');
  const recipeEditor = (dish) => `<form class="recipe-editor" data-menu-id="${dish.id}"><div class="section-head"><div><h3>${dish.name}</h3><small>${dish.category} · định lượng theo đơn vị kho</small></div><button class="primary" type="submit">Lưu định lượng</button></div><div class="recipe-rows">${recipeRows(dish) || '<p class="empty-cart">Chưa có định lượng.</p>'}</div><button type="button" class="link-button recipe-add">+ Thêm nguyên liệu</button></form>`;
  const inventoryRows = items.map(item => { const percent = item.initial > 0 ? Math.max(0, Math.min(100, Math.round(item.current / item.initial * 100))) : 0; const level = percent <= 20 ? 'low' : percent <= 50 ? 'medium' : 'good'; return `<tr><td>${item.name}</td><td>${item.unit}</td><td>${item.current}</td><td>${item.initial}</td><td><div class="stock-bar"><span class="stock-fill ${level}" style="width:${percent}%"></span></div><small class="stock-percent">${percent}%</small></td></tr>`; }).join('');
  $('#page').innerHTML = `<section class="panel inventory-panel"><div class="section-head"><div><p class="eyebrow">KHO NGUYÊN LIỆU</p><h3>Danh sách nguyên liệu</h3><small>Chỉ nguyên liệu trong danh sách này mới được dùng cho công thức.</small></div><div class="inventory-actions"><button class="link-button" id="resetInventory">Reset đầu ca</button><button class="primary inventory-add-button" id="openInventoryForm">+ Thêm nguyên liệu</button></div></div><input class="inventory-search" id="inventorySearch" placeholder="Tìm theo tên nguyên liệu, đơn vị..."><div class="inventory-table-wrap"><table class="data-table"><thead><tr><th>Nguyên liệu</th><th>Đơn vị</th><th>Còn lại</th><th>Đầu ca</th><th>Mức tồn kho</th></tr></thead><tbody>${inventoryRows}</tbody></table></div></section><section class="panel recipe-select-panel"><div class="section-head"><div><p class="eyebrow">THỰC ĐƠN</p><h3>Chỉnh định lượng món ăn</h3><small>Tìm và chọn một món để xem hoặc sửa công thức.</small></div></div><input class="recipe-search" id="recipeSearch" placeholder="Tìm tên món ăn..."><select class="recipe-dish-select" id="recipeDishSelect">${dishes.map(dish => `<option value="${dish.id}">${dish.name} · ${dish.category}</option>`).join('')}</select><div id="recipeEditorHost"></div></section>`;
  $('#inventorySearch').oninput = () => { const term = $('#inventorySearch').value.toLowerCase().trim(); document.querySelectorAll('.inventory-table-wrap tbody tr').forEach(row => { row.hidden = term && !row.textContent.toLowerCase().includes(term); }); };
  $('#openInventoryForm').onclick = () => {
    document.querySelector('.inventory-modal')?.remove();
    const modal = document.createElement('div');
    modal.className = 'inventory-modal';
    modal.innerHTML = '<form class="inventory-modal-card"><button type="button" class="inventory-modal-close">×</button><p class="eyebrow">KHO NGUYÊN LIỆU</p><h3>Thêm nguyên liệu</h3><label>Tên nguyên liệu<input name="name" required></label><label>Đơn vị<input name="unit" placeholder="kg, lít, chai..." required></label><label>Số lượng đầu ca<input name="initial" type="number" min="0" step="0.001" required></label><button class="primary" type="submit">Xác nhận thêm nguyên liệu</button></form>';
    document.body.append(modal);
    const close = () => modal.remove();
    modal.querySelector('.inventory-modal-close').onclick = close;
    modal.onclick = event => { if (event.target === modal) close(); };
    modal.querySelector('form').onsubmit = async event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.target)); try { const result = await api('/api/inventory', { method: 'POST', body: JSON.stringify(data) }); close(); toast(result.message); renderInventory(); } catch (error) { toast(error.message); } };
  };
  $('#resetInventory').onclick = async () => { try { const result = await api('/api/inventory/reset', { method: 'POST' }); toast(result.message); renderInventory(); } catch (error) { toast(error.message); } };
  const showRecipe = (dish) => { $('#recipeEditorHost').innerHTML = recipeEditor(dish); const form = $('#recipeEditorHost .recipe-editor'); form.querySelector('.recipe-add').onclick = () => { form.querySelector('.recipe-rows').insertAdjacentHTML('beforeend', `<div class="recipe-row"><select required>${ingredientOptions()}</select><input type="number" min="0.001" step="0.001" required><button type="button" class="link-button recipe-remove">Xóa</button></div>`); bindRecipeRemovers(form); }; form.onsubmit = async (event) => { event.preventDefault(); const ingredients = [...form.querySelectorAll('.recipe-row')].map(row => ({ inventory_id: row.querySelector('select').value, quantity: row.querySelector('input').value })); try { const result = await api(`/api/menu/${form.dataset.menuId}/recipe`, { method: 'PUT', body: JSON.stringify({ ingredients }) }); toast(result.message); } catch (error) { toast(error.message); } }; bindRecipeRemovers(form); };
  const updateRecipeChoices = () => { const term = $('#recipeSearch').value.toLowerCase().trim(); const filtered = dishes.filter(dish => dish.name.toLowerCase().includes(term)); $('#recipeDishSelect').innerHTML = filtered.map(dish => `<option value="${dish.id}">${dish.name} · ${dish.category}</option>`).join(''); if (filtered.length) showRecipe(filtered[0]); else $('#recipeEditorHost').innerHTML = '<p class="empty-cart">Không tìm thấy món ăn.</p>'; };
  $('#recipeSearch').oninput = updateRecipeChoices;
  $('#recipeDishSelect').onchange = () => { const dish = dishes.find(item => item.id === Number($('#recipeDishSelect').value)); if (dish) showRecipe(dish); };
  showRecipe(dishes[0]);
  function bindRecipeRemovers(form) { form.querySelectorAll('.recipe-remove').forEach(button => button.onclick = () => { button.closest('.recipe-row').remove(); }); }
}

async function renderReports() {
  const render = (report) => {
    const hasData = report.count > 0;
    const topDish = report.top_dish;
    const share = report.revenue && topDish ? Math.round((topDish.quantity / report.items.reduce((sum, item) => sum + item.quantity, 0)) * 100) : 0;
    const itemRows = report.items?.length ? report.items.map((item, index) => `<div class="insight-row"><span class="insight-rank">${index + 1}</span><b>${item.name}</b><span>${item.quantity} phần</span></div>`).join('') : '<p class="insight-empty">Chưa có món nào được thanh toán trong khoảng thời gian này.</p>';
    $('#page').innerHTML = `<div class="reports-heading"><div><p class="eyebrow">PHÂN TÍCH</p><h1>Doanh thu</h1><p>Hiệu suất kinh doanh trong ca tối.</p></div><select id="reportDays"><option value="1">Hôm nay</option><option value="7">7 ngày qua</option><option value="30">30 ngày qua</option></select></div><section class="revenue-panel"><div class="revenue-copy"><p class="eyebrow">DOANH THU THUẦN</p><strong>${money(report.revenue)}</strong><p>${hasData ? `${report.count} hóa đơn đã thanh toán` : 'Chưa có dữ liệu thanh toán'}</p></div><div class="revenue-chart"><div class="revenue-chart-line" style="width:${hasData ? '76%' : '0%'}"></div><small>${hasData ? `Trung bình ${money(report.average)}/hóa đơn` : 'Chưa có dữ liệu'}</small></div></section><section class="report-insight"><div class="insight-icon">✳</div><div class="insight-copy"><p class="eyebrow">AI INSIGHT</p><h3>${hasData ? `Đã ghi nhận ${report.count} hóa đơn` : 'Chưa có dữ liệu để phân tích'}</h3><p>${hasData ? `Món bán chạy nhất là <b>${topDish.name}</b> với ${topDish.quantity} phần, chiếm khoảng ${share}% tổng số phần đã bán.` : 'Hãy thanh toán một đơn hàng để báo cáo ghi nhận doanh thu thực tế.'}</p><div class="insight-list"><h4>Top món theo số lượng</h4>${itemRows}</div></div><button class="insight-action" id="reportInsightButton">Phân tích doanh thu →</button></section>`;
    $('#reportDays').value = String(report.days);
    $('#reportDays').onchange = async () => render(await api(`/api/reports?days=${$('#reportDays').value}`));
    $('#reportInsightButton').onclick = () => {
      const existing = document.querySelector('.analysis-detail');
      if (existing) {
        existing.remove();
        $('#reportInsightButton').textContent = 'Phân tích doanh thu →';
        return;
      }
      const detail = document.createElement('div');
      detail.className = 'analysis-detail';
      detail.innerHTML = hasData ? `<b>Kết luận phân tích</b><span>Doanh thu: ${money(report.revenue)}</span><span>Trung bình: ${money(report.average)}/hóa đơn</span><span>Dẫn đầu: ${topDish.name} (${topDish.quantity} phần)</span>` : '<b>Kết luận phân tích</b><span>Chưa đủ dữ liệu thanh toán để đưa ra kết luận.</span>';
      document.querySelector('.insight-copy').insertBefore(detail, document.querySelector('.insight-list'));
      toast(hasData ? `Phân tích: ${money(report.revenue)} doanh thu, ${report.count} hóa đơn. Món dẫn đầu: ${topDish.name}.` : 'Chưa có dữ liệu thanh toán để phân tích.');
      $('#reportInsightButton').textContent = 'Thu gọn phân tích ↑';
    };
  };
  render(await api('/api/reports?days=1'));
}
async function renderAI() {
  const dishes = await api('/api/menu');
  let selectedDish = dishes[0];
  $('#page').innerHTML = `<div class="ai-heading"><div><p class="eyebrow">BẾP NHÀ INTELLIGENCE</p><h1>Trợ lý AI <span>✳</span></h1><p>Một lớp tư duy thêm cho mọi quyết định trong ca.</p></div><strong>● AI mô phỏng đang sẵn sàng</strong></div><div class="ai-layout"><section class="ai-recommend-panel"><div class="ai-symbol">✦</div><p class="eyebrow">GỢI Ý MÓN</p><h2>Khách đang muốn ăn gì?</h2><p>Nhập nhu cầu để nhận combo phù hợp từ các món đang bán.</p><div class="form-grid"><label>Số người<input id="aiPeople" type="number" value="3" min="1"></label><label>Ngân sách (đ)<input id="aiBudget" type="number" value="250000" min="0"></label></div><label>Sở thích<textarea id="aiTaste">Ít cay, thích món nướng</textarea></label><button class="primary" id="recommendButton">Gợi ý món <span>✳</span></button><div id="recommendResult"></div></section><section class="ai-description-panel"><div class="ai-symbol ai-symbol-gold">Aa</div><p class="eyebrow">SINH MÔ TẢ MÓN</p><h2>Làm món ăn nổi bật hơn.</h2><p>Mô phỏng mô tả ngắn dựa trên dữ liệu thực đơn, không tự bịa thành phần.</p><label>Chọn món</label><div class="ai-dish-picker">${dishes.map(dish => `<button type="button" class="ai-dish-choice ${dish.id === selectedDish?.id ? 'selected' : ''}" data-ai-dish="${dish.id}"><img src="${dishImages[dish.name] || ''}" alt="${dish.name}"><span>${dish.name}</span></button>`).join('')}</div><div class="ai-selected-dish"><img src="${dishImages[selectedDish?.name] || ''}" alt="${selectedDish?.name || ''}"><div><b>${selectedDish?.name || 'Chưa chọn món'}</b><small>${selectedDish ? `${money(selectedDish.price)} · ${selectedDish.category}` : ''}</small></div></div><button class="ai-description-button" id="descriptionButton">Sinh mô tả <span>→</span></button><p class="ai-description-result" id="descriptionResult"></p></section></div>`;
  $('#aiBudget').parentElement.firstChild.textContent = 'Tổng ngân sách (đ)';
  $('#aiTaste').parentElement.firstChild.textContent = 'Sở thích / vị mong muốn';
  $('#aiTaste').placeholder = 'Ví dụ: ngọt, cay, chua, béo, thanh mát';
  $('.ai-recommend-panel > p:not(.eyebrow)').textContent = 'Ngân sách áp dụng cho cả nhóm; gợi ý đủ món chính theo số người.';
  document.querySelectorAll('[data-ai-dish]').forEach(button => button.onclick = () => { selectedDish = dishes.find(dish => dish.id === Number(button.dataset.aiDish)); document.querySelectorAll('[data-ai-dish]').forEach(item => item.classList.toggle('selected', item === button)); $('.ai-selected-dish').innerHTML = `<img src="${dishImages[selectedDish.name] || ''}" alt="${selectedDish.name}"><div><b>${selectedDish.name}</b><small>${money(selectedDish.price)} · ${selectedDish.category}</small></div>`; $('#descriptionResult').textContent = ''; });
  $('#recommendButton').onclick = async () => { try { const budget = Number($('#aiBudget').value); const result = await api('/api/ai/recommend', { method: 'POST', body: JSON.stringify({ people: $('#aiPeople').value, budget: $('#aiBudget').value, taste: $('#aiTaste').value }) }); const recommendations = result.recommendations || []; const total = recommendations.reduce((sum, dish) => sum + dish.line_total, 0); const emptyMessage = result.reason === 'budget' ? 'Không tìm thấy món phù hợp ngân sách.' : 'Không tìm thấy món phù hợp sở thích.'; $('#recommendResult').innerHTML = recommendations.length ? `<div class="ai-result"><b>Gợi ý phù hợp · ${money(total)} / ${money(budget)}</b><span>${recommendations.map(dish => `${dish.quantity} × ${dish.name} (${money(dish.line_total)})`).join(' · ')}</span></div>` : `<div class="ai-result">${emptyMessage}</div>`; } catch (error) { toast(error.message); } };
  $('#descriptionButton').onclick = async () => { if (!selectedDish) return; try { const result = await api('/api/ai/describe', { method: 'POST', body: JSON.stringify({ menu_id: selectedDish.id }) }); $('#descriptionResult').textContent = result.message; } catch (error) { toast(error.message); } };
}
async function renderAccountApproval() {
  const users = await api('/api/users');
  const roleNames = { manager: 'Quản lý', server: 'Nhân viên phục vụ', kitchen: 'Nhân viên bếp', cashier: 'Kế toán' };
  const userCard = user => `<article class="account-card"><div class="account-person"><strong>${user.name}</strong><small>${user.username}</small></div><b>${roleNames[user.role] || user.role}</b><span class="account-status ${user.status}">${user.status === 'active' ? 'Đang hoạt động' : user.status === 'pending' ? 'Chờ duyệt' : 'Đã từ chối'}</span><div class="account-actions">${user.role === 'manager' ? '<span>Tài khoản quản lý</span>' : user.status === 'pending' ? `<button class="account-approve" data-user-action="active" data-username="${user.username}">Duyệt</button><button class="account-reject" data-user-action="rejected" data-username="${user.username}">Từ chối</button>` : `<button class="account-delete" data-user-delete="${user.username}">Xóa tài khoản</button>`}</div></article>`;
  const pending = users.filter(user => user.status === 'pending');
  const existing = users.filter(user => user.status !== 'pending');
  const panel = (type, title, subtitle, list, placeholder) => `<section class="accounts-panel ${type}"><div class="accounts-head"><div><h3>${title}</h3><small>${subtitle}</small></div><strong>${list.length}</strong><input class="account-search" data-account-search="${type}" placeholder="${placeholder}"></div><div class="account-list" data-account-list="${type}">${list.length ? list.map(userCard).join('') : '<p class="account-empty">Không có tài khoản chờ duyệt.</p>'}</div></section>`;
  $('#page').innerHTML = `<div class="accounts-heading"><div><p class="eyebrow">PHÂN QUYỀN</p><h1>Quản lý tài khoản</h1><p>Theo dõi tài khoản chờ duyệt và các tài khoản đang có.</p></div></div>${panel('pending', 'Tài khoản chờ duyệt', `${pending.length} tài khoản đang chờ quản lý phê duyệt.`, pending, 'Tìm tài khoản chờ duyệt...')}${panel('existing', 'Các tài khoản đang có', `${existing.length} tài khoản đã được tạo.`, existing, 'Tìm theo tên, tài khoản hoặc quyền...')}`;
  document.querySelectorAll('.account-search').forEach(input => input.oninput = () => { const term = input.value.toLowerCase(); document.querySelectorAll(`[data-account-list="${input.dataset.accountSearch}"] .account-card`).forEach(card => { card.hidden = !card.textContent.toLowerCase().includes(term); }); });
  document.querySelectorAll('[data-user-action]').forEach(button => button.onclick = async () => { try { await api(`/api/users/${button.dataset.username}/status`, { method: 'PATCH', body: JSON.stringify({ status: button.dataset.userAction }) }); renderAccountApproval(); } catch (error) { toast(error.message); } });
  document.querySelectorAll('[data-user-delete]').forEach(button => button.onclick = () => askDeleteAccount(button.dataset.userDelete));
}

const originalRenderOverview = renderOverview;
renderOverview = async function renderRealtimeOverview() {
  await originalRenderOverview();
  const popular = await api('/api/menu/popular');
  const root = document.querySelector('.popular-grid');
  if (!root) return;
  root.innerHTML = popular.length ? popular.map(dish => `<article><img src="${dishImages[dish.name] || ''}" alt="${dish.name}"><div><b>${dish.name}</b><small>${dish.category}</small></div><em>${dish.shift_sold} đơn trong ca</em></article>`).join('') : '<p class="empty-popular">Chưa có món bán chạy trong ca.</p>';
};

$('#loginForm').onsubmit = login; $('#registerForm').onsubmit = register; $('#showRegister').onclick = () => { $('#loginForm').classList.add('hidden'); $('#showRegister').classList.add('hidden'); $('#registerForm').classList.remove('hidden'); }; $('#backLogin').onclick = () => { $('#registerForm').classList.add('hidden'); $('#loginForm').classList.remove('hidden'); $('#showRegister').classList.remove('hidden'); }; $('#sidebarToggle').onclick = () => { const collapsed = document.body.classList.toggle('sidebar-collapsed'); localStorage.setItem('sidebar-collapsed', collapsed); updateSidebarToggle(); }; $('#logout').onclick = askLogoutConfirmation;
