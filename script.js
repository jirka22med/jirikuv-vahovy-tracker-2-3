// === KOMPLETNÍ HLAVNÍ SCRIPT - WARP-READY VERZE ===

// Globální proměnné (deklarace zůstává nahoře)
let weightChart, bmiChart, bodyFatOnlyChart, muscleMassOnlyChart, bodyWaterChart, manualBMRChart, manualAMRChart;
let weightLog = [];
let settings = {
    height: 174,
    age: 24,
    gender: 'male',
    activityLevel: 1.55,
    bmiWarningUpper: 25,
    bmiDangerUpper: 30,
    bmiWarningLower: 18.5,
    reminderEnabled: true,
    reminderInterval: 7
};
let goals = {
    targetWeight: 80,
    targetBMI: 24.9,
    targetDate: '2026-05-18',
    weeklyGoal: null
};

// 🆕 NOVÉ GLOBÁLNÍ PROMĚNNÉ: Sledování stavu načítání
let isDataLoading = false;
let currentUserUID = null;

const ACTIVITY_LEVELS = {
    SEDENTARY: 1.2,
    LIGHT: 1.375,
    MODERATE: 1.55,
    ACTIVE: 1.725,
    VERY_ACTIVE: 1.9
};

// 🛡️ NOVÁ FUNKCE: Čištění UI dat
window.clearUserDataFromUI = function() {
    console.log("🧹 clearUserDataFromUI: Čistím UI data při změně uživatele.");
    
    // Vymaž všechna data z paměti
    weightLog = [];
    
    // Reset nastavení na výchozí
    settings = {
        height: 174,
        age: 24,
        gender: 'male',
        activityLevel: 1.55,
        bmiWarningUpper: 25,
        bmiDangerUpper: 30,
        bmiWarningLower: 18.5,
        reminderEnabled: true,
        reminderInterval: 7
    };
    
    // Reset cílů na výchozí
    goals = {
        targetWeight: 80,
        targetBMI: 24.9,
        targetDate: '2026-05-18',
        weeklyGoal: null
    };
    
    // Vyčisti grafiky
    if (weightChart) {
        weightChart.data.labels = [];
        weightChart.data.datasets[0].data = [];
        weightChart.update();
    }
    
    if (bmiChart) {
        bmiChart.data.labels = [];
        bmiChart.data.datasets[0].data = [];
        bmiChart.update();
    }
    
    if (bodyFatOnlyChart) {
        bodyFatOnlyChart.data.labels = [];
        bodyFatOnlyChart.data.datasets[0].data = [];
        bodyFatOnlyChart.update();
    }
    
    if (muscleMassOnlyChart) {
        muscleMassOnlyChart.data.labels = [];
        muscleMassOnlyChart.data.datasets[0].data = [];
        muscleMassOnlyChart.update();
    }
    
    if (bodyWaterChart) {
        bodyWaterChart.data.labels = [];
        bodyWaterChart.data.datasets[0].data = [];
        bodyWaterChart.update();
    }
    
    if (manualBMRChart) {
        manualBMRChart.data.labels = [];
        manualBMRChart.data.datasets[0].data = [];
        manualBMRChart.update();
    }
    
    if (manualAMRChart) {
        manualAMRChart.data.labels = [];
        manualAMRChart.data.datasets[0].data = [];
        manualAMRChart.update();
    }
    
    // Vyčisti tabulku
    const tableBody = document.getElementById('tableBody');
    if (tableBody) {
        tableBody.innerHTML = '';
    }
    
    // Vyčisti statistiky
    document.getElementById('currentWeight').textContent = '-';
    document.getElementById('currentBMI').textContent = '-';
    document.getElementById('currentBMI').className = 'stat-value';
    document.getElementById('weightChange').textContent = '-';
    document.getElementById('weightChange').className = 'stat-value';
    document.getElementById('currentBodyWater').textContent = '-';
    document.getElementById('lastManualBMR').textContent = '-';
    document.getElementById('lastManualAMR').textContent = '-';
    document.getElementById('theoreticalBMR').textContent = '-';
    document.getElementById('theoreticalAMR').textContent = '-';
    document.getElementById('goalProgress').textContent = '-';
    document.getElementById('goalProgressBarCard').style.display = 'none';
    document.getElementById('latestEntryDate').textContent = 'Načítám data...';
    
    console.log("🧹 clearUserDataFromUI: UI vyčištěno dokončeno.");
};

// 🆕 NOVÁ FUNKCE: Ověření stavu přihlášení před akcemi
window.ensureUserLoggedIn = function() {
    const user = firebase.auth().currentUser;
    if (!user) {
        window.showNotification("Chyba: Nejste přihlášeni! Přihlaste se prosím.", 4000);
        return false;
    }
    return true;
};

window.setTodayDate = function() {
    console.log("setTodayDate: Nastavuji dnešní datum pro vstupní pole.");
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('entryDate').value = today;
};

// ✅ OPRAVENÁ FUNKCE: loadData - nyní s ochranou proti duplicitnímu volání
window.loadData = async function(forceReload = false) {
    // 🛡️ Ochrana proti duplicitnímu načítání
    if (isDataLoading && !forceReload) {
        console.log("⏳ loadData: Již probíhá načítání dat, přeskakuję.");
        return;
    }
    
    // 🛡️ Ověř, že je uživatel přihlášen
    const user = firebase.auth().currentUser;
    if (!user) {
        console.warn("⚠️ loadData: Uživatel není přihlášen, nelze načíst data.");
        return;
    }
    
    // 🛡️ Zkontroluj změnu uživatele
    if (currentUserUID && currentUserUID !== user.uid) {
        console.log(`🔄 loadData: Detekována změna uživatele (${currentUserUID} → ${user.uid}), čistím UI.`);
        clearUserDataFromUI();
    }
    
    currentUserUID = user.uid;
    isDataLoading = true;
    
    console.log(`📦 loadData: Začínám načítat data pro uživatele: ${user.email} (UID: ${user.uid})`);
    
    const savedWeightLog = localStorage.getItem('weightLog_JirikTracker_v2_charts_separated_musclePercent');
    const savedSettings = localStorage.getItem('weightSettings_JirikTracker_v2_charts_separated_musclePercent');
    const savedGoals = localStorage.getItem('weightGoals_JirikTracker_v2_charts_separated_musclePercent');

    let firestoreWeightDataLoaded = false;
    let firestoreSettingsDataLoaded = false;
    let firestoreGoalsDataLoaded = false;

    try {
        console.log(`🔥 loadData: Načítám data z Firestore pro UID: ${user.uid}`);
        const firestoreWeightData = await window.loadWeightLogFromFirestore();
        if (firestoreWeightData && firestoreWeightData.length > 0) {
            weightLog = firestoreWeightData;
            firestoreWeightDataLoaded = true;
            console.log(`✅ loadData: ${firestoreWeightData.length} váhových záznamů načteno z Firestore pro ${user.email}`);
        } else {
            console.log(`💭 loadData: Žádná váhová data v Firestore pro ${user.email}`);
        }

        const firestoreSettings = await window.loadSettingsFromFirestore();
        if (firestoreSettings) {
            settings = { ...settings, ...firestoreSettings };
            firestoreSettingsDataLoaded = true;
            console.log(`⚙️ loadData: Nastavení načtena z Firestore pro ${user.email}`);
        } else {
            console.log(`💭 loadData: Žádná nastavení v Firestore pro ${user.email}`);
        }

        const firestoreGoals = await window.loadGoalsFromFirestore();
        if (firestoreGoals) {
            goals = { ...goals, ...firestoreGoals };
            firestoreGoalsDataLoaded = true;
            console.log(`🎯 loadData: Cíle načteny z Firestore pro ${user.email}`);
        } else {
            console.log(`💭 loadData: Žádné cíle v Firestore pro ${user.email}`);
        }

    } catch (error) {
        console.error(`❌ loadData: Chyba při načítání z Firestore pro ${user.email}:`, error);
        window.showNotification("Chyba: Data z cloudu nebylo možné načíst. Pokouším se načíst lokální data.", 5000);
    }

    // Fallback pro weightLog
    if (!firestoreWeightDataLoaded) {
        console.log("📁 loadData: Firestore weightLog nenačteno, pokouším se z LocalStorage.");
        if (savedWeightLog) {
            weightLog = JSON.parse(savedWeightLog);
            console.log("📁 loadData: Data weightLog načtena z LocalStorage.");
        } else {
            console.log("🆕 loadData: Žádná data weightLog. Používám prázdný seznam.");
            weightLog = [];
        }
    }

    // Načítání settings a goals z LocalStorage, pokud nejsou z Firestore
    if (!firestoreSettingsDataLoaded) {
        console.log("📁 loadData: Firestore nastavení nenačteno, pokouším se z LocalStorage.");
        if (savedSettings) {
            settings = { ...settings, ...JSON.parse(savedSettings) };
            console.log("📁 loadData: Nastavení načtena z LocalStorage.");
        } else {
            console.log("💭 loadData: Žádná nastavení v LocalStorage. Používám výchozí.");
        }
    } else {
        console.log("✅ loadData: Nastavení již načtena z Firestore, přeskakuji LocalStorage.");
    }
    
    if (!firestoreGoalsDataLoaded) {
        console.log("📁 loadData: Firestore cíle nenačteny, pokouším se z LocalStorage.");
        if (savedGoals) {
            goals = { ...goals, ...JSON.parse(savedGoals) };
            console.log("📁 loadData: Cíle načteny z LocalStorage.");
        } else {
            console.log("💭 loadData: Žádné cíle v LocalStorage. Používám výchozí.");
        }
    } else {
        console.log("✅ loadData: Cíle již načteny z Firestore, přeskakuji LocalStorage.");
    }

    settings.activityLevel = parseFloat(settings.activityLevel) || 1.55;
    console.log(`✅ loadData: Načítání dokončeno pro ${user.email}. Aktualizuji formuláře.`);
    window.updateForms();

    // Prvotní uložení dat do Firebase, pokud byla načtena z LocalStorage nebo kódu
    if (!firestoreWeightDataLoaded && (weightLog.length > 0 || savedWeightLog)) {
        console.log("💾 loadData: Detekována chybějící data weightLog ve Firestore. Ukládám aktuální data do cloudu.");
        await window.saveData();
    } else if (!firestoreSettingsDataLoaded && savedSettings) {
        console.log("💾 loadData: Detekována chybějící nastavení ve Firestore. Ukládám aktuální nastavení do cloudu.");
        await window.saveData();
    } else if (!firestoreGoalsDataLoaded && savedGoals) {
        console.log("💾 loadData: Detekovány chybějící cíle ve Firestore. Ukládám aktuální cíle do cloudu.");
        await window.saveData();
    }
    
    isDataLoading = false;
    console.log(`🎉 loadData: Kompletní načítání dokončeno pro ${user.email}!`);
};

