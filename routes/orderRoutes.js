import express from 'express';
import Order from '../models/Order.js';
import { protect , admin } from '../middlewares/authMiddleware.js';
import User from '../models/User.js';


const router = express.Router();

// יצירת הזמנה חדשה או הוספה להזמנה קיימת - פתוח לכל משתמש מחובר עם טוקן זמין ותקף 
router.post('/', protect, async (req, res) => {
    try {
        const {  items ,  totalPrice , tableNumber,  paymentMethod , isPaid , dinersCount } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No items in order' });
        }

        const existingOrder = await Order.findOne({ tableNumber, status: { $ne: 'paid' } }); // $ne - not equal 

        if (existingOrder) {
            const isCreator = existingOrder.user && String(existingOrder.user) === String(req.user._id);
            const isAssignedWaiter = existingOrder.assignedWaiter && String(existingOrder.assignedWaiter) === String(req.user._id);

            // if (existingOrder.user && String(existingOrder.user) !== String(req.user._id) && !req.user.isAdmin) {
            //     return res.status(400).json({ message: 'שולחן זה תפוס על ידי מלצר אחר' });
            // }
            if (!isCreator && !isAssignedWaiter && !req.user.isAdmin) {
                return res.status(400).json({ message: 'שולחן זה תפוס ואין לך הרשאה לערוך אותו' });
            }

            existingOrder.items.push(...items);
            existingOrder.totalPrice += totalPrice;
            if (dinersCount) existingOrder.dinersCount = dinersCount;
            existingOrder.status = 'pending'; 
            const updatedOrder = await existingOrder.save();
            return res.status(200).json(updatedOrder); 
        }

        const order = new Order({ user: req.user._id , items , totalPrice , tableNumber , dinersCount: dinersCount || 1 , paymentMethod , isPaid: isPaid || false , paidAt: isPaid ? Date.now() : null , status: 'pending', assignedWaiter: req.user.role === 'waiter' ? req.user._id : null });
        const createdOrder = await order.save();
        res.status(201).json(createdOrder);
    }
    catch (err) {
        console.error(" השגיאה המדויקת היא:", err); 
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
        .populate('user', 'fullName _id role')
        .populate('assignedWaiter', 'fullName _id') // מושכים את פרטי המלצר המטפל
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
            if (req.user.role === 'waiter' && !orderToUpdate.assignedWaiter) {
                orderToUpdate.assignedWaiter = req.user._id;
            }
            if (orderToUpdate.user) {
                //const waiterId = orderToUpdate.user._id || orderToUpdate.user;
                const waiterId = orderToUpdate.assignedWaiter;
                await User.findByIdAndUpdate(waiterId, { $inc: { currentShiftTables: 1 } });
                console.log(" הוספנו שולחן למלצר:", waiterId);
            }
        }

        console.log("Saving order:", req.params.id, "with status:", status);
        orderToUpdate.status = status;
        await orderToUpdate.save();
        console.log("Save result:", orderToUpdate);

        const updatedOrder = await Order.findById(req.params.id)
            .populate('user', 'fullName')
            .populate('items.product', 'name');
    
        res.json(updatedOrder);
    } 
    catch (err) { res.status(500).json({ message: err.message }); }
});


// קבלת היסטוריית ההזמנות - אלה שכבר שולמו עבור לוח הבקרה - נגיש רק למנהל 
router.get('/history' , protect , admin , async(req,res) => {
    try {
        const orders = await Order.find({status: 'paid'})
        .populate('user', 'fullName') // מביא את שם המלצר
        .populate('items.product', 'name price category') // מביא את פרטי המנה
        .sort({ createdAt: -1 });
           
        res.json(orders);
    } 
    catch (err) {
        console.error("Error fetching order history:", err);
        res.status(500).json({ message: 'Server error while fetching order history' });
    }
});



// עדכון מנות בתוך הזמנה פתוחה (מחיקת מנה/עריכה)
router.put('/:id/items', protect, async (req, res) => {
    try {
        const { items , totalPrice} = req.body;
        const orderToUpdate = await Order.findById(req.params.id);
        
        if (!orderToUpdate) 
            return res.status(404).json({ message: 'Order not found' });
        if (orderToUpdate.status !== 'pending') 
            return res.status(400).json({ message: 'Cannot edit an order that is already being prepared' });
        
        orderToUpdate.items = items;
        if (totalPrice !== undefined) 
            orderToUpdate.totalPrice = totalPrice; 
        
        await orderToUpdate.save();

        // שולפים מחדש את ההזמנה המעודכנת עם פרטי המנות והמלצר כדי שהאפליקציה לא תקרוס
        const updatedOrder = await Order.findById(req.params.id)
            .populate('user', 'fullName')
            .populate('items.product', 'name ');
        res.status(200).json(updatedOrder);
    } 
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// שיוך שולחן פתוח של לקוח למלצר (קח שולחן)
router.patch('/:id/assign', protect, async (req, res) => {
    try {
        const orderToUpdate = await Order.findById(req.params.id);
        if (!orderToUpdate) 
            return res.status(404).json({ message: 'Order not found' });
        if (orderToUpdate.assignedWaiter) 
            return res.status(400).json({ message: 'Table already claimed' });

        orderToUpdate.assignedWaiter = req.user._id;
        await orderToUpdate.save();

        res.json(orderToUpdate);
    } 
    catch (err) { 
        res.status(500).json({ message: err.message }); 
    }
});


// ביטול ומחיקת הזמנה שלמה (רק לממתינות)
router.delete('/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        
        if (!order) 
            return res.status(404).json({ message: 'Order not found' });
        
        
        // חסימת אבטחה אי אפשר למחוק הזמנה שכבר התחילו להכין או שהוגשה
        if (order.status !== 'pending') {
            return res.status(400).json({ message: 'You can only delete pending orders' });
        }

        await Order.findByIdAndDelete(req.params.id);
        res.json({ message: 'Order deleted successfully' });
    } 
    catch (err) { 
        res.status(500).json({ message: err.message }); 
    }
});



// קבלת היסטוריית הזמנות ששולמו עבור המלצר
router.get('/my-history', protect, async (req, res) => {
    try {
        const history = await Order.find({
            status: 'paid',
            assignedWaiter: req.user._id // מחזיר רק את השולחנות שהוא סגר
        }).sort({ createdAt: -1 });

        res.json(history);
    } 
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// קבלת כל ההזמנות של הלקוח המחובר (פעילות והיסטוריה) - לקוח ספיציפי 
router.get('/my-orders', protect, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .populate('assignedWaiter', 'fullName')
            .populate('items.product', 'name price image') 
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


export default router;