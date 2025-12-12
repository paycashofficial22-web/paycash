// app.js

// **********************************************************
// STEP 1: FIREBASE CONFIGURATION (Aapke project ki keys shamil hain)
// **********************************************************
const firebaseConfig = {
    apiKey: "AIzaSyC-Hy8VMaw471sxHt3jStxEyyEOTsOjoY0",
    authDomain: "paycash-92256.firebaseapp.com",
    databaseURL: "https://paycash-92256-default-rtdb.firebaseio.com",
    projectId: "paycash-92256",
    storageBucket: "paycash-92256.firebasestorage.app",
    messagingSenderId: "690964863262",
    appId: "1:690964863262:web:800a7c905ee23cd99d910f",
    measurementId: "G-5JPB45M5N6"
};

// Initialize Firebase (SDK v8 syntax)
if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// **********************************************************
// STEP 2: AUTHENTICATION (Login/Signup) Logic
// **********************************************************

// --- SIGN UP FUNCTION ---
async function handleSignup() {
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value.trim();
    const errorMsg = document.getElementById('signup-error-msg');
    errorMsg.innerText = '';

    if (!name || !email || !password || password.length < 6) {
        errorMsg.innerText = 'تمام فیلڈز پُر کریں اور پاسورڈ 6 حروف کا ہو.';
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        await db.collection("users").doc(user.uid).set({
            name: name,
            email: email,
            points: 0,
            role: 'user', // Default role 'user'
            is_active: false,
            payment_status: 'no_payment', // 'no_payment', 'pending', 'approved'
            last_click: firebase.firestore.Timestamp.fromDate(new Date(0)),
        });

        alert("Signup کامیاب! اب لاگ ان کریں");
        showForm('login'); 

    } catch (error) {
        console.error("Signup Error:", error.code, error.message);
        errorMsg.innerText = `Signup ناکام: ${error.message}`;
    }
}

// --- LOGIN FUNCTION ---
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const errorMsg = document.getElementById('login-error-msg');
    errorMsg.innerText = '';

    if (!email || !password) {
        errorMsg.innerText = 'ای میل اور پاسورڈ درج کریں.';
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        console.error("Login Error:", error.code, error.message);
        errorMsg.innerText = `لاگ اِن ناکام: ${error.message}`;
    }
}

// --- FORM TOGGLE FUNCTION (Used by index.html) ---
function showForm(mode) {
    const formCard = document.getElementById('login-form-card');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    // Hide main content (assuming it's on index.html)
    const mainContent = document.querySelector('.main-homepage-content');
    if(mainContent) mainContent.style.display = 'none';

    formCard.style.display = 'block';

    if (mode === 'signup') {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    } else {
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
    }
}


// **********************************************************
// STEP 3: ROLE-BASED REDIRECTION
// **********************************************************

auth.onAuthStateChanged(async (user) => {
    const path = window.location.pathname;
    const isIndexPage = path.endsWith('index.html') || path === '/';
    const isDashboard = path.endsWith('dashboard.html');
    const isAdminPage = path.endsWith('admin.html');

    if (user) {
        try {
            const doc = await db.collection("users").doc(user.uid).get();
            if (!doc.exists) {
                auth.signOut();
                return;
            }
            const role = doc.data().role;

            if (role === 'admin') {
                if (!isAdminPage) {
                    window.location.href = 'admin.html';
                } else if (isAdminPage) {
                    loadAdminPanel(user); // Load Admin logic
                }
            } else if (role === 'user') {
                if (!isDashboard) {
                    window.location.href = 'dashboard.html';
                } else if (isDashboard) {
                    loadDashboard(user); // Load User Dashboard logic
                }
            }
            
        } catch (error) {
            console.error("Role Check Error:", error);
            auth.signOut();
        }

    } else {
        // User NOT logged in. Show homepage or redirect to index
        if (isDashboard || isAdminPage) {
            window.location.href = 'index.html'; 
        } else if (isIndexPage) {
             // If on index.html, ensure forms are hidden if user logs out
             const formCard = document.getElementById('login-form-card');
             const mainContent = document.querySelector('.main-homepage-content');
             if(formCard) formCard.style.display = 'none';
             if(mainContent) mainContent.style.display = 'block';
        }
    }
});


// **********************************************************
// STEP 4: USER DASHBOARD LOGIC (dashboard.html)
// **********************************************************

function loadDashboard(user) {
    document.getElementById('user-email-display').innerText = user.email;
    document.getElementById('user-uid-display').innerText = user.uid.substring(0, 8) + '...'; 

    // 1. Real-time data listener for current user
    db.collection("users").doc(user.uid).onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            updateDashboardUI(data);
        }
    });

    // 2. Load Leaderboard
    loadLeaderboard();
}

