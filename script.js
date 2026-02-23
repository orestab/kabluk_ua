import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. КОНФІГУРАЦІЯ FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyBExbeBYRDVqCQJSTTBfaClnFm9j3Pj4Dw",
    authDomain: "kablukshop-b4d83.firebaseapp.com",
    projectId: "kablukshop-b4d83",
    storageBucket: "kablukshop-b4d83.firebasestorage.app",
    messagingSenderId: "785435537015",
    appId: "1:785435537015:web:bee97d152252706694e072",
    measurementId: "G-ZZTSECBPM3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 2. СТАН ДОДАТКУ
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

// --- ПРИВ'ЯЗКА ФУНКЦІЙ ДО WINDOW (Щоб працювали onclick в HTML) ---

window.toggleFavorite = function(id, name, img, price) { // Додали price сюди
    const index = favorites.findIndex(f => f.id === id);
    if (index === -1) {
        // Додаємо ціну в об'єкт
        favorites.push({ id, name, img, price }); 
    } else {
        favorites.splice(index, 1);
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    updateCounters();
    updateFavPanel();
    renderProductsFromDB(); 
};
window.addToCartWithValidation = function(id, name, price, img) {
    const size = document.getElementById(`size-${id}`)?.value;
    if (!size) { alert("Будь ласка, оберіть розмір!"); return; }
    cart.push({ id, name, price, size, img });
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCounters();
    updateCartPanel();
    
    const cartPanel = document.getElementById('cart-panel');
    if (cartPanel) cartPanel.classList.add('active');
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'block';
};

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartPanel();
    updateCounters();
};

window.closePanels = () => { 
    document.querySelectorAll('.side-panel, .auth-panel').forEach(p => p.classList.remove('active')); 
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = 'auto';
};

window.handleLogout = () => { 
    localStorage.removeItem('currentUser'); 
    window.location.reload(); 
};

// --- ОСНОВНА ЛОГІКА ---

document.addEventListener('DOMContentLoaded', () => {
    renderProductsFromDB();
    setupPanels();
    updateCounters();
    setupAuthLogic();
    setupBurgerMenu();
});

