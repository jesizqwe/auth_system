require('dotenv').config()
const express = require('express')
const cors = require('cors')
const userRouter = require('./routes/user.routes')
const path = require('path')

const app = express()

app.use(cors())
app.use(express.json())

// Для Vercel: статика из public
app.use(express.static(path.join(__dirname, 'public')))

// API роуты
app.use('/api', userRouter)

// Fallback для SPA (если фронтенд - одностраничное приложение)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// Экспорт для Vercel вместо app.listen
module.exports = app

// Локальная разработка
if (require.main === module) {
  const PORT = process.env.PORT || 8080
  app.listen(PORT, () => console.log(`Server running locally on port ${PORT}`))
}