import mongoose from 'mongoose'; 

const mongodbUri = process.env.MONGODB_URI as string 
const mongodbName = process.env.MONGODB_NAME as string

if(!mongodbUri) {
    throw new Error("MongoDB URI not set")
}
if(!mongodbName){
    throw new Error("MongoDB name not set")
}

export default async function connectDb () {
    try {
        await mongoose.connect(mongodbUri, { dbName : mongodbName})
        console.log("DATABASE CONNECTION SUCCESSFUL")
        return true
    } catch(err) {
        console.error("DATABASE CONNECTION FAILED:", err)
        throw err // Re-throw the error so it can be caught by error monitoring
    }
}
