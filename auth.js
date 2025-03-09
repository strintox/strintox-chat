// DOM Elements
const authModal = document.getElementById('auth-modal');
const profileModal = document.getElementById('profile-modal');
const profileButton = document.getElementById('profile-button');
const closeModalButtons = document.querySelectorAll('.close-modal');
const authTabs = document.querySelectorAll('.auth-tab');
const authForms = document.querySelectorAll('.auth-form');

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginButton = document.getElementById('login-button');
const registerButton = document.getElementById('register-button');

const profileUsername = document.getElementById('profile-username');
const profileEmail = document.getElementById('profile-email');
const profileBioText = document.getElementById('profile-bio-text');
const editProfileButton = document.getElementById('edit-profile-button');
const logoutButton = document.getElementById('logout-button');

const editProfileForm = document.querySelector('.edit-profile-form');
const editUsername = document.getElementById('edit-username');
const editBio = document.getElementById('edit-bio');
const cancelEditButton = document.getElementById('cancel-edit-button');
const saveProfileButton = document.getElementById('save-profile-button');
const deleteAccountButton = document.getElementById('delete-account-button');

// Новые DOM-элементы для расширенного профиля
const profileTabs = document.querySelectorAll('.profile-tab');
const profileTabContents = document.querySelectorAll('.profile-tab-content');
const favoriteCitiesList = document.getElementById('favorite-cities-list');
const addFavoriteCityButton = document.getElementById('add-favorite-city');
const searchHistoryList = document.getElementById('search-history-list');
const clearHistoryButton = document.getElementById('clear-history-button');
const unitsSelector = document.getElementById('units-selector');
const homeLocationSelector = document.getElementById('home-location');

// Current user data
let currentUser = null;
let currentUserData = null;
let userPreferences = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Auth state change listener
    auth.onAuthStateChanged(handleAuthStateChange);
    
    // Open auth modal when profile button is clicked
    profileButton.addEventListener('click', handleProfileButtonClick);
    
    // Close modals when close button is clicked
    closeModalButtons.forEach(button => {
        button.addEventListener('click', closeAllModals);
    });
    
    // Close modals when clicking outside of modal content
    window.addEventListener('click', (event) => {
        if (event.target === authModal) {
            closeAllModals();
        }
        if (event.target === profileModal) {
            closeAllModals();
        }
    });
    
    // Switch between auth tabs
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Удаляем класс active у всех вкладок
            authTabs.forEach(t => t.classList.remove('active'));
            // Скрываем все формы
            authForms.forEach(f => f.classList.remove('active'));
            
            // Активируем выбранную вкладку
            tab.classList.add('active');
            
            // Показываем соответствующую форму
            const formId = `${tab.dataset.tab}-form`;
            const form = document.getElementById(formId);
            if (form) {
                form.classList.add('active');
            }
            
            // Обновляем заголовок модального окна
            const modalHeader = document.querySelector('.modal-header h2');
            if (modalHeader) {
                if (tab.dataset.tab === 'login') {
                    modalHeader.textContent = 'Вход в аккаунт';
                } else if (tab.dataset.tab === 'register') {
                    modalHeader.textContent = 'Регистрация аккаунта';
                }
            }
        });
    });
    
    // Switch between profile tabs
    if (profileTabs && profileTabs.length > 0) {
        console.log("Profile tabs found:", profileTabs.length);
        
        profileTabs.forEach(tab => {
            tab.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log("Tab clicked:", this.dataset.tab);
                
                // Удаляем класс active у всех вкладок и контента
                profileTabs.forEach(t => t.classList.remove('active'));
                profileTabContents.forEach(c => c.classList.remove('active'));
                
                // Добавляем класс active к выбранной вкладке
                this.classList.add('active');
                
                // Находим и показываем соответствующий контент
                const contentId = `${this.dataset.tab}-content`;
                const content = document.getElementById(contentId);
                console.log("Content to show:", contentId, content);
                
                if (content) {
                    content.classList.add('active');
                }
            });
        });
    } else {
        console.warn("Profile tabs not found!");
    }
    
    // Login form submission
    loginButton.addEventListener('click', handleLogin);
    
    // Register form submission
    registerButton.addEventListener('click', handleRegister);
    
    // Edit profile button
    editProfileButton.addEventListener('click', showEditProfileForm);
    
    // Cancel edit button
    cancelEditButton.addEventListener('click', hideEditProfileForm);
    
    // Save profile button
    saveProfileButton.addEventListener('click', updateProfile);
    
    // Logout button
    logoutButton.addEventListener('click', handleLogout);
    
    // Add favorite city button
    if (addFavoriteCityButton) {
        addFavoriteCityButton.addEventListener('click', addFavoriteCity);
    }
    
    // Clear history button
    if (clearHistoryButton) {
        clearHistoryButton.addEventListener('click', clearSearchHistory);
    }
    
    // Units selector changes
    if (unitsSelector) {
        unitsSelector.addEventListener('change', updateUnits);
    }
    
    // Home location changes
    if (homeLocationSelector) {
        homeLocationSelector.addEventListener('change', updateHomeLocation);
    }
    
    // Delete account button
    if (deleteAccountButton) {
        deleteAccountButton.addEventListener('click', deleteUserAccount);
    }
});

