const orderModel = require('../models/orderModel')
const cartModel = require('../models/cartModel')
const validator = require('../validations/validation')
const { isValidObjectId } = require('mongoose')


const createOrder = async function (req, res) {
    try {
        const userId = req.userId
        if (!validator.requiredInput(req.body)) return res.status(400).send({ status: false, message: 'Input is required' })
        const cartId = req.body.cartId
        if (!isValidObjectId(cartId)) return res.status(400).send({ status: false, message: 'Cart Id is invalid' })
        let presentCart = await cartModel.findOne({ _id: cartId })
        if (!presentCart) return res.status(404).send({ status: false, message: 'No cart found' })
        if (presentCart.userId.toString() != userId) return res.status(403).send({ status: false, message: "You do not have access rigths" })

        if (!presentCart.items.length > 0) return res.status(400).send({ status: false, message: 'Please add items in your cart' })
        let totalQuantity = 0
        for (let i = 0; i < presentCart.items.length; i++) {
            let quantity = presentCart.items[i].quantity
            totalQuantity += quantity
        }
        let obj = {
            userId: userId,
            items: presentCart.items,
            totalPrice: presentCart.totalPrice,
            totalItems: presentCart.totalItems,
            totalQuantity: totalQuantity
        }

        let createOrder = await orderModel.create(obj)
        await cartModel.findByIdAndUpdate({ _id: presentCart._id }, { $set: { items: [], totalPrice: 0, totalItems: 0 } })
        return res.status(200).send({ status: false, message: 'Success', data: createOrder })
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

const updateOrder = async function (req, res) {
    try {
        const userId = req.userId
        if (!validator.requiredInput(req.body)) return res.status(400).send({ status: false, message: 'Input is required' })
        const { orderId, status } = req.body
        if (!validator.isEmpty(orderId)) return res.status(400).send({ status: false, message: 'Order Id is required' })
        if (!isValidObjectId(orderId)) return res.status(400).send({ status: false, message: 'orderId is invalid' })
        let presentOrder = await orderModel.findOne({ _id: orderId, isDeleted: false })
        if (!presentOrder) return res.status(404).send({ status: false, message: 'No order found here' })

        if (presentOrder.userId.toString() != userId) return res.status(403).send({ status: false, message: "You do not have access rigths" })

        if (!validator.isEmpty(status)) return res.status(400).send({ status: false, message: 'Status is required' })
        if (!['completed', 'cancelled'].includes(status)) { return res.status(400).send({ status: false, message: 'status can only be completed or cancelled' }) }
        if (presentOrder.status === 'pending') {
            if (status == 'completed') {
                req.body.status = 'completed'
            } else if (status == 'cancelled') {
                if (presentOrder.cancellable === true) {
                    req.body.status = 'cancelled'
                } else {
                    return res.status(400).send({ status: false, message: 'This order cannot be cancelled' })
                }
            }
            let updateOrder = await orderModel.findByIdAndUpdate({ _id: orderId }, { $set: { status: req.body.status } }, { new: true })
            return res.status(200).send({ status: true, message: 'Success', data: updateOrder })
        } else {
            return res.status(404).send({ status: false, message: 'No order found' })
        }
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

module.exports = { createOrder, updateOrder }