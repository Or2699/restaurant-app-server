import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';

dotenv.config(); //טעינת הפרטים מהקובץ .env
const app = express(); // יצירת אפליקציית אקספרס
app.use(cors()); // מאפשר לאפליקציה לדבר עם השרת
app.use(express.json()); // מאפשר לשרת לקרוא מידע בפורמט JSON

app.get('/' , (req,res) =>{
    res.send('Restaurant API is running..');
})

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

const PORT = process.env.PORT || 3020;

app.listen(PORT , ()=>{
    connectDB();
    console.log(`Server running on http://localhost:${PORT}`);
})

