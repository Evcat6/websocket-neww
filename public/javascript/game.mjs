import { showInputModal } from "./views/modal.mjs";
import { appendRoomElement, updateNumberOfUsersInRoom } from "./views/room.mjs";
import {
  appendUserElement,
  changeReadyStatus,
  setProgress,
} from "./views/user.mjs";
import {
  removeClass,
  addClass,
  removeAllChildrens,
} from "./helpers/domHelper.mjs";
import { getRandomText } from "./helpers/apiHelper.mjs";
import { clientErrorHandler } from "./utils/errorHandler.mjs";
import { Events } from "./enums/events.enum.mjs";
import { audioPlayer } from "./utils/audioPlayer.mjs";
import { showMessageModal, showResultsModal } from "./views/modal.mjs";
import { getWPM } from "./utils/wpm.mjs";

const username = sessionStorage.getItem("username");
const createRoomBtn = document.getElementById("add-room-btn");
const leaveRoomBtn = document.getElementById("quit-room-btn");
const readyUserBtn = document.getElementById("ready-btn");
const timerTable = document.getElementById("timer");
const text = document.getElementById("text-container");
const gameTimerContainer = document.getElementById("game-timer");
const gameTimer = document.getElementById("game-timer-seconds");
const roomsContainer = document.getElementById("rooms-page");
const gameContainer = document.getElementById("game-page");
const roomName = document.getElementById("room-name");

let activeRoomId = null;

const gameData = {
  progressLength: 0,
  activeText: null,
  startTime: null,
  endTime: null,
  wpn: null,
};

const socket = io("", { query: { username } });
let roomNameInputValue = "";

if (!username) {
  window.location.replace("/login");
}

const onJoinRoom = (roomName) => {
  if (activeRoomId === roomName) {
    return;
  }
  socket.emit(Events.JOIN_ROOM, { roomId: roomName });
};

//

createRoomBtn.addEventListener("click", createRoomBtnListener);

leaveRoomBtn.addEventListener("click", leaveRoomEventListener);

readyUserBtn.addEventListener("click", readyUserBtnListener);

//

socket.on(Events.FORCE_UNAUTHORIZE, () => {
  sessionStorage.removeItem("username");
  window.location.replace("/login");
});

socket.on(Events.SEND_RESULTS, ({ winners }) => {
  showResultsModal({ usersSortedArray: winners });
});

socket.on(Events.SET_CLIENT_UNREADY, updateUserReadyChangeBtn);

socket.on(Events.ROOM_ERROR_HANDLER, clientErrorHandler);

socket.on(Events.UPDATE_ROOMS, updateNumberOfRooms);

socket.on(Events.JOIN_ROOM_DONE, joinRoomDone);

socket.on(
  Events.UPDATE_ROOM_PLAYERS_COUNT,
  updateRoomPlayersCountSocketEventListener
);

socket.on(Events.UPDATE_USERS_IN_ROOM, updateUsersInRoom);

socket.on(Events.UPDATE_USER_READY_DONE, updateUserReadyDone);

socket.on(Events.UPDATE_USER_READY_CHANGE_BUTTON, updateUserReadyChangeBtn);

socket.on(
  Events.UPDATE_BEFORE_GAME_TIMER,
  updateBeforeGameTimerSocketEventListener
);

socket.on(Events.START_GAME, startGameSocketEventListener);

socket.on(Events.TEXT_UPDATED_ROOM, textUpdatedRoomSocketEventListener);

socket.on(Events.END_GAME, endGameEventListener);

socket.on(Events.TEXT_UPDATED_CLIENT, textUpdatedClientEventListener);

socket.on(Events.SET_CLEAR_TIMEOUT, clearTimeout)

// DOM elements Event listeners functions

function joinRoomDone(roomId) {
  activeRoomId = roomId;
  roomName.innerText = roomId;
  addClass(roomsContainer, "display-none");
  removeClass(gameContainer, "display-none");
}

function leaveRoomEventListener() {
  socket.emit(Events.LEAVE_ROOM, { roomId: activeRoomId });
  activeRoomId = null;
  readyUserBtn.innerText = "READY";
  roomName.innerText = "";
  addClass(gameContainer, "display-none");
  removeClass(roomsContainer, "display-none");
}

function createRoomBtnClick() {
  if (!roomNameInputValue) return showMessageModal("Please Enter Room Name!");
  socket.emit(Events.NEW_ROOM, roomNameInputValue);
  onJoinRoom(roomNameInputValue);
}

