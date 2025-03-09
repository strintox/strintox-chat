// Константы
const API_KEY = '4d8fb5b93d4af21d66a2948710284366'; // Бесплатный ключ OpenWeatherMap API
const DEFAULT_CITY = 'Сухум';

// Список городов Абхазии с координатами и данными о море
const COASTAL_CITIES = {
    'Сухум': {
        coords: [43.0050, 41.0200], 
        en: 'Sukhumi',
        seaTemp: true,
        beachType: 'галечный'
    },
    'Гагра': {
        coords: [43.2778, 40.2711], 
        en: 'Gagra',
        seaTemp: true,
        beachType: 'галечный'
    },
    'Гудаута': {
        coords: [43.1036, 40.6208], 
        en: 'Gudauta',
        seaTemp: true,
        beachType: 'галечный'
    },
    'Новый Афон': {
        coords: [43.0997, 40.8144], 
        en: 'New Athos',
        seaTemp: true,
        beachType: 'песчано-галечный'
    },
    'Очамчира': {
        coords: [42.7144, 41.4672], 
        en: 'Ochamchire',
        seaTemp: true,
        beachType: 'галечный'
    },
    'Пицунда': {
        coords: [43.1622, 40.3412], 
        en: 'Pitsunda',
        seaTemp: true,
        beachType: 'песчаный'
    },
    'Сочи': {
        coords: [43.5992, 39.7257],
        en: 'Sochi',
        seaTemp: true,
        beachType: 'галечный'
    },
    'Батуми': {
        coords: [41.6459, 41.6460],
        en: 'Batumi',
        seaTemp: true,
        beachType: 'галечный'
    }
};

// Дополнительные координаты популярных городов для быстрого доступа
const POPULAR_CITIES = {
    'Москва': { coords: [55.7558, 37.6173], en: 'Moscow' },
    'Санкт-Петербург': { coords: [59.9343, 30.3351], en: 'Saint Petersburg' },
    'Минск': { coords: [53.9045, 27.5615], en: 'Minsk' },
    'Киев': { coords: [50.4501, 30.5234], en: 'Kyiv' },
    'Нью-Йорк': { coords: [40.7128, -74.0060], en: 'New York' },
    'Лондон': { coords: [51.5074, -0.1278], en: 'London' },
    'Париж': { coords: [48.8566, 2.3522], en: 'Paris' },
    'Токио': { coords: [35.6762, 139.6503], en: 'Tokyo' }
};

// Информация о направлениях ветра
const WIND_DIRECTIONS = {
    0: 'С',
    45: 'СВ',
    90: 'В',
    135: 'ЮВ',
    180: 'Ю',
    225: 'ЮЗ',
    270: 'З',
    315: 'СЗ',
    360: 'С'
};

// Сезонные данные о температуре моря по месяцам (примерные данные)
const SEA_TEMP_BY_MONTH = {
    0: 10, // Январь
    1: 9,  // Февраль
    2: 10, // Март
    3: 12, // Апрель
    4: 16, // Май
    5: 20, // Июнь
    6: 24, // Июль
    7: 26, // Август
    8: 24, // Сентябрь
    9: 20, // Октябрь
    10: 16, // Ноябрь
    11: 13  // Декабрь
};

// Оценки состояния моря по высоте волн
const SEA_CONDITIONS = {
    0: 'Штиль, море спокойное',
    0.5: 'Спокойное море, небольшие волны',
    1: 'Слегка волнистое море',
    1.5: 'Умеренное волнение',
    2: 'Значительное волнение',
    3: 'Сильное волнение, не рекомендуется купание',
    4: 'Шторм, купание опасно',
    5: 'Сильный шторм, опасно находиться у берега'
};

