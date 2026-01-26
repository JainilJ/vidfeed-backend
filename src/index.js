import dotenv from "dotenv";
import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";   
import connectDB from "./db/index.js";
import {app} from "./app.js";

dotenv.config({
    path: "./env",
});


connectDB()
.then(()=>{
    app.listen(process.env.PORT || 3000, ()=>{
        console.log(`\n SERVER STARTED AT PORT: ${process.env.PORT} \n`);
    })
})
.catch((err)=>console.error("Error in initial DB connection:", err));