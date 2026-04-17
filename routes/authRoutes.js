import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';



const router = express.Router();

// Register - נתיב להרשמה 
router.post('/register' , async (req , res) => {
   try {
     const {fullName , email , password , phone , role } = req.body;
     const userExists = await User.findOne({email});
      if(userExists) { // בדיקה אם המשתמש כבר קיים
        return res.status(400).json({message: 'User already exists'});
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password , salt);
      const user = await User.create ({ fullName , email , password : hashedPassword , phone , role });

      let responseMessage = 'נרשמת בהצלחה!';
      if (role === 'waiter' || role === 'admin') {
          responseMessage = 'נרשמת בהצלחה! חשבונך ממתין לאישור מנהל.';
      }
      res.status(201).json({message: responseMessage, userId: user._id });

   }
   catch (error) {
      res.status(500).json({message : error.message});
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
       return res.status(401).json({ message: "חשבונך ממתין לאישור מנהל" });
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

export default router;

