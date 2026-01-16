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
        // لائن 74 کے نیچے یہ پیسٹ کریں
db.collection('users').doc(user.uid).onSnapshot(doc => {
    if (doc.exists) {
        const lastClaim = doc.data().lastDailyBonus || 0;
        updateTimerDisplay(lastClaim); // ٹائمر کو اپ ڈیٹ کریں
    }
});
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
function updateTimerDisplay(lastClaim) {
    const timerElement = document.getElementById('bonus-timer');
    const btn = document.getElementById('daily-bonus-btn');
    
    const interval = setInterval(() => {
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        const timeLeft = twentyFourHours - (now - lastClaim);

        if (timeLeft <= 0) {
            clearInterval(interval);
            timerElement.innerText = "بونس دستیاب ہے! ✅";
            btn.disabled = false;
            btn.style.opacity = "1";
        } else {
            btn.disabled = true;
            btn.style.opacity = "0.6";
            const h = Math.floor(timeLeft / 3600000);
            const m = Math.floor((timeLeft % 3600000) / 60000);
            const s = Math.floor((timeLeft % 60000) / 1000);
            timerElement.innerText = `اگلا بونس: ${h}h ${m}m ${s}s بعد`;
        }
    }, 1000);
}
// --- Naya Daily Bonus Function (300 Points + Time Save) ---
// --- Updated Daily Bonus Function (Pehli baar free points ke liye) ---
async function claimDailyBonus() {
    const user = auth.currentUser;
    if (!user) return alert("Pehle login karein!");

    const userRef = db.collection('users').doc(user.uid);

    try {
        const doc = await userRef.get();
        const userData = doc.data();
        
       // ✅ چیک کریں کہ اکاؤنٹ ایکٹیو ہے اور ریفرل پوائنٹس ابھی تک نہیں ملے
       // --- ریفرل پوائنٹس کا فائنل کوڈ ---
if (userData.is_active === true) {
    // چیک کریں کہ کیا ریفرل کوڈ موجود ہے اور کیا اسے پہلے انعام نہیں ملا
    if (userData.referredBy && userData.referralProcessed !== true) {
        
        // عظمہ (ریفرر) کو پوائنٹس دینے والا فنکشن چلائیں
        await rewardReferrer(userData.referredBy);
        
        // اب ثوبیہ کے ڈیٹا کو اپ ڈیٹ کریں تاکہ اسے دوبارہ پوائنٹس نہ ملیں
        await userRef.update({ 
            referralAwarded: true,
            referralProcessed: true 
        });
        
        console.log("Success: Points awarded to referrer!");
    }
} else {
    alert("Pehle account active karwayein!");
    return;
}

        const lastClaim = userData.lastDailyBonus || 0;
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;

        if (lastClaim === 0 || (now - lastClaim >= twentyFourHours)) {
            await userRef.update({
                points: firebase.firestore.FieldValue.increment(300),
                lastDailyBonus: now
            });
            alert("Mubarak ho! 300 points mil gaye.");
            updateTimerDisplay(now); 
        } else {
            alert("Aap aaj ka bonus le chuke hain.");
        }
    } catch (error) {
        console.error("Error: ", error);
        alert("Kuch masla hua hai.");
    }
}
// --- Logout Function ---
function logout() {
    auth.signOut().then(() => {
        // Logout hone ke baad user ko login page par bhej dein
        window.location.href = "index.html"; 
    }).catch((error) => {
        alert("Logout fail: " + error.message);
    });
}
// ریفرل پوائنٹس چیک کرنے کا خودکار نظام
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userRef = db.collection('users').doc(user.uid);
        const doc = await userRef.get();
        const userData = doc.data();

        // چیک کریں کہ کیا یہ نیا یوزر ہے اور اس نے ریفرل کوڈ استعمال کرنا ہے
        if (userData && !userData.referralProcessed) {
            let refCode = prompt("اگر آپ کے پاس ریفرل کوڈ ہے تو یہاں لکھیں، ورنہ Skip کر دیں:");
            
            if (refCode && refCode.trim() !== "") {
                try {
                    const oldUserQuery = await db.collection('users').where('referralCode', '==', refCode).get();

                    if (!oldUserQuery.empty) {
                        const oldUserDoc = oldUserQuery.docs[0];
                        const oldUserRef = db.collection('users').doc(oldUserDoc.id);

                        // پرانے یوزر کو 800 پوائنٹس دینا
                        await oldUserRef.update({
                            points: firebase.firestore.FieldValue.increment(800)
                        });

                        // نئے یوزر کو مارک کرنا کہ اس کا ریفرل ہو گیا ہے
                        await userRef.update({ referralProcessed: true });

                        alert("Your first team member added! Congratulations 🎉");
                    } else {
                        alert("غلط ریفرل کوڈ!");
                    }
                } catch (e) {
                    console.error("Error:", e);
                }
            } else {
                // اگر کوڈ نہیں ڈالا تو دوبارہ نہ پوچھے
                await userRef.update({ referralProcessed: true });
            }
        }
    }
});
// ریفرل پوائنٹس دینے والا خودکار سسٹم
async function rewardReferrer(referredByCode) {
    if (!referredByCode) return;
    try {
        const usersRef = db.collection('users');
        const cleanCode = referredByCode.trim();

        // 1. عظمہ کو اس کی آئی ڈی (UID) سے ڈھونڈیں
        const referrerDocRef = usersRef.doc(cleanCode);
        const doc = await referrerDocRef.get();

        if (doc.exists) {
            // 2. اگر عظمہ مل جائے تو اسے 800 پوائنٹس دیں
            await referrerDocRef.update({
                points: firebase.firestore.FieldValue.increment(800)
            });
            console.log("Points added to Uzma!");
        } else {
            // 3. اگر آئی ڈی سے نہ ملے تو پرانے ریفرل کوڈ سے ڈھونڈیں
            const snapshot = await usersRef.where('referralCode', '==', cleanCode).get();
            if (!snapshot.empty) {
                await snapshot.docs[0].ref.update({
                    points: firebase.firestore.FieldValue.increment(800)
                });
            }
        }
    } catch (error) {
        console.error("Referral Error: ", error);
    }
}
// لائیو ود ڈرا اپ ڈیٹ لسٹ
const fakeWithdrawals = [
    "Ikram withdraw 5500rs",
    "Sobia withdraw 1200rs",
    "Ali withdraw 3000rs",
    "Uzma withdraw 8000rs",
    "Zohaib withdraw 4500rs",
    "Maria withdraw 2500rs",
    "Hamza withdraw 6000rs"
];