// ✅ OPRAVENÁ FUNKCE: saveData s ověřením uživatele
window.saveData = async function() {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.warn("⚠️ saveData: Uživatel není přihlášen, nelze uložit data do cloudu.");
        // Aspoň ulož lokálně
        localStorage.setItem('weightLog_JirikTracker_v2_charts_separated_musclePercent', JSON.stringify(weightLog));
        localStorage.setItem('weightSettings_JirikTracker_v2_charts_separated_musclePercent', JSON.stringify(settings));
        localStorage.setItem('weightGoals_JirikTracker_v2_charts_separated_musclePercent', JSON.stringify(goals));
        return;
    }
    
    console.log(`💾 saveData: Ukládám data pro uživatele: ${user.email} (UID: ${user.uid})`);
    
    // Lokální uložení
    localStorage.setItem('weightLog_JirikTracker_v2_charts_separated_musclePercent', JSON.stringify(weightLog));
    localStorage.setItem('weightSettings_JirikTracker_v2_charts_separated_musclePercent', JSON.stringify(settings));
    localStorage.setItem('weightGoals_JirikTracker_v2_charts_separated_musclePercent', JSON.stringify(goals));
    console.log("💾 saveData: Lokální uložení dokončeno.");

    try {
        // Cloud uložení
        await window.saveWeightLogToFirestore(weightLog);
        console.log(`🔥 saveData: Váhová data uložena do Firestore pro ${user.email}`);
        
        await window.saveSettingsToFirestore(settings);
        console.log(`⚙️ saveData: Nastavení uložena do Firestore pro ${user.email}`);

        await window.saveGoalsToFirestore(goals);
        console.log(`🎯 saveData: Cíle uloženy do Firestore pro ${user.email}`);

    } catch (error) {
        console.error(`❌ saveData: Chyba při ukládání do Firestore pro ${user.email}:`, error);
        window.showNotification("Chyba: Data se nepodařilo uložit do cloudu!", 4000);
    }
    console.log(`✅ saveData: Ukládání dokončeno pro ${user.email}.`);
};

window.updateForms = function() {
    console.log("updateForms: Aktualizuji hodnoty formulářových polí.");
    document.getElementById('height').value = settings.height || '';
    document.getElementById('age').value = settings.age || '';
    document.getElementById('gender').value = settings.gender || 'male';
    document.getElementById('activityLevel').value = settings.activityLevel || '1.55';
    document.getElementById('bmiWarningUpper').value = settings.bmiWarningUpper || '';
    document.getElementById('bmiDangerUpper').value = settings.bmiDangerUpper || '';
    document.getElementById('bmiWarningLower').value = settings.bmiWarningLower || '';
    document.getElementById('reminderEnabled').checked = settings.reminderEnabled === true;
    document.getElementById('reminderInterval').value = settings.reminderInterval || 7;

    document.getElementById('targetWeight').value = goals.targetWeight || '';
    document.getElementById('targetBMI').value = goals.targetBMI || '';
    document.getElementById('targetDate').value = goals.targetDate || '';
    document.getElementById('weeklyGoal').value = goals.weeklyGoal || '';
    console.log("updateForms: Formuláře aktualizovány.");
};

window.calculateBMI = function(weight, height) {
    if (!height || height <=0 || !weight || weight <=0) return 0;
    const heightInMeters = height / 100;
    return weight / (heightInMeters * heightInMeters);
};

