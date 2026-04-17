import express from 'express';
import Product from '../models/Product.js';
import {protect , admin} from '../middlewares/authMiddleware.js';

const router = express.Router();

// להשיג את כל הפריטים / מוצרים  
router.get('/' , async (req , res) => {
    try {
        const products = await Product.find({});
        res.json(products);
    }
    catch (err){
        res.status(500).json({ message : err.message});
    }
});



// הוספת מנה רק על ידי המנהל 
router.post('/' , protect , admin , async (req , res) =>{
    try {
        const { name , description , price , category, image, tags } = req.body;
        const newProduct = new Product ({ name , description , price , category, image, tags });
        const saveProduct = await newProduct.save();
        res.status(201).json(saveProduct);
    } 
    catch (err) {
        res.status(400).json({ message : err.message });
    }
});


// עדכון מנה (רק מנהל)
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true } // מחזיר את האובייקט החדש אחרי העדכון
        );
        res.json(updatedProduct);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// מחיקת מנה (רק מנהל)
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


export default router;