async function renderProductsFromDB() {
    const containers = {
        catalog: document.getElementById('catalog-container'),
        men: document.getElementById('men-container'),
        women: document.getElementById('women-container'),
        sale: document.getElementById('sale-container')
    };

    // Очищуємо контейнери перед рендером
    Object.values(containers).forEach(c => { if(c) c.innerHTML = ""; });
    
    // Лічильники для перевірки порожніх секцій
    const counts = { catalog: 0, men: 0, women: 0, sale: 0 };

    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((docSnap) => {
            const p = docSnap.data();
            const id = docSnap.id;
            
            // Визначаємо, чи товар у вибраному
            const isFav = favorites.some(fav => fav.id === id);

            // 1. ЛОГІКА ЗОБРАЖЕННЯ
            // Беремо p.img, якщо порожньо — перше з масиву p.images, якщо і там пусто — заглушку
            let productImg = 'placeholder.jpg';
            if (p.img && p.img !== "") {
                productImg = p.img;
            } else if (p.images && p.images.length > 0) {
                productImg = p.images[0];
            }

            // 2. БЕЗПЕЧНА НАЗВА ТА ЦІНА
            // trim() прибирає зайві пробіли, replace екранує лапки для JS функцій
            const safeName = (p.name || "Без назви").trim().replace(/'/g, "\\'");
            const price = p.price || 0;

            // 3. СПИСОК РОЗМІРІВ
            let sizeOptions = `<option value="">ОБРАТИ РОЗМІР</option>`;
            if (p.sizes && Array.isArray(p.sizes) && p.sizes.length > 0) {
                p.sizes.forEach(size => {
                    sizeOptions += `<option value="${size}">${size.toUpperCase()}</option>`;
                });
            } else {
                sizeOptions += `<option value="Універсальний">Універсальний</option>`;
            }

            // 4. ГЕНЕРАЦІЯ HTML КАРТКИ
            const cardHTML = `
            <div class="product-card" data-category="${p.category || 'Інше'}">
                <div class="img-container">
                    <a href="product.html?id=${id}">
                        <img src="${productImg}" alt="${safeName}" onerror="this.src='placeholder.jpg'">
                    </a>
                    <button class="fav-btn ${isFav ? 'active' : ''}" 
                            onclick="window.toggleFavorite('${id}', '${safeName}', '${productImg}', '${price}')">
                        <img src="${isFav ? 'heart-filled.png' : 'heart-empty.png'}" class="heart-icon">
                    </button>
                    ${p.isSale ? '<span class="sale-badge">SALE</span>' : ''}
                </div>
                <div class="product-info">
                    <a href="product.html?id=${id}" style="text-decoration:none; color:inherit;">
                        <h3>${p.name}</h3>
                    </a>
                    <p class="price">${price} грн</p>
                    <select id="size-${id}" class="size-selector">${sizeOptions}</select>
                    <button class="buy-btn" onclick="window.addToCartWithValidation('${id}', '${safeName}', ${price}, '${productImg}')">В КОШИК</button>
                </div>
            </div>`;

            // 5. РОЗПОДІЛ ПО КОНТЕЙНЕРАХ
            if (containers.catalog) { 
                containers.catalog.innerHTML += cardHTML; 
                counts.catalog++; 
            }
            if (containers.men && (p.gender === 'Чоловіча' || p.gender === 'Унісекс')) { 
                containers.men.innerHTML += cardHTML; 
                counts.men++; 
            }
            if (containers.women && (p.gender === 'Жіноча' || p.gender === 'Унісекс')) { 
                containers.women.innerHTML += cardHTML; 
                counts.women++; 
            }
            if (containers.sale && p.isSale) { 
                containers.sale.innerHTML += cardHTML; 
                counts.sale++; 
            }
        });

        // ПЕРЕВІРКА НА ПОРОЖНІСТЬ (якщо товарів немає, показуємо текст)
        if (containers.catalog && counts.catalog === 0) {
            containers.catalog.innerHTML = `<p class="no-products">ТОВАРІВ ПОКИ НЕМАЄ</p>`;
        }
        if (containers.men && counts.men === 0) {
            containers.men.innerHTML = `<p class="no-products">ЧОЛОВІЧИХ ТОВАРІВ НЕМАЄ</p>`;
        }
        if (containers.women && counts.women === 0) {
            containers.women.innerHTML = `<p class="no-products">ЖІНОЧИХ ТОВАРІВ НЕМАЄ</p>`;
        }
        if (containers.sale && counts.sale === 0) {
            containers.sale.innerHTML = `<p class="no-products">АКЦІЙНИХ ТОВАРІВ НЕМАЄ</p>`;
        }

    } catch (e) { 
        console.error("Помилка завантаження товарів:", e); 
        if (containers.catalog) {
            containers.catalog.innerHTML = `<p class="no-products">Помилка з'єднання з базою даних</p>`;
        }
    }
}

function updateFavPanel() {
    const container = document.getElementById('fav-items');
    if (!container) return;
    if (favorites.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:40px; color:#888;">Ваш список порожній</div>`;
        return;
    }
    container.innerHTML = favorites.map(item => `
        <div class="item-row" style="display: flex; align-items: center; margin-bottom: 15px;">
            <a href="product.html?id=${item.id}">
                <img src="${item.img}" width="50" height="60" style="object-fit:cover; border-radius: 4px;">
            </a>
            <div style="flex-grow:1; margin-left:15px;">
                <a href="product.html?id=${item.id}" style="text-decoration:none; color:inherit;">
                    <b style="font-size: 14px; text-transform: uppercase;">${item.name}</b>
                </a><br>
                <span style="color: #333; font-weight: bold;">${item.price} грн</span> 
            </div>
            <button onclick="toggleFavorite('${item.id}', '${item.name}', '${item.img}', '${item.price}')" 
                    style="background:none; border:none; cursor:pointer; font-size:20px; color: #ccc;">
                &times;
            </button>
        </div>
    `).join('');
}

