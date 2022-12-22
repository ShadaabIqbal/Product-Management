const cartModel = require('../models/cartModel')
const { findByIdAndUpdate } = require('../models/productModel')
const productModel = require('../models/productModel')
const validations = require('../validations/validation')


const createCart = async function (req, res) {
    try {
        const userId = req.userId
        let data = req.body
        let presentCart = await cartModel.findOne({ userId: userId })
        if (!presentCart) {
            const { productId } = data
            // if (!quantity) { quantity = 1 }
            if (!validations.isValidObjectId(productId)) return res.status(400).send({ status: false, message: "productId is not valid" })
            let productPresent = await productModel.findOne({ _id: productId, isDeleted: false })
            if (!productPresent) return res.status(404).send({ status: false, message: "Product not found" })
            let obj = {
                userId: userId,
                items: [{ productId: productId}],
                totalPrice: productPresent.price
            }
            obj.totalItems = obj.items.length
            let createCart = await cartModel.create(obj)
            return res.status(201).send({ status: true, message: "Success", data: createCart })
        } else {
            if (data.cartId) {
                if (!validations.isValidObjectId(data.cartId)) return res.status(400).send({ status: false, message: "productId is not valid" })
                if (presentCart._id != data.cartId) return res.status(404).send({ status: false, message: "cart not found for this user" })
                let presentItems = presentCart.items
                for (let i = 0; i < presentItems.length; i++) {
                    if (presentItems[i].productId == data.productId) {
                        presentItems[i].quantity = data.quantity
                        presentCart.totalPrice = presentCart.totalPrice + productPresent.price * quantity
                    } else {
                        presentItems.push({ productId })
                        presentCart.totalItems = presentCart.totalItems.length
                        presentCart.totalPrice = presentCart.totalPrice + productPresent.price * quantity
                        let createData = await cartModel.findByIdAndUpdate({ _id: data.cartId }, { $set: {} })
                    }
                }

            }
        }

    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}



module.exports = {createCart}
