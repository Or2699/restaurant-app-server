import express from 'express';
import Order from '../models/Order.js';
import { protect , admin } from '../middlewares/authMiddleware.js';
import User from '../models/User.js';


const router = express.Router();

// יצירת הזמנה חדשה או הוספה להזמנה קיימת - פתוח לכל משתמש מחובר עם טוקן זמין ותקף 
router.post('/', protect, async (req, res) => {
    try {
        const {  items ,  totalPrice , tableNumber,  paymentMethod , isPaid } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No items in order' });
        }

        const existingOrder = await Order.findOne({ tableNumber, status: { $ne: 'paid' } }); // $ne - not equal 

        if (existingOrder) {
            existingOrder.items.push(...items);
            existingOrder.totalPrice += totalPrice;
            existingOrder.status = 'pending'; 
            const updatedOrder = await existingOrder.save();
            return res.status(200).json(updatedOrder); 
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



// עדכון סטטוס של הזמנה ספיציפית 
router.patch('/:id/status' , protect , async(req , res) => {
    try {
        const { status } = req.body;
        const orderToUpdate = await Order.findById(req.params.id);
        if (!orderToUpdate) 
            return res.status(404).json({ message: 'Order not found' });
        
        if (status === 'paid' && orderToUpdate.status !== 'paid') {
            if (orderToUpdate.user) {
                const waiterId = orderToUpdate.user._id || orderToUpdate.user;
                await User.findByIdAndUpdate(waiterId, { $inc: { currentShiftTables: 1 } });
                console.log(" הוספנו שולחן למלצר:", waiterId);
            }
        }

        orderToUpdate.status = status;
        await orderToUpdate.save();

        const updatedOrder = await Order.findById(req.params.id)
            .populate('user', 'fullName')
            .populate('items.product', 'name');
    
        res.json(updatedOrder);
    } 
    catch (err) { res.status(500).json({ message: err.message }); }
});


export default router;