// הגדרות של בסיס הנתונים
import mongoose from 'mongoose';

export const connectDB = async () =>{
   try {
     const conn = await mongoose.connect(process.env.MONGO_URL);
     console.log(`MongoDB Connected: ${conn.connection.host}`);
   }
    catch (err) {
        console.error('Error connecting to MongoDB:', err.message);
        process.exit(1); // סוגר את השרת אם החיבור נכשל
   }
}