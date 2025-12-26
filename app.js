// 🛑 Firebase Configuration (آپ کی فراہم کردہ)
const firebaseConfig = {
    apiKey: "AIzaSyC-Hy8VMaw471sxHt3jStxEyyEOTsOjoY0",
    authDomain: "paycash-92256.firebaseapp.com",
    projectId: "paycash-92256",
    storageBucket: "paycash-92256.firebasestorage.app",
    messagingSenderId: "690964863262",
    appId: "1:690964863262:web:800a7c905ee23cd99d910f"
};

// 🛑 آپ کی پیمنٹ کی تفصیلات (یہاں اپنا نمبر لکھیں)
const ADMIN_EASYPAISA = "0300-1234567"; // اپنا ایزی پیسہ نمبر لکھیں
const ADMIN_JAZZCASH = "0345-1234567";  // اپنا جاز کیش نمبر لکھیں
const ADMIN_NAME = "Zeeshan Ali";        // اپنا نام لکھیں

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const auth = firebase.auth();
const db = firebase.firestore();

let isLoginMode = true;

// لاگ ان / سائن اپ سوئچ
function toggleAuth() {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? "لاگ ان کریں" : "نیا اکاؤنٹ بنائیں";
    document.getElementById('signup-fields').style.display = isLoginMode ? "none" : "block";
    document.getElementById('auth-btn').innerText = isLoginMode ? "داخل ہوں" : "رجسٹریشن کریں";
    document.getElementById('toggle-txt').innerText = isLoginMode ? "نیا اکاؤنٹ بنائیں؟ سائن اپ کریں" : "پہلے سے اکاؤنٹ ہے؟ لاگ ان کریں";
}

// اصلی لاجک: لاگ ان اور ریفرل سائن اپ
function handleAuth() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const refCode = document.getElementById('referral-code-input').value.trim();

    if (!email || !password) { alert("خانے پُر کریں"); return; }

    if (isLoginMode) {
        auth.signInWithEmailAndPassword(email, password)
            .then(() => window.location.href = "dashboard.html")
            .catch(err => alert("Error: " + err.message));
    } else {
        auth.createUserWithEmailAndPassword(email, password)
            .then(res => {
                const uid = res.user.uid;
                // نیا یوزر بنانا
                return db.collection('users').doc(uid).set({
                    email: email, points: 0, is_active: false, last_click: "", referredBy: refCode
                }).then(() => {
                    // اگر ریفرل کوڈ ہے تو انوائٹ کرنے والے کو 500 پوائنٹس دیں
                    if (refCode) giveReferralBonus(refCode);
                    alert("اکاؤنٹ بن گیا! اب لاگ ان کریں۔");
                    location.reload();
                });
            }).catch(err => alert("Error: " + err.message));
    }
}

function giveReferralBonus(refUid) {
    const ref = db.collection('users').doc(refUid);
    ref.get().then(doc => {
        if (doc.exists) {
            ref.update({ points: (doc.data().points || 0) + 500 });
        }
    });
}

// ڈیٹا لوڈ کرنا
auth.onAuthStateChanged(user => {
    if (user && window.location.pathname.includes("dashboard.html")) {
        document.getElementById('user-email').innerText = user.email;
        document.getElementById('my-referral-code').innerText = user.uid;
        loadData(user.uid);
    }
});

function loadData(uid) {
    db.collection('users').doc(uid).onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('user-points').innerText = data.points;
            renderActivation(data.is_active, uid);
        }
    });
}

// ڈیلی کلک (Automatic 24h Check)
function addDailyPoints() {
    const user = auth.currentUser;
    const today = new Date().toDateString();
    const ref = db.collection('users').doc(user.uid);

    ref.get().then(doc => {
        const data = doc.data();
        if (!data.is_active) { alert("پہلے اکاؤنٹ فعال کرائیں!"); return; }
        if (data.last_click === today) { alert("آج کے پوائنٹس مل چکے ہیں!"); }
        else {
            ref.update({ points: data.points + 300, last_click: today });
            alert("300 پوائنٹس شامل کر دیے گئے!");
        }
    });
}

// ایکٹیویشن سسٹم (EasyPaisa/JazzCash)
function renderActivation(isActive, uid) {
    const area = document.getElementById('activation-area');
    if (!isActive) {
        area.innerHTML = `
            <div class="activation-card">
                <h3>⚠️ اکاؤنٹ فعال کریں (100 روپے)</h3>
                <p>EasyPaisa/JazzCash پر 100 روپے بھیجیں:</p>
                <p><strong>${ADMIN_EASYPAISA}</strong> (EasyPaisa)</p>
                <p><strong>${ADMIN_JAZZCASH}</strong> (JazzCash)</p>
                <p>نام: ${ADMIN_NAME}</p>
                <input type="text" id="tid" placeholder="Transaction ID (T-ID) یہاں لکھیں">
                <button onclick="submitTID('${uid}')">ID بھیجیں</button>
            </div>`;
    } else {
        area.innerHTML = `<p style="color:green; font-weight:bold;">✅ آپ کا اکاؤنٹ فعال ہے</p>`;
    }
}

function submitTID(uid) {
    const tid = document.getElementById('tid').value;
    if (!tid) { alert("T-ID لکھیں"); return; }
    db.collection('users').doc(uid).update({ payment_status: 'pending', tid: tid });
    alert("آپ کی ID بھیج دی گئی ہے۔ ایڈمن جلد تصدیق کرے گا!");
}

function logout() { auth.signOut(); }
// یہ فائل کے بالکل آخر میں پیسٹ کریں
function requestWithdraw() {
    const user = auth.currentUser;
    const amount = parseInt(document.getElementById('withdraw-amount').value);
    const accNum = document.getElementById('account-number').value;
    const method = document.getElementById('payment-method').value;

    if (!amount || !accNum) { alert("تمام خانے پُر کریں"); return; }
    if (amount < 5000) { alert("کم از کم 5000 پوائنٹس درکار ہیں!"); return; }

    const userRef = db.collection('users').doc(user.uid);

    userRef.get().then(doc => {
        const currentPoints = doc.data().points || 0;
        if (currentPoints < amount) {
            alert("آپ کے پاس اتنے پوائنٹس نہیں ہیں!");
        } else {
            // پوائنٹس کاٹنا اور ریکویسٹ بھیجنا
            userRef.update({ points: currentPoints - amount }).then(() => {
                db.collection('withdrawals').add({
                    uid: user.uid,
                    email: user.email,
                    amount: amount,
                    account: accNum,
                    method: method,
                    status: "pending",
                    date: new Date().toLocaleString()
                }).then(() => {
                    alert("آپ کی درخواست موصول ہو گئی ہے!");
                    location.reload(); // پیج ریفریش تاکہ پوائنٹس اپ ڈیٹ ہو جائیں
                });
            });
        }
    });
}function payForBox() {
    const user = auth.currentUser;
    const tid = document.getElementById('mystery-tid').value;

    if (!tid) { alert("Pehle 20rs pay karein aur T-ID likhen!"); return; }

    // Admin ko payment request bhejna
    db.collection('box_payments').add({
        uid: user.uid,
        email: user.email,
        tid: tid,
        amount: 20,
        status: "pending",
        date: new Date().toLocaleString()
    }).then(() => {
        alert("Aapki T-ID check ki ja rahi hai. Admin approve karte hi aapka inaam (points) add ho jayega!");
        document.getElementById('mystery-tid').value = "";
    });
}