// --- LEADERBOARD LOGIC (NEW) ---
function loadLeaderboard() {
    const listElement = document.getElementById('leaderboard-list');

    db.collection("users").orderBy("points", "desc").limit(10).onSnapshot(snapshot => {
        listElement.innerHTML = '';
        if (snapshot.empty) {
            listElement.innerHTML = '<li style="text-align: center;">کوئی ڈیٹا نہیں.</li>';
            return;
        }

        snapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            const rank = index + 1;
            const name = data.name || data.email.split('@')[0]; // Use name or part of email
            const points = data.points.toLocaleString();

            const item = document.createElement('li');
            item.classList.add('leaderboard-item');
            
            // Highlight current user's name if applicable
            const isCurrentUser = auth.currentUser && doc.id === auth.currentUser.uid;
            
            item.innerHTML = `
                <span>#${rank} ${isCurrentUser ? '(آپ)' : ''}</span>
                <span>${name}</span>
                <span>${points} Pts</span>
            `;
            
            // Apply specific styles for top ranks
            if (rank <= 3) {
                 item.style.fontWeight = 'bold';
                 item.style.color = 'var(--black)';
            }
            
            listElement.appendChild(item);
        });
    });
}


function updateDashboardUI(data) {
    const pointsElement = document.getElementById('user-points');
    const statusElement = document.getElementById('account-status');
    const clickBtn = document.getElementById('daily-click-btn');
    const earningMsg = document.getElementById('earning-message');
    const timeToNextClick = document.getElementById('time-to-next-click');
    const lastClickTime = document.getElementById('last-click-time');

    pointsElement.innerText = data.points.toLocaleString();
    document.getElementById('user-welcome').innerText = `خوش آمدید، ${data.name}`;

    // --- Account Activation Logic ---
    if (data.is_active) {
        statusElement.innerText = 'Active (کمانے کے قابل)';
        statusElement.style.color = 'var(--green)'; 
        document.getElementById('payment-section').style.display = 'none'; // Hide payment section
        clickBtn.disabled = false;
        earningMsg.innerHTML = "آج کا پوائنٹ حاصل کرنے کے لیے کلک کریں!";
    } else {
        statusElement.innerText = `Inactive (${data.payment_status === 'pending' ? 'زیر التواء' : 'ادا کریں'})`;
        statusElement.style.color = 'yellow';
        clickBtn.disabled = true;
        earningMsg.innerHTML = "🔴 پوائنٹس کمانے کے لیے پہلے اکاؤنٹ فعال کرائیں (100 روپے ادا کریں)";
        document.getElementById('payment-section').style.display = 'block'; // Show payment section
    }

    // --- Daily Click Timer Logic ---
    const lastClick = data.last_click ? data.last_click.toDate().getTime() : 0;
    lastClickTime.innerText = data.last_click ? new Date(lastClick).toLocaleString() : 'پہلا کلک';

    const timePassed = Date.now() - lastClick;
    const requiredInterval = 24 * 60 * 60 * 1000; 

    if (data.is_active && timePassed >= requiredInterval) {
        clickBtn.disabled = false;
        clickBtn.innerText = "🔴 کلک کریں (100 Points)";
        timeToNextClick.innerText = "ابھی دستیاب!";
    } else if (data.is_active) {
        clickBtn.disabled = true;
        const timeLeft = requiredInterval - timePassed;
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        timeToNextClick.innerText = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        clickBtn.innerText = "وقفہ جاری ہے...";
        // Optional: Update timer every second for live countdown
        // If you need a live timer, additional setInterval logic would be required here.
    }
}

