const mongoose = require("mongoose");
const dns =require("dns");
dns.setServers(['1.1.1.1','8.8.8.8']);
require("dotenv").config();
const connectdb =async()=>{
    try{
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Mongodb connected");
        }
        catch(error){
            console.log(`errorconnecting db:${error.message};`)
        }        
};

module.exports=connectdb;