// Перевод состояний погоды на русский
const WEATHER_TRANSLATIONS = {
    'clear sky': 'Ясно',
    'few clouds': 'Небольшая облачность',
    'scattered clouds': 'Рассеянные облака',
    'broken clouds': 'Облачно с прояснениями',
    'overcast clouds': 'Пасмурно',
    'light rain': 'Небольшой дождь',
    'moderate rain': 'Умеренный дождь',
    'heavy intensity rain': 'Сильный дождь',
    'very heavy rain': 'Очень сильный дождь',
    'extreme rain': 'Экстремальный дождь',
    'freezing rain': 'Ледяной дождь',
    'light intensity shower rain': 'Небольшой ливень',
    'shower rain': 'Ливень',
    'heavy intensity shower rain': 'Сильный ливень',
    'ragged shower rain': 'Моросящий дождь',
    'light snow': 'Небольшой снег',
    'snow': 'Снег',
    'heavy snow': 'Сильный снегопад',
    'sleet': 'Мокрый снег',
    'light shower sleet': 'Небольшой мокрый снег',
    'shower sleet': 'Мокрый снег',
    'light rain and snow': 'Небольшой дождь со снегом',
    'rain and snow': 'Дождь со снегом',
    'light shower snow': 'Небольшой снегопад',
    'shower snow': 'Снегопад',
    'heavy shower snow': 'Сильный снегопад',
    'mist': 'Туман',
    'smoke': 'Дымка',
    'haze': 'Мгла',
    'sand/dust whirls': 'Песчаная буря',
    'fog': 'Туман',
    'sand': 'Песок',
    'dust': 'Пыль',
    'volcanic ash': 'Вулканический пепел',
    'squalls': 'Шквалы',
    'tornado': 'Торнадо',
    'thunderstorm with light rain': 'Гроза с небольшим дождем',
    'thunderstorm with rain': 'Гроза с дождем',
    'thunderstorm with heavy rain': 'Гроза с сильным дождем',
    'light thunderstorm': 'Небольшая гроза',
    'thunderstorm': 'Гроза',
    'heavy thunderstorm': 'Сильная гроза',
    'ragged thunderstorm': 'Местами гроза',
    'thunderstorm with light drizzle': 'Гроза с легкой моросью',
    'thunderstorm with drizzle': 'Гроза с моросью',
    'thunderstorm with heavy drizzle': 'Гроза с сильной моросью'
};

// Названия дней недели на русском
const DAYS_OF_WEEK = {
    'Mon': 'Пн',
    'Tue': 'Вт',
    'Wed': 'Ср',
    'Thu': 'Чт',
    'Fri': 'Пт',
    'Sat': 'Сб',
    'Sun': 'Вс'
};

// Названия месяцев на русском
const MONTHS = {
    'Jan': 'Янв',
    'Feb': 'Фев',
    'Mar': 'Мар',
    'Apr': 'Апр',
    'May': 'Май',
    'Jun': 'Июн',
    'Jul': 'Июл',
    'Aug': 'Авг',
    'Sep': 'Сен',
    'Oct': 'Окт',
    'Nov': 'Ноя',
    'Dec': 'Дек'
};

// DOM элементы
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const locationElement = document.getElementById('location');
const dateTimeElement = document.getElementById('date-time');
const temperatureElement = document.getElementById('temperature');
const feelsLikeElement = document.getElementById('feels-like');
const weatherIconElement = document.getElementById('weather-icon');
const weatherDescriptionElement = document.getElementById('weather-description');
const windElement = document.getElementById('wind');
const humidityElement = document.getElementById('humidity');
const pressureElement = document.getElementById('pressure');
const forecastContainer = document.getElementById('forecast-container');
const themeToggle = document.getElementById('theme-toggle');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notification-message');
const closeNotification = document.getElementById('close-notification');
const seaInfoSection = document.getElementById('sea-info-section');

// Расширенная информация о погоде
const sunriseElement = document.getElementById('sunrise');
const sunsetElement = document.getElementById('sunset');
const visibilityElement = document.getElementById('visibility');
const cloudsElement = document.getElementById('clouds');
const windDirectionElement = document.getElementById('wind-direction');
const windGustElement = document.getElementById('wind-gust');

// Информация о море
const seaTempElement = document.getElementById('sea-temp');
const waveHeightElement = document.getElementById('wave-height');
const waveDirectionElement = document.getElementById('wave-direction');
const seaConditionsElement = document.getElementById('sea-conditions');

// Инициализация карты
let map = null;
let weatherMarkers = [];
let currentCity = DEFAULT_CITY;

