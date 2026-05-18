import express from 'express';
import Settings from '../models/Settings.js';
import { protect, admin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// קבלת ההודעה הרצה של הבאנר 
router.get('/announcement' ,  async (req,res) => {
    try {
        let settings = await Settings.findOne();
        if(!settings)
            settings = await Settings.create({});

        res.json(settings.announcement);
    } 
    catch (err) { res.status(500).json({ message: err.message }); }
});


// עדכון ההודעה הרצה של הבאנר (רק למנהל)
router.patch('/announcement' , protect , admin , async(req ,res) => {
    try {
        const { announcement_en, announcement_he } = req.body;
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({ announcement: { en: announcement_en, he: announcement_he } });
        } 
        else {
            if (announcement_en) settings.announcement.en = announcement_en;
            if (announcement_he) settings.announcement.he = announcement_he;
            await settings.save();
        }
        res.json(settings.announcement);
    } 
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});


export default router;







