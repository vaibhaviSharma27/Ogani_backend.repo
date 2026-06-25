

// import crypto from "crypto";

// // creating a hash

// let message = "Wanna go shopping!!";

// const hash = crypto.createHmac("sha256", "secretmsg")
// .update(message)
// .digest("hex");

// // hex means--> a-f 0-9 characters only which can be readable by human and no characters including the ones which are non-humanly readable

// console.log(message, hash);

// const createdHash = 
// "1497dba3e2b9f4824376e7b3f4678061258699fe874d8a83fdff8ee70736d6be";

// const expectedHash = crypto.createHmac("sha256","secretmsg").update(message).digest("hex");

// if(expectedHash==createdHash){
//     console.log("Message is legitimate!!")
// }else{
//     console.log("Message has been tempered with!!")
// }

// import bcrypt from "bcrypt";

// const hashedPassword = await bcrypt.hash("987654321", 12);
// console.log(hashedPassword);

// const formedHash = "$2b$12$AOKBqQFmA.D66Yo1KPzO6Oxsp3JTG1YOLBVp7EIyKAXi/8qCT/Gk.";

// const password ="987654321";

// const correctPassword = await bcrypt.compare(password, formedHash);
// console.log(correctPassword);

import jwt from "jsonwebtoken";

// const token = jwt.sign({Dresses:7, books:5}, "secretkey" ,{expiresIn:"1d"});
// console.log(token);

const tokenAssigned = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJEcmVzc2VzIjo3LCJib29rcyI6NSwiaWF0IjoxNzgwNTYwMjgyLCJleHAiOjE3ODA2NDY2ODJ9.OxzDQ7KCzVHCJfBd25E5tnJGBxk_uldrXFmhySJJZwk";

try{
    const payload = jwt.verify(tokenAssigned,"secretkey");
    console.log(payload);

}catch(error){
    console.log(error.name);
}