// Handle auth state change
function handleAuthStateChange(user) {
    console.log("Auth state changed:", user ? user.email : "No user");
    currentUser = user;
    
    if (user) {
        // User is signed in
        profileButton.innerHTML = '<i class="fas fa-user-circle"></i>';
        fetchUserData(user.uid);
        fetchUserPreferences(user.uid);
    } else {
        // User is signed out
        profileButton.innerHTML = '<i class="fas fa-user-circle"></i>';
        currentUserData = null;
        userPreferences = null;
    }
}

// Fetch user data from Firestore
function fetchUserData(userId) {
    db.collection('users').doc(userId).get()
        .then(doc => {
            if (doc.exists) {
                currentUserData = doc.data();
                console.log("User data fetched:", currentUserData);
                
                // If user data exists and profileModal is open, update profile view
                if (profileModal.classList.contains('active')) {
                    updateProfileView();
                }
            } else {
                console.log("No user document found, creating default");
                // If document doesn't exist, create it with default values
                currentUserData = {
                    username: 'Пользователь',
                    bio: ''
                };
                
                db.collection('users').doc(userId).set(currentUserData);
            }
        })
        .catch(error => {
            console.error('Error fetching user data:', error);
        });
}

// Fetch user preferences from Firestore
function fetchUserPreferences(userId) {
    db.collection('userPreferences').doc(userId).get()
        .then(doc => {
            if (doc.exists) {
                userPreferences = doc.data();
                console.log("User preferences fetched:", userPreferences);
                
                // Apply preferences to the app
                applyUserPreferences();
                
                // If profileModal is open, update preferences view
                if (profileModal.classList.contains('active')) {
                    updatePreferencesView();
                }
            } else {
                console.log("No user preferences found, creating default");
                // Create default preferences
                userPreferences = {
                    favoriteCities: [],
                    searchHistory: [],
                    units: 'metric', // metric, imperial
                    homeLocation: localStorage.getItem('lastSearch') || 'Сухум',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                // Save default preferences
                db.collection('userPreferences').doc(userId).set(userPreferences)
                    .then(() => {
                        console.log("Default preferences created successfully");
                    })
                    .catch(error => {
                        console.error("Error creating default preferences:", error);
                    });
            }
        })
        .catch(error => {
            console.error('Error fetching user preferences:', error);
        });
}

// Apply user preferences to the app
function applyUserPreferences() {
    if (!userPreferences) return;
    
    console.log("Applying user preferences:", userPreferences);
    
    // Apply units
    if (userPreferences.units && typeof window.setUnits === 'function') {
        console.log("Setting units to:", userPreferences.units);
        window.setUnits(userPreferences.units);
    }
    
    // Apply home location
    if (userPreferences.homeLocation) {
        console.log("Setting home location to:", userPreferences.homeLocation);
        localStorage.setItem('lastSearch', userPreferences.homeLocation);
        
        if (typeof window.getCurrentWeather === 'function' && typeof window.getForecast === 'function') {
            window.getCurrentWeather(userPreferences.homeLocation);
            window.getForecast(userPreferences.homeLocation);
            
            // Update search input
            if (window.searchInput) {
                window.searchInput.value = userPreferences.homeLocation;
            }
        }
    }
}

// Update profile view with user data
function updateProfileView() {
    if (!currentUser || !currentUserData) return;
    
    // Update username and email
    profileUsername.textContent = currentUserData.username || 'Пользователь';
    profileEmail.textContent = currentUser.email;
    
    // Update bio
    profileBioText.textContent = currentUserData.bio || 'Информация о пользователе не указана.';
    
    // Update edit form fields
    editUsername.value = currentUserData.username || '';
    editBio.value = currentUserData.bio || '';
    
    // Update preferences view
    updatePreferencesView();
}

// Update preferences view
function updatePreferencesView() {
    if (!userPreferences) {
        console.warn("User preferences not available, showing empty state");
        
        // Показываем пустое состояние для всех списков
        if (favoriteCitiesList) {
            favoriteCitiesList.innerHTML = '<p class="empty-list-message">Нет данных. Войдите в аккаунт, чтобы сохранять избранные города.</p>';
            favoriteCitiesList.classList.remove('loading');
        }
        
        if (searchHistoryList) {
            searchHistoryList.innerHTML = '<p class="empty-list-message">Нет данных. Войдите в аккаунт, чтобы сохранять историю поиска.</p>';
            searchHistoryList.classList.remove('loading');
        }
        
        return;
    }
    
    // Показываем индикатор загрузки
    if (favoriteCitiesList) favoriteCitiesList.classList.add('loading');
    if (searchHistoryList) searchHistoryList.classList.add('loading');
    
    try {
        // Update favorite cities list
        if (favoriteCitiesList) {
            favoriteCitiesList.innerHTML = '';
            if (userPreferences.favoriteCities && userPreferences.favoriteCities.length > 0) {
                userPreferences.favoriteCities.forEach(city => {
                    const cityItem = document.createElement('div');
                    cityItem.className = 'favorite-city-item';
                    cityItem.innerHTML = `
                        <span class="city-name">${city}</span>
                        <div class="city-actions">
                            <button class="search-city-btn" data-city="${city}" title="Показать прогноз">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="remove-city-btn" data-city="${city}" title="Удалить из избранного">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `;
                    favoriteCitiesList.appendChild(cityItem);
                });
                
                // Add event listeners to action buttons
                document.querySelectorAll('.remove-city-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        removeFavoriteCity(e.currentTarget.dataset.city);
                    });
                });
                
                document.querySelectorAll('.search-city-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const city = e.currentTarget.dataset.city;
                        if (window.getCurrentWeather && window.getForecast && window.searchInput) {
                            window.getCurrentWeather(city);
                            window.getForecast(city);
                            window.searchInput.value = city;
                            // Save as last search
                            localStorage.setItem('lastSearch', city);
                            // Add to search history
                            addToSearchHistory(city);
                            closeAllModals();
                        }
                    });
                });
            } else {
                favoriteCitiesList.innerHTML = '<p class="empty-list-message">У вас пока нет избранных городов.</p>';
            }
            
            // Убираем индикатор загрузки
            favoriteCitiesList.classList.remove('loading');
        }
        
        // Update search history list
        if (searchHistoryList) {
            searchHistoryList.innerHTML = '';
            
            // Проверяем существование и формат истории поиска
            if (userPreferences.searchHistory && Array.isArray(userPreferences.searchHistory) && userPreferences.searchHistory.length > 0) {
                let validHistoryItems = 0;
                
                userPreferences.searchHistory.forEach(item => {
                    // Проверяем, что элемент истории имеет правильную структуру
                    if (typeof item === 'object' && item !== null && item.city) {
                        validHistoryItems++;
                        const historyItem = document.createElement('div');
                        historyItem.className = 'history-item';
                        
                        const cityName = item.city;
                        const timestamp = item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Неизвестное время';
                        
                        historyItem.innerHTML = `
                            <span class="city-name">${cityName}</span>
                            <span class="history-date">${timestamp}</span>
                            <button class="search-again-btn" data-city="${cityName}" title="Показать прогноз">
                                <i class="fas fa-search"></i>
                            </button>
                        `;
                        searchHistoryList.appendChild(historyItem);
                    }
                });
                
                if (validHistoryItems === 0) {
                    searchHistoryList.innerHTML = '<p class="empty-list-message">История поиска пуста.</p>';
                } else {
                    // Add event listeners to search again buttons
                    document.querySelectorAll('.search-again-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const city = e.currentTarget.dataset.city;
                            if (window.getCurrentWeather && window.getForecast && window.searchInput) {
                                window.getCurrentWeather(city);
                                window.getForecast(city);
                                window.searchInput.value = city;
                                // Save as last search
                                localStorage.setItem('lastSearch', city);
                                // Add to history (to update timestamp)
                                addToSearchHistory(city);
                                closeAllModals();
                            }
                        });
                    });
                }
            } else {
                searchHistoryList.innerHTML = '<p class="empty-list-message">История поиска пуста.</p>';
            }
            
            // Убираем индикатор загрузки
            searchHistoryList.classList.remove('loading');
        }
        
        // Update units selector
        if (unitsSelector) {
            unitsSelector.value = userPreferences.units || 'metric';
        }
        
        // Update home location
        if (homeLocationSelector) {
            homeLocationSelector.value = userPreferences.homeLocation || '';
        }
    } catch (error) {
        console.error("Error updating preferences view:", error);
        
        // Показываем сообщение об ошибке
        if (favoriteCitiesList) {
            favoriteCitiesList.innerHTML = '<p class="empty-list-message">Произошла ошибка при загрузке избранных городов.</p>';
            favoriteCitiesList.classList.remove('loading');
        }
        
        if (searchHistoryList) {
            searchHistoryList.innerHTML = '<p class="empty-list-message">Произошла ошибка при загрузке истории поиска.</p>';
            searchHistoryList.classList.remove('loading');
        }
    }
}

