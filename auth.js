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

    // Vymaž formuláře
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      if (form.reset && typeof form.reset === 'function') {
        form.reset();
      }
    });
    
    console.log("🧹 UI vyčištěno po odhlášení");
  } catch (error) {
    console.error("❌ Chyba při čištění UI:", error);
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

    // ✅ ZJEDNODUŠENÉ ŘEŠENÍ: Použij pouze loadData() funkci
    try {
      // Počkej na Firebase inicializaci
      if (typeof waitForAuth === 'function') {
        await waitForAuth();
        console.log("🔄 Firebase plně inicializován");
      } else {
        // Záložní čekání 1 sekunda
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Zavolej loadData() - ta už má veškerou logiku pro načítání a zobrazení
      if (typeof loadData === 'function') {
        console.log("📦 Volám loadData() pro načtení a zobrazení dat...");
        await loadData(true); // forceReload = true pro jistotu
        console.log("🎉 Data načtena a zobrazena!");
      } else {
        console.error("❌ Funkce loadData() není definována!");
      }

    } catch (error) {
      console.error("❌ Chyba při načítání dat po přihlášení:", error);
      // Zkus to znovu po 2 sekundách
      setTimeout(async () => {
        try {
          if (typeof loadData === 'function') {
            await loadData(true);
          }
        } catch (retryError) {
          console.error("❌ Druhý pokus o načtení dat také selhal:", retryError);
        }
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
    if (typeof loadData === 'function') {
      await loadData(true); // forceReload = true
    }
  } else {
    console.warn("⚠️ Nelze načíst data - uživatel není přihlášen");
  }
};
