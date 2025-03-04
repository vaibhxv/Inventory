const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      ref: 'Product',
    },
    name: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    reserved: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for available quantity
inventorySchema.virtual('available').get(function () {
  return this.quantity - this.reserved;
});

const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = Inventory;
