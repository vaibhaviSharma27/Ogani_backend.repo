import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import "dotenv/config";
import cookieParser from "cookie-parser";
import multer, { MulterError } from "multer";
import path from "path";
import { fileTypeFromFile, fileTypeFromBuffer } from "file-type";
import fs from "fs/promises";
import { v2 as cloudinary, } from "cloudinary";
import streamifier from "streamifier";
import { resolve } from "dns";
import nodemailer from "nodemailer";
import Razorpay from "razorpay";

mongoose.connect("mongodb://127.0.0.1:27017/ogani")
    .then(() => console.log("Connected to the ogani database."))
    .catch((err) => console.log(err))

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        // required:[true,"Name is required"],
        minlength: [3, "Name must contain atleast 3 letters"]

    },
    email: {
        type: String,
        unique: true,
        required: [true, "Email is required"],
        validate: [(value) => {
            const pattern = /^[A-Za-z0-9._]+@[A-za-z]+\.[a-zA-Z]{2,}$/
            return pattern.test(value);

        }, "Please provide a valid email address!!"]

    },
    phone: {
        type: String,
        unique: true,
        validate: [(value) => {
            const pattern = /^(\+91\d{10}|\d{10})$/
            return pattern.test(value);
        }, "Please provide a valid phone number."]
    },
    password: {
        type: String,
        // validate:[(value)=>{
        //     const pattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[_$#])[A-Za-z0-9_$#]{8,20}$/;
        //     return pattern.test(value);

        // }, "Please provide a valid password."]
    },
    address: {
        type: String,
        required: [true, "Address is required."]
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


const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

// custom validation message  ====
// hashing - password hash  --
// login
// jwt tokens ---
// profile

// Mongo--Senitize

app.post("/signup", async (req, res) => {
    try {

        let { name, email, phone, password, address } = req.body;
        console.log(name, email, address)
        password = await bcrypt.hash(password, 12);
        // console.log(name, email, phone, password);

        const createdUser = await User.create({ name, email, phone, password, address });
        if (!createdUser)
            throw new Error("Could not process your request at the moment.")

        res.status(201).json({ message: createdUser });

    } catch (error) {
        if (error.name == "ValidationError") {
            let fields = Object.keys(error.errors);
            const messages = fields.map(field => error.errors[field].message)

            res.status(400).json({ message: messages });
        }
        else if (error.code == 11000) {
            const errObj = error.keyValue;
            const field = Object.keys(errObj)[0];
            const value = errObj[field];

            res.status(400).json({ message: `The ${field} ${value} has already been taken!` })

        }
        else {
            res.status(500).json({ message: error.message })
        }
    }

});

app.post("/login", async (req, res) => {
    try {
        // npm install dotenv

        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user)
            throw new Error("Invalid Credentials!");


        const correctPass = await bcrypt.compare(password, user.password);

        if (!correctPass)
            throw new Error("Invalid Credentials!");

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "90d" });
        res.cookie("jwt", token, { maxAge: 90 * 24 * 60 * 60 * 1000, httpOnly: true });
        res.status(200).json({ message: "logged in!", token });

    } catch (error) {
        console.log(error)
        // data and hash values are required!!!
        res.status(400).json({ message: error.message });

    }

});


async function checkAuth(req, res, next) {
    // middleware
    try {
        const token = req.cookies.jwt;
        if (!token)
            return res.status(401).json({ message: "Please login!" });

        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const userId = payload.userId;
        const user = await User.findById(userId);
        if (!user) {
            // clear the cookie
            throw new Error("You should not be here!");
        }

        req.user = user;
        next();

    } catch (error) {
        if (error.name == "JsonWebTokenError" || error.name == "TokenExpiredError") {
            res.cookie("jwt", "", { maxAge: 1000 });
            return res.status(401).json({ message: "You should not be here!" });
        }
        res.status(500).json({ message: "Something went wrong!" });
        console.log(error);
    }
}

