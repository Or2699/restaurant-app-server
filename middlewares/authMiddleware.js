import jwt from 'jsonwebtoken';
import User from '../models/User.js';


//בודק שיש טוקן תקין בבקשה (מוודא שהמשתמש מחובר) - הגנה על נתיבים 
export const protect = async (req , res , next) => {
    let token;

    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        try {
            token = req.headers.authorization.split(' ')[1]; //// לוקח את הטוקן (הוא מגיע בפורמט "Bearer <TOKEN>")
            const decoded = jwt.verify(token , process.env.JWT_SECRET); // בודק שהטוקן תקין ומפענח אותו
            req.user = await User.findById(decoded.id).select('-password'); 
            console.log("This is the user on the request:", req.user);
            next();
        }
        
        catch (err) {
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if(!token){
        res.status(401).json({ message: 'Not authorized, no token' });
    }
}


// פונקציה שבודקת אם המשתמש הוא אדמין
export const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};