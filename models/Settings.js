import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({ // שמירה של הבאנר המתחלף באתר
    announcement: {
        en: { type: String, default: "🔥 Welcome to our Restaurant! 🔥" },
        he: { type: String, default: "🔥 ברוכים הבאים למסעדה שלנו! 🔥" }
    }
}, { timestamps: true });


const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;