window.calculateBMR = function(weight, height, age, gender) {
    if (!weight || !height || !age || !gender) return 0;
    if (gender === 'male') {
        return (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
        return (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
};

window.calculateAMR = function(bmr, activityLevel) {
    if (!bmr || !activityLevel) return 0;
    return bmr * activityLevel;
};

window.classifyBMI = function(bmi) {
    if (bmi === 0) return { class: '', text: '-' };
    if (bmi < 18.5) return { class: 'bmi-underweight', text: 'Podváha' };
    if (bmi < 25) return { class: 'bmi-normal', text: 'Normální' };
    if (bmi < 30) return { class: 'bmi-overweight', text: 'Nadváha' };
    return { class: 'bmi-obese', text: 'Obezita' };
};

window.checkBMIAlert = function(bmi) {
    console.log("checkBMIAlert: Kontroluji BMI pro upozornění.");

    const alertEl = document.getElementById('bmiAlert');
    if (bmi === 0) {
        alertEl.className = 'alert';
        console.log("%ccheckBMIAlert: BMI je 0, upozornění skryto.", "color: #aaaaaa;");
        return;
    }

    if (bmi > settings.bmiDangerUpper) {
        alertEl.innerHTML = `⚠️ Varování: Vaše BMI (${bmi.toFixed(1)}) je výrazně nad doporučenou hranicí!`;
        alertEl.className = 'alert show';
        alertEl.style.background = '#ff5555';
        console.log("%ccheckBMIAlert: HLÍDAČ SYSTÉMU - BMI (" + bmi.toFixed(1) + ") je v nebezpečném pásmu.", "color: #ff5555; font-weight: bold;");
    } else if (bmi > settings.bmiWarningUpper) {
        alertEl.innerHTML = `⚡ Upozornění: Vaše BMI (${bmi.toFixed(1)}) překračuje doporučenou hranici.`;
        alertEl.className = 'alert show';
        alertEl.style.background = '#ffaa00';
        console.log("%ccheckBMIAlert: HLÍDAČ SYSTÉMU - BMI (" + bmi.toFixed(1) + ") překračuje doporučenou hranici.", "color: #ffaa00; font-weight: bold;");
    } else if (bmi < settings.bmiWarningLower && bmi > 0) {
        alertEl.innerHTML = `⚡ Upozornění: Vaše BMI (${bmi.toFixed(1)}) je pod doporučenou hranicí.`;
        alertEl.className = 'alert show';
        alertEl.style.background = '#00aaff';
        console.log("%ccheckBMIAlert: HLÍDAČ SYSTÉMU - BMI (" + bmi.toFixed(1) + ") je pod doporučenou hranici.", "color: #00aaff; font-weight: bold;");
    } else {
        alertEl.className = 'alert';
        console.log("%ccheckBMIAlert: HLÍDAČ SYSTÉMU - BMI (" + bmi.toFixed(1) + ") je v normě.", "color: #55ff99;");
    }
};

window.showNotification = function(message, duration = 3000) {
    console.log(`showNotification: Zobrazuji notifikaci: "${message}"`);
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
        console.log("showNotification: Notifikace skryta.");
    }, duration);
};

window.showTab = function(tabName) {
    console.log(`showTab: Přepínám na záložku: ${tabName}`);
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelector(`[onclick="showTab('${tabName}')"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
    console.log(`showTab: Záložka '${tabName}' aktivována.`);
};

window.formatDateForDisplay = function(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        console.warn(`formatDateForDisplay: Neplatné datum: ${dateStr}`);
        return 'Neplatné datum';
    }
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}. ${month}. ${year}`;
};

window.initializeCharts = function() {
    console.log("initializeCharts: Spuštěna inicializace grafů.");
    const commonOptions = (yLabel, xLabelColor = '#00d9ff', yLabelColor = '#00d9ff', gridColor = '#444', yPrecision = 1) => ({
        responsive: true, maintainAspectRatio: false,
        scales: {
            y: { beginAtZero: false, grid: { color: gridColor }, ticks: { color: yLabelColor, precision: yPrecision }, title: { display: !!yLabel, text: yLabel, color: yLabelColor } },
            x: { grid: { color: gridColor }, ticks: { color: xLabelColor, autoSkip: true, maxTicksLimit: 10 } }
        }, plugins: { legend: { labels: { color: xLabelColor } } }
    });
    
    const lineChartDataset = (label, data, borderColor, bgColor) => ({
        label: label, data: data, borderColor: borderColor, backgroundColor: bgColor,
        tension: 0.1, pointBackgroundColor: borderColor, pointBorderColor: '#fff',
        pointRadius: 4, pointHoverRadius: 6
    });

    console.log("initializeCharts: Ničím existující instance grafů pro znovuinicializaci.");
    if (weightChart) weightChart.destroy();
    if (bmiChart) bmiChart.destroy();
    if (bodyFatOnlyChart) bodyFatOnlyChart.destroy();
    if (muscleMassOnlyChart) muscleMassOnlyChart.destroy();
    if (bodyWaterChart) bodyWaterChart.destroy();
    if (manualBMRChart) manualBMRChart.destroy();
    if (manualAMRChart) manualAMRChart.destroy();

    weightChart = new Chart(document.getElementById('weightChart').getContext('2d'), { type: 'line', data: { labels: [], datasets: [lineChartDataset('Váha (kg)', [], '#00d9ff', 'rgba(0,217,255,0.2)')] }, options: commonOptions('Váha (kg)') });
    bmiChart = new Chart(document.getElementById('bmiChart').getContext('2d'), { type: 'line', data: { labels: [], datasets: [lineChartDataset('BMI', [], '#55ff99', 'rgba(85,255,153,0.2)')] }, options: commonOptions('BMI') });
    bodyWaterChart = new Chart(document.getElementById('bodyWaterChart').getContext('2d'), { type: 'line', data: { labels: [], datasets: [lineChartDataset('Voda v těle (%)', [], '#00aaff', 'rgba(0,170,255,0.2)')] }, options: commonOptions('Voda v těle (%)') });
    manualBMRChart = new Chart(document.getElementById('manualBMRChart').getContext('2d'), { type: 'line', data: { labels: [], datasets: [lineChartDataset('Zadané BMR (kcal)', [], '#ff9933', 'rgba(255,153,51,0.2)')] }, options: commonOptions('BMR (kcal)', undefined, undefined, undefined, 0) });
    manualAMRChart = new Chart(document.getElementById('manualAMRChart').getContext('2d'), { type: 'line', data: { labels: [], datasets: [lineChartDataset('Zadané AMR (kcal)', [], '#cc66ff', 'rgba(204,102,255,0.2)')] }, options: commonOptions('AMR (kcal)', undefined, undefined, undefined, 0) });
    bodyFatOnlyChart = new Chart(document.getElementById('bodyFatOnlyChart').getContext('2d'), { type: 'line', data: { labels: [], datasets: [lineChartDataset('Tělesný tuk (%)', [], '#ff5555', 'rgba(255,85,85,0.2)')]}, options: commonOptions('Tuk (%)') });
    muscleMassOnlyChart = new Chart(document.getElementById('muscleMassOnlyChart').getContext('2d'), { type: 'line', data: { labels: [], datasets: [lineChartDataset('Svalová hmota (%)', [], '#ffff55', 'rgba(255,255,85,0.2)')]}, options: commonOptions('Svaly (%)') });
    console.log("initializeCharts: Grafy inicializovány.");
};

window.updateCharts = function() {
    console.log("updateCharts: Aktualizuji data v grafech.");
    if (!weightLog || weightLog.length === 0) {
        console.log("updateCharts: Žádná data pro aktualizaci grafů.");
        return;
    }
    const sortedData = [...weightLog].sort((a, b) => new Date(a.date) - new Date(b.date));
    const labels = sortedData.map(entry => window.formatDateForDisplay(entry.date));
    
    const weights = sortedData.map(entry => entry.weight);
    const bmis = sortedData.map(entry => window.calculateBMI(entry.weight, settings.height).toFixed(1));
    const bodyFats = sortedData.map(entry => entry.bodyFat);
    
    const muscleMassPercentages = sortedData.map(entry => {
        if (entry.muscleMass && entry.weight && entry.weight > 0) {
            return parseFloat(((entry.muscleMass / entry.weight) * 100).toFixed(1));
        }
        return NaN;
    });

    const bodyWaters = sortedData.map(entry => entry.bodyWater);
    const manualBMRs = sortedData.map(entry => entry.manualBMR);
    const manualAMRs = sortedData.map(entry => entry.manualAMR);

    weightChart.data.labels = labels; weightChart.data.datasets[0].data = weights; weightChart.update();
    bmiChart.data.labels = labels; bmiChart.data.datasets[0].data = bmis; bmiChart.update();
    bodyWaterChart.data.labels = labels; bodyWaterChart.data.datasets[0].data = bodyWaters.map(bw => bw === null || bw === undefined ? NaN : bw); bodyWaterChart.update();
    manualBMRChart.data.labels = labels; manualBMRChart.data.datasets[0].data = manualBMRs.map(val => val === null || val === undefined ? NaN : val); manualBMRChart.update();
    manualAMRChart.data.labels = labels; manualAMRChart.data.datasets[0].data = manualAMRs.map(val => val === null || val === undefined ? NaN : val); manualAMRChart.update();
    bodyFatOnlyChart.data.labels = labels; bodyFatOnlyChart.data.datasets[0].data = bodyFats.map(bf => bf === null || bf === undefined ? NaN : bf); bodyFatOnlyChart.update();
    muscleMassOnlyChart.data.labels = labels; muscleMassOnlyChart.data.datasets[0].data = muscleMassPercentages; muscleMassOnlyChart.update();
    console.log("updateCharts: Grafy úspěšně aktualizovány.");
};

window.updateTable = function() {
    console.log("updateTable: Aktualizuji tabulku záznamů.");
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';
    if (!weightLog || settings.height <=0) {
        console.log("updateTable: Žádná data nebo nastavení výšky pro zobrazení tabulky.");
        return;
    }

    const sortedData = [...weightLog].sort((a, b) => new Date(b.date) - new Date(a.date));
    console.log(`updateTable: Zpracovávám ${sortedData.length} záznamů pro tabulku.`);
    
    sortedData.forEach((entry, index) => {
        const bmi = window.calculateBMI(entry.weight, settings.height);
        const classification = window.classifyBMI(bmi);
        
        let weightDiffText = '-';
        let diffClass = '';
        const chronologicalLog = [...weightLog].sort((a, b) => new Date(a.date) - new Date(b.date));
        const currentEntryIndexChronological = chronologicalLog.findIndex(e => e.date === entry.date);
        const previousChronologicalEntry = currentEntryIndexChronological > 0 ? chronologicalLog[currentEntryIndexChronological -1] : null;

        if (previousChronologicalEntry) {
            const weightDiff = (entry.weight - previousChronologicalEntry.weight);
            weightDiffText = (weightDiff > 0 ? '+' : '') + weightDiff.toFixed(1);
            diffClass = weightDiff > 0 ? 'gain' : (weightDiff < 0 ? 'loss' : '');
        }

        let muscleMassDisplay = '-';
        if (entry.muscleMass && entry.weight && entry.weight > 0) {
            muscleMassDisplay = ((entry.muscleMass / entry.weight) * 100).toFixed(1) + '%';
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${sortedData.length - index}</td>
            <td>${window.formatDateForDisplay(entry.date)}</td>
            <td>${entry.weight !== null && entry.weight !== undefined ? entry.weight.toFixed(1) : '-'}</td>
            <td class="${diffClass}">${weightDiffText}</td>
            <td class="${classification.class}">${bmi > 0 ? bmi.toFixed(1) : '-'}</td>
            <td class="${classification.class}">${classification.text}</td>
            <td>${entry.bodyFat !== null && entry.bodyFat !== undefined ? entry.bodyFat.toFixed(1) : '-'}%</td>
            <td>${muscleMassDisplay}</td>
            <td>${entry.bodyWater !== null && entry.bodyWater !== undefined ? entry.bodyWater.toFixed(1) : '-'}%</td>
            <td>${entry.manualBMR !== null && entry.manualBMR !== undefined ? entry.manualBMR : '-'}</td>
            <td>${entry.manualAMR !== null && entry.manualAMR !== undefined ? entry.manualAMR : '-'}</td>
            <td title="${entry.notes || ''}">${(entry.notes || '').substring(0,10)}${(entry.notes || '').length > 10 ? '...' : ''}</td>
            <td>
                <button class="danger" onclick="deleteEntry('${entry.date}')" title="Smazat">🗑️</button>
                <button onclick="editEntry('${entry.date}')" title="Upravit">✏️</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    console.log("updateTable: Tabulka úspěšně aktualizována.");
};

window.updateStats = function() {
    console.log("updateStats: Aktualizuji statistiky.");
    if (weightLog.length === 0) {
        console.log("updateStats: Žádná data pro zobrazení statistik.");
        document.getElementById('currentWeight').textContent = '-';
        document.getElementById('currentBMI').textContent = '-';
        document.getElementById('currentBMI').className = 'stat-value';
        document.getElementById('weightChange').textContent = '-';
        document.getElementById('weightChange').className = 'stat-value';
        document.getElementById('currentBodyWater').textContent = '-';
        document.getElementById('lastManualBMR').textContent = '-';
        document.getElementById('lastManualAMR').textContent = '-';
        document.getElementById('theoreticalBMR').textContent = '-';
        document.getElementById('theoreticalAMR').textContent = '-';
        document.getElementById('goalProgress').textContent = '-';
        document.getElementById('goalProgressBarCard').style.display = 'none';
        document.getElementById('latestEntryDate').textContent = 'Žádná data k zobrazení.';
        return;
    }

    const sortedLog = [...weightLog].sort((a, b) => new Date(a.date) - new Date(b.date));
    const latestEntry = sortedLog[sortedLog.length - 1];
    
    const currentWeight = latestEntry.weight;
    const currentBMI = window.calculateBMI(currentWeight, settings.height);
    const currentBodyWater = latestEntry.bodyWater;

    document.getElementById('currentWeight').textContent = currentWeight.toFixed(1);
    document.getElementById('currentBMI').textContent = currentBMI > 0 ? currentBMI.toFixed(1) : '-';
    document.getElementById('currentBMI').className = 'stat-value ' + window.classifyBMI(currentBMI).class;
    document.getElementById('currentBodyWater').textContent = currentBodyWater !== null && currentBodyWater !== undefined ? currentBodyWater.toFixed(1) : '-';
    document.getElementById('lastManualBMR').textContent = latestEntry.manualBMR !== null && latestEntry.manualBMR !== undefined ? latestEntry.manualBMR : '-';
    document.getElementById('lastManualAMR').textContent = latestEntry.manualAMR !== null && latestEntry.manualAMR !== undefined ? latestEntry.manualAMR : '-';

    let weightChangeVal = 0;
    let weightChangeText = '-';
    let changeClass = '';
    if (sortedLog.length >= 2) {
        const previousEntry = sortedLog[sortedLog.length - 2];
        weightChangeVal = currentWeight - previousEntry.weight;
        weightChangeText = (weightChangeVal >= 0 ? '+' : '') + weightChangeVal.toFixed(1);
        changeClass = weightChangeVal > 0 ? 'gain' : (weightChangeVal < 0 ? 'loss' : '');
    }
    document.getElementById('weightChange').textContent = weightChangeText;
    document.getElementById('weightChange').className = 'stat-value ' + changeClass;

    const theoBMR = window.calculateBMR(currentWeight, settings.height, settings.age, settings.gender);
    const theoAMR = window.calculateAMR(theoBMR, settings.activityLevel);
    document.getElementById('theoreticalBMR').textContent = theoBMR > 0 ? Math.round(theoBMR) : '-';
    document.getElementById('theoreticalAMR').textContent = theoAMR > 0 ? Math.round(theoAMR) : '-';
    
    document.getElementById('latestEntryDate').textContent = `Poslední záznam: ${window.formatDateForDisplay(latestEntry.date)}`;

    if (goals.targetWeight && sortedLog.length > 0) {
        console.log("updateStats: Počítám pokrok k cíli.");
        const initialWeight = sortedLog[0].weight;
        const totalChangeNeeded = goals.targetWeight - initialWeight;
        const currentChangeAchieved = currentWeight - initialWeight;
        let progressPercent = 0;

        if (totalChangeNeeded !== 0) {
            if ((totalChangeNeeded < 0 && currentWeight <= initialWeight && currentWeight >= goals.targetWeight) ||
                (totalChangeNeeded > 0 && currentWeight >= initialWeight && currentWeight <= goals.targetWeight)) {
                progressPercent = (Math.abs(currentChangeAchieved) / Math.abs(totalChangeNeeded)) * 100;
            } else if ((totalChangeNeeded < 0 && currentWeight < goals.targetWeight) || (totalChangeNeeded > 0 && currentWeight > goals.targetWeight)) {
                progressPercent = 100;
            } else {
                progressPercent = 0;
            }
        } else {
            progressPercent = (initialWeight === currentWeight) ? 100 : 0;
        }
        progressPercent = Math.min(100, Math.max(0, progressPercent));

        document.getElementById('goalProgress').textContent = `${progressPercent.toFixed(1)}%`;
        document.getElementById('goalProgressBarCard').style.display = 'block';
        document.getElementById('progressFill').style.width = `${progressPercent}%`;
        
        const remainingKg = goals.targetWeight - currentWeight;
        if (progressPercent >= 100) {
            window.document.getElementById('goalStatus').textContent = `🎉 Cíl ${goals.targetWeight} kg dosažen/překonán!`;
        } else {
            window.document.getElementById('goalStatus').textContent = `Zbývá: ${remainingKg.toFixed(1)} kg do cíle (${goals.targetWeight} kg)`;
        }

        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        const now = new Date();
        const recentLog = sortedLog.filter(entry => (now - new Date(entry.date)) <= THIRTY_DAYS_MS);

        if (recentLog.length >= 2 && remainingKg !== 0) {
            const oldestRecent = recentLog[0];
            const latestRecent = recentLog[recentLog.length - 1];
            const daysElapsed = Math.max(1, Math.floor((new Date(latestRecent.date) - new Date(oldestRecent.date)) / (1000 * 60 * 60 * 24)));
            const weightChangeInPeriod = latestRecent.weight - oldestRecent.weight;
            const dailyChange = weightChangeInPeriod / daysElapsed;
            let estimateText = 'Nedostatek dat pro odhad.';

            if (dailyChange !== 0 && ((remainingKg < 0 && dailyChange < 0) || (remainingKg > 0 && dailyChange > 0))) {
                const estimatedDays = Math.abs(remainingKg / dailyChange);
                if (estimatedDays > 365 * 3) {
                    estimateText = 'Odhad: více než 3 roky';
                } else if (estimatedDays > 365) {
                    estimateText = `Odhad: cca ${Math.round(estimatedDays/30.44)} měsíců`;
                } else {
                    estimateText = `Odhad: cca ${Math.round(estimatedDays)} dní (~${Math.round(estimatedDays / 7)} týdnů)`;
                }
            } else if (dailyChange === 0 && remainingKg !== 0) {
                estimateText = 'Odhad: stagnace, cíl se nepřibližuje.';
            } else if (remainingKg !== 0) {
                estimateText = 'Odhad: aktuálně se vzdalujete od cíle.';
            }
            document.getElementById('goalEstimate').textContent = estimateText;
        } else if (remainingKg === 0) {
            document.getElementById('goalEstimate').textContent = 'Cíl dosažen!';
        } else {
            document.getElementById('goalEstimate').textContent = 'Nedostatek dat za posl. 30 dní pro odhad.';
        }
    } else {
        document.getElementById('goalProgress').textContent = '-';
        document.getElementById('goalProgressBarCard').style.display = 'none';
        document.getElementById('goalEstimate').textContent = 'Cíl není nastaven.';
    }
    window.checkBMIAlert(currentBMI);
    console.log("updateStats: Statistiky aktualizovány.");
};

window.updateRecommendations = function() {
    console.log("updateRecommendations: Aktualizuji doporučení.");
    if (weightLog.length === 0 ) {
        document.getElementById('recommendationText').innerHTML = '<p>Pro doporučení zadejte více dat.</p>';
        console.log("updateRecommendations: Žádná data pro generování doporučení.");
        return;
    }
    const sortedDataDesc = [...weightLog].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latestEntry = sortedDataDesc[0];
    const currentWeight = latestEntry.weight;
    const currentBMI = window.calculateBMI(currentWeight, settings.height);
    
    let recommendations = [];

    if (currentBMI > 0) {
        if (currentBMI < 18.5) recommendations.push("💚 Vaše BMI naznačuje podváhu. Zvažte konzultaci s lékařem o zdravém přírůstku váhy.");
        else if (currentBMI > settings.bmiDangerUpper) recommendations.push("❤️ Vaše BMI je v pásmu obezity. Důrazně doporučujeme konzultaci s lékařem a úpravu životního stylu.");
        else if (currentBMI > settings.bmiWarningUpper) recommendations.push("💛 Vaše BMI signalizuje nadváhu. Doporučujeme zaměřit se na vyváženou stravu a pravidelný pohyb.");
        else recommendations.push("✅ Vaše BMI je v normálním rozmezí. Udržujte si zdravý životní styl!");
    } else if(settings.height) {
        recommendations.push("⚠️ Zadejte výšku pro výpočet BMI a relevantní doporučení.");
    }

    const sevenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 7));
    const fourteenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 14));
    
    const last7DaysEntries = weightLog.filter(e => new Date(e.date) >= sevenDaysAgo);
    const prev7DaysEntries = weightLog.filter(e => new Date(e.date) >= fourteenDaysAgo && new Date(e.date) < sevenDaysAgo);

    if (last7DaysEntries.length > 1 && prev7DaysEntries.length > 1) {
        const avgLast7 = last7DaysEntries.reduce((sum, e) => sum + e.weight, 0) / last7DaysEntries.length;
        const avgPrev7 = prev7DaysEntries.reduce((sum, e) => sum + e.weight, 0) / prev7DaysEntries.length;
        const weeklyTrend = avgLast7 - avgPrev7;

        if (Math.abs(weeklyTrend) > 1.5) {
            recommendations.push(`⚠️ Rychlá změna váhy (${weeklyTrend.toFixed(1)} kg/týden průměrně). Zvažte pozvolnější tempo (ideálně 0.5-1 kg/týden).`);
        } else if (weeklyTrend !== 0) {
            recommendations.push(`📈 Týdenní trend váhy: ${weeklyTrend.toFixed(1)} kg. Pokračujte ve svém úsilí!`);
        }
    } else if (last7DaysEntries.length >=2) {
        const sortedWeek = last7DaysEntries.sort((a,b) => new Date(a.date) - new Date(b.date));
        const weekChange = sortedWeek[sortedWeek.length-1].weight - sortedWeek[0].weight;
        if (Math.abs(weekChange) > 1.5) {
            recommendations.push(`⚠️ Rychlá změna váhy za poslední dny: ${weekChange.toFixed(1)} kg. Doporučujeme pozvolnější změny.`);
        }
    }

    if (goals.targetWeight && goals.targetDate) {
        console.log("updateRecommendations: Počítám doporučení pro cíle.");
        const daysToGoal = Math.ceil((new Date(goals.targetDate) - new Date()) / (1000 * 60 * 60 * 24));
        const weightToChange = goals.targetWeight - currentWeight;
        
        if (daysToGoal > 0 && weightToChange !== 0) {
            const requiredWeeklyChange = (weightToChange / (daysToGoal / 7)).toFixed(1);
            recommendations.push(`🎯 Pro dosažení cíle (${goals.targetWeight} kg) do ${window.formatDateForDisplay(goals.targetDate)}, je potřeba průměrná týdenní změna ${requiredWeeklyChange} kg.`);
            if (Math.abs(requiredWeeklyChange) > 1.5) {
                recommendations.push("💡 Tento týdenní cíl je poměrně ambiciózní. Ujistěte se, že je udržitelný a zdravý.");
            }
        } else if (weightToChange === 0) {
            recommendations.push(`🎯 Cílová váha ${goals.targetWeight} kg dosažena! Gratulujeme!`);
        } else if (daysToGoal <=0 && weightToChange !==0) {
            recommendations.push(`🗓️ Termín pro cíl ${goals.targetWeight} kg již vypršel. Zvažte nastavení nového cíle.`);
        }
    } else if (goals.targetWeight) {
        const weightToChange = goals.targetWeight - currentWeight;
        if (weightToChange === 0) recommendations.push(`🎯 Cílová váha ${goals.targetWeight} kg dosažena!`);
        else recommendations.push(`🎯 Cíl: ${goals.targetWeight} kg. Aktuálně zbývá ${weightToChange.toFixed(1)} kg.`);
    }

    const theoBMR = window.calculateBMR(currentWeight, settings.height, settings.age, settings.gender);
    const theoAMR = window.calculateAMR(theoBMR, settings.activityLevel);
    
    if (theoAMR > 0 && goals.weeklyGoal) {
        const weeklyCalDeficitOrSurplus = goals.weeklyGoal * 7700;
        const dailyCalAdjustment = weeklyCalDeficitOrSurplus / 7;
        const targetCalories = Math.round(theoAMR + dailyCalAdjustment);
        let goalType = goals.weeklyGoal < 0 ? "hubnutí" : (goals.weeklyGoal > 0 ? "nabírání" : "udržování");

        recommendations.push(`🔥 Pro týdenní cíl ${goals.weeklyGoal} kg (${goalType}), váš odhadovaný denní příjem by mohl být okolo ${targetCalories} kcal (Teoretický AMR: ${Math.round(theoAMR)} kcal).`);
        if (targetCalories < theoBMR && goals.weeklyGoal < 0) {
            recommendations.push("❗ Váš cílový denní příjem je pod vaším teoretickým BMR. Dlouhodobě to nemusí být udržitelné. Zvažte mírnější cíl nebo konzultaci s odborníkem.");
        }
    } else if (theoAMR > 0 && latestEntry.manualAMR) {
        recommendations.push(`💡 Váš poslední zadaný AMR je ${latestEntry.manualAMR} kcal. Teoreticky vypočtený AMR je ${Math.round(theoAMR)} kcal. Rozdíl může být dán specifickou aktivitou nebo metodikou měření.`);
    }
    document.getElementById('recommendationText').innerHTML = recommendations.length > 0 ? recommendations.map(rec => `<p>${rec}</p>`).join('') : '<p>Žádná specifická doporučení. Udržujte zdravé návyky!</p>';
    console.log("updateRecommendations: Doporučení aktualizována.");
};

window.updateDisplay = function() {
    console.log("updateDisplay: Spuštěna celková aktualizace zobrazení.");
    window.updateTable();
    window.updateCharts();
    window.updateStats();
    window.updateRecommendations();
    console.log("updateDisplay: Celkové zobrazení aktualizováno.");
};

// ✅ UPRAVENÉ UDÁLOSTI FORMULÁŘŮ - s ověřením přihlášení
document.getElementById('entryForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // 🛡️ Ověř přihlášení
    if (!window.ensureUserLoggedIn()) return;
    
    console.log("entryForm: Odesílání nového záznamu.");
    const date = document.getElementById('entryDate').value;
    const weight = parseFloat(document.getElementById('entryWeight').value);
    const bodyFat = document.getElementById('entryBodyFat').value ? parseFloat(document.getElementById('entryBodyFat').value) : null;
    const muscleMass = document.getElementById('entryMuscleMass').value ? parseFloat(document.getElementById('entryMuscleMass').value) : null;
    const bodyWater = document.getElementById('entryBodyWater').value ? parseFloat(document.getElementById('entryBodyWater').value) : null;
    const manualBMR = document.getElementById('entryManualBMR').value ? parseInt(document.getElementById('entryManualBMR').value) : null;
    const manualAMR = document.getElementById('entryManualAMR').value ? parseInt(document.getElementById('entryManualAMR').value) : null;
    const notes = document.getElementById('entryNotes').value;

    if (isNaN(weight) || weight <= 0) {
        window.showNotification('Chyba: Zadejte platnou váhu.', 3000);
        console.warn("entryForm: Neplatná váha zadána.");
        return;
    }

    const newEntryData = { date, weight, bodyFat, muscleMass, bodyWater, manualBMR, manualAMR, notes };
    console.log("entryForm: Nová data záznamu:", newEntryData);

    const existingIndex = weightLog.findIndex(entry => entry.date === date);
    if (existingIndex !== -1) {
        console.log("entryForm: Záznam pro toto datum již existuje. Dotazuji na přepsání.");
        if (confirm('Záznam pro tento datum již existuje. Chcete ho přepsat?')) {
            weightLog[existingIndex] = newEntryData;
            console.log("entryForm: Existující záznam přepsán.");
        } else {
            console.log("entryForm: Přepsání záznamu zrušeno.");
            return;
        }
    } else {
        weightLog.push(newEntryData);
        console.log("entryForm: Nový záznam přidán.");
    }
    
    await window.saveData();
    window.updateDisplay();
    window.showNotification('Záznam byl úspěšně přidán/aktualizován!');
    this.reset();
    window.setTodayDate();
    window.showTab('dashboard');
    console.log("entryForm: Zpracování záznamu dokončeno.");
});

