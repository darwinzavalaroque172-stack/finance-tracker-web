// Firebase Configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// UI Elements
const authContainer = document.getElementById('auth-container');
const app = document.getElementById('app');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const switchToSignup = document.getElementById('switch-to-signup');
const switchToLogin = document.getElementById('switch-to-login');
const logoutBtn = document.getElementById('logout-btn');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const addTransactionBtn = document.getElementById('add-transaction-btn');
const addTransactionModal = document.getElementById('add-transaction-modal');
const closeTransactionModal = document.getElementById('close-transaction-modal');
const transactionForm = document.getElementById('transaction-form');
const saveTransactionBtn = document.getElementById('save-transaction-btn');
const deleteTransactionBtn = document.getElementById('delete-transaction-btn');
const changePasswordBtn = document.getElementById('change-password-btn');
const changePasswordModal = document.getElementById('change-password-modal');
const closePasswordModal = document.getElementById('close-password-modal');
const updatePasswordBtn = document.getElementById('update-password-btn');
const balanceValue = document.getElementById('balance-value');
const incomeValue = document.getElementById('income-value');
const expenseValue = document.getElementById('expense-value');
const transactionList = document.getElementById('transaction-list');
const transactionsContainer = document.getElementById('transactions-container');
const noTransactions = document.getElementById('no-transactions');
const userEmail = document.getElementById('user-email');
const transactionModalTitle = document.getElementById('transaction-modal-title');

// Chart.js instances
let categoryChart = null;
let monthlyChart = null;

// Transaction modal state
let isEditMode = false;

// Global state
let currentUser = null;
let transactions = [];

// Authentication state listener
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        authContainer.style.display = 'none';
        app.style.display = 'block';
        userEmail.value = user.email;
        fetchTransactions();
    } else {
        currentUser = null;
        authContainer.style.display = 'flex';
        app.style.display = 'none';
        loginForm.reset();
        signupForm.reset();
        switchToLogin.click();
    }
});

// Switch between login and signup forms
switchToSignup.addEventListener('click', () => {
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
});

switchToLogin.addEventListener('click', () => {
    signupForm.style.display = 'none';
    loginForm.style.display = 'block';
});

// Login form submission
loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    auth.signInWithEmailAndPassword(email, password)
        .catch(error => {
            alert(`Errore di accesso: ${error.message}`);
        });
});

// Signup form submission
signupForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (password !== confirmPassword) {
        alert('Le password non corrispondono');
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .catch(error => {
            alert(`Errore di registrazione: ${error.message}`);
        });
});

// Logout
logoutBtn.addEventListener('click', () => {
    auth.signOut();
});

// Tab navigation
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs
        tabs.forEach(t => t.classList.remove('active'));
        // Add active class to current tab
        tab.classList.add('active');
        
        // Hide all tab content
        tabContents.forEach(content => content.classList.remove('active'));
        // Show current tab content
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(`${tabId}-tab`).classList.add('active');
        
        // If statistics tab is active, refresh charts
        if (tabId === 'statistics') {
            renderCharts();
        }
    });
});

// Add transaction modal
addTransactionBtn.addEventListener('click', () => {
    resetTransactionForm();
    isEditMode = false;
    transactionModalTitle.textContent = 'Aggiungi Transazione';
    deleteTransactionBtn.style.display = 'none';
    addTransactionModal.style.display = 'flex';
});

closeTransactionModal.addEventListener('click', () => {
    addTransactionModal.style.display = 'none';
});

// Change password modal
changePasswordBtn.addEventListener('click', () => {
    document.getElementById('change-password-form').reset();
    changePasswordModal.style.display = 'flex';
});

closePasswordModal.addEventListener('click', () => {
    changePasswordModal.style.display = 'none';
});

// Handle click outside of modals
window.addEventListener('click', (e) => {
    if (e.target === addTransactionModal) {
        addTransactionModal.style.display = 'none';
    }
    if (e.target === changePasswordModal) {
        changePasswordModal.style.display = 'none';
    }
});