// Add a city to favorites
function addFavoriteCity() {
    if (!currentUser || !userPreferences) {
        console.error("Cannot add favorite: User not logged in or preferences not loaded");
        return;
    }
    
    // Get current city from searchInput or last searched
    const city = window.searchInput ? window.searchInput.value.trim() : 
                 localStorage.getItem('lastSearch') || '';
    
    if (!city) {
        alert('Пожалуйста, введите название города.');
        return;
    }
    
    console.log("Adding city to favorites:", city);
    
    // Disable button to prevent multiple clicks
    if (addFavoriteCityButton) {
        addFavoriteCityButton.disabled = true;
    }
    
    // Check if city is already in favorites
    if (userPreferences.favoriteCities && userPreferences.favoriteCities.includes(city)) {
        alert('Этот город уже в избранном.');
        if (addFavoriteCityButton) {
            addFavoriteCityButton.disabled = false;
        }
        return;
    }
    
    // Add to favorites
    const updatedFavorites = userPreferences.favoriteCities || [];
    updatedFavorites.push(city);
    
    // Update Firestore
    db.collection('userPreferences').doc(currentUser.uid).update({
        favoriteCities: updatedFavorites
    })
    .then(() => {
        console.log('City added to favorites successfully');
        userPreferences.favoriteCities = updatedFavorites;
        updatePreferencesView();
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'settings-success';
        successMessage.innerHTML = `<i class="fas fa-check-circle"></i> Город "${city}" добавлен в избранное`;
        
        if (addFavoriteCityButton) {
            const container = addFavoriteCityButton.closest('.add-favorite-container');
            container.appendChild(successMessage);
            
            setTimeout(() => {
                successMessage.remove();
            }, 3000);
        }
    })
    .catch(error => {
        console.error('Error adding city to favorites:', error);
        alert('Не удалось добавить город в избранное. Пожалуйста, попробуйте еще раз.');
    })
    .finally(() => {
        if (addFavoriteCityButton) {
            addFavoriteCityButton.disabled = false;
        }
    });
}

