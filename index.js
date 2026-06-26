import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonWebToken";
import "dotenv/config";
import cookieParser from "cookie-parser";
import multer, { MulterError } from "multer";
import path from "path";
import { fileTypeFromBuffer, fileTypeFromFile } from "file-type";
import fs from "fs/promises";
import { v2 as cloudinary, } from "cloudinary";
import streamifier from "streamifier";
import nodemailer from "nodemailer";

import Razorpay from "razorpay";


// Establish db connection

mongoose.connect("mongodb://127.0.0.1:27017/ogani")
    .then(() => console.log("Connected to the ogani database successfully"))
    .catch((err) => console.log(err));




// maxlength, min, max, unique: true

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        minlength: [3, "Name must contain at least 3 letters"]
    },
    email: {
        type: String,
        unique: true,
        required: [true, "Email is required"],
        validate: [(value) => {
            const pattern = /^[A-Za-z0-9._]+@[A-Za-z]+\.[a-zA-Z]{2,}$/
            return pattern.test(value);
        }, "Please provide a valid email address!"]

    },
    phone: {
        type: String,
        unique: true
    },
    password: String,

    address: {
        type: String,
        required: [true, "Address is required"],
    },
    profile: String
});

const User = mongoose.model("users", userSchema);

const cartSchema = new mongoose.Schema({
    productId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
    quantity: Number
});

const Cart = mongoose.model("cart", cartSchema);

const wishlistSchema = new mongoose.Schema({
    productId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
    quantity: Number
});

const Wishlist = mongoose.model("wishlist", wishlistSchema);

// Initialize the app

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));


// User Routes
// data validation - mongoose data validation
// hashing

app.post("/signup", express.json(), async (req, res) => {
    try {
        let { name, email, phone, password, address } = req.body;
        password = await bcrypt.hash(password, 12);
        const createdUser = await User.create({ name, email, phone, password, address });
        if (!createdUser)
            throw new Error("Could not process your request at the moment")

        res.status(201).json({ message: createdUser });
    } catch (error) {
        if (error.name == "ValidationError") {
            // fields = Object.keys(error.errors) => ["name", "email", ...]
            // fields.map(field=>error.errors[field].message) => ["Name must contain at least 3 letters", "Please provide ..."]
            const messages = Object.keys(error.errors).map(el => error.errors[el].message)
            console.log(messages);
            res.status(400).json({ message: messages });
        } else if (error.code == 11000) {
            const errObj = error.keyValue;
            const field = Object.keys(errObj)[0]
            const value = errObj[field]

            res.status(400).json({ message: `The ${field} ${value} has already been taken!` });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
});

app.post("/login", express.json(), async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        console.log(email);
        if (!user)
            throw new Error("Invalid Credentials!");

        const correctPass = await bcrypt.compare(password, user.password);

        if (!correctPass)
            throw new Error("Invalid Credentials");

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });
        res.cookie("jwt", token, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });

        // maxAge is the expiry of the cookie and is stored in milliseconds only .

        // and httpOnly is for cookie can not be changed through javascript like modification is not possible through js means and returns empty string when tried to access.

        res.status(200).json({ message: "logged in!!", token })

    } catch (error) {
        console.log(error);
        // data and hash values are required!!
        res.status(400).json({ message: error.message });

    }
});

async function checkAuth(req, res, next) {
    //middleware
    try {
        const token = req.cookies.jwt;
        if (!token)
            return res.status(401).json({ message: "Please login!!" });

        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const userId = payload.userId;
        const user = await User.findById(userId);
        if (!user) {
            // clear the cookie
            throw new Error("You should not be here!!");
        }

        req.user = user;
        next();

    } catch (error) {
        if (error.name == "JsonWebTokenError" || error.name == "TokenExpiredError") {

            res.cookie("jwt", "", { maxAge: 1000 });
            return res.status(401).json({ message: "You should not be here!!" });
        }
        res.status(500).json({ message: "Something went wrong!!" });
        console.log(error);

    }
};

