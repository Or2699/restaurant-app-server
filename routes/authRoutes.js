import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { protect, admin } from '../middlewares/authMiddleware.js'; 


const router = express.Router();

// Register - נתיב להרשמה 
router.post('/register' , async (req , res) => {
   try {
     const {fullName , email , password , phone , role , hourlyWage } = req.body;
     const userExists = await User.findOne({email});
      if(userExists) { // בדיקה אם המשתמש כבר קיים
        return res.status(400).json({message: 'User already exists'});
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password , salt);
      const user = await User.create ({ fullName , email , password : hashedPassword , phone , role , hourlyWage: hourlyWage || (role === 'waiter' ? 35 : (role === 'waiter') ? 50 : 0) }); 

     let responseKey = 'reg_success_customer';
     if (role === 'waiter' || role === 'admin') {
         responseKey = 'reg_success_pending';
     }
      res.status(201).json({messageKey: responseKey, userId: user._id });

   }
   catch (error) {
      console.error("Register Error:", error);
      res.status(500).json({messageKey : error.messageKey});
   }
})



//התחברות
router.post('/login' , async (req,res) => {
  try {
    const {email , password} = req.body;
    const user = await User.findOne ({email});

    if(!user){
      return res.status(400).json({message: 'Invalid email or password , user not found'});
    }

     if (!user.isApproved) {
       return res.status(401).json({ message: "auth_pending_approval" }); //חשבונך ממתין לאישור מנהל 
     }

    const isMatch = await bcrypt.compare(password , user.password);
    if(!isMatch)
      return res.status(400).json({ message: 'Invalid email or password' });

    const token = jwt.sign({id : user._id , role : user.role} , process.env.JWT_SECRET , { expiresIn: '30d' }); //המידע שנשמר בתוך הטוקן יצירת הטוקן והפוגתו בתום 30 יום 
    res.json({token , user :{id : user._id , fullName : user.fullName , email : user.email , phone : user.phone , role : user.role}});
  }
  catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// עדכון כניסה/יציאה ממשמרת
router.patch('/toggle-shift/:id' , async(req,res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if(!user.isOnline){
      user.isOnline = true;
      user.lastShiftStart = new Date(); // שמירת זמן התחלת המשמרת שזה עכשיו 
      user.currentShiftTables = 0 ;
    }

    else{ // יציאה ממשמרת - חישוב שכר ובונוסים 
      const hours = (new Date() - new Date(user.lastShiftStart)) / (1000 * 60 * 60);
      let bonus = 0;
      if (hours >= 10) bonus += 50; 
      if (user.currentShiftTables >= 10) bonus += 30; 
      user.monthlyEarnings += (hours * user.hourlyWage) + bonus;
      user.totalBonuses += bonus;
      user.isOnline = false;
    }

    await user.save();
    res.json({ success: true, isOnline: user.isOnline });
   } catch (error) {
     res.status(500).json({ message: error.message });
  }
});


// נתיב לקבלת כל העובדים הפעילים (למנהל)
router.get('/active-staff', async (req, res) => {
    try {
        const staff = await User.find({ role: { $ne: 'customer' }, isOnline: true }).select('fullName role hourlyWage lastShiftStart currentShiftTables monthlyEarnings totalBonuses');
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// קבלת כל העובדים שממתינים לאישור (רק למנהל)
router.get('/pending-staff' , protect , admin , async (req,res)=>{
  try {
    const pendingStaff = await User.find({role : {$ne :'customer'} , isApproved: false})
                                   .select('-password');
    res.json(pendingStaff);
  } 
  catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// אישור או דחייה של עובד (רק למנהל)
router.patch('/approve-staff/:id', protect, admin, async (req, res) => {
    try {
        const { isApproved } = req.body;
        if (isApproved === false) {
            await User.findByIdAndDelete(req.params.id);
            return res.json({ success: true, message: 'User rejected and deleted' });
        }

        const updatedUser = await User.findByIdAndUpdate( req.params.id, { isApproved: true }, { new: true }).select('-password');
        res.json({ success: true, user: updatedUser });
    } 
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// משיכת כל העובדים המאושרים 
router.get('/all-staff', protect, admin, async (req, res) => {
    try {
        const staff = await User.find({ role: { $ne: 'customer' }, isApproved: true }).select('-password');
        res.json(staff);
    } 
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// עדכון שכר שעתי לעובד ספציפי
router.patch('/update-wage/:id', protect, admin, async (req, res) => {
    try {
        const { hourlyWage } = req.body;
        const updatedUser = await User.findByIdAndUpdate( req.params.id,{ hourlyWage: Number(hourlyWage) }, { new: true } // מחזיר את המשתמש המעודכן אחרי השמירה
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ success: true, user: updatedUser });
    } 
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// הוספת בונוס נקודתי לעובד
router.patch('/add-bonus/:id', protect, admin, async (req, res) => {
    try {
        const { bonusAmount } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.totalBonuses += Number(bonusAmount);
        user.monthlyEarnings += Number(bonusAmount); 
        await user.save();

        res.json({ success: true, user: user });
    } 
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// תשלום לכולם (איפוס נתונים ושמירה להיסטוריה)
router.post('/reset-wages', protect, admin, async (req, res) => {
    try {
        const staff = await User.find({ role: { $ne: 'customer' }, isApproved: true });

        for (let user of staff) {
            const payoutRecord = {
                date: new Date(),
                amount: user.monthlyEarnings,
                bonuses: user.totalBonuses,
                tablesServed: user.currentShiftTables
            };

            await User.findByIdAndUpdate(user._id, { $push: { payoutHistory: payoutRecord }, $set: { monthlyEarnings: 0, totalBonuses: 0, currentShiftTables: 0 }});
        }

        const updatedStaff = await User.find({ role: { $ne: 'customer' }, isApproved: true }).select('-password'); // משיכת הנתונים המעודכנים אחרי האיפוס
        res.json({ success: true, staff: updatedStaff });
    } 
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});



export default router;