// Текущие единицы измерения (metric по умолчанию)
let currentUnits = 'metric';

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    console.log("Initializing weather app...");
    initMap();
    
    // Получить сохраненные единицы измерения
    const savedUnits = localStorage.getItem('units') || 'metric';
    currentUnits = savedUnits;
    console.log("Using initial units:", currentUnits);
    
    // Получить последний искомый город или использовать город по умолчанию
    const lastSearch = localStorage.getItem('lastSearch') || DEFAULT_CITY;
    console.log("Initial city:", lastSearch);
    
    getCurrentWeather(lastSearch);
    getForecast(lastSearch);
    updateDateTime();
    setInterval(updateDateTime, 60000); // Обновление времени каждую минуту
    
    // Установка слушателей событий
    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // Предотвращение выделения текста и контекстного меню правой кнопкой мыши
    document.addEventListener('selectstart', (e) => e.preventDefault());
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Установка слушателя для закрытия уведомления
    if (closeNotification) {
        closeNotification.addEventListener('click', hideNotification);
    }
    
    // Исправление функциональности переключения темы
    if (themeToggle) {
        // Добавляем обработчики как для события change, так и для click
        themeToggle.addEventListener('change', toggleTheme);
        themeToggle.addEventListener('click', () => {
            // Принудительно запускаем функцию toggleTheme, даже если событие change не сработало
            setTimeout(toggleTheme, 50);
        });
        
        // Инициализация темы
        initTheme();
    }
    
    // Слушаем авторизацию Firebase
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("User logged in, syncing preferences...");
            // При авторизации, preferences будут загружены через callback в auth.js
        } else {
            console.log("No user logged in, using localStorage settings");
        }
    });
});

// Инициализация темы
function initTheme() {
    // Проверяем сохраненную тему или предпочтение системы
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeToggle) themeToggle.checked = true;
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        if (themeToggle) themeToggle.checked = false;
    }
}

// Переключение темы
function toggleTheme() {
    console.log('Toggle theme called, checked:', themeToggle?.checked);
    
    if (themeToggle && themeToggle.checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }
}

// Показать уведомление
function showNotification() {
    // Пустая функция, не выполняет никаких действий
    return;
}

// Скрыть уведомление
function hideNotification() {
    if (notification) {
        notification.classList.remove('show');
    }
}

// Инициализация карты
function initMap() {
    // Центр карты (Сухум)
    const initialCoordinates = COASTAL_CITIES['Сухум'].coords;
    
    map = L.map('weather-map').setView(initialCoordinates, 7);
    
    // Добавление слоя OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18
    }).addTo(map);
    
    // Добавление маркеров для прибрежных городов
    for (const city in COASTAL_CITIES) {
        if (COASTAL_CITIES.hasOwnProperty(city)) {
            addWeatherMarker(COASTAL_CITIES[city].coords, city);
        }
    }
    
    // Добавление маркеров для популярных городов
    for (const city in POPULAR_CITIES) {
        if (POPULAR_CITIES.hasOwnProperty(city)) {
            addWeatherMarker(POPULAR_CITIES[city].coords, city);
        }
    }
}

// Добавление маркера погоды на карту
function addWeatherMarker(coords, cityName) {
    const marker = L.marker(coords).addTo(map);
    marker.bindPopup(`<b>${cityName}</b><br>Загрузка данных о погоде...`);
    
    // Сохранение ссылки на маркер
    weatherMarkers.push({
        marker: marker,
        city: cityName
    });
    
    // Получение данных о погоде для этого маркера
    updateMarkerWeather(cityName, marker);
    
    // Добавление события клика на маркер
    marker.on('click', () => {
        getCurrentWeather(cityName);
        getForecast(cityName);
        searchInput.value = cityName;
    });
}

// Обновление информации о погоде в маркере
function updateMarkerWeather(cityName, marker) {
    // Конвертация имени города для API, если нужно
    const apiCityName = getCityNameForAPI(cityName);
    
    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${apiCityName}&appid=${API_KEY}&units=${currentUnits}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Данные о погоде недоступны');
            }
            return response.json();
        })
        .then(data => {
            const temp = Math.round(data.main.temp);
            const description = translateWeather(data.weather[0].description);
            const iconCode = data.weather[0].icon;
            const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
            
            marker.setPopupContent(`
                <div style="text-align: center;">
                    <b>${cityName}</b><br>
                    <img src="${iconUrl}" alt="${description}" style="width: 50px; height: 50px;"><br>
                    <b>${temp}°C</b><br>
                    ${description}<br>
                    <button onclick="selectCity('${cityName}')" style="margin-top: 5px; padding: 5px; background-color: var(--primary-color, #0091EA); color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Показать прогноз
                    </button>
                </div>
            `);
        })
        .catch(error => {
            console.error('Ошибка обновления погоды маркера:', error);
            marker.setPopupContent(`<b>${cityName}</b><br>Данные о погоде недоступны`);
        });
}

