const getTimeOfTypingSession = ({ startTime, endTime }) => {
  const time = Number(
    `${endTime.getMinutes() - startTime.getMinutes()}.${
      endTime.getSeconds() - startTime.getSeconds()
    }`
  );
  return time;
};

const getWPM = ({ typedChars, startTime, endTime }) => {
  const time = getTimeOfTypingSession({ startTime, endTime });
  return typedChars / 5 / time;
};

export { getWPM };
