import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
    {
        subscriber: {
            type: mongoose.Schema.Types.ObjectId, //follower
            ref: "User",
        },
        channel: {
            type: mongoose.Schema.Types.ObjectId, //main channel
            ref: "User",
        },
    },
    { timestamp: true }
);

const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;
