/**
 * WeatherNow — script.js
 * ─────────────────────────────────────────────────────────────────────────────
 *  ✅  NO API KEY REQUIRED
 *  Uses Open-Meteo  →  https://open-meteo.com   (free, open-source)
 *  Uses Nominatim   →  https://nominatim.org     (free reverse geocoding)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ════════════════════════════════════════════════════════════
//  ⚙️  CONFIG
// ════════════════════════════════════════════════════════════
const GEO_API     = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';
const NOMINATIM   = 'https://nominatim.openstreetmap.org/reverse';
const DEFAULT_CITY = 'London';

// ════════════════════════════════════════════════════════════
//  🌦️  WMO Weather Interpretation Code → { desc, emoji, bodyClass }
//  Reference: https://open-meteo.com/en/docs#weathervariables
// ════════════════════════════════════════════════════════════
const WMO_MAP = {
  0:  { desc: 'Clear Sky',                  emoji: '☀️',  cls: 'weather-clear'        },
  1:  { desc: 'Mainly Clear',               emoji: '🌤️', cls: 'weather-clear'        },
  2:  { desc: 'Partly Cloudy',              emoji: '⛅',  cls: 'weather-clouds'       },
  3:  { desc: 'Overcast',                   emoji: '☁️',  cls: 'weather-clouds'       },
  45: { desc: 'Foggy',                      emoji: '🌫️', cls: 'weather-mist'         },
  48: { desc: 'Depositing Rime Fog',        emoji: '🌫️', cls: 'weather-mist'         },
  51: { desc: 'Light Drizzle',              emoji: '🌦️', cls: 'weather-drizzle'      },
  53: { desc: 'Moderate Drizzle',           emoji: '🌦️', cls: 'weather-drizzle'      },
  55: { desc: 'Dense Drizzle',              emoji: '🌧️', cls: 'weather-drizzle'      },
  61: { desc: 'Slight Rain',                emoji: '🌧️', cls: 'weather-rain'         },
  63: { desc: 'Moderate Rain',              emoji: '🌧️', cls: 'weather-rain'         },
  65: { desc: 'Heavy Rain',                 emoji: '🌧️', cls: 'weather-rain'         },
  71: { desc: 'Slight Snowfall',            emoji: '🌨️', cls: 'weather-snow'         },
  73: { desc: 'Moderate Snowfall',          emoji: '❄️',  cls: 'weather-snow'         },
  75: { desc: 'Heavy Snowfall',             emoji: '❄️',  cls: 'weather-snow'         },
  77: { desc: 'Snow Grains',               emoji: '🌨️', cls: 'weather-snow'         },
  80: { desc: 'Slight Rain Showers',        emoji: '🌦️', cls: 'weather-rain'         },
  81: { desc: 'Moderate Rain Showers',      emoji: '🌧️', cls: 'weather-rain'         },
  82: { desc: 'Violent Rain Showers',       emoji: '⛈️', cls: 'weather-rain'         },
  85: { desc: 'Slight Snow Showers',        emoji: '🌨️', cls: 'weather-snow'         },
  86: { desc: 'Heavy Snow Showers',         emoji: '❄️',  cls: 'weather-snow'         },
  95: { desc: 'Thunderstorm',               emoji: '⛈️', cls: 'weather-thunderstorm' },
  96: { desc: 'Thunderstorm with Hail',     emoji: '⛈️', cls: 'weather-thunderstorm' },
  99: { desc: 'Thunderstorm, Heavy Hail',   emoji: '⛈️', cls: 'weather-thunderstorm' },
};

/** Returns WMO entry or a safe fallback. */
function getWMO(code) {
  return WMO_MAP[code] ?? { desc: 'Unknown', emoji: '🌡️', cls: 'weather-default' };
}

// ════════════════════════════════════════════════════════════
//  DOM References
// ════════════════════════════════════════════════════════════
const cityInput       = document.getElementById('city-input');
const btnSearch       = document.getElementById('btn-search');
const btnClear        = document.getElementById('btn-clear');
const btnGeolocation  = document.getElementById('btn-geolocation');
const errorBanner     = document.getElementById('error-banner');
const errorMessage    = document.getElementById('error-message');
const loadingSpinner  = document.getElementById('loading-spinner');
const weatherCard     = document.getElementById('weather-card');
const forecastSection = document.getElementById('forecast-section');

// Card fields
const cityNameEl      = document.getElementById('city-name');
const countryCodeEl   = document.getElementById('country-code');
const currentDateEl   = document.getElementById('current-date');
const temperatureEl   = document.getElementById('temperature');
const weatherIconEl   = document.getElementById('weather-icon');
const weatherDescEl   = document.getElementById('weather-description');
const feelsLikeEl     = document.getElementById('feels-like');
const humidityEl      = document.getElementById('humidity');
const windSpeedEl     = document.getElementById('wind-speed');
const visibilityEl    = document.getElementById('visibility');
const pressureEl      = document.getElementById('pressure');
const sunriseEl       = document.getElementById('sunrise');
const sunsetEl        = document.getElementById('sunset');
const forecastGrid    = document.getElementById('forecast-grid');