// Save transaction
saveTransactionBtn.addEventListener('click', () => {
    if (!transactionForm.checkValidity()) {
        transactionForm.reportValidity();
        return;
    }

    const transactionId = document.getElementById('transaction-id').value;
    const title = document.getElementById('transaction-title').value;
    const amount = parseFloat(document.getElementById('transaction-amount').value);
    const date = document.getElementById('transaction-date').value;
    const category = document.getElementById('transaction-category').value;
    const type = document.querySelector('input[name="transaction-type"]:checked').value;

    const transaction = {
        title,
        amount,
        date,
        category,
        type,
        timestamp: new Date()
    };

    if (isEditMode && transactionId) {
        // Update existing transaction
        updateTransaction(transactionId, transaction);
    } else {
        // Add new transaction
        addTransaction(transaction);
    }
});

// Delete transaction
deleteTransactionBtn.addEventListener('click', () => {
    const transactionId = document.getElementById('transaction-id').value;
    if (transactionId && confirm('Sei sicuro di voler eliminare questa transazione?')) {
        deleteTransaction(transactionId);
    }
});

// Change password
updatePasswordBtn.addEventListener('click', () => {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
        alert('Per favore compila tutti i campi');
        return;
    }

    if (newPassword !== confirmNewPassword) {
        alert('Le nuove password non corrispondono');
        return;
    }

    changePassword(currentPassword, newPassword);
});