// Remove a city from favorites
function removeFavoriteCity(city) {
    if (!currentUser || !userPreferences || !city) {
        console.error("Cannot remove favorite: User not logged in, preferences not loaded, or city not specified");
        return;
    }
    
    console.log("Removing city from favorites:", city);
    
    // Find and disable the button
    const button = document.querySelector(`.remove-city-btn[data-city="${city}"]`);
    if (button) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }
    
    // Filter out the city
    const updatedFavorites = (userPreferences.favoriteCities || []).filter(c => c !== city);
    
    // Update Firestore
    db.collection('userPreferences').doc(currentUser.uid).update({
        favoriteCities: updatedFavorites
    })
    .then(() => {
        console.log('City removed from favorites successfully');
        userPreferences.favoriteCities = updatedFavorites;
        updatePreferencesView();
    })
    .catch(error => {
        console.error('Error removing city from favorites:', error);
        alert('Не удалось удалить город из избранного. Пожалуйста, попробуйте еще раз.');
        
        // Reset button if we don't reload the UI
        if (button) {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-times"></i>';
        }
    });
}

// Clear search history
function clearSearchHistory() {
    if (!currentUser || !userPreferences) {
        console.error("Cannot clear history: User not logged in or preferences not loaded");
        return;
    }
    
    console.log("Clearing search history");
    
    // Disable button
    if (clearHistoryButton) {
        clearHistoryButton.disabled = true;
        clearHistoryButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Очистка...';
    }
    
    // Update Firestore
    db.collection('userPreferences').doc(currentUser.uid).update({
        searchHistory: []
    })
    .then(() => {
        console.log('Search history cleared successfully');
        userPreferences.searchHistory = [];
        updatePreferencesView();
    })
    .catch(error => {
        console.error('Error clearing search history:', error);
        alert('Не удалось очистить историю поиска. Пожалуйста, попробуйте еще раз.');
        
        // Reset button
        if (clearHistoryButton) {
            clearHistoryButton.disabled = false;
            clearHistoryButton.innerHTML = '<i class="fas fa-trash"></i> Очистить историю';
        }
    });
}