// Получение названия города для API
function getCityNameForAPI(cityName) {
    if (COASTAL_CITIES[cityName]) {
        return COASTAL_CITIES[cityName].en;
    } else if (POPULAR_CITIES[cityName]) {
        return POPULAR_CITIES[cityName].en;
    }
    return cityName;
}

// Проверка, является ли город прибрежным
function isCoastalCity(cityName) {
    return COASTAL_CITIES.hasOwnProperty(cityName);
}

// Выбор города из маркера карты
window.selectCity = function(cityName) {
    getCurrentWeather(cityName);
    getForecast(cityName);
    searchInput.value = cityName;
    
    // Save to localStorage and Firebase
    localStorage.setItem('lastSearch', cityName);
    
    // Делаем с задержкой, чтобы убедиться, что auth.js загружен
    setTimeout(() => {
        if (typeof window.addToSearchHistory === 'function') {
            console.log("Calling addToSearchHistory from selectCity");
            window.addToSearchHistory(cityName);
        } else {
            console.warn("addToSearchHistory function not available");
        }
    }, 300);  // Увеличиваем задержку для надежности
    
    // Найти координаты города и центрировать карту
    const cityInfo = COASTAL_CITIES[cityName] || POPULAR_CITIES[cityName];
    if (cityInfo) {
        map.setView(cityInfo.coords, 12);
    }
};

// Установка единиц измерения
function setUnits(units) {
    if (units !== 'metric' && units !== 'imperial') {
        console.error('Invalid units specified:', units);
        return;
    }
    
    // Обновить текущие единицы
    currentUnits = units;
    console.log("Units changed to", units);
    
    // Сохранить в localStorage
    localStorage.setItem('units', units);
    
    // Обновить текущий прогноз с новыми единицами
    const city = searchInput.value.trim() || localStorage.getItem('lastSearch') || DEFAULT_CITY;
    
    // Перезагрузить данные с новыми единицами
    getCurrentWeather(city);
    getForecast(city);
}

// Обработка поиска
function handleSearch() {
    const city = searchInput.value.trim();
    if (city) {
        console.log("Searching for city:", city);
        getCurrentWeather(city);
        getForecast(city);
        
        // Save last search to localStorage
        localStorage.setItem('lastSearch', city);
        
        // Save to Firebase if user is logged in - делаем с задержкой, чтобы убедиться, что auth.js загружен
        setTimeout(() => {
            if (typeof window.addToSearchHistory === 'function') {
                console.log("Calling addToSearchHistory from handleSearch");
                try {
                    window.addToSearchHistory(city);
                } catch (err) {
                    console.error("Error adding to search history:", err);
                }
            } else {
                console.warn("addToSearchHistory function not available");
            }
        }, 300);  // Увеличиваем задержку для надежности
    }
}

// Save user preference to Firebase
function saveUserPreference(userId, key, value) {
    db.collection('userPreferences').doc(userId).set({
        [key]: value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true })
    .catch(error => {
        console.error('Error saving user preference:', error);
    });
}

// Проверка, является ли город приморским на основе координат
function isNearSea(lat, lon) {
    // Простая эвристика для определения прибрежных городов 
    // Черное море, Средиземное море, побережья Атлантики и Тихого океана
    // Черное море
    if (lat >= 40 && lat <= 47 && lon >= 27 && lon <= 42) return true;
    // Средиземное море
    if (lat >= 30 && lat <= 45 && lon >= -5 && lon <= 36) return true;
    // Побережье Атлантики (Европа)
    if (lat >= 36 && lat <= 60 && lon >= -10 && lon <= 0) return true;
    // Восточное побережье США
    if (lat >= 25 && lat <= 45 && lon >= -82 && lon <= -65) return true;
    
    // Для остальных регионов можно добавить дополнительные проверки
    
    return false;
}