app.post("/cart", checkAuth, async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.user._id;

        console.log(productId, userId, quantity);
        const newCartItem = await Cart.create({
            productId: new mongoose.Types.ObjectId(productId),
            quantity,
            userId,
        });
        res.status(200).json({ message: newCartItem });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong!" });
    }
});

app.get("/cart", checkAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        const cartItems = await Cart.aggregate([
            {$match: {userId}},

            {$lookup: {
                from : "products",
                localField: "productId",
                foreignField: "_id",
                as: "product"
            }},

            {$addFields: {
                product: {$arrayElemAt: ["$product", 0]}
            }},

            {$project: {
                quantity: 1,
                price: "$product.price",
                title: "$product.title",
                image: {$arrayElemAt: ["$product.images", 0]}
            }}

            
        ]);


        /*
            {$project: {
                quantity: 1,
                title: {$arrayElemAt: ["$product.title", 0]},
                image: {$arrayElemAt: [{$arrayElemAt: ["$product.images", 0]}, 0]}
            }}
        
        */
        res.status(200).json({message: cartItems});
    } catch (error) {
        console.log(error.message)
        res.status(500).json({ message: "Something went wrong!" });
    }
});
// ####################################### START PAYMENT

const rzpay = new Razorpay({
    key_id: process.env.RAZ_API_KEY,
    key_secret: process.env.RAZ_KEY_SECRET
});    // just like setting up transport on nodemailer for sending email

app.get("/orders", async (req,res) => {
    try {
        const order = await rzpay.orders.create({
            currency:"INR",
            amount:100*100, // amount is generally calculated in paise for indian rupees
            receipt: "receipt_"+Math.floor(Math.random()*1000)+"-"+Math.floor(Math.random()*1000)
        });

        res.status(200).json({message : order});
    } catch (error) {
        console.log(error);
        res.status(500).json({message: "Something went wrong!!"})
    }
});

//############################################ END PAYMENT



app.get("/profile", checkAuth, (req, res) => {
    res.status(200).json({ message: req.user });
});

app.get("/logout", (req, res) => {
    res.cookie("jwt", "");
    res.status(200).json({ message: "Logged out!" })
})


// logout

// npm install multer

/*
1. single files
2. multiple files
3. filename
4. filefilter
5. limit
*/

// const uploader = multer({
//     storage: multer.diskStorage({
//         filename: (req, file, cb) => {
//             const randomNum = Math.floor(Math.random() * 100000);
//             const currentDateTime = Date.now();
//             const fileName = `${randomNum}-${currentDateTime}${path.extname(file.originalname)}`;
//             cb(null, fileName);
//         },
//         destination: (req, file, cb) => {
//             // console.log(file.mimetype);
//             // if(file.mimetype.startsWith("image"))
//             cb(null, "./uploads");
//         }
//     }),

//     fileFilter: (req, file, cb) => {
//         const allowedMimeTypes = ["image/png", "image/jpg", "image/jpeg"];
//         if (!allowedMimeTypes.includes(file.mimetype))
//             return cb(new multer.MulterError("Only JPG, PNG and JPEG images are allowed"));
//         cb(null, true);
//     }
// });



// app.post("/profileimage", checkAuth, uploader.single("image"), async (req, res) => {
//     try {
//         if (!req.file)
//             return res.status(400).json({ message: "Could not upload file!" });
//         console.log(req.file);
//         const uploadedFilePath = req.file.path;
//         const type = await fileTypeFromFile(uploadedFilePath);
//         const allowedMimeTypes = ["image/png", "image/jpg", "image/jpeg"];
//         if (!allowedMimeTypes.includes(type.mime)) {
//             await fs.unlink(uploadedFilePath);
//             res.status(400).json({ message: "Only PNG, JPG and JPEG images are allowed!" });
//             return;
//         }


