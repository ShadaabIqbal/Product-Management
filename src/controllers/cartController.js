const cartModel = require('../models/cartModel')
const productModel = require('../models/productModel')

const createCart =  async function(req, res){
    try{
const userId = req.userId
let presentCart = await cartModel.findOne({userId: userId})
if(!presentCart){
const { productId } = req.body

}else{

}

    }catch(error){
        return res.status(500).send({status: false, message: error.message})
    }
}




