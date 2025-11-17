// --- 1. FIREBASE CONFIGURATION: YOUR LIVE KEYS ---
// *** IMPORTANT: ALL YOUR KEYS ARE NOW ADDED ***
const firebaseConfig = {
    apiKey: "AIzaSyC-Hy8VMaw471sxHt3jStxEyyEOTsOjoY0",
    authDomain: "paycash-92256.firebaseapp.com", 
    projectId: "paycash-92256",        
    databaseURL: "https://paycash-92256-default-rtdb.firebaseio.com",
    };
    // Other IDs are optional for this basic setup
// -----------------------------------------------------------

// Initialize Firebase (MUST BE AT THE TOP)
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database(); 
// -----------------------------------------------------------


// --- 2. CONFIGURATION: CHANGE THESE VALUES ONLY ---
// Aapka Easypaisa/JazzCash Number (FAKE NUMBER FOR SECURITY)
const PAYMENT_NUMBER = "03312345678"; 
// Aapka WhatsApp Number for Manual Activation and Screenshots (FAKE NUMBER)
const CONTACT_NUMBER = "+92 331-2345678"; 

// Points and Fees
const ENTRY_FEE = 120; // Rs (Finalized Fee)
const DAILY_POINTS_LEVEL_1 = 200; 
const DAILY_POINTS_LEVEL_2 = 300; 
const REFERRAL_BONUS = 50; 
const EXTRA_CLICK_FEE = 20; // Rs
const EXTRA_CLICK_POINTS = 200;
const MYSTERY_BOX_FEE = 10; // Rs (Mystery Box Fee)

// Level and Permanent Reward Thresholds
const LEVEL_2_POINTS = 100000;      // For Level 2 upgrade
const REWARD_100_RS_POINTS = 10000; // 10,000 points for 100 Rs Cash (PERMANENT)
const REWARD_500_RS_POINTS = 100000; // 100,000 points for 500 Rs Load (PERMANENT)

// TIME-LIMITED MEGA REWARD 
const MEGA_REWARD_POINTS = 5000000;  // 50 Lakh Points
const MEGA_REWARD_CASH = 10000;       // 10,000 Rs
const MEGA_REWARD_END_DATE = "2026-01-31T23:59:59"; // Target End Date 
// ---------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000; 

// --- Helper Functions to talk to Firebase ---
async function getUserData(username) {
    const snapshot = await db.ref('users/' + username).once('value');
    return snapshot.val();
}

function saveUserData(username, data) {
    return db.ref('users/' + username).set(data);
}
// -------------------------------------------


// --- Animation Handler ---
function showAnimation() {
    document.getElementById('animation-container').style.display = 'flex';
    setTimeout(hideAnimation, 3000); 
}

function hideAnimation() {
    document.getElementById('animation-container').style.display = 'none';
    const username = localStorage.getItem('currentUser');
    if (username) {
        getUserData(username).then(renderDashboard);
    }
}


// --- Main Login/Signup Handler ---
document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('username-input').value.trim();
    if (!username) return;

    let userData = await getUserData(username);
    const urlParams = new URLSearchParams(window.location.search);
    const referrer = urlParams.get('ref');

    // New User Signup
    if (!userData) {
        userData = {
            username: username,
            points: 0,
            lastClaimed: 0,
            lastExtraClaim: 0,
            activated: false,
            mysteryBoxActive: false, 
            level: 1, 
            referredBy: referrer || null,
            referrerPaid: false
        };
        
        await saveUserData(username, userData);
        alert(نیا اکاؤنٹ بن گیا! ${username} خوش آمدید۔);
    }

    // Check if user is blocked
    if (userData.disabled) {
        alert("⚠️ معذرت، آپ کا اکاؤنٹ ایڈمن کی طرف سے بلاک کر دیا گیا ہے۔ مزید معلومات کے لیے WhatsApp پر رابطہ کریں۔");
        return;
    }


    // Successful Login: Show Dashboard
    localStorage.setItem('currentUser', username);
    showAnimation(); 
    renderDashboard(userData);
});


