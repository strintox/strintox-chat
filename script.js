/**
 * Погодное приложение с прогнозом на 10 дней
 * Использует Open-Meteo API и Nominatim для геокодирования
 */

// DOM элементы
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const locationButton = document.getElementById('location-button');
const errorMessage = document.getElementById('error-message');
const weatherInfo = document.getElementById('weather-info');
const favoriteButton = document.getElementById('favorite-button');
const themeSwitch = document.getElementById('theme-switch');
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanels = document.querySelectorAll('.tab-panel');
const drawerHandle = document.getElementById('drawer-handle');
const searchHistoryDrawer = document.getElementById('search-history-drawer');
const searchHistoryList = document.getElementById('search-history');
const clearHistoryButton = document.getElementById('clear-history');
const toastsContainer = document.getElementById('toasts-container');
const favoritesButton = document.getElementById('favorites-button');
const favoritesPanel = document.getElementById('favorites-panel');
const favoritesListContainer = document.getElementById('favorites-list');
const closeFavoritesButton = document.getElementById('close-favorites');

// Константы и настройки
const FORECAST_DAYS = 10;
const MAX_HISTORY_ITEMS = 10;
const SAVED_CITIES_KEY = 'favoriteCities';
const SEARCH_HISTORY_KEY = 'searchHistory';
const THEME_KEY = 'theme';

// Кэширование данных
let lastWeatherData = null;
let favoriteCities = [];
let currentCity = '';

// ======================= КОД ДЛЯ ЧАТА =======================
// DOM элементы для чата
const chatButton = document.getElementById('chat-button');
const chatPanel = document.getElementById('chat-panel');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendMessageButton = document.getElementById('send-message');
const minimizeChatButton = document.getElementById('minimize-chat');
const usernameModal = document.getElementById('username-modal');
const usernameInput = document.getElementById('username-input');
const saveUsernameButton = document.getElementById('save-username');
const usernameError = document.getElementById('username-error');

// Настройки чата
let username = localStorage.getItem('chat_username');
const chatUsers = new Set();
let chatIsActive = false;

// Имитация базы данных сообщений (в реальном приложении здесь был бы Firebase или другой бэкенд)
const chatMessagesDB = [];

// Инициализация страницы
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSearchHistory();
    initFavorites();
    setupTabSwitching();
    setupDrawer();
    setupFavoritesPanel();
    setupSearch();
    initChat(); // Инициализация чата
    
    // Проверка URL на параметр города
    const urlParams = new URLSearchParams(window.location.search);
    const cityParam = urlParams.get('city');
    
    if (cityParam) {
        searchInput.value = cityParam;
        getWeather(cityParam);
    } else {
        // Пробуем определить местоположение
        getUserLocation();
    }

    // Предотвращение масштабирования через жесты
    document.addEventListener('gesturestart', function(e) {
        e.preventDefault();
    });
});

// Инициализация и переключение темы
function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeSwitch.checked = true;
    }
    
    themeSwitch.addEventListener('change', () => {
        if (themeSwitch.checked) {
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem(THEME_KEY, 'dark');
        } else {
            document.body.removeAttribute('data-theme');
            localStorage.setItem(THEME_KEY, 'light');
        }
    });
}

// Инициализация истории поиска
function initSearchHistory() {
    const searchHistory = getSearchHistory();
    renderSearchHistory(searchHistory);
    
    clearHistoryButton.addEventListener('click', () => {
        localStorage.removeItem(SEARCH_HISTORY_KEY);
        renderSearchHistory([]);
        showToast('История поиска очищена', 'success');
    });
}

// Получение истории поиска из localStorage
function getSearchHistory() {
    return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
}

// Отрисовка истории поиска
function renderSearchHistory(history) {
    searchHistoryList.innerHTML = '';
    
    if (!history.length) {
        searchHistoryList.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-history"></i>
                <p>История поиска пуста</p>
            </div>
        `;
        return;
    }
    
    history.forEach(city => {
        const item = document.createElement('div');
        item.className = 'search-history-item';
        item.innerHTML = `
            <span class="search-history-item-text">${city}</span>
            <button class="search-history-item-delete" data-city="${city}">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Обработчик клика по городу
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.search-history-item-delete')) {
                searchInput.value = city;
                getWeather(city);
                searchHistoryDrawer.classList.remove('open');
            }
        });
        
        searchHistoryList.appendChild(item);
    });
    
    // Обработчики кнопок удаления
    document.querySelectorAll('.search-history-item-delete').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const city = button.dataset.city;
            removeFromSearchHistory(city);
        });
    });
}