// Update units preference
function updateUnits() {
    if (!currentUser || !userPreferences || !unitsSelector) {
        console.error("Cannot update units: User not logged in, preferences not loaded, or selector not found");
        return;
    }
    
    const newUnits = unitsSelector.value;
    console.log("Updating units to:", newUnits);
    
    // Disable selector
    unitsSelector.disabled = true;
    
    // Update Firestore
    db.collection('userPreferences').doc(currentUser.uid).update({
        units: newUnits
    })
    .then(() => {
        console.log('Units preference updated successfully');
        userPreferences.units = newUnits;
        
        // Apply the new units
        if (typeof window.setUnits === 'function') {
            window.setUnits(newUnits);
        }
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'settings-success';
        successMessage.innerHTML = '<i class="fas fa-check-circle"></i> Единицы измерения обновлены';
        
        const settingsGroup = unitsSelector.closest('.settings-group');
        settingsGroup.appendChild(successMessage);
        
        // Remove message after delay
        setTimeout(() => {
            successMessage.remove();
            unitsSelector.disabled = false;
        }, 3000);
    })
    .catch(error => {
        console.error('Error updating units preference:', error);
        alert('Не удалось обновить единицы измерения. Пожалуйста, попробуйте еще раз.');
        unitsSelector.disabled = false;
    });
}