// Получение текущей погоды
function getCurrentWeather(city) {
    showLoadingState();
    currentCity = city;
    
    // Конвертация имени города для API, если нужно
    const apiCityName = getCityNameForAPI(city);
    
    // Добавляем параметр units к запросу
    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${apiCityName}&appid=${API_KEY}&units=${currentUnits}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Город не найден или ошибка API');
            }
            return response.json();
        })
        .then(data => {
            // Проверка на прибрежный город для отображения информации о море
            const isCoastal = isCoastalCity(city) || isNearSea(data.coord.lat, data.coord.lon);
            
            if (isCoastal) {
                updateSeaInfo(city, data.coord.lat, data.coord.lon);
                seaInfoSection.classList.remove('hidden');
            } else {
                seaInfoSection.classList.add('hidden');
            }
            
            // Используем оригинальное русское название города вместо данных из API
            locationElement.textContent = city;
            
            // Отображаем температуру в зависимости от единиц измерения
            temperatureElement.textContent = `${Math.round(data.main.temp)} ${currentUnits === 'metric' ? '°C' : '°F'}`;
            feelsLikeElement.textContent = `Ощущается как: ${Math.round(data.main.feels_like)} ${currentUnits === 'metric' ? '°C' : '°F'}`;
            
            const weatherDescription = translateWeather(data.weather[0].description);
            weatherDescriptionElement.textContent = weatherDescription;
            
            const iconCode = data.weather[0].icon;
            weatherIconElement.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
            weatherIconElement.alt = weatherDescription;
            
            // Отображаем скорость ветра в зависимости от единиц измерения
            const windUnit = currentUnits === 'metric' ? 'м/с' : 'миль/ч';
            windElement.textContent = `${data.wind.speed} ${windUnit}`;
            
            humidityElement.textContent = `${data.main.humidity}%`;
            pressureElement.textContent = `${Math.round(data.main.pressure * 0.75)} мм рт.ст.`;
            
            // Обновление расширенной информации о погоде
            updateExtendedWeatherInfo(data);
            
            // Центрирование карты на выбранном городе
            map.setView([data.coord.lat, data.coord.lon], 12);
            
            // Проверка, есть ли у города уже маркер, если нет - добавить его
            const existingMarker = weatherMarkers.find(m => m.city.toLowerCase() === city.toLowerCase());
            if (!existingMarker) {
                addWeatherMarker([data.coord.lat, data.coord.lon], city);
            }
        })
        .catch(error => {
            console.error('Ошибка получения текущей погоды:', error);
            showErrorState('Не удалось получить данные о погоде. Пожалуйста, проверьте название города и попробуйте снова.');
        });
}

// Обновление расширенной информации о погоде
function updateExtendedWeatherInfo(data) {
    // Восход и закат солнца
    const sunriseTime = new Date(data.sys.sunrise * 1000);
    const sunsetTime = new Date(data.sys.sunset * 1000);
    
    sunriseElement.textContent = sunriseTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    sunsetElement.textContent = sunsetTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    // Видимость
    visibilityElement.textContent = data.visibility >= 10000 
        ? 'Более 10 км' 
        : `${(data.visibility / 1000).toFixed(1)} км`;
    
    // Облачность
    cloudsElement.textContent = `${data.clouds.all}%`;
    
    // Направление ветра
    const windDeg = data.wind.deg;
    const direction = getWindDirection(windDeg);
    windDirectionElement.textContent = direction;
    
    // Порывы ветра
    windGustElement.textContent = data.wind.gust 
        ? `${data.wind.gust.toFixed(1)} м/с` 
        : 'Нет данных';
}

