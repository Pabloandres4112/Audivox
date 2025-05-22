export const fetchJamendoTracks = async () => {
  const response = await fetch(
    `https://api.jamendo.com/v3.0/tracks/?client_id=TU_API_KEY&format=json&limit=5&fuzzytags=chill&audioformat=mp32`
  );
  const data = await response.json();
  return data.results; // lista de pistas
};