// ════════════════════════════════════════════════════════════
//  Utility Helpers
// ════════════════════════════════════════════════════════════

/** Returns a long formatted date string, e.g. "Tuesday, 22 Apr 2025" */
function getFormattedDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
  });
}

/**
 * Formats an ISO datetime string (e.g. "2025-04-22T06:15") → "6:15 AM"
 * @param {string} iso
 */
function formatTimeFromISO(iso) {
  const timePart = iso.split('T')[1] ?? '00:00';
  let [h, m]     = timePart.split(':').map(Number);
  const ampm     = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * Returns short weekday name from date string, e.g. "Mon"
 * @param {string} dateStr  e.g. "2025-04-22"
 */
function getDayName(dateStr) {
  // Append T12:00 to avoid timezone-off-by-one issues
  return new Date(`${dateStr}T12:00`).toLocaleDateString('en-US', { weekday: 'short' });
}

// ════════════════════════════════════════════════════════════
//  UI State Helpers
// ════════════════════════════════════════════════════════════

function showLoading() {
  errorBanner.hidden     = true;
  weatherCard.hidden     = true;
  forecastSection.hidden = true;
  loadingSpinner.hidden  = false;
}

function hideLoading() {
  loadingSpinner.hidden = true;
}

function showError(msg) {
  hideLoading();
  errorMessage.textContent = msg;
  errorBanner.hidden       = false;
  weatherCard.hidden       = true;
  forecastSection.hidden   = true;
}

function showResults() {
  weatherCard.hidden     = false;
  forecastSection.hidden = false;
}

// ════════════════════════════════════════════════════════════
//  API Calls
// ════════════════════════════════════════════════════════════

/**
 * Converts a city name → { name, country_code, latitude, longitude }
 * Uses Open-Meteo Geocoding API (no key required).
 * @param {string} city
 */
async function geocodeCity(city) {
  const url = `${GEO_API}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);
  const data = await res.json();
  if (!data.results?.length) throw new Error('CITY_NOT_FOUND');
  const r = data.results[0];
  return {
    name:         r.name,
    country:      r.country      ?? '',
    country_code: r.country_code?.toUpperCase() ?? '',
    latitude:     r.latitude,
    longitude:    r.longitude,
  };
}

/**
 * Fetches current weather + 5-day daily forecast from Open-Meteo.
 * @param {number} lat
 * @param {number} lon
 */
async function fetchWeatherData(lat, lon) {
  const params = new URLSearchParams({
    latitude:        lat,
    longitude:       lon,
    current:         [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'weather_code',
      'wind_speed_10m',
      'surface_pressure',
      'visibility',
    ].join(','),
    daily:           [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'sunrise',
      'sunset',
    ].join(','),
    wind_speed_unit: 'kmh',
    timezone:        'auto',
    forecast_days:   '5',
  });
  const res = await fetch(`${WEATHER_API}?${params}`);
  if (!res.ok) throw new Error(`Weather API HTTP ${res.status}`);
  return res.json();
}

/**
 * Reverse geocodes lat/lon → { name, country_code } using Nominatim.
 * Falls back silently on failure.
 * @param {number} lat
 * @param {number} lon
 */
async function reverseGeocode(lat, lon) {
  try {
    const res  = await fetch(
      `${NOMINATIM}?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (!res.ok) return null;
    const d = await res.json();
    return {
      name:         d.address.city
                 ?? d.address.town
                 ?? d.address.village
                 ?? d.address.county
                 ?? 'Your Location',
      country_code: d.address.country_code?.toUpperCase() ?? '',
    };
  } catch {
    return null;
  }
}

// ════════════════════════════════════════════════════════════
//  Render Functions
// ════════════════════════════════════════════════════════════

/**
 * Fills the main weather card.
 * @param {{ name:string, country_code:string }} geoData
 * @param {Object} weatherData  — Open-Meteo response
 */
function renderCurrentWeather(geoData, weatherData) {
  const c   = weatherData.current;
  const d   = weatherData.daily;
  const wmo = getWMO(c.weather_code);

  // Dynamic background theme
  document.body.className = wmo.cls;

  // Location & Date
  cityNameEl.textContent    = geoData.name;
  countryCodeEl.textContent = geoData.country_code
    ? `📍 ${geoData.country_code}`
    : '📍 —';
  currentDateEl.textContent = getFormattedDate();

  // Temperature
  temperatureEl.textContent = Math.round(c.temperature_2m);
  feelsLikeEl.textContent   = `Feels like ${Math.round(c.apparent_temperature)}°C`;

  // Condition & Icon (emoji)
  weatherDescEl.textContent  = wmo.desc;
  weatherIconEl.textContent  = wmo.emoji;

  // Stats
  humidityEl.textContent   = `${c.relative_humidity_2m}%`;
  windSpeedEl.textContent  = `${Math.round(c.wind_speed_10m)} km/h`;
  visibilityEl.textContent = c.visibility != null
    ? `${(c.visibility / 1000).toFixed(1)} km`
    : 'N/A';
  pressureEl.textContent   = `${Math.round(c.surface_pressure)} hPa`;

  // Sunrise / Sunset (from daily[0])
  sunriseEl.textContent = formatTimeFromISO(d.sunrise[0]);
  sunsetEl.textContent  = formatTimeFromISO(d.sunset[0]);

  showResults();
}