//         const fileName = req.file.filename;
//         req.user.profile = fileName;
//         await req.user.save();
//         res.status(200).json({ message: "Profile image updated!" });
//     } catch (error) {
//         res.status(500).json({ message: "Something went wrong!" });
//     }
// });


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

        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    })
}

app.post("/profile", checkAuth, uploader.single("image"), async (req, res) => {
    try {

        if (!req.file)
            throw new Error();

        const allowedMimeTypes = ["image/jpg", "image/jpeg", "image/png"];

        const filetype = await fileTypeFromBuffer(req.file.buffer)
        if (!allowedMimeTypes.includes(filetype.mime)) {
            return res.status(400).json({ message: "Only JPG, PNG and JPEG images are allowed!" })
        }



        const result = await uploadToCloud(req.file.buffer);
        // Upload to cloudinary:

        // const uploadStream = cloudinary.uploader.upload_stream(
        //     {
        //         folder:"profile",
        //         resource_type: "image",
        //     },

        //     (error, result) => {
        //         if (error) console.log(error);
        //         else console.log(result);
        //     }
        // );

        // streamifier.createReadStream(req.file.buffer).pipe(uploadStream);

        req.user.profile = result.url;
        await req.user.save();
        res.status(200).json({ message: req.user });

    } catch (error) {
        res.status(500).json({ message: "Something went wrong!" });
    }

});

app.get("/products", async (req, res) => {
    try {
        const {q, category} = req.query;
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
        console.log(error);
        res.status(500).json({ message: "Something went wrong!!" });
    }
});

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "vaibhavisharma.sv2527@gmail.com",
        pass: "ynoi gpzs uqwf mzpn"
    }
});

