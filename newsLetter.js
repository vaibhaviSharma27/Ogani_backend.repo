import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import "dotenv/config";

mongoose.connect("mongodb://127.0.0.1:27017/ogani")
.then(() => console.log("Connected to ogani database!!!"))
.catch((err) => console.log(err))

const app = express();
app.use(express.json());
app.use(cors({
    origin:"http://localhost:5173",
    credentials: true
}));

const subscriberSchema = new mongoose.Schema({
    email:{
        type: String,
        required: [true,"Email is required!!"],
        unique: true
    }

});

const Subscribers = mongoose.model("subscribers", subscriberSchema);



app.post("/subscribe", async (req, res) =>{
    try {
        const {email} = req.body;
        const existingSubscriber = await Subscribers.findOne({ email });

        if(existingSubscriber){
            return res.status(409).json({message:"Email already subscribed..."})
        }

       const createSubscriber = await Subscribers.create({ email });

        res.status(201).json({message:"Successfully Subscribed."})

    } catch (error) {

        console.log(error);
        res.status(500).json({message:"Something went wrong!!"})
        
    }

});

app.listen(process.env.PORT, () => console.log(`http://localhost:${process.env.PORT}/`))

