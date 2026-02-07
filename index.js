require('dotenv').config()
const express = require('express')
const cors = require('cors')
const userRouter = require('./routes/user.routes')

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.static('public')) 

// Временно добавим маршрут прямо сюда
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const db = require('./db');
        const bcrypt = require('bcryptjs');
        
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(400).json({ message: 'Неверный email или пароль' });
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Неверный email или пароль' });
        }
        
        res.json(user);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка входа' });
    }
});

app.use('/api', userRouter)

module.exports = app

const PORT = process.env.PORT || 8080
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))