// --- Main Dashboard Renderer ---
function renderDashboard(userData) {
    const username = userData.username;

    document.getElementById('login-container').style.display = 'none';
    document.getElementById('dashboard-container').style.display = 'block';

    document.getElementById('welcome-message').textContent = خوش آمدید، ${username};
    document.getElementById('user-points').textContent = ⭐ ${userData.points.toLocaleString()} Points;
    
    // Update Level
    if (userData.points >= LEVEL_2_POINTS) {
        userData.level = 2;
        document.getElementById('user-level').textContent = لیول 2: Gold Achiever;
    } else {
        userData.level = 1; // Ensure it's reset if points drop
        document.getElementById('user-level').textContent = لیول 1: Starter (${(LEVEL_2_POINTS - userData.points).toLocaleString()} پوائنٹس لیول 2 کے لیے);
    }
    
    // Update Contacts in HTML
    document.querySelector('.easypaisa-info strong').textContent = PAYMENT_NUMBER + ' (Easypaisa/JazzCash)';
    document.getElementById('whatsapp-contact-number').textContent = CONTACT_NUMBER;


    // Set Referral Link
    const referralLinkInput = document.getElementById('referral-link');
    referralLinkInput.value = window.location.origin + window.location.pathname + ?ref=${username};


    // --- Activation Check ---
    const activationSection = document.getElementById('activation-section');
    const dailySection = document.getElementById('daily-section');
    const extraClickSection = document.getElementById('extra-click-section');
    const rewardSection = document.getElementById('reward-section'); 
    const mysteryBoxSection = document.getElementById('mystery-box-section'); 

    if (!userData.activated) {
        // Update fee in activation section
        document.getElementById('activation-fee').textContent = ENTRY_FEE; 
        activationSection.style.display = 'block';
        dailySection.style.display = 'none';
        extraClickSection.style.display = 'none';
        rewardSection.style.display = 'none';
        mysteryBoxSection.style.display = 'none';
    } else {
        activationSection.style.display = 'none';
        dailySection.style.display = 'block';
        extraClickSection.style.display = 'block';
        rewardSection.style.display = 'block';
        mysteryBoxSection.style.display = 'block'; 
        
        checkDailyClaim(userData); 
        checkRewards(userData); 
        checkMysteryBoxStatus(userData); 
    }

    // Save potentially updated level
    saveUserData(username, userData);
}


// --- Daily Points Claim ---
document.getElementById('claim-button').addEventListener('click', async function() {
    const username = localStorage.getItem('currentUser');
    let userData = await getUserData(username);
    
    if (userData && userData.activated && (Date.now() - userData.lastClaimed >= MS_PER_DAY)) {
        const pointsToClaim = userData.level === 2 ? DAILY_POINTS_LEVEL_2 : DAILY_POINTS_LEVEL_1;

        userData.points += pointsToClaim;
        userData.lastClaimed = Date.now();
        
        // --- Referral Bonus Check (Only on First Claim) ---
        if (userData.referredBy && !userData.referrerPaid) {
             let referrerData = await getUserData(userData.referredBy);
             if(referrerData) {
                referrerData.points += REFERRAL_BONUS;
                await saveUserData(referrerData.username, referrerData);
             }
             userData.referrerPaid = true; 
        }

        await saveUserData(username, userData);
        showAnimation(); 
        getUserData(username).then(renderDashboard);
    } else {
        alert("آپ نے آج کا پوائنٹ پہلے ہی کلیم کر لیا ہے یا بٹن ابھی تک ایکٹیو نہیں ہوا۔");
    }
});


// --- Manual Activation Handler (For User to get instructions) ---
document.getElementById('activate-manual-btn').addEventListener('click', function() {
    alert(⚠️ فوری بٹن ایکٹیویشن کے لیے:\n\n1. ${ENTRY_FEE} روپے بھیجیں۔\n2. سکرین شاٹ (TXN ID کے ساتھ) اور اپنا یوزر نیم ہمیں WhatsApp (${CONTACT_NUMBER}) پر بھیجیں۔\n\nایڈمن تصدیق کے بعد آپ کا بٹن ایکٹیو کر دے گا۔);
});

