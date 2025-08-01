// === AUTH.JS: warp-ready přihlašovací modul - OPRAVENÁ VERZE ===

// ⚠️ Inicializace Firebase (pokud ještě není)
if (typeof firebase === 'undefined' || !firebase.apps.length) {
  if (typeof initializeFirebaseApp === 'function') {
    initializeFirebaseApp();
  } else {
    console.error("❌ Funkce initializeFirebaseApp() není definována.");
  }
}

// ✅ Přihlášení přes Google
function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .then(result => {
      console.log("✅ Přihlášen přes Google:", result.user.email);
    })
    .catch(error => {
      console.error("❌ Chyba při přihlášení přes Google:", error);
    });
}

// ✅ Přihlášení přes e-mail/heslo
function signInWithEmail() {
  const email = document.getElementById("emailInput")?.value;
  const password = document.getElementById("passwordInput")?.value;

  if (!email || !password) {
    console.warn("⚠️ E-mail nebo heslo nebylo zadáno.");
    return;
  }

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(userCredential => {
      console.log("✅ Přihlášen e-mailem:", userCredential.user.email);
    })
    .catch(error => {
      console.error("❌ Chyba při přihlášení e-mailem:", error);
    });
}

// ✅ Odhlášení
function signOut() {
  firebase.auth().signOut()
    .then(() => {
      console.log("👋 Uživatel byl odhlášen.");
      // NOVÉ: Vyčisti UI při odhlášení
      clearUserDataFromUI();
    })
    .catch(error => {
      console.error("❌ Chyba při odhlášení:", error);
    });
}

// 🆕 NOVÁ FUNKCE: Vyčisti UI data při odhlášení
function clearUserDataFromUI() {
  try {
    // Vymaž grafy a data z UI
    if (typeof clearWeightChart === 'function') {
      clearWeightChart();
    }
    
    // Vymaž nastavení z UI
    if (typeof clearSettingsFromUI === 'function') {
      clearSettingsFromUI();
    }
    
    // Vymaž cíle z UI
    if (typeof clearGoalsFromUI === 'function') {
      clearGoalsFromUI();
    }
    
    console.log("🧹 UI vyčištěno po odhlášení");
  } catch (error) {
    console.error("❌ Chyba při čištění UI:", error);
  }
}

// ✅ OPRAVENÁ FUNKCE: Načte všechna data po přihlášení
async function loadAllUserData(user) {
  try {
    console.log(`📦 Začínám načítat data pro uživatele: ${user.email} (UID: ${user.uid})`);
    
    // DŮLEŽITÉ: Ujisti se, že Firestore je inicializovaný
    if (!window.db) {
      console.log("⏳ Čekám na inicializaci Firestore...");
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Načti všechna data paralelně
    const [weightData, settings, goals] = await Promise.all([
      loadWeightLogFromFirestore(),
      loadSettingsFromFirestore(),
      loadGoalsFromFirestore()
    ]);
    
    console.log(`✅ Váhová data načtena pro ${user.email}:`, weightData?.length || 0, "záznamů");
    console.log(`⚙️ Nastavení načtena pro ${user.email}:`, settings);
    console.log(`🎯 Cíle načteny pro ${user.email}:`, goals);
    
    // Zavolej funkci pro zobrazení dat (pokud existuje)
    if (typeof loadData === 'function') {
      await loadData();
    }
    
    // Nebo zavolej jednotlivé funkce pro aktualizaci UI
    if (typeof updateWeightChart === 'function') {
      updateWeightChart(weightData);
    }
    
    if (typeof applySettings === 'function') {
      applySettings(settings);
    }
    
    if (typeof updateGoalsDisplay === 'function') {
      updateGoalsDisplay(goals);
    }
    
    console.log(`🎉 Všechna data načtena a UI aktualizováno pro ${user.email}!`);
    
  } catch (error) {
    console.error(`❌ Chyba při načítání dat pro uživatele ${user?.email}:`, error);
  }
}

// ✅ KLÍČOVÁ OPRAVA: Sledujeme stav přihlášení s lepším timingem
firebase.auth().onAuthStateChanged(async (user) => {
  const loginSection = document.getElementById("login-section");
  const dashboardSection = document.getElementById("dashboard-section");
  const userNameSpan = document.getElementById("user-name");
  const loginPanel = document.getElementById("loginPanel");
  const userPanel = document.getElementById("userPanel");
  const userEmail = document.getElementById("userEmail");

  if (user) {
    console.log(`🟢 Uživatel přihlášen: ${user.email} (UID: ${user.uid})`);

    // UI přepnutí
    if (loginSection && dashboardSection && userNameSpan) {
      loginSection.style.display = "none";
      dashboardSection.style.display = "block";
      userNameSpan.textContent = user.displayName || user.email;
    }

    if (loginPanel && userPanel && userEmail) {
      loginPanel.style.display = "none";
      userPanel.style.display = "block";
      userEmail.textContent = user.email;
    }

    // ✅ OPRAVA: Počkej na úplnou inicializaci Firebase a pak načti data
    // Používáme waitForAuth() z firebaseFunctions.js
    if (typeof waitForAuth === 'function') {
      try {
        await waitForAuth();
        console.log("🔄 Firebase plně inicializován, načítám data...");
        await loadAllUserData(user);
      } catch (error) {
        console.error("❌ Chyba při čekání na Firebase:", error);
        // Záložní řešení s delším timeoutem
        setTimeout(async () => {
          await loadAllUserData(user);
        }, 2000);
      }
    } else {
      // Záložní řešení s delším timeoutem
      setTimeout(async () => {
        await loadAllUserData(user);
      }, 2000);
    }

  } else {
    console.log("🔴 Uživatel odhlášen.");

    // Vyčisti UI data před přepnutím
    clearUserDataFromUI();

    if (loginSection && dashboardSection && userNameSpan) {
      loginSection.style.display = "block";
      dashboardSection.style.display = "none";
      userNameSpan.textContent = "";
    }

    if (loginPanel && userPanel && userEmail) {
      loginPanel.style.display = "block";
      userPanel.style.display = "none";
      userEmail.textContent = "";
    }
  }
});

// ✅ Po načtení DOMu napojíme tlačítka
document.addEventListener("DOMContentLoaded", () => {
  const googleBtn = document.getElementById("google-login-button");
  const emailBtn = document.getElementById("login-button");
  const logoutBtn = document.getElementById("logout-button");

  if (googleBtn) {
    googleBtn.addEventListener("click", signInWithGoogle);
  } else {
    console.warn("⚠️ google-login-button nenalezen.");
  }

  if (emailBtn) {
    emailBtn.addEventListener("click", signInWithEmail);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", signOut);
  } else {
    console.warn("⚠️ logout-button není v DOM.");
  }
});

// ✅ Globální funkce pro refresh dat
window.refreshUserData = async function() {
  const user = firebase.auth().currentUser;
  if (user) {
    await loadAllUserData(user);
  } else {
    console.warn("⚠️ Nelze načíst data - uživatel není přihlášen");
  }
};