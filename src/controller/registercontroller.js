const user = require("../models/usermodel")
const bcrypt = require("bcrypt")
exports.create = async(req,res)=>{
    try{
        const{name,email,password}= req.body
        const existinguser=await user.findOne({email});
        if(existinguser){
           return res.status(401).json({messsage:"useralready exist"})
        }

        const securepassword = await bcrypt.hash(password,10);
        const newuser= await user.create({
            name,email,
            password:securepassword
        })
        return res.status(200).json({message:"new user created"})
    }
   catch(error){
       console.log("registration failed:",error)
   }
}



exports.login = async(req,res)=>{
    try{
        const{email,password}= req.body

        const newuser = await user.findOne({email});
        console.log("checking the user email")
        if(!newuser){
            console.log("user not found")
            return res.status(401).json({message:"user not found"})
    }
       const match = await bcrypt.compare(password,newuser.password)
       console.log("password is match")
    if(!match){
        console.log("password is not match")
        return res.status(401).json({message:"invalid password"})

}
    return res.status(200).json({message:"login successfully"})
 
}
catch{

    return res.status(500).json({message:"server error happend"})

}}

