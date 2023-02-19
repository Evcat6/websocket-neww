import { Server, Socket } from "socket.io";
import { ErrorMessages } from "../enums/errorMessages.enum";
import { Events } from "../enums/events.enum";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { Players } from "../interface/players.interface";
import {
  SECONDS_TIMER_BEFORE_START_GAME,
  MAXIMUM_USERS_FOR_ONE_ROOM,
  SECONDS_FOR_GAME,
} from "./config";
import { getRoomsKeysArray } from "../utils/room";
import { createNewUserInMap, removeUserInMap } from "../helpers/mapHelper";
import {
  setUsersUnready,
  clearUsersTextField,
  setUserDone,
  toggleUserReady,
  updateTextFieldState,
  setUsersUndone
} from "../helpers/userHelper";

const roomsDetailsMap = new Map();
let roomsToHide: string[] = [];
let usersConnectedToServer = new Map();

const getCurrentRoomId = (
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  const arr = getRoomsKeysArray(roomsDetailsMap);
  return arr.find((roomId) => socket.rooms.has(roomId));
};

const getRoomsArray = (map: Map<string, Players>) => {
  const rooms: any[] = [];
  for (const room of map.keys()) {
    const players = map.get(room) as Players;
    const newRoom = { name: room, players };
    rooms.push(newRoom);
  }
  const filteredRooms = rooms.filter(
    (room) => !roomsToHide.includes(room.name)
  );
  return filteredRooms;
};