/**
 * Builds the 5-day forecast grid.
 * @param {Object} weatherData  — Open-Meteo response
 */
function renderForecast(weatherData) {
  const { time, weather_code, temperature_2m_max, temperature_2m_min } = weatherData.daily;

  forecastGrid.innerHTML = time.map((dateStr, i) => {
    const wmo  = getWMO(weather_code[i]);
    const high = Math.round(temperature_2m_max[i]);
    const low  = Math.round(temperature_2m_min[i]);

    return `
      <div class="forecast-card">
        <p class="forecast-day">${getDayName(dateStr)}</p>
        <span class="forecast-icon">${wmo.emoji}</span>
        <p class="forecast-temp-high">${high}°</p>
        <p class="forecast-temp-low">${low}°</p>
        <p class="forecast-desc">${wmo.desc}</p>
      </div>`;
  }).join('');
}

// ════════════════════════════════════════════════════════════
//  Main Orchestrators
// ════════════════════════════════════════════════════════════

/**
 * Full pipeline: city name → geocode → fetch weather → render.
 * @param {string} city
 */
async function loadWeatherByCity(city) {
  if (!city.trim()) {
    showError('Please enter a city name.');
    return;
  }

  showLoading();

  try {
    const geoData     = await geocodeCity(city);
    const weatherData = await fetchWeatherData(geoData.latitude, geoData.longitude);

    hideLoading();
    renderCurrentWeather(geoData, weatherData);
    renderForecast(weatherData);
  } catch (err) {
    console.error('loadWeatherByCity error:', err);
    if (err.message === 'CITY_NOT_FOUND') {
      showError('City not found. Please check the spelling and try again.');
    } else {
      showError('Unable to fetch weather data. Please check your connection and try again.');
    }
  }
}

/**
 * Full pipeline: lat/lon → reverse geocode → fetch weather → render.
 * Used by the "Use My Location" button.
 * @param {number} lat
 * @param {number} lon
 */
async function loadWeatherByCoords(lat, lon) {
  showLoading();

  try {
    // Fire weather + reverse geocoding in parallel for speed
    const [weatherData, revGeo] = await Promise.all([
      fetchWeatherData(lat, lon),
      reverseGeocode(lat, lon),
    ]);

    // Build location label from reverse geocode (or timezone fallback)
    const tzCity     = (weatherData.timezone ?? '').split('/').pop().replace(/_/g, ' ');
    const geoData    = {
      name:         revGeo?.name         ?? tzCity ?? 'Your Location',
      country_code: revGeo?.country_code ?? '',
    };

    hideLoading();
    renderCurrentWeather(geoData, weatherData);
    renderForecast(weatherData);

    // Populate search box with detected city
    cityInput.value = geoData.name;
    btnClear.hidden = false;
  } catch (err) {
    console.error('loadWeatherByCoords error:', err);
    showError('Could not retrieve weather for your location. Try searching manually.');
  }
}

// ════════════════════════════════════════════════════════════
//  Event Listeners
// ════════════════════════════════════════════════════════════

btnSearch.addEventListener('click', () => {
  loadWeatherByCity(cityInput.value.trim());
});

cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loadWeatherByCity(cityInput.value.trim());
});

cityInput.addEventListener('input', () => {
  btnClear.hidden = cityInput.value.length === 0;
  if (cityInput.value.length > 0) errorBanner.hidden = true;
});

btnClear.addEventListener('click', () => {
  cityInput.value    = '';
  btnClear.hidden    = true;
  errorBanner.hidden = true;
  cityInput.focus();
});

btnGeolocation.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser.');
    return;
  }

  btnGeolocation.disabled      = true;
  btnGeolocation.style.opacity = '0.6';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      btnGeolocation.disabled      = false;
      btnGeolocation.style.opacity = '1';
      loadWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
    },
    () => {
      btnGeolocation.disabled      = false;
      btnGeolocation.style.opacity = '1';
      showError('Location access was denied. Please search for a city manually.');
    },
    { timeout: 10_000 }
  );
});

// ════════════════════════════════════════════════════════════
//  Initialise — show default city on page load
// ════════════════════════════════════════════════════════════
(function init() {
  loadWeatherByCity(DEFAULT_CITY);
}());