// Update home location
function updateHomeLocation() {
    if (!currentUser) {
        alert('Пожалуйста, войдите в аккаунт, чтобы установить домашний город.');
        return;
    }
    
    if (!homeLocationSelector) {
        console.error("Home location selector not found");
        return;
    }
    
    const newLocation = homeLocationSelector.value.trim();
    
    if (!newLocation) {
        alert('Пожалуйста, введите название города.');
        return;
    }
    
    console.log("Updating home location to:", newLocation);
    
    // Отображение индикатора загрузки
    homeLocationSelector.disabled = true;
    
    // Проверяем существование предпочтений
    if (!userPreferences) {
        userPreferences = {
            favoriteCities: [],
            searchHistory: [],
            units: 'metric',
            homeLocation: newLocation,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
    }
    
    // Update Firestore with merge option to create if not exists
    db.collection('userPreferences').doc(currentUser.uid).set({
        homeLocation: newLocation
    }, { merge: true })
    .then(() => {
        console.log('Home location updated successfully to:', newLocation);
        
        if (userPreferences) {
            userPreferences.homeLocation = newLocation;
        }
        
        // Сохраняем как последний поиск
        localStorage.setItem('lastSearch', newLocation);
        
        // Применяем новый домашний город
        if (typeof window.getCurrentWeather === 'function') {
            window.getCurrentWeather(newLocation);
        }
        
        if (typeof window.getForecast === 'function') {
            window.getForecast(newLocation);
        }
        
        // Обновляем поле поиска
        if (window.searchInput) {
            window.searchInput.value = newLocation;
        }
        
        // Добавляем в историю поисков (делаем это после всех остальных действий)
        try {
            addToSearchHistory(newLocation);
        } catch (err) {
            console.error("Error adding to search history from update home location:", err);
        }
        
        // Вывод сообщения об успехе
        const successMessage = document.createElement('div');
        successMessage.className = 'settings-success';
        successMessage.innerHTML = '<i class="fas fa-check-circle"></i> Домашний город установлен';
        
        const settingsGroup = homeLocationSelector.closest('.settings-group');
        if (settingsGroup) {
            settingsGroup.appendChild(successMessage);
            
            // Удаляем сообщение через 3 секунды
            setTimeout(() => {
                if (successMessage.parentNode) {
                    successMessage.remove();
                }
                homeLocationSelector.disabled = false;
            }, 3000);
        } else {
            homeLocationSelector.disabled = false;
        }
    })
    .catch(error => {
        console.error('Error updating home location:', error);
        alert('Не удалось обновить домашний город. Пожалуйста, попробуйте еще раз.');
        homeLocationSelector.disabled = false;
    });
}

// Add to search history
function addToSearchHistory(city) {
    if (!currentUser || !city) {
        console.log("Cannot add to search history: User not logged in or city not specified");
        return;
    }
    
    console.log("Adding city to search history:", city);
    
    // Make sure userPreferences exists
    if (!userPreferences) {
        console.log("User preferences not loaded yet, trying to create a default one");
        userPreferences = {
            favoriteCities: [],
            searchHistory: [],
            units: 'metric',
            homeLocation: city,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
    }
    
    // Create history item
    const historyItem = {
        city: city,
        timestamp: Date.now()
    };
    
    // Get existing history, limited to last 10 searches
    let updatedHistory = [];
    
    // Check if userPreferences.searchHistory exists and is an array
    if (userPreferences.searchHistory && Array.isArray(userPreferences.searchHistory)) {
        updatedHistory = [...userPreferences.searchHistory];
    } else {
        console.log("Creating new search history array");
        userPreferences.searchHistory = [];
    }
    
    // Remove duplicate if exists
    updatedHistory = updatedHistory.filter(item => typeof item === 'object' && item.city !== city);
    
    // Add new item at the beginning
    updatedHistory.unshift(historyItem);
    
    // Limit to 10 items
    if (updatedHistory.length > 10) {
        updatedHistory = updatedHistory.slice(0, 10);
    }
    
    console.log("Updated search history:", updatedHistory);
    
    // Update Firestore
    db.collection('userPreferences').doc(currentUser.uid).set({
        searchHistory: updatedHistory
    }, { merge: true })
    .then(() => {
        console.log('Search history updated successfully');
        userPreferences.searchHistory = updatedHistory;
        
        if (profileModal && profileModal.classList.contains('active')) {
            updatePreferencesView();
        }
    })
    .catch(error => {
        console.error('Error updating search history:', error);
        
        // If the error is because the document doesn't exist, create it
        if (error.code === 'not-found') {
            console.log("Creating new user preferences document");
            const defaultPrefs = {
                favoriteCities: [],
                searchHistory: [historyItem],
                units: 'metric',
                homeLocation: city,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            db.collection('userPreferences').doc(currentUser.uid).set(defaultPrefs)
                .then(() => {
                    console.log("Created new preferences with search history");
                    userPreferences = defaultPrefs;
                    if (profileModal && profileModal.classList.contains('active')) {
                        updatePreferencesView();
                    }
                })
                .catch(err => console.error("Error creating preferences:", err));
        }
    });
}

// Handle profile button click
function handleProfileButtonClick() {
    if (currentUser) {
        // Show profile modal for logged in users
        showProfileModal();
    } else {
        // Show auth modal for guests
        showAuthModal();
    }
}

// Show auth modal
function showAuthModal() {
    // Make sure there are no loading indicators or other unwanted elements
    if (loginButton) {
        loginButton.disabled = false;
        loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
    }
    
    if (registerButton) {
        registerButton.disabled = false;
        registerButton.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
    }
    
    // Reset forms
    if (loginForm) loginForm.reset();
    if (registerForm) registerForm.reset();
    
    // Убеждаемся, что все формы скрыты
    authForms.forEach(form => form.classList.remove('active'));
    
    // Сбрасываем активные вкладки
    authTabs.forEach(tab => tab.classList.remove('active'));
    
    // Делаем активной вкладку входа и соответствующую форму
    const loginTab = document.querySelector('.auth-tab[data-tab="login"]');
    if (loginTab) {
        loginTab.classList.add('active');
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.classList.add('active');
    }
    
    // Обновляем заголовок модального окна
    const modalHeader = document.querySelector('.modal-header h2');
    if (modalHeader) {
        modalHeader.textContent = 'Вход в аккаунт';
    }
    
    // Show the modal
    authModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

// Show profile modal
function showProfileModal() {
    // Инициализация вкладок при открытии модального окна
    updateProfileView();
    profileModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
    
    // Убедимся, что вкладки работают после открытия модального окна
    setTimeout(() => {
        const firstTab = document.querySelector('.profile-tab.active');
        if (firstTab) {
            const contentId = `${firstTab.dataset.tab}-content`;
            const content = document.getElementById(contentId);
            if (content) {
                // Очистить все активные вкладки контента
                profileTabContents.forEach(c => c.classList.remove('active'));
                // Активировать текущую вкладку контента
                content.classList.add('active');
            }
        }
    }, 50);
}

// Close all modals
function closeAllModals() {
    authModal.classList.remove('active');
    profileModal.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
    
    // Reset forms
    loginForm.reset();
    registerForm.reset();
    hideEditProfileForm();
}

// Handle login form submission
function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        console.log("Email или пароль не заполнены");
        return;
    }
    
    // Disable button and show loading state
    loginButton.disabled = true;
    loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вход...';
    
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            console.log("Вход выполнен успешно");
            closeAllModals();
        })
        .catch(error => {
            console.error("Ошибка входа:", error);
            loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
            loginButton.disabled = false;
        });
}

