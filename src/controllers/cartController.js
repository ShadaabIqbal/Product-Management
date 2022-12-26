const cartModel = require('../models/cartModel')
const productModel = require('../models/productModel')
const validations = require('../validations/validation')


const createCart = async function (req, res) {
    try {
        let userId = req.userId
        let data = req.body
        let { productId, cartId, quantity } = data
        if (!quantity) { quantity = 1 }
        if (!productId) return res.status(400).send({ status: false, message: "productId must be present" })
        if (!validations.isValidObjectId(productId)) return res.status(400).send({ status: false, message: "productId not valid" })
        let productPresent = await productModel.findById(productId)
        if (!productPresent) return res.status(404).send({ status: false, message: "product not found" })
        let findCart = await cartModel.findOne({ userId: userId })
        if (!findCart) {
            let allPrice = productPresent.price * quantity
            let obj = {
                userId: userId,
                items: [{ productId: productId, quantity: quantity }],
                totalPrice: allPrice
            }
            obj.totalItems = obj.items.length
            let cartData = await cartModel.create(obj)
            return res.status(201).send({ status: true, message: "Success", data: cartData })
        } else {
            if (cartId) {
                if (!validations.isValidObjectId(cartId)) return res.status(400).send({ status: false, message: "cartId not valid" })
                if (findCart._id != cartId) return res.status(403).send({ status: false, message: "Cart does not belong to this user" })
            }
            let cartItems = findCart.items
            let productId = productPresent._id
            for (let i = 0; i < cartItems.length; i++) {
                if (cartItems[i].productId == productId.toString()) {
                    cartItems[i].quantity = cartItems[i].quantity + quantity
                    findCart.totalPrice = findCart.totalPrice + productPresent.price * quantity
                    await findCart.save()
                    return res.status(200).send({ status: true, message: "Success", data: findCart })
                }
            }
            cartItems.push({ productId: productId, quantity: quantity })
            findCart.totalPrice = findCart.totalPrice + productPresent.price * quantity
            findCart.totalItems = findCart.totalItems + 1
            await findCart.save()
            return res.status(200).send({ status: true, message: "Success", data: findCart })
        }

    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

const updateCart = async function (req, res) {
    try {
        let userId = req.userId
        let data = req.body
        let { cartId, productId, removeProduct } = data
        if (!cartId) return res.status(400).send({ status: false, message: "cartId must be present" })
        if (!validations.isValidObjectId(cartId)) return res.status(400).send({ status: false, message: "cartId not valid" })
        let cartPresent = await cartModel.findOne({ userId: userId, _id: cartId })
        if (!cartPresent) return res.status(404).send({ status: false, message: "cart not found for this user" })
        if (!productId) return res.status(400).send({ status: false, message: "productId must be present" })
        if (!validations.isValidObjectId(productId)) return res.status(400).send({ status: false, message: "productId not valid" })
        let productPresent = await productModel.findById(productId)
        if (!productPresent) return res.status(404).send({ status: false, message: "product not found" })
        if (removeProduct !== 1 && removeProduct !== 0) return res.status(400).send({ status: false, message: "remove product can only be 1 an 0" })
        let totalPrice = cartPresent.totalPrice
        let items = cartPresent.items
        let productIndex = items.findIndex(a => a.productId == productId)
        if (productIndex == -1) {
            return res.status(404).send({ status: false, message: "product not found with provided productId" })
        } else if (productIndex > -1) {
            if (removeProduct == 1) {
                items[productIndex].quantity--
                cartPresent.totalPrice = totalPrice - productPresent.price
            } else if (removeProduct == 0) {
                let newPrice = items[productIndex].quantity * productPresent.price
                cartPresent.totalPrice = totalPrice - newPrice
                items[productIndex].quantity = 0
            }
            if (items[productIndex].quantity == 0) {
                items.splice(productIndex, 1)
            }
        }
        cartPresent.totalItems = items.length
        await cartPresent.save()
        return res.status(200).send({ status: true, message: 'Success', data: cartPresent })
    }
    catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

const getCart = async function (req, res) {
    try {
        let userId = req.userId
        let cartPresent = await cartModel.findOne({ userId: userId })
        if (!cartPresent) return res.status(404).send({ status: false, message: "cart not found for this user" })
        return res.status(200).send({ status: true, message: "Success", data: cartPresent })
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

const deleteCart = async function (req, res) {
    try {
        let userId = req.userId
        let cartPresent = await cartModel.findOne({ userId: userId })
        if (!cartPresent) return res.status(404).send({ status: false, message: "cart not found for this user" })
        let items = []
        let price = 0
        let noOfItems = 0
        await cartModel.findOneAndUpdate({ userId: userId }, { $set: { items: items, totalPrice: price, totalItems: noOfItems } })
        return res.status(204)
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}


module.exports = { createCart, updateCart, getCart, deleteCart }
