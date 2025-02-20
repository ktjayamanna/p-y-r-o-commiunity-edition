import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_RESTRICTED_SECRET_KEY, {
    apiVersion: '2022-11-15',
});

export default async (req, res) => {
    const { session_id } = req.query;

    try {
        const session = await stripe.checkout.sessions.retrieve(session_id);
        res.status(200).json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