// Handle register form submission
function handleRegister() {
    console.log("Начинаем процесс регистрации");
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const bio = document.getElementById('register-bio').value;
    
    // Validate form
    if (!username || !email || !password || !confirmPassword) {
        console.log("Не все обязательные поля заполнены");
        return;
    }
    
    if (password !== confirmPassword) {
        console.log("Пароли не совпадают");
        return;
    }
    
    if (password.length < 6) {
        console.log("Пароль должен содержать минимум 6 символов");
        return;
    }
    
    // Disable button and show loading state
    registerButton.disabled = true;
    registerButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Регистрация...';
    
    // Упрощенная регистрация без автоматического входа
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            const user = userCredential.user;
            console.log("Пользователь создан:", user.uid);
            
            // Create user document in Firestore
            return db.collection('users').doc(user.uid).set({
                username: username,
                bio: bio || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                email: email
            });
        })
        .then(() => {
            console.log("Документ пользователя создан в Firestore");
            
            // Выходим из аккаунта после регистрации, чтобы не происходил автовход
            return auth.signOut();
        })
        .then(() => {
            // Закрываем модальное окно
            closeAllModals();
            
            // Сразу переключаемся на вкладку входа
            authTabs.forEach(t => t.classList.remove('active'));
            authForms.forEach(f => f.classList.remove('active'));
            
            const loginTab = document.querySelector('[data-tab="login"]');
            if (loginTab) {
                loginTab.classList.add('active');
                document.getElementById('login-form').classList.add('active');
            }
            
            // Открываем модальное окно для входа
            showAuthModal();
            
            // Заполняем email автоматически
            document.getElementById('login-email').value = email;
        })
        .catch(error => {
            console.error("Ошибка регистрации:", error);
        })
        .finally(() => {
            registerButton.disabled = false;
            registerButton.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
        });
}

// Handle logout
function handleLogout() {
    auth.signOut()
        .then(() => {
            closeAllModals();
        })
        .catch(error => {
            console.error('Error signing out:', error);
        });
}

// Show edit profile form
function showEditProfileForm() {
    document.querySelector('.profile-container').classList.add('hidden');
    editProfileForm.classList.remove('hidden');
}

