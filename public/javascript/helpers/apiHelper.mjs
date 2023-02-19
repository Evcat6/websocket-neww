
const getRandomText = async (randomText) => {
  const res = await fetch(`/game/texts/${randomText}`);
  const json = await res.json();
  return json;
};

export { getRandomText };
