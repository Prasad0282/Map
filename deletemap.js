"use strict";

// prettier-ignore

class Workout {
  date = new Date();
  id = Date.now() + "".slice(-10);
  clicks=0;
  constructor(coords, distance, duration) {
    //this.date=...
    //this.id=...
    this.coords = coords; //[lat,lng]
    this.distance = distance; //km
    this.duration = duration; //min
    
  }
  _setDescription(){
    //prettier-Ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description=`${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
  click(){
    this.clicks++;
  }
}
class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    //min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    //this.type = 'cycling';
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    //km/hr
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}
// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 295, 525);
// console.log(run1, cycling1);
//////////////////////////////////
//Application Architecture
const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #mapLayer = L.featureGroup().addTo(this.#map);
  constructor() {
    this._getPosition();
    this._getLocaleStorage();

    form.addEventListener("submit", (e) => this._newWorkout(e)); // Arrow function to preserve 'this'
    inputType.addEventListener("change", (e) => this._toggleElevationField(e)); // Arrow function to preserve 'this'
    containerWorkouts.addEventListener("click", (e) => this._moveToPopup(e)); // Arrow function to preserve 'this'
    containerWorkouts.addEventListener("click", (e) => this._editWorkout(e));
    containerWorkouts.addEventListener("click", (e) => this._deleteWorkout(e)); // Arrow function to preserve 'this'
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("Could not get your location");
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);
    this.#mapLayer = L.featureGroup().addTo(this.#map);

    L.tileLayer("https://{s}.tile.openstreetmap.fr/hot//{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    //handling click on map
    this.#map.on("click", this._showForm.bind(this));
    this.#workouts.forEach((work) => {
      this._renderWorkoutMarker(work);
    });
    const drawControl = new L.Control.Draw({
      draw: {
        polyline: true, // Enable polyline drawing
        polygon: true, // Enable polygon drawing
        circle: false, // Disable circle drawing
        rectangle: true, // Enable rectangle drawing
        marker: false, // Disable marker drawing
      },
      edit: {
        featureGroup: this.#mapLayer, // Pass the feature group to edit
      },
    });

    this.#map.addControl(drawControl);

    // Listen for draw events
    this.#map.on(L.Draw.Event.CREATED, (event) => {
      const { layer, type } = event;
      const coords =
        layerType === "rectangle" ? layer.getLatLngs()[0] : layer.getLatLngs();
      // You can create a new workout or handle the drawing data as needed
      this.#mapLayer.addLayer(layer);
      console.log("Drawn shape coordinates:", coords);
    });
    this.#map.on("click", this._showForm.bind(this));

    // Render existing workouts on the map
    this.#workouts.forEach((work) => {
      this._renderWorkoutMarker(work);
    });
  }

  _newWorkout(e) {
    e.preventDefault();

    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    if (!validInputs(distance, duration) || !allPositive(distance, duration)) {
      return alert("Distance and duration must be positive numbers.");
    }

    // Check if we're editing an existing workout
    const isEditing = form.dataset.editing;
    let workout;

    if (isEditing) {
      // Find the workout being edited
      workout = this.#workouts.find((work) => work.id === isEditing);
      workout.distance = distance;
      workout.duration = duration;

      if (type === "running") {
        const cadence = +inputCadence.value;
        if (!Number.isFinite(cadence) || cadence <= 0) {
          return alert("Cadence must be a positive number.");
        }

        workout.cadence = cadence;
        workout.calcPace();
      }

      if (type === "cycling") {
        const elevation = +inputElevation.value;
        if (!Number.isFinite(elevation) || elevation <= 0) {
          return alert("Elevation must be a positive number.");
        }

        workout.elevationGain = elevation;
        workout.calcSpeed();
      }

      workout._setDescription(); // Call _setDescription() here
      // Update the workout in the list and map
      document.querySelector(`.workout[data-id="${workout.id}"]`).remove();
    } else {
      const { lat, lng } = this.#mapEvent.latlng;

      if (type === "running") {
        const cadence = +inputCadence.value;
        if (!Number.isFinite(cadence) || cadence <= 0) {
          return alert("Cadence must be a positive number.");
        }

        workout = new Running([lat, lng], distance, duration, cadence);
      }

      if (type === "cycling") {
        const elevation = +inputElevation.value;
        if (!Number.isFinite(elevation) || elevation <= 0) {
          return alert("Elevation must be a positive number.");
        }

        workout = new Cycling([lat, lng], distance, duration, elevation);
      }

      this.#workouts.push(workout);
      this._renderWorkoutMarker(workout);
    }

    // Render workout
    this._renderWorkout(workout);
    this._hideform();
    this._setLocalStorage();

    // Clear the editing state
    delete form.dataset.editing;
  }
  _editWorkout(e) {
    const workoutEl = e.target.closest(".workout");

    if (!workoutEl) return;

    if (e.target.classList.contains("edit-btn")) {
      const workout = this.#workouts.find(
        (work) => work.id === workoutEl.dataset.id
      );

      // Populate form with workout data
      inputType.value = workout.type;
      inputDistance.value = workout.distance;
      inputDuration.value = workout.duration;

      // Toggle visibility of cadence and elevation fields based on workout type
      if (workout.type === "running") {
        inputCadence.value = workout.cadence;
        inputElevation.closest(".form__row").classList.add("form__row--hidden");
        inputCadence
          .closest(".form__row")
          .classList.remove("form__row--hidden");
      } else if (workout.type === "cycling") {
        inputElevation.value = workout.elevationGain;
        inputCadence.closest(".form__row").classList.add("form__row--hidden");
        inputElevation
          .closest(".form__row")
          .classList.remove("form__row--hidden");
      }

      // Show the form
      form.classList.remove("hidden");
      inputDistance.focus();

      // Store the current workout id
      form.dataset.editing = workout.id;
    }
  }

  _deleteWorkout(e) {
    const workoutEl = e.target.closest(".workout");
    if (!workoutEl) return;

    const workoutId = workoutEl.dataset.id;

    if (e.target.classList.contains("delete-btn")) {
      const confirmed = confirm(
        "Are you sure you want to delete this workout?"
      );
      if (!confirmed) return; // If user cancels, do nothing

      // Find the index of the workout in the workouts array
      const workoutIndex = this.#workouts.findIndex(
        (work) => work.id === workoutId
      );
      if (workoutIndex === -1) return;

      // Remove the workout from the workouts array
      this.#workouts.splice(workoutIndex, 1);

      // Remove the workout from the UI
      workoutEl.remove();

      // Update local storage
      this._setLocalStorage();
    }
  }
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputDistance.focus();
  }
  _hideform() {
    //empty inputs
    //prettier-ignore
    inputDuration.value = inputCadence.value =inputDistance.value =inputElevation.value = " ";
    form.style.display = "none";
    form.classList.remove("hidden");
    setTimeout(() => (form.style.display = "grid"), 3000);
  }
  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
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
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>`;

    if (workout.type === "running")
      html += `<div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>`;

    if (workout.type === "cycling")
      html += `<div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>`;

    html += `<div class="workout__buttons">
      <button class="edit-btn">Edit</button>
      <button class="delete-btn">Delete</button>
    </div>`;

    form.insertAdjacentHTML("afterend", html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest(".workout");
    //console.log(workoutEl);
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    //public UI
    //workout.click();
  }
  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  _getLocaleStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));
    console.log(data);
    if (!data) return;
    this.#workouts = data.map((workoutData) => {
      if (workoutData.type === "running") {
        return new Running(
          workoutData.coords,
          workoutData.distance,
          workoutData.duration,
          workoutData.cadence
        );
      } else if (workoutData.type === "cycling") {
        return new Cycling(
          workoutData.coords,
          workoutData.distance,
          workoutData.duration,
          workoutData.elevationGain
        );
      }
    });
    this.#workouts.forEach((work) => {
      this._renderWorkout(work);
    });
  }
  reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }
}

const app = new App();
