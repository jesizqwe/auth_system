const Router = require('express')
const router = new Router()
const userController = require('../controller/user.controller')

router.post('/user', userController.createUser)
router.post('/login', userController.loginUser)
router.post('/logout', userController.logoutUser)
router.get('/user', userController.getUsers)
router.get('/user/verify', userController.verifyUser)
router.patch('/user', userController.updateStatusUser)
router.delete('/user', userController.deleteUser)
router.delete('/user/unverified', userController.deleteUnverifiedUsers)

module.exports = router