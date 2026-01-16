// PayCash Official Firebase Configuration
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

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

const ADMIN_EMAIL = "paycashofficial22@gmail.com"; // Aapki admin email

// Security Check: Only admin can see this page
auth.onAuthStateChanged(user => {
    if (user && user.email === ADMIN_EMAIL) {
        document.getElementById('admin-main').style.display = 'block';
        document.getElementById('access-denied').style.display = 'none';
        loadStats();
        loadTIDs();
    } else {
        document.getElementById('access-denied').style.display = 'block';
        document.getElementById('admin-main').style.display = 'none';
        // 3 second baad wapis index page par
        setTimeout(() => { window.location.href = "index.html"; }, 3000);
    }
});

// Load Total Users Count
function loadStats() {
    db.collection("users").get().then(snap => {
        document.getElementById('total-users').innerText = snap.size;
    }).catch(err => console.log("Stats error: ", err));
}

// Load Pending Payments from Firestore
function loadTIDs() {
    const listTable = document.getElementById('tid-list');
    listTable.innerHTML = ""; // Purana data clear karein

    db.collection("payments").where("status", "==", "pending")
    .onSnapshot(snapshot => {
        listTable.innerHTML = ""; 
        document.getElementById('pending-payments').innerText = snapshot.size;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            listTable.innerHTML += `
                <tr>
                    <td>${data.userEmail}</td>
                    <td>${data.tid}</td>
                    <td>RS ${data.amount}</td>
                    <td>
                        <button class="btn-approve" onclick="approvePayment('${doc.id}', '${data.userId}', ${data.amount})">Approve</button>
                    </td>
                </tr>
            `;
        });
    });
}

// Function to Approve Payment and Add Points
async function approvePayment(docId, userId, amount) {
    if(confirm("Kya aap is payment ko approve karna chahte hain?")) {
        try {
            // 1. User ke points update karein
            const userRef = db.collection("users").doc(userId);
            await userRef.update({
                points: firebase.firestore.FieldValue.increment(parseInt(amount))
            });

            // 2. Payment status 'approved' karein
            await db.collection("payments").doc(docId).update({
                status: "approved"
            });

            alert("Payment Approved! Points added to user account.");
        } catch (error) {
            console.error("Error approving: ", error);
            alert("Kuch ghalat ho gaya!");
        }
    }
}

// Logout function
function logout() {
    auth.signOut().then(() => { window.location.href = "index.html"; });
}