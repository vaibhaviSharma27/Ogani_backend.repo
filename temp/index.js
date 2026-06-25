// import crypto from "crypto";

// let message = "Hey Akanksha! Please pay him 500 INR only."

// const hash = crypto.createHmac("sha256", "mysecretpassword")
// .update(message)
// .digest("hex");

// console.log(message, hash);


// import crypto from "crypto";
// const message = "Hey Akanksha! Please pay him 5000 INR only.";
// const hash = "3286306df1fe7a6570d07a8419f069d3ab5d4d4f5abca09f9a3dc60f6d276257"

// const expectedHash = crypto.createHmac("sha256", "mysecretpassword").update(message).digest("hex");

// if(expectedHash==hash){
//     console.log("Message is legitimate!");
// }else{
//     console.log("Message has been tempered with!");
// }

// bcrypt

// "a" => "apple"
// "a" => "apple"


// Rainbow table attack


// "a"+"apple"=> "klopiu.apple"
// "a"+"lkju"=> "asdsdasd.lkju"



//######################################################### Password hashing

// npm install bcrypt
import bcrypt from "bcrypt"

// const hashedPassword = await bcrypt.hash("12345678", 12);
// console.log(hashedPassword);

// // Brute-force attack =>  

// const hashedPassword = "$2b$12$K9dgoNk4qrascEAKcMxlxe7skZ68k7wrYCri52NX3eNP8Zh1mtTfi"
// const password = "1234567"

// const correctPasword = await bcrypt.compare(password, hashedPassword);
// console.log(correctPasword);


// ###################################### token


// "asdhgashdgjhsagdjgashdgjagsdhasgdjgasjhdgsjdgjshgdjasgdjhagsdhgasjdgjsagdjhagsjdggasjdgasjd"

// => valid or not
// => payload => message


// import jwt from "jsonwebtoken";

// distinguishing feature - secret key
// message - payload

// sign krna = cashier token deta hai
// server=> token ko verify => payload

// const token = jwt.sign({samose: 4, thumpsup: "20 wali"}, "secretkey", {expiresIn: "1d"});
// console.log(token);

// const token = "eyJhbGciOiJIUzI1NiIsIn5cCI6IkpXVCJ9.eyJzYW1vc2UiOjQsInRodW1wc3VwIjoiMjAgd2FsaSIsImlhdCI6MTc4MDQ4NDU4OSwiZXhwIjoxNzgwNTcwOTg5fQ._gt_STxGVXeFmvLgIgFEa89GvcoqFDxdcpFi4aWWgUo"

// try {
//     const payload = jwt.verify(token, "secretkey");
//     console.log(payload);
// } catch (error) {
//     if(error.name=="JsonWebTokenError"){
//         console.log("Invalid token!");
//     }
//     console.log(error.name)

//     // secret, expire
// }