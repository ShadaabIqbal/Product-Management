const mongoose = require('mongoose')
const objectId = mongoose.Schema.Types.ObjectId

const cartSchema = new mongoose.Schema({
        userId: {
            type: objectId, 
            required: true,
            unique: true,
            ref: user
        },
        items: [{
          productId: {
            type: objectId, 
            required: true,
            ref: Product
        },
          quantity: {
            type: Number, 
            required: true,
            default: 1}
        }],
        totalPrice: {type: number,
             required: true},
        totalItems: {type: number,
            required: true}
}, {timestamps: true})

module.exports = mongoose.model('cart', cartSchema)