function createRoomBtnListener() {
  showInputModal({
    title: "Create new room",
    onSubmit: createRoomBtnClick,
    onChange,
  });
}

function onChange(text) {
  roomNameInputValue = text;
}

// Socket Event listeners functions

function clearTimeout() {
  socket.emit(Events.CLEAR_TIMEOUT);
}

function updateUserReadyDone(user) {
  changeReadyStatus(user);
}

function updateUsersInRoom(users) {
  const usersContainer = document.querySelector("#users-wrapper");
  removeAllChildrens(usersContainer);
  users.map((user) =>
    appendUserElement({
      username: user.name,
      ready: user.ready,
      isCurrentUser: username === user.name,
    })
  );
}

function updateUserReadyChangeBtn(user) {
  if (user.ready) {
    readyUserBtn.innerText = "NOT READY";
  } else {
    readyUserBtn.innerText = "READY";
  }
}

function updateNumberOfRooms(rooms) {
  const roomsContainer = document.querySelector("#rooms-wrapper");
  removeAllChildrens(roomsContainer);
  rooms.map((room) =>
    appendRoomElement({
      name: room.name,
      numberOfUsers: room.players.length,
      onJoin: () => onJoinRoom(room.name),
    })
  );
}

function updateRoomPlayersCountSocketEventListener(room) {
  updateNumberOfUsersInRoom({
    name: room.name,
    numberOfUsers: room.players.length,
  });
}

function updateBeforeGameTimerSocketEventListener(time) {
  addClass(readyUserBtn, "display-none");
  removeClass(timerTable, "display-none");
  timerTable.innerText = time;
}

function textUpdatedRoomSocketEventListener(roomData) {
  roomData.map((player) => {
    const progress = (player.text.length * 100) / gameData.activeText.length;
    setProgress({ username: player.name, progress });
  });
}

function endGameEventListener({ roomData }) {
  addClass(gameTimerContainer, "display-none");
  addClass(text, "display-none");
  removeClass(leaveRoomBtn, "display-none");
  removeClass(readyUserBtn, "display-none");
  gameTimer.innerText = "";
  gameData.endTime = new Date();
  gameData.progressLength = 0;
  roomData.map(({ name }) => {
    setProgress({ username: name, progress: 0 });
  });
  socket.emit(Events.SEND_RESULTS);
  audioPlayer({ audioPath: "../audio/game_ended.wav", volume: 0.06 });
  showMessageModal({ message: `your WPM is ${gameData.wpm}` });
  document.removeEventListener("keyup", keyUp);
}

function textUpdatedClientEventListener() {
  const highlightedText = gameData.activeText.substring(
    0,
    gameData.progressLength + 1
  );
  const coloredText = gameData.activeText.substring(0, gameData.progressLength);
  const underlinedLastChar = gameData.activeText.substring(
    gameData.progressLength,
    gameData.progressLength + 1
  );

  const highlightedHTML = gameData.activeText.replace(
    highlightedText,
    `<span class="text-progress">${coloredText}</span><span class="underlined-text" >${underlinedLastChar}</span>`
  );
  text.innerHTML = highlightedHTML;
}

function keyUp(e) {
  if (
    e.key !==
    gameData.activeText.substring(
      gameData.progressLength,
      gameData.progressLength + 1
    )
  )
    return;
  gameData.progressLength = gameData.progressLength + 1;
  socket.emit(Events.TEXT_UPDATE, { char: e.key, roomId: activeRoomId });
  if (gameData.activeText.length === gameData.progressLength) {
    gameData.endTime = new Date();
    gameData.wpm = getWPM({
      typedChars: gameData.progressLength,
      endTime: gameData.endTime,
      startTime: gameData.startTime,
    });
    return socket.emit(Events.SET_TEXT_COMPLETED, { roomId: activeRoomId });
  }
}

async function startGameSocketEventListener({ randomText }) {
  addClass(timerTable, "display-none");
  addClass(leaveRoomBtn, "display-none");
  removeClass(text, "display-none");
  removeClass(gameTimerContainer, "display-none");

  gameData.activeText = await getRandomText(randomText);

  gameData.startTime = new Date();

  text.innerText = gameData.activeText;
  document.addEventListener("keyup", keyUp);
  socket.emit(Events.GAME_SESSION, { roomId: activeRoomId });
}

function readyUserBtnListener() {
  const dataToSend = {
    roomId: activeRoomId,
  };
  socket.emit(Events.UPDATE_USER_READY, dataToSend);
}
socket.on(Events.UPDATE_GAME_TIMER, (timerCount) => {
  gameTimer.innerText = timerCount;
});
