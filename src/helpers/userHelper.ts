const clearUsersTextField = ({ roomData }): void => {
  for (const player of roomData) {
    player.text = "";
  }
};

const setUsersUnredy = ({ roomData }): void => {
  for (const player of roomData) {
    player.ready = false;
  }
};

const setUserDone = ({ roomData, username }): void => {
  for (const player of roomData) {
    if (player.name === username) {
      player.done = true;
    }
  }
};

const toggleUserReady = ({ roomData, username }): boolean => {
  let userReady = false;

  for (const player of roomData) {
    if (player.name === username) {
      userReady = !player.ready;
      player.ready = !player.ready;
    }
  }

  return userReady;
};

const updateTextFieldState = ({ roomData, char, username }) => {
  if (!roomData) return;
  for (const player of roomData) {
    if (player.name === username) {
      player.text = player.text + char;
    }
  }
};

export {
  clearUsersTextField,
  setUsersUnredy,
  setUserDone,
  toggleUserReady,
  updateTextFieldState,
};
