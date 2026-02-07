require('dotenv').config()
const express = require('express')
const cors = require('cors')
const userRouter = require('./routes/user.routes')

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.static('static'))
app.use('/api', userRouter)

module.exports = app

if (require.main === module) {
    const PORT = process.env.PORT || 8080
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
}