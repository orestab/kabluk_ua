import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

// 1. Ініціалізація бази (безпечна)
let app;
try {
    app = getApp();
} catch (e) {
    const firebaseConfig = {
        apiKey: "AIzaSyBExbeBYRDVqCQJSTTBfaClnFm9j3Pj4Dw",
        authDomain: "kablukshop-b4d83.firebaseapp.com",
        projectId: "kablukshop-b4d83",
        storageBucket: "kablukshop-b4d83.firebasestorage.app",
        messagingSenderId: "785435537015",
        appId: "1:785435537015:web:bee97d152252706694e072"
    };
    app = initializeApp(firebaseConfig);
}
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');
let currentProduct = null;

// 2. Завантаження даних
async function loadProductDetails() {
    if (!productId) return;
    try {
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            currentProduct = { id: docSnap.id, ...docSnap.data() };
            renderProduct();
            attachProductEvents();
        }
    } catch (e) {
        console.error("Помилка завантаження:", e);
    }
}

// 3. Малювання сторінки
function renderProduct() {
    const p = currentProduct;
    const fields = {
        'p-name': p.name,
        'p-price': `${p.price} грн`,
        'main-product-img': p.img,
        'p-desc': p.description || "",
        'p-gender': p.gender || "-",
        'p-category': p.category || "-"
    };

    for (let id in fields) {
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === 'IMG') el.src = fields[id];
            else el.innerText = fields[id];
        }
    }

    const sizeSelect = document.getElementById('size-selector-main');
    if (sizeSelect) {
        sizeSelect.innerHTML = '<option value="">ОБЕРІТЬ РОЗМІР</option>';
        (p.sizes || []).forEach(s => {
            sizeSelect.innerHTML += `<option value="${s}">${s}</option>`;
        });
    }
    updateFavIcon();
}

// 4. ОЖИВЛЕННЯ КНОПОК
function attachProductEvents() {
    // КНОПКА КОШИКА
    const addBtn = document.getElementById('add-to-cart-main');
    if (addBtn) {
        addBtn.onclick = () => {
            const size = document.getElementById('size-selector-main').value;
            if (!size) {
                alert("Будь ласка, оберіть розмір!");
                return;
            }

            // Використовуємо функцію з твого script.js
            if (typeof window.addToCartWithValidation === 'function') {
                // Тимчасово підміняємо ID селектора, щоб скрипт його знайшов
                const tempSelect = document.getElementById('size-selector-main');
                tempSelect.id = `size-${currentProduct.id}`; 
                
                window.addToCartWithValidation(currentProduct.id, currentProduct.name, currentProduct.price, currentProduct.img);
                
                // Повертаємо ID назад
                tempSelect.id = 'size-selector-main';
            }
        };
    }

    // КНОПКА ЛАЙКУ (СЕРЦЕ)
    const favBtn = document.getElementById('fav-btn-main');
    if (favBtn) {
        favBtn.onclick = () => {
            if (typeof window.toggleFavorite === 'function') {
                window.toggleFavorite(currentProduct.id, currentProduct.name, currentProduct.img, currentProduct.price);
                updateFavIcon();
            }
        };
    }
}

// Оновлення іконки серця
function updateFavIcon() {
    const favs = JSON.parse(localStorage.getItem('favorites')) || [];
    const isFav = favs.some(f => f.id === productId);
    const icon = document.getElementById('fav-icon-main');
    if (icon) {
        icon.src = isFav ? 'heart-filled.png' : 'heart-empty.png';
    }
}

loadProductDetails();