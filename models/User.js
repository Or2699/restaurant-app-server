import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    fullName : { type : String , required : true} ,
    email: { type: String , required: true, unique: true } , // מונע הרשמה כפולה עם אותו אימייל
    password: { type: String , required: true } ,
    phone: { type: String , required: true } ,
    role: { type: String , enum: ['customer', 'waiter', 'admin'], default: 'customer' } , //הרשאת גישה - לפי סוג המשתמש 
    hourlyWage: { type: Number, default: 0 } ,
    totalBonuses: { type: Number, default: 0 } ,
    createdAt: { type: Date, default: Date.now } ,// תאריך הצטרפות אוטומטי
    isApproved: { type: Boolean, default: function() { return this.role === 'customer'; }}, // לקוח מאושר אוטומטית, עובד לא
    isOnline: { type: Boolean, default: false }, // האם העובד כרגע במשמרת
    lastShiftStart: { type: Date }, // מתי התחילה המשמרת האחרונה
});

const User = mongoose.model('User', userSchema); //יצירת המודל מתוך הסכימה 

export default User;