// Добавление города в историю поиска
function addToSearchHistory(city) {
    let history = getSearchHistory();
    
    // Удаляем дубликаты
    history = history.filter(item => item.toLowerCase() !== city.toLowerCase());
    
    // Добавляем в начало списка
    history.unshift(city);
    
    // Ограничиваем размер истории
    if (history.length > MAX_HISTORY_ITEMS) {
        history = history.slice(0, MAX_HISTORY_ITEMS);
    }
    
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    renderSearchHistory(history);
}

// Удаление города из истории поиска
function removeFromSearchHistory(city) {
    let history = getSearchHistory();
    history = history.filter(item => item.toLowerCase() !== city.toLowerCase());
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    renderSearchHistory(history);
    showToast(`"${city}" удален из истории`, 'success');
}

// Настройка панели избранных городов
function setupFavoritesPanel() {
    // Показать панель избранных
    favoritesButton.addEventListener('click', () => {
        favoritesPanel.classList.add('active');
        renderFavorites();
    });
    
    // Закрыть панель избранных
    closeFavoritesButton.addEventListener('click', () => {
        favoritesPanel.classList.remove('active');
    });
}

// Отображение списка избранных городов
function renderFavorites() {
    favoritesListContainer.innerHTML = '';
    
    if (favoriteCities.length === 0) {
        favoritesListContainer.innerHTML = `
            <div class="empty-favorites">
                <i class="fas fa-star"></i>
                <p>У вас пока нет избранных городов</p>
                <p>Нажмите на сердечко рядом с названием города, чтобы добавить его в избранное</p>
            </div>
        `;
        return;
    }
    
    favoriteCities.forEach(city => {
        const cityItem = document.createElement('div');
        cityItem.className = 'favorite-city-item';
        cityItem.innerHTML = `
            <span class="favorite-city-name">${city}</span>
            <button class="remove-favorite" data-city="${city}">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        
        // Обработчик клика для просмотра погоды в избранном городе
        cityItem.addEventListener('click', (e) => {
            if (!e.target.closest('.remove-favorite')) {
                searchInput.value = city;
                getWeather(city);
                favoritesPanel.classList.remove('active');
            }
        });
        
        favoritesListContainer.appendChild(cityItem);
    });
    
    // Обработчики для кнопок удаления из избранного
    document.querySelectorAll('.remove-favorite').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const city = button.dataset.city;
            removeFromFavorites(city);
        });
    });
}

// Удаление города из избранного через панель избранных
function removeFromFavorites(city) {
    favoriteCities = favoriteCities.filter(item => item !== city);
    localStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(favoriteCities));
    
    // Обновляем статус кнопки избранного, если это текущий город
    if (city === currentCity) {
        favoriteButton.classList.remove('active');
        favoriteButton.innerHTML = '<i class="far fa-heart"></i>';
    }
    
    renderFavorites();
    showToast(`${city} удален из избранного`, 'success');
}

// Инициализация избранных городов
function initFavorites() {
    favoriteCities = JSON.parse(localStorage.getItem(SAVED_CITIES_KEY) || '[]');
    
    favoriteButton.addEventListener('click', toggleFavoriteCity);
}

// Переключение города в избранном
function toggleFavoriteCity() {
    if (!currentCity) return;
    
    const isFavorite = favoriteCities.includes(currentCity);
    
    if (isFavorite) {
        favoriteCities = favoriteCities.filter(city => city !== currentCity);
        favoriteButton.classList.remove('active');
        favoriteButton.innerHTML = '<i class="far fa-heart"></i>';
        showToast(`${currentCity} удален из избранного`, 'success');
    } else {
        favoriteCities.push(currentCity);
        favoriteButton.classList.add('active');
        favoriteButton.innerHTML = '<i class="fas fa-heart"></i>';
        showToast(`${currentCity} добавлен в избранное`, 'success');
    }
    
    localStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(favoriteCities));
    
    // Обновляем список избранного, если панель открыта
    if (favoritesPanel.classList.contains('active')) {
        renderFavorites();
    }
}

// Настройка переключения вкладок
function setupTabSwitching() {
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            // Деактивируем все кнопки и панели
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));
            
            // Активируем выбранную кнопку и панель
            button.classList.add('active');
            document.getElementById(`${tabName}-panel`).classList.add('active');
        });
    });
}

// Настройка выдвижной панели истории
function setupDrawer() {
    drawerHandle.addEventListener('click', () => {
        searchHistoryDrawer.classList.toggle('open');
        
        const isOpen = searchHistoryDrawer.classList.contains('open');
        drawerHandle.querySelector('i').className = isOpen ? 
            'fas fa-chevron-down' : 'fas fa-chevron-up';
    });
    
    // Закрываем панель при клике вне её
    document.addEventListener('click', (e) => {
        if (searchHistoryDrawer.classList.contains('open') && 
            !searchHistoryDrawer.contains(e.target) && 
            !drawerHandle.contains(e.target)) {
            searchHistoryDrawer.classList.remove('open');
            drawerHandle.querySelector('i').className = 'fas fa-chevron-up';
        }
    });
}

// Получение погоды по названию города
function getWeather(city) {
    try {
        weatherInfo.classList.add('active');
        document.getElementById('city-name').textContent = 'Загрузка...';
        document.getElementById('weather-description').textContent = 'Получаем данные о погоде...';
        
        // Функция для фактического получения погоды
        fetchWeatherData(city);
    } catch (error) {
        console.error('Error in getWeather:', error);
        errorMessage.style.display = 'block';
        weatherInfo.classList.remove('active');
    }
}

// Фактическое получение данных о погоде по названию города
async function fetchWeatherData(city) {
    try {
        // Получаем координаты города
        const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;
        console.log('Fetching geo data from:', geoUrl);
        
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();
        
        console.log('Geo data received:', geoData);
        
        if (!geoData || geoData.length === 0) {
            throw new Error('Город не найден');
        }
        
        const location = geoData[0];
        const lat = parseFloat(location.lat);
        const lon = parseFloat(location.lon);
        
        if (isNaN(lat) || isNaN(lon)) {
            throw new Error('Некорректные координаты');
        }
        
        console.log('Fetching weather for coordinates:', lat, lon);
        
        // Получаем данные о погоде
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum&timezone=auto&forecast_days=${FORECAST_DAYS}`;
        
        const weatherResponse = await fetch(weatherUrl);
        
        if (!weatherResponse.ok) {
            throw new Error('Ошибка получения данных о погоде');
        }
        
        const weatherData = await weatherResponse.json();
        console.log('Weather data received:', weatherData);
        
        // Кэшируем данные
        lastWeatherData = { location, weatherData };
        
        // Обновляем UI
        const cityName = location.display_name.split(',')[0];
        currentCity = cityName;
        
        updateCityInfo(cityName, location.address?.country || '');
        displayWeather(weatherData);
        displayForecast(weatherData);
        displayHourlyForecast(weatherData);
        loadMap(lat, lon);
        
        // Добавляем город в историю поиска
        addToSearchHistory(cityName);
        
        // Обновляем URL
        updateUrl(city);
        
        // Проверяем, находится ли город в избранном
        if (favoriteCities.includes(cityName)) {
            favoriteButton.classList.add('active');
            favoriteButton.innerHTML = '<i class="fas fa-heart"></i>';
        } else {
            favoriteButton.classList.remove('active');
            favoriteButton.innerHTML = '<i class="far fa-heart"></i>';
        }
        
        // Показываем блок с погодой
        errorMessage.style.display = 'none';
        
        // Устанавливаем класс для фона в зависимости от погоды
        setWeatherBackground(weatherData.current.weather_code);
        
    } catch (error) {
        console.error('Error in fetchWeatherData:', error);
        errorMessage.textContent = error.message || 'Не удалось получить данные о погоде';
        errorMessage.style.display = 'block';
        weatherInfo.classList.remove('active');
    }
}

// Получение погоды по координатам
async function getWeatherByCoords(lat, lon) {
    try {
        // Получаем данные о местоположении
        const locationUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
        console.log('Fetching location data from:', locationUrl);
        
        const locationResponse = await fetch(locationUrl);
        const locationData = await locationResponse.json();
        
        console.log('Location data received:', locationData);
        
        // Получаем данные о погоде
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum&timezone=auto&forecast_days=${FORECAST_DAYS}`;
        
        console.log('Fetching weather data from:', weatherUrl);
        
        const weatherResponse = await fetch(weatherUrl);
        
        if (!weatherResponse.ok) {
            throw new Error('Не удалось получить данные о погоде');
        }
        
        const weatherData = await weatherResponse.json();
        console.log('Weather data received:', weatherData);
        
        // Определяем название места
        let cityName = 'Неизвестный город';
        if (locationData.address) {
            cityName = locationData.address.city || 
                       locationData.address.town || 
                       locationData.address.village ||
                       locationData.address.municipality ||
                       'Неизвестный город';
        }
        
        currentCity = cityName;
        
        // Отображаем данные
        updateCityInfo(cityName, locationData.address?.country || '');
        displayWeather(weatherData);
        displayForecast(weatherData);
        displayHourlyForecast(weatherData);
        loadMap(lat, lon);
        
        // Сохраняем в историю поиска
        addToSearchHistory(cityName);
        
        // Проверяем, находится ли город в избранном
        if (favoriteCities.includes(cityName)) {
            favoriteButton.classList.add('active');
            favoriteButton.innerHTML = '<i class="fas fa-heart"></i>';
        } else {
            favoriteButton.classList.remove('active');
            favoriteButton.innerHTML = '<i class="far fa-heart"></i>';
        }
        
        // Показываем блок с информацией
        weatherInfo.classList.add('active');
        errorMessage.style.display = 'none';
        
        // Устанавливаем класс для фона в зависимости от погоды
        setWeatherBackground(weatherData.current.weather_code);
        
    } catch (error) {
        console.error('Error in getWeatherByCoords:', error);
        errorMessage.textContent = 'Не удалось получить данные о погоде для этого местоположения';
        errorMessage.style.display = 'block';
        weatherInfo.classList.remove('active');
    }
}

// Определение местоположения пользователя
function getUserLocation() {
    if (navigator.geolocation) {
        showToast('Определяем ваше местоположение...', 'info');
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                getWeatherByCoords(lat, lon);
            },
            (error) => {
                console.error('Geolocation error:', error);
                showToast('Не удалось определить местоположение. Показываем Москву.', 'error');
                getWeather('Москва');
            },
            { timeout: 10000 }
        );
    } else {
        showToast('Геолокация не поддерживается в вашем браузере', 'error');
        getWeather('Москва');
    }
}

// Обновление URL с параметром города
function updateUrl(city) {
    const url = new URL(window.location);
    url.searchParams.set('city', city);
    window.history.pushState({}, '', url);
}

// Обновление информации о городе
function updateCityInfo(city, country) {
    document.getElementById('city-name').textContent = city;
    
    const countryCode = getCountryCode(country);
    if (countryCode) {
        document.getElementById('country-flag').innerHTML = 
            `<img src="https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png" alt="${country}" title="${country}">`;
    } else {
        document.getElementById('country-flag').innerHTML = '';
    }
    
    updateDateTime();
}

// Обновление даты и времени
function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        hour: '2-digit', 
        minute: '2-digit' 
    };
    document.getElementById('date-time').textContent = now.toLocaleDateString('ru-RU', options);
}

// Отображение текущей погоды
function displayWeather(data) {
    const current = data.current;
    
    // Получаем описание погоды и иконку
    const description = getWeatherDescription(current.weather_code);
    const iconUrl = getWeatherIcon(current.weather_code);
    
    // Обновляем UI элементы
    document.getElementById('temperature').textContent = `${Math.round(current.temperature_2m)}°C`;
    document.getElementById('weather-description').textContent = description;
    document.getElementById('feels-like').textContent = `${Math.round(current.apparent_temperature)}°C`;
    document.getElementById('wind').textContent = `${current.wind_speed_10m} км/ч`;
    document.getElementById('humidity').textContent = `${current.relative_humidity_2m}%`;
    document.getElementById('pressure').textContent = `${Math.round(current.surface_pressure * 0.750062)} мм рт.ст.`;
    
    // Устанавливаем иконку
    const weatherIcon = document.getElementById('weather-icon');
    weatherIcon.src = iconUrl;
    weatherIcon.alt = description;
}

// Отображение прогноза на 10 дней
function displayForecast(data) {
    const forecastContainer = document.getElementById('forecast-container');
    forecastContainer.innerHTML = '';
    
    if (!data.daily || !data.daily.time) {
        forecastContainer.innerHTML = '<p>Не удалось загрузить прогноз</p>';
        return;
    }
    
    data.daily.time.forEach((day, index) => {
        const date = new Date(day);
        const weatherCode = data.daily.weather_code[index];
        const maxTemp = data.daily.temperature_2m_max[index];
        const minTemp = data.daily.temperature_2m_min[index];
        
        const isToday = index === 0;
        
        // Форматируем дату
        const dateStr = isToday ? 'Сегодня' : 
                        date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
        
        const forecastItem = document.createElement('div');
        forecastItem.className = `forecast-item${isToday ? ' today' : ''}`;
        
        forecastItem.innerHTML = `
            <h4>${dateStr}</h4>
            <img src="${getWeatherIcon(weatherCode)}" alt="${getWeatherDescription(weatherCode)}">
            <p class="forecast-temp">${Math.round(maxTemp)}°C / ${Math.round(minTemp)}°C</p>
            <p class="forecast-description">${getWeatherDescription(weatherCode)}</p>
        `;
        
        forecastContainer.appendChild(forecastItem);
    });
}

// Отображение почасового прогноза
function displayHourlyForecast(data) {
    const hourlyContainer = document.getElementById('hourly-container');
    hourlyContainer.innerHTML = '';
    
    if (!data.hourly || !data.hourly.time) {
        hourlyContainer.innerHTML = '<p>Не удалось загрузить почасовой прогноз</p>';
        return;
    }
    
    const currentHour = new Date().getHours();
    
    // Берем прогноз на ближайшие 24 часа
    for (let i = 0; i < 24; i++) {
        const hourIndex = i;
        const hour = new Date(data.hourly.time[hourIndex]);
        const temp = data.hourly.temperature_2m[hourIndex];
        const weatherCode = data.hourly.weather_code[hourIndex];
        const precipitation = data.hourly.precipitation_probability?.[hourIndex] || 0;
        
        const isNow = i === 0;
        
        // Форматируем время
        const timeStr = isNow ? 'Сейчас' : 
                        hour.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        const hourlyItem = document.createElement('div');
        hourlyItem.className = `hourly-item${isNow ? ' now' : ''}`;
        
        hourlyItem.innerHTML = `
            <h4>${timeStr}</h4>
            <img src="${getWeatherIcon(weatherCode)}" alt="${getWeatherDescription(weatherCode)}">
            <p class="hourly-temp">${Math.round(temp)}°C</p>
            <p class="hourly-description">${precipitation > 0 ? `${precipitation}% осадки` : ''}</p>
        `;
        
        hourlyContainer.appendChild(hourlyItem);
    }
}

// Загрузка карты
function loadMap(lat, lon) {
    const mapContainer = document.getElementById('map');
    
    // Очищаем предыдущее содержимое и добавляем id для leaflet
    mapContainer.innerHTML = '';
    
    // Создаем элемент для карты
    const mapElement = document.createElement('div');
    mapElement.id = 'leaflet-map';
    mapElement.style.width = '100%';
    mapElement.style.height = '100%';
    mapContainer.appendChild(mapElement);
    
    try {
        // Инициализируем карту с отключенным зумом через скролл (важно для мобильных)
        const map = L.map('leaflet-map', {
            scrollWheelZoom: false,
            dragging: !L.Browser.mobile, // Отключаем драг для мобильных устройств, которые и так могут использовать жесты
            tap: L.Browser.mobile, // Включаем поддержку тапов для мобильных
            attributionControl: false // Удаляем атрибуцию с карты для чистоты
        }).setView([lat, lon], 12);
        
        // Добавляем более современный и красивый слой карты
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            subdomains: 'abcd',
            maxZoom: 19,
            minZoom: 2
        }).addTo(map);
        
        // Красивый настраиваемый маркер
        const customIcon = L.divIcon({
            className: 'custom-map-marker',
            html: `<div class="marker-pin"></div>`,
            iconSize: [30, 42],
            iconAnchor: [15, 42]
        });
        
        // Добавляем маркер
        const marker = L.marker([lat, lon], {
            icon: customIcon
        }).addTo(map);
        
        // Добавляем всплывающее окно к маркеру с более красивым форматированием
        marker.bindPopup(`
            <div class="map-popup">
                <div class="map-popup-title">${currentCity}</div>
                <div class="map-popup-coords">
                    ${lat.toFixed(4)}, ${lon.toFixed(4)}
                </div>
            </div>
        `).openPopup();
        
        // Добавляем кнопки управления
        L.control.zoom({
            position: 'topleft'
        }).addTo(map);
        
        // Добавляем кнопку для открытия в Google Maps
        const googleMapsBtn = L.control({position: 'bottomright'});
        
        googleMapsBtn.onAdd = function() {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            div.innerHTML = `<a href="https://www.google.com/maps?q=${lat},${lon}" target="_blank" 
                              class="leaflet-google-maps-link" title="Открыть в Google Maps">
                              <i class="fab fa-google"></i></a>`;
            return div;
        };
        
        googleMapsBtn.addTo(map);
        
        // Важно: фиксируем карту при переключении вкладок
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (button.getAttribute('data-tab') === 'map') {
                    setTimeout(() => {
                        map.invalidateSize();
                        map.setView([lat, lon], 12);
                    }, 100);
                }
            });
        });
        
        // Исправляем размер карты после загрузки
        setTimeout(() => {
            map.invalidateSize();
            map.setView([lat, lon], 12);
        }, 300);
        
        // Еще одна проверка размера через секунду
        setTimeout(() => {
            map.invalidateSize();
        }, 1000);
        
        // Добавляем атрибуцию внизу
        const attribution = L.control.attribution({
            position: 'bottomleft'
        });
        attribution.addAttribution('© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');
        attribution.addTo(map);
        
    } catch (error) {
        console.error('Error loading map:', error);
        
        // Показываем запасной вариант если карта не загрузилась
        mapContainer.innerHTML = `
            <div class="map-fallback">
                <p><i class="fas fa-map-marker-alt"></i> Координаты: ${lat.toFixed(4)}, ${lon.toFixed(4)}</p>
                <div class="map-buttons">
                    <a href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=14/${lat}/${lon}" target="_blank" class="map-button">
                        <i class="fas fa-map"></i> OpenStreetMap
                    </a>
                    <a href="https://www.google.com/maps?q=${lat},${lon}" target="_blank" class="map-button">
                        <i class="fab fa-google"></i> Google Maps
                    </a>
                </div>
            </div>
        `;
    }
}

// Установка фона в зависимости от погоды
function setWeatherBackground(weatherCode) {
    document.body.classList.remove(
        'weather-clear', 
        'weather-cloudy', 
        'weather-rain', 
        'weather-snow', 
        'weather-thunderstorm'
    );
    
    if (weatherCode === 0 || weatherCode === 1) {
        document.body.classList.add('weather-clear');
    } else if (weatherCode >= 2 && weatherCode <= 3) {
        document.body.classList.add('weather-cloudy');
    } else if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82)) {
        document.body.classList.add('weather-rain');
    } else if ((weatherCode >= 71 && weatherCode <= 77) || (weatherCode >= 85 && weatherCode <= 86)) {
        document.body.classList.add('weather-snow');
    } else if (weatherCode >= 95 && weatherCode <= 99) {
        document.body.classList.add('weather-thunderstorm');
    }
}

// Получение описания погоды по коду
function getWeatherDescription(code) {
    const descriptions = {
        0: 'Ясно',
        1: 'Преимущественно ясно',
        2: 'Переменная облачность',
        3: 'Облачно',
        45: 'Туман',
        48: 'Изморозь',
        51: 'Слабая морось',
        53: 'Умеренная морось',
        55: 'Сильная морось',
        56: 'Ледяная морось',
        57: 'Сильная ледяная морось',
        61: 'Слабый дождь',
        63: 'Умеренный дождь',
        65: 'Сильный дождь',
        66: 'Ледяной дождь',
        67: 'Сильный ледяной дождь',
        71: 'Слабый снег',
        73: 'Умеренный снег',
        75: 'Сильный снег',
        77: 'Снежные зёрна',
        80: 'Слабый ливень',
        81: 'Умеренный ливень',
        82: 'Сильный ливень',
        85: 'Слабый снегопад',
        86: 'Сильный снегопад',
        95: 'Гроза',
        96: 'Гроза с градом',
        99: 'Сильная гроза с градом'
    };
    
    return descriptions[code] || 'Неизвестные погодные условия';
}

// Получение URL иконки по коду погоды
function getWeatherIcon(code) {
    const iconBaseUrl = 'https://raw.githubusercontent.com/basmilius/weather-icons/master/design/fill/animation-ready/';
    
    if (code === 0) return `${iconBaseUrl}clear-day.svg`;
    if (code === 1) return `${iconBaseUrl}partly-cloudy-day.svg`;
    if (code === 2) return `${iconBaseUrl}partly-cloudy-day.svg`;
    if (code === 3) return `${iconBaseUrl}cloudy.svg`;
    if (code >= 45 && code <= 48) return `${iconBaseUrl}fog.svg`;
    if (code >= 51 && code <= 57) return `${iconBaseUrl}drizzle.svg`;
    if (code >= 61 && code <= 65) return `${iconBaseUrl}rain.svg`;
    if (code >= 66 && code <= 67) return `${iconBaseUrl}sleet.svg`;
    if (code >= 71 && code <= 77) return `${iconBaseUrl}snow.svg`;
    if (code >= 80 && code <= 82) return `${iconBaseUrl}rain.svg`;
    if (code >= 85 && code <= 86) return `${iconBaseUrl}snow.svg`;
    if (code >= 95 && code <= 99) return `${iconBaseUrl}thunderstorms.svg`;
    
    return `${iconBaseUrl}not-available.svg`;
}

// Получение кода страны для флага
function getCountryCode(countryName) {
    const countries = {
        'Russia': 'ru',
        'United States of America': 'us',
        'United States': 'us',
        'United Kingdom': 'gb',
        'Japan': 'jp',
        'France': 'fr',
        'Australia': 'au',
        'United Arab Emirates': 'ae',
        'Brazil': 'br',
        'Georgia': 'ge',
        'Россия': 'ru',
        'США': 'us',
        'Великобритания': 'gb',
        'Япония': 'jp',
        'Франция': 'fr',
        'Австралия': 'au',
        'ОАЭ': 'ae',
        'Бразилия': 'br',
        'Грузия': 'ge',
        'Germany': 'de',
        'Германия': 'de',
        'China': 'cn',
        'Китай': 'cn',
        'Italy': 'it',
        'Италия': 'it',
        'Spain': 'es',
        'Испания': 'es',
        'Canada': 'ca',
        'Канада': 'ca'
    };
    
    return countries[countryName] || null;
}

// Показ всплывающих уведомлений
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastsContainer.appendChild(toast);
    
    // Удаляем тост через 3 секунды
    setTimeout(() => {
        toast.remove();
    }, 3500);
}

// Настройка поиска
function setupSearch() {
    // Обработчик для кнопки поиска
    searchButton.addEventListener('click', () => {
        const city = searchInput.value.trim();
        if (city) {
            getWeather(city);
        } else {
            showToast('Пожалуйста, введите название города', 'error');
        }
    });

    // Обработчик для поиска по Enter
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const city = searchInput.value.trim();
            if (city) {
                getWeather(city);
            } else {
                showToast('Пожалуйста, введите название города', 'error');
            }
        }
    });

    // Обработчик для кнопки определения местоположения
    locationButton.addEventListener('click', getUserLocation);
}

// ======================= КОД ДЛЯ ЧАТА =======================
// Инициализация чата
function initChat() {
    // Если имя пользователя уже сохранено, скрываем форму
    if (username) {
        usernameModal.style.display = 'none';
        chatInput.disabled = false;
        sendMessageButton.disabled = false;
        
        // Добавляем системное сообщение
        addSystemMessage(`Добро пожаловать, ${username}!`);
    }
    
    // Обработчик кнопки открытия чата
    chatButton.addEventListener('click', () => {
        chatPanel.classList.add('active');
        chatButton.style.display = 'none';
        chatIsActive = true;
        
        // Прокручиваем к последнему сообщению
        scrollToBottom();
    });
    
    // Обработчик кнопки сворачивания чата
    minimizeChatButton.addEventListener('click', () => {
        chatPanel.classList.remove('active');
        chatButton.style.display = 'flex';
        chatIsActive = false;
    });
    
    // Обработчик отправки сообщения
    sendMessageButton.addEventListener('click', sendMessage);
    
    // Отправка сообщения по Enter
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Обработчик сохранения имени пользователя
    saveUsernameButton.addEventListener('click', saveUsername);
    
    // Проверка ввода имени
    usernameInput.addEventListener('input', () => {
        usernameError.textContent = '';
    });
    
    // Имитируем получение сообщений каждые 30-60 секунд
    setInterval(receiveRandomMessage, Math.random() * 30000 + 30000);
    
    // Добавляем приветственное сообщение
    if (chatMessagesDB.length === 0) {
        addSystemMessage('Добро пожаловать в погодный чат!');
        addSystemMessage('Здесь вы можете общаться с другими пользователями о погодных условиях.');
    }
}

// Сохранение имени пользователя
function saveUsername() {
    const name = usernameInput.value.trim();
    
    if (!name) {
        usernameError.textContent = 'Введите имя пользователя';
        return;
    }
    
    if (name.length < 3) {
        usernameError.textContent = 'Имя должно содержать минимум 3 символа';
        return;
    }
    
    if (chatUsers.has(name.toLowerCase())) {
        usernameError.textContent = 'Это имя уже занято, выберите другое';
        return;
    }
    
    // Сохраняем имя
    username = name;
    localStorage.setItem('chat_username', username);
    chatUsers.add(username.toLowerCase());
    
    // Скрываем форму
    usernameModal.style.display = 'none';
    chatInput.disabled = false;
    sendMessageButton.disabled = false;
    
    // Добавляем системное сообщение
    addSystemMessage(`${username} присоединился к чату`);
}

// Отправка сообщения
function sendMessage() {
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    // Создаем объект сообщения
    const messageObj = {
        author: username,
        text: message,
        timestamp: new Date().getTime(),
        isOwn: true
    };
    
    // Добавляем сообщение в чат
    addMessageToChat(messageObj);
    
    // Очищаем поле ввода
    chatInput.value = '';
    
    // В реальном приложении здесь был бы код для отправки сообщения на сервер
    // Например, Firebase.push(messageObj)
}

// Добавление сообщения в чат
function addMessageToChat(message) {
    // Сохраняем сообщение в "базу данных"
    chatMessagesDB.push(message);
    
    // Создаем элемент сообщения
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${message.isOwn ? 'own' : 'other'}`;
    
    // Форматируем время
    const date = new Date(message.timestamp);
    const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    // Добавляем содержимое
    messageElement.innerHTML = `
        ${!message.isOwn ? `<div class="message-author">${message.author}</div>` : ''}
        <div class="message-text">${message.text}</div>
        <div class="message-time">${time}</div>
    `;
    
    // Добавляем в DOM
    chatMessages.appendChild(messageElement);
    
    // Прокручиваем вниз
    scrollToBottom();
}

// Добавление системного сообщения
function addSystemMessage(text) {
    const systemMessage = document.createElement('div');
    systemMessage.className = 'system-message';
    systemMessage.textContent = text;
    
    chatMessages.appendChild(systemMessage);
    scrollToBottom();
}

// Прокрутка чата вниз
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Имитация получения случайного сообщения
function receiveRandomMessage() {
    if (!username) return; // Не показываем сообщения, если пользователь не авторизован
    
    const randomNames = ['Метеоролог', 'ПогодаLover', 'Синоптик', 'Метеостанция', 'ЛюбительГроз', 'СнежныйБарс'];
    const randomMessages = [
        'Как у вас сегодня погода?',
        'У нас тут дождь целый день!',
        'Кто-нибудь знает прогноз на завтра?',
        'Невероятная жара сегодня...',
        'Зима никак не хочет отступать в нашем регионе',
        'Не думал, что будет так солнечно сегодня!',
        'Говорят, будет шторм на выходных',
        'Кто-то видел радугу сегодня?',
        'Температура упала на 10 градусов за час!',
        'Люблю осеннюю погоду'
    ];
    
    // Выбираем случайное имя (не совпадающее с именем пользователя)
    let randomAuthor;
    do {
        randomAuthor = randomNames[Math.floor(Math.random() * randomNames.length)];
    } while (randomAuthor.toLowerCase() === username.toLowerCase());
    
    // Выбираем случайное сообщение
    const randomText = randomMessages[Math.floor(Math.random() * randomMessages.length)];
    
    // Создаем объект сообщения
    const messageObj = {
        author: randomAuthor,
        text: randomText,
        timestamp: new Date().getTime(),
        isOwn: false
    };
    
    // Добавляем в чат, но только если чат активен
    if (chatIsActive) {
        addMessageToChat(messageObj);
    }
} 