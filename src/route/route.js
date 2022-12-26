const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')
const productController = require('../controllers/productController')
const cartController = require('../controllers/cartController')
const orderController = require('../controllers/orderController')
const auth = require('../middleware/auth')

router.post('/register', userController.createUser )

router.post('/login', userController.loginUser )

router.get('/user/:userId/profile', auth.authentication, userController.getuser )

router.put('/user/:userId/profile', auth.authentication, userController.updateUser )

router.post('/products', productController.createProduct )

router.get('/products', productController.getProductByQuery )

router.get('/products/:productId', productController.getProductById )

router.put('/products/:productId', productController.updateProduct )

router.delete('/products/:productId', productController.deleteProduct )

router.post('/users/:userId/cart', auth.authentication, auth.authorisation, cartController.createCart )

router.put('/users/:userId/cart', auth.authentication, auth.authorisation, cartController.updateCart )

router.get('/users/:userId/cart', auth.authentication, auth.authorisation, cartController.getCart )

router.delete('/users/:userId/cart', auth.authentication, auth.authorisation, cartController.deleteCart )

router.post('/users/:userId/orders', auth.authentication, auth.authorisation, orderController.createOrder )

router.put('/users/:userId/orders', auth.authentication, auth.authorisation, orderController.updateOrder )

router.all('/*', function(req, res){
    return res.status(400).send({status: false, message: 'Path not found'})
})


module.exports = router