document.getElementById('settingsForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!window.ensureUserLoggedIn()) return;
    
    console.log("settingsForm: Odesílání nastavení.");
    settings.height = parseInt(document.getElementById('height').value);
    settings.age = document.getElementById('age').value ? parseInt(document.getElementById('age').value) : null;
    settings.gender = document.getElementById('gender').value;
    settings.activityLevel = parseFloat(document.getElementById('activityLevel').value);
    console.log("settingsForm: Nové hodnoty nastavení:", settings);
    await window.saveData();
    window.updateDisplay();
    window.showNotification('Nastavení byla uložena!');
    console.log("settingsForm: Nastavení uložena.");
});

document.getElementById('bmiAlertsForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!window.ensureUserLoggedIn()) return;
    
    console.log("bmiAlertsForm: Odesílání BMI hranic.");
    settings.bmiWarningUpper = parseFloat(document.getElementById('bmiWarningUpper').value);
    settings.bmiDangerUpper = parseFloat(document.getElementById('bmiDangerUpper').value);
    settings.bmiWarningLower = parseFloat(document.getElementById('bmiWarningLower').value);
    console.log("bmiAlertsForm: Nové BMI hranice:", { warningUpper: settings.bmiWarningUpper, dangerUpper: settings.bmiDangerUpper, warningLower: settings.bmiWarningLower });
    await window.saveData();
    window.updateDisplay();
    window.showNotification('BMI hranice byly uloženy!');
    console.log("bmiAlertsForm: BMI hranice uloženy.");
});