function startLiveUpdates() {
    const textElement = document.getElementById('live-update-text');
    let index = 0;

    // ہر 3 سیکنڈ بعد نام اور رقم بدلے گی
    setInterval(() => {
        textElement.style.opacity = 0; // غائب ہونے کا اثر
        
        setTimeout(() => {
            textElement.innerText = "🔥 " + fakeWithdrawals[index];
            textElement.style.opacity = 1; // ظاہر ہونے کا اثر
            index = (index + 1) % fakeWithdrawals.length;
        }, 500);
        
    }, 3000);
}


// ڈیش بورڈ لوڈ ہوتے ہی شروع کریں
window.addEventListener('load', startLiveUpdates);

function copyReferralLink() {
    const user = auth.currentUser;
    if (user) {
        // آپ کی ویب سائٹ کا یو آر ایل (URL) خود بخود اٹھائے گا
        const siteUrl = window.location.origin + window.location.pathname.replace('dashboard.html', 'index.html');
        const referralLink = `${siteUrl}?ref=${user.uid}`;

        // کلپ بورڈ میں کاپی کرنا
        navigator.clipboard.writeText(referralLink).then(() => {
            alert("لنک کاپی ہو گیا! اب اسے واٹس ایپ پر شئیر کریں:\n" + referralLink);
        }).catch(err => {
            console.error('Copy failed', err);
        });
    } else {
        alert("پہلے لاگ ان کریں!");
    }
}
async function submitTID() {
    const tid = document.getElementById('userTID').value;
    const amount = document.getElementById('payAmount').value;
    const user = auth.currentUser;

    if (!tid || !amount) {
        alert("براہ کرم رقم اور TID دونوں لکھیں!");
        return;
    }

    try {
        // فائر بیس میں پیمنٹ کی درخواست جمع کرنا
        await db.collection("payments").add({
            userId: user.uid,
            userEmail: user.email,
            tid: tid,
            amount: amount,
            status: "pending",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("آپ کی TID موصول ہوگئی ہے! چیک کرنے کے بعد پوائنٹس ایڈ کر دیے جائیں گے۔");
        // باکس خالی کرنا
        document.getElementById('userTID').value = "";
        document.getElementById('payAmount').value = "";
    } catch (error) {
        console.error("Error: ", error);
        alert("کچھ غلط ہو گیا، دوبارہ کوشش کریں!");
    }
}