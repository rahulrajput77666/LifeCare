const mongoose = require("mongoose");
const { Schema } = mongoose;

const AddressSchema = new Schema({
  streetAddress: { type: String },
  roadNo: { type: String },
  city: { type: String },
  pincode: { type: String },
  state: { type: String },
  mobile: { type: String }, // <-- new: store mobile in address as fallback
});

const AppointmentSchema = new Schema({
  // Reference to the user who booked the appointment
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // This assumes your User model is named 'User'
    required: true,
  },
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String }, // <-- new: top-level mobile field
  date: { type: Date, default: Date.now },
  address: { type: AddressSchema, default: {} },
  dtd: { type: String, enum: ["yes", "no"], default: "no" },
  tests: [{ type: mongoose.Schema.Types.ObjectId, ref: "Test" }],
  profiles: [{ type: mongoose.Schema.Types.ObjectId, ref: "Profile" }],
  totalPrice: { type: Number, default: 0 },
  status: { type: String, enum: ["Pending", "Confirmed", "Cancelled"], default: "Pending" },
  isPaymentDone: { type: Boolean, default: false },
  tested: { type: String, enum: ["Pending", "Done"], default: "Pending" },
  report: { type: String },
  transactionId: { type: String },
  orderId: { type: String },
}, { timestamps: true });

// Export in the shape the routes expect
const Appointment = mongoose.model("Appointment", AppointmentSchema);
module.exports = { Appointment };
