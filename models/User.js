import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    fullName : { type : String , required : true} ,
    email: { type: String , required: true, unique: true } , // מונע הרשמה כפולה עם אותו אימייל
    password: { type: String , required: true } ,
    phone: { type: String , required: true } ,
    role: { type: String , enum: ['customer', 'waiter', 'admin'], default: 'customer' } , //הרשאת גישה - לפי סוג המשתמש 
    hourlyWage: { 
        type: Number, 
        default: function() {
            if (this.role === 'waiter') return 35;
            if (this.role === 'admin') return 60;
            return 0; 
        }
    },
    monthlyEarnings: { type: Number, default: 0 },
    totalBonuses: { type: Number, default: 0 } ,
    payoutHistory: { type: Array, default: [] }, // שמירת היסטוריית משכורות
    currentShiftTables: { type: Number, default: 0 }, // שולחנות למשמרת הנוכחית
    createdAt: { type: Date, default: Date.now } ,// תאריך הצטרפות אוטומטי
    isApproved: { type: Boolean, default: function() { return this.role === 'customer'; }}, // לקוח מאושר אוטומטית, עובד לא
    isOnline: { type: Boolean, default: false }, // האם העובד כרגע במשמרת
    lastShiftStart: { type: Date }, // מתי התחילה המשמרת האחרונה
    shiftHistory: { type: Array, default: [] }, // היסטוריית משמרות עם פרטים כמו תאריך, שעות עבודה, בונוסים שהתקבלו וכו
});

const User = mongoose.model('User', userSchema); //יצירת המודל מתוך הסכימה 

export default User;