app.post("/contact", async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;


        const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Customer Query Received</title>
</head>
<body style="margin:0; padding:0; background-color:#faf7f7; font-family:Arial, Helvetica, sans-serif;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#faf7f7; padding:30px 0;">
    <tr>
        <td align="center">

            <!-- Main Container -->
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:#ffffff; border:1px solid #f0d7d7;">

                <!-- Header -->
                <tr>
                    <td style="background-color:#d32f2f; padding:25px 30px;">
                        <h1 style="margin:0; color:#ffffff; font-size:26px; font-weight:bold;">
                            🚨 New Customer Query Received
                        </h1>
                    </td>
                </tr>

                <!-- Alert Banner -->
                <tr>
                    <td style="padding:20px 30px; background-color:#fff5f5; border-bottom:1px solid #f0d7d7;">
                        <p style="margin:0; color:#b71c1c; font-size:16px; font-weight:bold;">
                            Action Required: Please review and respond within 24 hours.
                        </p>
                    </td>
                </tr>

                <!-- Content -->
                <tr>
                    <td style="padding:30px;">

                        <p style="margin-top:0; color:#333333; font-size:15px; line-height:1.6;">
                            A new contact form submission has been received and requires attention from the support team.
                        </p>

                        <!-- Customer Details -->
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #f2dede; background-color:#fcfcfc;">
                            <tr>
                                <td style="padding:20px;">

                                    <p style="margin:0 0 12px; color:#333333;">
                                        <strong>Customer Name:</strong>${name}
                                    </p>

                                    <p style="margin:0 0 12px; color:#333333;">
                                        <strong>Email Address:</strong> ${email}
                                    </p>

                                    <p style="margin:0 0 12px; color:#333333;">
                                        <strong>Subject:</strong> ${subject}
                                    </p>

                                    <p style="margin:0; color:#333333;">
                                        <strong>Message:</strong><br><br>
                                        ${message}
                                    </p>

                                </td>
                            </tr>
                        </table>

                        <!-- SLA Section -->
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:25px; background-color:#fff5f5; border-left:4px solid #d32f2f;">
                            <tr>
                                <td style="padding:18px;">
                                    <p style="margin:0; color:#b71c1c; font-size:15px; line-height:1.6;">
                                        <strong>SLA Deadline:</strong> A response and/or solution must be provided to the customer within <strong>24 hours</strong> of receiving this query.
                                    </p>
                                </td>
                            </tr>
                        </table>


                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td style="padding:20px 30px; background-color:#fafafa; border-top:1px solid #eeeeee;">

                        <p style="margin:0; color:#666666; font-size:13px; text-align:center;">
                            This is an automated notification generated from the contact form system.
                        </p>

                    </td>
                </tr>

            </table>

        </td>
    </tr>
</table>

</body>
</html>

`
        const reassurance = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>We've Received Your Inquiry</title>
</head>
<body style="margin:0; padding:0; background-color:#f5faf5; font-family:Arial, Helvetica, sans-serif;">

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5faf5; padding:30px 0;">
        <tr>
            <td align="center">
                
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #d8ead8;">
                    
                    <!-- Header -->
                    <tr>
                        <td align="center" style="background-color:#dff3df; padding:30px;">
                            <h1 style="margin:0; color:#2f6b2f; font-size:28px;">
                                Thank You for Contacting Us
                            </h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:40px 35px;">
                            
                            <p style="margin:0 0 20px; color:#333333; font-size:16px; line-height:1.6;">
                                Hi <strong>${name}</strong>,
                            </p>

                            <p style="margin:0 0 20px; color:#555555; font-size:16px; line-height:1.6;">
                                We have successfully received your inquiry and our team is currently reviewing the details you submitted.
                            </p>

                            <!-- Submitted Details -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fcf8; border:1px solid #dff0df; border-radius:8px;">
                                <tr>
                                    <td style="padding:20px;">
                                        <p style="margin:0 0 10px; color:#333333;">
                                            <strong>Name:</strong> ${name}
                                        </p>

                                        <p style="margin:0 0 10px; color:#333333;">
                                            <strong>Email:</strong> ${email}
                                        </p>

                                        <p style="margin:0 0 10px; color:#333333;">
                                            <strong>Subject:</strong> ${subject}
                                        </p>

                                        <p style="margin:0; color:#333333;">
                                            <strong>Message:</strong><br>
                                            ${message}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:25px 0 15px; color:#555555; font-size:16px; line-height:1.6;">
                                Our support team will carefully review your request and get back to you within <strong>24 hours</strong>.
                            </p>

                            <p style="margin:0 0 20px; color:#555555; font-size:16px; line-height:1.6;">
                                We are committed to providing a solution or the next steps regarding your inquiry within the same <strong>24-hour timeframe</strong>.
                            </p>

                            <p style="margin:0; color:#555555; font-size:16px; line-height:1.6;">
                                Thank you for your patience and for reaching out to us.
                            </p>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="background-color:#f7fbf7; padding:25px; border-top:1px solid #e4f0e4;">
                            <p style="margin:0; color:#6b6b6b; font-size:14px;">
                                Best Regards,<br>
                                <strong> Ogani's Support Team </strong>
                            </p>
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>
`


        await transporter.sendMail(
            {
                to: "aishabanod.61007@gmail.com",
                from: "vaibhavisharma.sv2527@gmail.com",
                subject: "Query received from customer",
                html: template

            }
        )



        await transporter.sendMail({
            to: `${email}`,
            from: "vaibhavisharma.sv2527@gmail.com",
            subject: "Reassurance Mail",
            html: reassurance

        });

        console.log("Email sent!!")


        res.status(200).json({ message: "Task accomplished!!" });
    } catch (error) {
        console.log(error, "from here");
        res.status(500).json({ message: "Something went wrong..." })
    }
});




app.use((error, req, res, next) => {

    // Global Error Handling Middleware

    if (error instanceof MulterError) {
        return res.status(400).json({ message: error.code });
    }

    res.status(500).json({ message: "Something went wrong!" });

});

app.listen(process.env.PORT, () => console.log(`http://localhost:${process.env.PORT}/`));

