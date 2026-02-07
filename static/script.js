const API_URL = '/api'
        
const App = {
    currentUser: null,
    sessionTime: null,

    init() {
        this.checkSession()
        this.bindEvents()
        
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('verified') === 'true') {
            this.showSuccess('Email успешно подтвержден! Теперь войдите.')
            window.history.replaceState({}, document.title, "index.html")
        }
    },

    checkSession() {
        const savedUser = localStorage.getItem('currentUser')
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser)
            this.showDashboard()
        } else {
            this.showLogin()
        }
    },

    async login(email, password) {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, password })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message)
        this.sessionTime = Date.now()
        return data
    },

    async register(name, email, password) {
        const res = await fetch(`${API_URL}/user`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name, email, password})
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message)
        return data
    },

    async getUsers() {
        const res = await fetch(`${API_URL}/user`)
        if (!res.ok) throw new Error('Ошибка загрузки')
        return await res.json()
    },

    async updateStatus(ids, status) {
        await fetch(`${API_URL}/user`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ids, status})
        })
    },

    async deleteUsers(ids) {
        await fetch(`${API_URL}/user`, {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ids})
        })
    },

    async deleteUnverified() {
        await fetch(`${API_URL}/user/unverified`, {method: 'DELETE'})
    },

    showLogin() {this.switchView('view-login')},
    showRegister() {this.switchView('view-register')},
    
    showDashboard() {
        document.getElementById('current-user-name').textContent = this.currentUser.name
        document.getElementById('nav-auth-controls').classList.remove('d-none')
        this.switchView('view-dashboard')
        this.loadTable()
    },

    switchView(id) {
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'))
        document.getElementById(id).classList.add('active')
    },

    async logout() {
        if (!this.currentUser) return;

        try {
            const now = Date.now()
            const durationMs = now - this.sessionStartTime
            const durationMinutes = Math.round(durationMs / 1000)

            await fetch(`${API_URL}/logout`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    id: this.currentUser.id, 
                    duration: durationMinutes 
                })
            })

            this.currentUser = null;
            localStorage.removeItem('currentUser')
            document.getElementById('nav-auth-controls').classList.add('d-none')
            this.showLogin()
            this.showInfo('Вы вышли из системы. Время сессии сохранено.')
        } catch (e) {
            console.error(e)
            this.currentUser = null
            localStorage.removeItem('currentUser')
            this.showLogin()
        }
    },

    async loadTable() {
        try {
            const users = await this.getUsers()
            document.getElementById('total-users-count').textContent = users.length
            const tbody = document.getElementById('users-body')
            tbody.innerHTML = ''

            if (users.length === 0) {
                document.getElementById('empty-state').classList.remove('d-none')
                return
            }
            document.getElementById('empty-state').classList.add('d-none')

            users.forEach(u => {
                const date = new Date(u.last_login).toLocaleDateString('ru-RU') + ' ' + new Date(u.last_login).toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})
                const regDate = new Date(u.registered_at).toLocaleDateString('ru-RU')

                const sparkId = 'spark-' + u.id

                const tr = document.createElement('tr')
                tr.innerHTML = `
                    <td class="text-center"><input type="checkbox" class="user-check" value="${u.id}"></td>
                    <td>${u.name}</td>
                    <td>${u.email}</td>
                    <td><span class="badge ${this.getStatusBadge(u.status)}">${this.getStatusText(u.status)}</span></td>
                    <td>${regDate}</td>
                    <td class="text-end text-nowrap">${date}</td>
                    <td class="text-center"><div id="${sparkId}" style="width:100px; height:30px; display:inline-block"></div></td>
                `
                tbody.appendChild(tr)
                this.drawActivityChart(sparkId, u.activity_data || [])
            })
            this.updateToolbar()
        } catch (e) {
            console.error(e)
            this.showError(e.message)
        }
    },

    drawActivityChart(id, data) {
        const el = document.getElementById(id)
        if (!el) return

        if (!data || data.length === 0) {
            data = [0]
        }

        const displayData = data.slice(-20)
        const count = displayData.length

        const maxVal = Math.max(...displayData, 10)

        const width = 100
        const height = 30
        const gap = 2
        const barWidth = (width / count) - gap

        let svgContent = ''

        displayData.forEach((minutes, i) => {
            const barHeight = (minutes / maxVal) * height
            const x = i * (width / count)
            const y = height - barHeight
            const color = minutes > 0 ? '#0d6efd' : '#dee2e6'

            svgContent += `<rect x="${x}" y="${y}" width="${Math.max(0, barWidth)}" height="${barHeight}" fill="${color}" rx="1" ry="1" />`
        })

        el.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}">${svgContent}</svg>`
    },

    getStatusBadge(status) {
        if(status === 'active') return 'bg-success'
        if(status === 'blocked') return 'bg-danger'
        return 'bg-secondary'
    },
    getStatusText(status) {
        if(status === 'unverified') return 'Unverified'
        return status.charAt(0).toUpperCase() + status.slice(1)
    },

    getSelectedIds() {
        return Array.from(document.querySelectorAll('.user-check:checked')).map(cb => parseInt(cb.value))
    },

    updateToolbar() {
        const count = this.getSelectedIds().length
        document.getElementById('action-block').disabled = count === 0
        document.getElementById('action-unblock').disabled = count === 0
        document.getElementById('action-delete').disabled = count === 0
    },

    bindEvents() {
        document.getElementById('link-to-register').onclick = () => this.showRegister()
        document.getElementById('link-to-login').onclick = () => this.showLogin()
        document.getElementById('btn-logout').onclick = () => this.logout()

        document.getElementById('form-login').onsubmit = async (e) => {
            e.preventDefault()
            try {
                const email = document.getElementById('login-email').value
                const pass = document.getElementById('login-password').value
                this.currentUser = await this.login(email, pass)
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser))
                this.showDashboard()
                this.showSuccess('Добро пожаловать!')
            } catch(err) {this.showError(err.message)}
        }

        document.getElementById('form-register').onsubmit = async (e) => {
            e.preventDefault()
            const btn = e.target.querySelector('button[type="submit"]')
            const originalText = btn.innerText
            try {
                btn.disabled = true
                btn.innerText = 'Отправка...'
                const name = document.getElementById('reg-name').value
                const email = document.getElementById('reg-email').value
                const pass = document.getElementById('reg-password').value

                await this.register(name, email, pass)
                
                this.showSuccess('Регистрация успешна! Письмо с подтверждением отправлено на вашу почту.')

                this.showLogin()
                btn.disabled = false
                btn.innerText = originalText
            } catch(err) {
                this.showError(err.message)
                btn.disabled = false
                btn.innerText = originalText
            }
        }

        document.getElementById('select-all').onchange = (e) => {
            document.querySelectorAll('.user-check').forEach(cb => cb.checked = e.target.checked)
            this.updateToolbar()
        }
        document.getElementById('users-body').onclick = (e) => {
            if(e.target.classList.contains('user-check')) this.updateToolbar()
        }

        document.getElementById('action-block').onclick = async () => {
            const ids = this.getSelectedIds()
            await this.updateStatus(ids, 'blocked')
            this.loadTable()
            if(ids.includes(this.currentUser.id)) this.logout()
            this.showSuccess('Пользователи заблокированы')
        }
        document.getElementById('action-unblock').onclick = async () => {
            await this.updateStatus(this.getSelectedIds(), 'active')
            this.loadTable()
            this.showSuccess('Пользователи разблокированы')
        }
        document.getElementById('action-delete').onclick = async () => {
            if(!confirm('Удалить выбранных?')) return
            const ids = this.getSelectedIds()
            await this.deleteUsers(ids)
            this.loadTable()
            if(ids.includes(this.currentUser.id)) this.logout()
            this.showSuccess('Пользователи удалены')
        }
        document.getElementById('action-delete-unverified').onclick = async () => {
            if(!confirm('Удалить всех неподтвержденных?')) return
            await this.deleteUnverified()
            this.loadTable()
            this.showSuccess('Очистка завершена')
        }
    },

    showSuccess(msg) {this.toast('Успешно', msg, 'text-bg-success')},
    showError(msg) {this.toast('Ошибка', msg, 'text-bg-danger')},
    showInfo(msg) {this.toast('Информация', msg, 'text-bg-primary')},
    
    toast(title, msg, bgClass) {
        const container = document.getElementById('toast-container')
        const el = document.createElement('div')
        el.className = `toast align-items-center ${bgClass} border-0 show`
        el.innerHTML = `
            <div class="d-flex"><div class="toast-body"><strong>${title}:</strong> ${msg}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.remove()"></button></div>
        `
        container.appendChild(el)
        setTimeout(() => el.remove(), 4000)
    }
}

document.addEventListener('DOMContentLoaded', () => App.init())