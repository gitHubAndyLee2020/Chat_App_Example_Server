import * as socketio from 'socket.io'
import express from 'express'
import { createServer } from 'http'
import router from './router.js'
import dotenv from 'dotenv'
import { addUser, removeUser, getUser, getUsersInRoom } from './users.js'

dotenv.config()

const app = express()
const server = createServer(app)
const io = new socketio.Server(server, {
  cors: {
    origin: /https:\/\/chat-app-demo-techandy42.netlify.app/i,
  },
})

app.use(router)

io.on('connection', (socket) => {
  socket.on('join', ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room })

    if (error) {
      return callback(error)
    }

    socket.emit('message', { user: 'admin', text: `${user.name}, welcome to the room ${user.room}` })
    socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name}, has joined!` })

    socket.join(user.room)

    io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) })

    callback()
  })

  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id)

    io.to(user.room).emit('message', { user: user.name, text: message })
    io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) })

    callback()
  })

  socket.on('disconnect', () => {
    const user = removeUser(socket.id)

    if (user) {
      io.to(user.room).emit('message', { user: 'admin', text: `${user.name} has left` })
    }
  })
})

const PORT = process.env.PORT || 5000

server.listen(PORT, () => console.log(`Server running at port: ${PORT}`))