// --- Extra Click Claim ---
document.getElementById('extra-claim-button').addEventListener('click', function() {
    alert(⚠️ فوری ایکسٹرا پوائنٹس کے لیے:\n\n1. ${EXTRA_CLICK_FEE} روپے ${PAYMENT_NUMBER} پر بھیجیں۔\n2. اس ادائیگی کا نیا سکرین شاٹ ہمیں WhatsApp (${CONTACT_NUMBER}) پر بھیجیں۔\n\nایڈمن سکرین شاٹ کی تصدیق کے بعد آپ کے پوائنٹس بڑھا دے گا۔);
});

// --- Check 24hr Timer (Daily Claim) ---
function checkDailyClaim(userData) {
    const claimButton = document.getElementById('claim-button');
    const timerMessage = document.getElementById('timer-message');
    const lastClaimed = userData.lastClaimed;
    const now = Date.now();
    const timeElapsed = now - lastClaimed;

    if (timeElapsed < MS_PER_DAY) {
        claimButton.disabled = true;
        
        const remainingTime = MS_PER_DAY - timeElapsed;
        let hours = Math.floor(remainingTime / (60 * 60 * 1000));
        let minutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
        let seconds = Math.floor((remainingTime % (60 * 60 * 1000)) / 1000);

        timerMessage.textContent = پوائنٹس حاصل کر لیے! ${hours} گھنٹے ${minutes} منٹ ${seconds} سیکنڈ بعد دوبارہ آئیں۔;
    } else {
        claimButton.disabled = false;
        const pointsToClaim = userData.level === 2 ? DAILY_POINTS_LEVEL_2 : DAILYING-POINTS_LEVEL_1;
        timerMessage.textContent = آپ آج کے ${pointsToClaim} پوائنٹس حاصل کر سکتے ہیں!;
    }
}

// --- Reward Checker (Mega Reward Timer) ---
function checkRewards(userData) {
    const rewardMessage = document.getElementById('reward-message');
    const timerMessage = document.getElementById('mega-timer-message'); 
    let megaRewardMessage = "";
    
    const endTime = new Date(MEGA_REWARD_END_DATE).getTime();
    const now = new Date().getTime();
    const distance = endTime - now;

    if (distance > 0) {
        // Timer calculation
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        megaRewardMessage = 🔥 **ٹائمر جاری!** ${MEGA_REWARD_POINTS.toLocaleString()} پوائنٹس پر ${MEGA_REWARD_CASH.toLocaleString()} روپے!;
        timerMessage.innerHTML = <span style="color:red; font-weight:bold;">صرف ${days} دن ${hours} گھنٹے ${minutes} منٹ ${seconds} سیکنڈ باقی ہیں!</span>;

        if (userData.points >= MEGA_REWARD_POINTS) {
            megaRewardMessage = مبارک ہو! آپ ${MEGA_REWARD_POINTS.toLocaleString()} پوائنٹس پر **₹${MEGA_REWARD_CASH.toLocaleString()} کیش انعام** کے لیے اہل ہیں!;
        }
    } else {
        megaRewardMessage = "⚠️ *میگا انعام ختم ہو گیا!* اگلے بڑے انعام کے لیے تیار رہیں۔";
        timerMessage.innerHTML = <span style="color:gray;">ٹائمر ختم ہو چکا ہے۔</span>;
    }

    // Permanent Rewards Check
    let permanentRewardMessage = "";
    if (userData.points >= REWARD_500_RS_POINTS) {
        permanentRewardMessage = عمدہ! آپ ${REWARD_500_RS_POINTS.toLocaleString()} پوائنٹس پر **₹500 موبائل لوڈ** کے لیے اہل ہیں!;
    } else if (userData.points >= REWARD_100_RS_POINTS) {
        permanentRewardMessage = بڑھیا! آپ ${REWARD_100_RS_POINTS.toLocaleString()} پوائنٹس پر **₹100 کیش انعام** کے لیے اہل ہیں!;
    } else {
        permanentRewardMessage = "آپ کے پوائنٹس ابھی کسی بھی مستقل انعام کے لیے کافی نہیں ہیں۔";
    }

    rewardMessage.innerHTML = ${megaRewardMessage}<br><br>${permanentRewardMessage};
}

