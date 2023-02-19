const createNewUserInMap = ({ roomId, username, roomData }) => {
  const newRoomData = {
    name: roomId,
    players: [
      ...roomData,
      { name: username, ready: false, text: "", done: false },
    ],
  };

  return newRoomData;
};

const removeUserInMap = ({ username, roomData }) => {
  if (!roomData) return;
  const newRoom = roomData.filter((player) => player.name !== username);

  return newRoom;
};

export { createNewUserInMap, removeUserInMap };
