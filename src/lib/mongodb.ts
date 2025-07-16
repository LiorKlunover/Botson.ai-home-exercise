import mongoose from 'mongoose'; 

const mongodbUri = process.env.MONGODB_URI as string 
const mongodbName = process.env.MONGODB_NAME as string

if(!mongodbName) {
    throw new Error("Mongodb uri not set")
}
if(!mongodbName){
    throw new Error("Mongodb name not set")
}

export default async function connectDb () {
    try {
        mongoose.connect(mongodbUri, { dbName : mongodbName})
        console.log("DATABASE CONNECTION SUCCESSFUL")
    }catch(err){
        console.log(err)
    }
}
