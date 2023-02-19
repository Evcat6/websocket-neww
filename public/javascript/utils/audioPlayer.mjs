// '../audio/game_ended.wav'

const audioPlayer = ({ audioPath, volume }) => {
  const audio = new Audio(audioPath);
  audio.volume = volume;
  audio.play();
};

export { audioPlayer };