document.getElementById('remindersForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!window.ensureUserLoggedIn()) return;
    
    console.log("remindersForm: Odesílání nastavení připomínek.");
    settings.reminderEnabled = document.getElementById('reminderEnabled').checked;
    settings.reminderInterval = parseInt(document.getElementById('reminderInterval').value);
    console.log("remindersForm: Nové nastavení připomínek:", { enabled: settings.reminderEnabled, interval: settings.reminderInterval });
    await window.saveData();
    window.showNotification('Nastavení připomínek bylo uloženo!');
    console.log("remindersForm: Nastavení připomínek uloženo.");
});

document.getElementById('goalsForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!window.ensureUserLoggedIn()) return;
    
    console.log("goalsForm: Odesílání cílů.");
    goals.targetWeight = document.getElementById('targetWeight').value ? parseFloat(document.getElementById('targetWeight').value) : null;
    goals.targetBMI = document.getElementById('targetBMI').value ? parseFloat(document.getElementById('targetBMI').value) : null;
    goals.targetDate = document.getElementById('targetDate').value || null;
    goals.weeklyGoal = document.getElementById('weeklyGoal').value ? parseFloat(document.getElementById('weeklyGoal').value) : null;
    console.log("goalsForm: Nové cíle:", goals);
    await window.saveData();
    window.updateDisplay();
    window.showNotification('Cíle byly uloženy!');
    console.log("goalsForm: Cíle uloženy.");
});

