'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
};

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.clacPace();
    this._setDescription();
  }

  clacPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
};

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.clacSpeed();
    this._setDescription();
  }

  clacSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
};


//                                     ------ APPLICATION ELEMENTS ------


const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');


//                                   ------ APPLICATION ARCHITECTURE ------
class App {

  #map;
  #mapZoomLevel = 13;
  #eventMap;
  #workouts = [];

  constructor() {
    this._getPosition();
    this._getLocalStorage();

    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
      alert('Could not get your position');
    });
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    })
  }

  _showForm(event) {
    this.#eventMap = event;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = function (inputType, ...inputs) {
      if (inputs.length !== 3) {
        return false;
      } else {
        return inputs.every(function (inp, index) {
          if (index === 2 && inputType === 'cycling') {
            return true;
          }
          return Number.isFinite(inp) && inp > 0;
        });
      }

    };

    e.preventDefault();

    // get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const inputs = [distance, duration];
    const { lat, lng } = this.#eventMap.latlng;
    let workout;

    // if workout running, create Running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      inputs.push(cadence);

      if (!validInputs(type, ...inputs)) {
        if (inputs.some((inp) => inp === 0)) {
          return alert('Please enter values for all three fields!');
        } else {
          return alert('Inputs have to be positive numbers!');
        }
      }

      // create an Running object
      workout = new Running([lat, lng], distance, duration, cadence);
    };

    // if workout cycling, create Cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      inputs.push(elevation);

      // Check if data is valid
      if (!validInputs(type, ...inputs)) {
        if (inputs.some((inp) => inp === 0)) {
          return alert('Please enter values for all three fields!');
        } else {
          return alert('Inputs have to be positive numbers!');
        }
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
    };

    // Add new object to workout array[]
    this.#workouts.push(workout);

    // Render workout on a map as a marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form once the new workout is added+ clear input fields
    this._hideForm();

    // Set local storage to all the workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,  // This will dynamically generate the color
        })
      )
      .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
      .openPopup();
  }


  _renderWorkout(workout) {
    let html =
      `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div >
        <div class="workout__details">
          <span class="workout__icon">⏳</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
      `;

    if (workout.type === 'running')
      html +=
        `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
        `;

    if (workout.type === 'cycling')
      html +=
        `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevation}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
        `;

    // insert the workout after the form
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutElement = e.target.closest('.workout');
    if (!workoutElement) return;
    const workout = this.#workouts.find(work => work.id === workoutElement.dataset.id);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    //If there is no data the just return
    if (!data) return;
    this.#workouts = data;

    // store the workouts on the list
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    })
  }

  // public interface
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
};

const app = new App();