function updateCartPanel() {
    const container = document.getElementById('cart-items');
    const totalContainer = document.getElementById('cart-total'); // Місце для суми та кнопки
    let total = 0;

    if (!container) return;

    if (cart.length === 0) { 
        container.innerHTML = "<p style='text-align:center; padding:20px;'>Кошик порожній</p>"; 
        if (totalContainer) totalContainer.innerHTML = `Разом: 0 грн`;
        return; 
    }
    
    // Рендеримо список товарів
    container.innerHTML = cart.map((item, index) => {
        total += Number(item.price);
        return `<div class="item-row" style="display: flex; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
            <a href="product.html?id=${item.id}">
                <img src="${item.img}" width="50" style="border-radius: 4px; object-fit: cover;">
            </a>
            <div style="flex-grow:1; margin-left:10px;">
                <a href="product.html?id=${item.id}" style="text-decoration:none; color:inherit;">
                    <b style="text-transform: uppercase; font-size: 13px;">${item.name}</b>
                </a><br>
                <small>Розмір: ${item.size}</small><br>
                <b>${item.price} грн</b>
            </div>
            <button onclick="removeFromCart(${index})" style="color:red; background:none; border:none; cursor:pointer; font-size: 20px;">&times;</button>
        </div>`;
    }).join('');
    
    // Оновлюємо низ панелі: Сума + Кнопка оформити
    if (totalContainer) {
        totalContainer.innerHTML = `
            <div style="padding: 15px 0;">
                <div style="display:flex; justify-content:space-between; font-weight:bold; margin-bottom:15px;">
                    <span>РАЗОМ:</span>
                    <span>${total} грн</span>
                </div>
                <button id="checkout-btn" style="width:100%; padding:15px; background:#000; color:#fff; border:none; font-weight:bold; cursor:pointer; letter-spacing:1px;">
                    ОФОРМИТИ ЗАМОВЛЕННЯ
                </button>
            </div>
        `;

        // Додаємо подію кліку на новостворену кнопку
        document.getElementById('checkout-btn').onclick = () => {
            window.location.href = 'checkout.html';
        };
    }
}

function updateCounters() {
    if (document.getElementById('cart-count')) document.getElementById('cart-count').innerText = cart.length;
    if (document.getElementById('fav-count')) document.getElementById('fav-count').innerText = favorites.length;
    const mainHeart = document.getElementById('main-heart');
    if (mainHeart) mainHeart.src = favorites.length > 0 ? 'heart-filled.png' : 'heart-empty.png';
}

function setupPanels() {
    const favTrigger = document.getElementById('fav-trigger');
    const cartTrigger = document.getElementById('cart-trigger');
    const overlay = document.getElementById('overlay');

    if (favTrigger) favTrigger.onclick = () => { 
        updateFavPanel();
        document.getElementById('fav-panel').classList.add('active'); 
        overlay.style.display = 'block'; 
    };
    if (cartTrigger) cartTrigger.onclick = () => { 
        updateCartPanel(); 
        document.getElementById('cart-panel').classList.add('active'); 
        overlay.style.display = 'block'; 
    };
}

function setupAuthLogic() {
    const authTrigger = document.getElementById('auth-trigger');
    const profileDropdown = document.getElementById('profile-dropdown');
    const displayEmail = document.getElementById('display-email');

    if (authTrigger) {
        authTrigger.onclick = (e) => {
            e.preventDefault();
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            if (!currentUser) { window.location.href = 'login.html'; return; }

            if (displayEmail) displayEmail.innerText = currentUser.email;
            
            // Динамічне посилання на адмінку
            const oldLink = document.getElementById('admin-link');
            if (oldLink) oldLink.remove();

            if (currentUser.role === 'admin' && profileDropdown) {
                const adminLink = document.createElement('a');
                adminLink.id = 'admin-link';
                adminLink.href = 'admin.html';
                adminLink.innerText = 'АДМІН-ПАНЕЛЬ';
                adminLink.style.cssText = 'display:block; color:red; font-weight:bold; margin-bottom:10px; text-align:center; text-decoration:none; border-bottom:1px solid #eee; padding-bottom:5px;';
                profileDropdown.prepend(adminLink);
            }
            profileDropdown.classList.toggle('show');
        };
    }
}

function setupBurgerMenu() {
    const burgerBtn = document.getElementById('burger-trigger');
    const sidePanel = document.getElementById('side-panel');
    const overlay = document.getElementById('overlay');
    const closeBtn = document.getElementById('close-btn');

    if (burgerBtn && sidePanel) {
        burgerBtn.onclick = () => { sidePanel.classList.add('active'); overlay.style.display = 'block'; };
        const close = () => { sidePanel.classList.remove('active'); overlay.style.display = 'none'; };
        if (closeBtn) closeBtn.onclick = close;
        if (overlay) overlay.onclick = close;
    }
}

window.closePanels = function() {
    document.getElementById('cart-panel').classList.remove('active');
    document.getElementById('fav-panel').classList.remove('active');
    document.getElementById('side-panel').classList.remove('active');
    document.getElementById('overlay').style.display = 'none';
};

// Відкриття кошика
document.getElementById('cart-trigger').onclick = () => {
    document.getElementById('cart-panel').classList.add('active');
    document.getElementById('overlay').style.display = 'block';
};

// Відкриття Вибраного
document.getElementById('fav-trigger').onclick = () => {
    document.getElementById('fav-panel').classList.add('active');
    document.getElementById('overlay').style.display = 'block';
};


