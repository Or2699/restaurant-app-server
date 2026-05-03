import express from 'express';
import Order from '../models/Order.js';
import { protect , admin } from '../middlewares/authMiddleware.js';


const router = express.Router();

// יצירת הזמנה חדשה - פתוח לכל משתמש מחובר עם טוקן זמין ותקף 
router.post('/', protect, async (req, res) => {
    try {
        const {  items ,  totalPrice , tableNumber,  paymentMethod , isPaid } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No items in order' });
        }

        const order = new Order({ user: req.user._id , items , totalPrice , tableNumber , paymentMethod , isPaid: isPaid || false , paidAt: isPaid ? Date.now() : null , status: 'pending'});
        const createdOrder = await order.save();
        res.status(201).json(createdOrder);
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
});


//קבלת כל ההזמנות (רק למנהל/מלצר)
router.get('/', protect, admin, async (req, res) => {
    try {
        const orders = await Order.find({})
            .populate('user', 'fullName email')
            .populate('items.product', 'name price');  // שומר את הפרטים מהדאטא בייס המקורי 
            
        res.json(orders);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});



// עדכון סטטוס הזמנה (רק לאדמין)
router.patch('/:id/status' , protect , admin , async (req,res) => {  //יכולנו לרשום בנתיב גם רק נקודותיים איידי זה סתם כדי להבהיר שזה מזהה של הזמנה ספציפית עם הסטטוס שלה 
    try {
        const {status} =  req.body ;
        const allowedStatuses = ['pending', 'preparing', 'served', 'paid', 'cancelled'];
        if(!allowedStatuses.includes(status))
            return res.status(400).json({ message: 'Invalid status' });

        const order = await Order.findById(req.params.id);
        if(!order)
            return res.status(404).json({ message: 'Order not found' });

        order.status = status; //ההזמנה כן נמצאה ונעדכן לה את הסטטוס 
        const updatedOrder = await order.save();
        res.json(updatedOrder);
        
    } 
    catch (err) {
        res.status(500).json({ message: err.message });
    }
}) ;



// קבלת הזמנות פעילות בלבד - שולחנות פעילים 
router.get('/active' , protect , async (req,res) => {
    try {
        const activeOrders = await Order.find({status: { $in: ['pending', 'preparing', 'served']}})
        .populate('user', 'fullName')
        .populate('items.product', 'name') // מושך את שם המנה
        .sort({ createdAt: -1 }); // הכי חדש מופיע ראשון

        res.json(activeOrders);


    } 
    catch (err) { res.status(500).json({ message: err.message }); }
});


export default router;