// Hide edit profile form
function hideEditProfileForm() {
    document.querySelector('.profile-container').classList.remove('hidden');
    editProfileForm.classList.add('hidden');
}

// Update profile
function updateProfile() {
    if (!currentUser) return;
    
    const newUsername = editUsername.value.trim();
    const newBio = editBio.value.trim();
    
    if (!newUsername) {
        return;
    }
    
    // Check if username is unique (if changed)
    if (newUsername !== currentUserData.username) {
        db.collection('users').where('username', '==', newUsername).get()
            .then(snapshot => {
                if (!snapshot.empty) {
                    return;
                }
                
                saveProfileChanges(newUsername, newBio);
            })
            .catch(error => {
                console.error('Error checking username uniqueness:', error);
            });
    } else {
        saveProfileChanges(newUsername, newBio);
    }
}

// Save profile changes
function saveProfileChanges(username, bio) {
    db.collection('users').doc(currentUser.uid).update({
        username: username,
        bio: bio
    })
    .then(() => {
        // Update local data
        currentUserData.username = username;
        currentUserData.bio = bio;
        
        // Update profile view
        updateProfileView();
        
        // Hide edit form
        hideEditProfileForm();
    })
    .catch(error => {
        console.error('Error updating profile:', error);
    });
}

// Delete user account
function deleteUserAccount() {
    if (!currentUser) return;
    
    // Запрашиваем подтверждение с защитой от случайного нажатия
    const confirmation = prompt("Для подтверждения удаления аккаунта введите 'УДАЛИТЬ'");
    
    if (confirmation !== 'УДАЛИТЬ') {
        alert('Удаление аккаунта отменено.');
        return;
    }
    
    // Получаем текущего пользователя и его UID
    const user = auth.currentUser;
    const userId = user.uid;
    
    // Отображаем индикатор загрузки
    const deleteButton = document.getElementById('delete-account-button');
    if (deleteButton) {
        deleteButton.disabled = true;
        deleteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Удаление...';
    }
    
    // Создаем массив промисов для удаления всех данных пользователя
    const deletePromises = [
        // Удаляем данные пользователя из Firestore
        db.collection('users').doc(userId).delete().catch(e => console.error("Error deleting user document:", e)),
        
        // Удаляем настройки пользователя
        db.collection('userPreferences').doc(userId).delete().catch(e => console.error("Error deleting user preferences:", e)),
        
        // Можно добавить удаление других коллекций, если они есть
    ];
    
    // Выполняем все операции удаления
    Promise.all(deletePromises)
        .then(() => {
            console.log('All user data deleted from Firestore');
            
            // Удаляем аккаунт пользователя из Firebase Authentication
            return user.delete();
        })
        .then(() => {
            console.log('User account deleted from Firebase Auth');
            
            // Очищаем локальные данные
            localStorage.removeItem('lastSearch');
            localStorage.removeItem('units');
            currentUser = null;
            currentUserData = null;
            userPreferences = null;
            
            // Закрываем модальное окно и показываем сообщение успеха
            closeAllModals();
            
            // Обновляем UI, чтобы отразить выход из системы
            profileButton.innerHTML = '<i class="fas fa-user-circle"></i>';
            
            // Обновляем страницу через небольшую задержку
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        })
        .catch(error => {
            console.error('Error during account deletion:', error);
            
            // Восстанавливаем кнопку
            if (deleteButton) {
                deleteButton.disabled = false;
                deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i> Удалить аккаунт';
            }
            
            // Проверяем требуется ли повторная аутентификация
            if (error.code === 'auth/requires-recent-login') {
                auth.signOut().then(() => {
                    console.log("User signed out, must re-authenticate");
                    showAuthModal();
                    // Убираем сообщение об ошибке и даем пользователю повторно войти
                });
            }
        });
}

// Handle search from script.js - это функция, которая вызывается из script.js
function handleSearchFromApp(city) {
    console.log("handleSearchFromApp called with city:", city);
    // If user is logged in, add to search history
    if (currentUser && city) {
        addToSearchHistory(city);
    } else {
        console.log("User not logged in or city not provided, can't add to history");
    }
}

// Expose some functions to window for access from script.js
window.addToSearchHistory = handleSearchFromApp; 