// Обновление информации о море
function updateSeaInfo(city, lat, lon) {
    // Получение информации о море (симуляция, так как бесплатное API не предоставляет такие данные)
    const currentMonth = new Date().getMonth();
    const seaTemp = SEA_TEMP_BY_MONTH[currentMonth];
    
    // Расчет высоты волн на основе скорости ветра (приблизительно)
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnits}`)
        .then(response => response.json())
        .then(data => {
            const windSpeed = data.wind.speed;
            const waveHeight = calculateWaveHeight(windSpeed);
            const windDeg = data.wind.deg;
            const waveDirection = getWindDirection(windDeg);
            
            // Обновление элементов интерфейса
            seaTempElement.textContent = `${seaTemp} °C`;
            waveHeightElement.textContent = `${waveHeight.toFixed(1)} м`;
            waveDirectionElement.textContent = waveDirection;
            
            // Определение состояния моря
            seaConditionsElement.textContent = getSeaConditions(waveHeight);
        })
        .catch(error => {
            console.error('Ошибка получения данных о море:', error);
            seaTempElement.textContent = 'Нет данных';
            waveHeightElement.textContent = 'Нет данных';
            waveDirectionElement.textContent = 'Нет данных';
            seaConditionsElement.textContent = 'Нет данных';
        });
}

// Расчет высоты волн на основе скорости ветра (приблизительная формула)
function calculateWaveHeight(windSpeed) {
    // Формула для приблизительного расчета высоты волн
    const baseHeight = Math.min(windSpeed * 0.2, 4);
    
    // Добавляем небольшую случайность для реалистичности
    const randomFactor = Math.random() * 0.3 - 0.15;
    return Math.max(0, baseHeight + randomFactor);
}

// Получение состояния моря по высоте волн
function getSeaConditions(waveHeight) {
    // Находим ближайшее значение из нашего словаря
    const heights = Object.keys(SEA_CONDITIONS).map(Number).sort((a, b) => a - b);
    let closestHeight = heights[0];
    
    for (const height of heights) {
        if (waveHeight >= height) {
            closestHeight = height;
        } else {
            break;
        }
    }
    
    return SEA_CONDITIONS[closestHeight];
}

// Получение направления ветра по градусам
function getWindDirection(degrees) {
    // Округление до ближайшего из основных направлений
    const normalized = Math.round(degrees / 45) * 45;
    const adjusted = normalized === 360 ? 0 : normalized;
    return WIND_DIRECTIONS[adjusted];
}

// Получение прогноза на 10 дней
function getForecast(city) {
    // Конвертация имени города для API, если нужно
    const apiCityName = getCityNameForAPI(city);
    
    // Добавляем параметр units к запросу
    fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${apiCityName}&appid=${API_KEY}&units=${currentUnits}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Данные прогноза недоступны');
            }
            return response.json();
        })
        .then(data => {
            // Обработка и отображение данных прогноза
            displayForecast(data);
        })
        .catch(error => {
            console.error('Ошибка получения прогноза:', error);
            forecastContainer.innerHTML = '<p>Данные прогноза недоступны</p>';
        });
}

// Отображение данных прогноза
function displayForecast(data) {
    forecastContainer.innerHTML = '';
    
    // Группировка прогноза по дням (OpenWeatherMap бесплатный API предоставляет 5-дневный прогноз с 3-часовыми интервалами)
    // Для 10-дневного прогноза потребуется их платный API или другой сервис
    
    const dailyForecasts = {};
    
    // Группировка по дням
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = getFormattedDay(date);
        
        if (!dailyForecasts[day] || new Date(dailyForecasts[day].dt * 1000).getHours() !== 12) {
            // Предпочтение прогнозам в полдень для репрезентативной дневной температуры
            if (date.getHours() >= 11 && date.getHours() <= 14) {
                dailyForecasts[day] = item;
            } else if (!dailyForecasts[day]) {
                dailyForecasts[day] = item;
            }
        }
    });
    
    // Отображение ежедневных прогнозов
    Object.keys(dailyForecasts).forEach(day => {
        const forecast = dailyForecasts[day];
        const date = new Date(forecast.dt * 1000);
        const dayName = getFormattedDay(date);
        const dayDate = getRussianDate(date);
        
        // Единицы измерения в зависимости от настроек
        const tempUnit = currentUnits === 'metric' ? '°C' : '°F';
        const windUnit = currentUnits === 'metric' ? 'м/с' : 'миль/ч';
        
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        forecastItem.innerHTML = `
            <div class="date">
                <div>${dayName}</div>
                <div>${dayDate}</div>
            </div>
            <img src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}@2x.png" alt="${translateWeather(forecast.weather[0].description)}">
            <div class="temp">${Math.round(forecast.main.temp)}${tempUnit}</div>
            <div class="description">${translateWeather(forecast.weather[0].description)}</div>
            <div class="forecast-details">
                <div><i class="fas fa-wind"></i> ${forecast.wind.speed.toFixed(1)} ${windUnit}</div>
                <div><i class="fas fa-tint"></i> ${forecast.main.humidity}%</div>
            </div>
        `;
        
        forecastContainer.appendChild(forecastItem);
    });
    
    // Для демонстрационных целей добавим еще прогнозных элементов, чтобы достичь 10 дней
    // В реальном приложении вам потребуется платный API, который предоставляет 10-дневные прогнозы
    const lastForecast = data.list[data.list.length - 1];
    const lastDate = new Date(lastForecast.dt * 1000);
    
    for (let i = Object.keys(dailyForecasts).length; i < 10; i++) {
        const nextDate = new Date(lastDate);
        nextDate.setDate(lastDate.getDate() + (i - Object.keys(dailyForecasts).length + 1));
        
        const dayName = getFormattedDay(nextDate);
        const dayDate = getRussianDate(nextDate);
        
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        forecastItem.innerHTML = `
            <div class="date">
                <div>${dayName}</div>
                <div>${dayDate}</div>
            </div>
            <img src="https://openweathermap.org/img/wn/03d@2x.png" alt="Прогноз">
            <div class="temp">--${currentUnits === 'metric' ? '°C' : '°F'}</div>
            <div class="description">Нет данных</div>
            <div class="note">Расширенный прогноз требует подписки</div>
        `;
        
        forecastContainer.appendChild(forecastItem);
    }
}

// Обновление даты и времени
function updateDateTime() {
    const now = new Date();
    
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    // Форматирование даты на русском языке
    let dateStr = now.toLocaleDateString('ru-RU', options);
    // Первая буква заглавная
    dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    
    dateTimeElement.textContent = dateStr;
}

// Показать состояние загрузки
function showLoadingState() {
    temperatureElement.textContent = 'Загрузка...';
    feelsLikeElement.textContent = 'Ощущается как: --';
    weatherDescriptionElement.textContent = 'Загрузка...';
    weatherIconElement.src = '';
    windElement.textContent = '-- м/с';
    humidityElement.textContent = '--%';
    pressureElement.textContent = '-- мм рт.ст.';
    
    // Расширенная информация
    sunriseElement.textContent = '--:--';
    sunsetElement.textContent = '--:--';
    visibilityElement.textContent = '-- км';
    cloudsElement.textContent = '--%';
    windDirectionElement.textContent = '--';
    windGustElement.textContent = '-- м/с';
}

// Показать состояние ошибки
function showErrorState(message) {
    locationElement.textContent = 'Ошибка';
    temperatureElement.textContent = '--';
    feelsLikeElement.textContent = 'Ощущается как: --';
    weatherDescriptionElement.textContent = message || 'Что-то пошло не так';
    weatherIconElement.src = '';
    windElement.textContent = '-- м/с';
    humidityElement.textContent = '--%';
    pressureElement.textContent = '-- мм рт.ст.';
    
    // Расширенная информация
    sunriseElement.textContent = '--:--';
    sunsetElement.textContent = '--:--';
    visibilityElement.textContent = '-- км';
    cloudsElement.textContent = '--%';
    windDirectionElement.textContent = '--';
    windGustElement.textContent = '-- м/с';
    
    // Скрыть информацию о море
    seaInfoSection.classList.add('hidden');
}

// Получить день недели на русском
function getRussianDayOfWeek(date) {
    const englishDay = date.toLocaleDateString('en-US', { weekday: 'short' });
    return DAYS_OF_WEEK[englishDay] || englishDay;
}

// Получить дату на русском
function getRussianDate(date) {
    const englishMonth = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${day} ${MONTHS[englishMonth] || englishMonth}`;
}

// Форматирование дня для группировки прогноза
function getFormattedDay(date) {
    return date.toLocaleDateString('ru-RU');
}

// Перевод описания погоды
function translateWeather(description) {
    return WEATHER_TRANSLATIONS[description.toLowerCase()] || description;
}

// Экспорт функций для использования в auth.js
window.getCurrentWeather = getCurrentWeather;
window.getForecast = getForecast;
window.searchInput = searchInput;
window.setUnits = setUnits; 