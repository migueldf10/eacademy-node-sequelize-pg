const express = require('express')
const order = require('../models/order')
const router = express.Router()
const Order = require('../models').order
const Course = require('../models').course
const LineItem = require('../models').lineItem
const Permission = require('../models').permission
const jwtCheck = require('../middlewares/auth')
const User = require('../models').user


const findOrCreateUser = async (authId) => {
	const userInDb = await User.findOrCreate({ where: { authId: authId } })
	return userInDb
}


// ********************************
// POST NEW ORDER
// ********************************

router.post('/', jwtCheck, async function (req, res, next) {
	const authId = req.user.sub
	const {
		cart,
		notes = '', } = req.body

	if (!authId || !cart || !cart.length > 0) {
		return res.status(401).send('sorry, you need to provide full order elements')
	}

	// Promise Creators
	const findEachCourse = async (courseId) => {
		return fetchedCourse = Course.findByPk(courseId)
	}
	const findCourses = async () => {
		return Promise.all(cart.map(product => findEachCourse(product.id)))
	}
	const createEachLineItem = async (lineItemObject) => {
		return createdLineItem = LineItem.create(lineItemObject)
	}
	const createLineItems = async (lineItemsObjects) => {
		return Promise.all(lineItemsObjects.map(lineItemObject => createEachLineItem(lineItemObject)))
	}

	// Action!
	try {
		const dirtyCourses = await findCourses()

		if (!dirtyCourses || dirtyCourses.includes(null)) {
			return res.status(401).send('Some IDS are not in the DB')
		}

		const courses = dirtyCourses.map(dirtyCourse => dirtyCourse.get({ plain: true }))

		const user = await findOrCreateUser(authId)
		const userId = user.id

		const newOrder = await Order.create({
			userId,
			price: courses.reduce((a, b) => a + b.price, 0),
			notes,
			state: 'draft'
		})

		const lineItemsObjects = courses.map(course => ({
			orderId: newOrder.id,
			lineItemPrice: course.price,
			courseId: course.id
		}))

		const createdLineItems = await createLineItems(lineItemsObjects)

		const orderCreatedWithLineItems = await Order.findByPk(newOrder.id, { include: [LineItem] })

		return res.send(orderCreatedWithLineItems)

	} catch (e) {

		console.log('error', e)
		return res.status(500).send('something ocurred')

	}
})




// ********************************
// PUT FINISH ORDER 'will be called by stripe, so I keep in the req the id, although now there is a test if it's the same as provided in JWT
// ********************************

router.put('/success', jwtCheck, async function (req, res, next) {

	console.log('tries to enter in the sucessendpoint', req.body)
	const { id } = req.body
	const authId = req.user.sub

	if (!id) {
		return res.status(401).send('provide an id')
	}

	// Promise Creators
	const createPermission = async (courseId, userId, orderId) => {
		return Permission.create({
			userId,
			courseId: courseId,
			orderId
		})
	}
	const mapLineItemsToPermissions = async (lineItems, userId, orderId) => {
		return Promise.all(lineItems.map(lineItem => createPermission(lineItem.courseId, userId, orderId)))
	}

	// Action!
	try {

		// Check there is same user in request and database
		const user = await findOrCreateUser(authId)

		const orderToUpdate = await Order.findByPk(id, { include: [LineItem] })
		if (!orderToUpdate) {
			return res.status(401).send('Order not found')
		}

		if (user.authId !== order.userId) return res.status(401).send("something is wrong with your request")

		// Find order and check if it exists


		// Convert order line items into permissions

		const updatedOrder = await orderToUpdate.update({ ...orderToUpdate, state: 'completed' })
		const plainOrder = await updatedOrder.get({ plain: true })
		const permissions = await mapLineItemsToPermissions(plainOrder.lineItems, plainOrder.userId, plainOrder.id)

		const orderWithPermissions = await Order.findByPk(id, { include: [Permission] })

		console.log(orderWithPermissions)
		return res.send(orderWithPermissions)

	} catch (e) {
		console.log('error', e)
		return res.status(500).send('something ocurred')
	}
})

// ********************************
// FETCH ONE ORDER BY ID
// ********************************

// router.get('/:id', async function (req, res, next) {
// 	const { id } = req.params

// 	try {
// 		const selectedOrder = await Order.findByPk(id, { include: [LineItem], plain: true })

// 		if (!selectedOrder) {
// 			return res.status(404).send('order not found')
// 		}
// 		res.send(selectedOrder)
// 	} catch (e) {
// 		console.log(e)
// 	}
// })

module.exports = router