// ✅ OPRAVENÉ FUNKCE: s ověřením přihlášení
window.deleteEntry = async function(date) {
    if (!window.ensureUserLoggedIn()) return;
    
    console.log(`deleteEntry: Pokus o smazání záznamu pro datum: ${date}.`);
    if (confirm(`Opravdu chcete smazat záznam ze dne ${window.formatDateForDisplay(date)}?`)) {
        weightLog = weightLog.filter(entry => entry.date !== date);
        console.log(`deleteEntry: Záznam pro datum ${date} smazán z lokální paměti.`);
        
        // Smaž z Firestore
        try {
            await window.deleteWeightEntryFromFirestore(date);
            console.log(`🔥 deleteEntry: Záznam smazán z Firestore pro datum ${date}`);
        } catch (error) {
            console.error("❌ deleteEntry: Chyba při mazání z Firestore:", error);
        }
        
        await window.saveData();
        window.updateDisplay();
        window.showNotification('Záznam byl smazán!');
        console.log("deleteEntry: Smazání záznamu dokončeno.");
    } else {
        console.log("deleteEntry: Smazání záznamu zrušeno.");
    }
};

window.editEntry = function(date) {
    if (!window.ensureUserLoggedIn()) return;
    
    console.log(`editEntry: Pokus o editaci záznamu pro datum: ${date}.`);
    const entry = weightLog.find(e => e.date === date);
    if (entry) {
        document.getElementById('entryDate').value = entry.date;
        document.getElementById('entryWeight').value = entry.weight;
        document.getElementById('entryBodyFat').value = entry.bodyFat || '';
        document.getElementById('entryMuscleMass').value = entry.muscleMass || '';
        document.getElementById('entryBodyWater').value = entry.bodyWater || '';
        document.getElementById('entryManualBMR').value = entry.manualBMR || '';
        document.getElementById('entryManualAMR').value = entry.manualAMR || '';
        document.getElementById('entryNotes').value = entry.notes || '';
        window.showTab('add-entry');
        window.showNotification(`Záznam ze dne ${window.formatDateForDisplay(date)} načten pro editaci.`);
        console.log("editEntry: Záznam načten do formuláře pro editaci.");
    } else {
        console.warn(`editEntry: Záznam pro datum ${date} nebyl nalezen pro editaci.`);
    }
};

window.exportToCSV = function() {
    if (!window.ensureUserLoggedIn()) return;
    
    console.log("exportToCSV: Spusten export dat do CSV.");
    if (weightLog.length === 0) { window.showNotification("Není co exportovat.", 2000); console.warn("exportToCSV: Žádná data k exportu."); return; }
    const headers = ['Datum', 'Vaha (kg)', 'BMI', 'Telesny tuk (%)', 'Svalova hmota (%)', 'Svalova hmota (kg)', 'Voda v tele (%)', 'Manual BMR', 'Manual AMR', 'Poznamky'];
    const rows = weightLog.map(entry => {
        let musclePercent = '';
        if (entry.muscleMass && entry.weight && entry.weight > 0) {
            musclePercent = ((entry.muscleMass / entry.weight) * 100).toFixed(1);
        }
        return [
            entry.date, entry.weight, window.calculateBMI(entry.weight, settings.height).toFixed(1),
            entry.bodyFat || '', musclePercent, entry.muscleMass || '', entry.bodyWater || '',
            entry.manualBMR || '', entry.manualAMR || '', `"${(entry.notes || '').replace(/"/g, '""')}"`
        ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + '\n' + rows.map(row => row.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vaha_export_Jirik_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    window.showNotification('CSV export dokončen!');
    console.log("exportToCSV: Export CSV dokončen.");
};

window.exportToPDF = function() {
    if (!window.ensureUserLoggedIn()) return;
    
    console.log("exportToPDF: Spusten export dat do PDF.");
    if (weightLog.length === 0) { window.showNotification("Není co exportovat.", 2000); console.warn("exportToPDF: Žádná data k exportu."); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18); doc.text('Váhový report - Admiral Jirik', 14, 22);
    doc.setFontSize(11); doc.text(`Generováno: ${window.formatDateForDisplay(new Date().toISOString().split('T')[0])}`, 14, 30);
    doc.text(`Výška: ${settings.height} cm, Věk: ${settings.age || '-'} let, Pohlaví: ${settings.gender === 'male' ? 'Muž' : 'Žena'}`, 14, 36);
    
    const latestEntry = [...weightLog].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (latestEntry) {
        const currentBMI = window.calculateBMI(latestEntry.weight, settings.height);
        const theoBMR = window.calculateBMR(latestEntry.weight, settings.height, settings.age, settings.gender);
        const theoAMR = window.calculateAMR(theoBMR, settings.activityLevel);
        doc.text(`Aktuální váha: ${latestEntry.weight.toFixed(1)} kg, BMI: ${currentBMI > 0 ? currentBMI.toFixed(1) : '-'}`, 14, 42);
        if (latestEntry.manualBMR || latestEntry.manualAMR) {
            doc.text(`Posl. zadaný BMR: ${latestEntry.manualBMR || '-'} kcal, AMR: ${latestEntry.manualAMR || '-'} kcal`, 14, 48);
        } else {
            doc.text(`Teoretický BMR: ${theoBMR > 0 ? Math.round(theoBMR) : '-'} kcal, AMR: ${theoAMR > 0 ? Math.round(theoAMR) : '-'} kcal`, 14, 48);
        }
    }

    const tableColumn = ["#", "Datum", "Váha", "BMI", "Tuk%", "Svaly%", "Voda%", "Zad.BMR", "Zad.AMR"];
    const tableRows = [];
    const sortedLog = [...weightLog].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedLog.forEach((entry, index) => {
        const bmi = window.calculateBMI(entry.weight, settings.height);
        let musclePercentText = '-';
        if (entry.muscleMass && entry.weight && entry.weight > 0) {
            musclePercentText = ((entry.muscleMass / entry.weight) * 100).toFixed(1);
        }
        const rowData = [
            index + 1, window.formatDateForDisplay(entry.date), entry.weight.toFixed(1),
            bmi > 0 ? bmi.toFixed(1) : '-',
            entry.bodyFat !== null && entry.bodyFat !== undefined ? entry.bodyFat.toFixed(1) : '-',
            musclePercentText,
            entry.bodyWater !== null && entry.bodyWater !== undefined ? entry.bodyWater.toFixed(1) : '-',
            entry.manualBMR !== null && entry.manualBMR !== undefined ? entry.manualBMR : '-',
            entry.manualAMR !== null && entry.manualAMR !== undefined ? entry.manualAMR : '-',
        ];
        tableRows.push(rowData);
    });

    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 55, theme: 'grid', headStyles: { fillColor: [13, 17, 23], textColor: [0, 217, 255] }, styles: { font: "Consolas", cellPadding: 1.5, fontSize: 7 }, columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 20 }, } });
    doc.save(`vaha_report_Jirik_${new Date().toISOString().split('T')[0]}.pdf`);
    window.showNotification('PDF report dokončen!');
    console.log("exportToPDF: Export PDF dokončen.");
};

