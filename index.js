const MQTT = require('async-mqtt')

const quietTimes = {
  '0': { 10: 'green', 18: 'orange', 20: 'red' },
  '1': { 8: 'green', 20: 'orange', 22: 'red' },
  '2': { 8: 'green', 20: 'orange', 22: 'red' },
  '3': { 8: 'green', 20: 'orange', 22: 'red' },
  '4': { 8: 'green', 20: 'orange', 22: 'red' },
  '5': { 8: 'green', 20: 'orange', 22: 'red' },
  '6': { 10: 'green', 18: 'orange', 20: 'red' }
}

var curDate = new Date()
var dayOfWeek = 0
var hourOfDay = 0

// Functions
const handleError = async (msg) => {
  console.log(msg)
  process.exit()
}

const updateStatus = async (overrideStatus) => {
  console.log('updateStatus', 'Running ...')
  try {
    let forceUpdate = ((Date.now() - lastUpdateSent) > MQTT_INTERVAL)
    if (overrideStatus !== undefined) {
      console.log('updateStatus', 'Overriding status to:', overrideStatus)
      newStatus = overrideStatus
    } else if (forceUpdate) {
      console.log('updateStatus', 'Checking window...')
      curDate = new Date()
      dayOfWeek = curDate.getDay()
      hourOfDay = curDate.getHours()
      Object.keys(quietTimes[dayOfWeek]).forEach(function (slot) {
        if (hourOfDay >= slot) {
          console.log('updateStatus', 'Found window for:', hourOfDay, '/', slot)
          newStatus = quietTimes[dayOfWeek][slot]
        }
      })
    }
    if (newStatus !== lastStatus || forceUpdate) {
      console.log('updateStatus', 'Updating from', lastStatus, 'to', newStatus, '-', forceUpdate)
      await client.publish(MQTT_TOPIC, newStatus)
      lastStatus = newStatus
      lastUpdateSent = Date.now()
    }
  } catch (e) {
    handleError(e.stack)
  }
}

const onConnect = async () => {
  console.log('onConnect', 'Online')
  console.log('onConnect', 'Subscribing to topics:')
  console.log('onConnect', MQTT_SUB)
  MQTT_SUB.split(';').forEach(function (subscription) {
    let subscriptionDetails = subscription.split(':')
    console.log('onConnect', 'Subscribing to', subscriptionDetails[0], '=>', subscriptionDetails[1])
    topics[subscriptionDetails[0]] = subscriptionDetails[1]
    client.subscribe(subscriptionDetails[0])
  })
}

const onMessage = async (topic, message, packet) => {
  console.log('onMessage', 'Handling', topic, '=>', message)
  if (topics.hasOwnproperty(topic)) {
    updateStatus(topics[topic])
  }
}

// Main
const MQTT_URI = process.env.MQTT_URI || handleError('Missing MQTT_URI')
const MQTT_SUB = process.env.MQTT_SUB || handleError('Missing MQTT_SUB')
const MQTT_TOPIC = process.env.MQTT_TOPIC || handleError('Missing MQTT_TOPIC')
const MQTT_INTERVAL = process.env.MQTT_INTERVAL ? parseInt(process.env.MQTT_INTERVAL) : 60000

var newStatus = 'red'
var lastStatus = 'red'
var lastUpdateSent = (Date.now() - MQTT_INTERVAL - 1)

var topics = {}

const client = MQTT.connect(MQTT_URI)

client.on('connect', onConnect)
client.on('message', onMessage)

// Start
updateStatus()
setInterval(updateStatus, 15000)