// --- Reward Claim Handler ---
document.getElementById('claim-reward-btn').addEventListener('click', function() {
    alert(🎉 مبارک ہو! آپ انعام کے لیے کلیم کر رہے ہیں۔\n\nآپ کا انعام جلد ہی بھیجا جائے گا! تصدیق اور انعام کی وصولی کے لیے براہ کرم ہمیں WhatsApp (${CONTACT_NUMBER}) پر رابطہ کریں اور اپنا یوزر نیم بتائیں۔\n\n⚠️ یاد رکھیں: ایڈمن خود پوائنٹس کاٹ کر انعام بھیجے گا۔);
});


// --- Mystery Box Handlers (NEW) ---
function checkMysteryBoxStatus(userData) {
    const boxButton = document.getElementById('mystery-box-button');
    const boxMessage = document.getElementById('mystery-box-message');
    
    if (userData.mysteryBoxActive) {
        boxButton.disabled = false;
        boxButton.textContent = "🎁 باکس کھولیں اور پوائنٹس لیں!";
        boxMessage.textContent = "آپ کی ₹10 کی ادائیگی کی تصدیق ہو گئی ہے۔ فوری پوائنٹس کے لیے باکس کھولیں!";
        boxButton.classList.add('active-box');
        boxButton.classList.remove('inactive-box');
    } else {
        boxButton.disabled = true;
        boxButton.textContent = ₹${MYSTERY_BOX_FEE} میں باکس ایکٹیو کروائیں;
        boxMessage.textContent = ⚠️ اس باکس کو کھولنے کے لیے صرف ${MYSTERY_BOX_FEE} روپے ${PAYMENT_NUMBER} پر بھیجیں۔;
        boxButton.classList.remove('active-box');
        boxButton.classList.add('inactive-box');
    }
}

document.getElementById('mystery-box-button').addEventListener('click', async function() {
    const username = localStorage.getItem('currentUser');
    let userData = await getUserData(username);

    if (userData.mysteryBoxActive) {
        // Generate random points between 50 and 500
        const randomPoints = Math.floor(Math.random() * 451) + 50; 

        userData.points += randomPoints;
        userData.mysteryBoxActive = false; // Auto reset after one click
        
        await saveUserData(username, userData);
        
        alert(🎉 مبارک ہو! آپ نے Mysterious Box کھولا اور ${randomPoints} پوائنٹس حاصل کیے۔ یہ باکس اب بند ہو گیا ہے!);
        
        showAnimation(); 
        getUserData(username).then(renderDashboard);

    } else {
        // If not active, show instruction to pay
        alert(⚠️ فوری Mystery Box پوائنٹس کے لیے:\n\n1. ${MYSTERY_BOX_FEE} روپے ${PAYMENT_NUMBER} پر بھیجیں۔\n2. اس ادائیگی کا نیا سکرین شاٹ ہمیں WhatsApp (${CONTACT_NUMBER}) پر بھیجیں۔\n\nایڈمن تصدیق کے بعد آپ کا باکس ایکٹیو کر دے گا۔);
    }
});


// --- Logout ---
document.getElementById('logout-button').addEventListener('click', function() {
    localStorage.removeItem('currentUser'); // Only remove the local user session
    // Data remains safe on Firebase
    window.location.reload();
});

// --- Initialize App ---
(function init() {
    // We need to load Firebase config first, then check user
    if (typeof firebase === 'undefined') {
        alert("⚠️ Firebase SDK Load nahi hui. Internet connection check karein.");
        return;
    }
    
    const username = localStorage.getItem('currentUser');
    if (username) {
        getUserData(username).then(userData => {
            if (userData) {
                renderDashboard(userData);
            } else {
                // User existed locally but not on server (shouldn't happen much)
                localStorage.removeItem('currentUser');
                document.getElementById('login-container').style.display = 'block';
            }
        });
        return;
    }
    // Show Login Page if no user is saved
    document.getElementById('login-container').style.display = 'block';
})();

// Update timers every second
setInterval(function() {
    const username = localStorage.getItem('currentUser');
    if (username) {
        getUserData(username).then(userData => {
            if (userData) {
                checkRewards(userData);
                checkDailyClaim(userData);
            }
        });
    }
}, 1000);