app.post("/cart", checkAuth, async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.user._id;

        const existingItem = await Cart.findOne({
            productId: new mongoose.Types.ObjectId(productId),
            userId
        });

        if (existingItem) {
            console.log(existingItem, "from line 182");
            existingItem.quantity = existingItem.quantity + quantity;
            if (existingItem.quantity <= 0) {
                await existingItem.deleteOne();
            } else {
                await existingItem.save();
            }


        } else {
            if (quantity >= 1) {
                console.log("No existing item found!");
                const newCartItem = await Cart.create({
                    productId: new mongoose.Types.ObjectId(productId),
                    userId,
                    quantity
                });
            }
        }


        const usersCart = await Cart.aggregate([
            { $match: { userId } },

            {
                $lookup: {
                    from: "products",
                    localField: "productId",
                    foreignField: "_id",
                    as: "product"
                }
            },

            {
                $addFields: {
                    product: { $arrayElemAt: ["$product", 0] }
                }
            },

            
               { $project:{
                    quantity: 1,
                    productId:"$product._id",
                    title: "$product.title",
                    price: "$product.price",
                    image: { $arrayElemAt: ["$product.images", 0] }
                }
            }
            
        ]);

        res.status(200).json({
            cart: usersCart
        });

    }catch(error) {

        console.log(error.message);
        res.status(500).json({ message: "Something went wrong!!" })

    }
});


app.get("/cart", checkAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        const cartItems = await Cart.aggregate([
            { $match: { userId } },

            {
                $lookup: {
                    from: "products",
                    localField: "productId",
                    foreignField: "_id",
                    as: "product"
                }
            },

            {
                $addFields: {
                    product: { $arrayElemAt: ["$product", 0] }
                }
            },

            {
                $project: {
                    productId:"$product._id",
                    quantity: 1,
                    title: "$product.title",
                    price: "$product.price",
                    image: { $arrayElemAt: ["$product.images", 0] }
                }
            }
        ])

        res.status(200).json({ message: cartItems });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something went wrong!!" });
    }

});

app.post("/wishlist", checkAuth, async (req, res) => {
try {
    const { productId, quantity } = req.body;
    const userId = req.user._id;

    const existingItem = await Wishlist.findOne({
        productId: new mongoose.Types.ObjectId(productId),
        userId
    });

    if(existingItem){
        // console.log(existingItem, "From line 302");
        existingItem.quantity = existingItem.quantity + quantity;
        if(existingItem.quantity <=0){
            await existingItem.deleteOne();
        } else  {
            await existingItem.save();
        }
    }
        else{
            if(quantity>=1){
                // console.log("No existing item found")
                const newWishlistItem = await Wishlist.create({
                    productId: new mongoose.Types.ObjectId(productId),
                    userId,
                    quantity
                });
            }
        }

        const usersWishlist = await Wishlist.aggregate([
            {$match: { userId }},

            {
                $lookup: {
                    from : "products",
                    localField: "productId",
                    foreignField: "_id",
                    as: "product"
                }
            },

            {
                $addFields: {
                    product: { $arrayElemAt: ["$product", 0]}
                }
            },

            { $project:{
                quantity:1,
                productId:"$product._id",
                title:"$product.title",
                price:"$product.price",
                image: {$arrayElemAt: ["$product.images", 0]}
            }}
        ]);

        res.status(200).json({
            wishlist: usersWishlist
        });
    
} catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Something went wrong !!"})
}
});


// ################################## Payment


const rzpay = new Razorpay({
    key_id: process.env.RAZ_API_KEY,
    key_secret: process.env.RAZ_KEY_SECRET
});

app.get("/order", async (req, res)=>{
    try {
       const order =  await rzpay.orders.create({
            currency: "INR",
            amount: 50*100,
            receipt: "receipt_"+Math.floor(Math.random()*1000)+"-"+Math.floor(Math.random()*1000)
        });

        res.status(200).json({message: order});
    } catch (error) {
        console.log(error);
        res.status(500).json({message: "Something went wrong!"});
    }
});


//end of payment section

app.get("/wishlist", checkAuth, async (req, res) => {
    try {
        const userId = req.user._id;

         const usersWishlist = await Wishlist.aggregate([
            {$match: { userId }},

            {
                $lookup: {
                    from : "products",
                    localField: "productId",
                    foreignField: "_id",
                    as: "product"
                }
            },

            {
                $addFields: {
                    product: { $arrayElemAt: ["$product", 0]}
                }
            },

            { $project:{
                quantity:1,
                productId:"$product._id",
                title:"$product.title",
                price:"$product.price",
                image: {$arrayElemAt: ["$product.images", 0]}
            }}
        ]);

        res.status(200).json({
            wishlist: usersWishlist
        });

    } catch (error) {
       console.log(error);
       res.status(500).json({ message:"Something went wrong!!" }) ;
    }
});


