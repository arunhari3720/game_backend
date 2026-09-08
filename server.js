require("dotenv").config();
const connectdb = require("./src/config/dbconfig");
const app =require('./app')

const startserver = async()=>
{
    try{
         await connectdb();
         console.log("db connected");

         app.listen(process.env.PORT||8500,()=>{
            console.log(`port running in:${process.env.PORT||8500}` )
        });
       }
        catch(error){
            console.log(`port not  connected:${error.message}`);
         }
         };
module.exports= startserver();