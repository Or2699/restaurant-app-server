import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';



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

    user.isOnline = !user.isOnline;
    if (user.isOnline) {
        user.lastShiftStart = new Date(); // שמירת זמן התחלת המשמרת שזה עכשיו 
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
        const staff = await User.find({ role: { $ne: 'customer' }, isOnline: true }).select('fullName role hourlyWage lastShiftStart');
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


export default router;