// Firebase CRUD functions
function fetchTransactions() {
    transactionsContainer.querySelector('.loading').style.display = 'flex';
    transactionList.style.display = 'none';
    noTransactions.style.display = 'none';

    db.collection('transactions')
        .where('userId', '==', currentUser.uid)
        .orderBy('date', 'desc')
        .get()
        .then(snapshot => {
            transactions = [];
            snapshot.forEach(doc => {
                transactions.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            renderTransactions();
            calculateBalance();
            transactionsContainer.querySelector('.loading').style.display = 'none';

            if (transactions.length > 0) {
                transactionList.style.display = 'block';
            } else {
                noTransactions.style.display = 'block';
            }
        })
        .catch(error => {
            console.error("Error fetching transactions: ", error);
            transactionsContainer.querySelector('.loading').style.display = 'none';
            alert('Si è verificato un errore durante il recupero delle transazioni');
        });
}

function addTransaction(transaction) {
    transaction.userId = currentUser.uid;
    db.collection('transactions').add(transaction)
        .then(() => {
            addTransactionModal.style.display = 'none';
            fetchTransactions();
        })
        .catch(error => {
            console.error("Error adding transaction: ", error);
            alert('Si è verificato un errore durante l\'aggiunta della transazione');
        });
}

function updateTransaction(id, transaction) {
    transaction.userId = currentUser.uid;
    db.collection('transactions').doc(id).update(transaction)
        .then(() => {
            addTransactionModal.style.display = 'none';
            fetchTransactions();
        })
        .catch(error => {
            console.error("Error updating transaction: ", error);
            alert('Si è verificato un errore durante l\'aggiornamento della transazione');
        });
}

function deleteTransaction(id) {
    db.collection('transactions').doc(id).delete()
        .then(() => {
            addTransactionModal.style.display = 'none';
            fetchTransactions();
        })
        .catch(error => {
            console.error("Error deleting transaction: ", error);
            alert('Si è verificato un errore durante l\'eliminazione della transazione');
        });
}

function changePassword(currentPassword, newPassword) {
    const credential = firebase.auth.EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
    );

    currentUser.reauthenticateWithCredential(credential)
        .then(() => {
            return currentUser.updatePassword(newPassword);
        })
        .then(() => {
            alert('Password aggiornata con successo');
            changePasswordModal.style.display = 'none';
        })
        .catch(error => {
            console.error("Error updating password: ", error);
            alert(`Si è verificato un errore: ${error.message}`);
        });
}

// UI rendering functions
function renderTransactions() {
    transactionList.innerHTML = '';

    transactions.forEach(transaction => {
        const li = document.createElement('li');
        li.className = 'transaction-item';
        li.setAttribute('data-id', transaction.id);
        
        const dateObj = new Date(transaction.date);
        const formattedDate = dateObj.toLocaleDateString('it-IT');
        
        const isExpense = transaction.type === 'expense';
        const iconClass = isExpense ? 'icon-expense' : 'icon-income';
        const amountClass = isExpense ? 'amount-expense' : 'amount-income';
        const iconName = isExpense ? 'fa-arrow-down' : 'fa-arrow-up';
        const amountPrefix = isExpense ? '-' : '+';
        
        li.innerHTML = `
            <div class="transaction-icon ${iconClass}">
                <i class="fas ${iconName}"></i>
            </div>
            <div class="transaction-info">
                <div class="transaction-title">${transaction.title}</div>
                <div class="transaction-subtitle">${transaction.category} • ${formattedDate}</div>
            </div>
            <div class="transaction-amount ${amountClass}">
                ${amountPrefix} € ${transaction.amount.toFixed(2)}
            </div>
        `;
        
        li.addEventListener('click', () => {
            openTransactionForEdit(transaction);
        });
        
        transactionList.appendChild(li);
    });
}

function calculateBalance() {
    let totalIncome = 0;
    let totalExpense = 0;
    
    transactions.forEach(transaction => {
        if (transaction.type === 'income') {
            totalIncome += transaction.amount;
        } else {
            totalExpense += transaction.amount;
        }
    });
    
    const balance = totalIncome - totalExpense;
    
    balanceValue.textContent = `€ ${balance.toFixed(2)}`;
    balanceValue.className = 'balance-value';
    if (balance > 0) {
        balanceValue.classList.add('balance-positive');
    } else if (balance < 0) {
        balanceValue.classList.add('balance-negative');
    }
    
    incomeValue.textContent = `€ ${totalIncome.toFixed(2)}`;
    expenseValue.textContent = `€ ${totalExpense.toFixed(2)}`;
}

function openTransactionForEdit(transaction) {
    isEditMode = true;
    transactionModalTitle.textContent = 'Modifica Transazione';
    deleteTransactionBtn.style.display = 'inline-block';
    
    document.getElementById('transaction-id').value = transaction.id;
    document.getElementById('transaction-title').value = transaction.title;
    document.getElementById('transaction-amount').value = transaction.amount;
    document.getElementById('transaction-date').value = transaction.date;
    document.getElementById('transaction-category').value = transaction.category;
    
    if (transaction.type === 'expense') {
        document.getElementById('type-expense').checked = true;
    } else {
        document.getElementById('type-income').checked = true;
    }
    
    addTransactionModal.style.display = 'flex';
}

function resetTransactionForm() {
    document.getElementById('transaction-id').value = '';
    document.getElementById('transaction-form').reset();
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('transaction-date').value = today;
}

function renderCharts() {
    renderCategoryChart();
    renderMonthlyChart();
}

function renderCategoryChart() {
    const ctx = document.getElementById('category-chart').getContext('2d');
    
    // Group expenses by category
    const expensesByCategory = {};
    transactions.forEach(transaction => {
        if (transaction.type === 'expense') {
            if (!expensesByCategory[transaction.category]) {
                expensesByCategory[transaction.category] = 0;
            }
            expensesByCategory[transaction.category] += transaction.amount;
        }
    });
    
    const categories = Object.keys(expensesByCategory);
    const amounts = Object.values(expensesByCategory);
    
    // Generate colors
    const backgroundColors = generateColors(categories.length);
    
    // Destroy previous chart if it exists
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: amounts,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            return label + ': € ' + value.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

function renderMonthlyChart() {
    const ctx = document.getElementById('monthly-chart').getContext('2d');
    
    // Group transactions by month
    const monthlyData = {};
    
    transactions.forEach(transaction => {
        const date = new Date(transaction.date);
        const monthYear = date.toLocaleDateString('it-IT', { month: '2-digit', year: 'numeric' });
        
        if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = {
                income: 0,
                expense: 0
            };
        }
        
        if (transaction.type === 'income') {
            monthlyData[monthYear].income += transaction.amount;
        } else {
            monthlyData[monthYear].expense += transaction.amount;
        }
    });
    
    // Sort months chronologically
    const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
        const [monthA, yearA] = a.split('/');
        const [monthB, yearB] = b.split('/');
        const dateA = new Date(yearA, monthA - 1);
        const dateB = new Date(yearB, monthB - 1);
        return dateA - dateB;
    });
    
    const incomeData = sortedMonths.map(month => monthlyData[month].income);
    const expenseData = sortedMonths.map(month => monthlyData[month].expense);
    
    // Destroy previous chart if it exists
    if (monthlyChart) {
        monthlyChart.destroy();
    }
    
    monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedMonths,
            datasets: [
                {
                    label: 'Entrate',
                    data: incomeData,
                    backgroundColor: 'rgba(46, 204, 113, 0.6)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Uscite',
                    data: expenseData,
                    backgroundColor: 'rgba(231, 76, 60, 0.6)',
                    borderColor: 'rgba(231, 76, 60, 1)',
                    borderWidth: 1
                