export default (io: Server) => {
  io.on("connection", (socket) => {
    let gameSessionTimer: NodeJS.Timeout;
    let gameSessionTimeout;
    let currentRoom = null;
    const username = socket.handshake.query.username as string;

    for (let [user] of usersConnectedToServer) {
      if (user === username) {
        socket.emit(Events.FORCE_UNAUTHORIZE);
        return;
      }
    }

    usersConnectedToServer.set(username, socket.id);

    socket.emit(Events.UPDATE_ROOMS, getRoomsArray(roomsDetailsMap));

    socket.on(Events.NEW_ROOM, (room) => {
      if (roomsDetailsMap.has(room)) {
        socket.emit(Events.ROOM_ERROR_HANDLER, ErrorMessages.roomExist);
        return;
      }

      roomsDetailsMap.set(room, []);
      io.sockets.emit(Events.UPDATE_ROOMS, getRoomsArray(roomsDetailsMap));
    });

    socket.on(Events.JOIN_ROOM, ({ roomId }) => {
      const prevRoomId = getCurrentRoomId(socket);

      const roomData = roomsDetailsMap.get(roomId);

      if (roomData.length >= MAXIMUM_USERS_FOR_ONE_ROOM) {
        socket.emit(
          Events.ROOM_ERROR_HANDLER,
          ErrorMessages.maximumPlayersValue
        );
        return;
      }

      if (roomId === prevRoomId) {
        return;
      }
      if (prevRoomId) {
        socket.leave(prevRoomId);
      }

      socket.join(roomId);
      currentRoom = roomId;

      const newRoomData = createNewUserInMap({
        roomId,
        username,
        roomData,
      });

      roomsDetailsMap.set(roomId, newRoomData.players);

      if (roomData.length >= MAXIMUM_USERS_FOR_ONE_ROOM) {
        roomsToHide.push(roomId);
        io.sockets.emit(Events.UPDATE_ROOMS, getRoomsArray(roomsDetailsMap));
      }

      io.sockets.emit(Events.UPDATE_ROOM_PLAYERS_COUNT, newRoomData);

      io.to(roomId).emit(Events.UPDATE_USERS_IN_ROOM, newRoomData.players);

      io.to(socket.id).emit(Events.JOIN_ROOM_DONE, roomId);
    });

    socket.on(Events.LEAVE_ROOM, (leaveRoomData) => {
      const roomData = roomsDetailsMap.get(leaveRoomData.roomId);

      const newRoom = removeUserInMap({
        username,
        roomData,
      });

      roomsDetailsMap.set(leaveRoomData.roomId, newRoom);
      socket.leave(leaveRoomData.roomId);
      currentRoom = null;
      const newRoomData = {
        name: leaveRoomData.roomId,
        players: newRoom,
      };

      if (roomData.length <= MAXIMUM_USERS_FOR_ONE_ROOM) {
        roomsToHide = roomsToHide.filter(
          (room) => room !== leaveRoomData.roomId
        );
        io.sockets.emit(Events.UPDATE_ROOMS, getRoomsArray(roomsDetailsMap));
      }

      if (newRoomData.players.length === 0) {
        roomsDetailsMap.delete(leaveRoomData.roomId);
        io.sockets.emit(Events.UPDATE_ROOMS, getRoomsArray(roomsDetailsMap));
      }

      io.to(leaveRoomData.roomId).emit(
        Events.UPDATE_USERS_IN_ROOM,
        newRoomData.players
      );

      for (const player of roomData) {
        if (!player.ready) return;
      }

      roomsToHide.push(leaveRoomData.roomId);

      io.sockets.emit(Events.UPDATE_ROOMS, getRoomsArray(roomsDetailsMap));

      io.sockets.emit(Events.UPDATE_ROOM_PLAYERS_COUNT, newRoomData);

      let timerCount = SECONDS_TIMER_BEFORE_START_GAME;

      let beforeGameTimer = setInterval(() => {
        timerCount = timerCount - 1;
        io.to(leaveRoomData.roomId).emit(
          Events.UPDATE_BEFORE_GAME_TIMER,
          timerCount
        );
      }, 1000);
      setTimeout(() => {
        clearInterval(beforeGameTimer);
        const randomText = Math.floor(Math.random() * 7);
        io.to(leaveRoomData.roomId).emit(Events.START_GAME, { randomText });
      }, SECONDS_TIMER_BEFORE_START_GAME * 1000);
    });

    socket.on(Events.UPDATE_USER_READY, (userReadyData) => {
      const roomData = roomsDetailsMap.get(userReadyData.roomId);

      const userReady = toggleUserReady({ roomData, username });

      io.to(userReadyData.roomId).emit(Events.UPDATE_USER_READY_DONE, {
        username,
        ready: userReady,
      });

      socket.emit(Events.UPDATE_USER_READY_CHANGE_BUTTON, {
        username,
        ready: userReady,
      });

      for (const player of roomData) {
        if (!player.ready) return;
      }

      roomsToHide.push(userReadyData.roomId);

      io.sockets.emit(Events.UPDATE_ROOMS, getRoomsArray(roomsDetailsMap));

      let timerCount = SECONDS_TIMER_BEFORE_START_GAME;

      let beforeGameTimer = setInterval(() => {
        timerCount = timerCount - 1;
        io.to(userReadyData.roomId).emit(
          Events.UPDATE_BEFORE_GAME_TIMER,
          timerCount
        );
      }, 1000);
      setTimeout(() => {
        clearInterval(beforeGameTimer);
        const randomText = Math.floor(Math.random() * 7);
        io.to(userReadyData.roomId).emit(Events.START_GAME, { randomText });
      }, SECONDS_TIMER_BEFORE_START_GAME * 1000);
    });

    socket.on(Events.GAME_SESSION, (gameData) => {
      let timerCount = SECONDS_FOR_GAME;

      gameSessionTimer = setInterval(() => {
        timerCount = timerCount - 1;
        io.to(gameData.roomId).emit(Events.UPDATE_GAME_TIMER, timerCount);
      }, 1000);
      gameSessionTimeout = setTimeout(() => {
        clearInterval(gameSessionTimer);

        io.to(gameData.roomId).emit(Events.END_GAME);

        const roomData = roomsDetailsMap.get(gameData.roomId);

        if (roomData) {
          setUsersUnready({ roomData });
        }

        setUsersUndone({roomData})

        io.to(gameData.roomId).emit(Events.END_GAME, { roomData });

        io.to(gameData.roomId).emit(Events.SET_CLIENT_UNREADY, {
          ready: false,
        });
        roomsToHide = roomsToHide.filter((room) => room !== gameData.roomId);
        io.sockets.emit(Events.UPDATE_ROOMS, getRoomsArray(roomsDetailsMap));
      }, SECONDS_FOR_GAME * 100);
    });

    socket.on(Events.SET_TEXT_COMPLETED, (setTextData) => {
      const roomData = roomsDetailsMap.get(setTextData.roomId);
      let winners: string[] = [];

      setUserDone({ roomData, username });

      for (const player of roomData) {
        if (player.done && winners.length <= 2) {
          winners.push(player.name);
        }
      }

      for (const player of roomData) {
        if (!player.done) return;
      }

      clearUsersTextField({ roomData });
      
      setUsersUnready({ roomData });
      
      io.to(setTextData.roomId).emit(Events.SET_CLIENT_UNREADY, {
        ready: false,
      });
      
      io.to(setTextData.roomId).emit(Events.END_GAME, { roomData });
      roomsToHide = roomsToHide.filter((room) => room !== setTextData.roomId);
      io.sockets.emit(Events.UPDATE_ROOMS, getRoomsArray(roomsDetailsMap));
      io.to(setTextData.roomId).emit(Events.SEND_RESULTS, {
        winners: winners.slice(0, 2),
      });
      setUsersUndone({roomData})
      io.to(setTextData.roomId).emit(Events.SET_CLEAR_TIMEOUT);
    });

    socket.on(Events.CLEAR_TIMEOUT, () => {
      clearInterval(gameSessionTimer);

      clearTimeout(gameSessionTimeout);
    })

    socket.on(Events.TEXT_UPDATE, (textUpdateData) => {
      const roomData = roomsDetailsMap.get(textUpdateData.roomId);

      updateTextFieldState({ roomData, username, char: textUpdateData.char });

      io.to(textUpdateData.roomId).emit(Events.TEXT_UPDATED_ROOM, roomData);
      socket.emit(Events.TEXT_UPDATED_CLIENT);
    });

    socket.on("disconnect", () => {
      for (let [_, id] of usersConnectedToServer) {
        if (id === socket.id) {
          usersConnectedToServer.delete(username);
        }
      }

      if (!currentRoom) return;
      const roomData = roomsDetailsMap.get(currentRoom);

      const newRoom = removeUserInMap(roomData);
      roomsDetailsMap.set(currentRoom, newRoom);

      io.sockets.emit(Events.UPDATE_ROOMS, getRoomsArray(roomsDetailsMap));
      io.to(currentRoom).emit(Events.UPDATE_USERS_IN_ROOM, currentRoom);
      currentRoom = null;
    });
  });
};
