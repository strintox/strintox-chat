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

// Инициализация страницы
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSearchHistory();
    initFavorites();
    setupTabSwitching();
    setupDrawer();
    setupFavoritesPanel();
    
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

// Получение погоды по координатам
async function getWeatherByCoords(lat, lon) {
    try {
        // Получаем данные о местоположении
        const locationUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
        const locationResponse = await fetch(locationUrl);
        const locationData = await locationResponse.json();
        
        // Получаем данные о погоде
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum&timezone=auto&forecast_days=${FORECAST_DAYS}`;
        
        const weatherResponse = await fetch(weatherUrl);
        
        if (!weatherResponse.ok) {
            throw new Error('Не удалось получить данные о погоде');
        }
        
        const weatherData = await weatherResponse.json();
        
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
        
    } catch (error) {
        console.error('Error:', error);
        errorMessage.style.display = 'block';
        weatherInfo.classList.remove('active');
    }
}

// Получение погоды по названию города
async function getWeather(city) {
    try {
        weatherInfo.classList.add('active');
        document.getElementById('city-name').textContent = 'Загрузка...';
        document.getElementById('weather-description').textContent = 'Получаем данные о погоде...';
        
        // Получаем координаты города
        const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();
        
        if (!geoData || geoData.length === 0) {
            throw new Error('Город не найден');
        }
        
        const location = geoData[0];
        const lat = location.lat;
        const lon = location.lon;
        
        // Получаем данные о погоде
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum&timezone=auto&forecast_days=${FORECAST_DAYS}`;
        
        const weatherResponse = await fetch(weatherUrl);
        
        if (!weatherResponse.ok) {
            throw new Error('Ошибка получения данных о погоде');
        }
        
        const weatherData = await weatherResponse.json();
        
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
        console.error('Error:', error);
        errorMessage.style.display = 'block';
        weatherInfo.classList.remove('active');
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
    mapContainer.innerHTML = `
        <iframe width="100%" height="100%" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" 
            src="https://www.openstreetmap.org/export/embed.html?bbox=${lon-0.1}%2C${lat-0.1}%2C${lon+0.1}%2C${lat+0.1}&amp;layer=mapnik&amp;marker=${lat}%2C${lon}">
        </iframe>
    `;
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

// Слушатели событий
searchButton.addEventListener('click', () => {
    const city = searchInput.value.trim();
    if (city) {
        getWeather(city);
    }
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = searchInput.value.trim();
        if (city) {
            getWeather(city);
        }
    }
});

locationButton.addEventListener('click', getUserLocation); 