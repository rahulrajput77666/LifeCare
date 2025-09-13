const mongoose = require("mongoose");
const { Schema } = mongoose;

const appointmentSchema = new Schema({
  // Reference to the user who booked the appointment
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // This assumes your User model is named 'User'
    required: true
  },
  name: { type: String, required: true },
  email: { type: String, required: true },
  date: { type: Date, required: true },
  address: {
    streetAddress: String,
    roadNo: String,
    city: String,
    pincode: String,
    state: String
  },
  dtd: { type: String, enum: ["yes", "no"], default: "no" },
  tests: [{ type: mongoose.Schema.Types.ObjectId, ref: "Test" }],
  profiles: [{ type: mongoose.Schema.Types.ObjectId, ref: "Profile" }],
  totalPrice: { type: Number, default: 0 },
  status: { type: String, enum: ["Pending", "Confirmed", "Cancelled"], default: "Pending" },
  isPaymentDone: { type: Boolean, default: false },
  tested: { type: String, enum: ["Pending", "Done"], default: "Pending" },
  report: { type: String, default: "" }
}, { timestamps: true });

module.exports = { Appointment: mongoose.model("Appointment", appointmentSchema) };