window.exportChartsAsPDF = function() {
    if (!window.ensureUserLoggedIn()) return;
    
    console.log("exportChartsAsPDF: Spusten export grafů do PDF.");
    if (weightLog.length === 0) { window.showNotification("Není co exportovat.", 2000); console.warn("exportChartsAsPDF: Žádná data pro export."); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    let yPos = 20; const chartWidth = 180; const chartHeight = 70; const spacing = 10;
    doc.setFontSize(18); doc.text('Grafy vývoje - Admiral Jirik', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    const chartsToExport = [
        { canvasId: 'weightChart', title: 'Vývoj váhy' }, { canvasId: 'bmiChart', title: 'Vývoj BMI' },
        { canvasId: 'bodyFatOnlyChart', title: 'Vývoj tělesného tuku (%)' }, { canvasId: 'muscleMassOnlyChart', title: 'Vývoj svalové hmoty (%)' },
        { canvasId: 'bodyWaterChart', title: 'Vývoj vody v těle (%)' }, { canvasId: 'manualBMRChart', title: 'Vývoj zadaného BMR (kcal)' },
        { canvasId: 'manualAMRChart', title: 'Vývoj zadaného AMR (kcal)' }
    ];
    chartsToExport.forEach((chartInfo, index) => {
        const canvas = document.getElementById(chartInfo.canvasId);
        const chartInstance = Chart.getChart(canvas);
        let hasData = false;
        if (chartInstance && chartInstance.data.labels.length > 0) {
            hasData = chartInstance.data.datasets.some(dataset => dataset.data.some(d => d !== null && !isNaN(d) && d !== undefined));
        }
        if (!hasData) return;
        if (yPos + chartHeight + spacing > doc.internal.pageSize.getHeight() - 15 && index > 0) { doc.addPage(); yPos = 20; }
        doc.setFontSize(12); doc.text(chartInfo.title, 15, yPos); yPos += 5;
        const imgData = canvas.toDataURL('image/png', 0.95);
        doc.addImage(imgData, 'PNG', 15, yPos, chartWidth, chartHeight); yPos += chartHeight + spacing;
    });
    doc.save(`vaha_grafy_Jirik_${new Date().toISOString().split('T')[0]}.pdf`);
    window.showNotification('Grafy exportovány do PDF!');
    console.log("exportChartsAsPDF: Export grafů dokončen.");
};

window.exportBackup = function() {
    if (!window.ensureUserLoggedIn()) return;
    
    console.log("exportBackup: Spuštěno vytváření úplné zálohy.");
    const backupData = {
        weightLog: weightLog, settings: settings, goals: goals,
        exportDate: new Date().toISOString(), appName: "Pokročilý váhový tracker více admirála Jiříka", version: "1.5.0"
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vaha_zaloha_Jirik_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    window.showNotification('Úplná záloha vytvořena!');
    console.log("exportBackup: Úplná záloha vytvořena.");
};

window.importFromCSV = async function(inputElement) {
    if (!window.ensureUserLoggedIn()) return;
    
    console.log("importFromCSV: Spuštěn import dat z CSV.");
    const file = inputElement.files[0]; if (!file) { console.warn("importFromCSV: Žádný soubor vybrán."); return; }
    const reader = new FileReader();
    reader.onload = async function(e) {
        console.log("importFromCSV: Soubor CSV načten.");
        const csv = e.target.result; const lines = csv.split(/\r\n|\n/);
        if (lines.length <= 1) { window.showNotification('CSV soubor je prázdný nebo neobsahuje data.', 3000); console.warn("importFromCSV: CSV soubor je prázdný."); inputElement.value = ''; return; }
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const muscleKgOrPercentIdx = headers.indexOf('svalova hmota (kg)') !== -1 ? headers.indexOf('svalova hmota (kg)') : headers.indexOf('svalova hmota (%)');
        
        const dateIdx = headers.indexOf('datum'); const weightIdx = headers.indexOf('vaha (kg)');
        const fatIdx = headers.indexOf('telesny tuk (%)'); const waterIdx = headers.indexOf('voda v tele (%)');
        const manualBmrIdx = headers.indexOf('manual bmr'); const manualAmrIdx = headers.indexOf('manual amr');
        const notesIdx = headers.indexOf('poznamky');

        let importedCount = 0; let skippedCount = 0;
        console.log(`importFromCSV: Zpracovávám ${lines.length - 1} řádků CSV.`);
        for (let i = 1; i < lines.length; i++) {
            const data = lines[i].split(',');
            const date = data[dateIdx] ? data[dateIdx].trim() : null;
            const weight = data[weightIdx] ? parseFloat(data[weightIdx].trim()) : null;
            if (!date || !weight || isNaN(weight)) { skippedCount++; console.warn(`importFromCSV: Přeskočen neplatný řádek ${i}: ${lines[i]}`); continue; }
            
            let muscleMassKg = null;
            if (muscleKgOrPercentIdx !== -1 && data[muscleKgOrPercentIdx] && !isNaN(parseFloat(data[muscleKgOrPercentIdx].trim()))) {
                if (headers[muscleKgOrPercentIdx] === 'svalova hmota (%)') {
                    const percent = parseFloat(data[muscleKgOrPercentIdx].trim());
                    muscleMassKg = parseFloat(((percent / 100) * weight).toFixed(2));
                } else { muscleMassKg = parseFloat(data[muscleKgOrPercentIdx].trim()); }
            }
            const newEntry = {
                date: date, weight: weight, bodyFat: fatIdx !== -1 && data[fatIdx] ? parseFloat(data[fatIdx].trim()) : null,
                muscleMass: muscleMassKg, bodyWater: waterIdx !== -1 && data[waterIdx] ? parseFloat(data[waterIdx].trim()) : null,
                manualBMR: manualBmrIdx !== -1 && data[manualBmrIdx] ? parseInt(data[manualBmrIdx].trim()) : null,
                manualAMR: manualAmrIdx !== -1 && data[manualAmrIdx] ? parseInt(data[manualAmrIdx].trim()) : null,
                notes: notesIdx !== -1 && data[notesIdx] ? data[notesIdx].trim().replace(/^"|"$/g, '') : ""
            };
            const existingIndex = weightLog.findIndex(entry => entry.date === newEntry.date);
            if (existingIndex !== -1) { weightLog[existingIndex] = newEntry; console.log(`importFromCSV: Aktualizován záznam pro datum ${date}.`); } else { weightLog.push(newEntry); console.log(`importFromCSV: Přidán nový záznam pro datum ${date}.`); }
            importedCount++;
        }
        if (importedCount > 0) {
            console.log("importFromCSV: Ukládám importovaná data.");
            await window.saveData();
            window.updateDisplay();
            window.showNotification(`Importováno ${importedCount} záznamů. ${skippedCount > 0 ? skippedCount + ' přeskočeno.' : ''}`);
        } else { window.showNotification('Nebyly nalezeny žádné platné záznamy k importu v CSV.', 3000); }
        inputElement.value = '';
        console.log("importFromCSV: Import CSV dokončen.");
    };
    reader.readAsText(file);
};

window.importFromBackup = async function(inputElement) {
    if (!window.ensureUserLoggedIn()) return;
    
    console.log("importFromBackup: Spuštěn import ze zálohy.");
    const file = inputElement.files[0]; if (!file) { console.warn("importFromBackup: Žádný soubor zálohy vybrán."); return; }
    const reader = new FileReader();
    reader.onload = async function(e) {
        console.log("importFromBackup: Soubor zálohy načten.");
        try {
            const backupData = JSON.parse(e.target.result);
            console.log("importFromBackup: Data zálohy analyzována:", backupData);
            if (backupData.appName !== "Pokročilý váhový tracker více admirála Jiříka") {
                console.warn("importFromBackup: Soubor zálohy nepochází z této aplikace. Dotazuji uživatele na pokračování.");
                if (!confirm("Zdá se, že tento soubor nepochází z této aplikace. Přesto pokračovat?")) {
                    inputElement.value = ''; console.log("importFromBackup: Import zálohy zrušen uživatelem."); return;
                }
            }
            if (backupData.weightLog) { weightLog = backupData.weightLog; console.log("importFromBackup: weightLog ze zálohy načten."); }
            if (backupData.settings) { settings = { ...settings, ...backupData.settings }; console.log("importFromBackup: Nastavení ze zálohy načtena."); }
            if (backupData.goals) { goals = { ...goals, ...backupData.goals }; console.log("importFromBackup: Cíle ze zálohy načteny."); }
            
            weightLog.forEach(entry => {
                if (entry.manualBMR === undefined) entry.manualBMR = null;
                if (entry.manualAMR === undefined) entry.manualAMR = null;
                if (entry.muscleMass === undefined) entry.muscleMass = null;
            });
            console.log("importFromBackup: Data zálohy připravena, ukládám.");
            await window.saveData();
            window.updateForms();
            window.updateDisplay();
            window.showNotification('Záloha úspěšně obnovena!');
            console.log("importFromBackup: Import zálohy dokončen.");
        } catch (error) {
            window.showNotification('Chyba při načítání zálohy: ' + error.message, 4000);
            console.error("importFromBackup: Chyba při zpracování souboru zálohy:", error);
        }
        inputElement.value = '';
    };
    reader.readAsText(file);
};

window.clearAllData = async function() {
    if (!window.ensureUserLoggedIn()) return;
    
    console.log("clearAllData: Spuštěn proces mazání všech dat.");
    if (confirm('⚠️ OPRAVDU chcete smazat VŠECHNA data? Tuto akci nelze vrátit zpět!')) {
        console.log("clearAllData: Uživatel potvrdil 1. fázi mazání.");
        if (confirm('⚠️ JSTE SI ABSOLUTNĚ JISTI? Všechna data budou nenávratně ztracena!')) {
            console.log("clearAllData: Uživatel potvrdil 2. fázi mazání. Mažu data.");
            localStorage.removeItem('weightLog_JirikTracker_v2_charts_separated_musclePercent');
            localStorage.removeItem('weightSettings_JirikTracker_v2_charts_separated_musclePercent');
            localStorage.removeItem('weightGoals_JirikTracker_v2_charts_separated_musclePercent');
            console.log("clearAllData: Lokální data smazána z LocalStorage.");
            
            try {
                console.log("clearAllData: Pokouším se smazat všechna data z Firebase Firestore.");
                await window.clearAllFirestoreData();
                console.log("clearAllData: Všechna data úspěšně smazána z Firebase Firestore.");
            } catch (error) {
                console.error("clearAllData: Chyba při mazání všech dat z Firebase Firestore:", error);
                window.showNotification("Chyba při mazání dat z cloudu! Smažte je prosím ručně v konzoli Firebase.", 8000);
            }

            weightLog = [];
            settings = { height: 174, age: null, gender: 'male', activityLevel: 1.55, bmiWarningUpper: 25, bmiDangerUpper: 30, bmiWarningLower: 18.5, reminderEnabled: true, reminderInterval: 7 };
            goals = { targetWeight: null, targetBMI: null, targetDate: null, weeklyGoal: null };
            console.log("clearAllData: Globální proměnné resetovány na výchozí hodnoty.");
            await window.loadData();
            window.showNotification('Všechna data byla smazána!');
            console.log("clearAllData: Proces mazání všech dat dokončen.");
        } else {
            console.log("clearAllData: Mazání všech dat zrušeno uživatelem (2. fáze).");
        }
    } else {
        console.log("clearAllData: Mazání všech dat zrušeno uživatelem (1. fáze).");
    }
};

window.checkReminders = function() {
    console.log("checkReminders: Kontroluji, zda je třeba zobrazit připomínku.");
    if (!settings.reminderEnabled) {
        console.log("checkReminders: Připomínky jsou zakázány.");
        return;
    }
    if (weightLog.length === 0) {
        console.log("checkReminders: Žádné záznamy váhy, připomínka není nutná.");
        return;
    }
    const lastEntry = [...weightLog].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (lastEntry) {
        const daysSinceLastEntry = Math.floor((new Date() - new Date(lastEntry.date)) / (1000 * 60 * 60 * 24));
        console.log(`checkReminders: Dní od posledního záznamu (${window.formatDateForDisplay(lastEntry.date)}): ${daysSinceLastEntry}. Interval: ${settings.reminderInterval}.`);
        if (daysSinceLastEntry >= settings.reminderInterval) {
            window.showNotification(`⏰ Připomínka: Poslední záznam váhy byl před ${daysSinceLastEntry} dny (${window.formatDateForDisplay(lastEntry.date)})!`, 5000);
            console.log("checkReminders: Zobrazena připomínka.");
        } else {
            console.log("checkReminders: Připomínka není nutná, interval ještě nevypršel.");
        }
    }
};
setInterval(window.checkReminders, 30 * 60 * 1000);

window.toggleFullScreen = function() {
    console.log("toggleFullScreen: Pokus o přepnutí režimu celé obrazovky.");
    const elem = document.documentElement;
    const btn = document.getElementById('fullscreen-btn');
    if (!document.fullscreenElement) {
        console.log("toggleFullScreen: Vstupuji do celoobrazovkového režimu.");
        if (elem.requestFullscreen) elem.requestFullscreen().catch(err => console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`));
        else if (elem.mozRequestFullScreen) elem.mozRequestFullScreen();
        else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
        else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
        if(btn) btn.innerHTML = '&#10006;';
    } else {
        console.log("toggleFullScreen: Opouštím celoobrazovkový režim.");
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.msExitFullscreen) elem.msExitFullscreen();
        if(btn) btn.innerHTML = '&#x26F6;';
    }
    console.log("toggleFullScreen: Přepnutí režimu celé obrazovky dokončeno.");
};

window.updateFullscreenButtonIcon = function() {
    const btn = document.getElementById('fullscreen-btn');
    if(!btn) return;
    if (document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
        btn.innerHTML = '&#10006;';
    } else {
        btn.innerHTML = '&#x26F6;';
    }
};

window.refreshAllData = async function() {
    if (!window.ensureUserLoggedIn()) return;
    
    console.log("refreshAllData: Spuštěna ruční aktualizace všech údajů (z tlačítka).");
    if (weightChart) { weightChart.destroy(); console.log("refreshAllData: weightChart zničen."); }
    if (bmiChart) { bmiChart.destroy(); console.log("refreshAllData: bmiChart zničen."); }
    if (bodyFatOnlyChart) { bodyFatOnlyChart.destroy(); console.log("refreshAllData: bodyFatOnlyChart zničen."); }
    if (muscleMassOnlyChart) { muscleMassOnlyChart.destroy(); console.log("refreshAllData: muscleMassOnlyChart zničen."); }
    if (bodyWaterChart) { bodyWaterChart.destroy(); console.log("refreshAllData: bodyWaterChart zničen."); }
    if (manualBMRChart) { manualBMRChart.destroy(); console.log("refreshAllData: manualBMRChart zničen."); }
    if (manualAMRChart) { manualAMRChart.destroy(); console.log("refreshAllData: manualAMRChart zničen."); }

    await window.loadData();
    window.updateForms();
    window.initializeCharts();
    window.updateDisplay();
    window.checkReminders();
    window.showNotification('Všechny údaje byly úspěšně aktualizovány (včetně cloudu)!', 3000);
    console.log("refreshAllData: Ruční aktualizace dokončena.");
};

// ✅ OPRAVENÁ HLAVNÍ INICIALIZACE - bez automatického loadData
document.addEventListener('DOMContentLoaded', async function() {
    console.log("🚀 DOMContentLoaded: DOM plně načten. Spouštím inicializaci aplikace.");
    
    // Inicializace Firebase
    if (window.initializeFirebaseApp()) {
        console.log("✅ DOMContentLoaded: Firebase inicializace dokončena.");
    } else {
        console.error("❌ DOMContentLoaded: Firebase inicializace selhala.");
        window.showNotification("Kritická chyba: Nelze se připojit k databázi!", 8000);
    }
    
    // ⚠️ DŮLEŽITÉ: NEVOLÁM loadData() zde!
    // Data se načítají až po přihlášení v auth.js
    
    console.log("📊 DOMContentLoaded: Inicializuji grafy a UI.");
    window.initializeCharts();
    window.setTodayDate();

    // Přidání fullscreen tlačítka
    const fullscreenButton = document.createElement('button');
    fullscreenButton.className = 'fullscreen';
    fullscreenButton.id = 'fullscreen-btn';
    fullscreenButton.innerHTML = '&#x26F6;';
    fullscreenButton.title = 'Přepnout na celou obrazovku';
    fullscreenButton.addEventListener('click', window.toggleFullScreen);
    document.body.appendChild(fullscreenButton);
    
    ['fullscreenchange', 'mozfullscreenchange', 'webkitfullscreenchange', 'msfullscreenchange'].forEach(event => {
        document.addEventListener(event, window.updateFullscreenButtonIcon);
    });
    
    console.log("🎉 DOMContentLoaded: Inicializace UI dokončena. Čekám na přihlášení uživatele.");
});
