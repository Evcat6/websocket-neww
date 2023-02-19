const API_URL = "http://localhost:3002";

const getRandomText = async (randomText) => {
  const res = await fetch(`${API_URL}/game/texts/${randomText}`);
  const json = await res.json();
  return json;
};

export { getRandomText };