app.get("/profile", checkAuth, (req, res) => {
    res.status(200).json({ message: req.user });
});

app.get("/logout", (req, res) => {
    res.cookie("jwt", "");
    res.status(200).json({ message: "Logged out!!" })
});

// use postman for free request thing instead of thunderclient 
// use form-data in body apply image as key and select file and then send

// const uploader = multer({
//     storage: multer.diskStorage({
//         filename:(req, file, cb)=>{
//             const randomNum = Math.floor(Math.random()*100000);
//             const currentDateTime = Date.now();
//             const fileName = `${randomNum}-${currentDateTime}${path.extname(file.originalname)}`;
//             cb(null, fileName);
//         },
//         destination: (req, file, cb) => {
//             console.log(file.mimetype);
//             if(file.mimetype.startsWith("image"));
//             cb(null, "./uploads");
//         }

//     }),

//     filefilter: (req, file, cb) => {
//         const allowedMimeTypes = ["image/png", "image/jpg", "image/jpeg"];
//         if(!allowedMimeTypes.includes(file.mimetype))
//             return cb(new multer.MulterError("Only JPG, PNG and JPEG images are allowed."));
//         cb(null, true)
//     }
// });

// app.post("/profileimage", uploader.single("image"), async (req, res)=>{
// try{
// if(!req.file)
//     return res.status(400).json({message:"Could not upload file!!"});
// console.log(req.file);

// const uploadedFilePath = req.file.path;
// const type = await fileTypeFromFile(uploadedFilePath);
// const allowedMimeTypes = ["image/png", "image/jpg", "image/jpeg"];

// if(!allowedMimeTypes.includes(type.mime)){
//     await fs.unlink(uploadedFilePath);
//     res.status(400).json({message:"Only PNG, JPG and JPEG images are allowed!"});

//     return;
// }

// res.status(200).json({message: "file uploaded!!!"})
// }catch(error){

// }
// })

app.use("/image", express.static("./uploads"));

const uploader = multer({
    storage: multer.memoryStorage()
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,

});

function uploadToCloud(fileBuffer) {
    return new Promise((res, rej) => {
        //Upload to cloudinary
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "profile",
                resource_type: "image",
            },

            (error, result) => {
                if (error) rej(error);
                else res(result);
            }
        );
        // image is not sent as a whole object sent through small bytes in ram through pipe
        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    })
}

app.post("/profile", checkAuth, uploader.single("image"), async (req, res) => {
    try {

        if (!req.file)
            throw new Error();

        const allowedMimeTypes = ["image/jpg", "image/jpeg", "image/png"];

        const filetype = await fileTypeFromBuffer(req.file.buffer);
        if (!allowedMimeTypes.includes(filetype.mime)) {
            return res.status(400).json({ message: "Only JPG, PNG and JPEG images are allowed..." })
        }

        const result = await uploadToCloud(req.file.buffer);
        req.user.profile = result.url;
        await req.user.save();
        res.status(200).json({ message: req.user });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something went wrong!!" });

    }
});

// const transporter = nodemailer.createTransport({
//     service:"gmail",
//     auth:{
//        user:"vaibhavisharma.sv2527@gmail.com",
//        pass: 
//     }
// })

// app.post("/contact")

app.get("/products", async (req, res) => {
    try {
        const { q, category } = req.query;

        const ogani = mongoose.connection.db;
        const products = await ogani.collection("products").find({ title: { $regex: q || "", $options: "i" }, category: { $regex: category || "", $options: "i" } }).toArray();
        const categories = await ogani.collection("products").distinct("category");

        res.status(200).json({ products, categories });

    } catch (error) {
        console.log(error);

    }

});


app.get("/product/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const ogani = mongoose.connection.db;
        const product = await ogani.collection("products").findOne({ _id: new mongoose.Types.ObjectId(id) });
        res.status(200).json({ product });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Something went wrong!" });
    }
});



app.use((error, req, res, next) => {

    // Global Error Handling Middleware

    if (error instanceof MulterError) {
        return res.status(400).json({ message: error.code });
    }

    console.log(error)

    res.status(500).json({ message: "Something went wrong!" });

});


app.listen(process.env.PORT, () => console.log(`http://localhost:${process.env.PORT}/`));



