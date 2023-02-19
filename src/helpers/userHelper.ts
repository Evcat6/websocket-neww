const clearUsersTextField = ({ roomData }): void => {
  for (const player of roomData) {
    player.text = "";
  }
};

const setUsersUnready = ({ roomData }): void => {
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

const setUsersUndone = ({roomData}) => {
  for(const player of roomData) {
    player.done = false;
  }
}

export {
  clearUsersTextField,
  setUsersUnready,
  setUserDone,
  toggleUserReady,
  updateTextFieldState,
  setUsersUndone
};