// --- DAILY EARNING FUNCTION ---
async function dailyClick() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        await db.runTransaction(async (transaction) => {
            const userRef = db.collection("users").doc(user.uid);
            const doc = await transaction.get(userRef);

            if (!doc.exists) throw "User data not found!";
            const data = doc.data();

            if (!data.is_active) throw "Account inactive. Pehle payment karein.";

            const lastClick = data.last_click ? data.last_click.toDate().getTime() : 0;
            const timePassed = Date.now() - lastClick;
            const requiredInterval = 24 * 60 * 60 * 1000;

            let pointsToAdd = 0;
            if (timePassed < requiredInterval) {
                throw "24 گھنٹے پورے نہیں ہوئے ہیں.";
            }

            // Points logic: First click 300, then 100
            if (lastClick === 0 || (Date.now() - lastClick > 30 * 24 * 60 * 60 * 1000)) { // 30 days gap for a huge first bonus click
                pointsToAdd = 300;
                alert(`مبارک ہو! پہلا/بڑا کلک کامیاب! ${pointsToAdd} پوائنٹس ملے.`);
            } else {
                pointsToAdd = 100;
                alert(`کامیاب! آپ کو آج کے ${pointsToAdd} پوائنٹس مل گئے.`);
            }

            // Update points and time
            transaction.update(userRef, {
                points: data.points + pointsToAdd,
                last_click: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

    } catch (e) {
        console.error("Daily Click Error: ", e);
        if (typeof e === 'string') {
             alert(e); 
        } else {
             alert("کوئی ایرر آ گیا ہے. براہ کرم دوبارہ کوشش کریں.");
        }
    }
}


// **********************************************************
// STEP 5: PAYMENT & STORAGE LOGIC
// **********************************************************

async function handleScreenshotUpload() {
    const user = auth.currentUser;
    if (!user) return;

    const fileInput = document.getElementById('screenshot-file');
    const file = fileInput.files[0];
    const submitBtn = document.getElementById('submit-payment');
    const message = document.getElementById('payment-status-message');
    
    message.style.color = 'yellow';
    message.innerText = '';

    if (!file) {
        message.innerText = 'براہ کرم سکرین شاٹ کی تصویر منتخب کریں.';
        return;
    }
    if (file.size > 2 * 1024 * 1024) { // Limit file size to 2MB
        message.innerText = 'فائل کا سائز 2MB سے کم ہونا چاہیے.';
        return;
    }

    submitBtn.innerText = "اپ لوڈ ہو رہا ہے...";
    submitBtn.disabled = true;

    try {
        const timestamp = Date.now();
        const storageRef = storage.ref(`payments/${user.uid}/${timestamp}_${file.name}`);

        const snapshot = await storageRef.put(file);
        const fileURL = await snapshot.ref.getDownloadURL();

        await db.collection("users").doc(user.uid).update({
            payment_status: 'pending',
            payment_screenshot_url: fileURL,
            payment_date: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        message.style.color = 'var(--green)'; 
        message.innerHTML = '🎉 مبارک ہو! آپ کا سکرین شاٹ کامیابی سے بھیج دیا گیا ہے۔ ایڈمن جلد ہی آپ کا اکاؤنٹ فعال کر دے گا!';
        submitBtn.innerText = "کامیابی سے بھیج دیا گیا";
        submitBtn.disabled = true; 
        fileInput.value = ''; 

    } catch (error) {
        console.error("Upload Error:", error);
        message.style.color = 'var(--red)';
        message.innerText = `اپ لوڈ ناکام ہوا: ${error.message}`;
        submitBtn.innerText = "سکرین شاٹ بھیجیں (Send Screenshot)";
        submitBtn.disabled = false;
    }
}


// **********************************************************
// STEP 6: ADMIN PANEL LOGIC (admin.html)
// **********************************************************

function loadAdminPanel(user) {
    console.log("Admin Panel Loaded for:", user.email);

    // 1. Listen to all users with 'pending' status
    db.collection("users").where("payment_status", "==", "pending")
        .onSnapshot(snapshot => {
            const listElement = document.getElementById('pending-users-list');
            listElement.innerHTML = ''; 

            if (snapshot.empty) {
                listElement.innerHTML = '<tr><td colspan="6" style="text-align: center;">کوئی زیر التواء ادائیگی نہیں...</td></tr>';
                return;
            }

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const userId = doc.id;
                
                const date = data.payment_date ? data.payment_date.toDate().toLocaleString() : 'N/A';
                const name = data.name || 'N/A';
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${userId.substring(0, 8)}...</td>
                    <td>${name}</td>
                    <td>${data.points.toLocaleString()}</td>
                    <td>${date}</td>
                    <td><a href="${data.payment_screenshot_url}" target="_blank" style="color: var(--red);">دیکھیں (View)</a></td>
                    <td>
                        <button class="admin-action-btn" onclick="verifyPayment('${userId}')">فعال کریں (Activate)</button>
                    </td>
                `;
                listElement.appendChild(row);
            });
        }, error => {
            console.error("Admin Listener Error:", error);
        });
}

// --- ADMIN VERIFICATION FUNCTION ---
async function verifyPayment(userId) {
    if (!confirm(`کیا آپ واقعی ${userId.substring(0, 8)}... کے اکاؤنٹ کو فعال کرنا چاہتے ہیں؟`)) {
        return;
    }

    try {
        await db.collection("users").doc(userId).update({
            payment_status: 'approved',
            is_active: true,
        });
        alert(`یوزر ${userId.substring(0, 8)}... کامیابی سے فعال ہو گیا ہے!`);
    } catch (error) {
        console.error("Verification Error:", error);
        alert(`فعالیت ناکام ہوئی: ${error.message}`);
    }
}