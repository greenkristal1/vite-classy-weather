import { useState, useEffect } from "react";

function getWeatherIcon(wmoCode) {
  const icons = new Map([
    [[0], "☀️"],
    [[1], "🌤"],
    [[2], "⛅️"],
    [[3], "☁️"],
    [[45, 48], "🌫"],
    [[51, 56, 61, 66, 80], "🌦"],
    [[53, 55, 63, 65, 57, 67, 81, 82], "🌧"],
    [[71, 73, 75, 77, 85, 86], "🌨"],
    [[95], "🌩"],
    [[96, 99], "⛈"],
  ]);
  const arr = [...icons.keys()].find((key) => key.includes(wmoCode));
  if (!arr) return "NOT FOUND";
  return icons.get(arr);
}

function convertToFlag(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

function formatDay(dateStr) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
  }).format(new Date(dateStr));
}

function App() {
  const [location, setLocation] = useState("Moscow");
  const [isLoading, setIsLoading] = useState(false);
  const [displayLocation, setDisplayLocation] = useState("");
  const [weather, setWeather] = useState({});
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(
    function () {
      let controller = new AbortController();
      async function fetchWeather() {
        if (location.length < 2) return setWeather({});
        try {
          console.log("Effect running");
          setIsLoading(true);
          setIsNotFound(false);
          // 1) Getting location (geocoding)
          const geoRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${location}`,
            {
              signal: controller.signal,
            }
          );
          const geoData = await geoRes.json();

          if (!geoData.results) throw new Error("Location not found");

          const { latitude, longitude, timezone, name, country_code } =
            geoData.results.at(0);
          setDisplayLocation(`${name} ${convertToFlag(country_code)}`);

          // 2) Getting actual weather
          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=${timezone}&daily=weathercode,temperature_2m_max,temperature_2m_min`
          );
          const weatherData = await weatherRes.json();
          setWeather(weatherData.daily);
        } catch (err) {
          console.error(err);
          if (err.message === "Location not found") setIsNotFound(true);
        } finally {
          setIsLoading(false);
        }
      }
      fetchWeather();
      return () => {
        controller.abort();
      };
    },
    [location]
  );
  function handleLocation(e) {
    setLocation(e.target.value);
  }

  return (
    <div className="app">
      <h1>Classy weather</h1>
      <Input location={location} onChangeLocation={handleLocation} />
      {isLoading && <p className="loader">Loading...</p>}
      {weather.weathercode && !isNotFound && (
        <Weather weather={weather} location={displayLocation} />
      )}
      {isNotFound && <p>Nothing found</p>}
    </div>
  );
}
export default App;

function Input({ location, onChangeLocation }) {
  return (
    <div>
      <input
        type="text"
        placeholder="Search from placeholder..."
        value={location}
        onChange={onChangeLocation}
      />
    </div>
  );
}

function Weather({ weather, location }) {
  const {
    temperature_2m_max: max,
    temperature_2m_min: min,
    time: dates,
    weathercode: codes,
  } = weather;
  return (
    <div>
      <h2>Weather {location}</h2>
      <ul className="weather">
        {dates.map((date, i) => (
          <Day
            date={date}
            max={max.at(i)}
            min={min.at(i)}
            code={codes.at(i)}
            isToday={i === 0}
            key={i}
          />
        ))}
      </ul>
    </div>
  );
}

function Day({ date, max, min, code, isToday }) {
  return (
    <div>
      <li>
        <span>{getWeatherIcon(code)}</span>
        <p>{isToday ? "Today" : formatDay(date)}</p>
        <p>
          {Math.floor(min)}&deg; &mdash; <strong>{Math.ceil(max)}&deg;</strong>
        </p>
      </li>
    </div>
  );
}
