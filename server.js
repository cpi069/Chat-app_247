const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// "Memory" to store active rooms and users
let roomState = {}; 

io.on('connection', (socket) => {
  
  // FIX: Send the list of existing rooms immediately when someone connects
  socket.emit('update room list', roomState);

  // Event: Join Room
  socket.on('join room', (data) => {
    socket.join(data.room);
    
    socket.data.username = data.username || "Anonymous";
    socket.data.room = data.room;

    if (!roomState[data.room]) {
      roomState[data.room] = []; 
    }
    
    // Avoid duplicate names in the list
    if (!roomState[data.room].includes(socket.data.username)) {
        roomState[data.room].push(socket.data.username);
    }

    // Update everyone
    io.emit('update room list', roomState);

    const joinMsg = `🔵 ${socket.data.username} has joined the room.`;
    socket.to(data.room).emit('chat message', joinMsg);
  });

  // Event: Send Message
  socket.on('chat message', (data) => {
    const displayMsg = `${data.username}: ${data.msg}`;
    io.to(data.room).emit('chat message', displayMsg);
  });

  // Event: Disconnect
  socket.on('disconnect', () => {
    const user = socket.data.username;
    const room = socket.data.room;

    if (user && room && roomState[room]) {
      roomState[room] = roomState[room].filter(name => name !== user);

      if (roomState[room].length === 0) {
        delete roomState[room];
      }

      io.emit('update room list', roomState);
      io.to(room).emit('chat message', `🔴 ${user} left the room.`);
    }
  });

}); // <--- This was likely the missing part!

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
