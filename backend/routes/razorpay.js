const router = require("express").Router();
const shortid = require('shortid');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { Appointment } = require("../models/Appointment");

// Initialize Razorpay with credentials from environment variables
// It's critical to load these from environment variables in a real application
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_aqRrSZmCJ6Z4pC", // Default test key for convenience
    key_secret: process.env.RAZORPAY_SECRET
});

// Replace the existing create-order route with this resilient implementation
router.post('/create-order', async (req, res) => {
    const { amount, appointmentId } = req.body;

    if (!amount || !appointmentId) {
        return res.status(400).json({ message: "Amount and appointmentId are required." });
    }

    // Helper to build options
    const buildOptions = (receipt) => ({
        amount: parseInt(amount) * 100, // paise
        currency: 'INR',
        receipt
    });

    // Helper to produce a receipt <= 40 chars
    const makeSafeReceipt = (apptId) => {
        const prefix = 'rcpt_';
        // Try using appointmentId trimmed to keep it meaningful
        let candidate = `${prefix}${String(apptId)}`;
        if (candidate.length <= 40) return candidate;

        // Use last 12 chars of appointmentId + shortid for traceability
        const shortIdPart = shortid.generate().replace(/[^a-zA-Z0-9]/g, '').slice(0, 6);
        candidate = `${prefix}${String(apptId).slice(-12)}_${shortIdPart}`;
        if (candidate.length <= 40) return candidate;

        // Fallback: short generated receipt
        return `${prefix}${shortid.generate().replace(/[^a-zA-Z0-9]/g, '').slice(0, 28)}`;
    };

    const initialReceipt = makeSafeReceipt(appointmentId);

    try {
        // Try to create order using the safe initialReceipt
        let response;
        try {
            response = await razorpay.orders.create(buildOptions(initialReceipt));
        } catch (err) {
            // If Razorpay rejects due to receipt length or similar input validation, retry with a shorter receipt
            const description = err?.error?.description || err?.message || '';
            console.warn("Razorpay order attempt failed:", description);
            if (/receipt/i.test(description) || /length/i.test(description) || err?.statusCode === 400) {
                const fallbackReceipt = `${'rcpt_'}${shortid.generate().replace(/[^a-zA-Z0-9]/g, '').slice(0, 28)}`;
                console.log("Retrying Razorpay order with fallback receipt:", fallbackReceipt);
                response = await razorpay.orders.create(buildOptions(fallbackReceipt));
            } else {
                // Not a receipt length issue — rethrow to be handled below
                throw err;
            }
        }

        // Save oid to appointment
        const updatedAppointment = await Appointment.findByIdAndUpdate(
            appointmentId,
            { $set: { oid: response.id } },
            { new: true }
        );

        if (!updatedAppointment) {
            return res.status(404).json({ message: "Appointment not found." });
        }

        // after successful order creation and appointment update
        return res.json({
            id: response.id,
            currency: response.currency,
            amount: response.amount,
            key: process.env.RAZORPAY_KEY_ID || "rzp_test_aqRrSZmCJ6Z4pC" // return public key id for frontend
        });
    } catch (error) {
        // Log detailed error for debugging (avoid exposing secrets)
        console.error("Error creating Razorpay order:", error && (error.error || error.message) ? (error.error || error.message) : error);

        // extract description if present
        const razorpayDesc = error?.error?.description || error?.message || null;
        // If Razorpay returned 401 or authentication error, show a clear message
        const rpStatus = error?.statusCode || (error?.error && error.error?.statusCode) || null;
        if (rpStatus === 401) {
            const msg = "Razorpay authentication failed (401). Check RAZORPAY_KEY_ID and RAZORPAY_SECRET on the backend.";
            return res.status(502).json({ message: msg, detail: razorpayDesc || "Unauthorized with Razorpay" });
        }

        // For input validation errors show the description to aid debugging
        if (razorpayDesc) {
            return res.status(502).json({ message: "Razorpay error: " + razorpayDesc, detail: razorpayDesc });
        }

        const errMsg = error?.error?.description || error?.message || "Internal Server Error while creating order.";
        return res.status(500).json({ message: "Internal Server Error while creating order.", error: errMsg });
    }
});


// This route handles the client-side verification after a successful payment.
router.post('/verification/user', async (req, res) => {
    const { oid } = req.body; // The order ID from Razorpay
    try {
        // Find the appointment with the matching order ID and update its payment status
        const result = await Appointment.updateOne({ oid: oid.toString().trim() }, { $set: { isPaymentDone: true } });
        if (result.nModified === 0) {
            // This is a good practice to log if a verification came in but no document was found to update
            console.warn(`Verification received for order [${oid}], but no appointment was updated.`);
        }
        res.json({ status: 'ok' }); // Send success status to the client
    } catch (error) {
        console.error("User verification error:", error);
        res.status(500).json({ status: 'error' });
    }
});

// This is a webhook for server-to-server validation from Razorpay (more secure).
router.post('/verification', (req, res) => {
    // It's crucial that this secret matches the one in your Razorpay webhook settings
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'YOUR_WEBHOOK_SECRET';

    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    // Compare the generated signature with the one from Razorpay's header
    if (digest === req.headers['x-razorpay-signature']) {
        console.log('Webhook request is legitimate');
        const { status, order_id } = req.body.payload.payment.entity;

        // If the payment was successfully captured, update the database
        if (status === 'captured') {
            Appointment.updateOne({ oid: order_id }, { $set: { isPaymentDone: true } })
                .then(() => console.log(`Webhook successfully updated payment status for order ${order_id}`))
                .catch(err => console.error(`Webhook DB update failed for order ${order_id}`, err));
        }
    } else {
        console.warn('Invalid webhook signature received.');
        // Don't process if the signature is invalid
    }
    res.json({ status: 'ok' }); // Always return a 200 status to Razorpay
});

module.exports = router;

