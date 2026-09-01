const API_URL = import.meta.env.VITE_API_URL;

// =====================================================
// LOCATIONS
// =====================================================

export async function getLocations() {
  const response = await fetch(`${API_URL}/locations`);

  if (!response.ok) {
    throw new Error("Failed to fetch locations");
  }

  return response.json();
}

export async function getLocation(locationId) {
  const response = await fetch(
    `${API_URL}/locations/${locationId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch location");
  }

  return response.json();
}

// =====================================================
// SHELTERS
// =====================================================

export async function getShelters() {
  const response = await fetch(`${API_URL}/shelters`);

  if (!response.ok) {
    throw new Error("Failed to fetch shelters");
  }

  return response.json();
}

export async function getNearestShelter(latitude, longitude) {
  const response = await fetch(
    `${API_URL}/shelters/nearest?latitude=${latitude}&longitude=${longitude}`
  );

  if (!response.ok) {
    throw new Error("Failed to find nearest shelter");
  }

  return response.json();
}

// =====================================================
// RISK
// =====================================================

export async function getRisk(locationId) {
  const response = await fetch(
    `${API_URL}/risk/${locationId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch risk");
  }

  return response.json();
}

// =====================================================
// PREDICTION
// =====================================================

export async function predictRisk(input) {
  const response = await fetch(`${API_URL}/predict`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Prediction failed: ${response.status} ${errorText}`
    );
  }

  return response.json();
}

// =====================================================
// SENSORS
// =====================================================

export async function getSensors() {
  const response = await fetch(`${API_URL}/sensors`);

  if (!response.ok) {
    throw new Error("Failed to fetch sensors");
  }

  return response.json();
}

export async function getSensor(sensorId) {
  const response = await fetch(
    `${API_URL}/sensors/${sensorId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch sensor");
  }

  return response.json();
}

export async function getSensorReadings(sensorId) {
  const response = await fetch(
    `${API_URL}/sensors/${sensorId}/readings`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch sensor readings");
  }

  return response.json();
}

export async function sendSensorData(data) {
  const response = await fetch(
    `${API_URL}/sensors/data`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Failed to send sensor data: ${response.status} ${errorText}`
    );
  }

  return response.json();
}

// =====================================================
// SIMULATION
// =====================================================

export async function startSimulation(locationId) {
  const response = await fetch(
    `${API_URL}/simulation/start`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        location_id: locationId,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Failed to start simulation: ${response.status} ${errorText}`
    );
  }

  return response.json();
}

export async function simulationStep({
  locationId,
  rainfall,
  soilMoisture,
  slopeMovement,
}) {
  const response = await fetch(
    `${API_URL}/simulation/step`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        location_id: locationId,
        rainfall,
        soil_moisture: soilMoisture,
        slope_movement: slopeMovement,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Failed to run simulation step: ${response.status} ${errorText}`
    );
  }

  return response.json();
}

// =====================================================
// ALERTS
// =====================================================

export async function getAlerts() {
  const response = await fetch(`${API_URL}/alerts`);

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Failed to fetch alerts: ${response.status} ${errorText}`
    );
  }

  return response.json();
}

export async function getLocationAlerts(locationId) {
  const response = await fetch(
    `${API_URL}/alerts/${locationId}`
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Failed to fetch location alerts: ${response.status} ${errorText}`
    );
  }

  return response.json();
}