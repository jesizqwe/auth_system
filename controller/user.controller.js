const baseURL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : process.env.APP_URL || 'http://localhost:8080'
const db = require('../db')
const bcrypt = require('bcryptjs')
const mailService = require('../service/mail.service')

class UserController {
    async createUser(req, res) {
        const {name, email, password} = req.body
        try {
            if (!password) return res.status(400).json({message: "Пароль обязателен"})
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);
            const newUser = await db.query(`INSERT INTO users (name, email, password_hash) values ($1, $2, $3) RETURNING *`, [name, email, password_hash])
            
            // ИСПРАВЬ ССЫЛКУ:
            const link = `${baseURL}/api/user/verify?id=${newUser.rows[0].id}`
            await mailService.sendActivationMail(email, link)

            res.json(newUser.rows[0])
        } catch (e) {
            // ... остальной код
        }
    }

    async verifyUser(req, res) {
        try {
            const {id} = req.query
            if (!id) {
                return res.status(400).send('Отсутствует идентификатор пользователя')
            }
            await db.query("UPDATE users SET status = 'active' WHERE id = $1", [id])
            // ИСПРАВЬ РЕДИРЕКТ:
            res.redirect(`${baseURL}/index.html?verified=true`)
        } catch (e) {
            console.error(e)
            res.status(500).send('Ошибка при подтверждении почты')
        }
    }

    async loginUser(req, res) {
        const {email, password} = req.body
        try {
            const result = await db.query('SELECT * FROM users WHERE email = $1', [email])
            const user = result.rows[0]

            if (!user) {
                return res.status(400).json({message: 'Неверный email или пароль'})
            }

            const isPasswordValid = await bcrypt.compare(password, user.password_hash)

            if (!isPasswordValid) {
                return res.status(400).json({message: 'Неверный email или пароль'})
            }

            if (user.status === 'blocked') {
                return res.status(403).json({message: 'Аккаунт заблокирован'})
            }

            await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id])

            res.json(user)

        } catch (e) {
            console.error(e)
            res.status(500).json({message: 'Ошибка входа'})
        }
    }

    async logoutUser(req, res) {
        try {
            res.json({ success: true, message: 'Выход выполнен' })
        } catch (e) {
            console.error(e)
            res.status(500).json({ message: 'Ошибка при выходе' })
        }
    }

    async getUsers(req, res) {
        try {
            const users = await db.query('SELECT id, name, email, status, registered_at, last_login FROM users ORDER BY last_login DESC')
            res.json(users.rows)
        } catch (e) {
            res.status(500).json({message: 'Ошибка при получении пользователей'})
        }
    }

    async updateStatusUser(req, res) {
        const {ids, status} = req.body
        try {
            await db.query('UPDATE users SET status = $1 WHERE id = ANY($2::int[])', [status, ids])
            res.json({success: true})
        } catch (e) {
            res.status(500).json({message: 'Ошибка обновления статуса'})
        }
    }

    async deleteUser(req, res) {
        const {ids} = req.body
        try {
            await db.query('DELETE FROM users WHERE id = ANY($1::int[])', [ids])
            res.json({message: 'Выбранные пользователи удалены'})
        } catch(e) {
            res.status(500).json({message:'Ошибка удаления'})
        }
    }

    async deleteUnverifiedUsers(req, res) {
        try {
            await db.query("DELETE FROM users WHERE status = 'unverified'")
            res.json({message: 'Неподтвержденные пользователи удалены'})
        } catch (e) {
            res.status(500).json({message: 'Ошибка очистки'})
        }
    }
}

module.exports = new UserController()